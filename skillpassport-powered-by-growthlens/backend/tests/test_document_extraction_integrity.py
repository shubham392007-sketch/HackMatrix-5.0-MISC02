import io
import uuid
from datetime import datetime, timezone
import pytest
import fitz  # PyMuPDF
from unittest.mock import patch, AsyncMock

from backend.app.ai.extractor import (
    ai_extractor,
    is_insufficient_or_identity_only,
    validate_and_filter_competencies,
)
from backend.app.extraction.document_extractor import document_extractor
from backend.app.extraction.engine import extraction_engine
from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import EvidenceCompetencyMapping, CompetencyTaxonomy
from backend.app.db.session import SessionLocal


def create_pdf_with_text(text: str) -> bytes:
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# 1. Name-only extraction yields zero candidate competencies
@pytest.mark.asyncio
async def test_name_only_extraction_yields_zero_skills():
    name_text = "Shubham Pokale"
    assert is_insufficient_or_identity_only(name_text) is True

    res = await ai_extractor.extract_structured_evidence(name_text, source_provider="document_upload")
    assert res["competencies"] == []
    assert res["evidence_strength"] == "insufficient"
    assert "General Engineering & Problem Solving" not in [c.get("name") for c in res["competencies"]]


# 2. Certificate filename with minimal text does not infer skills from filename
@pytest.mark.asyncio
async def test_certificate_filename_with_minimal_text_does_not_infer_skills():
    minimal_text = "Jane Doe"
    res = await ai_extractor.extract_structured_evidence(
        minimal_text,
        source_provider="document_upload",
        source_metadata={"filename": "Kubernetes_CKA_Administrator_Certificate.pdf"},
    )
    assert res["competencies"] == []
    assert not any("kubernetes" in c.get("name", "").lower() for c in res["competencies"])


# 3. Real certificate with substantive text extracts competencies grounded in text
@pytest.mark.asyncio
async def test_real_certificate_with_substantive_text_extracts_competencies():
    certificate_text = (
        "CERTIFICATE OF COMPLETION\n"
        "This certifies that Jane Doe has successfully completed\n"
        "Cloud Infrastructure & DevOps Kubernetes Orchestration\n"
        "Issued by the Cloud Native Computing Foundation on October 10, 2026."
    )
    res = await ai_extractor.extract_structured_evidence(certificate_text, source_provider="document_upload")
    assert len(res["competencies"]) > 0
    names = [c["name"] for c in res["competencies"]]
    assert any("Cloud" in n or "DevOps" in n for n in names)
    for c in res["competencies"]:
        assert c["justification"] in certificate_text or any(w in certificate_text for w in c["justification"].split())


# 4. Scanned certificate page triggers OCR
@pytest.mark.asyncio
async def test_scanned_certificate_triggers_ocr():
    # Create PDF with minimal text but containing an embedded image
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "John Doe")
    # Insert tiny 10x10 pixmap
    pix = fitz.Pixmap(fitz.csRGB, (0, 0, 10, 10), 0)
    page.insert_image(fitz.Rect(100, 100, 200, 200), pixmap=pix)
    pdf_bytes = doc.tobytes()
    doc.close()

    res = await document_extractor.extract_async(pdf_bytes, "scanned_cert.pdf", "application/pdf")
    assert res["ocr_pages_detected"] == 1


# 5. Unsupported skill inference rejected
@pytest.mark.asyncio
async def test_unsupported_skill_inference_rejected():
    attendance_text = "Invoice Receipt: Order #98172 paid in full for conference attendance ticket. Thank you."
    res = await ai_extractor.extract_structured_evidence(attendance_text, source_provider="document_upload")
    assert res["competencies"] == []
    assert res["evidence_strength"] == "insufficient"


# 6. Fabricated excerpt rejection
def test_fabricated_excerpt_rejection():
    source_text = "Alice implemented the user registration form using React and TypeScript."
    hallucinated_comps = [
        {
            "name": "General Engineering & Problem Solving",
            "justification": "Alice Doe",  # Name only
            "confidence_score": 0.8,
        },
        {
            "name": "Kubernetes Cluster Management",
            "justification": "Deployed multi-region Kubernetes clusters with Calico CNI",  # Not in source!
            "confidence_score": 0.9,
        },
        {
            "name": "Frontend Architecture & Modern Web",
            "justification": "user registration form using React and TypeScript",  # Verbatim in source
            "confidence_score": 0.85,
        },
    ]

    valid = validate_and_filter_competencies(hallucinated_comps, source_text)
    assert len(valid) == 1
    assert valid[0]["name"] == "Frontend Architecture & Modern Web"


# 7. Model empty output falls back honestly without fabricating General Engineering
def test_model_empty_output_falls_back_honestly():
    sparse_text = "Thank you for participating."
    fallback_res = ai_extractor._rule_based_extraction(sparse_text, source_provider="document")
    assert fallback_res["competencies"] == []
    assert fallback_res["evidence_strength"] == "insufficient"
    assert "General Engineering" not in str(fallback_res)


# 8. Ollama unavailable handled gracefully without crashing
@pytest.mark.asyncio
async def test_ollama_unavailable_graceful_handling():
    with patch("httpx.AsyncClient.post", side_effect=Exception("Connection refused")):
        res = await ai_extractor.extract_structured_evidence(
            "Shubham Pokale", source_provider="document_upload"
        )
        assert res["competencies"] == []
        assert res["evidence_strength"] == "insufficient"


# 9. Evidence indexing integrity with zero competencies
@pytest.mark.asyncio
async def test_evidence_indexing_integrity():
    db = SessionLocal()
    try:
        user_id = uuid.uuid4()
        ev_item = EvidenceItem(
            id=uuid.uuid4(),
            owner_user_id=user_id,
            source_provider="document_upload",
            source_type="document",
            source_name="sparse.pdf",
            title="Sparse Document",
            description="Document with only name",
            extracted_excerpt="Shubham Pokale",
            content_hash="a" * 64,
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="test_user",
            evidence_category="certificate",
            evidence_strength="high",
            extraction_confidence=0.92,
            processing_status="processing",
            verification_status="unreviewed",
        )
        db.add(ev_item)
        db.flush()

        res = await extraction_engine.process_and_persist_evidence(
            db=db,
            evidence_item=ev_item,
            content_text="Shubham Pokale",
            source_provider="document_upload",
            category="certificate",
            user_id=user_id,
        )

        assert res["candidateSkills"] == []
        assert res["strength"] == "insufficient"
        assert res["confidence"] == 0.0
        assert res["processingStatus"] == "insufficient_content"
        assert res["verificationStatus"] == "insufficient_evidence"
    finally:
        db.rollback()
        db.close()


# 10. Reprocessing document cleans fabricated mappings idempotently
@pytest.mark.asyncio
async def test_reprocess_document_cleans_fabricated_mappings():
    db = SessionLocal()
    try:
        user_id = uuid.uuid4()
        ev_id = uuid.uuid4()
        ev_item = EvidenceItem(
            id=ev_id,
            owner_user_id=user_id,
            source_provider="document_upload",
            source_type="document",
            source_name="test.pdf",
            title="Test Doc",
            description="Testing reprocessing",
            extracted_excerpt="Shubham Pokale",
            content_hash="a" * 64,
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity="test_user",
            evidence_category="certificate",
            evidence_strength="medium",
            extraction_confidence=0.70,
            processing_status="ready_for_review",
            verification_status="unreviewed",
        )
        db.add(ev_item)
        db.flush()

        # Insert a fake candidate mapping
        fake_tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.canonical_name == "General Engineering & Problem Solving").first()
        if not fake_tax:
            fake_tax = CompetencyTaxonomy(
                id=uuid.uuid4(),
                canonical_name="General Engineering & Problem Solving",
                normalized_name="general engineering & problem solving",
                category="Technical",
                description="Fake",
                status="active",
                taxonomy_version="v1.0",
            )
            db.add(fake_tax)
            db.flush()

        fake_map = EvidenceCompetencyMapping(
            id=uuid.uuid4(),
            evidence_id=ev_id,
            competency_id=fake_tax.id,
            owner_user_id=user_id,
            mapping_method="first_pass_extraction",
            relevance_score=0.65,
            supporting_excerpt="Shubham Pokale",
            rationale="Test fabricated rationale",
            status="candidate",
            proficiency_level="Intermediate",
        )
        db.add(fake_map)
        db.flush()

        # Reprocess with minimal text
        res = await extraction_engine.process_and_persist_evidence(
            db=db,
            evidence_item=ev_item,
            content_text="Shubham Pokale",
            source_provider="document_upload",
            category="certificate",
            user_id=user_id,
        )

        # Verify old fake mapping was wiped and not recreated
        mappings = db.query(EvidenceCompetencyMapping).filter(EvidenceCompetencyMapping.evidence_id == ev_id).all()
        assert len(mappings) == 0
        assert res["candidateSkills"] == []
    finally:
        db.rollback()
        db.close()
