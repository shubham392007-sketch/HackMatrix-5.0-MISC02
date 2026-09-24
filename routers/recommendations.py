from fastapi import APIRouter
from pydantic import BaseModel

# Service imports
from services.youtube_service import get_top_youtube_tutorial
from services.mentorship_service import find_internal_mentor
from utils.mock_triggers import mock_get_skill_trajectory

router = APIRouter()


@router.get("/api/v1/learner/{learner_id}/recommendations")
async def get_recommendations(learner_id: str):
    """Return recommendations based on mocked skill‑trajectory analysis.

    Currently the ML pipeline is mocked to always produce a declining trend for
    the "Python" competency. A second mock declining skill – "Data Analysis" –
    demonstrates a mentorship recommendation.
    """
    # Mock ML trigger for Python competency
    python_result = mock_get_skill_trajectory(learner_id, "Python")
    recommendations = []

    if python_result.get("trend") == "declining":
        # Mock that the required action is a YouTube tutorial
        youtube_url = get_top_youtube_tutorial("Python")
        recommendations.append(
            {
                "competency": "Python",
                "action": "Watch tutorial",
                "evidence_ref": python_result.get("evidence_ref"),
                "external_link": youtube_url,
            }
        )

    # Mock second declining skill – Data Analysis – with mentorship action
    data_analysis_result = mock_get_skill_trajectory(learner_id, "Data Analysis")
    if data_analysis_result.get("trend") == "declining":
        mentor_info = find_internal_mentor("Data Analysis", learner_id)
        recommendations.append(
            {
                "competency": "Data Analysis",
                "action": "Peer Mentorship",
                "evidence_ref": data_analysis_result.get("evidence_ref"),
                "mentor_suggestion": {
                    "mentor_id": mentor_info["mentor_id"],
                    "mentor_name": mentor_info["mentor_name"],
                },
            }
        )

    return {"recommendations": recommendations}


class MentorshipRequest(BaseModel):
    manager_id: str
    mentor_id: str
    mentee_id: str
    competency_id: str


@router.post("/api/v1/manager/mentorship/request")
async def request_mentorship(request: MentorshipRequest):
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
