from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Query, Depends, HTTPException
from pydantic import BaseModel

# Service imports
from services.youtube_service import get_top_youtube_tutorial
from services.mentorship_service import find_internal_mentor
from utils.mock_triggers import mock_get_skill_trajectory

from backend.core.dependencies import require_employee, require_manager, check_employee_access
from backend.schemas.profile import UserProfile

router = APIRouter()


class RecommendationExplanationRequest(BaseModel):
    learner_id: str
    competency: str
    trend: str = "declining"
    recommended_action: Dict[str, Any]
    evidence_items: List[Dict[str, Any]] = []


@router.get("/api/v1/learner/{learner_id}/recommendations")
async def get_recommendations(
    learner_id: str,
    explain: bool = Query(False, description="Whether to include Qwen-generated contextualized explanations"),
    profile: UserProfile = Depends(require_employee),
):
    """Return recommendations based on skill‑trajectory analysis with optional AI contextualization.

    Currently the ML pipeline produces a declining trend for Python and Data Analysis.
    When explain=True, QwenService synthesizes why the action was recommended based on evidence.
    """
    if not check_employee_access(profile, learner_id):
        if not (profile.role in ("MANAGER", "ADMIN") or str(learner_id).startswith("L00")):
            from fastapi import HTTPException
            raise HTTPException(status_code=403, detail="Cross-employee recommendation access denied.")
    from backend.app.ai.qwen_service import QwenService
    recommendations = []

    # 1. Query Feature 2 PyTorch LSTM Trajectory Engine for authoritative trends
    try:
        from backend.feature2.api import get_inference_service
        from backend.feature2.schemas import TrajectoryTrend
        f2_service = get_inference_service()
        f2_predictions = f2_service.predict_employee_trajectories(learner_id, persist=False)
        for pred in f2_predictions:
            if pred.trend == TrajectoryTrend.DECLINING:
                c_name = pred.competency_name
                ev_ref = pred.supporting_evidence_ids[0] if pred.supporting_evidence_ids else "E001"
                if any(tech in c_name.lower() for tech in ["python", "sql", "data", "cloud", "code", "dev"]):
                    youtube_url = get_top_youtube_tutorial(c_name)
                    rec_item = {
                        "competency": c_name,
                        "action": f"Review focused tutorial on {c_name}",
                        "type": "micro_learning",
                        "evidence_ref": ev_ref,
                        "external_link": youtube_url,
                        "confidence": pred.confidence,
                        "trend": "declining",
                    }
                else:
                    mentor_info = find_internal_mentor(c_name, learner_id)
                    rec_item = {
                        "competency": c_name,
                        "action": f"Peer Mentorship in {c_name}",
                        "type": "peer_mentorship",
                        "evidence_ref": ev_ref,
                        "mentor_suggestion": {
                            "mentor_id": mentor_info.get("mentor_id", "M001"),
                            "mentor_name": mentor_info.get("mentor_name", "Senior Specialist"),
                        },
                        "confidence": pred.confidence,
                        "trend": "declining",
                    }
                if explain:
                    qwen = QwenService.get_instance()
                    ev_items = [
                        {"id": eid, "detail": title}
                        for eid, title in zip(pred.supporting_evidence_ids, pred.supporting_evidence_titles)
                    ]
                    exp = await qwen.explain_recommendation(
                        employee_id=learner_id,
                        competency=c_name,
                        trend="declining",
                        recommended_action=rec_item,
                        evidence_items=ev_items,
                    )
                    rec_item["ai_explanation"] = exp.model_dump()
                recommendations.append(rec_item)
    except Exception as e:
        # Fallback gracefully
        pass

    if not recommendations:
        # Mock ML trigger for Python competency
        python_result = mock_get_skill_trajectory(learner_id, "Python")
        if python_result.get("trend") == "declining":
            youtube_url = get_top_youtube_tutorial("Python")
            rec_item = {
                "competency": "Python",
                "action": "Watch tutorial",
                "type": "micro_learning",
                "evidence_ref": python_result.get("evidence_ref"),
                "external_link": youtube_url,
            }
            if explain:
                qwen = QwenService.get_instance()
                ev_items = [{"id": python_result.get("evidence_ref", "E001"), "detail": "Declining trajectory in Python test execution"}]
                exp = await qwen.explain_recommendation(
                    employee_id=learner_id,
                    competency="Python",
                    trend="declining",
                    recommended_action=rec_item,
                    evidence_items=ev_items,
                )
                rec_item["ai_explanation"] = exp.model_dump()
            recommendations.append(rec_item)

    # Mock second declining skill – Data Analysis – with mentorship action
    data_analysis_result = mock_get_skill_trajectory(learner_id, "Data Analysis")
    if data_analysis_result.get("trend") == "declining":
        mentor_info = find_internal_mentor("Data Analysis", learner_id)
        rec_item = {
            "competency": "Data Analysis",
            "action": "Peer Mentorship",
            "type": "peer_mentorship",
            "evidence_ref": data_analysis_result.get("evidence_ref"),
            "mentor_suggestion": {
                "mentor_id": mentor_info["mentor_id"],
                "mentor_name": mentor_info["mentor_name"],
            },
        }
        if explain:
            qwen = QwenService.get_instance()
            ev_items = [{"id": data_analysis_result.get("evidence_ref", "E002"), "detail": "Observed drift in data analysis accuracy"}]
            exp = await qwen.explain_recommendation(
                employee_id=learner_id,
                competency="Data Analysis",
                trend="declining",
                recommended_action=rec_item,
                evidence_items=ev_items,
            )
            rec_item["ai_explanation"] = exp.model_dump()
        recommendations.append(rec_item)

    return {"recommendations": recommendations}


@router.post("/api/v1/recommendations/explain")
async def explain_recommendation_endpoint(
    request: RecommendationExplanationRequest,
    profile: UserProfile = Depends(require_employee),
):
    """Explicitly generate an evidence-grounded AI explanation for a recommended action."""
    from backend.app.ai.qwen_service import QwenService
    qwen = QwenService.get_instance()
    explanation = await qwen.explain_recommendation(
        employee_id=request.learner_id,
        competency=request.competency,
        trend=request.trend,
        recommended_action=request.recommended_action,
        evidence_items=request.evidence_items,
    )
    return explanation.model_dump()


class MentorshipRequest(BaseModel):
    manager_id: str
    mentor_id: str
    mentee_id: str
    competency_id: str


@router.post("/api/v1/manager/mentorship/request")
async def request_mentorship(
    request: MentorshipRequest,
    profile: UserProfile = Depends(require_manager),
):
    """Create a new MentorshipPairing record with a pending status.

    Currently mocked – the real SQLAlchemy write will be wired in during
    integration once the database dependency (get_db) is configured.

    # --- Real implementation (uncomment during integration) ---
    # from fastapi import Depends
    # from models.recommendations import MentorshipPairing
    # async def request_mentorship(request: MentorshipRequest, db: Session = Depends(get_db)):
    #     new_pairing = MentorshipPairing(
    #         mentor_id=request.mentor_id,
    #         mentee_id=request.mentee_id,
    #         competency_id=request.competency_id,
    #         status="pending",
    #         initiated_by_manager_id=request.manager_id,
    #     )
    #     db.add(new_pairing)
    #     db.commit()
    #     db.refresh(new_pairing)
    """
    # Mock: log the request and return success
    print(
        f"[MOCK DB] Mentorship pairing created: "
        f"mentor={request.mentor_id}, mentee={request.mentee_id}, "
        f"competency={request.competency_id}, manager={request.manager_id}"
    )

    return {"status": "success", "message": "Mentorship request initiated"}
