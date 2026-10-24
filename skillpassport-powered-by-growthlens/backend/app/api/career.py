import uuid
import asyncio
import re
from urllib.parse import urlparse
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.core.logging import get_logger
from backend.app.core.config import get_settings
from backend.app.core.exceptions import SSRFSecurityError
from backend.app.extraction.ssrf_validator import validate_url_safe
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
from backend.app.career.gap_explanation_service import gap_explanation_service

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
    limit: int = Field(50, ge=1, le=50, description="Maximum number of results to fetch (default: 50)")
    selected_skill_ids: Optional[List[str]] = Field(None, description="Selected canonical skill IDs for Mode A")
    selected_skills: Optional[List[Dict[str, Any]]] = Field(None, description="Detailed selected skills with proficiency, verification status, and evidence")


class ParseJobDescriptionRequest(BaseModel):
    raw_text: str = Field(..., min_length=40, description="Raw job description text")
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None
    context: Optional[str] = None
    source_url: Optional[str] = None


class ParseJobUrlRequest(BaseModel):
    url: str = Field(..., min_length=4, description="Public job posting URL to scrape and parse")
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = None
    context: Optional[str] = None


class BatchParseJobItem(BaseModel):
    item_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    input_type: str = Field("text", description="'text' or 'url'")
    url: Optional[str] = None
    raw_text: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    seniority: Optional[str] = "Mid Level"
    context: Optional[str] = None


class BatchParseJobRequest(BaseModel):
    items: List[BatchParseJobItem] = Field(..., max_length=50)

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
    is_primary: bool = True


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
    {
        "role_id": "role-cryptography-engineer-mid",
        "version": "v2026.1",
        "title": "Cryptography Engineer",
        "seniority": "Mid Level",
        "context": "Applied Cryptography & Zero-Knowledge",
        "description": "Designs and validates zero-knowledge circuits, elliptic-curve signature schemes, secure multiparty computation, and post-quantum cryptographic primitives.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from verified Cryptography & ZK openings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-zero-knowledge-proofs",
                "canonical_name": "Zero-Knowledge Proofs & SNARKs",
                "category": "Security & Cryptography",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "ZK circuit definitions (Circom/Halo2/Noir), constraint optimizations, and proof verification benchmarks.",
                "status": "mapped",
                "prerequisite_skill_ids": ["skill-number-theory", "skill-cryptography-foundations"],
            },
            {
                "skill_id": "skill-elliptic-curve-cryptography",
                "canonical_name": "Elliptic Curve & Applied Cryptography",
                "category": "Security & Cryptography",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Implementation of BLS/Ed25519 signatures, pairing cryptography, and constant-time arithmetic primitives.",
                "status": "mapped",
                "prerequisite_skill_ids": ["skill-number-theory"],
            },
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Cryptographic simulation tooling, protocol prototyping, and test vectors.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-system-architecture",
                "canonical_name": "Distributed System Architecture",
                "category": "Architecture",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Decentralized state verification architecture, consensus protocol integration, and key management systems.",
                "status": "mapped",
            },
        ],
    },
    {
        "role_id": "role-llm-security-engineer-mid",
        "version": "v2026.1",
        "title": "LLM Security Engineer",
        "seniority": "Mid Level",
        "context": "LLM Red Teaming, Prompt Injection & Guardrails",
        "description": "Specializes in foundation model adversarial robustness, prompt injection mitigation, jailbreak auditing, alignment verification, and runtime defense guardrails.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from verified AI Security openings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-llm-security",
                "canonical_name": "LLM Red Teaming & Prompt Defense",
                "category": "AI Security",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Adversarial test harness reports, prompt injection attack taxonomy benchmarks, and output sanitizer implementations.",
                "status": "mapped",
                "prerequisite_skill_ids": ["skill-machine-learning", "skill-python"],
            },
            {
                "skill_id": "skill-ai-safety-guardrails",
                "canonical_name": "AI Safety & Guardrail Architecture",
                "category": "AI Governance",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Llama Guard/NeMo Guardrails deployment, semantic routing rules, and policy evaluation pipelines.",
                "status": "mapped",
                "prerequisite_skill_ids": ["skill-python"],
            },
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Production security middleware, token inspection hooks, and automated evaluation suites.",
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
                "evidence_expectation": "Secure proxy gateway endpoints, streaming response inspection, and auth enforcement.",
                "status": "mapped",
                "prerequisite_skill_ids": ["skill-python"],
            },
        ],
    },
    {
        "role_id": "role-dfir-specialist-mid",
        "version": "v2026.1",
        "title": "DFIR Specialist",
        "seniority": "Mid Level",
        "context": "Digital Forensics & Incident Response",
        "description": "Investigates cyber intrusions, analyzes disk/memory forensic artifacts, dissects malware behavior, and formulates containment and eradication strategies.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from verified Incident Response openings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-digital-forensics",
                "canonical_name": "Digital Forensics & Memory Analysis",
                "category": "Cybersecurity",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Timeline reconstruction, Volatility memory triage dumps, and file system artifact analysis reports.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-incident-response",
                "canonical_name": "Incident Response & Threat Containment",
                "category": "Cybersecurity",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Incident post-mortem reports, indicator of compromise (IoC) rule authoring, and forensic playbook automation.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-malware-analysis",
                "canonical_name": "Malware Triage & Reverse Engineering",
                "category": "Cybersecurity",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Static binary inspection, dynamic sandbox detonation analysis, and YARA signature definitions.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Automated log ingestion scripts, SIEM query automation, and evidence collection utilities.",
                "status": "mapped",
            },
        ],
    },
    {
        "role_id": "role-penetration-tester-mid",
        "version": "v2026.1",
        "title": "Penetration Tester",
        "seniority": "Mid Level",
        "context": "Offensive Security & CTF Development",
        "description": "Simulates adversary tradecraft across web applications, network perimeters, and cloud environments to uncover vulnerabilities and demonstrate exploit paths.",
        "provenance": "GrowthLens Curated Industry Benchmark v2026.1 (synthesized from verified Offensive Security openings)",
        "source_type": "curated_model",
        "competencies": [
            {
                "skill_id": "skill-penetration-testing",
                "canonical_name": "Web & Network Penetration Testing",
                "category": "Offensive Security",
                "requirement_type": "core_required",
                "importance": "critical",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Defensible penetration testing assessment reports, vulnerability validation write-ups, and remediations.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-exploit-development",
                "canonical_name": "Vulnerability Research & PoC Exploits",
                "category": "Offensive Security",
                "requirement_type": "core_required",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Proof-of-concept exploit scripts, privilege escalation chains, and security advisory contributions.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-application-security",
                "canonical_name": "Application Security & DevSecOps",
                "category": "Security Engineering",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Practitioner",
                "expected_level_numeric": 3,
                "evidence_expectation": "Threat modeling documents, SAST/DAST automated pipeline checks, and authentication flaw analysis.",
                "status": "mapped",
            },
            {
                "skill_id": "skill-python",
                "canonical_name": "Python Engineering",
                "category": "Programming",
                "requirement_type": "supporting",
                "importance": "high",
                "expected_level": "Working",
                "expected_level_numeric": 2,
                "evidence_expectation": "Custom offensive tooling, network protocol fuzzers, and scanner extensions.",
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
            selected_skill_ids=payload.selected_skill_ids,
            selected_skills=payload.selected_skills,
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
        location=job.location_text,
        employment_type=job.employment_type,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        salary_currency=job.salary_currency,
        raw_metadata=job.raw_source_metadata,
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
    if not role and get_settings().app_env in ("development", "test"):
        try:
            role = db.query(RoleDemandModelRecord).filter(RoleDemandModelRecord.role_id == role_id).first()
        except Exception:
            pass

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
        return {
            "has_target": False,
            "target_role_id": None,
            "target_role_version": None,
            "role_title": None,
            "is_default": False,
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

@router.post("/target-role")
def save_target_role(
    payload: SetTargetRoleRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Dedicated endpoint fulfilling CAREER_INTELLIGENCE_LEARN_GROW_INTEGRATION_HANDOFF Section 7.2.
    Persists target role to user_target_roles table.
    """
    return set_active_target_role(payload=payload, db=db, user=user)


@router.delete("/target")
def clear_active_target_role(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Clears the authenticated user's active target role.
    """
    user_uuid = uuid.UUID(user.id)
    try:
        db.query(UserTargetRoleRecord).filter(UserTargetRoleRecord.owner_user_id == user_uuid).delete()
        db.commit()
    except Exception as e:
        logger.warning(f"Could not delete active target role from DB ({e})")

    logger.info(f"Cleared active target role for user {user.id}")
    return {
        "status": "cleared",
        "has_target": False,
        "target_role_id": None,
        "role_title": None,
    }


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
    if not role and get_settings().app_env in ("development", "test"):
        try:
            role = db.query(RoleDemandModelRecord).filter(RoleDemandModelRecord.role_id == role_id).first()
        except Exception:
            pass

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

    # Persist or update snapshot if DB is available
    try:
        # Build enriched match_summary ensuring Section 7.3 required fields
        enriched_match_summary = {k: v for k, v in res.items() if k != "gap_explanations"}
        enriched_match_summary["match_score"] = float(res.get("overall_match_score", 0.0))
        enriched_match_summary["core_gaps"] = [g.get("canonical_name", g.get("skill_id")) for g in res.get("gaps", []) if g.get("requirement_type") == "core_required"]
        enriched_match_summary["secondary_gaps"] = [g.get("canonical_name", g.get("skill_id")) for g in res.get("gaps", []) if g.get("requirement_type") != "core_required"]
        enriched_match_summary["missing_competencies"] = [
            {
                "skill_id": g.get("skill_id"),
                "canonical_skill_id": g.get("canonical_skill_id", g.get("skill_id")),
                "skill_name": g.get("canonical_name", g.get("skill_id")),
                "required_proficiency": g.get("expected_level", "Practitioner"),
                "current_proficiency": g.get("current_supported_level", "Not Established"),
                "is_core": g.get("requirement_type") == "core_required",
            }
            for g in res.get("gaps", [])
        ]

        snapshot = (
            db.query(RoleMatchSnapshotRecord)
            .filter(
                RoleMatchSnapshotRecord.owner_user_id == user_uuid,
                RoleMatchSnapshotRecord.role_id == role.role_id,
            )
            .order_by(RoleMatchSnapshotRecord.calculated_at.desc())
            .first()
        )
        if snapshot:
            snapshot.overall_match_score = res["overall_match_score"]
            snapshot.required_coverage_score = res["required_coverage_score"]
            snapshot.supporting_coverage_score = res["supporting_coverage_score"]
            snapshot.readiness_index = float(res.get("readiness_index") if res.get("readiness_index") is not None else 0.0)
            snapshot.match_summary = enriched_match_summary
            snapshot.gaps_data = res.get("gaps", [])
            snapshot.readiness_data = res.get("readiness", {})
            snapshot.priorities_data = res.get("priorities", res.get("gaps", []))
            snapshot.handoff_data = res.get("handoff", [])
        else:
            snapshot = RoleMatchSnapshotRecord(
                owner_user_id=user_uuid,
                role_id=role.role_id,
                role_version=role.version,
                overall_match_score=res["overall_match_score"],
                required_coverage_score=res["required_coverage_score"],
                supporting_coverage_score=res["supporting_coverage_score"],
                readiness_index=float(res.get("readiness_index") if res.get("readiness_index") is not None else 0.0),
                match_summary=enriched_match_summary,
                gaps_data=res.get("gaps", []),
                readiness_data=res.get("readiness", {}),
                priorities_data=res.get("priorities", res.get("gaps", [])),
                handoff_data=res.get("handoff", []),
            )
            db.add(snapshot)
        db.commit()
        if snapshot and hasattr(snapshot, "id") and snapshot.id:
            res["snapshot_id"] = str(snapshot.id)
    except Exception as e:
        db.rollback()
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


@router.get("/gaps/{role_id}/explanations")
async def get_gap_explanations(
    role_id: str,
    force_refresh: bool = False,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Evidence-grounded 'Why' explanation engine powered by local Ollama (qwen3:8b).
    Explains exactly why each skill requirement did not achieve 100% proficiency coverage.
    """
    user_uuid = user.id if isinstance(user.id, uuid.UUID) else uuid.UUID(str(user.id))
    role_match = get_role_match(role_id, db, user)
    gaps = role_match.get("gaps", [])

    return await gap_explanation_service.explain_gaps(
        db=db,
        user_id=user_uuid,
        role_id=role_id,
        gaps=gaps,
        role_title=role_match.get("role_title", role_id),
        force_refresh=force_refresh,
    )


@router.post("/gaps/{role_id}/explain")
async def explain_role_gaps_post(
    role_id: str,
    force_refresh: bool = False,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    POST alias for explaining role gaps.
    """
    return await get_gap_explanations(
        role_id=role_id,
        force_refresh=force_refresh,
        db=db,
        user=user,
    )


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


@router.post("/parse-jd/url")
async def parse_job_description_from_url(
    payload: ParseJobUrlRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    SSRF-safe scraper and parser for public job posting URLs.
    Validates against private/loopback/metadata addresses, detects authentication barriers honestly,
    fetches HTML with strict timeout, strips markup, and feeds raw text to JobDescriptionParserService.
    """
    target_url = payload.url.strip() if payload.url else ""
    if not target_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid public URL is required.",
        )

    # 1. Enforce strict SSRF validation
    try:
        validation = validate_url_safe(target_url)
        cleaned_url = validation["cleaned_url"]
    except SSRFSecurityError as e:
        reason = e.details.get("reason", e.message)
        logger.warning(f"Blocked SSRF attempt for URL {target_url}: {reason}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security violation: Access to prohibited host or IP address blocked ({reason})",
        )
    except Exception as e:
        logger.warning(f"URL validation failed for {target_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid URL structure: {str(e)}",
        )

    # 2. Domain-level auth wall detection (e.g. LinkedIn, Indeed login barriers)
    domain_lower = urlparse(cleaned_url).netloc.lower()
    if any(d in domain_lower for d in ["linkedin.com", "indeed.com", "glassdoor.com", "ziprecruiter.com"]):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"The job posting host ({domain_lower}) enforces an authentication wall or anti-scraping policy. "
                "Automated ingestion cannot bypass login barriers. "
                "Please copy the job posting text and use the 'Paste Text' tab to parse it."
            ),
        )

    # 3. Asynchronously fetch public page with strict timeout and redirect restrictions
    try:
        headers = {
            "User-Agent": "SkillPassport-JobScraper/1.0 (Mozilla/5.0; compatible; CareerIntelligence/2026.1)",
            "Accept": "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        }
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True, max_redirects=3) as client:
            resp = await client.get(cleaned_url, headers=headers)

            final_url_lower = str(resp.url).lower()
            if any(w in final_url_lower for w in ["authwall", "login", "checkpoint", "challenge", "signin"]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The URL redirected to an authentication wall or login challenge. Please copy the job description text and use the 'Paste Text' tab.",
                )
            if resp.status_code in (401, 403, 999):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Access blocked by the host (HTTP {resp.status_code}). Please copy the job description text and use the 'Paste Text' tab.",
                )
            if resp.status_code >= 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to fetch content from URL (HTTP status code {resp.status_code})",
                )
            html_content = resp.text

            if any(w in html_content.lower() for w in ["authwall", "join linkedin to view", "sign in to view this job", "please enable javascript and cookies"]):
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="The page returned an authentication wall or challenge. Please copy the job description text and use the 'Paste Text' tab.",
                )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Connection to target URL timed out after 10 seconds.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"HTTP request failed for {cleaned_url}: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not retrieve webpage content: {str(e)}",
        )

    # 4. Strip HTML markup, scripts, and navigation
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "svg", "button", "iframe"]):
            tag.decompose()

        inferred_title = payload.job_title
        inferred_company = payload.company_name

        if not inferred_title:
            og_title = soup.find("meta", property="og:title")
            if og_title and og_title.get("content"):
                cand = og_title.get("content").strip()
                inferred_title = re.split(r"[-–|:]", cand)[0].strip()
            elif soup.title and soup.title.string:
                cand = soup.title.string.strip()
                inferred_title = re.split(r"[-–|:]", cand)[0].strip()
            elif soup.find("h1"):
                inferred_title = soup.find("h1").get_text().strip()

            if inferred_title and any(g in inferred_title.lower() for g in ["careers", "job search", "working at", "home", "welcome", "application"]):
                inferred_title = None

        if not inferred_company:
            og_site = soup.find("meta", property="og:site_name")
            if og_site and og_site.get("content"):
                inferred_company = og_site.get("content").strip()
            else:
                parts = domain_lower.replace("www.", "").split(".")
                if parts and len(parts[0]) > 2:
                    inferred_company = parts[0].capitalize()

        text = soup.get_text(separator="\n")
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        cleaned_text = "\n".join(lines)
    except Exception as e:
        logger.error(f"HTML parsing failed for {cleaned_url}: {e}")
        cleaned_text = re.sub(r"<[^>]+>", " ", html_content)

    if len(cleaned_text) < 40:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="The target URL does not contain enough extractable job description text (minimum 40 characters required).",
        )

    # 5. Feed clean extracted text to parser_service
    parsed = parser_service.parse_job_text(
        db=db,
        raw_text=cleaned_text,
        title=inferred_title,
        company=inferred_company,
        seniority=payload.seniority,
        context=payload.context or f"Discovered via URL ({domain_lower})",
        source_url=cleaned_url,
    )
    return parsed


@router.post("/parse-jd/batch")
async def batch_parse_job_descriptions(
    payload: BatchParseJobRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Parses a batch of up to 50 jobs with bounded concurrency (5 concurrent workers).
    Returns per-item results and aggregate success/failure statistics.
    """
    semaphore = asyncio.Semaphore(5)

    async def process_item(item: BatchParseJobItem) -> Dict[str, Any]:
        async with semaphore:
            try:
                if item.input_type == "url":
                    if not item.url or not item.url.strip():
                        return {"item_id": item.item_id, "status": "error", "error": "URL is missing"}
                    sub_req = ParseJobUrlRequest(
                        url=item.url.strip(),
                        job_title=item.job_title,
                        company_name=item.company_name,
                        seniority=item.seniority or "Mid Level",
                        context=item.context,
                    )
                    res = await parse_job_description_from_url(payload=sub_req, db=db, user=user)
                    return {"item_id": item.item_id, "status": "success", "data": res}
                else:
                    if not item.raw_text or len(item.raw_text.strip()) < 40:
                        return {"item_id": item.item_id, "status": "error", "error": "Text too short (< 40 characters)"}
                    res = parser_service.parse_job_text(
                        db=db,
                        raw_text=item.raw_text.strip(),
                        title=item.job_title,
                        company=item.company_name,
                        seniority=item.seniority or "Mid Level",
                        context=item.context,
                    )
                    return {"item_id": item.item_id, "status": "success", "data": res}
            except HTTPException as he:
                return {"item_id": item.item_id, "status": "error", "error": str(he.detail)}
            except Exception as e:
                return {"item_id": item.item_id, "status": "error", "error": str(e)}

    tasks = [process_item(item) for item in payload.items]
    results = await asyncio.gather(*tasks)

    success_count = sum(1 for r in results if r["status"] == "success")
    failed_count = sum(1 for r in results if r["status"] == "error")

    return {
        "total_requested": len(payload.items),
        "successful_count": success_count,
        "failed_count": failed_count,
        "results": results,
    }


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
    if not role and get_settings().app_env in ("development", "test"):
        try:
            role = db.query(RoleDemandModelRecord).filter(RoleDemandModelRecord.role_id == role_id).first()
        except Exception:
            pass

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
    Persists evaluation snapshot in RoleMatchSnapshotRecord and returns snapshot reference.
    """
    user_uuid = uuid.UUID(user.id)
    role_match = get_role_match(role_id=role_id, db=db, user=user)
    gaps_data = role_match.get("gaps", [])
    prioritized = prioritization_service.prioritize_gaps(gaps_data, focus_mode="default")
    readiness_data = role_match.get("readiness", {})

    role_title = role_match.get("role_title") or role_match.get("title") or "Target Role"
    role_version = role_match.get("role_version") or role_match.get("version") or "v2026.1"

    prioritized_gaps = [
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
            "recommended_action": g.get("recommended_action", ""),
            "recommended_project_seed": g.get("recommended_project_seed", ""),
        }
        for g in prioritized
    ]

    snapshot_uuid = uuid.uuid4()
    # Attempt to persist RoleMatchSnapshotRecord
    try:
        snapshot = RoleMatchSnapshotRecord(
            id=snapshot_uuid,
            owner_user_id=user_uuid,
            role_id=role_id,
            role_version=role_version,
            overall_match_score=float(role_match.get("overall_match_score", 0.0)),
            required_coverage_score=float(role_match.get("required_coverage_score", 0.0)),
            supporting_coverage_score=float(role_match.get("supporting_coverage_score", 0.0)),
            readiness_index=float(role_match.get("readiness_index") or 0.0),
            match_summary=role_match,
            gaps_data=gaps_data,
            readiness_data=readiness_data,
            priorities_data=prioritized_gaps,
            handoff_data=prioritized_gaps,
        )
        db.add(snapshot)
        db.commit()
        db.refresh(snapshot)
        snapshot_id_str = str(snapshot.id)
        snapshot_version = snapshot.role_version
    except Exception as e:
        logger.warning(f"Could not persist handoff snapshot to DB ({e}), using generated UUID.")
        snapshot_id_str = str(snapshot_uuid)
        snapshot_version = role_version

    handoff_payload = {
        "user_id": str(user_uuid),
        "target_role_id": role_id,
        "target_role_title": role_title,
        "target_role_version": snapshot_version,
        "snapshot_id": snapshot_id_str,
        "snapshot_version": snapshot_version,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_gaps": len(prioritized_gaps),
        "prioritized_gaps": prioritized_gaps,
    }

    logger.info(f"Handed off {len(prioritized)} prioritized gaps for role {role_id} to Domain 5 (snapshot {snapshot_id_str})")
    return {
        "status": "ready_for_curriculum_generation",
        "target_route": f"/app/learning/blueprints?role_id={role_id}&snapshot_id={snapshot_id_str}",
        "snapshot_id": snapshot_id_str,
        "snapshot_version": snapshot_version,
        "handoff_payload": handoff_payload,
    }
