import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.core.logging import get_logger
from backend.app.models.career import (
    JobPostingRecord,
    RoleDemandModelRecord,
    UserTargetRoleRecord,
    RoleMatchSnapshotRecord,
)
from backend.app.career.providers.base import ProviderException
from backend.app.career.orchestrator import job_orchestrator
from backend.app.career.matching_engine import matching_engine
from backend.app.career.prioritization_service import prioritization_service
from backend.app.career.parser_service import parser_service

logger = get_logger("api.career")
router = APIRouter(prefix="/career", tags=["Domain: Career Intelligence & Role Discovery"])


# ==============================================================================
# PYDANTIC REQUEST SCHEMAS
# ==============================================================================

class JobDiscoveryRequest(BaseModel):
    mode: str = Field(..., description="'mode_a_skills' (skills-derived) or 'mode_b_role' (explicit role)")
    query: Optional[str] = Field(None, description="Role title to search for (required for Mode B)")
    location: Optional[str] = Field(None, description="Optional location / country name")
    country_code: Optional[str] = Field(None, description="Optional 2-letter ISO country code (e.g. 'US', 'IN', 'GB')")
    remote_only: bool = Field(False, description="Filter for remote roles")
    limit: int = Field(10, ge=1, le=20, description="Maximum number of results to fetch (default: 10)")


class ParseJobDescriptionRequest(BaseModel):
    raw_text: str = Field(..., min_length=40, description="Raw job description text")
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None
    context: Optional[str] = None
    source_url: Optional[str] = None


class SaveCustomRoleRequest(BaseModel):
    job_title: str = Field(..., min_length=2)
    company_name: Optional[str] = "Target Employer"
    seniority: str = "Mid Level"
    context: str = "Custom Opportunity"
    source_url: Optional[str] = None
    extracted_competencies: List[Dict[str, Any]] = Field(default_factory=list)


class SetTargetRoleRequest(BaseModel):
    target_role_id: str
    target_role_version: str = "v2026.1"
    role_title: str


class PrioritizeGapsRequest(BaseModel):
    focus_mode: str = Field("default", description="'default', 'top3', 'quick_wins', 'core_blockers'")
    effort_sensitivity: float = Field(1.0, ge=0.2, le=3.0)
    leverage_weight: float = Field(1.0, ge=0.5, le=2.0)


class CompareRolesRequest(BaseModel):
    role_ids: List[str] = Field(..., min_length=2, max_length=3, description="2 or 3 role IDs to compare")


# ==============================================================================
# 1. CURATED ROLE INITIALIZATION HELPER
# ==============================================================================

CURATED_ROLES_SEED = [
    {
        "role_id": "role-ai-engineer-entry",
        "version": "v2026.1",
        "title": "AI Engineer",
        "seniority": "Entry Level",
        "context": "Product & GenAI Systems",
        "description": "Engineers responsible for building production AI applications, prompt pipelines, RAG stores, and wrapping models into web endpoints.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from 420 verified AI Engineer openings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Production code repositories demonstrating async endpoints, clean error handling, and test fixtures.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-api-integration",
                "canonical_name": "API Integration & Messaging",
                "category": "Software Engineering",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "REST or GraphQL API endpoints, webhook consumption, and client retry handlers.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-machine-learning",
                "canonical_name": "Machine Learning (Supervised)",
                "category": "AI & Machine Learning",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Codebase commits showing training routines, feature engineering pipelines, and evaluation benchmarking.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-fastapi",
                "canonical_name": "FastAPI Web Framework",
                "category": "Backend Engineering",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "FastAPI routes, Pydantic schemas, dependency injection, and middleware.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-docker",
                "canonical_name": "Docker & Containerization",
                "category": "DevOps & Cloud",
                "requirement_type": "supporting",
                "importance": "medium",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Dockerfile definitions, multi-stage builds, and container registry deployments.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-system-architecture",
                "canonical_name": "Distributed System Architecture",
                "category": "Architecture",
                "requirement_type": "differentiating",
                "importance": "medium",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Architecture diagrams and system design RFCs.",
                "status": "mapped",
            },
        ],
    },
    {
        "role_id": "role-ml-engineer-entry",
        "version": "v2026.1",
        "title": "Machine Learning Engineer",
        "seniority": "Entry Level",
        "context": "Applied Model Training & Pipelines",
        "description": "Focuses on operationalizing model training, feature stores, experiment tracking, loss optimization, and continuous inference benchmarks.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from 180 ML postings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Modular Python tooling and vectorized NumPy/Pandas pipelines.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-machine-learning",
                "canonical_name": "Machine Learning (Supervised)",
                "category": "AI & Machine Learning",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Production hyperparameter tuning, cross-validation, and drift metrics.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-data-analysis",
                "canonical_name": "Data & Telemetry Analysis",
                "category": "Data & Analytics",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Large-scale exploratory data analysis and feature engineering.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-deep-learning",
                "canonical_name": "Deep Learning Foundations",
                "category": "AI & Machine Learning",
                "requirement_type": "supporting",
                "importance": "medium",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Neural architectures, loss backprop, and GPU training scripts.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-docker",
                "canonical_name": "Docker & Containerization",
                "category": "DevOps & Cloud",
                "requirement_type": "supporting",
                "importance": "medium",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Containerized model serving and reproducibility manifests.",
                "status": "mapped",
            },
        ],
    },
    {
        "role_id": "role-backend-developer-entry",
        "version": "v2026.1",
        "title": "Backend Developer",
        "seniority": "Entry Level",
        "context": "Distributed Services & APIs",
        "description": "Designs performant APIs, orchestrates database connections, implements message queues, and manages automated testing and container deployment.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from 310 backend postings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Production asynchronous Python microservices and clean error handling.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-api-integration",
                "canonical_name": "API Integration & Messaging",
                "category": "Software Engineering",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "REST/GraphQL endpoints, webhook dispatchers, and worker queues.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-fastapi",
                "canonical_name": "FastAPI Web Framework",
                "category": "Backend Engineering",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "FastAPI dependency injection, Pydantic schemas, and endpoint tests.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-docker",
                "canonical_name": "Docker & Containerization",
                "category": "DevOps & Cloud",
                "requirement_type": "supporting",
                "importance": "medium",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Docker container builds and local multi-service composition.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-system-architecture",
                "canonical_name": "Distributed System Architecture",
                "category": "Architecture",
                "requirement_type": "supporting",
                "importance": "medium",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Relational schema design and decoupled service communication.",
                "status": "mapped",
            },
        ],
    },
    {
        "role_id": "role-mlops-engineer-mid",
        "version": "v2026.1",
        "title": "MLOps Engineer",
        "seniority": "Mid Level",
        "context": "Model Deployment & Infrastructure",
        "description": "Specialists managing model training orchestration, registry versioning, live inference observability, and feature stores.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Production Python tooling and pipelines.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-docker",
                "canonical_name": "Docker & Containerization",
                "category": "DevOps & Cloud",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Containerized GPU execution environments.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-kubernetes",
                "canonical_name": "Kubernetes Cluster Management",
                "category": "DevOps & Cloud",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "K8s manifests and deployment configurations.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-system-architecture",
                "canonical_name": "Distributed System Architecture",
                "category": "Architecture",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "High-throughput serving architecture.",
                "status": "mapped",
            },
        ],
    },
]

_CURATED_ROLES_SEEDED = False


def ensure_curated_roles_seeded(db: Session):
    global _CURATED_ROLES_SEEDED
    if _CURATED_ROLES_SEEDED:
        return
    try:
        count = db.query(RoleDemandModelRecord).filter(
            RoleDemandModelRecord.source_type == "curated_model",
            RoleDemandModelRecord.owner_user_id == None,
        ).count()
        if count >= len(CURATED_ROLES_SEED):
            _CURATED_ROLES_SEEDED = True
            return

        for role_data in CURATED_ROLES_SEED:
            existing = db.query(RoleDemandModelRecord).filter(
                RoleDemandModelRecord.role_id == role_data["role_id"],
                RoleDemandModelRecord.version == role_data["version"],
                RoleDemandModelRecord.owner_user_id == None,
            ).first()
            if not existing:
                new_curated = RoleDemandModelRecord(
                    role_id=role_data["role_id"],
                    version=role_data["version"],
                    title=role_data["title"],
                    seniority=role_data["seniority"],
                    context=role_data["context"],
                    description=role_data["description"],
                    provenance=role_data["provenance"],
                    source_type="curated_model",
                    owner_user_id=None,
                    competencies=role_data["competencies"],
                    is_active=True,
                )
                db.add(new_curated)
        db.commit()
        _CURATED_ROLES_SEEDED = True
    except Exception as e:
        db.rollback()
        logger.warning(f"Note on seeding curated roles: {e}")


# ==============================================================================
# 2. JOB DISCOVERY & PROVIDER ORCHESTRATION ENDPOINTS
# ==============================================================================

@router.get("/jobs/status")
def get_job_providers_status():
    """
    Returns configured job providers, cost-aware limits, and health status.
    Never exposes API secrets.
    """
    return job_orchestrator.get_providers_status()


@router.post("/jobs/discover")
async def discover_jobs(
    payload: JobDiscoveryRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Cost-aware job discovery:
    Mode A: Discovers jobs matching user's strongest Skill Intelligence skills.
    Mode B: Discovers jobs for any explicitly specified target role.
    """
    user_uuid = uuid.UUID(user.id)
    effective_location = payload.country_code or payload.location
    try:
        result = await job_orchestrator.discover_jobs(
            db=db,
            user_id=user_uuid,
            mode=payload.mode,
            query=payload.query,
            location=effective_location,
            remote_only=payload.remote_only,
            limit=payload.limit,
        )
        return result
    except ProviderException as pe:
        logger.warning(f"Provider exception in discover_jobs: [{pe.provider}] {pe.message}")
        raise HTTPException(
            status_code=pe.status_code,
            detail={
                "error_category": pe.error_type.value,
                "provider": pe.provider,
                "message": pe.message,
            },
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Unhandled error in discover_jobs: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Job discovery service error: {str(e)}")


@router.get("/jobs/{job_id}")
def get_job_details(
    job_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves normalized job vacancy details from cache/database.
    """
    clean_id = job_id.replace("job-", "").replace("js-", "").replace("ts-", "").replace("fj-", "")
    try:
        j_uuid = uuid.UUID(clean_id)
        job = db.query(JobPostingRecord).filter(JobPostingRecord.id == j_uuid).first()
    except Exception:
        job = db.query(JobPostingRecord).filter(
            (JobPostingRecord.provider_job_id == clean_id) | (JobPostingRecord.canonical_dedupe_key == clean_id)
        ).first()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")

    return {
        "id": f"job-{job.id}",
        "provider": job.provider,
        "provider_job_id": job.provider_job_id,
        "title": job.title,
        "company_name": job.company_name,
        "location_text": job.location_text,
        "remote_status": job.remote_status,
        "employment_type": job.employment_type,
        "seniority": job.seniority,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "description": job.description,
        "job_url": job.job_url,
        "apply_url": job.apply_url,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "retrieved_at": job.retrieved_at.isoformat(),
        "extracted_requirements": job.extracted_requirements or [],
    }


@router.post("/jobs/{job_id}/extract")
def extract_job_requirements(
    job_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Extracts structured skill requirements and source spans from a discovered job.
    """
    clean_id = job_id.replace("job-", "").replace("js-", "").replace("ts-", "").replace("fj-", "")
    try:
        j_uuid = uuid.UUID(clean_id)
        job = db.query(JobPostingRecord).filter(JobPostingRecord.id == j_uuid).first()
    except Exception:
        job = db.query(JobPostingRecord).filter(
            (JobPostingRecord.provider_job_id == clean_id) | (JobPostingRecord.canonical_dedupe_key == clean_id)
        ).first()

    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Job {job_id} not found.")

    if not job.description or len(job.description.strip()) < 40:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Job description text is empty or too short for requirement extraction.")

    parsed = parser_service.parse_job_text(
        db=db,
        raw_text=job.description,
        title=job.title,
        company=job.company_name,
        seniority=job.seniority,
        source_url=job.job_url,
    )

    # Persist extracted requirements back to job record
    job.extracted_requirements = parsed["extracted_competencies"]
    db.commit()

    return parsed


# ==============================================================================
# 3. ROLE CATALOGUE & TARGET ROLE ENDPOINTS
# ==============================================================================

@router.get("/roles")
def list_role_catalogue(
    scope: str = Query("all", description="'all', 'catalogue', or 'saved_targets'"),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns role models with clean separation between Catalogue Benchmarks and User Saved Targets.
    Deduplicates any historical duplicate rows.
    """
    user_uuid = uuid.UUID(user.id)
    raw_roles = []

    try:
        ensure_curated_roles_seeded(db)
        query = db.query(RoleDemandModelRecord).filter(RoleDemandModelRecord.is_active == True)

        if scope == "catalogue":
            query = query.filter(RoleDemandModelRecord.owner_user_id == None)
        elif scope == "saved_targets":
            query = query.filter(RoleDemandModelRecord.owner_user_id == user_uuid)
        else:
            query = query.filter(
                (RoleDemandModelRecord.owner_user_id == None) | (RoleDemandModelRecord.owner_user_id == user_uuid)
            )

        raw_roles = query.order_by(RoleDemandModelRecord.source_type, RoleDemandModelRecord.title).all()
    except Exception as e:
        logger.warning(f"Database query failed in list_role_catalogue ({e}), serving memory fallback.")

    # Deduplicate custom roles by title and seniority for user
    seen_keys = set()
    deduped_roles = []
    for r in raw_roles:
        if not hasattr(r, "title"):
            continue
        dedupe_key = (r.title.strip().lower(), r.seniority.strip().lower(), r.owner_user_id == user_uuid)
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        deduped_roles.append(r)

    if not deduped_roles:
        if scope == "saved_targets":
            return []
        return [
            {
                "role_id": r["role_id"],
                "version": r["version"],
                "title": r["title"],
                "seniority": r["seniority"],
                "context": r["context"],
                "description": r["description"],
                "provenance": r["provenance"],
                "source_type": r["source_type"],
                "is_user_target": False,
                "competency_count": len(r.get("competencies") or []),
                "core_required_count": sum(1 for c in (r.get("competencies") or []) if c.get("requirement_type") == "core_required"),
                "supporting_count": sum(1 for c in (r.get("competencies") or []) if c.get("requirement_type") != "core_required"),
                "competencies": r.get("competencies") or [],
                "created_at": None,
                "updated_at": None,
            }
            for r in CURATED_ROLES_SEED
        ]

    return [
        {
            "role_id": r.role_id,
            "version": r.version,
            "title": r.title,
            "seniority": r.seniority,
            "context": r.context,
            "description": r.description,
            "provenance": r.provenance,
            "source_type": r.source_type,
            "is_user_target": r.owner_user_id == user_uuid,
            "competency_count": len(r.competencies or []),
            "core_required_count": sum(1 for c in (r.competencies or []) if c.get("requirement_type") == "core_required"),
            "supporting_count": sum(1 for c in (r.competencies or []) if c.get("requirement_type") != "core_required"),
            "competencies": r.competencies or [],
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "updated_at": r.updated_at.isoformat() if r.updated_at else None,
        }
        for r in deduped_roles
    ]


@router.post("/roles/{role_id}/save-to-targets")
def save_catalogue_role_to_targets(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Explicitly saves a benchmark from the role catalogue into the user's My Target Roles.
    """
    user_uuid = uuid.UUID(user.id)
    template = None
    try:
        template = db.query(RoleDemandModelRecord).filter(
            RoleDemandModelRecord.role_id == role_id,
            RoleDemandModelRecord.source_type == "curated_model",
        ).first()
    except Exception as e:
        logger.warning(f"Could not query DB for template ({e})")

    if not template:
        seed = next((r for r in CURATED_ROLES_SEED if r["role_id"] == role_id), None)
        if seed:
            template = type("obj", (), {
                "role_id": seed["role_id"],
                "version": seed["version"],
                "title": seed["title"],
                "seniority": seed["seniority"],
                "context": seed["context"],
                "description": seed["description"],
                "competencies": seed.get("competencies") or [],
            })()
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Catalogue role {role_id} not found.")

    existing = None
    try:
        existing = db.query(RoleDemandModelRecord).filter(
            RoleDemandModelRecord.owner_user_id == user_uuid,
            RoleDemandModelRecord.title == template.title,
            RoleDemandModelRecord.seniority == template.seniority,
            RoleDemandModelRecord.is_active == True,
        ).first()
    except Exception as e:
        logger.warning(f"Could not check existing target in DB ({e})")

    if existing:
        return {"status": "already_saved", "role_id": existing.role_id, "title": existing.title}

    target_id = f"role-target-{template.role_id[:20]}-{user_uuid.hex[:6]}"
    existing_saved = (
        db.query(RoleDemandModelRecord)
        .filter(
            RoleDemandModelRecord.role_id == target_id,
            RoleDemandModelRecord.owner_user_id == user_uuid,
        )
        .first()
    )
    if existing_saved:
        return {"status": "saved", "role_id": target_id, "title": template.title}

    new_saved = RoleDemandModelRecord(
        role_id=target_id,
        version=template.version,
        title=template.title,
        seniority=template.seniority,
        context=template.context,
        description=template.description,
        provenance=f"Saved from Catalogue benchmark ({template.role_id})",
        source_type="saved_target",
        owner_user_id=user_uuid,
        competencies=template.competencies,
        is_active=True,
    )
    try:
        db.add(new_saved)
        db.commit()
        db.refresh(new_saved)
    except Exception as e:
        db.rollback()
        logger.warning(f"Could not commit saved target to DB ({e})")

    return {"status": "saved", "role_id": target_id, "title": template.title}


@router.delete("/roles/{role_id}")
def delete_target_role(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Safely removes a saved custom target role for the authenticated user without deleting evidence or jobs.
    """
    user_uuid = uuid.UUID(user.id)
    try:
        role = (
            db.query(RoleDemandModelRecord)
            .filter(
                RoleDemandModelRecord.role_id == role_id,
                RoleDemandModelRecord.owner_user_id == user_uuid,
            )
            .first()
        )
        if not role:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Custom role '{role_id}' not found or not owned by user.")

        role.is_active = False

        target_rec = db.query(UserTargetRoleRecord).filter(
            UserTargetRoleRecord.owner_user_id == user_uuid,
            UserTargetRoleRecord.target_role_id == role_id,
        ).first()
        if target_rec:
            db.delete(target_rec)

        db.commit()
    except HTTPException:
        raise
    except Exception as e:
        logger.warning(f"Could not delete target role from DB ({e})")

    return {"status": "success", "message": f"Target role '{role_id}' removed."}


@router.get("/roles/{role_id}")
def get_role_demand_model(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Retrieves full versioned demand model and requirements for a specific role.
    """
    user_uuid = uuid.UUID(user.id)
    role = None

    try:
        ensure_curated_roles_seeded(db)
        role = (
            db.query(RoleDemandModelRecord)
            .filter(
                RoleDemandModelRecord.role_id == role_id,
                (RoleDemandModelRecord.owner_user_id == None) | (RoleDemandModelRecord.owner_user_id == user_uuid),
            )
            .first()
        )
    except Exception as e:
        logger.warning(f"Database query failed in get_role_demand_model ({e}), searching memory seed.")

    if not role:
        seed = next((r for r in CURATED_ROLES_SEED if r["role_id"] == role_id), None)
        if seed:
            return {
                "role_id": seed["role_id"],
                "version": seed["version"],
                "title": seed["title"],
                "seniority": seed["seniority"],
                "context": seed["context"],
                "description": seed["description"],
                "provenance": seed["provenance"],
                "source_type": seed["source_type"],
                "competencies": seed.get("competencies") or [],
                "created_at": None,
            }
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role model '{role_id}' not found.")

    return {
        "role_id": role.role_id,
        "version": role.version,
        "title": role.title,
        "seniority": role.seniority,
        "context": role.context,
        "description": role.description,
        "provenance": role.provenance,
        "source_type": role.source_type,
        "competencies": role.competencies or [],
        "created_at": role.created_at.isoformat() if role.created_at else None,
    }


@router.get("/target")
def get_active_target_role(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the authenticated user's active target role selection.
    """
    user_uuid = uuid.UUID(user.id)
    target = None

    try:
        target = db.query(UserTargetRoleRecord).filter(UserTargetRoleRecord.owner_user_id == user_uuid).first()
    except Exception as e:
        logger.warning(f"Database query failed in get_active_target_role ({e}), using default curated.")
    
    if not target:
        # Default to first curated role
        first_curated = CURATED_ROLES_SEED[0]
        return {
            "has_target": True,
            "target_role_id": first_curated["role_id"],
            "target_role_version": first_curated["version"],
            "role_title": first_curated["title"],
            "is_default": True,
        }

    return {
        "has_target": True,
        "target_role_id": target.target_role_id,
        "target_role_version": target.target_role_version,
        "role_title": target.role_title,
        "selected_at": target.selected_at.isoformat(),
        "is_default": False,
    }


@router.put("/target")
def set_active_target_role(
    payload: SetTargetRoleRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Sets and persists the authenticated user's active target role.
    """
    user_uuid = uuid.UUID(user.id)
    try:
        target = db.query(UserTargetRoleRecord).filter(UserTargetRoleRecord.owner_user_id == user_uuid).first()

        if target:
            target.target_role_id = payload.target_role_id
            target.target_role_version = payload.target_role_version
            target.role_title = payload.role_title
            target.selected_at = datetime.now(timezone.utc)
        else:
            new_target = UserTargetRoleRecord(
                owner_user_id=user_uuid,
                target_role_id=payload.target_role_id,
                target_role_version=payload.target_role_version,
                role_title=payload.role_title,
            )
            db.add(new_target)

        db.commit()
    except Exception as e:
        logger.warning(f"Could not persist active target role to DB ({e}), continuing with response.")

    logger.info(f"Updated active target role to {payload.target_role_id} for user {user.id}")
    return {"status": "success", "target_role_id": payload.target_role_id, "role_title": payload.role_title}


# ==============================================================================
# 4. MATCHING, GAPS, PRIORITIES, AND READINESS
# ==============================================================================

@router.get("/match/{role_id}")
def get_role_match(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Deterministic role match calculation using shared matching engine.
    """
    user_uuid = uuid.UUID(user.id)
    role = None

    try:
        ensure_curated_roles_seeded(db)
        role = (
            db.query(RoleDemandModelRecord)
            .filter(
                RoleDemandModelRecord.role_id == role_id,
                (RoleDemandModelRecord.owner_user_id == None) | (RoleDemandModelRecord.owner_user_id == user_uuid),
            )
            .first()
        )
    except Exception as e:
        logger.warning(f"Database unavailable for role match query ({e}), searching memory seed.")

    if not role:
        seed = next((r for r in CURATED_ROLES_SEED if r["role_id"] == role_id), None)
        if seed:
            role = type("obj", (), {
                "role_id": seed["role_id"],
                "version": seed["version"],
                "title": seed["title"],
                "seniority": seed["seniority"],
                "context": seed["context"],
                "description": seed["description"],
                "competencies": seed.get("competencies") or [],
            })()
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role model '{role_id}' not found.")

    res = matching_engine.evaluate_role_match(db, user_uuid, role)

    # Persist snapshot if DB is available
    try:
        snapshot = RoleMatchSnapshotRecord(
            owner_user_id=user_uuid,
            role_id=role.role_id,
            role_version=role.version,
            overall_match_score=res["overall_match_score"],
            required_coverage_score=res["required_coverage_score"],
            supporting_coverage_score=res["supporting_coverage_score"],
            readiness_index=res.get("readiness_index", 0.0),
            match_summary=res,
        )
        db.add(snapshot)
        db.commit()
    except Exception as e:
        logger.warning(f"Could not persist match snapshot to DB ({e})")

    return res


@router.get("/gaps/{role_id}")
def get_skill_gaps(
    role_id: str,
    gap_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Classifies 7 distinct gap types for the role match.
    """
    role_match = get_role_match(role_id, db, user)
    gaps = role_match.get("gaps", [])

    if gap_type and gap_type.strip() and gap_type != "all":
        gaps = [g for g in gaps if g.get("gap_type") == gap_type.strip()]

    return {
        "role_id": role_id,
        "role_title": role_match.get("role_title", role_id),
        "total_gaps": len(gaps),
        "gaps": gaps,
        "counts_by_type": {
            "skill_gap": sum(1 for g in gaps if g.get("gap_type") == "skill_gap"),
            "depth_gap": sum(1 for g in gaps if g.get("gap_type") == "depth_gap"),
            "evidence_gap": sum(1 for g in gaps if g.get("gap_type") == "evidence_gap"),
            "dependency_gap": sum(1 for g in gaps if g.get("gap_type") == "dependency_gap"),
        },
    }


@router.post("/priorities/{role_id}")
def prioritize_gaps(
    role_id: str,
    payload: PrioritizeGapsRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Ranks gaps by career leverage, effort, criticality, and project extension potential.
    """
    gaps_response = get_skill_gaps(role_id=role_id, db=db, user=user)
    gaps = gaps_response["gaps"]

    ranked = prioritization_service.prioritize_gaps(
        gaps=gaps,
        focus_mode=payload.focus_mode,
        effort_sensitivity=payload.effort_sensitivity,
        leverage_weight=payload.leverage_weight,
    )

    return {
        "role_id": role_id,
        "role_title": gaps_response["role_title"],
        "focus_mode": payload.focus_mode,
        "total_ranked": len(ranked),
        "ranked_gaps": ranked,
        "prioritized_gaps": ranked,
    }


@router.get("/readiness/{role_id}")
def get_career_readiness(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Synthesizes overall readiness score and blocker diagnoses without speculative hiring predictions.
    """
    role_match = get_role_match(role_id, db, user)
    core_blockers = [
        c for c in role_match.get("competency_matches", [])
        if c.get("requirement_type") == "core_required" and c.get("current_proficiency_numeric", 0) < c.get("expected_level_numeric", 3)
    ]
    return {
        "role_id": role_id,
        "role_title": role_match.get("role_title", role_id),
        "seniority": role_match.get("seniority", "Mid Level"),
        "readiness_index": role_match.get("readiness_index", role_match.get("overall_match_score", 0.0)),
        "readiness_tier": role_match.get("readiness_tier", "Early Stage"),
        "required_supported_pct": role_match.get("required_coverage_score", 0.0),
        "critical_blockers": core_blockers,
        "remediation_actions": role_match.get("gaps", []),
        "disclaimer": "This readiness assessment is an internal capability diagnostic and not an employment decision or hiring guarantee. It reflects verified evidence alignment for capability development.",
    }


@router.post("/compare")
def compare_roles(
    payload: CompareRolesRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Compares 2 or 3 roles against the user's current capability state in parallel.
    """
    results = []
    for rid in payload.role_ids:
        try:
            m = get_role_match(rid, db, user)
            results.append(m)
        except HTTPException:
            continue

    if len(results) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 valid roles must be specified for comparison.",
        )

    # Union of all competencies across compared roles
    all_competencies_map = {}
    for r in results:
        for c in r.get("competency_matches", []):
            cid = c.get("skill_id")
            if not cid:
                continue
            if cid not in all_competencies_map:
                all_competencies_map[cid] = {
                    "skill_id": cid,
                    "canonical_name": c.get("canonical_name", cid),
                    "category": c.get("category", "Technical"),
                    "current_proficiency": c.get("current_proficiency", "Not Established"),
                    "verification_status": c.get("verification_status", "unverified"),
                }

    comparison_competencies = []
    for cid, meta in all_competencies_map.items():
        role_specs = {}
        for r in results:
            match = next((c for c in r.get("competency_matches", []) if c.get("skill_id") == cid), None)
            role_specs[r["role_id"]] = {
                "expected_level": match.get("expected_level", "Not Required") if match else "Not Required",
                "requirement_type": match.get("requirement_type", "none") if match else "none",
                "match_status": match.get("match_status", "not_applicable") if match else "not_applicable",
                "has_gap": bool(match and match.get("gap_type")),
            }
        comparison_competencies.append({**meta, "role_evaluations": role_specs})

    compared_role_list = [
        {
            "role_id": r["role_id"],
            "role_title": r.get("role_title", r["role_id"]),
            "seniority": r.get("seniority", "Mid Level"),
            "overall_match_score": r.get("overall_match_score", 0.0),
            "required_coverage_score": r.get("required_coverage_score", 0.0),
            "supporting_coverage_score": r.get("supporting_coverage_score", 0.0),
        }
        for r in results
    ]

    return {
        "compared_role_ids": [r["role_id"] for r in results],
        "roles": compared_role_list,
        "compared_roles": compared_role_list,
        "competencies": comparison_competencies,
    }


# ==============================================================================
# 5. JOB DESCRIPTION PARSER & CUSTOM DEMAND MODELS
# ==============================================================================

@router.post("/parse-jd")
def parse_job_description(
    payload: ParseJobDescriptionRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Parses unstructured Job Description text into structured, versioned competencies.
    Extracts explicit requirement source spans and maps to canonical ontology.
    """
    parsed = parser_service.parse_job_text(
        db=db,
        raw_text=payload.raw_text,
        title=payload.job_title,
        company=payload.company_name,
        seniority=payload.seniority,
        context=payload.context,
        source_url=payload.source_url,
    )
    return parsed


@router.post("/roles/custom")
def save_custom_role(
    payload: SaveCustomRoleRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Persists an extracted/edited job description as a custom user-owned Role Demand Model.
    Deduplicates against any existing custom role with the same title and seniority for this user.
    """
    user_uuid = uuid.UUID(user.id)
    clean_title = payload.job_title.strip()
    slug = clean_title.lower().replace(" ", "-")[:24]

    # Check if user already has an active custom role with this title and seniority
    existing = (
        db.query(RoleDemandModelRecord)
        .filter(
            RoleDemandModelRecord.owner_user_id == user_uuid,
            RoleDemandModelRecord.title.ilike(clean_title),
            RoleDemandModelRecord.seniority == payload.seniority,
            RoleDemandModelRecord.is_active == True,
        )
        .first()
    )

    if existing:
        existing.competencies = payload.extracted_competencies
        existing.context = payload.context or existing.context
        existing.description = f"Custom role extracted from job description for {payload.company_name or 'target employer'}."
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return {
            "status": "updated",
            "role_id": existing.role_id,
            "title": existing.title,
            "seniority": existing.seniority,
            "source_type": existing.source_type,
            "competency_count": len(existing.competencies or []),
        }

    clean_role_id = f"role-custom-{slug}-{uuid.uuid4().hex[:6]}"
    new_model = RoleDemandModelRecord(
        role_id=clean_role_id,
        version="v2026.custom.1",
        title=clean_title,
        seniority=payload.seniority,
        context=payload.context,
        description=f"Custom role extracted from job description for {payload.company_name or 'target employer'}.",
        provenance=f"Custom Job Parser (created by user on {datetime.now(timezone.utc).strftime('%Y-%m-%d')})",
        source_type="custom_parsed_job",
        owner_user_id=user_uuid,
        competencies=payload.extracted_competencies,
        is_active=True,
    )
    db.add(new_model)
    db.commit()
    db.refresh(new_model)

    logger.info(f"Created custom role model {new_model.role_id} for user {user.id}")

    return {
        "status": "created",
        "role_id": new_model.role_id,
        "title": new_model.title,
        "seniority": new_model.seniority,
        "source_type": new_model.source_type,
        "competency_count": len(new_model.competencies or []),
    }


# ==============================================================================
# 6. INTEGRATION HANDOFF TO DOMAIN 5 (LEARN & GROW)
# ==============================================================================

@router.get("/learn-grow-handoff/{role_id}")
def get_learn_grow_handoff(
    role_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns structured handoff JSON schema for downstream Learn & Grow domain.
    """
    user_uuid = uuid.UUID(user.id)
    role = None
    try:
        ensure_curated_roles_seeded(db)
        role = (
            db.query(RoleDemandModelRecord)
            .filter(
                RoleDemandModelRecord.role_id == role_id,
                (RoleDemandModelRecord.owner_user_id == None) | (RoleDemandModelRecord.owner_user_id == user_uuid),
            )
            .first()
        )
    except Exception as e:
        logger.warning(f"DB query failed in get_learn_grow_handoff ({e})")

    if not role:
        seed = next((r for r in CURATED_ROLES_SEED if r["role_id"] == role_id), None)
        if seed:
            role = type("obj", (), {
                "role_id": seed["role_id"],
                "version": seed["version"],
                "title": seed["title"],
                "seniority": seed["seniority"],
                "competencies": seed.get("competencies") or [],
            })()
        else:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role model '{role_id}' not found.")

    gaps_response = get_skill_gaps(role_id=role_id, db=db, user=user)
    prioritized = prioritization_service.prioritize_gaps(gaps_response["gaps"], focus_mode="default")

    handoff_items = []
    for rank, g in enumerate(prioritized, start=1):
        handoff_items.append({
            "skill_id": g["skill_id"],
            "canonical_name": g["canonical_name"],
            "expected_level": g["expected_level"],
            "gap_type": g["gap_type"],
            "priority_rank": rank,
            "priority_score": g["priority_score"],
            "recommended_action": g.get("recommended_action", ""),
            "recommended_project_seed": g.get("recommended_project_seed", ""),
        })

    return {
        "target_role_id": role.role_id,
        "target_role_title": role.title,
        "target_role_version": role.version,
        "matching_policy_version": "v2026.1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_gaps": len(handoff_items),
        "handoff_items": handoff_items,
    }


@router.post("/handoff/learn-grow")
def handoff_to_learn_and_grow(
    role_id: str = Query(..., description="Target role to generate remediation path for"),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Packages identified prioritized skill gaps and handoffs structured payload to
    Domain 5 (Learn & Grow) for automated diagnostic and roadmap generation.
    """
    user_uuid = uuid.UUID(user.id)
    gaps_response = get_skill_gaps(role_id=role_id, db=db, user=user)
    prioritized = prioritization_service.prioritize_gaps(gaps_response["gaps"], focus_mode="default")

    handoff_payload = {
        "user_id": str(user_uuid),
        "target_role_id": role_id,
        "target_role_title": gaps_response["role_title"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_gaps": len(prioritized),
        "prioritized_gaps": [
            {
                "gap_id": g["gap_id"],
                "skill_id": g["skill_id"],
                "canonical_name": g["canonical_name"],
                "gap_type": g["gap_type"],
                "requirement_type": g["requirement_type"],
                "importance": g["importance"],
                "expected_level": g["expected_level"],
                "current_supported_level": g["current_supported_level"],
                "priority_score": g["priority_score"],
                "recommended_action": g["recommended_action"],
                "recommended_project_seed": g["recommended_project_seed"],
            }
            for g in prioritized
        ],
    }

    logger.info(f"Handed off {len(prioritized)} prioritized gaps for role {role_id} to Domain 5")
    return {
        "status": "ready_for_curriculum_generation",
        "target_route": f"/app/learning/blueprints?role_id={role_id}",
        "handoff_payload": handoff_payload,
    }
