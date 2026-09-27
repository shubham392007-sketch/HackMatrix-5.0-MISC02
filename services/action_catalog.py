"""Action Catalog for the What-If Learning Path Simulator.

Defines structured, configurable development actions that learners can test
counterfactually against their competency evidence trajectories.
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class CandidateAction(BaseModel):
    action_id: str
    title: str
    description: str
    competency_id: Optional[str] = None  # None means applicable to any competency or specified at runtime
    category: str = Field(..., description="learning, engineering_activity, collaboration, review_activity")
    evidence_source: str = Field(..., description="course_completion, project_outcome, assessment")
    default_score: float = Field(85.0, ge=0.0, le=100.0)
    source_confidence_weight: float = Field(0.85, ge=0.0, le=1.0)
    typical_duration_days: int = 14
    default_quantity: int = 1
    quantity_label: str = "sessions"
    parameters: Dict[str, Any] = Field(default_factory=dict)


# Default source weights matching Feature 2 ML feature extraction
SOURCE_WEIGHTS_MAP = {
    'assessment': 1.00,
    'project_outcome': 0.85,
    'course_completion': 0.55
}


class ActionCatalogService:
    """Manages the catalog of supported candidate interventions."""
    _instance = None

    def __init__(self):
        self._actions: Dict[str, CandidateAction] = {}
        self._register_default_actions()

    @classmethod
    def get_instance(cls) -> "ActionCatalogService":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def _register_default_actions(self):
        default_list = [
            CandidateAction(
                action_id="advanced_sql_course",
                title="Complete Advanced SQL Course",
                description="Complete an intensive, structured advanced SQL database curriculum and capstone.",
                competency_id="C04",  # SQL & Databases
                category="learning",
                evidence_source="course_completion",
                default_score=88.0,
                source_confidence_weight=0.55,
                typical_duration_days=21,
                default_quantity=1,
                quantity_label="course"
            ),
            CandidateAction(
                action_id="peer_review_sessions",
                title="Take on Peer-Review Sessions",
                description="Actively participate in collaborative technical peer reviews and code evaluations.",
                competency_id=None,  # Applicable to any competency
                category="review_activity",
                evidence_source="project_outcome",
                default_score=85.0,
                source_confidence_weight=0.85,
                typical_duration_days=7,
                default_quantity=2,
                quantity_label="review sessions"
            ),
            CandidateAction(
                action_id="author_relevant_pr",
                title="Review or Author a Relevant PR",
                description="Author and merge a high-impact pull request demonstrating production-ready proficiency.",
                competency_id=None,  # Applicable to any competency
                category="engineering_activity",
                evidence_source="project_outcome",
                default_score=90.0,
                source_confidence_weight=0.85,
                typical_duration_days=10,
                default_quantity=1,
                quantity_label="pull requests"
            ),
            CandidateAction(
                action_id="hands_on_assessment",
                title="Complete Proctored Skill Assessment",
                description="Take an objective, time-bounded technical competency benchmark evaluation.",
                competency_id=None,
                category="learning",
                evidence_source="assessment",
                default_score=92.0,
                source_confidence_weight=1.00,
                typical_duration_days=2,
                default_quantity=1,
                quantity_label="assessments"
            ),
            CandidateAction(
                action_id="deep_dive_course",
                title="Comprehensive Online Specialization",
                description="Complete an accredited multi-module deep dive course with hands-on labs.",
                competency_id=None,
                category="learning",
                evidence_source="course_completion",
                default_score=85.0,
                source_confidence_weight=0.55,
                typical_duration_days=30,
                default_quantity=1,
                quantity_label="courses"
            ),
        ]
        for a in default_list:
            self._actions[a.action_id] = a

    def get_action(self, action_id: str) -> Optional[CandidateAction]:
        return self._actions.get(action_id)

    def list_actions(self, competency_id: Optional[str] = None) -> List[CandidateAction]:
        """List candidate actions available for a given competency."""
        actions = []
        for a in self._actions.values():
            if a.competency_id is None or competency_id is None or a.competency_id == competency_id:
                actions.append(a)
        return actions

    def register_action(self, action: CandidateAction) -> None:
        self._actions[action.action_id] = action
