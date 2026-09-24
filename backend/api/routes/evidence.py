"""Evidence Management and Traceability API Endpoints."""
from fastapi import APIRouter, HTTPException, Query
from backend.db.repositories.evidence import EvidenceRepository
from backend.schemas.evidence import CanonicalEvidence, EvidenceResponse
from backend.services.taxonomy import TaxonomyService
from backend.llm.service import LLMService

router = APIRouter(prefix="/evidence", tags=["Evidence Intelligence"])


@router.get("/{employee_id}")
async def list_employee_evidence(
    employee_id: str,
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    """Retrieve chronological canonical evidence records for a specific employee."""
    repo = EvidenceRepository()
    records = repo.list_by_employee(employee_id, limit=limit, offset=offset)
    return {
        "employee_id": employee_id,
        "count": len(records),
        "evidence": records
    }


@router.get("/{employee_id}/{evidence_id}")
async def get_evidence_detail(employee_id: str, evidence_id: str):
    """Retrieve a single evidence record with full skill and competency tags for complete audit traceability."""
    repo = EvidenceRepository()
    record = repo.get_employee_evidence_by_id(employee_id, evidence_id)
    if not record:
        raise HTTPException(
            status_code=404,
            detail=f"Evidence with ID '{evidence_id}' for employee '{employee_id}' not found."
        )

    # Attach skills and competencies
    associations = repo.get_evidence_skills_and_competencies(evidence_id)
    return {
        **record,
        "extracted_skills": associations.get("skills", []),
        "extracted_competencies": associations.get("competencies", [])
    }


@router.post("/process")
async def process_manual_evidence(evidence: CanonicalEvidence):
    """Ingest custom or manual evidence into the canonical store."""
    from backend.services.ingestion import EvidenceIngestionService
    service = EvidenceIngestionService()
    await service._process_single_evidence(evidence, run_ai=True)
    return {
        "status": "success",
        "evidence_id": evidence.evidence_id,
        "message": "Evidence successfully processed, extracted, and indexed."
    }


@router.post("/{evidence_id}/extract")
async def extract_evidence_skills(evidence_id: str):
    """Trigger on-demand AI skill extraction for an existing evidence record."""
    repo = EvidenceRepository()
    record = repo.get_by_id(evidence_id)
    if not record:
        raise HTTPException(status_code=404, detail="Evidence not found")

    taxonomy_svc = TaxonomyService()
    known_comps = [c["name"] for c in taxonomy_svc.list_all_competencies()]

    llm_svc = LLMService()
    extraction = await llm_svc.extract_skills_from_evidence(
        source=record["source"],
        source_type=record["source_type"],
        title=record["title"],
        content=record["content"],
        known_competencies=known_comps,
    )

    repo.update_ai_extraction(evidence_id, extraction.evidence_summary)

    matched_skills = []
    matched_comps = []
    for sk in extraction.skills:
        s_id, c_id = taxonomy_svc.resolve_skill(sk.name, evidence_id, sk.confidence)
        if s_id:
            repo.attach_skill(evidence_id, s_id, sk.confidence)
            matched_skills.append({"name": sk.name, "id": s_id})
        if c_id:
            repo.attach_competency(evidence_id, c_id, sk.confidence)

    for cp in extraction.competencies:
        c_id = taxonomy_svc.resolve_competency(cp.name)
        if c_id:
            repo.attach_competency(evidence_id, c_id, cp.confidence)
            matched_comps.append({"name": cp.name, "id": c_id})

    return {
        "evidence_id": evidence_id,
        "summary": extraction.evidence_summary,
        "skills_extracted": [s.model_dump() for s in extraction.skills],
        "competencies_extracted": [c.model_dump() for c in extraction.competencies],
        "matched_skills": matched_skills,
        "matched_competencies": matched_comps,
    }
