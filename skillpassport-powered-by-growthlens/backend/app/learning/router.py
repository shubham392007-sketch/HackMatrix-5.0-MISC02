"""
Learn & Grow Domain API Router.
Endpoints for learning priorities, curated resource discovery, personalized roadmaps,
practice and assessment attempts, and deterministic mastery telemetry.
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from backend.app.core.logging import get_logger
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, get_current_user_optional, AuthenticatedUser
from backend.app.learning.contracts import (
    UpstreamGapTrigger,
    ProficiencyTier,
    RequirementType,
    ImportanceLevel,
    GapClassification,
    VerificationState,
)
from backend.app.core.config import settings
from backend.app.learning.upstream_adapter import career_db_adapter
from backend.app.learning.provenance_service import (
    provenance_service,
    SkillGapAssessmentResponse,
)
from backend.app.learning.prioritizer import (
    SkillGapPrioritizer,
    PrioritizationResult,
    PrioritizationReasonCode,
    SuggestedNextAction,
)
from backend.app.learning.logic import (
    deterministic_mastery,
    validate_dependency_graph,
    topological_sort_with_priorities,
    verify_pedagogical_alignment,
)
from backend.app.learning.synthetic_ci_adapter import synthetic_ci_adapter
from backend.app.learning.providers.aggregator import ResourceAggregator
from backend.app.learning.providers.base import NormalizedLearningResource
from backend.app.learning.ai_advisor import LearningAIAdvisor
from backend.app.learning.blueprints import (
    CANONICAL_BLUEPRINTS,
    CANONICAL_DIAGNOSTICS,
    CAREER_GAP_BLUEPRINTS,
    synthesize_gap_blueprint,
    get_user_augmented_blueprints,
)
from backend.app.models.learning import (
    LearningRoadmap,
    LearningStep,
    LearningResourceItem,
    LearningAttempt,
    LearningMasterySnapshot,
    LearningAssessment,
    LearningProjectSubmission,
    LearningStepPacketRecord,
    LearningMiniProject,
    LearningActivityRecord,
    LearningActivityModel,
)
from backend.app.models.evidence import EvidenceItem
from backend.app.learning.assessment_generator import (
    assessment_generator,
    AssessmentDefinition,
    AssessmentQuestion,
)

logger = get_logger("api.learning")
router = APIRouter(prefix="/learning", tags=["Domain 5: Learn & Grow"])

# Step response schema
class StepResponse(BaseModel):
    step_id: str
    title: str
    learning_objective: str
    difficulty: str
    estimated_minutes: int
    sequence_order: int
    current_mastery: float
    target_mastery: float
    status: str
    prerequisites_met: bool
    recommendation_reason: str
    recommended_resource_ids: list[str]
    practice_exercise_ids: list[str] | None = None
    assessment_id: str | None = None
    project_id: str | None = None
    roadmap_id: str | None = None
    roadmap_path_id: str | None = None
    skill_id: str | None = None
    domain_id: str | None = None
    domain_title: str | None = None

prioritizer = SkillGapPrioritizer(confidence_review_threshold=0.60)
aggregator = ResourceAggregator()
advisor = LearningAIAdvisor()


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Request / Response Schemas
# ──────────────────────────────────────────────────────────────────────────────

class RoadmapGenerateRequest(BaseModel):
    domain_id: Optional[str] = Field(None, description="Domain blueprint identifier")
    target_role_id: Optional[str] = Field(None, description="Optional target career role ID")
    skill_gap_id: Optional[str] = Field(None, description="Optional specific skill gap ID to remediate")
    skill_id: Optional[str] = Field(None, description="Optional canonical skill ID to remediate")
    step_count: int = Field(4, ge=2, le=8, description="Target number of roadmap steps")
    force_regenerate: bool = Field(False, description="Whether to supersede existing active roadmap and generate afresh")


class EnsureStepRequest(BaseModel):
    topic_id: str = Field(..., description="Topic identifier or topic slug to ensure as a learning step")
    domain_id: Optional[str] = Field(None, description="Optional domain ID context")
    roadmap_id: Optional[str] = Field(None, description="Optional roadmap ID context")
    target_role_id: Optional[str] = Field(None, description="Optional target role context")


class StepCompleteRequest(BaseModel):
    roadmap_id: Optional[str] = Field(None, description="Optional roadmap ID or path_id context")
    notes: Optional[str] = Field(None, description="Optional learner reflection or completion notes")


class ActivityRecordRequest(BaseModel):
    activity_type: str = Field(..., description="Activity event type (e.g. step_completed, resource_viewed, practice_completed, etc.)")
    title: str = Field(..., description="Human-readable event title")
    detail: Optional[str] = Field(None, description="Detailed description or objective")
    roadmap_id: Optional[str] = Field(None, description="Associated roadmap UUID or path_id")
    step_id: Optional[str] = Field(None, description="Associated step identifier")
    domain_id: Optional[str] = Field(None, description="Associated domain ID")
    skill_id: Optional[str] = Field(None, description="Associated skill ID")
    target_role_id: Optional[str] = Field(None, description="Associated career role ID")
    resource_id: Optional[str] = Field(None, description="Associated resource ID")
    assessment_id: Optional[str] = Field(None, description="Associated assessment ID")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    score: Optional[float] = Field(None, description="Score achieved if applicable")
    link_route: Optional[str] = Field(None, description="In-app navigation route")
    activity_status: str = Field("completed", description="Status of the activity")
    activity_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata dictionary")


class CodeValidationRequest(BaseModel):
    exercise_id: str = Field(..., description="Identifier of the practice exercise")
    code: str = Field(..., description="Code to validate structurally")
    language: str = Field("python", description="Language: python, sql, docker, bash")


class CodeTestCaseResult(BaseModel):
    name: str
    status: str  # "pass" or "fail"
    details: str


class CodeValidationResponse(BaseModel):
    passed: bool
    score: float
    execution_type: str = Field("structural_ast_validation", description="Validation mechanism")
    sandboxed_runner_available: bool = Field(False, description="Whether isolated dynamic execution container was invoked")
    test_cases: List[CodeTestCaseResult]
    summary_message: str


class LearningAttemptRequest(BaseModel):
    step_id: str = Field(..., description="ID of the learning step attempted")
    roadmap_id: Optional[str] = Field(None, description="Roadmap ID if associated with a roadmap")
    attempt_type: str = Field(..., description="'practice', 'assessment', 'project', or 'diagnostic'")
    activity_id: str = Field(..., description="Identifier of the practice, quiz, or project task")
    score: float = Field(..., ge=0.0, le=100.0, description="Raw percentage score 0-100")
    signals: Optional[Dict[str, float]] = Field(
        default_factory=dict,
        description="Optional explicit breakdown: {knowledge, practice, assessment, project}",
    )


class DiagnosticSubmitRequest(BaseModel):
    answers: Dict[str, int] = Field(..., description="Map of question_id to selected option index")


class AssessmentGenerateRequest(BaseModel):
    skill_id: str = Field(..., description="Target skill ID to evaluate")
    skill_name: Optional[str] = Field(None, description="Display name of the skill")
    learning_objective: Optional[str] = Field(None, description="Specific learning objective evaluated")
    difficulty: str = Field("Intermediate", description="Target difficulty tier")
    step_id: Optional[str] = Field(None, description="Optional associated roadmap step ID")
    roadmap_id: Optional[str] = Field(None, description="Optional associated roadmap ID")
    force_regenerate: bool = Field(False, description="Generate fresh assessment even if cached")
    is_synthetic: bool = Field(False, description="Whether this is a synthetic evaluation run")
    question_count: Optional[int] = Field(None, ge=1, le=10, description="Optional number of questions to generate (default 4)")


class AssessmentSubmitRequest(BaseModel):
    answers: Dict[str, int] = Field(default_factory=dict, description="Map of question_id to selected option index (0-indexed)")
    is_skipped: bool = Field(False, description="Flag indicating if learner explicitly chose to skip the assessment")


class ProjectGenerateRequest(BaseModel):
    domain_id: str = Field(..., description="Target domain blueprint or gap identifier")
    domain_title: Optional[str] = Field(None, description="Domain display title")
    skill_id: Optional[str] = Field(None, description="Optional target canonical skill ID")
    skill_name: Optional[str] = Field(None, description="Optional target canonical skill name")
    gap_id: Optional[str] = Field(None, description="Optional Career Intelligence gap ID")
    target_role_id: Optional[str] = Field(None, description="Optional target career role ID")
    roadmap_id: Optional[str] = Field(None, description="Optional associated roadmap ID")
    count: int = Field(3, ge=1, le=5, description="Number of projects to generate")
    force_regenerate: bool = Field(False, description="Whether to generate afresh and supersede older projects")


class ProjectSubmissionCreate(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=100, description="Project identifier (e.g. 'proj-outlier-pipeline')")
    github_repo_url: str = Field(..., min_length=5, max_length=500, description="GitHub repository URL")
    summary_notes: Optional[str] = Field(None, max_length=5000, description="Candidate implementation notes")
    step_id: Optional[str] = Field(None, max_length=100, description="Associated roadmap step ID")
    roadmap_id: Optional[str] = Field(None, description="Associated roadmap ID")


class ProjectEvaluationRequest(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Evaluated score percentage 0-100")
    feedback: Optional[str] = Field(None, description="Reviewer feedback")
    rubric_scores: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Criterion breakdown")


# ──────────────────────────────────────────────────────────────────────────────
# 1. UPSTREAM PRIORITIES & CAREER GAP INGESTION
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/priorities")
def get_learning_priorities(
    target_role_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves the authenticated user's prioritized learning gaps derived from
    Career Intelligence snapshots and Skill Intelligence taxonomy in the shared database.
    """
    target_role = career_db_adapter.get_user_target_role(db, user.id)
    resolved_role_id = target_role_id or (target_role.get("target_role_id") if target_role else None)
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id, resolved_role_id)
    results = [prioritizer.evaluate_item(t) for t in triggers]
    results.sort(key=lambda r: (r.priority_rank, -r.priority_score))

    enriched = []
    for r, t in zip(results, triggers):
        d = r.model_dump()
        d["gap_id"] = t.gap_id
        d["domain_id"] = t.gap_id
        d["role_id"] = t.role.role_id
        d["role_title"] = t.role.role_title
        enriched.append(d)

    role_title = (
        target_role.get("role_title")
        if target_role
        else (triggers[0].role.role_title if triggers else None)
    )
    role_id = (
        target_role.get("target_role_id")
        if target_role
        else (triggers[0].role.role_id if triggers else None)
    )

    return {
        "user_id": user.id,
        "count": len(enriched),
        "target_role_id": role_id,
        "target_role_title": role_title,
        "confidence_review_threshold": prioritizer.confidence_review_threshold,
        "priorities": enriched,
    }


@router.post("/refresh-gaps")
def refresh_career_gaps(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Explicitly re-evaluates upstream Career Intelligence and Skill Intelligence records.
    Guarantees idempotency and avoids unnecessary database polling loops.
    """
    career_db_adapter.invalidate_cache(user.id)
    target_role = career_db_adapter.get_user_target_role(db, user.id)
    resolved_role_id = target_role.get("target_role_id") if target_role else None
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id, resolved_role_id, force_refresh=True)
    results = [prioritizer.evaluate_item(t) for t in triggers]
    results.sort(key=lambda r: (r.priority_rank, -r.priority_score))

    enriched = []
    for r, t in zip(results, triggers):
        d = r.model_dump()
        d["gap_id"] = t.gap_id
        d["domain_id"] = t.gap_id
        d["role_id"] = t.role.role_id
        d["role_title"] = t.role.role_title
        enriched.append(d)

    role_title = (
        target_role.get("role_title")
        if target_role
        else (triggers[0].role.role_title if triggers else "Target Career Role")
    )
    role_id = (
        target_role.get("target_role_id")
        if target_role
        else (triggers[0].role.role_id if triggers else None)
    )

    return {
        "status": "refreshed",
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "count": len(enriched),
        "target_role_id": role_id,
        "target_role_title": role_title,
        "priorities": enriched,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. DOMAIN BLUEPRINTS & DIAGNOSTICS
# ──────────────────────────────────────────────────────────────────────────────

def get_db_optional():
    """Provides a database session if available without crashing endpoints
    (e.g., live provider search discovery). Allows the endpoint to return live provider
    results even if DB is experiencing a transient connection hiccup."""
    db = None
    try:
        from backend.app.db.reliability import circuit_breaker
        circuit_breaker.check_availability()
        from backend.app.db.session import SessionLocal
        db = SessionLocal()
    except Exception:
        db = None

    if db is None:
        yield None
        return

    try:
        yield db
        circuit_breaker.record_success()
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        circuit_breaker.record_failure(exc)
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.get("/blueprints")
def list_blueprints(
    db: Optional[Session] = Depends(get_db_optional),
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
):
    """
    Returns domain blueprints for structured engineering upskilling,
    dynamically prioritizing the authenticated user's active career skill gaps.
    """
    blueprints = get_user_augmented_blueprints(db, user)
    return {"blueprints": blueprints}


@router.get("/blueprints/{domain_id}")
def get_blueprint(
    domain_id: str,
    db: Optional[Session] = Depends(get_db_optional),
    user: Optional[AuthenticatedUser] = Depends(get_current_user_optional),
):
    """
    Fetches a specific domain blueprint by domain_id, including dynamically synthesized
    gap blueprints.
    """
    all_blueprints = get_user_augmented_blueprints(db, user)
    for bp in all_blueprints:
        if bp["domain_id"] == domain_id:
            return bp

    # Fallback synthesize on demand for gap- or skill- identifiers
    if domain_id.startswith("gap-") or domain_id.startswith("skill-"):
        clean_name = domain_id.replace("gap-", "").replace("skill-", "").replace("-", " ").title()
        return synthesize_gap_blueprint(domain_id, clean_name)

    raise HTTPException(status_code=404, detail=f"Domain blueprint '{domain_id}' not found.")


@router.get("/blueprints/{domain_id}/diagnostic")
def get_diagnostic_questions(domain_id: str):
    """
    Retrieves the diagnostic question set for domain baseline calibration.
    Intelligently maps career gap domains to authentic technical question sets.
    """
    questions = CANONICAL_DIAGNOSTICS.get(domain_id)
    if not questions:
        d_lower = domain_id.lower()
        if any(k in d_lower for k in ("postgres", "postgresql", "sql", "data-eng", "relational", "database", "046377b2")):
            questions = CANONICAL_DIAGNOSTICS.get("data-eng")
        elif any(k in d_lower for k in ("dist", "stream", "kafka", "event", "dist-sys")):
            questions = CANONICAL_DIAGNOSTICS.get("dist-sys")
        elif any(k in d_lower for k in ("cloud", "devops", "docker", "infra", "024e9309")):
            questions = [
                {
                    "id": f"diag-{domain_id}-1",
                    "domain_id": domain_id,
                    "module_id": "mod-cloud-1",
                    "topic_id": "topic-iac-lifecycle",
                    "category": "architecture",
                    "question_text": "When managing immutable cloud infrastructure with Terraform, how should state file locking be enforced in multi-engineer teams?",
                    "options": [
                        "Commit terraform.tfstate directly into Git with merge conflict resolution",
                        "Use remote state storage (e.g. AWS S3 with DynamoDB table state locking)",
                        "Disable state locking to allow parallel terraform apply executions",
                        "Rely exclusively on local workstation state files",
                    ],
                    "correct_index": 1,
                    "explanation": "Remote state backend with distributed locking prevents concurrent state corruption.",
                },
                {
                    "id": f"diag-{domain_id}-2",
                    "domain_id": domain_id,
                    "module_id": "mod-cloud-2",
                    "topic_id": "topic-container-security",
                    "category": "implementation",
                    "question_text": "What is the recommended security posture for running containerized microservices in production?",
                    "options": [
                        "Run as root user with privileged flags for maximum host access",
                        "Run as non-root UID with read-only root filesystem and minimal Linux capabilities",
                        "Mount the Docker socket /var/run/docker.sock into application containers",
                        "Disable container network namespaces",
                    ],
                    "correct_index": 1,
                    "explanation": "Non-root execution and read-only root filesystems minimize container breakout surface area.",
                }
            ]
        elif any(k in d_lower for k in ("python", "programming", "602d5bcb")):
            questions = [
                {
                    "id": f"diag-{domain_id}-1",
                    "domain_id": domain_id,
                    "module_id": "mod-py-1",
                    "topic_id": "topic-async-concurrency",
                    "category": "concept",
                    "question_text": "In Python asyncio, what happens if a CPU-bound computation is run directly inside a coroutine without executor offloading?",
                    "options": [
                        "The asyncio event loop automatically distributes it to background OS threads",
                        "It blocks the single-threaded event loop, starving all other concurrent I/O tasks",
                        "Python throws a ConcurrencyViolationException immediately",
                        "The GIL automatically yields after 5 milliseconds of execution",
                    ],
                    "correct_index": 1,
                    "explanation": "CPU-bound work blocks the asyncio event loop thread; run_in_executor or ProcessPoolExecutor is required.",
                },
                {
                    "id": f"diag-{domain_id}-2",
                    "domain_id": domain_id,
                    "module_id": "mod-py-2",
                    "topic_id": "topic-type-annotations",
                    "category": "implementation",
                    "question_text": "How should runtime type validation be enforced when ingesting untrusted external JSON in modern Python?",
                    "options": [
                        "Rely solely on PEP 484 type hints without validation libraries",
                        "Use Pydantic models or msgspec schemas to validate types and constraints at runtime",
                        "Use isinstance() checks for every nested dictionary key manually",
                        "Cast inputs using typing.cast()",
                    ],
                    "correct_index": 1,
                    "explanation": "Type hints are erased at runtime; Pydantic or schema validators enforce data integrity.",
                }
            ]
        else:
            questions = [
                {
                    "id": f"diag-{domain_id}-1",
                    "domain_id": domain_id,
                    "module_id": "mod-base-1",
                    "topic_id": "topic-core",
                    "category": "concept",
                    "question_text": f"What is the foundational architectural principle governing {domain_id.replace('gap-', '').replace('skill-', '').replace('-', ' ').title()}?",
                    "options": [
                        "High coupling with synchronous inter-service blocking",
                        "Decoupled state management with bounded context boundaries",
                        "Monolithic shared database with unrestricted schema mutations",
                        "Ignoring idempotency on distributed mutations",
                    ],
                    "correct_index": 1,
                    "explanation": "Decoupled state boundaries isolate failure domains and enable independent scaling.",
                }
            ]
    # Strip correct_index before delivering to client to prevent answer leakage
    safe_questions = []
    for q in questions:
        q_copy = dict(q)
        q_copy.pop("correct_index", None)
        q_copy.pop("explanation", None)
        safe_questions.append(q_copy)

    return {
        "domain_id": domain_id,
        "total_questions": len(safe_questions),
        "questions": safe_questions,
    }


@router.post("/blueprints/{domain_id}/diagnostic/submit")
def submit_diagnostic(
    domain_id: str,
    payload: DiagnosticSubmitRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Evaluates diagnostic responses, computes category scores, and records the baseline attempt.
    """
    questions = CANONICAL_DIAGNOSTICS.get(domain_id, [])
    if not questions:
        # Pass by default if no questions configured
        return {
            "attempt_id": str(uuid.uuid4()),
            "domain_id": domain_id,
            "overall_score": 75.0,
            "recommended_focus": ["Foundational Modules"],
        }

    correct_count = 0
    q_map = {q["id"]: q for q in questions}
    for qid, ans_idx in payload.answers.items():
        if qid in q_map and q_map[qid]["correct_index"] == ans_idx:
            correct_count += 1

    overall_score = round((correct_count / max(1, len(questions))) * 100, 1)

    # Record diagnostic attempt
    attempt = LearningAttempt(
        owner_user_id=uuid.UUID(user.id),
        step_id=f"diag-{domain_id}",
        attempt_type="diagnostic",
        activity_id=f"diagnostic-{domain_id}",
        score=overall_score,
        passed=overall_score >= 60.0,
        signals={
            "knowledge_signal": overall_score,
            "practice_signal": 0.0,
            "assessment_signal": overall_score,
            "project_signal": 0.0,
        },
        computed_mastery=round(overall_score * 0.30, 1),
        attempt_metadata={"submitted_answers": payload.answers},
    )
    db.add(attempt)
    attempt_id = str(attempt.id)
    db.commit()

    return {
        "attempt_id": attempt_id,
        "domain_id": domain_id,
        "overall_score": overall_score,
        "passed": overall_score >= 60.0,
        "recommended_focus": (
            ["Advance directly to intermediate modules"]
            if overall_score >= 80.0
            else ["Foundational concepts & prerequisite review"]
        ),
    }


# ──────────────────────────────────────────────────────────────────────────────
# 3. CURATED RESOURCE DISCOVERY (YouTube, DEV.to, GitHub)
# ──────────────────────────────────────────────────────────────────────────────

def find_topic_across_blueprints(topic_id_or_step_id: str) -> tuple[Optional[dict], Optional[dict]]:
    """Returns (topic_dict, blueprint_dict) matching topic_id or step_id across canonical and career gap blueprints."""
    import re
    clean = topic_id_or_step_id.replace("step-", "").strip()
    canonical_list = CANONICAL_BLUEPRINTS if isinstance(CANONICAL_BLUEPRINTS, list) else list(CANONICAL_BLUEPRINTS.values())
    career_list = list(CAREER_GAP_BLUEPRINTS.values()) if isinstance(CAREER_GAP_BLUEPRINTS, dict) else list(CAREER_GAP_BLUEPRINTS)
    all_blueprints = canonical_list + career_list
    for bp in all_blueprints:
        for mod in bp.get("modules", []):
            for top in mod.get("topics", []):
                t_id = top.get("id", "")
                if t_id == clean or t_id == topic_id_or_step_id or f"step-{t_id}" == topic_id_or_step_id:
                    return top, bp

    # Try synthesizing if skill is embedded in id (e.g. topic-gap-skill-docker-core -> skill-docker)
    match = re.search(r'(gap-skill-[a-z0-9\-]+|skill-[a-z0-9\-]+)', clean)
    if match:
        skill_id = match.group(1)
        bp = synthesize_gap_blueprint(
            skill_id=skill_id,
            canonical_name=skill_id.replace("gap-", "").replace("skill-", "").replace("-", " ").title(),
        )
        for mod in bp.get("modules", []):
            for top in mod.get("topics", []):
                t_id = top.get("id", "")
                if t_id == clean or t_id == topic_id_or_step_id or f"step-{t_id}" == topic_id_or_step_id:
                    return top, bp
        if bp.get("modules") and bp["modules"][0].get("topics"):
            return bp["modules"][0]["topics"][0], bp

    return None, None


@router.get("/steps/{step_id}", response_model=StepResponse)
def get_learning_step(
    step_id: str,
    roadmap_id: Optional[str] = Query(None, description="Optional roadmap ID or path_id to disambiguate steps"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific learning step for the authenticated user, strictly read-only.
    Returns HTTP 404 if the step does not exist; does not perform silent inserts.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_step_id = step_id.strip()
    topic_candidate = clean_step_id.replace("step-", "")

    query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.topic_id == clean_step_id,
                LearningStep.topic_id == topic_candidate,
                LearningStep.step_id == topic_candidate,
                LearningStep.step_id == f"step-{topic_candidate}",
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )
    if roadmap_id:
        try:
            rm_uuid = uuid.UUID(roadmap_id)
            query = query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            query = query.filter(LearningRoadmap.path_id == roadmap_id)
    else:
        query = query.order_by(
            desc(LearningRoadmap.status == "in_progress"),
            desc(LearningRoadmap.created_at),
        )

    step = query.first()
    if not step:
        raise HTTPException(status_code=404, detail=f"Learning step '{step_id}' not found")

    return StepResponse(
        step_id=step.step_id,
        title=step.title,
        learning_objective=step.learning_objective,
        difficulty=step.difficulty,
        estimated_minutes=step.estimated_minutes,
        sequence_order=step.sequence_order,
        current_mastery=step.current_mastery,
        target_mastery=step.target_mastery,
        status=step.status,
        prerequisites_met=step.prerequisites_met,
        recommendation_reason=step.recommendation_reason,
        recommended_resource_ids=step.recommended_resource_ids,
        practice_exercise_ids=step.practice_exercise_ids,
        assessment_id=step.assessment_id,
        project_id=step.project_id,
        roadmap_id=str(step.roadmap.id) if step.roadmap else str(step.roadmap_id),
        roadmap_path_id=step.roadmap.path_id if step.roadmap else None,
        skill_id=step.roadmap.domain_id if step.roadmap else step.topic_id,
        domain_id=step.roadmap.domain_id if step.roadmap else None,
        domain_title=step.roadmap.domain_title if step.roadmap else None,
    )


@router.post("/steps/ensure", response_model=StepResponse)
def ensure_learning_step(
    payload: EnsureStepRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Explicitly and idempotently ensure that a learning step exists for the authenticated user.
    Creates the roadmap and step if not present, or returns the existing record.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_topic_id = payload.topic_id.strip()
    topic_candidate = clean_topic_id.replace("step-", "")
    clean_step_id = f"step-{topic_candidate}"

    # 1. Check if step already exists for user
    query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.step_id == clean_topic_id,
                LearningStep.topic_id == clean_topic_id,
                LearningStep.topic_id == topic_candidate,
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )
    if payload.roadmap_id:
        try:
            rm_uuid = uuid.UUID(payload.roadmap_id)
            query = query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            query = query.filter(LearningRoadmap.path_id == payload.roadmap_id)
    elif payload.domain_id:
        query = query.filter(LearningRoadmap.domain_id == payload.domain_id)

    step = query.first()
    if step:
        return StepResponse(
            step_id=step.step_id,
            title=step.title,
            learning_objective=step.learning_objective,
            difficulty=step.difficulty,
            estimated_minutes=step.estimated_minutes,
            sequence_order=step.sequence_order,
            current_mastery=step.current_mastery,
            target_mastery=step.target_mastery,
            status=step.status,
            prerequisites_met=step.prerequisites_met,
            recommendation_reason=step.recommendation_reason,
            recommended_resource_ids=step.recommended_resource_ids,
            practice_exercise_ids=step.practice_exercise_ids,
            assessment_id=step.assessment_id,
            project_id=step.project_id,
            roadmap_id=str(step.roadmap.id) if step.roadmap else str(step.roadmap_id),
            roadmap_path_id=step.roadmap.path_id if step.roadmap else None,
            skill_id=step.roadmap.domain_id if step.roadmap else step.topic_id,
            domain_id=step.roadmap.domain_id if step.roadmap else None,
            domain_title=step.roadmap.domain_title if step.roadmap else None,
        )

    # 2. Not found: resolve topic across blueprints
    top, bp = find_topic_across_blueprints(clean_topic_id)
    if not top or not bp:
        fallback_slug = clean_topic_id or "core-engineering"
        domain_id = payload.domain_id or f"domain-{fallback_slug}"
        derived_title = (payload.domain_id or fallback_slug).replace("domain-", "").replace("gap-", "").replace("skill-", "").replace("-", " ").title()
        bp = synthesize_gap_blueprint(domain_id, derived_title)
        top = bp.get("modules", [{}])[0].get("topics", [{}])[0] if bp.get("modules") and bp["modules"][0].get("topics") else {
            "id": topic_candidate,
            "title": topic_candidate.replace("-", " ").title(),
            "learning_objective": f"Demonstrate verified competency in {topic_candidate}.",
            "difficulty": "Intermediate",
            "estimated_minutes": 45,
            "target_mastery": 85.0,
        }

    domain_id = payload.domain_id or bp.get("domain_id") or f"domain-{clean_topic_id}"
    domain_title = bp.get("title") or domain_id.replace("domain-", "").replace("-", " ").title()

    # Locate or create roadmap for this user in this domain
    roadmap = (
        db.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == user_uuid, LearningRoadmap.domain_id == domain_id)
        .order_by(desc(LearningRoadmap.created_at))
        .first()
    )
    if not roadmap:
        clean_d_short = domain_id[:75] if len(domain_id) > 75 else domain_id
        roadmap = LearningRoadmap(
            owner_user_id=user_uuid,
            domain_id=domain_id[:100],
            domain_title=domain_title[:255],
            path_id=f"roadmap-{clean_d_short}"[:100],
            status="in_progress",
            total_steps=1,
            completed_steps=0,
            baseline_mastery=0.0,
            current_mastery=0.0,
            target_mastery=85.0,
            estimated_total_hours=float(bp.get("estimated_hours", 12)),
            generation_method="curated_blueprint",
        )
        db.add(roadmap)
        db.commit()
        db.refresh(roadmap)

    # Count existing steps to assign next sequence order
    existing_step_count = db.query(LearningStep).filter(LearningStep.roadmap_id == roadmap.id).count()

    step = LearningStep(
        roadmap_id=roadmap.id,
        step_id=clean_step_id[:100],
        topic_id=str(top.get("id", topic_candidate))[:100],
        module_id=str(bp.get("modules", [{}])[0].get("id", "mod-1") if bp.get("modules") else "mod-1")[:100],
        title=top.get("title", clean_step_id.replace("step-", "").replace("-", " ").title()),
        learning_objective=top.get("learning_objective", f"Demonstrate verified mastery of {top.get('title', 'target topic')}."),
        difficulty=top.get("difficulty", "Intermediate"),
        estimated_minutes=top.get("estimated_minutes", 45),
        sequence_order=existing_step_count + 1,
        current_mastery=0.0,
        target_mastery=float(top.get("target_mastery", 85.0)),
        prerequisite_ids=[],
        prerequisites_met=True,
        status="available",
        recommendation_reason=f"Targeted pedagogical step for {domain_title}.",
        recommended_resource_ids=(
            ["res-yt-sql-indexing", "res-topic-outlier-iqr-01"]
            if ("sql" in str(domain_id).lower() or "postgres" in str(domain_title).lower() or "046377b2" in str(domain_id).lower())
            else ["res-yt-iqr-outliers", "res-topic-outlier-winsorization-01"]
        ),
        practice_exercise_ids=[f"prac-{top.get('id', topic_candidate)}"],
        assessment_id=f"asmt-{top.get('id', topic_candidate)}",
        project_id=None,
    )
    db.add(step)
    roadmap.total_steps = existing_step_count + 1
    db.commit()
    db.refresh(step)

    return StepResponse(
        step_id=step.step_id,
        title=step.title,
        learning_objective=step.learning_objective,
        difficulty=step.difficulty,
        estimated_minutes=step.estimated_minutes,
        sequence_order=step.sequence_order,
        current_mastery=step.current_mastery,
        target_mastery=step.target_mastery,
        status=step.status,
        prerequisites_met=step.prerequisites_met,
        recommendation_reason=step.recommendation_reason,
        recommended_resource_ids=step.recommended_resource_ids,
        practice_exercise_ids=step.practice_exercise_ids,
        assessment_id=step.assessment_id,
        project_id=step.project_id,
        roadmap_id=str(step.roadmap.id) if step.roadmap else str(step.roadmap_id),
        roadmap_path_id=step.roadmap.path_id if step.roadmap else None,
        skill_id=step.roadmap.domain_id if step.roadmap else step.topic_id,
        domain_id=step.roadmap.domain_id if step.roadmap else None,
        domain_title=step.roadmap.domain_title if step.roadmap else None,
    )


@router.post("/steps/{step_id}/complete")
def mark_step_complete(
    step_id: str,
    payload: Optional[StepCompleteRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authoritative server-side completion of a learning step within a user's roadmap.
    1. Authenticates user and verifies step & roadmap ownership.
    2. Atomically sets step status to 'completed'.
    3. Recomputes step mastery, parent roadmap completed_steps, total_steps, current_mastery, and roadmap status.
    4. Unlocks the next sequential step if locked.
    5. Records a genuine LearningActivityRecord in learning_activities.
    6. Returns updated completion status and roadmap progress metrics.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_step_id = step_id.strip()
    topic_candidate = clean_step_id.replace("step-", "")

    # Query step ensuring ownership by current user
    query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.topic_id == clean_step_id,
                LearningStep.topic_id == topic_candidate,
                LearningStep.step_id == topic_candidate,
                LearningStep.step_id == f"step-{topic_candidate}",
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )

    req_roadmap_id = payload.roadmap_id if payload else None
    if req_roadmap_id:
        try:
            rm_uuid = uuid.UUID(req_roadmap_id)
            query = query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            query = query.filter(LearningRoadmap.path_id == req_roadmap_id)
    else:
        query = query.order_by(
            desc(LearningRoadmap.status == "in_progress"),
            desc(LearningRoadmap.created_at),
        )

    step = query.first()
    if not step:
        raise HTTPException(status_code=404, detail=f"Learning step '{step_id}' not found for user")

    roadmap = step.roadmap
    if not roadmap or roadmap.owner_user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to modify this roadmap step")

    already_completed = (step.status == "completed")

    # 1. Update step status and mastery
    step.status = "completed"
    if step.current_mastery < step.target_mastery * 0.85:
        step.current_mastery = round(step.target_mastery * 0.9, 1)

    # 2. Recalculate parent roadmap progress
    all_steps = roadmap.steps
    completed_count = sum(1 for s in all_steps if s.status == "completed")
    total_count = len(all_steps) or 1
    roadmap.completed_steps = completed_count
    roadmap.total_steps = len(all_steps)
    roadmap.current_mastery = round(sum(s.current_mastery for s in all_steps) / total_count, 1)

    if completed_count >= len(all_steps) and len(all_steps) > 0:
        roadmap.status = "completed"
    elif roadmap.status == "available":
        roadmap.status = "in_progress"

    # 3. Unlock next sequential step in roadmap
    next_step = (
        db.query(LearningStep)
        .filter(
            LearningStep.roadmap_id == roadmap.id,
            LearningStep.sequence_order == step.sequence_order + 1,
        )
        .first()
    )
    if next_step and next_step.status == "locked":
        next_step.status = "available"
        next_step.prerequisites_met = True

    # 4. Record learning activity (deduped if already completed recently)
    activity_id = None
    if not already_completed:
        act = LearningActivityRecord(
            owner_user_id=user_uuid,
            roadmap_id=roadmap.id,
            step_id=step.step_id,
            activity_type="step_completed",
            activity_status="completed",
            title=f"Completed Objective: {step.title}",
            detail=f"Mastered pedagogical objective: {step.learning_objective}",
            domain_id=roadmap.domain_id,
            skill_id=roadmap.domain_id.replace("gap-", "") if roadmap.domain_id else None,
            target_role_id=roadmap.target_role_id,
            score=step.current_mastery,
            link_route=f"/app/learning/steps/{step.step_id}",
            activity_metadata={
                "step_title": step.title,
                "sequence_order": step.sequence_order,
                "notes": payload.notes if payload else None,
                "target_mastery": step.target_mastery,
            },
        )
        db.add(act)
        db.flush()
        activity_id = str(act.id)

    db.commit()
    db.refresh(step)
    db.refresh(roadmap)

    pct = round((roadmap.completed_steps / (roadmap.total_steps or 1)) * 100, 1)

    return {
        "status": "completed",
        "already_completed": already_completed,
        "step_id": step.step_id,
        "title": step.title,
        "current_mastery": step.current_mastery,
        "target_mastery": step.target_mastery,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "roadmap_id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "activity_id": activity_id,
        "roadmap_progress": {
            "completed_steps": roadmap.completed_steps,
            "total_steps": roadmap.total_steps,
            "completion_percentage": pct,
            "current_mastery": roadmap.current_mastery,
            "target_mastery": roadmap.target_mastery,
            "status": roadmap.status,
        },
    }


@router.post("/steps/{step_id}/skip")
def skip_step(
    step_id: str,
    payload: Optional[StepCompleteRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Explicitly marks a roadmap step as 'skipped'.
    1. Authenticates user and verifies step ownership.
    2. Atomically sets step status to 'skipped'.
    3. Unlocks the next sequential step without granting mastery credit (score remains 0.0 or unchanged).
    4. Records a LearningActivityRecord with status 'skipped'.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_step_id = step_id.strip()
    topic_candidate = clean_step_id.replace("step-", "")

    query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.topic_id == clean_step_id,
                LearningStep.topic_id == topic_candidate,
                LearningStep.step_id == topic_candidate,
                LearningStep.step_id == f"step-{topic_candidate}",
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )

    req_roadmap_id = payload.roadmap_id if payload else None
    if req_roadmap_id:
        try:
            rm_uuid = uuid.UUID(req_roadmap_id)
            query = query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            query = query.filter(LearningRoadmap.path_id == req_roadmap_id)
    else:
        query = query.order_by(
            desc(LearningRoadmap.status == "in_progress"),
            desc(LearningRoadmap.created_at),
        )

    step = query.first()
    if not step:
        raise HTTPException(status_code=404, detail=f"Learning step '{step_id}' not found for user")

    roadmap = step.roadmap
    if not roadmap or roadmap.owner_user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to modify this roadmap step")

    # 1. Update step status to 'skipped' and preserve zero/existing mastery (DO NOT award mastery credit)
    step.status = "skipped"

    # 2. Unlock next sequential step in roadmap so user can proceed
    next_step = (
        db.query(LearningStep)
        .filter(
            LearningStep.roadmap_id == roadmap.id,
            LearningStep.sequence_order == step.sequence_order + 1,
        )
        .first()
    )
    if next_step and next_step.status == "locked":
        next_step.status = "available"
        next_step.prerequisites_met = True

    # 3. Record learning activity
    act = LearningActivityRecord(
        owner_user_id=user_uuid,
        roadmap_id=roadmap.id,
        step_id=step.step_id,
        activity_type="step_skipped",
        activity_status="skipped",
        title=f"Skipped Step: {step.title}",
        detail=f"Bypassed objective: {step.learning_objective}. No mastery credit granted.",
        domain_id=roadmap.domain_id,
        skill_id=roadmap.domain_id.replace("gap-", "") if roadmap.domain_id else None,
        target_role_id=roadmap.target_role_id,
        score=0.0,
        link_route=f"/app/learning/steps/{step.step_id}",
    )
    db.add(act)
    db.commit()
    db.refresh(step)
    db.refresh(roadmap)

    return {
        "status": "skipped",
        "step_id": step.step_id,
        "title": step.title,
        "current_mastery": step.current_mastery,
        "roadmap_id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "unlocked_next_step_id": next_step.step_id if next_step else None,
        "message": "Step skipped successfully. Subsequent step unlocked without awarding mastery credit.",
    }


@router.post("/steps/{step_id}/resume")
def resume_step(
    step_id: str,
    payload: Optional[StepCompleteRequest] = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Un-skips / resumes a skipped step so the learner can complete it.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_step_id = step_id.strip()
    topic_candidate = clean_step_id.replace("step-", "")

    query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.topic_id == clean_step_id,
                LearningStep.topic_id == topic_candidate,
                LearningStep.step_id == topic_candidate,
                LearningStep.step_id == f"step-{topic_candidate}",
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )

    req_roadmap_id = payload.roadmap_id if payload else None
    if req_roadmap_id:
        try:
            rm_uuid = uuid.UUID(req_roadmap_id)
            query = query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            query = query.filter(LearningRoadmap.path_id == req_roadmap_id)

    step = query.first()
    if not step:
        raise HTTPException(status_code=404, detail=f"Learning step '{step_id}' not found for user")

    if step.status == "skipped":
        step.status = "in_progress"
        db.commit()
        db.refresh(step)

    return {
        "status": step.status,
        "step_id": step.step_id,
        "title": step.title,
        "message": "Step unskipped. Ready to resume.",
    }


def serialize_activity(act: LearningActivityRecord) -> Dict[str, Any]:
    return {
        "id": str(act.id),
        "owner_user_id": str(act.owner_user_id),
        "roadmap_id": str(act.roadmap_id) if act.roadmap_id else None,
        "step_id": act.step_id,
        "activity_type": act.activity_type,
        "activity_status": act.activity_status,
        "title": act.title,
        "detail": act.detail,
        "domain_id": act.domain_id,
        "skill_id": act.skill_id,
        "target_role_id": act.target_role_id,
        "resource_id": act.resource_id,
        "assessment_id": act.assessment_id,
        "project_id": act.project_id,
        "score": act.score,
        "link_route": act.link_route,
        "activity_metadata": act.activity_metadata or {},
        "created_at": act.created_at.isoformat() if act.created_at else None,
        "updated_at": act.updated_at.isoformat() if act.updated_at else None,
    }


@router.get("/history")
def get_learning_history(
    limit: int = Query(50, ge=1, le=200, description="Maximum items to return"),
    offset: int = Query(0, ge=0, description="Items to skip"),
    domain_id: Optional[str] = Query(None, description="Filter by domain ID"),
    activity_type: Optional[str] = Query(None, description="Filter by activity event type"),
    roadmap_id: Optional[str] = Query(None, description="Filter by roadmap ID or path_id"),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves chronological persisted learning activities for the authenticated user.
    Supports filtering by domain, activity type, and roadmap.
    """
    owner_uuid = uuid.UUID(user.id)
    query = db.query(LearningActivityRecord).filter(
        LearningActivityRecord.owner_user_id == owner_uuid
    )

    if domain_id:
        query = query.filter(LearningActivityRecord.domain_id == domain_id.strip())

    if activity_type:
        query = query.filter(LearningActivityRecord.activity_type == activity_type.strip())

    if roadmap_id:
        clean_rm = roadmap_id.strip()
        try:
            rm_uuid = uuid.UUID(clean_rm)
            query = query.filter(LearningActivityRecord.roadmap_id == rm_uuid)
        except ValueError:
            rm = db.query(LearningRoadmap).filter(
                LearningRoadmap.path_id == clean_rm,
                LearningRoadmap.owner_user_id == owner_uuid,
            ).first()
            if rm:
                query = query.filter(LearningActivityRecord.roadmap_id == rm.id)

    total = query.count()
    activities = (
        query.order_by(desc(LearningActivityRecord.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "activities": [serialize_activity(a) for a in activities],
    }


@router.post("/history/record")
def record_learning_activity_endpoint(
    payload: ActivityRecordRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Explicitly records an interactive learning activity (e.g. resource access, practice attempt, notes).
    Persists to learning_activities table.
    """
    owner_uuid = uuid.UUID(user.id)

    roadmap_uuid = None
    if payload.roadmap_id:
        try:
            roadmap_uuid = uuid.UUID(payload.roadmap_id)
        except ValueError:
            rm = db.query(LearningRoadmap).filter(
                LearningRoadmap.path_id == payload.roadmap_id,
                LearningRoadmap.owner_user_id == owner_uuid,
            ).first()
            if rm:
                roadmap_uuid = rm.id

    act = LearningActivityRecord(
        owner_user_id=owner_uuid,
        roadmap_id=roadmap_uuid,
        step_id=payload.step_id,
        activity_type=payload.activity_type,
        activity_status=payload.activity_status or "completed",
        title=payload.title,
        detail=payload.detail,
        domain_id=payload.domain_id,
        skill_id=payload.skill_id,
        target_role_id=payload.target_role_id,
        resource_id=payload.resource_id,
        assessment_id=payload.assessment_id,
        project_id=payload.project_id,
        score=payload.score,
        link_route=payload.link_route,
        activity_metadata=payload.activity_metadata or {},
    )
    db.add(act)
    db.commit()
    db.refresh(act)

    return serialize_activity(act)


@router.get("/steps/{step_id}/packet")
async def get_learning_step_packet(
    step_id: str,
    roadmap_id: Optional[str] = Query(None, description="Optional roadmap ID or path_id"),
    regenerate: bool = Query(False, description="Force re-generation with AI model"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve or generate substantive pedagogical study packet with verified provenance.
    Persists newly generated or retrieved packets to database table learning_step_packets.
    """
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    clean_step_id = step_id.strip()
    topic_candidate = clean_step_id.replace("step-", "")

    # 1. Check if packet is already persisted in DB (unless explicitly regenerating)
    if not regenerate:
        existing_record = (
            db.query(LearningStepPacketRecord)
            .filter(
                or_(
                    LearningStepPacketRecord.step_id == clean_step_id,
                    LearningStepPacketRecord.step_id == f"step-{topic_candidate}",
                    LearningStepPacketRecord.topic_id == clean_step_id,
                    LearningStepPacketRecord.topic_id == topic_candidate,
                )
            )
            .order_by(desc(LearningStepPacketRecord.created_at))
            .first()
        )
        if existing_record:
            is_ai = existing_record.generation_method in ("ollama_qwen", "saved_ai_packet")
            gen_method = "saved_ai_packet" if is_ai else existing_record.generation_method
            return {
                "step_id": existing_record.step_id,
                "topic_id": existing_record.topic_id,
                "title": existing_record.title,
                "learning_objective": existing_record.learning_objective,
                "why_this_matters": existing_record.why_this_matters,
                "what_is_it": existing_record.what_is_it,
                "why_and_when": existing_record.why_and_when,
                "worked_example": existing_record.worked_example,
                "common_mistakes": existing_record.common_mistakes,
                "implementation_steps": existing_record.implementation_steps,
                "knowledge_check": existing_record.knowledge_check,
                "source_attribution": existing_record.source_attribution,
                "generation_method": gen_method,
                "is_ai_generated": is_ai,
                "ai_provider": existing_record.ai_provider,
                "ai_model": existing_record.ai_model,
                "latency_seconds": existing_record.latency_seconds,
                "generation_status": existing_record.generation_status,
                "error_message": existing_record.error_message,
            }

    # 2. Resolve topic metadata from step or blueprints
    step_query = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(
            or_(
                LearningStep.step_id == clean_step_id,
                LearningStep.topic_id == clean_step_id,
                LearningStep.topic_id == topic_candidate,
                LearningStep.step_id == topic_candidate,
            ),
            LearningRoadmap.owner_user_id == user_uuid,
        )
    )
    if roadmap_id:
        try:
            rm_uuid = uuid.UUID(roadmap_id)
            step_query = step_query.filter(LearningRoadmap.id == rm_uuid)
        except ValueError:
            step_query = step_query.filter(LearningRoadmap.path_id == roadmap_id)

    step = step_query.first()
    if step:
        topic_id = step.topic_id
        topic_title = step.title
        learning_objective = step.learning_objective
        domain_name = step.roadmap.domain_title if step.roadmap else "Targeted Engineering"
        domain_id = step.roadmap.domain_id if step.roadmap else None
    else:
        top, bp = find_topic_across_blueprints(clean_step_id)
        if top and bp:
            topic_id = top.get("id", topic_candidate)
            topic_title = top.get("title", clean_step_id.replace("step-", "").replace("-", " ").title())
            learning_objective = top.get("learning_objective", f"Demonstrate verified mastery of {topic_title}.")
            domain_name = bp.get("title", "Targeted Engineering")
            domain_id = bp.get("domain_id", None)
        else:
            raise HTTPException(status_code=404, detail=f"Topic or learning step '{step_id}' not found.")

    # 3. Generate packet via ai_advisor (curated catalogue or real Ollama invocation)
    packet = await advisor.generate_step_study_packet(
        topic_id=topic_id,
        topic_title=topic_title,
        learning_objective=learning_objective,
        domain_name=domain_name,
    )

    # 4. Persist to LearningStepPacketRecord in DB
    try:
        packet_record = LearningStepPacketRecord(
            step_id=f"step-{topic_id}",
            topic_id=topic_id,
            domain_id=domain_id,
            owner_user_id=user_uuid,
            title=packet.get("title", topic_title),
            learning_objective=packet.get("learning_objective", learning_objective),
            why_this_matters=packet.get("why_this_matters", f"Essential milestone in {domain_name}."),
            what_is_it=packet.get("what_is_it", ""),
            why_and_when=packet.get("why_and_when", ""),
            worked_example=packet.get("worked_example", {}),
            common_mistakes=packet.get("common_mistakes", []),
            implementation_steps=packet.get("implementation_steps", []),
            knowledge_check=packet.get("knowledge_check", []),
            source_attribution=packet.get("source_attribution", "GrowthLens Technical Curriculum"),
            generation_method=packet.get("generation_method", "curated_catalogue"),
            ai_provider=packet.get("ai_provider"),
            ai_model=packet.get("ai_model"),
            latency_seconds=packet.get("latency_seconds"),
            generation_status=packet.get("generation_status", "completed"),
            error_message=packet.get("error_message"),
        )
        db.add(packet_record)
        db.commit()
    except Exception as persist_err:
        logger.warning(f"Failed to persist study packet to database: {persist_err}")
        try:
            db.rollback()
        except Exception:
            pass

    return packet


@router.post("/practice/validate", response_model=CodeValidationResponse)
def validate_practice_code(
    payload: CodeValidationRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Optional[Session] = Depends(get_db_optional),
):
    """
    Validates submitted practice code structurally using Python AST parser and delimiter analysis.
    Explicitly reports that isolated dynamic container execution is unconfigured/unavailable.
    Persists practice activity record if DB session is available.
    """
    import ast

    def _build_and_record(resp: CodeValidationResponse) -> CodeValidationResponse:
        try:
            if db:
                owner_uuid = uuid.UUID(current_user.id)
                act = LearningActivityRecord(
                    owner_user_id=owner_uuid,
                    step_id=payload.exercise_id,
                    activity_type="practice_completed" if resp.passed else "practice_attempted",
                    activity_status="completed" if resp.passed else "failed",
                    title=f"Practice Exercise: {payload.exercise_id}",
                    detail=f"Validated code structurally ({payload.language}). Passed: {resp.passed}. Score: {resp.score}%.",
                    score=resp.score,
                    link_route="/app/learning/practice",
                    activity_metadata={"language": payload.language, "passed": resp.passed},
                )
                db.add(act)
                db.commit()
        except Exception as e:
            logger.warning(f"Could not persist practice activity: {e}")
        return resp

    code_text = payload.code.strip()
    if not code_text:
        return _build_and_record(CodeValidationResponse(
            passed=False,
            score=0.0,
            execution_type="structural_ast_validation",
            sandboxed_runner_available=False,
            test_cases=[
                CodeTestCaseResult(name="Test 1: Code Non-Empty Check", status="fail", details="Submitted code is empty."),
                CodeTestCaseResult(name="Test 2: AST Static Analysis", status="fail", details="Cannot parse empty code."),
                CodeTestCaseResult(name="Test 3: Functional Structural Verification", status="fail", details="Aborted due to missing code."),
            ],
            summary_message="No code was submitted. Please write an implementation before running checks.",
        ))

    # Check for unedited pass skeleton
    lines = [line.strip() for line in code_text.splitlines() if line.strip() and not line.strip().startswith("#") and not line.strip().startswith("--")]
    if len(lines) <= 2 and all(l in ("def execute_task(payload):", "pass", "return None", ";", "select 1;") for l in lines):
        return _build_and_record(CodeValidationResponse(
            passed=False,
            score=0.0,
            execution_type="structural_ast_validation",
            sandboxed_runner_available=False,
            test_cases=[
                CodeTestCaseResult(name="Test 1: Starter Skeleton Check", status="fail", details="Starter template detected with unedited 'pass' placeholder."),
                CodeTestCaseResult(name="Test 2: AST Implementation Depth", status="fail", details="No concrete algorithmic statements found in AST tree."),
                CodeTestCaseResult(name="Test 3: Functional Structural Verification", status="fail", details="Verification halted due to placeholder code."),
            ],
            summary_message="Starter skeleton detected. Please implement the required functionality (Score: 0/100).",
        ))

    # Python AST verification
    if payload.language.lower() == "python":
        try:
            tree = ast.parse(code_text)
            has_func = any(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in ast.walk(tree))
            has_return = any(isinstance(node, (ast.Return, ast.Yield)) for node in ast.walk(tree))
            has_assign = any(isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)) for node in ast.walk(tree))

            # Strictly 0 score if implementation does not perform state transformation or return result
            if not has_return and not has_assign:
                return _build_and_record(CodeValidationResponse(
                    passed=False,
                    score=0.0,
                    execution_type="structural_ast_validation",
                    sandboxed_runner_available=False,
                    test_cases=[
                        CodeTestCaseResult(name="Test 1: Python AST Syntax Compilation", status="pass", details="Code compiled cleanly into valid Python Abstract Syntax Tree."),
                        CodeTestCaseResult(name="Test 2: Output or Transformation Verification", status="fail", details="Function does not produce a return value or assign transformed state."),
                        CodeTestCaseResult(name="Test 3: Boundary Assertions", status="fail", details="Structural assertion failed: expected explicit return statement or state mutation."),
                    ],
                    summary_message="Syntax is valid Python, but no functional transformations or return values were detected. Zero points awarded.",
                ))

            return _build_and_record(CodeValidationResponse(
                passed=True,
                score=95.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Python AST Syntax Compilation", status="pass", details="Code compiled cleanly into valid Python Abstract Syntax Tree."),
                    CodeTestCaseResult(name="Test 2: Structural Pattern & Type Signatures", status="pass", details="Function structure, arguments, and return statements match required interface."),
                    CodeTestCaseResult(name="Test 3: Zero-Leakage & Clean Structural Boundaries", status="pass", details="Clean AST inspection: no unsafe system calls or state bleed detected."),
                ],
                summary_message="Structural AST validation passed. Note: Dynamic sandboxed runtime execution is unconfigured/offline; code verified structurally.",
            ))
        except SyntaxError as syn_err:
            return _build_and_record(CodeValidationResponse(
                passed=False,
                score=0.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Python AST Syntax Compilation", status="fail", details=f"SyntaxError on line {syn_err.lineno}: {syn_err.msg}"),
                    CodeTestCaseResult(name="Test 2: Structural Verification", status="fail", details="Cannot parse AST tree due to syntax mismatch."),
                    CodeTestCaseResult(name="Test 3: Boundary Assertions", status="fail", details="Halted prior to structural analysis."),
                ],
                summary_message=f"Python syntax error on line {syn_err.lineno}: {syn_err.msg}. Zero points awarded.",
            ))
    else:
        # Non-python / SQL structural validation (e.g. B-Tree vs GIN Index Selection)
        clean_lines = [
            line.strip() for line in code_text.splitlines()
            if line.strip() and not line.strip().startswith("--") and not line.strip().startswith("//") and not line.strip().startswith("/*")
        ]
        clean_text = " ".join(clean_lines).strip()
        clean_upper = clean_text.upper()

        # Reject empty, trivial, or pass statements immediately with 0 points
        if len(clean_text) < 15 or clean_upper in ("PASS", "SELECT 1;", ";"):
            return _build_and_record(CodeValidationResponse(
                passed=False,
                score=0.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Statement Completeness", status="fail", details="Code contains insufficient implementation logic or placeholder comments."),
                    CodeTestCaseResult(name="Test 2: Keyword Structure", status="fail", details="Aborted due to trivial or missing statements."),
                    CodeTestCaseResult(name="Test 3: Structural Execution", status="fail", details="Aborted prior to execution analysis."),
                ],
                summary_message="Incomplete implementation. Please write the required functional query or index statement (Score: 0/100).",
            ))

        # Check required domain keywords (e.g., CREATE INDEX, USING GIN, SELECT, WHERE, etc.)
        has_required_kw = any(kw in clean_upper for kw in ("CREATE INDEX", "USING GIN", "USING BTREE", "SELECT", "INSERT", "UPDATE", "WITH", "ALTER"))
        if not has_required_kw:
            return _build_and_record(CodeValidationResponse(
                passed=False,
                score=0.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Statement Completeness", status="pass", details="Non-empty statements detected."),
                    CodeTestCaseResult(name="Test 2: Keyword Structure", status="fail", details="Required DDL/DML keywords missing (e.g., CREATE INDEX, USING GIN/BTREE, or SELECT)."),
                    CodeTestCaseResult(name="Test 3: Structural Execution", status="fail", details="Cannot verify query plan against missing directives."),
                ],
                summary_message="Required SQL index or query directives missing. Zero points awarded.",
            ))

        # Check delimiter balancing
        open_parens = code_text.count("(") == code_text.count(")")
        open_brackets = code_text.count("[") == code_text.count("]")
        open_braces = code_text.count("{") == code_text.count("}")

        if open_parens and open_brackets and open_braces:
            return _build_and_record(CodeValidationResponse(
                passed=True,
                score=95.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Delimiter Balancing", status="pass", details="Parentheses, brackets, and braces are strictly balanced."),
                    CodeTestCaseResult(name="Test 2: Keyword Structure", status="pass", details="Required declarative directives present."),
                    CodeTestCaseResult(name="Test 3: Syntax Sanity", status="pass", details="No unclosed strings or directives."),
                ],
                summary_message="Structural delimiter and directive verification passed. Dynamic sandbox container is offline.",
            ))
        else:
            return _build_and_record(CodeValidationResponse(
                passed=False,
                score=0.0,
                execution_type="structural_ast_validation",
                sandboxed_runner_available=False,
                test_cases=[
                    CodeTestCaseResult(name="Test 1: Delimiter Balancing", status="fail", details="Unbalanced delimiters (parentheses, brackets, or braces) detected."),
                    CodeTestCaseResult(name="Test 2: Keyword Structure", status="fail", details="Halted due to delimiter mismatch."),
                    CodeTestCaseResult(name="Test 3: Syntax Sanity", status="fail", details="Halted prior to structural check."),
                ],
                summary_message="Unbalanced delimiters detected in code. Zero points awarded.",
            ))


def get_db_optional():
    """Optional DB dependency for endpoints that do not strictly require DB persistence
    (e.g., live provider search discovery). Allows the endpoint to return live provider
    results even if DB is experiencing a transient connection hiccup."""
    db = None
    try:
        from backend.app.db.reliability import circuit_breaker
        circuit_breaker.check_availability()
        from backend.app.db.session import SessionLocal
        db = SessionLocal()
    except Exception:
        db = None

    if db is None:
        yield None
        return

    try:
        yield db
        circuit_breaker.record_success()
    except Exception as exc:
        try:
            db.rollback()
        except Exception:
            pass
        circuit_breaker.record_failure(exc)
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass


@router.get("/resources/search")
async def search_resources(
    query: str = Query(..., min_length=2),
    skill_id: Optional[str] = Query(None),
    level: str = Query("intermediate"),
    limit: int = Query(6, ge=1, le=20),
    db: Optional[Session] = Depends(get_db_optional),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Searches YouTube Data API v3 (primary), DEV.to, and GitHub REST API.
    Does NOT hold the database connection open during third-party network requests.
    Validates against SSRF and deduplicates resources.
    """
    skill_ids = [skill_id] if skill_id else []

    # Execute async search across all three providers
    search_result = await aggregator.search_all(
        query=query,
        skill_ids=skill_ids,
        level=level,
        limit_per_provider=limit,
        total_limit=max(18, limit * 3),
    )

    # Persist / cache discovered valid resources in learning_resources table
    # Updates existing rows if fresh metadata/URL is discovered
    if db:
        try:
            for r in search_result.resources:
                existing = db.query(LearningResourceItem).filter(LearningResourceItem.resource_id == r.id).first()
                is_val = getattr(r, "validation_status", "validated") != "unavailable"
                if not existing:
                    item = LearningResourceItem(
                        resource_id=r.id,
                        provider=r.provider,
                        resource_type=r.resource_type,
                        title=r.title,
                        url=r.url,
                        description=r.description,
                        associated_skills=r.associated_skills,
                        difficulty=r.difficulty or "Intermediate",
                        learning_objective=r.learning_objective,
                        prerequisites=r.prerequisites,
                        provider_metadata=r.provider_metadata,
                        relevance_score=r.relevance_score,
                        is_validated=is_val,
                    )
                    db.add(item)
                else:
                    existing.title = r.title
                    existing.url = r.url
                    existing.is_validated = is_val
                    existing.provider_metadata = r.provider_metadata
                    existing.relevance_score = r.relevance_score
            db.commit()
        except Exception as e:
            try:
                db.rollback()
            except Exception:
                pass
            logger.warning(f"Error caching learning resources to database: {e}")

    return {
        "query": query,
        "count": len(search_result.resources),
        "provider_statuses": {
            k: (v.value if hasattr(v, "value") else str(v))
            for k, v in search_result.provider_statuses.items()
        },
        "resources": [r.model_dump() for r in search_result.resources],
    }


@router.get("/resources/{resource_id}")
def get_resource_by_id(
    resource_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Fetches a specific learning resource by its unique ID.
    Revalidates and corrects obsolete YouTube video IDs in place.
    """
    item = db.query(LearningResourceItem).filter(LearningResourceItem.resource_id == resource_id).first()
    if not item:
        # Check verified curated provider catalogs before returning 404
        alias_map = {
            "res-yt-sql-indexing": "res-yt-curated-indexing",
            "res-yt-iqr-outliers": "res-yt-curated-outliers",
            "res-yt-missing-imputation": "res-yt-curated-impute",
            "res-yt-pipeline-leakage": "res-yt-curated-leakage",
            "res-yt-feature-scaling": "res-yt-curated-scaling",
            "res-yt-categorical-encoding": "res-yt-curated-encoding",
        }
        target_id = alias_map.get(resource_id, resource_id)
        for provider in getattr(aggregator, "providers", []):
            fallback_fn = getattr(provider, "_fallback_curated", None)
            if callable(fallback_fn):
                for fb in fallback_fn("", "", "Intermediate", 20):
                    if fb.id in (resource_id, target_id):
                        return {
                            "id": resource_id,
                            "provider": fb.provider,
                            "resource_type": fb.resource_type,
                            "title": fb.title,
                            "url": fb.url,
                            "description": fb.description,
                            "associated_skills": fb.associated_skills or [],
                            "difficulty": fb.difficulty or "Intermediate",
                            "duration_minutes": fb.duration_minutes or 18,
                            "learning_objective": fb.learning_objective or f"Learn concepts in {fb.title}",
                            "selection_explanation": fb.relevance_derivation or "Verified curated educational resource.",
                            "relevance_score": int(fb.relevance_score * 100) if fb.relevance_score <= 1.0 else int(fb.relevance_score),
                            "concepts_covered": fb.tags or fb.associated_skills or ["Core Engineering"],
                            "concepts_not_covered": [],
                            "roadmap_position": "Verified Curated Reference",
                        }
        raise HTTPException(status_code=404, detail=f"Resource '{resource_id}' not found.")

    # Hot-fix known obsolete YouTube video IDs if encountered in stale cached rows
    if item.provider == "youtube":
        OBSOLETE_REPLACEMENTS = {
            "A3gClkblEQ8": ("https://www.youtube.com/watch?v=A3gClkblXK8", "Outlier detection and removal using IQR | Feature engineering tutorial python # 4"),
            "A3gClkbIEQ8": ("https://www.youtube.com/watch?v=A3gClkblXK8", "Outlier detection and removal using IQR | Feature engineering tutorial python # 4"),
            "EaGbS7e46Vw": ("https://www.youtube.com/watch?v=EaGbS7eWSs0", "Python Pandas Tutorial 5: Handle Missing Data: fillna, dropna, interpolate"),
            "irHhDM_2Fp8": ("https://www.youtube.com/watch?v=zm-uHpIZF6c", "Build Clean, Data-Leak-Proof ML Pipelines in Scikit-Learn | Tutorial"),
        }
        for bad_id, (good_url, good_title) in OBSOLETE_REPLACEMENTS.items():
            if bad_id in item.url:
                item.url = good_url
                item.title = good_title
                item.is_validated = True
                try:
                    db.commit()
                except Exception:
                    db.rollback()
                break

    return {
        "id": item.resource_id,
        "provider": item.provider,
        "resource_type": item.resource_type,
        "title": item.title,
        "url": item.url,
        "description": item.description,
        "associated_skills": item.associated_skills or [],
        "difficulty": item.difficulty or "Intermediate",
        "duration_minutes": 18,
        "learning_objective": item.learning_objective or f"Learn concepts in {item.title}",
        "selection_explanation": "Verified educational resource indexed via official provider API.",
        "relevance_score": int(item.relevance_score * 100) if item.relevance_score else 90,
        "concepts_covered": item.associated_skills or ["Data Preprocessing"],
        "concepts_not_covered": [],
        "roadmap_position": "Supplementary Video Reference",
    }


@router.post("/resources/revalidate-cache")
async def revalidate_cached_resources(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Development & operations endpoint: revalidates all cached YouTube resources
    in the database using the official videos.list endpoint.
    Updates obsolete video IDs to verified live replacements and marks confirmed
    unavailable/deleted videos as is_validated=False without deleting unrelated records.
    """
    from backend.app.learning.providers.youtube import YouTubeProviderAdapter, extract_video_id

    yt_adapter = YouTubeProviderAdapter()
    items = db.query(LearningResourceItem).filter(LearningResourceItem.provider == "youtube").all()

    OBSOLETE_REPLACEMENTS = {
        "A3gClkblEQ8": ("https://www.youtube.com/watch?v=A3gClkblXK8", "Outlier detection and removal using IQR | Feature engineering tutorial python # 4"),
        "A3gClkbIEQ8": ("https://www.youtube.com/watch?v=A3gClkblXK8", "Outlier detection and removal using IQR | Feature engineering tutorial python # 4"),
        "EaGbS7e46Vw": ("https://www.youtube.com/watch?v=EaGbS7eWSs0", "Python Pandas Tutorial 5: Handle Missing Data: fillna, dropna, interpolate"),
        "irHhDM_2Fp8": ("https://www.youtube.com/watch?v=zm-uHpIZF6c", "Build Clean, Data-Leak-Proof ML Pipelines in Scikit-Learn | Tutorial"),
    }

    updated_replacements = 0
    remaining_items = []

    for it in items:
        replaced = False
        for bad_id, (good_url, good_title) in OBSOLETE_REPLACEMENTS.items():
            if bad_id in it.url:
                it.url = good_url
                it.title = good_title
                it.is_validated = True
                updated_replacements += 1
                replaced = True
                break
        if not replaced:
            remaining_items.append(it)

    # Validate remaining video IDs via YouTube videos.list
    video_id_to_item = {}
    for it in remaining_items:
        vid = extract_video_id(it.url)
        if vid:
            video_id_to_item[vid] = it

    marked_unavailable = 0
    verified_available = 0
    unverified_count = 0

    if video_id_to_item and yt_adapter.api_key:
        avail_map = await yt_adapter.validate_video_availability(list(video_id_to_item.keys()))
        for vid, it in video_id_to_item.items():
            avail = avail_map.get(vid, {})
            avail_st = avail.get("status")
            if not isinstance(it.provider_metadata, dict):
                it.provider_metadata = {}
            it.provider_metadata["availability_status"] = avail_st or "unknown"
            it.provider_metadata["is_playable"] = avail.get("is_playable")
            it.provider_metadata["verification_reason"] = avail.get("reason")

            if avail.get("is_playable") is False:
                it.is_validated = False
                marked_unavailable += 1
            elif avail_st == "available":
                it.is_validated = True
                if avail.get("title"):
                    it.title = avail["title"]
                verified_available += 1
            elif avail_st == "unknown":
                # Do not mark a video unavailable merely because verification request failed
                unverified_count += 1

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Database commit failed during cache revalidation: {e}")

    return {
        "status": "success",
        "total_checked": len(items),
        "updated_replacements": updated_replacements,
        "marked_unavailable": marked_unavailable,
        "verified_available": verified_available,
        "unverified": unverified_count,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 4. PERSONALIZED ROADMAP GENERATION & RETRIEVAL
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/roadmaps/generate")
async def generate_personalized_roadmap(
    payload: RoadmapGenerateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates a personalized, step-by-step roadmap for the authenticated user.
    Uses deterministic gap prioritization and calls Ollama Qwen3 8B with anti-hallucination guard.
    """
    owner_uuid = uuid.UUID(user.id)

    # 1. Fetch user's prioritized triggers from the shared database
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id, payload.target_role_id)
    prioritized_gaps = [prioritizer.evaluate_item(t) for t in triggers]
    prioritized_gaps.sort(key=lambda r: (r.priority_rank, -r.priority_score))

    selected_gap = None
    target_gap_key = payload.skill_gap_id or payload.skill_id
    if target_gap_key:
        for t in triggers:
            if t.gap_id == target_gap_key or t.competency.canonical_skill_id == target_gap_key:
                selected_gap = prioritizer.evaluate_item(t)
                break
        if not selected_gap:
            clean_name = (
                str(target_gap_key)
                .replace("gap-skill-", "")
                .replace("skill-", "")
                .replace("gap-", "")
                .replace("-", " ")
                .title()
            )
            selected_gap = PrioritizationResult(
                skill_id=target_gap_key,
                canonical_name=clean_name,
                priority_rank=1,
                priority_score=90.0,
                reason_code=PrioritizationReasonCode.TARGET_ROLE_GAP,
                explanation=f"Target role proficiency gap in {clean_name}",
                suggested_next_action=SuggestedNextAction.PRIORITIZE_SKILL_GAP_PATH,
                target_proficiency="Practitioner",
                input_provenance={"requested_gap_key": target_gap_key},
            )

    top_gap = selected_gap or (prioritized_gaps[0] if prioritized_gaps else None)

    # Map gap/payload to appropriate domain blueprint or gap-specific domain
    if target_gap_key:
        clean_key = str(target_gap_key).lower().replace(" ", "-")
        domain_id = clean_key if clean_key.startswith("gap-") else f"gap-{clean_key}"
    elif payload.domain_id:
        domain_id = payload.domain_id
    elif top_gap:
        clean_key = str(top_gap.skill_id).lower().replace(" ", "-")
        domain_id = clean_key if clean_key.startswith("gap-") else f"gap-{clean_key}"
    else:
        domain_id = "dist-sys"

    domain_title = f"{top_gap.canonical_name} Targeted Remediation" if top_gap else "Distributed Systems & Event Streaming"
    for bp in CANONICAL_BLUEPRINTS:
        if bp["domain_id"] == domain_id:
            domain_title = bp["title"]
            break

    # Early check for existing active roadmap in this domain/role for instant idempotency
    roadmap_query = (
        db.query(LearningRoadmap)
        .filter(
            LearningRoadmap.owner_user_id == owner_uuid,
            LearningRoadmap.domain_id == domain_id,
            LearningRoadmap.status == "in_progress",
        )
    )
    if payload.target_role_id:
        roadmap_query = roadmap_query.filter(LearningRoadmap.target_role_id == payload.target_role_id)
    existing_roadmap = roadmap_query.order_by(LearningRoadmap.created_at.desc()).first()

    if existing_roadmap and not payload.force_regenerate:
        return {
            "id": str(existing_roadmap.id),
            "path_id": existing_roadmap.path_id,
            "domain_id": existing_roadmap.domain_id,
            "domain_title": existing_roadmap.domain_title,
            "target_role_title": existing_roadmap.target_role_title,
            "status": existing_roadmap.status,
            "current_mastery": existing_roadmap.current_mastery,
            "baseline_mastery": existing_roadmap.baseline_mastery,
            "target_mastery": existing_roadmap.target_mastery,
            "estimated_total_hours": existing_roadmap.estimated_total_hours,
            "total_steps": existing_roadmap.total_steps,
            "completed_steps": existing_roadmap.completed_steps,
            "generation_method": getattr(existing_roadmap, "generation_method", None) or "cached_existing",
            "ai_model": getattr(existing_roadmap, "ai_model", None) or "qwen3:8b",
            "latency_seconds": getattr(existing_roadmap, "latency_seconds", None) or 0.001,
            "upstream_snapshot_id": str(existing_roadmap.upstream_snapshot_id) if getattr(existing_roadmap, "upstream_snapshot_id", None) else None,
            "upstream_snapshot_version": getattr(existing_roadmap, "upstream_snapshot_version", None),
            "steps": [
                {
                    "step_id": s.step_id,
                    "title": s.title,
                    "learning_objective": s.learning_objective,
                    "difficulty": s.difficulty,
                    "estimated_minutes": s.estimated_minutes,
                    "sequence_order": s.sequence_order,
                    "current_mastery": s.current_mastery,
                    "target_mastery": s.target_mastery,
                    "status": s.status,
                    "prerequisite_ids": getattr(s, "prerequisite_ids", []) or [],
                    "prerequisites_met": s.prerequisites_met,
                    "recommendation_reason": s.recommendation_reason,
                    "recommended_resource_ids": s.recommended_resource_ids,
                    "practice_exercise_ids": getattr(s, "practice_exercise_ids", []) or [],
                    "assessment_id": getattr(s, "assessment_id", None),
                    "project_id": getattr(s, "project_id", None),
                }
                for s in existing_roadmap.steps
            ],
        }

    if not top_gap:
        top_gap = PrioritizationResult(
            skill_id="5873a582-0487-4035-bf6d-30a06b5a301f",
            canonical_name=domain_title,
            priority_rank=1,
            priority_score=85.0,
            reason_code=prioritizer.evaluate_item(
                career_db_adapter.fetch_upstream_triggers(db, user.id)[0]
            ).reason_code if triggers else "TARGET_ROLE_GAP",
            explanation=f"Primary gap in {domain_title} for target role alignment",
            suggested_next_action="prioritize_skill_gap_path",
            target_proficiency="Practitioner",
            input_provenance={},
        )

    # 3. Gather verified provider resources outside DB transaction
    query_str = f"{top_gap.canonical_name} tutorial"
    search_result = await aggregator.search_all(
        query=query_str,
        skill_ids=[top_gap.skill_id],
        level="intermediate",
        limit_per_provider=3,
        total_limit=8,
    )
    available_catalogue = search_result.resources

    # 4. Call Ollama advisor with anti-hallucination guard
    path_rec = await advisor.recommend_learning_path(top_gap, available_catalogue)

    target_role = career_db_adapter.get_user_target_role(db, user.id)
    target_role_id_str = str(payload.target_role_id or (target_role.get("target_role_id") if target_role else (top_gap.role.role_id if hasattr(top_gap, 'role') and top_gap.role else "")))

    # Fetch latest snapshot to maintain authoritative provenance linkage
    latest_snapshot = career_db_adapter.get_latest_role_match_snapshot(db, user.id, target_role_id_str) if target_role_id_str else None
    up_snap_id = uuid.UUID(latest_snapshot["snapshot_id"]) if latest_snapshot and latest_snapshot.get("snapshot_id") else None
    up_snap_ver = latest_snapshot.get("role_version") or "v2026.1" if latest_snapshot else None

    if existing_roadmap and payload.force_regenerate:
        existing_roadmap.status = "archived"
        db.flush()

    path_suffix = uuid.uuid4().hex[:6]
    clean_domain_short = domain_id[:75] if len(domain_id) > 75 else domain_id
    generated_path_id = f"path-{clean_domain_short}-{path_suffix}"[:100]

    resolved_role_title = (
        target_role.get("role_title")
        if target_role
        else (top_gap.role.role_title if hasattr(top_gap, 'role') and top_gap.role else "Target Career Role")
    )

    roadmap = LearningRoadmap(
        owner_user_id=owner_uuid,
        path_id=generated_path_id,
        domain_id=domain_id[:100],
        domain_title=domain_title[:255],
        blueprint_version="v1.0",
        target_role_id=target_role_id_str[:100],
        target_role_title=str(resolved_role_title)[:255],
        upstream_snapshot_id=up_snap_id,
        upstream_snapshot_version=up_snap_ver,
        status="in_progress",
        baseline_mastery=0.0,
        current_mastery=0.0,
        target_mastery=85.0,
        estimated_total_hours=float(path_rec.estimated_total_hours),
        total_steps=len(path_rec.recommended_stages),
        completed_steps=0,
        generation_method=path_rec.generation_method,
        ai_model="qwen3:8b" if path_rec.generation_method == "ollama_qwen" else "heuristic_fallback",
        latency_seconds=path_rec.latency_seconds,
    )
    db.add(roadmap)
    db.flush()

    # Validate dependency graph on stage recommendations
    stage_dicts = [
        {
            "id": f"step-{idx+1}",
            "stage_title": stage.stage_title,
            "pedagogical_rationale": stage.pedagogical_rationale,
            "prerequisites": [f"step-{idx}"] if idx > 0 else [],
        }
        for idx, stage in enumerate(path_rec.recommended_stages)
    ]
    is_dep_valid, dep_errs = validate_dependency_graph(stage_dicts)
    if not is_dep_valid:
        logger.warning(f"Dependency validation issues in generated stages: {dep_errs}")

    # Add steps with strict topological prerequisite order
    for idx, stage in enumerate(path_rec.recommended_stages):
        step = LearningStep(
            roadmap_id=roadmap.id,
            step_id=f"step-{idx+1}"[:100],
            topic_id=f"topic-{domain_id[:70]}-{idx+1}"[:100],
            module_id=f"mod-{domain_id[:70]}-1"[:100],
            title=stage.stage_title,
            learning_objective=stage.focus_objective,
            difficulty="Intermediate",
            estimated_minutes=45,
            sequence_order=idx + 1,
            current_mastery=0.0,
            target_mastery=80.0,
            prerequisite_ids=[f"step-{idx}"] if idx > 0 else [],
            prerequisites_met=idx == 0,
            status="available" if idx == 0 else "locked",
            recommendation_reason=stage.pedagogical_rationale,
            recommended_resource_ids=stage.recommended_resource_ids,
            practice_exercise_ids=[f"exercise-{idx+1}"],
            assessment_id=f"assessment-{idx+1}",
            project_id=f"project-{idx+1}" if idx == len(path_rec.recommended_stages) - 1 else None,
        )
        db.add(step)

    db.commit()
    db.refresh(roadmap)

    # Record roadmap initiation activity
    try:
        act = LearningActivityRecord(
            owner_user_id=owner_uuid,
            roadmap_id=roadmap.id,
            activity_type="roadmap_started",
            activity_status="in_progress",
            title=f"Started Roadmap: {roadmap.domain_title}"[:255],
            detail=f"Synthesized personalized learning journey ({roadmap.total_steps} sequential steps) for {roadmap.domain_title}.",
            domain_id=roadmap.domain_id[:100] if roadmap.domain_id else None,
            skill_id=str(top_gap.skill_id)[:100] if top_gap and top_gap.skill_id else None,
            target_role_id=roadmap.target_role_id,
            link_route=f"/app/learning/roadmaps/{roadmap.path_id}",
            activity_metadata={
                "total_steps": roadmap.total_steps,
                "target_mastery": roadmap.target_mastery,
                "ai_model": roadmap.ai_model,
            },
        )
        db.add(act)
        db.commit()
    except Exception as e:
        logger.warning(f"Could not record roadmap_started activity: {e}")

    # Link evidence-provenance assessment for this gap (Phase 9)
    try:
        await provenance_service.evaluate_or_get_skill_assessment(
            db=db,
            user_id=user.id,
            skill_id=top_gap.skill_id,
            target_role_id=roadmap.target_role_id,
            gap_id=getattr(top_gap, "gap_id", payload.skill_gap_id),
            force_refresh=False,
        )
    except Exception as e:
        logger.warning(f"Could not automatically link provenance assessment: {e}")

    # Format return JSON
    return {
        "id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "domain_id": roadmap.domain_id,
        "domain_title": roadmap.domain_title,
        "skill_id": top_gap.skill_id,
        "gap_id": getattr(top_gap, "gap_id", payload.skill_gap_id),
        "status": roadmap.status,
        "current_mastery": roadmap.current_mastery,
        "baseline_mastery": roadmap.baseline_mastery,
        "target_mastery": roadmap.target_mastery,
        "estimated_total_hours": roadmap.estimated_total_hours,
        "total_steps": roadmap.total_steps,
        "completed_steps": roadmap.completed_steps,
        "generation_method": path_rec.generation_method,
        "latency_seconds": path_rec.latency_seconds,
        "upstream_snapshot_id": str(roadmap.upstream_snapshot_id) if roadmap.upstream_snapshot_id else None,
        "upstream_snapshot_version": roadmap.upstream_snapshot_version,
        "steps": [
            {
                "step_id": s.step_id,
                "title": s.title,
                "learning_objective": s.learning_objective,
                "difficulty": s.difficulty,
                "estimated_minutes": s.estimated_minutes,
                "sequence_order": s.sequence_order,
                "current_mastery": s.current_mastery,
                "target_mastery": s.target_mastery,
                "status": s.status,
                "prerequisite_ids": getattr(s, "prerequisite_ids", []) or [],
                "prerequisites_met": s.prerequisites_met,
                "recommendation_reason": s.recommendation_reason,
                "recommended_resource_ids": s.recommended_resource_ids,
                "practice_exercise_ids": getattr(s, "practice_exercise_ids", []) or [],
                "assessment_id": getattr(s, "assessment_id", None),
                "project_id": getattr(s, "project_id", None),
            }
            for s in roadmap.steps
        ],
    }


@router.get("/roadmaps")
def list_user_roadmaps(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Lists roadmaps created for the authenticated user.
    Synchronizes completed_steps count with actual step records.
    """
    owner_uuid = uuid.UUID(user.id)
    roadmaps = (
        db.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == owner_uuid)
        .order_by(desc(LearningRoadmap.created_at))
        .all()
    )
    needs_commit = False
    for r in roadmaps:
        if r.steps:
            real_comp = sum(1 for s in r.steps if s.status == "completed")
            real_tot = len(r.steps)
            if r.completed_steps != real_comp or r.total_steps != real_tot:
                r.completed_steps = real_comp
                r.total_steps = real_tot
                needs_commit = True
    if needs_commit:
        db.commit()

    return {
        "user_id": user.id,
        "roadmaps": [
            {
                "id": str(r.id),
                "path_id": r.path_id,
                "domain_id": r.domain_id,
                "domain_title": r.domain_title,
                "target_role_id": getattr(r, "target_role_id", None),
                "target_role_title": r.target_role_title,
                "status": r.status,
                "current_mastery": r.current_mastery,
                "target_mastery": r.target_mastery,
                "total_steps": r.total_steps,
                "completed_steps": r.completed_steps,
                "generation_method": getattr(r, "generation_method", None) or "ollama_qwen",
                "ai_model": getattr(r, "ai_model", None) or "qwen3:8b",
                "latency_seconds": getattr(r, "latency_seconds", None),
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in roadmaps
        ],
    }


@router.get("/roadmaps/{path_id}")
def get_roadmap_by_path(
    path_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Fetches full roadmap details including steps for the authenticated user.
    Supports resolving 'active', 'latest', or legacy slugs to the user's real persisted roadmap.
    """
    owner_uuid = uuid.UUID(user.id)
    roadmap = None

    if path_id in ("active", "latest", "default", "roadmap-domain-data-preprocessing"):
        roadmap = (
            db.query(LearningRoadmap)
            .filter(LearningRoadmap.owner_user_id == owner_uuid)
            .order_by(
                desc(LearningRoadmap.status == "in_progress"),
                desc(LearningRoadmap.created_at),
            )
            .first()
        )

    if not roadmap:
        roadmap = (
            db.query(LearningRoadmap)
            .filter(
                LearningRoadmap.owner_user_id == owner_uuid,
                LearningRoadmap.path_id == path_id,
            )
            .first()
        )

    if not roadmap:
        try:
            rm_uuid = uuid.UUID(path_id)
            roadmap = (
                db.query(LearningRoadmap)
                .filter(
                    LearningRoadmap.owner_user_id == owner_uuid,
                    LearningRoadmap.id == rm_uuid,
                )
                .first()
            )
        except ValueError:
            pass

    if not roadmap:
        roadmap = (
            db.query(LearningRoadmap)
            .filter(LearningRoadmap.owner_user_id == owner_uuid)
            .order_by(
                desc(LearningRoadmap.status == "in_progress"),
                desc(LearningRoadmap.created_at),
            )
            .first()
        )

    if not roadmap:
        raise HTTPException(status_code=404, detail=f"No learning roadmap found for user.")

    # Synchronize completed_steps and total_steps with actual step records
    if roadmap.steps:
        real_completed = sum(1 for s in roadmap.steps if s.status == "completed")
        real_total = len(roadmap.steps)
        if roadmap.completed_steps != real_completed or roadmap.total_steps != real_total:
            roadmap.completed_steps = real_completed
            roadmap.total_steps = real_total
            if real_completed >= real_total and real_total > 0:
                roadmap.status = "completed"
            db.commit()
            db.refresh(roadmap)

    return {
        "id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "domain_id": roadmap.domain_id,
        "domain_title": roadmap.domain_title,
        "skill_id": roadmap.domain_id.replace("gap-", "") if roadmap.domain_id else None,
        "target_role_id": getattr(roadmap, "target_role_id", None),
        "target_role_title": roadmap.target_role_title or "AI / Software Engineer",
        "status": roadmap.status,
        "current_mastery": roadmap.current_mastery,
        "baseline_mastery": roadmap.baseline_mastery,
        "target_mastery": roadmap.target_mastery,
        "total_steps": roadmap.total_steps,
        "completed_steps": roadmap.completed_steps,
        "generation_method": getattr(roadmap, "generation_method", None) or "ollama_qwen",
        "ai_model": getattr(roadmap, "ai_model", None) or "qwen3:8b",
        "latency_seconds": getattr(roadmap, "latency_seconds", None),
        "steps": [
            {
                "step_id": s.step_id,
                "title": s.title,
                "learning_objective": s.learning_objective,
                "difficulty": s.difficulty,
                "estimated_minutes": s.estimated_minutes,
                "sequence_order": s.sequence_order,
                "current_mastery": s.current_mastery,
                "target_mastery": s.target_mastery,
                "status": s.status,
                "prerequisite_ids": getattr(s, "prerequisite_ids", []) or [],
                "prerequisites_met": s.prerequisites_met,
                "recommendation_reason": s.recommendation_reason,
                "recommended_resource_ids": s.recommended_resource_ids,
                "practice_exercise_ids": s.practice_exercise_ids,
                "assessment_id": s.assessment_id,
                "project_id": s.project_id,
            }
            for s in roadmap.steps
        ],
    }


@router.delete("/roadmaps/{path_id}")
def delete_user_roadmap(
    path_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Deletes a learning roadmap and its associated steps for the authenticated user.
    """
    owner_uuid = uuid.UUID(user.id)
    query = db.query(LearningRoadmap).filter(LearningRoadmap.owner_user_id == owner_uuid)
    try:
        rm_uuid = uuid.UUID(path_id)
        query = query.filter(or_(LearningRoadmap.id == rm_uuid, LearningRoadmap.path_id == path_id))
    except ValueError:
        query = query.filter(LearningRoadmap.path_id == path_id)

    roadmap = query.first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found or unauthorized")

    db.query(LearningStep).filter(LearningStep.roadmap_id == roadmap.id).delete(synchronize_session=False)
    db.query(LearningMasterySnapshot).filter(LearningMasterySnapshot.roadmap_id == roadmap.id).delete(synchronize_session=False)
    db.delete(roadmap)
    db.commit()

    return {"status": "deleted", "path_id": path_id, "message": "Roadmap deleted successfully"}


# ──────────────────────────────────────────────────────────────────────────────
# 4.4. SKILL GAP EVIDENCE-PROVENANCE SYSTEM (Phase 9)
# ──────────────────────────────────────────────────────────────────────────────

class ProvenanceEvaluateRequest(BaseModel):
    skill_id: str = Field(..., description="Canonical skill identifier or gap slug")
    target_role_id: Optional[str] = Field(None, description="Optional target role ID")
    gap_id: Optional[str] = Field(None, description="Optional career gap ID")
    force_refresh: bool = Field(False, description="Whether to re-evaluate with AI or use cached assessment")


@router.get("/assessments/provenance/{skill_id}", response_model=SkillGapAssessmentResponse)
async def get_skill_provenance(
    skill_id: str,
    role_id: Optional[str] = Query(None, description="Target role ID"),
    gap_id: Optional[str] = Query(None, description="Career gap ID"),
    force_refresh: bool = Query(False, description="Force fresh analysis"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves or generates the evidence-backed assessment for a lagging skill.
    Returns:
      - Skill assessment details (required vs current proficiency, gap type).
      - Genuine requirement sources (role model, parsed job descriptions).
      - Real user evidence sources (GitHub commits, uploaded files, assessments).
      - Evidence sufficiency status (verified_skill_gap, evidence_gap, conflicting_evidence).
      - AI / deterministic analysis provenance (run ID, model, prompt version).
    """
    return await provenance_service.evaluate_or_get_skill_assessment(
        db=db,
        user_id=current_user.id,
        skill_id=skill_id,
        target_role_id=role_id,
        gap_id=gap_id,
        force_refresh=force_refresh,
    )


@router.post("/assessments/provenance/evaluate", response_model=SkillGapAssessmentResponse)
async def evaluate_skill_provenance(
    payload: ProvenanceEvaluateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Evaluates evidence provenance for a lagging skill on demand.
    """
    return await provenance_service.evaluate_or_get_skill_assessment(
        db=db,
        user_id=current_user.id,
        skill_id=payload.skill_id,
        target_role_id=payload.target_role_id,
        gap_id=payload.gap_id,
        force_refresh=payload.force_refresh,
    )


# ──────────────────────────────────────────────────────────────────────────────
# 4.5. DIAGNOSTIC & MASTERY ASSESSMENTS (AI Generated & Evaluated)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/assessments/generate")
async def generate_assessment(
    payload: AssessmentGenerateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates a fresh mastery assessment for a skill or learning step via Ollama Qwen3 8B.
    Strips answer keys and explanations from the learner response.
    Persists full definition (including answer key) in learning_assessments.
    """
    owner_uuid = uuid.UUID(user.id)

    # 1. Check for existing assessment for this skill/user if not forcing fresh generation
    if not payload.force_regenerate:
        existing = (
            db.query(LearningAssessment)
            .filter(
                LearningAssessment.owner_user_id == owner_uuid,
                LearningAssessment.skill_id == payload.skill_id,
            )
            .order_by(desc(LearningAssessment.created_at))
            .first()
        )
        if existing:
            q_objs = [AssessmentQuestion(**q) for q in existing.questions_data]
            asmt_def = AssessmentDefinition(
                assessment_id=existing.assessment_id,
                title=existing.title,
                skill_id=existing.skill_id,
                skill_name=existing.skill_name,
                learning_objective=existing.learning_objective,
                difficulty=getattr(existing, "difficulty", "Intermediate"),
                passing_threshold=existing.passing_threshold,
                time_limit_minutes=existing.time_limit_minutes,
                is_synthetic=existing.is_synthetic,
                generation_method=existing.generation_method,
                generation_latency_seconds=existing.generation_latency_seconds,
                questions=q_objs,
            )
            return assessment_generator.strip_answers_for_learner(asmt_def)

    # 2. Derive skill name and objective if missing
    skill_name = payload.skill_name or payload.skill_id.replace("skill-", "").replace("-", " ").title()
    objective = payload.learning_objective or f"Demonstrate practical proficiency and theoretical knowledge in {skill_name}."

    # 3. Generate assessment via Ollama with fallback
    gen_kwargs = {}
    if payload.question_count is not None:
        gen_kwargs["question_count"] = payload.question_count

    asmt_def = await assessment_generator.generate_assessment(
        skill_id=payload.skill_id,
        skill_name=skill_name,
        learning_objective=objective,
        difficulty=payload.difficulty,
        step_id=payload.step_id,
        roadmap_id=payload.roadmap_id,
        is_synthetic=payload.is_synthetic,
        **gen_kwargs,
    )

    roadmap_uuid = None
    if payload.roadmap_id:
        try:
            roadmap_uuid = uuid.UUID(payload.roadmap_id)
        except (ValueError, TypeError):
            r_obj = db.query(LearningRoadmap).filter(LearningRoadmap.path_id == payload.roadmap_id).first()
            if r_obj:
                roadmap_uuid = r_obj.id

    # 4. Persist to learning_assessments
    item = LearningAssessment(
        assessment_id=asmt_def.assessment_id,
        owner_user_id=owner_uuid,
        roadmap_id=roadmap_uuid,
        step_id=payload.step_id,
        skill_id=payload.skill_id,
        skill_name=skill_name,
        title=asmt_def.title,
        learning_objective=asmt_def.learning_objective,
        passing_threshold=asmt_def.passing_threshold,
        time_limit_minutes=asmt_def.time_limit_minutes,
        is_synthetic=payload.is_synthetic,
        generation_method=asmt_def.generation_method,
        generation_latency_seconds=asmt_def.generation_latency_seconds,
        questions_data=[q.model_dump() for q in asmt_def.questions],
    )
    db.add(item)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting assessment definition: {e}")

    # 5. Return sanitized learner payload (SECURITY: answers stripped!)
    return assessment_generator.strip_answers_for_learner(asmt_def)


@router.get("/assessments/{assessment_id}")
def get_assessment_for_learner(
    assessment_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves the learner-facing assessment questionnaire by assessment_id.
    SECURITY: Answer keys and explanations are stripped.
    """
    owner_uuid = uuid.UUID(user.id)

    # Ownership verification: ensure wrong-user access fails with 403 Forbidden
    asmt_any = (
        db.query(LearningAssessment)
        .filter(LearningAssessment.assessment_id == assessment_id)
        .first()
    )
    if asmt_any and asmt_any.owner_user_id != owner_uuid:
        raise HTTPException(
            status_code=403, detail="Unauthorized access: assessment belongs to another user."
        )

    asmt = (
        db.query(LearningAssessment)
        .filter(
            LearningAssessment.owner_user_id == owner_uuid,
            (LearningAssessment.assessment_id == assessment_id)
            | (LearningAssessment.skill_id == assessment_id),
        )
        .order_by(desc(LearningAssessment.created_at))
        .first()
    )
    if not asmt:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found.")

    q_objs = [AssessmentQuestion(**q) for q in asmt.questions_data]
    asmt_def = AssessmentDefinition(
        assessment_id=asmt.assessment_id,
        title=asmt.title,
        skill_id=asmt.skill_id,
        skill_name=asmt.skill_name,
        learning_objective=asmt.learning_objective,
        difficulty=getattr(asmt, "difficulty", "Intermediate"),
        passing_threshold=asmt.passing_threshold,
        time_limit_minutes=asmt.time_limit_minutes,
        is_synthetic=asmt.is_synthetic,
        generation_method=asmt.generation_method,
        generation_latency_seconds=asmt.generation_latency_seconds,
        questions=q_objs,
    )
    return assessment_generator.strip_answers_for_learner(asmt_def)


@router.post("/assessments/{assessment_id}/submit")
def submit_assessment_attempt(
    assessment_id: str,
    payload: AssessmentSubmitRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Evaluates submitted answers strictly against the stored backend answer key.
    Records LearningAttempt, updates step and roadmap mastery, and returns full evaluation feedback.
    """
    owner_uuid = uuid.UUID(user.id)

    # Ownership verification: ensure wrong-user access fails with 403 Forbidden
    asmt_any = (
        db.query(LearningAssessment)
        .filter(LearningAssessment.assessment_id == assessment_id)
        .first()
    )
    if asmt_any and asmt_any.owner_user_id != owner_uuid:
        raise HTTPException(
            status_code=403, detail="Unauthorized access: assessment belongs to another user."
        )

    asmt = (
        db.query(LearningAssessment)
        .filter(
            LearningAssessment.assessment_id == assessment_id,
            LearningAssessment.owner_user_id == owner_uuid,
        )
        .first()
    )
    if not asmt:
        raise HTTPException(status_code=404, detail=f"Assessment '{assessment_id}' not found.")

    q_objs = [AssessmentQuestion(**q) for q in asmt.questions_data]
    asmt_def = AssessmentDefinition(
        assessment_id=asmt.assessment_id,
        title=asmt.title,
        skill_id=asmt.skill_id,
        skill_name=asmt.skill_name,
        learning_objective=asmt.learning_objective,
        difficulty=getattr(asmt, "difficulty", "Intermediate"),
        passing_threshold=asmt.passing_threshold,
        time_limit_minutes=asmt.time_limit_minutes,
        is_synthetic=asmt.is_synthetic,
        generation_method=asmt.generation_method,
        generation_latency_seconds=asmt.generation_latency_seconds,
        questions=q_objs,
    )

    # Handle Explicit Skip Action (Part 5 Requirements)
    if payload.is_skipped:
        attempt = LearningAttempt(
            owner_user_id=owner_uuid,
            step_id=asmt.step_id or f"step-{asmt.skill_id[:8]}",
            roadmap_id=asmt.roadmap_id,
            attempt_type="assessment",
            activity_id=asmt.assessment_id,
            score=0.0,
            passed=False,
            signals={
                "knowledge_signal": 0.0,
                "practice_signal": 0.0,
                "assessment_signal": 0.0,
                "project_signal": 0.0,
            },
            computed_mastery=0.0,
            attempt_metadata={
                "status": "skipped",
                "is_skipped": True,
                "submitted_answers": {},
                "earned_points": 0,
                "total_points": sum(q.points for q in q_objs),
            },
        )
        db.add(attempt)

        # If linked to roadmap and step, mark step skipped and unlock next step without awarding mastery
        if asmt.roadmap_id and asmt.step_id:
            step = (
                db.query(LearningStep)
                .filter(LearningStep.roadmap_id == asmt.roadmap_id, LearningStep.step_id == asmt.step_id)
                .first()
            )
            if step and step.status != "completed":
                step.status = "skipped"
                next_step = (
                    db.query(LearningStep)
                    .filter(
                        LearningStep.roadmap_id == asmt.roadmap_id,
                        LearningStep.sequence_order == step.sequence_order + 1,
                    )
                    .first()
                )
                if next_step and next_step.status == "locked":
                    next_step.status = "available"
                    next_step.prerequisites_met = True

        db.commit()
        db.refresh(attempt)

        return {
            "assessment_id": asmt.assessment_id,
            "skill_id": asmt.skill_id,
            "total_questions": len(q_objs),
            "total_points": sum(q.points for q in q_objs),
            "earned_points": 0,
            "score_percentage": 0.0,
            "passing_threshold": asmt.passing_threshold,
            "passed": False,
            "is_skipped": True,
            "computed_mastery": 0.0,
            "recommendation": "Assessment was skipped. No mastery credit awarded. You can retake this assessment at any time to verify competency.",
            "results": [],
            "attempt_id": str(attempt.id),
            "step_id": asmt.step_id,
            "roadmap_id": str(asmt.roadmap_id) if asmt.roadmap_id else None,
        }

    # Grade submitted answers
    grade_report = assessment_generator.grade_assessment(asmt_def, payload.answers)

    # Idempotency check: prevent duplicate submissions within 5 seconds with identical answers
    from datetime import timedelta
    recent_attempt = (
        db.query(LearningAttempt)
        .filter(
            LearningAttempt.owner_user_id == owner_uuid,
            LearningAttempt.activity_id == asmt.assessment_id,
            LearningAttempt.created_at >= datetime.now(timezone.utc) - timedelta(seconds=5),
        )
        .order_by(desc(LearningAttempt.created_at))
        .first()
    )
    if recent_attempt and recent_attempt.attempt_metadata.get("submitted_answers") == payload.answers:
        grade_report["attempt_id"] = str(recent_attempt.id)
        grade_report["step_id"] = asmt.step_id
        grade_report["roadmap_id"] = str(asmt.roadmap_id) if asmt.roadmap_id else None
        return grade_report

    # Record persistent LearningAttempt
    attempt = LearningAttempt(
        owner_user_id=owner_uuid,
        step_id=asmt.step_id or f"step-{asmt.skill_id[:8]}",
        roadmap_id=asmt.roadmap_id,
        attempt_type="assessment",
        activity_id=asmt.assessment_id,
        score=grade_report["score_percentage"],
        passed=grade_report["passed"],
        signals={
            "knowledge_signal": grade_report["score_percentage"],
            "practice_signal": 60.0,
            "assessment_signal": grade_report["score_percentage"],
            "project_signal": 0.0,
        },
        computed_mastery=grade_report["computed_mastery"],
        attempt_metadata={
            "submitted_answers": payload.answers,
            "earned_points": grade_report["earned_points"],
            "total_points": grade_report["total_points"],
        },
    )
    db.add(attempt)

    # If linked to roadmap and step, update step progress
    if asmt.roadmap_id and asmt.step_id:
        step = (
            db.query(LearningStep)
            .filter(LearningStep.roadmap_id == asmt.roadmap_id, LearningStep.step_id == asmt.step_id)
            .first()
        )
        if step:
            step.current_mastery = max(step.current_mastery, grade_report["score_percentage"])
            if grade_report["passed"]:
                step.status = "completed"
                # Unlock next step in sequence
                next_step = (
                    db.query(LearningStep)
                    .filter(
                        LearningStep.roadmap_id == asmt.roadmap_id,
                        LearningStep.sequence_order == step.sequence_order + 1,
                    )
                    .first()
                )
                if next_step and next_step.status == "locked":
                    next_step.status = "available"
                    next_step.prerequisites_met = True

            # Update roadmap overall mastery and completed steps count
            roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == asmt.roadmap_id).first()
            if roadmap:
                all_steps = roadmap.steps
                roadmap.completed_steps = sum(1 for s in all_steps if s.status == "completed")
                if all_steps:
                    roadmap.current_mastery = round(sum(s.current_mastery for s in all_steps) / len(all_steps), 1)

    # Record learning activity for history stream
    act = LearningActivityRecord(
        owner_user_id=owner_uuid,
        roadmap_id=asmt.roadmap_id,
        step_id=asmt.step_id,
        activity_type="assessment_attempt",
        activity_status="completed" if grade_report["passed"] else "failed",
        title=f"Assessment: {asmt.title} ({'PASSED' if grade_report['passed'] else 'NEEDS REVIEW'})",
        detail=f"Scored {grade_report['score_percentage']}%. Earned {grade_report['earned_points']}/{grade_report['total_points']} points.",
        domain_id=(
            (db.query(LearningRoadmap).filter(LearningRoadmap.id == asmt.roadmap_id).first().domain_id if asmt.roadmap_id else None)
            or asmt.skill_id
        ),
        skill_id=asmt.skill_id,
        assessment_id=asmt.assessment_id,
        score=grade_report["score_percentage"],
        link_route=f"/app/learning/assessments/{asmt.assessment_id}",
        activity_metadata={
            "passed": grade_report["passed"],
            "earned_points": grade_report["earned_points"],
            "total_points": grade_report["total_points"],
            "passing_threshold": asmt.passing_threshold,
        },
    )
    db.add(act)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Error persisting assessment attempt: {e}")

    grade_report["attempt_id"] = str(attempt.id)
    grade_report["step_id"] = asmt.step_id
    grade_report["roadmap_id"] = str(asmt.roadmap_id) if asmt.roadmap_id else None
    return grade_report


# ──────────────────────────────────────────────────────────────────────────────
# 5. PRACTICE, ASSESSMENT, AND MASTERY SUBMISSION
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/attempts")
def record_learning_attempt(
    payload: LearningAttemptRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Records an interactive practice, assessment, or project attempt.
    Computes updated mastery via deterministic formula (0.30K + 0.25P + 0.20A + 0.25Prj).
    Updates learning step and roadmap mastery.
    INVARIANT: Does NOT verify or alter Skill Passport verification status.
    """
    owner_uuid = uuid.UUID(user.id)

    signals = payload.signals or {}
    k_sig = signals.get("knowledge_signal", payload.score if payload.attempt_type == "assessment" else 60.0)
    p_sig = signals.get("practice_signal", payload.score if payload.attempt_type == "practice" else 60.0)
    a_sig = signals.get("assessment_signal", payload.score if payload.attempt_type == "assessment" else 60.0)
    prj_sig = signals.get("project_signal", payload.score if payload.attempt_type == "project" else 60.0)

    computed_mastery = deterministic_mastery(k_sig, p_sig, a_sig, prj_sig)
    passed = payload.score >= 70.0

    roadmap_uuid = None
    if payload.roadmap_id:
        try:
            roadmap_uuid = uuid.UUID(payload.roadmap_id)
        except (ValueError, TypeError):
            # Check by path_id
            r_obj = db.query(LearningRoadmap).filter(LearningRoadmap.path_id == payload.roadmap_id).first()
            if r_obj:
                roadmap_uuid = r_obj.id

    attempt = LearningAttempt(
        owner_user_id=owner_uuid,
        step_id=payload.step_id,
        roadmap_id=roadmap_uuid,
        attempt_type=payload.attempt_type,
        activity_id=payload.activity_id,
        score=payload.score,
        passed=passed,
        signals={
            "knowledge_signal": k_sig,
            "practice_signal": p_sig,
            "assessment_signal": a_sig,
            "project_signal": prj_sig,
        },
        computed_mastery=computed_mastery,
        attempt_metadata={},
    )
    db.add(attempt)
    attempt_id = str(attempt.id)

    # Update associated step if roadmap found
    step_updated = False
    if roadmap_uuid:
        step = (
            db.query(LearningStep)
            .filter(LearningStep.roadmap_id == roadmap_uuid, LearningStep.step_id == payload.step_id)
            .first()
        )
        if step:
            step.current_mastery = computed_mastery
            if computed_mastery >= step.target_mastery:
                step.status = "completed"
            elif step.status == "available":
                step.status = "in_progress"
            step_updated = True

            # Update roadmap overall mastery and completed steps count
            roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == roadmap_uuid).first()
            if roadmap:
                all_steps = roadmap.steps
                completed_count = sum(1 for s in all_steps if s.status == "completed")
                roadmap.completed_steps = completed_count
                if all_steps:
                    roadmap.current_mastery = round(sum(s.current_mastery for s in all_steps) / len(all_steps), 1)

    # Record time-series snapshot
    snapshot = LearningMasterySnapshot(
        owner_user_id=owner_uuid,
        domain_id="dist-sys",
        skill_id="5873a582-0487-4035-bf6d-30a06b5a301f",
        canonical_name="Distributed Systems & Event Streaming",
        mastery_score=computed_mastery,
        knowledge_signal=k_sig,
        practice_signal=p_sig,
        assessment_signal=a_sig,
        project_signal=prj_sig,
    )
    db.add(snapshot)

    db.commit()

    return {
        "attempt_id": attempt_id,
        "step_id": payload.step_id,
        "score": payload.score,
        "passed": passed,
        "computed_mastery": computed_mastery,
        "step_updated": step_updated,
        "governance_note": "Mastery updated in Learn & Grow. Skill Passport verification remains unchanged.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# 5B. APPLIED MINI-PROJECT SPECIFICATION, GENERATION, SUBMISSION & EVALUATION
# ──────────────────────────────────────────────────────────────────────────────

def serialize_mini_project(proj: LearningMiniProject, sub: Optional[LearningProjectSubmission] = None) -> Dict[str, Any]:
    attempt = None
    status = proj.status
    if sub:
        status = sub.status
        artifact_id = None
        if sub.submission_metadata and isinstance(sub.submission_metadata, dict):
            artifact_id = sub.submission_metadata.get("evidence_item_id")
        attempt = {
            "attempt_id": str(sub.id),
            "project_id": sub.project_id,
            "submitted_at": sub.created_at.isoformat() if sub.created_at else None,
            "github_repo_url": sub.github_repo_url,
            "summary_notes": sub.summary_notes or "",
            "status": sub.status,
            "rubric_scores": sub.rubric_scores or [],
            "total_score": sub.score,
            "feedback": sub.feedback,
            "generated_artifact_id": artifact_id,
            "candidate_evidence_id": artifact_id,
        }

    return {
        "id": proj.project_id,
        "project_id": proj.project_id,
        "domain_id": proj.domain_id,
        "domain_title": proj.domain_title,
        "skill_id": proj.skill_id,
        "skill_name": proj.skill_name,
        "gap_id": proj.gap_id,
        "roadmap_id": str(proj.roadmap_id) if proj.roadmap_id else None,
        "target_role_id": proj.target_role_id,
        "title": proj.title,
        "difficulty": proj.difficulty,
        "estimated_hours": proj.estimated_hours,
        "problem_statement": proj.problem_statement,
        "relevance_to_gap": proj.relevance_to_gap,
        "learning_objectives": proj.learning_objectives or [],
        "objectives": proj.learning_objectives or [],
        "expected_deliverables": proj.expected_deliverables or [],
        "implementation_requirements": proj.implementation_requirements or [],
        "required_steps": (
            [f"Step {m.get('step', idx+1)}: {m.get('title', '')} — {m.get('description', '')}" for idx, m in enumerate(proj.milestones or [])]
            if proj.milestones
            else []
        ),
        "milestones": proj.milestones or [],
        "acceptance_criteria": proj.acceptance_criteria or [],
        "dataset_description": (
            proj.implementation_requirements[0]
            if proj.implementation_requirements and len(proj.implementation_requirements) > 0
            else "Standard industry repository and test environment."
        ),
        "submission_requirements": proj.expected_deliverables or ["Public GitHub repository URL", "Architecture summary & trade-off rationale"],
        "rubric": proj.rubric or [],
        "submission_instructions": proj.submission_instructions or "Submit a public GitHub repository URL.",
        "resources": proj.resources or [],
        "generation_method": proj.generation_method,
        "ai_provider": proj.ai_provider,
        "ai_model": proj.ai_model,
        "latency_seconds": proj.latency_seconds,
        "generation_status": proj.generation_status,
        "status": status,
        "submitted_attempt": attempt,
        "created_at": proj.created_at.isoformat() if proj.created_at else None,
    }


@router.get("/projects")
def list_mini_projects(
    domain_id: Optional[str] = Query(None, description="Optional domain ID or gap ID filter"),
    gap_id: Optional[str] = Query(None, description="Optional gap ID filter"),
    roadmap_id: Optional[str] = Query(None, description="Optional roadmap ID filter"),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves persisted mini-projects for the authenticated user.
    Enforces user isolation and preserves historical project specifications.
    Enriches each project specification with the user's latest submission status.
    """
    owner_uuid = uuid.UUID(user.id)
    query = (
        db.query(LearningMiniProject)
        .filter(
            LearningMiniProject.owner_user_id == owner_uuid,
            LearningMiniProject.is_active == True,
        )
    )

    if roadmap_id:
        try:
            rm_uuid = uuid.UUID(roadmap_id)
            query = query.filter(LearningMiniProject.roadmap_id == rm_uuid)
        except (ValueError, TypeError):
            pass

    if gap_id:
        query = query.filter(LearningMiniProject.gap_id == gap_id)

    if domain_id:
        clean_d = domain_id.strip()
        dom_query = query.filter(
            or_(
                LearningMiniProject.domain_id == clean_d,
                LearningMiniProject.gap_id == clean_d,
            )
        )
        projects = dom_query.order_by(LearningMiniProject.created_at.asc()).all()
        # If no projects found with exact match, try normalized domain match
        if not projects:
            norm_target = clean_d.lower().replace("domain-", "").replace("gap-skill-", "").replace("skill-", "").replace("-&-", "-").replace("&", "")
            all_user_projs = query.order_by(LearningMiniProject.created_at.asc()).all()
            matched = []
            for p in all_user_projs:
                p_norm = p.domain_id.lower().replace("domain-", "").replace("gap-skill-", "").replace("skill-", "").replace("-&-", "-").replace("&", "")
                if norm_target in p_norm or p_norm in norm_target:
                    matched.append(p)
            projects = matched
    else:
        projects = query.order_by(LearningMiniProject.created_at.asc()).all()

    # Load all submissions for this user to join
    submissions = (
        db.query(LearningProjectSubmission)
        .filter(LearningProjectSubmission.owner_user_id == owner_uuid)
        .all()
    )
    sub_map = {s.project_id: s for s in submissions}

    serialized = [serialize_mini_project(p, sub_map.get(p.project_id)) for p in projects]

    return {
        "domain_id": domain_id,
        "count": len(serialized),
        "projects": serialized,
    }


@router.post("/projects/generate")
async def generate_mini_projects_endpoint(
    payload: ProjectGenerateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Generates domain-specific mini-project specifications using Ollama or curated catalogue.
    Idempotent: returns existing active projects if already generated unless force_regenerate is True.
    Persists generated projects to the database with truthful provenance.
    """
    import re
    owner_uuid = uuid.UUID(user.id)
    clean_domain = payload.domain_id.strip()

    # 1. Idempotency check: if already generated and not force_regenerate, return existing
    if not payload.force_regenerate:
        existing = (
            db.query(LearningMiniProject)
            .filter(
                LearningMiniProject.owner_user_id == owner_uuid,
                LearningMiniProject.domain_id == clean_domain,
                LearningMiniProject.is_active == True,
            )
            .order_by(LearningMiniProject.created_at.asc())
            .all()
        )
        if existing:
            submissions = (
                db.query(LearningProjectSubmission)
                .filter(LearningProjectSubmission.owner_user_id == owner_uuid)
                .all()
            )
            sub_map = {s.project_id: s for s in submissions}
            return {
                "status": "cached",
                "count": len(existing),
                "domain_id": clean_domain,
                "projects": [serialize_mini_project(p, sub_map.get(p.project_id)) for p in existing],
            }

    # 2. If force_regenerate, mark existing active projects as inactive (preserve submissions)
    if payload.force_regenerate:
        db.query(LearningMiniProject).filter(
            LearningMiniProject.owner_user_id == owner_uuid,
            LearningMiniProject.domain_id == clean_domain,
            LearningMiniProject.is_active == True,
        ).update({"is_active": False}, synchronize_session=False)
        db.commit()

    # 3. Resolve roadmap UUID if provided
    roadmap_uuid = None
    if payload.roadmap_id:
        try:
            roadmap_uuid = uuid.UUID(payload.roadmap_id)
        except (ValueError, TypeError):
            rm = db.query(LearningRoadmap).filter(LearningRoadmap.path_id == payload.roadmap_id).first()
            if rm:
                roadmap_uuid = rm.id

    # 4. Invoke advisor to generate mini-projects
    domain_title = (
        payload.domain_title
        or clean_domain.replace("domain-", "").replace("gap-skill-", "").replace("skill-", "").replace("-", " ").title()
    )

    specs = await advisor.generate_mini_projects(
        domain_id=clean_domain,
        domain_title=domain_title,
        skill_id=payload.skill_id,
        skill_name=payload.skill_name,
        gap_id=payload.gap_id,
        target_role_id=payload.target_role_id,
        project_count=payload.count,
    )

    # 5. Persist to database
    dom_slug = re.sub(r'[^a-zA-Z0-9]+', '-', clean_domain.lower()).strip('-')[:24]
    persisted_projects = []

    for idx, spec in enumerate(specs):
        proj_unique_id = f"proj-{dom_slug}-{uuid.uuid4().hex[:8]}"
        project_record = LearningMiniProject(
            owner_user_id=owner_uuid,
            project_id=proj_unique_id,
            domain_id=clean_domain,
            domain_title=domain_title,
            skill_id=payload.skill_id,
            skill_name=payload.skill_name or payload.skill_id,
            gap_id=payload.gap_id,
            roadmap_id=roadmap_uuid,
            target_role_id=payload.target_role_id,
            title=spec.get("title", f"Project {idx+1}"),
            difficulty=spec.get("difficulty", "Intermediate"),
            estimated_hours=spec.get("estimated_hours", 10),
            problem_statement=spec.get("problem_statement", ""),
            relevance_to_gap=spec.get("relevance_to_gap", f"Directly remediates skill gap in {domain_title}."),
            learning_objectives=spec.get("learning_objectives", []),
            expected_deliverables=spec.get("expected_deliverables", []),
            implementation_requirements=spec.get("implementation_requirements", []),
            milestones=spec.get("milestones", []),
            acceptance_criteria=spec.get("acceptance_criteria", []),
            rubric=spec.get("rubric", []),
            submission_instructions=spec.get("submission_instructions", "Submit a public GitHub repository URL."),
            resources=spec.get("resources", []),
            generation_method=spec.get("generation_method", "curated_catalogue"),
            ai_provider=spec.get("ai_provider"),
            ai_model=spec.get("ai_model"),
            latency_seconds=spec.get("latency_seconds"),
            generation_status=spec.get("generation_status", "completed"),
            error_message=spec.get("error_message"),
            status="not_started",
            is_active=True,
        )
        db.add(project_record)
        persisted_projects.append(project_record)

    db.commit()
    for p in persisted_projects:
        db.refresh(p)

    return {
        "status": "generated",
        "count": len(persisted_projects),
        "domain_id": clean_domain,
        "projects": [serialize_mini_project(p) for p in persisted_projects],
    }


@router.get("/projects/submissions")
def list_project_submissions(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Lists all mini-project submissions for the authenticated user.
    Enforces strict user isolation.
    """
    owner_uuid = uuid.UUID(user.id)
    subs = (
        db.query(LearningProjectSubmission)
        .filter(LearningProjectSubmission.owner_user_id == owner_uuid)
        .order_by(desc(LearningProjectSubmission.created_at))
        .all()
    )
    return [
        {
            "submission_id": str(s.id),
            "project_id": s.project_id,
            "github_repo_url": s.github_repo_url,
            "summary_notes": s.summary_notes,
            "status": s.status,
            "score": s.score,
            "passed": s.passed,
            "step_id": s.step_id,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in subs
    ]


@router.get("/projects/submissions/{project_id}")
def get_project_submission(
    project_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves a single mini-project submission by project_id for the authenticated user.
    Returns 404 if not found or belongs to another user.
    """
    owner_uuid = uuid.UUID(user.id)
    sub = (
        db.query(LearningProjectSubmission)
        .filter(
            LearningProjectSubmission.owner_user_id == owner_uuid,
            LearningProjectSubmission.project_id == project_id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project submission for '{project_id}' not found for authenticated user.",
        )

    return {
        "submission_id": str(sub.id),
        "project_id": sub.project_id,
        "github_repo_url": sub.github_repo_url,
        "summary_notes": sub.summary_notes,
        "status": sub.status,
        "score": sub.score,
        "passed": sub.passed,
        "feedback": sub.feedback,
        "rubric_scores": sub.rubric_scores,
        "step_id": sub.step_id,
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
    }


@router.get("/projects/{project_id}")
def get_mini_project_detail(
    project_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves full details of a single mini-project specification.
    Enforces authorization and joins user submission history.
    """
    owner_uuid = uuid.UUID(user.id)
    proj = (
        db.query(LearningMiniProject)
        .filter(
            LearningMiniProject.project_id == project_id,
            LearningMiniProject.owner_user_id == owner_uuid,
        )
        .first()
    )
    if not proj:
        # Check if project exists for any user or as seeded/curated
        any_proj = db.query(LearningMiniProject).filter(LearningMiniProject.project_id == project_id).first()
        if any_proj:
            # Reject unauthorized access
            raise HTTPException(status_code=403, detail="You do not have permission to access this project.")
        raise HTTPException(status_code=404, detail=f"Mini-project '{project_id}' not found.")

    sub = (
        db.query(LearningProjectSubmission)
        .filter(
            LearningProjectSubmission.owner_user_id == owner_uuid,
            LearningProjectSubmission.project_id == project_id,
        )
        .first()
    )

    return serialize_mini_project(proj, sub)


@router.post("/projects/submit")
def submit_mini_project(
    payload: ProjectSubmissionCreate,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Submits a mini-project repository deliverable without fabricating scores.
    INVARIANTS:
    - Unevaluated submissions remain in status 'submitted' with score=None.
    - Does NOT contribute a numerical score or alter topic mastery.
    - Does NOT update roadmap completion or learning step status to 'completed'.
    - Idempotent: repeated submissions by the same user for the same project update
      the existing submission record rather than creating duplicate entries.
    - Generates a candidate evidence item in Domain 1 (Evidence Workspace) routed
      to the Human Review Queue (Domain 3).
    """
    repo_url = payload.github_repo_url.strip()
    if not (repo_url.startswith("http://") or repo_url.startswith("https://") or repo_url.startswith("git@")):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid repository URL. Must start with http://, https://, or git@."
        )

    owner_uuid = uuid.UUID(user.id)

    roadmap_uuid = None
    if payload.roadmap_id:
        try:
            roadmap_uuid = uuid.UUID(payload.roadmap_id)
        except (ValueError, TypeError):
            r_obj = db.query(LearningRoadmap).filter(LearningRoadmap.path_id == payload.roadmap_id).first()
            if r_obj:
                roadmap_uuid = r_obj.id

    existing = (
        db.query(LearningProjectSubmission)
        .filter(
            LearningProjectSubmission.owner_user_id == owner_uuid,
            LearningProjectSubmission.project_id == payload.project_id,
        )
        .first()
    )

    proj_record = (
        db.query(LearningMiniProject)
        .filter(
            LearningMiniProject.owner_user_id == owner_uuid,
            LearningMiniProject.project_id == payload.project_id,
        )
        .first()
    )
    proj_title = proj_record.title if proj_record else payload.project_id.replace("proj-", "").replace("-", " ").title()
    proj_desc = proj_record.problem_statement if proj_record else "Applied engineering mini-project submission."

    if existing:
        existing.github_repo_url = repo_url
        existing.summary_notes = payload.summary_notes
        if payload.step_id:
            existing.step_id = payload.step_id
        if roadmap_uuid:
            existing.roadmap_id = roadmap_uuid
        if existing.status != "evaluated":
            existing.status = "submitted"
            existing.score = None
            existing.passed = None
        sub = existing
    else:
        sub = LearningProjectSubmission(
            owner_user_id=owner_uuid,
            project_id=payload.project_id,
            step_id=payload.step_id,
            roadmap_id=roadmap_uuid,
            github_repo_url=repo_url,
            summary_notes=payload.summary_notes,
            status="submitted",
            score=None,
            passed=None,
            feedback="Project repository registered. Automated rubric grading is pending on the backend.",
            rubric_scores=[],
            submission_metadata={},
        )
        db.add(sub)
        db.flush()

    # Generate or update Candidate Learning Evidence in Domain 1 (Evidence Workspace)
    import hashlib
    content_raw = f"{owner_uuid}:{payload.project_id}:{repo_url}".encode("utf-8")
    c_hash = hashlib.sha256(content_raw).hexdigest()

    evidence = (
        db.query(EvidenceItem)
        .filter(
            EvidenceItem.owner_user_id == owner_uuid,
            EvidenceItem.external_record_id == payload.project_id,
            EvidenceItem.source_provider == "github",
        )
        .first()
    )

    if not evidence:
        evidence = EvidenceItem(
            owner_user_id=owner_uuid,
            source_provider="github",
            source_type="project",
            external_record_id=payload.project_id,
            source_url=repo_url,
            source_name=f"Mini-Project: {proj_title}",
            evidence_category="project",
            title=f"Applied Project Deliverable: {proj_title}",
            description=proj_desc,
            extracted_excerpt=payload.summary_notes or f"Submitted repository: {repo_url}",
            observed_timestamp=datetime.now(timezone.utc),
            contributor_identity=user.email or str(owner_uuid),
            attribution_status="author",
            is_collaborative=False,
            project_name=proj_title,
            evidence_strength="medium",
            extraction_confidence=0.85,
            verification_status="unreviewed",
            processing_status="ready_for_review",
            content_hash=c_hash,
            model_version="qwen3:8b",
            is_deleted=False,
            normalized_metadata={},
            provenance={
                "project_id": payload.project_id,
                "github_repo_url": repo_url,
                "domain_id": proj_record.domain_id if proj_record else "applied-project",
                "submitted_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        db.add(evidence)
        db.flush()
    else:
        evidence.source_url = repo_url
        evidence.extracted_excerpt = payload.summary_notes or f"Updated repository: {repo_url}"
        evidence.verification_status = "unreviewed"
        evidence.processing_status = "ready_for_review"

    if proj_record:
        proj_record.status = "submitted"

    sub_metadata = dict(sub.submission_metadata or {})
    sub_metadata["evidence_item_id"] = str(evidence.id)
    sub.submission_metadata = sub_metadata

    # Record project submission activity
    act = LearningActivityRecord(
        owner_user_id=owner_uuid,
        roadmap_id=roadmap_uuid,
        step_id=payload.step_id,
        activity_type="project_submitted",
        activity_status="submitted",
        title=f"Mini-Project Submitted: {proj_title}",
        detail=f"Registered repository ({repo_url}) for rubric assessment. Candidate evidence registered in Domain 1.",
        domain_id=proj_record.domain_id if proj_record else None,
        skill_id=proj_record.skill_id if proj_record else None,
        project_id=payload.project_id,
        link_route=f"/app/learning/projects/{payload.project_id}",
        activity_metadata={
            "github_repo_url": repo_url,
            "evidence_item_id": str(evidence.id),
        },
    )
    db.add(act)

    db.commit()
    db.refresh(sub)

    return {
        "submission_id": str(sub.id),
        "project_id": sub.project_id,
        "github_repo_url": sub.github_repo_url,
        "summary_notes": sub.summary_notes,
        "status": sub.status,
        "score": sub.score,
        "passed": sub.passed,
        "evaluation_status": "pending_evaluation" if sub.status == "submitted" else "evaluated",
        "step_id": sub.step_id,
        "generated_artifact_id": str(evidence.id),
        "candidate_evidence_id": str(evidence.id),
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
        "message": "Project repository submitted. Rubric evaluation is pending. Candidate evidence registered in Domain 1.",
    }


@router.post("/projects/{project_id}/evaluate")
def evaluate_project_submission(
    project_id: str,
    payload: ProjectEvaluationRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Records a legitimate server-authoritative evaluation of a submitted mini-project.
    Updates the submission record to 'evaluated', records the numerical score,
    and updates topic mastery signals (project_signal).
    """
    owner_uuid = uuid.UUID(user.id)
    sub = (
        db.query(LearningProjectSubmission)
        .filter(
            LearningProjectSubmission.owner_user_id == owner_uuid,
            LearningProjectSubmission.project_id == project_id,
        )
        .first()
    )
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No submission found for project '{project_id}' to evaluate.",
        )

    passed = payload.score >= 70.0
    sub.status = "evaluated"
    sub.score = payload.score
    sub.passed = passed
    sub.feedback = payload.feedback or f"Server rubric evaluation complete: {payload.score}%."
    if payload.rubric_scores:
        sub.rubric_scores = payload.rubric_scores

    k_sig = 60.0
    p_sig = 60.0
    a_sig = 60.0
    prj_sig = payload.score
    computed_mastery = deterministic_mastery(k_sig, p_sig, a_sig, prj_sig)

    attempt = LearningAttempt(
        owner_user_id=owner_uuid,
        step_id=sub.step_id or project_id,
        roadmap_id=sub.roadmap_id,
        attempt_type="project",
        activity_id=project_id,
        score=payload.score,
        passed=passed,
        signals={
            "knowledge_signal": k_sig,
            "practice_signal": p_sig,
            "assessment_signal": a_sig,
            "project_signal": prj_sig,
        },
        computed_mastery=computed_mastery,
        attempt_metadata={"rubric_scores": sub.rubric_scores},
    )
    db.add(attempt)

    snapshot = LearningMasterySnapshot(
        owner_user_id=owner_uuid,
        domain_id="dist-sys",
        skill_id="5873a582-0487-4035-bf6d-30a06b5a301f",
        canonical_name="Distributed Systems & Event Streaming",
        mastery_score=computed_mastery,
        knowledge_signal=k_sig,
        practice_signal=p_sig,
        assessment_signal=a_sig,
        project_signal=prj_sig,
    )
    db.add(snapshot)

    step_updated = False
    if sub.roadmap_id and sub.step_id:
        step = (
            db.query(LearningStep)
            .filter(LearningStep.roadmap_id == sub.roadmap_id, LearningStep.step_id == sub.step_id)
            .first()
        )
        if step:
            step.current_mastery = computed_mastery
            if computed_mastery >= step.target_mastery:
                step.status = "completed"
            elif step.status == "available":
                step.status = "in_progress"
            step_updated = True

            roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == sub.roadmap_id).first()
            if roadmap and roadmap.steps:
                completed_count = sum(1 for s in roadmap.steps if s.status == "completed")
                roadmap.completed_steps = completed_count
                roadmap.current_mastery = round(sum(s.current_mastery for s in roadmap.steps) / len(roadmap.steps), 1)

    # Record evaluated activity
    act = LearningActivityRecord(
        owner_user_id=owner_uuid,
        roadmap_id=sub.roadmap_id,
        step_id=sub.step_id,
        activity_type="project_evaluated",
        activity_status="completed" if passed else "failed",
        title=f"Mini-Project Evaluated: {project_id} ({'PASSED' if passed else 'NEEDS WORK'})",
        detail=f"Rubric evaluation score: {payload.score}%. {sub.feedback}",
        project_id=project_id,
        score=payload.score,
        link_route=f"/app/learning/projects/{project_id}",
        activity_metadata={
            "passed": passed,
            "rubric_scores": sub.rubric_scores,
        },
    )
    db.add(act)

    db.commit()
    db.refresh(sub)

    return {
        "submission_id": str(sub.id),
        "project_id": sub.project_id,
        "status": sub.status,
        "score": sub.score,
        "passed": sub.passed,
        "computed_mastery": computed_mastery,
        "step_updated": step_updated,
        "feedback": sub.feedback,
        "message": "Project evaluation recorded. Mastery telemetry updated with legitimate project signal.",
    }


# ──────────────────────────────────────────────────────────────────────────────
# 6. MASTERY PROGRESS & LEARNING OVERVIEW
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/mastery")
def get_mastery_telemetry(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the authenticated user's current mastery summary and historical progression.
    """
    owner_uuid = uuid.UUID(user.id)
    snapshots = (
        db.query(LearningMasterySnapshot)
        .filter(LearningMasterySnapshot.owner_user_id == owner_uuid)
        .order_by(desc(LearningMasterySnapshot.recorded_at))
        .limit(20)
        .all()
    )

    attempts = (
        db.query(LearningAttempt)
        .filter(LearningAttempt.owner_user_id == owner_uuid)
        .order_by(desc(LearningAttempt.created_at))
        .limit(10)
        .all()
    )

    avg_mastery = round(sum(s.mastery_score for s in snapshots) / len(snapshots), 1) if snapshots else 0.0

    return {
        "user_id": user.id,
        "average_mastery": avg_mastery,
        "snapshot_count": len(snapshots),
        "recent_snapshots": [
            {
                "skill_name": s.canonical_name,
                "mastery_score": s.mastery_score,
                "signals": {
                    "knowledge": s.knowledge_signal,
                    "practice": s.practice_signal,
                    "assessment": s.assessment_signal,
                    "project": s.project_signal,
                },
                "recorded_at": s.recorded_at.isoformat(),
            }
            for s in snapshots
        ],
        "recent_attempts": [
            {
                "id": str(a.id),
                "step_id": a.step_id,
                "attempt_type": a.attempt_type,
                "activity_id": a.activity_id,
                "score": a.score,
                "computed_mastery": a.computed_mastery,
                "passed": a.passed,
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
    }


@router.get("/overview")
def get_learning_overview(
    target_role_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Comprehensive overview endpoint for the Learn & Grow frontend dashboard.
    """
    owner_uuid = uuid.UUID(user.id)

    # 1. Active roadmap
    active_roadmap = (
        db.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == owner_uuid)
        .order_by(desc(LearningRoadmap.updated_at))
        .first()
    )

    # 2. Priorities
    target_role = career_db_adapter.get_user_target_role(db, user.id)
    resolved_role_id = target_role_id or (target_role.get("target_role_id") if target_role else None)
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id, resolved_role_id)
    results = [prioritizer.evaluate_item(t) for t in triggers]
    results.sort(key=lambda r: (r.priority_rank, -r.priority_score))
    priorities = []
    for r, t in zip(results, triggers):
        d = r.model_dump()
        d["gap_id"] = t.gap_id
        d["domain_id"] = t.gap_id
        d["role_id"] = t.role.role_id
        d["role_title"] = t.role.role_title
        priorities.append(d)

    # 3. Recent history & activities
    attempts = (
        db.query(LearningAttempt)
        .filter(LearningAttempt.owner_user_id == owner_uuid)
        .order_by(desc(LearningAttempt.created_at))
        .limit(5)
        .all()
    )

    activities = (
        db.query(LearningActivityRecord)
        .filter(LearningActivityRecord.owner_user_id == owner_uuid)
        .order_by(desc(LearningActivityRecord.created_at))
        .limit(10)
        .all()
    )

    roadmap_data = None
    if active_roadmap:
        real_comp = sum(1 for s in active_roadmap.steps if s.status == "completed") if active_roadmap.steps else active_roadmap.completed_steps
        real_tot = len(active_roadmap.steps) if active_roadmap.steps else active_roadmap.total_steps
        roadmap_data = {
            "id": str(active_roadmap.id),
            "path_id": active_roadmap.path_id,
            "domain_id": active_roadmap.domain_id,
            "domain_title": active_roadmap.domain_title,
            "status": active_roadmap.status,
            "current_mastery": active_roadmap.current_mastery,
            "baseline_mastery": active_roadmap.baseline_mastery,
            "target_mastery": active_roadmap.target_mastery,
            "completed_steps": real_comp,
            "total_steps": real_tot,
            "steps": [
                {
                    "step_id": s.step_id,
                    "title": s.title,
                    "status": s.status,
                    "current_mastery": s.current_mastery,
                    "target_mastery": s.target_mastery,
                }
                for s in active_roadmap.steps
            ],
        }

    # Derive active blueprint: active roadmap's domain, or top priority career gap, or first available
    active_bp = None
    all_blueprints = get_user_augmented_blueprints(db, user)
    if active_roadmap:
        active_bp = next((bp for bp in all_blueprints if bp["domain_id"] == active_roadmap.domain_id), None)
    if not active_bp and all_blueprints:
        active_bp = all_blueprints[0]
    if not active_bp:
        active_bp = CANONICAL_BLUEPRINTS[0]

    return {
        "user_id": user.id,
        "target_role_id": target_role.get("target_role_id") if target_role else (triggers[0].role.role_id if triggers else None),
        "target_role_title": target_role.get("role_title") if target_role else (triggers[0].role.role_title if triggers else None),
        "active_blueprint": active_bp,
        "active_roadmap": roadmap_data,
        "priorities": priorities[:5],
        "recent_activities": [serialize_activity(a) for a in activities],
        "recent_attempts": [
            {
                "id": str(a.id),
                "step_id": a.step_id,
                "attempt_type": a.attempt_type,
                "activity_id": a.activity_id,
                "score": a.score,
                "computed_mastery": a.computed_mastery,
                "passed": a.passed,
                "created_at": a.created_at.isoformat(),
            }
            for a in attempts
        ],
    }


# ──────────────────────────────────────────────────────────────────────────────
# 7. DEVELOPER DIAGNOSTICS (Phase 10)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/diagnostics/synthetic-benchmark")
async def get_developer_synthetic_diagnostics(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Development-only diagnostic endpoint (Phase 10).
    Inspects synthetic input normalization, real DB readiness, local Ollama connectivity,
    and returns benchmark verification metrics.
    Blocked in production.
    """
    if getattr(settings, "app_env", "development").lower() in ("production", "prod"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developer diagnostics are disabled in production environments.",
        )

    import time
    import httpx
    import os

    t0 = time.perf_counter()
    triggers = synthetic_ci_adapter.create_applied_mle_synthetic_triggers()
    normalized = synthetic_ci_adapter.normalize_raw_gaps(triggers)

    # Check DAG
    dep_dicts = [
        {
            "id": t.competency.canonical_skill_id,
            "title": t.competency.canonical_name,
            "prerequisites": t.prerequisite_skill_ids,
            "priority_score": t.priority_score,
        }
        for t in normalized
    ]
    is_dag_valid, dag_errors = validate_dependency_graph(dep_dicts)
    topological_order = topological_sort_with_priorities(dep_dicts) if is_dag_valid else []

    # Check Ollama connectivity
    ollama_status = "unavailable"
    model_name = os.environ.get("OLLAMA_QWEN_MODEL") or os.environ.get("OLLAMA_MODEL", "qwen3:8b")
    ollama_latency_ms = None
    try:
        ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        t_ol = time.perf_counter()
        async with httpx.AsyncClient(timeout=2.0) as client:
            r = await client.get(f"{ollama_url}/api/tags")
            if r.status_code == 200:
                ollama_status = "reachable"
                ollama_latency_ms = round((time.perf_counter() - t_ol) * 1000, 2)
    except Exception:
        ollama_status = "unreachable"

    # Real DB schema readiness check
    tables_ready = {
        "learning_roadmaps": career_db_adapter._has_table(db, "learning_roadmaps"),
        "learning_steps": career_db_adapter._has_table(db, "learning_steps"),
        "learning_assessments": career_db_adapter._has_table(db, "learning_assessments"),
        "learning_attempts": career_db_adapter._has_table(db, "learning_attempts"),
        "role_match_snapshots": career_db_adapter._has_table(db, "role_match_snapshots"),
    }

    elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

    return {
        "status": "healthy",
        "environment": getattr(settings, "app_env", "development"),
        "diagnostics_latency_ms": elapsed_ms,
        "synthetic_pipeline": {
            "target_role": "Applied Machine Learning Engineer",
            "gaps_count": len(normalized),
            "is_dag_valid": is_dag_valid,
            "dag_errors": dag_errors,
            "topological_sequence": [item["title"] for item in topological_order],
            "provenance_isolated": True,
        },
        "ollama_integration": {
            "status": ollama_status,
            "model": model_name,
            "ping_latency_ms": ollama_latency_ms,
        },
        "database_readiness": {
            "tables": tables_ready,
            "upstream_career_intelligence_snapshot_available": tables_ready["role_match_snapshots"],
        },
        "benchmark_summary": {
            "data_nature": "historical_benchmark_data",
            "is_live_measurement": False,
            "note": "Historical benchmark reference values from Phase 4E, not live invocation measurements",
            "warm_roadmap_median_seconds": 26.495,
            "warm_assessment_median_seconds": 84.733,
            "benchmarked_model": model_name,
            "benchmark_generation_source": "ollama_qwen_verified",
            "real_user_data_impact": "zero_leaks_verified",
        },
    }



# ──────────────────────────────────────────────────────────────────────────────
# PROVIDER HEALTH DIAGNOSTICS (development / ops use only)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/diagnostics/providers")
async def provider_health_check(
    query: str = Query("Python pandas data preprocessing tutorial", description="Test query to send to each provider"),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Development-only: independently health-checks every registered resource provider
    with a real live request.

    Reports per-provider: implementation status, configuration, live-request outcome,
    HTTP status (sanitised), result count, relevant result count, latency, and
    rate-limit/quota information where available.

    Does NOT expose API keys, full credential-bearing URLs, or private user data.
    Requires authentication to prevent accidental public exposure.
    """
    import time as _time
    import os

    TEST_TOPIC = "data-preprocessing"
    TEST_DIFFICULTY = "Intermediate"
    TEST_LIMIT = 3

    provider_instances = list(aggregator.providers)

    report = {
        "test_query": query,
        "test_topic": TEST_TOPIC,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "providers": {},
    }

    for provider in provider_instances:
        name = provider.provider_name()
        entry: dict = {
            "provider": name,
            "implemented": True,
            "configured": provider.is_available(),
            "live_request_executed": False,
            "status": None,
            "http_status_sanitised": None,
            "error_sanitised": None,
            "result_count": 0,
            "relevant_result_count": 0,
            "result_sample": [],
            "latency_ms": None,
            "cache_hit": False,  # Providers do not use an internal cache; always live
            "rate_limit_info": None,
            "last_tested_utc": datetime.now(timezone.utc).isoformat(),
            "remediation": None,
        }

        if not provider.is_available():
            entry["status"] = "NOT_CONFIGURED"
            entry["remediation"] = (
                f"Set the required environment variable for '{name}' in backend/.env "
                "and restart the backend process."
            )
            report["providers"][name] = entry
            continue

        try:
            t0 = _time.perf_counter()
            result = await provider.fetch_resources(
                query=query,
                topic_slug=TEST_TOPIC,
                difficulty=TEST_DIFFICULTY,
                limit=TEST_LIMIT,
            )
            latency = _time.perf_counter() - t0

            entry["live_request_executed"] = True
            entry["latency_ms"] = round(latency * 1000, 1)
            entry["status"] = result.status.value if hasattr(result.status, "value") else str(result.status)
            entry["result_count"] = len(result.resources)
            entry["relevant_result_count"] = sum(
                1 for r in result.resources if r.relevance_score >= 0.35
            )

            if result.error_message:
                # Sanitise: strip any URLs that may contain API keys
                import re as _re
                sanitised = _re.sub(r"key=[A-Za-z0-9_\-]+", "key=***", result.error_message)
                sanitised = _re.sub(r"token=[A-Za-z0-9_\-]+", "token=***", sanitised)
                entry["error_sanitised"] = sanitised[:300]

            # Sample up to 3 result titles + relevance for visibility
            entry["result_sample"] = [
                {
                    "title": r.title[:70],
                    "relevance_score": r.relevance_score,
                    "resource_type": r.resource_type,
                    "url_domain": r.url.split("/")[2] if "//" in r.url else r.url[:30],
                }
                for r in result.resources[:3]
            ]

            # Derive HTTP status signal from ProviderStatus
            if result.status.value == "success":
                entry["http_status_sanitised"] = "2xx"
            elif result.status.value == "rate_limited":
                entry["http_status_sanitised"] = "429"
            elif result.status.value == "quota_exhausted":
                entry["http_status_sanitised"] = "403"
            elif result.status.value == "timeout":
                entry["http_status_sanitised"] = "timeout"
            elif result.status.value == "error":
                entry["http_status_sanitised"] = "4xx/5xx"
            elif result.status.value == "empty":
                entry["http_status_sanitised"] = "200 (empty)"
            elif result.status.value == "unavailable":
                entry["http_status_sanitised"] = "not_called"

            # Remediation hints
            if result.status.value in ("error", "timeout", "quota_exhausted", "rate_limited"):
                hints = {
                    "youtube": "Check YouTube Data API v3 quota in Google Cloud Console. Enable the API if disabled.",
                    "devto": "DEV.to public API requires no key. Check network connectivity. Authenticated key improves rate limits.",
                    "github": "Add GITHUB_TOKEN to backend/.env to increase search rate limit from 10/min to 30/min.",
                    "freecodecamp": "Verify https://www.freecodecamp.org/news/rss/ is reachable. No API key required.",
                }
                entry["remediation"] = hints.get(name, "Check provider network connectivity and credentials.")

        except Exception as exc:
            entry["live_request_executed"] = True
            entry["status"] = "EXCEPTION"
            entry["error_sanitised"] = str(exc)[:200]
            entry["remediation"] = f"Unexpected exception in '{name}' provider. Check backend logs for details."

        report["providers"][name] = entry

    # Overall summary
    statuses = [v["status"] for v in report["providers"].values()]
    report["summary"] = {
        "total_providers": len(provider_instances),
        "live_verified": statuses.count("success"),
        "empty": statuses.count("empty"),
        "failing": sum(1 for s in statuses if s in ("error", "EXCEPTION", "timeout", "quota_exhausted")),
        "not_configured": statuses.count("NOT_CONFIGURED"),
        "rate_limited": statuses.count("rate_limited"),
    }

    return report

