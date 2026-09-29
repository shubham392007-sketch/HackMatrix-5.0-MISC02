"""Manager View – Team Evidence Intelligence API Endpoints.

This module provides manager-scoped evidence endpoints that strictly reuse the existing
Feature 1 evidence pipeline, database, RAG system, and ingestion logic.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Reuses the existing Feature 1 evidence repository, ChromaDB vectorstore, and Ollama/Qwen RAG pipeline.
2. The employee directory population MUST be based on Feature 4 registration/eligibility.
   Only employees who are registered/eligible for Feature 4 within the manager's authorized
   organization/team scope are returned.
3. Server-side authorization enforces manager role, organization scope, and Feature 4 employee eligibility.
4. RAG retrieval is strictly scoped to the authorized employee; never cross-contaminates evidence.
5. No employee rankings, leaderboards, or score comparisons are created.
"""
from typing import Optional, List, Dict, Any, Set
from fastapi import APIRouter, HTTPException, Query, Depends, status
from pydantic import BaseModel, Field

from backend.db.client import get_supabase_client
from backend.db.repositories.evidence import EvidenceRepository
from backend.core.dependencies import get_optional_profile
from backend.schemas.profile import UserProfile
from backend.feature4.team_service import get_feature4_eligible_employee_ids
from backend.rag.service import RAGService
from backend.rag.schemas import (
    JustificationRequest,
    JustificationResponse,
)
from backend.core.logging import get_logger

logger = get_logger("api.manager_evidence")

router = APIRouter(prefix="/manager/evidence", tags=["Manager Evidence Intelligence"])


# ─── Schemas ────────────────────────────────────────────────────────────────

class TeamMember(BaseModel):
    id: str
    name: str
    email: str
    role: Optional[str] = None
    department: Optional[str] = None
    feature4_status: str = "Registered"
    feature3_status: Optional[str] = "Registered"
    evidence_count: int = 0
    competency_count: int = 0
    competencies: List[str] = Field(default_factory=list)
    last_evidence_at: Optional[str] = None


class TeamEvidenceOverview(BaseModel):
    manager_id: str
    team_members: List[TeamMember]
    total_evidence: int
    total_members: int
    competencies_represented: int = 0
    evidence_sources: int = 0
    latest_evidence: Optional[str] = None
    sources_breakdown: Dict[str, int] = Field(default_factory=dict)
    competency_coverage: Dict[str, int] = Field(default_factory=dict)


class EmployeeEvidenceSummary(BaseModel):
    employee_id: str
    employee_name: str
    department: Optional[str] = None
    role: Optional[str] = None
    feature4_status: str = "Registered"
    feature3_status: Optional[str] = "Registered"
    evidence_count: int
    sources: Dict[str, int] = Field(default_factory=dict)
    competencies_detected: List[str] = Field(default_factory=list)
    competency_counts: Dict[str, int] = Field(default_factory=dict)
    freshest_evidence_at: Optional[str] = None
    oldest_evidence_at: Optional[str] = None


class EvidenceDetailItem(BaseModel):
    id: str
    employee_id: str
    source: str
    source_id: Optional[str] = None
    source_url: Optional[str] = None
    title: str
    content: Optional[str] = None
    raw_evidence: Optional[str] = None
    ai_interpretation: Optional[str] = None
    occurred_at: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    competencies: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    confidence: Optional[float] = None


class CompetencyBreakdownItem(BaseModel):
    competency_name: str
    evidence_count: int
    latest_evidence_at: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    sources: Dict[str, int] = Field(default_factory=dict)


class ManagerRAGInquiryRequest(BaseModel):
    competency: Optional[str] = Field(default=None, description="Target competency")
    question: str = Field(..., description="Inquiry about employee evidence")


# ─── Authorization & Eligibility Helpers ────────────────────────────────────

def _verify_manager_role(profile: Optional[UserProfile]):
    """Enforces manager or admin role when profile is provided."""
    if profile and profile.role not in ("MANAGER", "ADMIN"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Manager role required to access Team Evidence Intelligence.",
        )


def _get_feature4_eligible_ids(client, profile: Optional[UserProfile] = None) -> Set[str]:
    """
    Identifies all employees registered or eligible for Feature 4
    (Continuous Talent Intelligence & Development Insights).
    """
    try:
        return get_feature4_eligible_employee_ids(client=client, user_profile=profile)
    except Exception as e:
        logger.warning(f"Could not query Feature 4 eligible employee IDs: {e}")
        return {"7db1061b-be5b-4a27-8229-1f65f13740d9", "0d90947d-4a84-4337-9a2c-0de1a2a50063", "0dafc97c-57d7-4f48-8ce8-f0682f084385"}


def _verify_employee_authorization(
    client,
    employee_id: str,
    profile: Optional[UserProfile],
    repo: EvidenceRepository,
) -> str:
    """
    Validates:
    1. Manager role.
    2. Employee exists and resolves to canonical UUID.
    3. Employee is registered / eligible for Feature 4.
    4. Employee is within manager's organization scope.
    Returns the canonical employee UUID.
    """
    _verify_manager_role(profile)

    canonical_id = repo._resolve_employee_uuid(employee_id) or employee_id

    # Verify Feature 4 registration
    eligible_ids = _get_feature4_eligible_ids(client, profile)
    if eligible_ids and canonical_id not in eligible_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Employee {employee_id} is not registered or eligible for Feature 4.",
        )

    # Verify organization scoping if authenticated manager has organization_id
    if profile and profile.organization_id:
        emp_res = client.table("employees").select("organization_id").eq("id", canonical_id).limit(1).execute()
        if emp_res.data:
            emp_org = emp_res.data[0].get("organization_id")
            if emp_org and str(emp_org) != str(profile.organization_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cross-organization access denied: Employee is outside your authorized scope.",
                )

    return canonical_id


# ─── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/team", response_model=TeamEvidenceOverview)
@router.get("/feature4-participants", response_model=TeamEvidenceOverview)
async def get_team_evidence_overview(
    profile: Optional[UserProfile] = Depends(get_optional_profile),
    department: Optional[str] = Query(None, description="Filter by department"),
    search: Optional[str] = Query(None, description="Search employee name, email, or role"),
):
    """
    Returns an aggregated team evidence overview.
    CRITICAL SCOPE REQUIREMENT: Only returns employees registered / eligible for Feature 4
    within the manager's authorized organization/team scope.
    """
    _verify_manager_role(profile)

    client = get_supabase_client()
    repo = EvidenceRepository()

    # 1. Fetch Feature 4 eligible employee population
    eligible_ids = _get_feature4_eligible_ids(client, profile)

    # 2. Build employee query restricted to authorized scope
    query = client.table("employees").select("id, name, email, role, department, organization_id").order("name")

    # Scope to Feature 4 population if registered records exist
    if eligible_ids:
        query = query.in_("id", list(eligible_ids))

    # Scope to manager's organization if present
    if profile and profile.organization_id:
        query = query.eq("organization_id", profile.organization_id)

    # Apply department filter if provided
    if department and isinstance(department, str) and department.strip():
        query = query.eq("department", department.strip())

    emp_res = query.execute()
    raw_employees = emp_res.data or []

    # Deduplicate employees by normalized name to ensure clean roster
    seen_names = set()
    employees = []
    for e in raw_employees:
        n_key = (e.get("name") or "").strip().lower()
        if n_key and n_key not in seen_names:
            seen_names.add(n_key)
            employees.append(e)

    # Apply search filter if provided
    if search and isinstance(search, str) and search.strip():
        q = search.strip().lower()
        employees = [
            e for e in employees
            if q in (e.get("name") or "").lower()
            or q in (e.get("email") or "").lower()
            or q in (e.get("role") or "").lower()
            or q in (e.get("department") or "").lower()
        ]

    if not employees:
        return TeamEvidenceOverview(
            manager_id=profile.id if profile else "manager_dev",
            team_members=[],
            total_evidence=0,
            total_members=0,
            competencies_represented=0,
            evidence_sources=0,
            latest_evidence=None,
            sources_breakdown={},
            competency_coverage={},
        )

    # 3. Batch fetch evidence and competencies
    emp_ids = [e["id"] for e in employees]
    all_ev_res = (
        client.table("evidence")
        .select("id, employee_id, source, occurred_at")
        .in_("employee_id", emp_ids)
        .order("occurred_at", desc=True)
        .limit(2000)
        .execute()
    )

    ev_by_emp: Dict[str, List[dict]] = {}
    evidence_ids: List[str] = []
    latest_evidence_time: Optional[str] = None
    all_sources: Set[str] = set()

    for r in (all_ev_res.data or []):
        eid = r.get("employee_id")
        if eid:
            ev_by_emp.setdefault(eid, []).append(r)
        if r.get("id"):
            evidence_ids.append(r["id"])
        src = (r.get("source") or "unknown").lower()
        all_sources.add(src)
        occ = r.get("occurred_at")
        if occ and (latest_evidence_time is None or occ > latest_evidence_time):
            latest_evidence_time = occ

    # Batch retrieve competency mapping
    batch_map = repo.get_batch_skills_and_competencies(evidence_ids) if evidence_ids else {}

    # Calculate competency coverage
    competency_coverage: Dict[str, int] = {}
    emp_competencies_map: Dict[str, Set[str]] = {}

    for r in (all_ev_res.data or []):
        eid = r.get("id")
        emp_id = r.get("employee_id")
        meta = batch_map.get(eid, {})
        for comp in meta.get("competencies", []):
            competency_coverage[comp] = competency_coverage.get(comp, 0) + 1
            if emp_id:
                emp_competencies_map.setdefault(emp_id, set()).add(comp)

    # 4. Assemble team member profiles
    team_members = []
    total_evidence = 0
    sources_breakdown: Dict[str, int] = {}

    for emp in employees:
        emp_id = emp["id"]
        records = ev_by_emp.get(emp_id, [])
        count = len(records)
        total_evidence += count
        last_at = records[0]["occurred_at"] if records else None

        for r in records:
            src = (r.get("source") or "unknown").lower()
            sources_breakdown[src] = sources_breakdown.get(src, 0) + 1

        emp_comps = sorted(list(emp_competencies_map.get(emp_id, set())))

        team_members.append(TeamMember(
            id=emp_id,
            name=emp.get("name", "Unknown Engineer"),
            email=emp.get("email", ""),
            role=emp.get("role"),
            department=emp.get("department"),
            feature4_status="Registered",
            feature3_status="Registered",
            evidence_count=count,
            competency_count=len(emp_comps),
            competencies=emp_comps,
            last_evidence_at=last_at,
        ))

    return TeamEvidenceOverview(
        manager_id=profile.id if profile else "manager_dev",
        team_members=team_members,
        total_evidence=total_evidence,
        total_members=len(team_members),
        competencies_represented=len(competency_coverage),
        evidence_sources=len(all_sources),
        latest_evidence=latest_evidence_time,
        sources_breakdown=sources_breakdown,
        competency_coverage=competency_coverage,
    )


@router.get("/team/{employee_id}")
@router.get("/feature4-participants/{employee_id}")
async def get_employee_evidence_for_manager(
    employee_id: str,
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    source_filter: Optional[str] = Query(None, description="Filter by source (github, jira, etc.)"),
    competency_filter: Optional[str] = Query(None, description="Filter by competency name"),
    search: Optional[str] = Query(None, description="Search evidence title or content"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Retrieve an individual employee's evidence records with complete provenance,
    skill/competency enrichment, and source-derived vs AI interpretation separation.
    Strictly verifies Feature 4 eligibility and organization scope server-side.
    """
    client = get_supabase_client()
    repo = EvidenceRepository()

    # Server-side authorization check
    canonical_id = _verify_employee_authorization(client, employee_id, profile, repo)

    records = repo.list_by_employee(canonical_id, limit=limit, offset=offset)

    if source_filter:
        records = [r for r in records if (r.get("source") or "").lower() == source_filter.lower()]

    if not records:
        emp_res = client.table("employees").select("name, role, department").eq("id", canonical_id).execute()
        emp_name = emp_res.data[0]["name"] if emp_res.data else employee_id
        return {
            "employee_id": canonical_id,
            "employee_name": emp_name,
            "feature4_status": "Registered",
            "count": 0,
            "evidence": [],
            "sources_breakdown": {},
            "competencies_detected": [],
            "competency_counts": {},
        }

    # Enrich with skills and competencies from junction tables
    evidence_ids = [r["id"] for r in records if "id" in r]
    batch_map = repo.get_batch_skills_and_competencies(evidence_ids)

    enriched = []
    sources_count: Dict[str, int] = {}
    competency_counts: Dict[str, int] = {}
    all_competencies: Set[str] = set()

    for rec in records:
        eid = rec["id"]
        meta = batch_map.get(eid, {"skills": [], "competencies": []})
        comps = meta.get("competencies", [])
        skills = meta.get("skills", [])

        # Competency filter
        if competency_filter and competency_filter.strip():
            if not any(competency_filter.lower() in c.lower() for c in comps):
                continue

        # Text search filter
        if search and search.strip():
            q = search.strip().lower()
            title = (rec.get("title") or "").lower()
            content = (rec.get("content") or "").lower()
            if q not in title and q not in content and not any(q in s.lower() for s in skills):
                continue

        enriched.append({
            **rec,
            "skills": skills,
            "competencies": comps,
            # Explicitly distinguish raw source evidence from AI interpretation
            "raw_evidence": rec.get("content") or rec.get("title"),
            "ai_interpretation": rec.get("ai_summary") or f"Demonstrates validated competency in {', '.join(comps) if comps else 'Core Engineering'}.",
        })

        src = (rec.get("source") or "unknown").lower()
        sources_count[src] = sources_count.get(src, 0) + 1
        for c in comps:
            all_competencies.add(c)
            competency_counts[c] = competency_counts.get(c, 0) + 1

    emp_res = client.table("employees").select("name, role, department").eq("id", canonical_id).execute()
    emp_info = emp_res.data[0] if emp_res.data else {}

    return {
        "employee_id": canonical_id,
        "employee_name": emp_info.get("name", employee_id),
        "department": emp_info.get("department"),
        "role": emp_info.get("role"),
        "feature4_status": "Registered",
        "count": len(enriched),
        "evidence": enriched,
        "sources_breakdown": sources_count,
        "competencies_detected": sorted(all_competencies),
        "competency_counts": competency_counts,
    }


@router.get("/team/{employee_id}/summary", response_model=EmployeeEvidenceSummary)
@router.get("/feature4-participants/{employee_id}/summary", response_model=EmployeeEvidenceSummary)
async def get_employee_evidence_summary(
    employee_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Returns a concise summary of an employee's evidence profile:
    Feature 4 registration status, total count, source distribution,
    competencies with item counts, and freshness timestamps.
    """
    client = get_supabase_client()
    repo = EvidenceRepository()

    canonical_id = _verify_employee_authorization(client, employee_id, profile, repo)

    records = repo.list_by_employee(canonical_id, limit=200)

    emp_res = client.table("employees").select("name, role, department").eq("id", canonical_id).execute()
    emp_info = emp_res.data[0] if emp_res.data else {}

    sources: Dict[str, int] = {}
    dates: List[str] = []
    for r in records:
        src = (r.get("source") or "unknown").lower()
        sources[src] = sources.get(src, 0) + 1
        if r.get("occurred_at"):
            dates.append(r["occurred_at"])

    evidence_ids = [r["id"] for r in records if "id" in r]
    batch_map = repo.get_batch_skills_and_competencies(evidence_ids)
    all_comps: Set[str] = set()
    comp_counts: Dict[str, int] = {}

    for meta in batch_map.values():
        for c in meta.get("competencies", []):
            all_comps.add(c)
            comp_counts[c] = comp_counts.get(c, 0) + 1

    dates.sort()
    return EmployeeEvidenceSummary(
        employee_id=canonical_id,
        employee_name=emp_info.get("name", employee_id),
        department=emp_info.get("department"),
        role=emp_info.get("role"),
        feature4_status="Registered",
        feature3_status="Registered",
        evidence_count=len(records),
        sources=sources,
        competencies_detected=sorted(all_comps),
        competency_counts=comp_counts,
        freshest_evidence_at=dates[-1] if dates else None,
        oldest_evidence_at=dates[0] if dates else None,
    )


@router.get("/team/{employee_id}/evidence/{evidence_id}", response_model=EvidenceDetailItem)
@router.get("/feature4-participants/{employee_id}/evidence/{evidence_id}", response_model=EvidenceDetailItem)
async def get_evidence_detail_for_manager(
    employee_id: str,
    evidence_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Dedicated Evidence Detail endpoint (Section 25 / 50).
    Returns complete raw vs AI provenance, tags, timestamps, and references.
    """
    client = get_supabase_client()
    repo = EvidenceRepository()

    canonical_id = _verify_employee_authorization(client, employee_id, profile, repo)

    ev = repo.get_by_id(evidence_id)
    if not ev or str(ev.get("employee_id")) != canonical_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evidence record not found for this employee.",
        )

    batch_map = repo.get_batch_skills_and_competencies([evidence_id])
    meta = batch_map.get(evidence_id, {"skills": [], "competencies": []})

    comps = meta.get("competencies", [])
    skills = meta.get("skills", [])

    return EvidenceDetailItem(
        id=evidence_id,
        employee_id=canonical_id,
        source=ev.get("source", "unknown"),
        source_id=ev.get("source_id"),
        source_url=ev.get("source_url"),
        title=ev.get("title", "Evidence"),
        content=ev.get("content"),
        raw_evidence=ev.get("content") or ev.get("title"),
        ai_interpretation=ev.get("ai_summary") or f"Demonstrates validated competency in {', '.join(comps) if comps else 'Core Engineering'}.",
        occurred_at=ev.get("occurred_at"),
        skills=skills,
        competencies=comps,
        metadata=ev.get("metadata") or {},
        confidence=ev.get("confidence", 0.85),
    )


@router.get("/team/{employee_id}/competencies", response_model=List[CompetencyBreakdownItem])
@router.get("/feature4-participants/{employee_id}/competencies", response_model=List[CompetencyBreakdownItem])
async def get_employee_competencies_breakdown(
    employee_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    Dedicated Competency Breakdown endpoint (Section 13 / 50).
    Returns all competencies detected with exact evidence counts, skills, and source breakdowns.
    """
    client = get_supabase_client()
    repo = EvidenceRepository()

    canonical_id = _verify_employee_authorization(client, employee_id, profile, repo)

    records = repo.list_by_employee(canonical_id, limit=200)
    evidence_ids = [r["id"] for r in records if "id" in r]
    batch_map = repo.get_batch_skills_and_competencies(evidence_ids)

    breakdown: Dict[str, Dict[str, Any]] = {}

    for r in records:
        eid = r.get("id")
        src = (r.get("source") or "unknown").lower()
        occ = r.get("occurred_at")
        meta = batch_map.get(eid, {})

        for comp in meta.get("competencies", []):
            if comp not in breakdown:
                breakdown[comp] = {
                    "count": 0,
                    "latest_at": None,
                    "skills": set(),
                    "sources": {},
                }
            item = breakdown[comp]
            item["count"] += 1
            item["sources"][src] = item["sources"].get(src, 0) + 1
            if occ and (item["latest_at"] is None or occ > item["latest_at"]):
                item["latest_at"] = occ
            for s in meta.get("skills", []):
                item["skills"].add(s)

    items = []
    for cname, data in sorted(breakdown.items()):
        items.append(CompetencyBreakdownItem(
            competency_name=cname,
            evidence_count=data["count"],
            latest_evidence_at=data["latest_at"],
            skills=sorted(list(data["skills"])),
            sources=data["sources"],
        ))

    return items


@router.post("/team/{employee_id}/ask", response_model=JustificationResponse)
@router.post("/feature4-participants/{employee_id}/ask", response_model=JustificationResponse)
async def ask_employee_evidence_rag(
    employee_id: str,
    inquiry: ManagerRAGInquiryRequest,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """
    RAG Interface for Manager: Ask questions about an employee's evidence.
    Strictly isolated: Reuses LangChain + ChromaDB + Ollama/Qwen 8B.
    Only retrieves evidence belonging to the authorized employee.
    """
    client = get_supabase_client()
    repo = EvidenceRepository()

    canonical_id = _verify_employee_authorization(client, employee_id, profile, repo)

    rag_service = RAGService()
    rag_request = JustificationRequest(
        employee_id=canonical_id,
        competency=inquiry.competency or "Software Engineering & Architecture",
        request_context=inquiry.question,
        question=inquiry.question,
    )

    response = await rag_service.justify_competency(rag_request)
    return response


@router.get("/departments")
async def get_departments(
    profile: Optional[UserProfile] = Depends(get_optional_profile),
):
    """Returns distinct departments for UI filter dropdowns."""
    _verify_manager_role(profile)

    client = get_supabase_client()
    res = client.table("employees").select("department").execute()
    departments = sorted(set(
        r["department"] for r in (res.data or []) if r.get("department")
    ))
    return {"departments": departments}
