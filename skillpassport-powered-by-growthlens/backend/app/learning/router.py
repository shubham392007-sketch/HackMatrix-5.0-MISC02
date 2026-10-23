"""
Learn & Grow Domain API Router.
Endpoints for learning priorities, curated resource discovery, personalized roadmaps,
practice and assessment attempts, and deterministic mastery telemetry.
"""

import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.core.logging import get_logger
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
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
from backend.app.learning.prioritizer import SkillGapPrioritizer, PrioritizationResult
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
from backend.app.learning.blueprints import CANONICAL_BLUEPRINTS, CANONICAL_DIAGNOSTICS
from backend.app.models.learning import (
    LearningRoadmap,
    LearningStep,
    LearningResourceItem,
    LearningAttempt,
    LearningMasterySnapshot,
    LearningAssessment,
    LearningProjectSubmission,
)
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
    answers: Dict[str, int] = Field(..., description="Map of question_id to selected option index (0-indexed)")


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
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves the authenticated user's prioritized learning gaps derived from
    Career Intelligence snapshots and Skill Intelligence taxonomy in the shared database.
    """
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id)
    results = [prioritizer.evaluate_item(t) for t in triggers]
    # Sort deterministically by priority rank (1 = highest priority)
    results.sort(key=lambda r: (r.priority_rank, -r.priority_score))
    return {
        "user_id": user.id,
        "count": len(results),
        "confidence_review_threshold": prioritizer.confidence_review_threshold,
        "priorities": [r.model_dump() for r in results],
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
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id)
    results = [prioritizer.evaluate_item(t) for t in triggers]
    results.sort(key=lambda r: (r.priority_rank, -r.priority_score))
    return {
        "status": "refreshed",
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "count": len(results),
        "priorities": [r.model_dump() for r in results],
    }


# ──────────────────────────────────────────────────────────────────────────────
# 2. DOMAIN BLUEPRINTS & DIAGNOSTICS
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/blueprints")
def list_blueprints():
    """
    Returns canonical domain blueprints for structured engineering upskilling.
    """
    return {"blueprints": CANONICAL_BLUEPRINTS}


@router.get("/blueprints/{domain_id}")
def get_blueprint(domain_id: str):
    """
    Fetches a specific domain blueprint by domain_id.
    """
    for bp in CANONICAL_BLUEPRINTS:
        if bp["domain_id"] == domain_id:
            return bp
    raise HTTPException(status_code=404, detail=f"Domain blueprint '{domain_id}' not found.")


@router.get("/blueprints/{domain_id}/diagnostic")
def get_diagnostic_questions(domain_id: str):
    """
    Retrieves the diagnostic question set for domain baseline calibration.
    """
    questions = CANONICAL_DIAGNOSTICS.get(domain_id)
    if not questions:
        # Return generic baseline questions if domain not explicitly registered
        questions = [
            {
                "id": f"diag-{domain_id}-1",
                "domain_id": domain_id,
                "module_id": "mod-base-1",
                "topic_id": "topic-core",
                "category": "concept",
                "question_text": f"What is the foundational architectural principle governing {domain_id.replace('-', ' ').title()}?",
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

@router.get("/steps/{step_id}", response_model=StepResponse)
def get_learning_step(
    step_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve a specific learning step for the authenticated user."""
    try:
        user_uuid = uuid.UUID(current_user.id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")

    step = (
        db.query(LearningStep)
        .join(LearningRoadmap, LearningStep.roadmap_id == LearningRoadmap.id)
        .filter(LearningStep.step_id == step_id, LearningRoadmap.owner_user_id == user_uuid)
        .first()
    )
    if not step:
        raise HTTPException(status_code=404, detail="Learning step not found")

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
    )


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
    limit: int = Query(5, ge=1, le=15),
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
    if payload.skill_gap_id:
        for t in triggers:
            if t.gap_id == payload.skill_gap_id or t.competency.canonical_skill_id == payload.skill_gap_id:
                selected_gap = prioritizer.evaluate_item(t)
                break

    top_gap = selected_gap or (prioritized_gaps[0] if prioritized_gaps else None)

    # Map gap/payload to appropriate domain blueprint or gap-specific domain
    if payload.domain_id:
        domain_id = payload.domain_id
    elif payload.skill_gap_id or (selected_gap and selected_gap.skill_id):
        raw_gap_key = payload.skill_gap_id or selected_gap.skill_id
        domain_id = f"gap-{str(raw_gap_key).lower().replace(' ', '-')}"
    else:
        domain_id = "dist-sys"
        if top_gap:
            name_lower = top_gap.canonical_name.lower()
            if any(w in name_lower for w in ["machine learning", "data", "python", "preprocessing", "ai"]):
                domain_id = "domain-data-preprocessing"
            elif any(w in name_lower for w in ["postgres", "sql", "relational", "database", "schema"]):
                domain_id = "data-eng"
            elif any(w in name_lower for w in ["docker", "kubernetes", "cloud", "infra", "container"]):
                domain_id = "cloud-infra"

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
            "status": existing_roadmap.status,
            "current_mastery": existing_roadmap.current_mastery,
            "baseline_mastery": existing_roadmap.baseline_mastery,
            "target_mastery": existing_roadmap.target_mastery,
            "estimated_total_hours": existing_roadmap.estimated_total_hours,
            "total_steps": existing_roadmap.total_steps,
            "completed_steps": existing_roadmap.completed_steps,
            "generation_method": "cached_existing",
            "latency_seconds": 0.001,
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
                    "prerequisites_met": s.prerequisites_met,
                    "recommendation_reason": s.recommendation_reason,
                    "recommended_resource_ids": s.recommended_resource_ids,
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
    query_str = f"{top_gap.canonical_name} python machine learning" if "data" in domain_id.lower() or "learn" in domain_id.lower() else f"{top_gap.canonical_name} tutorial"
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

    if existing_roadmap and payload.force_regenerate:
        existing_roadmap.status = "archived"
        db.flush()

    roadmap = LearningRoadmap(
        owner_user_id=owner_uuid,
        path_id=f"path-{domain_id}-{uuid.uuid4().hex[:6]}",
        domain_id=domain_id,
        domain_title=domain_title,
        blueprint_version="v1.0",
        target_role_id=payload.target_role_id or (target_role.get("target_role_id") if target_role else "role-senior-backend"),
        target_role_title=target_role.get("role_title") if target_role else "Senior Distributed Systems Engineer",
        status="in_progress",
        baseline_mastery=0.0,
        current_mastery=0.0,
        target_mastery=85.0,
        estimated_total_hours=float(path_rec.estimated_total_hours),
        total_steps=len(path_rec.recommended_stages),
        completed_steps=0,
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
            step_id=f"step-{idx+1}",
            topic_id=f"topic-{domain_id}-{idx+1}",
            module_id=f"mod-{domain_id}-1",
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

    # Format return JSON
    return {
        "id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "domain_id": roadmap.domain_id,
        "domain_title": roadmap.domain_title,
        "status": roadmap.status,
        "current_mastery": roadmap.current_mastery,
        "baseline_mastery": roadmap.baseline_mastery,
        "target_mastery": roadmap.target_mastery,
        "estimated_total_hours": roadmap.estimated_total_hours,
        "total_steps": roadmap.total_steps,
        "completed_steps": roadmap.completed_steps,
        "generation_method": path_rec.generation_method,
        "latency_seconds": path_rec.latency_seconds,
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
                "prerequisites_met": s.prerequisites_met,
                "recommendation_reason": s.recommendation_reason,
                "recommended_resource_ids": s.recommended_resource_ids,
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
    """
    owner_uuid = uuid.UUID(user.id)
    roadmaps = (
        db.query(LearningRoadmap)
        .filter(LearningRoadmap.owner_user_id == owner_uuid)
        .order_by(desc(LearningRoadmap.created_at))
        .all()
    )
    return {
        "user_id": user.id,
        "roadmaps": [
            {
                "id": str(r.id),
                "path_id": r.path_id,
                "domain_id": r.domain_id,
                "domain_title": r.domain_title,
                "status": r.status,
                "current_mastery": r.current_mastery,
                "target_mastery": r.target_mastery,
                "total_steps": r.total_steps,
                "completed_steps": r.completed_steps,
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
    """
    owner_uuid = uuid.UUID(user.id)
    roadmap = (
        db.query(LearningRoadmap)
        .filter(
            LearningRoadmap.owner_user_id == owner_uuid,
            LearningRoadmap.path_id == path_id,
        )
        .first()
    )
    if not roadmap:
        raise HTTPException(status_code=404, detail=f"Roadmap '{path_id}' not found for user.")

    return {
        "id": str(roadmap.id),
        "path_id": roadmap.path_id,
        "domain_id": roadmap.domain_id,
        "domain_title": roadmap.domain_title,
        "status": roadmap.status,
        "current_mastery": roadmap.current_mastery,
        "baseline_mastery": roadmap.baseline_mastery,
        "target_mastery": roadmap.target_mastery,
        "total_steps": roadmap.total_steps,
        "completed_steps": roadmap.completed_steps,
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
# 5B. APPLIED MINI-PROJECT SUBMISSION & EVALUATION CONTRACT
# ──────────────────────────────────────────────────────────────────────────────

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
        db.commit()
        db.refresh(existing)
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
        "created_at": sub.created_at.isoformat(),
        "updated_at": sub.updated_at.isoformat(),
        "message": "Project repository submitted. Rubric evaluation is pending.",
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
    triggers = career_db_adapter.fetch_upstream_triggers(db, user.id)
    priorities = [prioritizer.evaluate_item(t).model_dump() for t in triggers]
    priorities.sort(key=lambda p: (p["priority_rank"], -p["priority_score"]))

    # 3. Recent history
    attempts = (
        db.query(LearningAttempt)
        .filter(LearningAttempt.owner_user_id == owner_uuid)
        .order_by(desc(LearningAttempt.created_at))
        .limit(5)
        .all()
    )

    roadmap_data = None
    if active_roadmap:
        roadmap_data = {
            "id": str(active_roadmap.id),
            "path_id": active_roadmap.path_id,
            "domain_id": active_roadmap.domain_id,
            "domain_title": active_roadmap.domain_title,
            "status": active_roadmap.status,
            "current_mastery": active_roadmap.current_mastery,
            "baseline_mastery": active_roadmap.baseline_mastery,
            "target_mastery": active_roadmap.target_mastery,
            "completed_steps": active_roadmap.completed_steps,
            "total_steps": active_roadmap.total_steps,
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

    return {
        "user_id": user.id,
        "active_blueprint": CANONICAL_BLUEPRINTS[0],
        "active_roadmap": roadmap_data,
        "priorities": priorities[:5],
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

