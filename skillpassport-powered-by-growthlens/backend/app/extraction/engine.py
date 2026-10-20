import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.ai.extractor import ai_extractor, compute_dynamic_confidence_score
from backend.app.rag.chroma import chroma_store
from backend.app.core.logging import get_logger

logger = get_logger("extraction.engine")


class Domain1ExtractionEngine:
    """
    Unified Domain 1 Evidence Extraction & Competency Mapping Engine.
    Processes work artifacts across resumes, certificates, project reports,
    research papers, portfolio websites, GitHub repositories, and Jira work.

    Strict Domain 1 Boundary:
    Extracts candidate competencies and supporting evidence with traceable excerpts.
    Persists candidate mappings in PostgreSQL and indexes vectors in ChromaDB.
    Never auto-declares competencies as verified (all marked candidate/unreviewed).
    """

    async def process_and_persist_evidence(
        self,
        db: Session,
        evidence_item: EvidenceItem,
        content_text: str,
        source_provider: str,
        category: str,
        user_id: uuid.UUID,
        fast_mode: bool = False,
    ) -> Dict[str, Any]:
        """
        Executes first-pass skill extraction, taxonomy alignment,
        relational persistence, and vector indexing.
        """
        logger.info(f"Extracting candidate competencies for evidence {evidence_item.id} (provider={source_provider}, cat={category}, fast={fast_mode})")

        # 1. First-pass structured extraction (LLM + deterministic fallback)
        # Note: db=None avoids holding an idle database connection during long LLM inference
        if fast_mode:
            extraction_result = ai_extractor._rule_based_extraction(
                text=content_text,
                source_provider=source_provider,
                source_metadata=evidence_item.provenance or {},
            )
            raw_comps = extraction_result.get("competencies") or []
            from backend.app.ai.extractor import validate_and_filter_competencies
            extraction_result["competencies"] = validate_and_filter_competencies(raw_comps, content_text)
            if not extraction_result["competencies"]:
                extraction_result["evidence_strength"] = "insufficient"
        else:
            extraction_result = await ai_extractor.extract_structured_evidence(
                text_content=content_text,
                source_provider=source_provider,
                db=None,
                source_metadata=evidence_item.provenance or {},
            )

        # 2. Revalidate database session in case connection was recycled during inference
        try:
            db.rollback()
        except Exception:
            pass
        evidence_item = db.merge(evidence_item)

        summary = extraction_result.get("summary") or evidence_item.description
        strength = extraction_result.get("evidence_strength") or evidence_item.evidence_strength
        competencies = extraction_result.get("competencies") or []
        work_ctx = extraction_result.get("work_context") or {}

        # 2. Update EvidenceItem fields
        evidence_item.extracted_summary = summary
        if content_text and content_text.strip():
            evidence_item.extracted_excerpt = content_text.strip()[:600]

        if not competencies:
            evidence_item.evidence_strength = "insufficient"
            evidence_item.extraction_confidence = 0.0
            evidence_item.processing_status = "insufficient_content"
            evidence_item.verification_status = "insufficient_evidence"
        else:
            evidence_item.evidence_strength = strength
            evidence_item.processing_status = "ready_for_review"
            evidence_item.verification_status = "unreviewed"
            # Calculate dynamic evidence-grounded confidence from competencies
            scores = [
                compute_dynamic_confidence_score(
                    c.get("confidence_score") or c.get("relevance_score"),
                    text_content=content_text,
                    justification=c.get("justification") or "",
                    demonstration_level=c.get("demonstration_level", "intermediate"),
                    skill_name=c.get("name", ""),
                )
                for c in competencies
            ]
            avg_conf = sum(scores) / len(scores) if scores else 0.80
            evidence_item.extraction_confidence = round(min(max(avg_conf, 0.10), 0.98), 2)

        # Merge work context into normalized metadata
        if not evidence_item.normalized_metadata:
            evidence_item.normalized_metadata = {}
        evidence_item.normalized_metadata["work_context"] = work_ctx
        evidence_item.normalized_metadata["technologies_detected"] = work_ctx.get("technologies", [])
        if evidence_item.provenance and "repository_languages" in evidence_item.provenance:
            evidence_item.normalized_metadata["repository_languages"] = evidence_item.provenance["repository_languages"]
            evidence_item.normalized_metadata["primary_language"] = evidence_item.provenance.get("primary_language")

        # 3. Clean up prior auto-extracted candidate mappings for clean reprocessing and idempotency
        db.query(EvidenceCompetencyMapping).filter(
            EvidenceCompetencyMapping.evidence_id == evidence_item.id,
            EvidenceCompetencyMapping.mapping_method == "first_pass_extraction",
        ).delete()
        db.flush()

        # Create or link EvidenceCompetencyMapping records
        candidate_skills_output = []

        for comp in competencies:
            comp_name = comp.get("name", "").strip()
            if not comp_name:
                continue

            comp_cat = comp.get("category", "General Engineering")
            demo_level = comp.get("demonstration_level", "intermediate").capitalize()
            justification = comp.get("justification") or content_text[:300]
            canonical_tax_id = comp.get("canonical_taxonomy_id")

            # Dynamic confidence score computation (never hardcoded)
            conf_score = compute_dynamic_confidence_score(
                comp.get("confidence_score") or comp.get("relevance_score"),
                text_content=content_text,
                justification=justification,
                demonstration_level=demo_level,
                skill_name=comp_name,
            )
            comp["confidence_score"] = conf_score

            # Resolve taxonomy record
            tax_record = None
            if canonical_tax_id:
                try:
                    tax_record = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == uuid.UUID(str(canonical_tax_id))).first()
                except Exception:
                    tax_record = None

            if not tax_record:
                tax_record = db.query(CompetencyTaxonomy).filter(
                    CompetencyTaxonomy.canonical_name.ilike(comp_name)
                ).first()

            if not tax_record:
                tax_record = CompetencyTaxonomy(
                    id=uuid.uuid4(),
                    canonical_name=comp_name,
                    normalized_name=comp_name.lower(),
                    category=comp_cat,
                    description=f"Auto-mapped competency from {source_provider}: {comp_name}",
                    status="active",
                    taxonomy_version="v1.0",
                )
                db.add(tax_record)
                db.flush()

            # Check if mapping already exists
            existing_mapping = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.evidence_id == evidence_item.id,
                EvidenceCompetencyMapping.competency_id == tax_record.id,
            ).first()

            if not existing_mapping:
                mapping = EvidenceCompetencyMapping(
                    id=uuid.uuid4(),
                    evidence_id=evidence_item.id,
                    competency_id=tax_record.id,
                    owner_user_id=user_id,
                    mapping_method="first_pass_extraction",
                    relevance_score=conf_score,
                    supporting_excerpt=justification[:1000],
                    rationale=f"Demonstrated in {source_provider} ({demo_level} proficiency, {int(conf_score * 100)}% model confidence)",
                    status="candidate",  # Never auto-verified in Domain 1
                    proficiency_level=demo_level,
                )
                db.add(mapping)
                db.flush()
                mapping_id = str(mapping.id)
            else:
                existing_mapping.relevance_score = conf_score
                existing_mapping.proficiency_level = demo_level
                existing_mapping.supporting_excerpt = justification[:1000]
                existing_mapping.rationale = f"Demonstrated in {source_provider} ({demo_level} proficiency, {int(conf_score * 100)}% model confidence)"
                db.flush()
                mapping_id = str(existing_mapping.id)

            candidate_skills_output.append({
                "id": mapping_id,
                "name": tax_record.canonical_name,
                "category": tax_record.category,
                "confidence": conf_score,
                "proficiencyLevel": demo_level,
                "supportingExcerpt": justification[:500],
                "rationale": f"Demonstrated in {source_provider} ({demo_level} proficiency)",
                "status": "candidate",
            })

        # 4. Vector index in ChromaDB
        try:
            chroma_store.index_evidence_item(
                evidence_id=str(evidence_item.id),
                owner_user_id=str(user_id),
                title=evidence_item.title,
                description=evidence_item.description,
                excerpt=evidence_item.extracted_excerpt or content_text[:500],
                source_provider=source_provider,
                category=category,
                strength=evidence_item.evidence_strength,
                verification_status="unreviewed",
            )
        except Exception as e:
            logger.warning(f"ChromaDB indexing error for {evidence_item.id}: {e}")

        db.commit()
        db.refresh(evidence_item)

        logger.info(f"Successfully indexed evidence {evidence_item.id} with {len(candidate_skills_output)} candidate skills")

        # 5. Return standardized evidence entity
        return {
            "id": str(evidence_item.id),
            "title": evidence_item.title,
            "description": evidence_item.description,
            "category": evidence_item.evidence_category,
            "provider": evidence_item.source_provider,
            "sourceType": evidence_item.source_type,
            "sourceName": evidence_item.source_name,
            "sourceUrl": evidence_item.source_url,
            "extractedExcerpt": evidence_item.extracted_excerpt,
            "extractedSummary": evidence_item.extracted_summary,
            "candidateSkills": candidate_skills_output,
            "strength": evidence_item.evidence_strength,
            "confidence": evidence_item.extraction_confidence,
            "verificationStatus": evidence_item.verification_status,
            "processingStatus": evidence_item.processing_status,
            "attributionStatus": evidence_item.attribution_status,
            "observedAt": evidence_item.observed_timestamp.isoformat() if evidence_item.observed_timestamp else None,
            "provenance": evidence_item.provenance or {},
            "metadata": evidence_item.normalized_metadata or {},
        }


extraction_engine = Domain1ExtractionEngine()
