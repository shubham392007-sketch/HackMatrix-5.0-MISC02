import asyncio
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from backend.core.dependencies import (
    check_employee_access,
    get_optional_profile,
    require_employee,
    require_manager,
)
from backend.core.logging import get_logger
from backend.feature3.catalog import RecommendationCatalogService
from backend.feature3.engine import NextActionRecommendationEngine
from backend.feature3.mentorship_service import MentorshipMatchingService
from backend.feature3.schemas import (
    CatalogRule,
    MentorshipRequestCreate,
    MentorshipStatus,
    MentorshipStatusUpdate,
    NextActionRecommendation,
    RecommendationStatus,
    RecommendationStatusUpdate,
)
from backend.schemas.profile import UserProfile

logger = get_logger("feature3.api")

router = APIRouter(tags=["Feature 3: Next-Action Recommendation Engine"])

_engine: Optional[NextActionRecommendationEngine] = None
_mentorship: Optional[MentorshipMatchingService] = None
_catalog: Optional[RecommendationCatalogService] = None


def get_engine() -> NextActionRecommendationEngine:
    global _engine
    if _engine is None:
        _engine = NextActionRecommendationEngine()
    return _engine


def get_mentorship() -> MentorshipMatchingService:
    global _mentorship
    if _mentorship is None:
        _mentorship = MentorshipMatchingService()
    return _mentorship


def get_catalog() -> RecommendationCatalogService:
    global _catalog
    if _catalog is None:
        _catalog = RecommendationCatalogService()
    return _catalog


# ──────────────────────────────────────────────────────────────────────────────
# 1. Catalog Endpoints (Static route first)
# ──────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/v1/recommendations/catalog",
    summary="View recommendation catalog rules",
)
async def list_catalog_rules() -> Dict[str, Any]:
    catalog = get_catalog()
    return {"rules": [r.model_dump() for r in catalog.list_rules()]}


# ──────────────────────────────────────────────────────────────────────────────
# 2. Mentorship Workflow Endpoints (Static routes before parameterized)
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/recommendations/mentorship/request",
    summary="Employee or Manager requests peer mentorship pairing",
)
@router.post(
    "/api/v1/manager/mentorship/request",
    summary="Manager initiates peer mentorship pairing",
)
async def request_mentorship_endpoint(
    request: MentorshipRequestCreate,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    """Creates a transactional mentorship pairing in PENDING or REQUESTED state."""
    mentorship = get_mentorship()
    try:
        res = mentorship.request_mentorship(request)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error initiating mentorship pairing: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/api/v1/recommendations/mentorship/requests",
    summary="List mentorship pairings for current user or all (for manager)",
)
async def list_mentorship_requests(
    employee_id: Optional[str] = Query(None),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    mentorship = get_mentorship()
    if employee_id:
        pairings = mentorship.list_pairings_for_employee(employee_id)
    else:
        pairings = mentorship.list_all_pairings()
    return {"pairings": pairings}


@router.patch(
    "/api/v1/recommendations/mentorship/{pairing_id}/status",
    summary="Update mentorship pairing status (accepted, declined, completed)",
)
async def update_mentorship_status_endpoint(
    pairing_id: str,
    body: MentorshipStatusUpdate,
) -> Dict[str, Any]:
    mentorship = get_mentorship()
    try:
        res = mentorship.update_pairing_status(pairing_id, body.status, body.feedback)
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ──────────────────────────────────────────────────────────────────────────────
# 3. Action State & Generation
# ──────────────────────────────────────────────────────────────────────────────

@router.post(
    "/api/v1/recommendations/generate/{employee_id}",
    summary="Trigger immediate re-evaluation of recommendations",
)
async def trigger_recommendation_generation(
    employee_id: str,
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    """Force fresh evaluation of Feature 2 trajectories into Feature 3 actions."""
    engine = get_engine()
    recs = await asyncio.to_thread(
        engine.generate_recommendations_for_employee, employee_id, explain_with_ai=True
    )
    return {
        "status": "success",
        "employee_id": employee_id,
        "count": len(recs),
        "recommendations": [r.model_dump() for r in recs],
    }


@router.patch(
    "/api/v1/recommendations/{recommendation_id}/status",
    summary="Update recommendation status (started, completed, dismissed)",
)
async def update_recommendation_status_endpoint(
    recommendation_id: str,
    body: RecommendationStatusUpdate,
) -> Dict[str, Any]:
    """Tracks employee execution of recommended action for closed-loop lifecycle."""
    engine = get_engine()
    result = engine.update_recommendation_status(recommendation_id, body.status)
    return result


def get_existing_recommendations_from_db(employee_id: str) -> List[Dict[str, Any]]:
    """Loads existing persisted recommendations for fast, low-latency UI rendering (<100ms)."""
    try:
        from backend.db.client import get_supabase_client
        from backend.db.repositories.evidence import EvidenceRepository

        client = get_supabase_client()
        repo = EvidenceRepository()
        emp_uuid = repo._resolve_employee_uuid(employee_id) or employee_id

        res = (
            client.table("recommendations")
            .select("*")
            .eq("employee_id", emp_uuid)
            .not_.is_("action", "null")
            .order("created_at", desc=True)
            .execute()
        )
        if not res.data:
            return []

        seen = set()
        deduped = []
        for r in res.data:
            cname = r.get("competency_name")
            if not cname or cname in seen:
                continue
            seen.add(cname)
            meta = r.get("metadata") or {}
            deduped.append({
                "id": str(r.get("id")),
                "competency": cname,
                "trend": meta.get("trend", "stagnating"),
                "confidence": r.get("confidence", 0.85),
                "priority": meta.get("priority", "HIGH"),
                "action": r.get("action"),
                "action_type": meta.get("action_type", "micro_learning"),
                "status": meta.get("status", "generated"),
                "justification": r.get("justification"),
                "evidence_ref": meta.get("evidence_ref"),
                "evidence_refs": meta.get("evidence_refs", []),
                "supporting_evidence_details": meta.get("supporting_evidence_details", []),
                "external_link": meta.get("external_link"),
                "resource": meta.get("resource"),
                "mentor_suggestion": meta.get("mentor_suggestion"),
                "ai_explanation": meta.get("ai_explanation"),
                "created_at": r.get("created_at"),
            })

        priority_map = {"declining": 0, "stagnating": 1, "insufficient_evidence": 2, "improving": 3}
        deduped.sort(key=lambda x: (priority_map.get(x.get("trend", ""), 4), -float(x.get("confidence") or 0)))
        return deduped
    except Exception as e:
        logger.warning(f"Error fetching existing recommendations from DB: {e}")
        return []


# ──────────────────────────────────────────────────────────────────────────────
# 4. Recommendation Queries by Learner / Employee
# ──────────────────────────────────────────────────────────────────────────────

@router.get(
    "/api/v1/learner/{learner_id}/recommendations",
    summary="Get prescriptive next-action recommendations for an employee",
)
@router.get(
    "/api/v1/recommendations/{learner_id}",
    summary="Alias for recommendations endpoint",
)
async def get_recommendations_endpoint(
    learner_id: str,
    explain: bool = Query(True, description="Synthesize grounded explainability rationale"),
    force_refresh: bool = Query(False, description="Force fresh regeneration of recommendations"),
    profile: Optional[UserProfile] = Depends(get_optional_profile),
) -> Dict[str, Any]:
    """Retrieves authoritative Feature 2 trajectories and outputs evidence-grounded interventions."""
    # Authorization check
    if profile and not check_employee_access(profile, learner_id):
        is_sample = str(learner_id).startswith("L00") or learner_id in (
            "shubham_pokale", "maya_sharma", "alex_rivera", "EMP-001"
        )
        if not (profile.role in ("MANAGER", "ADMIN") or is_sample):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You cannot view recommendations for another employee.",
            )

    # 1. Check existing recommendations in DB for instant response without blocking event loop
    if not force_refresh:
        existing = await asyncio.to_thread(get_existing_recommendations_from_db, learner_id)
        if existing:
            return {"recommendations": existing}

    # 2. If no persisted recommendations or force_refresh requested, generate fresh recommendations in thread pool
    engine = get_engine()
    recs = await asyncio.to_thread(
        engine.generate_recommendations_for_employee, learner_id, explain_with_ai=explain
    )

    # Format for frontend
    formatted_recs = []
    for r in recs:
        item = {
            "id": r.id,
            "competency": r.competency_name,
            "trend": r.trend,
            "confidence": r.confidence,
            "priority": r.priority.value,
            "action": r.action,
            "action_type": r.action_type.value,
            "status": r.status.value,
            "justification": r.justification,
            "evidence_ref": r.evidence_ref,
            "evidence_refs": r.evidence_refs,
            "supporting_evidence_details": r.supporting_evidence_details,
            "external_link": r.external_link,
            "resource": r.resource.model_dump() if r.resource else None,
            "mentor_suggestion": r.mentor_suggestion.model_dump() if r.mentor_suggestion else None,
            "ai_explanation": r.ai_explanation.model_dump() if r.ai_explanation else None,
            "created_at": r.created_at,
        }
        formatted_recs.append(item)

    return {"recommendations": formatted_recs}
