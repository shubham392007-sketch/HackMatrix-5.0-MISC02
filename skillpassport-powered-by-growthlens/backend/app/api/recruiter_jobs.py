import uuid
import hashlib
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.core.logging import get_logger
from backend.app.models.career import JobPostingRecord
from backend.app.models.recruiter import CandidateShareInvitation, EmployerOrganization
from backend.app.models.sharing import RecruiterMessage
from backend.app.models.user_profile import UserProfile
from backend.app.api.recruiter_dependencies import (
    get_current_recruiter_context,
    RecruiterContext,
)

logger = get_logger("api.recruiter_jobs")
router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal - Job Management & Dashboard"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class RequirementItem(BaseModel):
    name: str = Field(..., min_length=1)
    category: Optional[str] = "Technical"
    importance: Optional[str] = "required"  # required, preferred, nice_to_have
    expected_level: Optional[str] = "Practitioner"
    expected_level_numeric: Optional[int] = 3
    evidence_expectation: Optional[str] = None


class CreateJobRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=10)
    location_text: Optional[str] = "Remote"
    remote_status: Optional[str] = "remote"  # remote, hybrid, on_site
    employment_type: Optional[str] = "full_time"  # full_time, part_time, contract, internship
    seniority: Optional[str] = "Mid Level"  # entry, mid, senior, lead, executive
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = "USD"
    salary_period: Optional[str] = "yearly"  # yearly, monthly, hourly
    status: str = Field("published", description="'draft', 'published'")
    extracted_requirements: List[RequirementItem] = Field(default_factory=list)
    public_recruiter_name: Optional[str] = None
    public_recruiter_email: Optional[str] = None
    job_url: Optional[str] = None
    apply_url: Optional[str] = None


class UpdateJobRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location_text: Optional[str] = None
    remote_status: Optional[str] = None
    employment_type: Optional[str] = None
    seniority: Optional[str] = None
    salary_min: Optional[float] = None
    salary_max: Optional[float] = None
    salary_currency: Optional[str] = None
    salary_period: Optional[str] = None
    status: Optional[str] = None  # draft, published, paused, closed
    extracted_requirements: Optional[List[RequirementItem]] = None
    public_recruiter_name: Optional[str] = None
    public_recruiter_email: Optional[str] = None
    job_url: Optional[str] = None
    apply_url: Optional[str] = None


# ==============================================================================
# 1. EMPLOYER DASHBOARD OVERVIEW
# ==============================================================================

@router.get("/dashboard/overview")
def get_recruiter_dashboard_overview(
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Returns live metrics and candidate pipeline overview for the recruiter's organization.
    Strictly isolated to authorized organization scope with real persisted data.
    """
    org_id = ctx.org_id
    user_id = ctx.user_id

    # 1. Job statistics
    all_jobs = db.query(JobPostingRecord).filter(
        JobPostingRecord.organization_id == org_id
    ).all()

    active_jobs_count = sum(1 for j in all_jobs if j.status == "published")
    draft_jobs_count = sum(1 for j in all_jobs if j.status == "draft")
    paused_jobs_count = sum(1 for j in all_jobs if j.status == "paused")
    closed_jobs_count = sum(1 for j in all_jobs if j.status == "closed")

    # 2. Candidate shares for this organization
    candidate_shares = (
        db.query(CandidateShareInvitation)
        .filter(
            (CandidateShareInvitation.organization_id == org_id)
            | (CandidateShareInvitation.recruiter_user_id == user_id)
            | (CandidateShareInvitation.recruiter_email == ctx.user.email)
        )
        .order_by(desc(CandidateShareInvitation.created_at))
        .all()
    )

    total_shares_count = len(candidate_shares)
    new_candidates_count = sum(1 for s in candidate_shares if s.pipeline_status == "new")
    reviewing_count = sum(1 for s in candidate_shares if s.pipeline_status == "reviewing")
    shortlisted_count = sum(1 for s in candidate_shares if s.pipeline_status == "shortlisted")
    interview_count = sum(1 for s in candidate_shares if s.pipeline_status == "interview")

    # 3. Unread messages
    # Count recruiter_messages where recipient is this recruiter or part of their candidate shares
    share_ids = [s.share_link_id for s in candidate_shares]
    unread_messages_count = 0
    if share_ids:
        unread_messages_count = (
            db.query(RecruiterMessage)
            .filter(
                RecruiterMessage.share_link_id.in_(share_ids),
                RecruiterMessage.is_read == False,
                RecruiterMessage.sender_user_id != user_id,
            )
            .count()
        )

    # 4. Recent candidate shares (latest 6)
    recent_shares_data = []
    job_title_map = {j.id: j.title for j in all_jobs}

    for s in candidate_shares[:6]:
        # Fetch candidate profile
        cand_profile = db.query(UserProfile).filter(UserProfile.id == s.candidate_user_id).first()
        cand_name = (
            cand_profile.display_name
            if cand_profile and cand_profile.display_name
            else "Candidate"
        )
        job_title = job_title_map.get(s.job_id) if s.job_id else "General Application"

        recent_shares_data.append({
            "invitation_id": str(s.id),
            "share_link_id": str(s.share_link_id),
            "candidate_id": str(s.candidate_user_id),
            "candidate_name": cand_name,
            "candidate_email": cand_profile.email if cand_profile else "Confidential",
            "job_id": str(s.job_id) if s.job_id else None,
            "job_title": job_title,
            "pipeline_status": s.pipeline_status,
            "delivery_status": s.delivery_status,
            "is_read": s.is_read_by_recruiter,
            "candidate_message": s.candidate_message,
            "created_at": s.created_at.isoformat(),
        })

    # 5. Recent jobs
    recent_jobs_data = [
        {
            "id": f"job-{j.id}",
            "job_uuid": str(j.id),
            "title": j.title,
            "status": j.status,
            "remote_status": j.remote_status,
            "location_text": j.location_text,
            "employment_type": j.employment_type,
            "seniority": j.seniority,
            "posted_at": j.posted_at.isoformat() if j.posted_at else None,
            "created_at": j.created_at.isoformat(),
            "requirements_count": len(j.extracted_requirements or []),
            "applications_count": sum(1 for s in candidate_shares if s.job_id == j.id),
        }
        for j in all_jobs[:6]
    ]

    return {
        "organization": {
            "id": str(ctx.organization.id),
            "name": ctx.organization.name,
            "slug": ctx.organization.slug,
            "website": ctx.organization.website,
            "location": ctx.organization.location,
            "is_verified": ctx.organization.is_verified,
        },
        "recruiter": {
            "user_id": str(ctx.user_id),
            "name": ctx.membership.public_contact_name or ctx.user.email.split("@")[0],
            "email": ctx.user.email,
            "role": ctx.membership.role,
            "job_title": ctx.membership.job_title,
        },
        "metrics": {
            "active_jobs_count": active_jobs_count,
            "draft_jobs_count": draft_jobs_count,
            "paused_jobs_count": paused_jobs_count,
            "closed_jobs_count": closed_jobs_count,
            "total_jobs_count": len(all_jobs),
            "candidate_shares_count": total_shares_count,
            "new_candidates_count": new_candidates_count,
            "reviewing_candidates_count": reviewing_count,
            "shortlisted_candidates_count": shortlisted_count,
            "interview_candidates_count": interview_count,
            "unread_messages_count": unread_messages_count,
        },
        "recent_shares": recent_shares_data,
        "recent_jobs": recent_jobs_data,
    }


# ==============================================================================
# 2. JOB POSTING CRUD ENDPOINTS
# ==============================================================================

@router.get("/jobs")
def list_recruiter_jobs(
    status_filter: Optional[str] = Query("all", alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Lists jobs belonging to the recruiter's organization.
    Allows filtering by status and searching by title/description.
    """
    q = db.query(JobPostingRecord).filter(
        JobPostingRecord.organization_id == ctx.org_id
    )

    if status_filter and status_filter.lower() != "all":
        q = q.filter(JobPostingRecord.status == status_filter.lower())

    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(
            (JobPostingRecord.title.ilike(term))
            | (JobPostingRecord.description.ilike(term))
            | (JobPostingRecord.location_text.ilike(term))
        )

    total_count = q.count()
    jobs = (
        q.order_by(desc(JobPostingRecord.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Calculate applicant counts per job
    job_ids = [j.id for j in jobs]
    applicant_counts = {}
    if job_ids:
        counts = (
            db.query(
                CandidateShareInvitation.job_id,
                func.count(CandidateShareInvitation.id),
            )
            .filter(CandidateShareInvitation.job_id.in_(job_ids))
            .group_by(CandidateShareInvitation.job_id)
            .all()
        )
        applicant_counts = {job_id: count for job_id, count in counts}

    results = []
    for j in jobs:
        results.append({
            "id": f"job-{j.id}",
            "job_uuid": str(j.id),
            "title": j.title,
            "company_name": j.company_name,
            "location_text": j.location_text,
            "remote_status": j.remote_status,
            "employment_type": j.employment_type,
            "seniority": j.seniority,
            "salary_min": j.salary_min,
            "salary_max": j.salary_max,
            "salary_currency": j.salary_currency,
            "salary_period": j.salary_period,
            "description": j.description,
            "status": j.status,
            "posted_at": j.posted_at.isoformat() if j.posted_at else None,
            "created_at": j.created_at.isoformat(),
            "updated_at": j.updated_at.isoformat() if j.updated_at else None,
            "public_recruiter_name": j.public_recruiter_name,
            "public_recruiter_email": j.public_recruiter_email,
            "requirements": j.extracted_requirements or [],
            "requirements_count": len(j.extracted_requirements or []),
            "applications_count": applicant_counts.get(j.id, 0),
        })

    return {
        "total": total_count,
        "offset": offset,
        "limit": limit,
        "jobs": results,
    }


@router.post("/jobs", status_code=status.HTTP_201_CREATED)
def create_job_posting(
    req: CreateJobRequest,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Creates a new job vacancy for the employer's organization.
    Canonicalizes taxonomy requirements and attaches verified recruiter contact info.
    """
    now = datetime.now(timezone.utc)
    new_id = uuid.uuid4()
    provider_job_id = str(new_id)

    # Canonical dedupe key ensures idempotent uniqueness
    clean_title = req.title.strip().lower()
    clean_company = ctx.organization.name.strip().lower()
    dedupe_str = f"{clean_title}|{clean_company}|{req.location_text or ''}|{str(ctx.org_id)}"
    dedupe_key = hashlib.sha256(dedupe_str.encode("utf-8")).hexdigest()[:32]

    # Normalize requirements list to dicts
    formatted_requirements = [
        r.model_dump() if hasattr(r, "model_dump") else dict(r)
        for r in req.extracted_requirements
    ]

    # Resolve public recruiter contact info
    pub_name = (
        req.public_recruiter_name.strip()
        if req.public_recruiter_name
        else ctx.membership.public_contact_name
        or ctx.user.email.split("@")[0]
    )
    pub_email = (
        req.public_recruiter_email.strip()
        if req.public_recruiter_email
        else ctx.membership.public_contact_email
        or ctx.user.email
    )

    job_status = req.status.lower()
    if job_status not in ("draft", "published"):
        job_status = "published"

    posted_at = now if job_status == "published" else None

    job = JobPostingRecord(
        id=new_id,
        provider="recruiter_portal",
        provider_job_id=provider_job_id,
        canonical_dedupe_key=dedupe_key,
        title=req.title.strip(),
        company_name=ctx.organization.name.strip(),
        company_domain=ctx.organization.domain or (ctx.organization.website.replace("https://", "").replace("http://", "").split("/")[0] if ctx.organization.website else None),
        location_text=req.location_text.strip() if req.location_text else "Remote",
        remote_status=req.remote_status or "remote",
        employment_type=req.employment_type or "full_time",
        seniority=req.seniority or "Mid Level",
        salary_min=req.salary_min,
        salary_max=req.salary_max,
        salary_currency=req.salary_currency or "USD",
        salary_period=req.salary_period or "yearly",
        description=req.description.strip(),
        job_url=req.job_url,
        apply_url=req.apply_url,
        posted_at=posted_at,
        retrieved_at=now,
        is_stale=False,
        status=job_status,
        organization_id=ctx.org_id,
        recruiter_user_id=ctx.user_id,
        public_recruiter_name=pub_name,
        public_recruiter_email=pub_email,
        extracted_requirements=formatted_requirements,
        raw_source_metadata={
            "created_via": "recruiter_portal",
            "organization_name": ctx.organization.name,
            "created_by_user_id": str(ctx.user_id),
        },
        content_hash=hashlib.sha256(req.description.strip().encode("utf-8")).hexdigest(),
    )

    db.add(job)
    db.commit()
    db.refresh(job)

    logger.info(f"Recruiter {ctx.user.email} created job '{job.title}' (status={job.status}, id={job.id})")

    return {
        "success": True,
        "message": f"Job posting successfully created ({job.status}).",
        "job": {
            "id": f"job-{job.id}",
            "job_uuid": str(job.id),
            "title": job.title,
            "company_name": job.company_name,
            "status": job.status,
            "location_text": job.location_text,
            "remote_status": job.remote_status,
            "employment_type": job.employment_type,
            "seniority": job.seniority,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "created_at": job.created_at.isoformat(),
            "requirements": job.extracted_requirements,
            "public_recruiter_name": job.public_recruiter_name,
            "public_recruiter_email": job.public_recruiter_email,
        },
    }


@router.get("/jobs/{job_id}")
def get_recruiter_job_detail(
    job_id: str,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Returns full details for a specific organization job posting.
    Enforces organization-level authorization.
    """
    clean_id = job_id.replace("job-", "")
    try:
        j_uuid = uuid.UUID(clean_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job identifier format.",
        )

    job = db.query(JobPostingRecord).filter(
        JobPostingRecord.id == j_uuid,
        JobPostingRecord.organization_id == ctx.org_id,
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found in your organization.",
        )

    # Count candidate applications for this job
    app_count = (
        db.query(CandidateShareInvitation)
        .filter(CandidateShareInvitation.job_id == job.id)
        .count()
    )

    return {
        "id": f"job-{job.id}",
        "job_uuid": str(job.id),
        "title": job.title,
        "company_name": job.company_name,
        "location_text": job.location_text,
        "remote_status": job.remote_status,
        "employment_type": job.employment_type,
        "seniority": job.seniority,
        "salary_min": job.salary_min,
        "salary_max": job.salary_max,
        "salary_currency": job.salary_currency,
        "salary_period": job.salary_period,
        "description": job.description,
        "status": job.status,
        "posted_at": job.posted_at.isoformat() if job.posted_at else None,
        "created_at": job.created_at.isoformat(),
        "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        "public_recruiter_name": job.public_recruiter_name,
        "public_recruiter_email": job.public_recruiter_email,
        "requirements": job.extracted_requirements or [],
        "applications_count": app_count,
    }


@router.put("/jobs/{job_id}")
def update_recruiter_job(
    job_id: str,
    req: UpdateJobRequest,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Updates an existing organization job posting.
    Supports updating details, taxonomy requirements, and lifecycle status (draft, published, paused, closed).
    """
    clean_id = job_id.replace("job-", "")
    try:
        j_uuid = uuid.UUID(clean_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job identifier format.",
        )

    job = db.query(JobPostingRecord).filter(
        JobPostingRecord.id == j_uuid,
        JobPostingRecord.organization_id == ctx.org_id,
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found in your organization.",
        )

    now = datetime.now(timezone.utc)

    if req.title is not None:
        job.title = req.title.strip()
    if req.description is not None:
        job.description = req.description.strip()
        job.content_hash = hashlib.sha256(req.description.strip().encode("utf-8")).hexdigest()
    if req.location_text is not None:
        job.location_text = req.location_text.strip()
    if req.remote_status is not None:
        job.remote_status = req.remote_status
    if req.employment_type is not None:
        job.employment_type = req.employment_type
    if req.seniority is not None:
        job.seniority = req.seniority
    if req.salary_min is not None:
        job.salary_min = req.salary_min
    if req.salary_max is not None:
        job.salary_max = req.salary_max
    if req.salary_currency is not None:
        job.salary_currency = req.salary_currency
    if req.salary_period is not None:
        job.salary_period = req.salary_period
    if req.job_url is not None:
        job.job_url = req.job_url
    if req.apply_url is not None:
        job.apply_url = req.apply_url
    if req.public_recruiter_name is not None:
        job.public_recruiter_name = req.public_recruiter_name.strip()
    if req.public_recruiter_email is not None:
        job.public_recruiter_email = req.public_recruiter_email.strip()

    if req.extracted_requirements is not None:
        job.extracted_requirements = [
            r.model_dump() if hasattr(r, "model_dump") else dict(r)
            for r in req.extracted_requirements
        ]

    # Handle status change
    if req.status is not None:
        new_status = req.status.lower()
        if new_status in ("draft", "published", "paused", "closed"):
            if job.status != "published" and new_status == "published" and not job.posted_at:
                job.posted_at = now
            job.status = new_status

    db.commit()
    db.refresh(job)

    logger.info(f"Recruiter {ctx.user.email} updated job '{job.title}' (status={job.status})")

    return {
        "success": True,
        "message": f"Job posting updated successfully ({job.status}).",
        "job": {
            "id": f"job-{job.id}",
            "job_uuid": str(job.id),
            "title": job.title,
            "status": job.status,
            "posted_at": job.posted_at.isoformat() if job.posted_at else None,
            "updated_at": job.updated_at.isoformat() if job.updated_at else None,
        },
    }


@router.delete("/jobs/{job_id}")
def delete_or_close_job(
    job_id: str,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Closes or deletes a job posting from active recruiting.
    If applicants exist, preserves the record and marks status as 'closed'.
    """
    clean_id = job_id.replace("job-", "")
    try:
        j_uuid = uuid.UUID(clean_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job identifier format.",
        )

    job = db.query(JobPostingRecord).filter(
        JobPostingRecord.id == j_uuid,
        JobPostingRecord.organization_id == ctx.org_id,
    ).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job posting not found in your organization.",
        )

    # Check if applicants exist
    app_count = (
        db.query(CandidateShareInvitation)
        .filter(CandidateShareInvitation.job_id == job.id)
        .count()
    )

    if app_count > 0:
        job.status = "closed"
        db.commit()
        return {
            "success": True,
            "message": f"Job has {app_count} candidate applications and has been safely closed rather than deleted.",
            "status": "closed",
        }

    db.delete(job)
    db.commit()

    return {
        "success": True,
        "message": "Job posting deleted successfully.",
        "status": "deleted",
    }
