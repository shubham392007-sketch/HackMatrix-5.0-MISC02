import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.core.logging import get_logger
from backend.app.models.recruiter import CandidateShareInvitation, EmployerOrganization
from backend.app.models.sharing import (
    ShareLinkRecord,
    RecruiterMessage,
    ShareAccessEvent,
    UserNotification,
    UserPassportConfigRecord,
)
from backend.app.models.career import JobPostingRecord
from backend.app.models.user_profile import UserProfile
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import VerificationDecision
from backend.app.api.recruiter_dependencies import (
    get_current_recruiter_context,
    RecruiterContext,
)

logger = get_logger("api.recruiter_candidates")
router = APIRouter(prefix="/recruiter", tags=["Recruiter Portal - Candidates & Inbox"])


# ==============================================================================
# SCHEMAS
# ==============================================================================

class UpdatePipelineStatusRequest(BaseModel):
    pipeline_status: str = Field(
        ...,
        description="'new', 'reviewing', 'shortlisted', 'interview', 'offer', 'hired', 'rejected'",
    )
    notes: Optional[str] = None


class UpdateRecruiterNotesRequest(BaseModel):
    notes: str = Field(..., max_length=10000)


class RecruiterSendMessageRequest(BaseModel):
    subject: str = Field(..., min_length=2, max_length=255)
    message_body: str = Field(..., min_length=5)


# ==============================================================================
# 1. CANDIDATES PIPELINE LIST
# ==============================================================================

@router.get("/candidates")
def list_recruiter_candidates(
    pipeline_status: Optional[str] = Query("all", alias="status"),
    job_id: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Lists candidates who have shared their Skill Passport with the recruiter or organization.
    Filtered by pipeline status, job opening, or candidate keyword search.
    """
    org_id = ctx.org_id
    user_id = ctx.user_id

    user_email_clean = (ctx.user.email or "").strip().lower()
    contact_email_clean = (ctx.membership.public_contact_email or "").strip().lower()

    # Automatically claim any pending invitations matching recruiter email
    pending = db.query(CandidateShareInvitation).filter(
        CandidateShareInvitation.organization_id.is_(None),
        func.lower(CandidateShareInvitation.recruiter_email).in_([user_email_clean, contact_email_clean])
    ).all()
    for pinv in pending:
        pinv.organization_id = org_id
        pinv.recruiter_user_id = user_id
        pinv.delivery_status = "delivered"
    if pending:
        db.commit()

    q = db.query(CandidateShareInvitation).filter(
        (CandidateShareInvitation.organization_id == org_id)
        | (CandidateShareInvitation.recruiter_user_id == user_id)
        | (func.lower(CandidateShareInvitation.recruiter_email) == user_email_clean)
        | (func.lower(CandidateShareInvitation.recruiter_email) == contact_email_clean)
    )

    if pipeline_status and pipeline_status.lower() != "all":
        q = q.filter(CandidateShareInvitation.pipeline_status == pipeline_status.lower())

    if job_id:
        clean_jid = job_id.replace("job-", "")
        try:
            j_uuid = uuid.UUID(clean_jid)
            q = q.filter(CandidateShareInvitation.job_id == j_uuid)
        except ValueError:
            pass

    total_count = q.count()
    invitations = (
        q.order_by(desc(CandidateShareInvitation.created_at))
        .offset(offset)
        .limit(limit)
        .all()
    )

    # Gather auxiliary data
    cand_ids = [inv.candidate_user_id for inv in invitations]
    share_ids = [inv.share_link_id for inv in invitations]
    job_ids = [inv.job_id for inv in invitations if inv.job_id]

    profiles = {}
    if cand_ids:
        for p in db.query(UserProfile).filter(UserProfile.id.in_(cand_ids)).all():
            profiles[p.id] = p

    share_links = {}
    if share_ids:
        for sl in db.query(ShareLinkRecord).filter(ShareLinkRecord.id.in_(share_ids)).all():
            share_links[sl.id] = sl

    jobs = {}
    if job_ids:
        for j in db.query(JobPostingRecord).filter(JobPostingRecord.id.in_(job_ids)).all():
            jobs[j.id] = j

    # Pipeline status counts
    pipeline_counts = {
        "all": total_count,
        "new": 0,
        "reviewing": 0,
        "shortlisted": 0,
        "interview": 0,
        "offer": 0,
        "hired": 0,
        "rejected": 0,
    }
    all_invs = db.query(CandidateShareInvitation.pipeline_status).filter(
        (CandidateShareInvitation.organization_id == org_id)
        | (CandidateShareInvitation.recruiter_user_id == user_id)
        | (CandidateShareInvitation.recruiter_email == ctx.user.email)
    ).all()
    for row in all_invs:
        status_val = row[0]
        if status_val in pipeline_counts:
            pipeline_counts[status_val] += 1

    candidates_list = []
    for inv in invitations:
        prof = profiles.get(inv.candidate_user_id)
        sl = share_links.get(inv.share_link_id)
        job = jobs.get(inv.job_id) if inv.job_id else None

        cand_name = prof.display_name if prof and prof.display_name else "Candidate"
        cand_email = prof.email if prof else "Confidential"

        # Apply search filter in memory if profile fields match
        if search and search.strip():
            term = search.strip().lower()
            if (
                term not in cand_name.lower()
                and term not in cand_email.lower()
                and (not job or term not in job.title.lower())
            ):
                continue

        candidates_list.append({
            "invitation_id": str(inv.id),
            "share_link_id": str(inv.share_link_id),
            "share_token": sl.token if sl else "",
            "template_id": sl.template_id if sl else "classic",
            "candidate_user_id": str(inv.candidate_user_id),
            "candidate_name": cand_name,
            "candidate_headline": (prof.headline if prof else None) or (prof.current_role if prof else None) or "Software Professional",
            "candidate_email": cand_email,
            "job_id": str(inv.job_id) if inv.job_id else None,
            "job_title": job.title if job else "General Application",
            "pipeline_status": inv.pipeline_status,
            "delivery_status": inv.delivery_status,
            "is_read": inv.is_read_by_recruiter,
            "read_at": inv.read_at.isoformat() if inv.read_at else None,
            "candidate_message": inv.candidate_message,
            "recruiter_notes": inv.recruiter_notes,
            "created_at": inv.created_at.isoformat(),
            "last_status_updated_at": inv.last_status_updated_at.isoformat() if inv.last_status_updated_at else None,
        })

    return {
        "total": len(candidates_list),
        "offset": offset,
        "limit": limit,
        "pipeline_counts": pipeline_counts,
        "candidates": candidates_list,
    }


# ==============================================================================
# 2. CANDIDATE PASSPORT INSPECTION & VERIFICATION
# ==============================================================================

@router.get("/candidates/{invitation_id}")
def get_candidate_passport_detail(
    invitation_id: str,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Returns full details for a candidate share invitation, including the authorized
    Skill Passport projection honoring the candidate's exact privacy & sharing permissions.
    Marks invitation as read by the recruiter.
    """
    try:
        inv_uuid = uuid.UUID(invitation_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invitation identifier format.",
        )

    inv = db.query(CandidateShareInvitation).filter(
        CandidateShareInvitation.id == inv_uuid,
        (CandidateShareInvitation.organization_id == ctx.org_id)
        | (CandidateShareInvitation.recruiter_user_id == ctx.user_id)
        | (CandidateShareInvitation.recruiter_email == ctx.user.email),
    ).first()

    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate invitation not found or unauthorized.",
        )

    now = datetime.now(timezone.utc)

    # Mark as read
    if not inv.is_read_by_recruiter:
        inv.is_read_by_recruiter = True
        inv.read_at = now
        db.commit()

    # Load share link
    share_link = db.query(ShareLinkRecord).filter(
        ShareLinkRecord.id == inv.share_link_id
    ).first()

    if not share_link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked Skill Passport share record not found.",
        )

    # Record audit event
    audit_event = ShareAccessEvent(
        share_link_id=share_link.id,
        action="recruiter_reviewed",
        ip_hash=None,
        user_agent=None,
        details=f"Recruiter {ctx.user.email} inspected passport for organization {ctx.organization.name}.",
    )
    db.add(audit_event)
    db.commit()

    # Retrieve Candidate Profile
    prof = db.query(UserProfile).filter(UserProfile.id == inv.candidate_user_id).first()

    # Extract Candidate Permissions
    perms = share_link.permissions_json or {}
    identity_perms = perms.get("identity", {})
    evidence_perms = perms.get("evidence", {})
    section_perms = perms.get("sections", {})
    skill_filter = perms.get("verified_skills", {})

    evidence_permission_level = evidence_perms.get("permission_level", "summary")  # 'none', 'summary', 'details'

    # Build Candidate Identity Projection
    show_name = identity_perms.get("show_display_name", True)
    show_headline = identity_perms.get("show_headline", True)
    show_summary = identity_perms.get("show_summary", True)
    show_contact = identity_perms.get("show_contact_info", False)

    candidate_identity = {
        "display_name": (prof.display_name if prof else "Candidate") if show_name else "Verified Professional",
        "headline": (prof.headline or prof.current_role or "Software Engineer") if (prof and show_headline) else "Skill Passport Holder",
        "summary": ((getattr(prof, "professional_summary", None) or getattr(prof, "bio", "")) if prof else "") if show_summary else "",
        "contact_email": prof.email if (prof and show_contact) else "",
        "contact_phone": getattr(prof, "phone_number", "") if (prof and show_contact) else "",
        "is_anonymous": not show_name,
    }

    # Retrieve Verified Skills
    skills_query = (
        db.query(EvidenceCompetencyMapping, CompetencyTaxonomy)
        .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
        .filter(
            EvidenceCompetencyMapping.owner_user_id == inv.candidate_user_id,
            EvidenceCompetencyMapping.status.in_(["verified", "reviewed", "candidate"]),
        )
    )

    # Disallow rejected
    decisions = (
        db.query(VerificationDecision)
        .filter(
            VerificationDecision.owner_user_id == inv.candidate_user_id,
            VerificationDecision.verification_state == "rejected",
        )
        .all()
    )
    rejected_ids = {d.competency_id for d in decisions if d.competency_id}

    verified_skills = []
    seen_comp = set()
    for m, comp in skills_query.all():
        if comp.id in rejected_ids or comp.id in seen_comp:
            continue
        seen_comp.add(comp.id)

        # Build evidence items according to evidence permission level
        ev_items_projected = []
        if evidence_permission_level != "none":
            ev_records = (
                db.query(EvidenceItem)
                .filter(EvidenceItem.owner_user_id == inv.candidate_user_id)
                .limit(5)
                .all()
            )
            for ev in ev_records:
                if evidence_permission_level == "details":
                    ev_items_projected.append({
                        "id": str(ev.id),
                        "title": ev.title,
                        "source_type": ev.source_type,
                        "content_summary": (getattr(ev, 'extracted_excerpt', None) or getattr(ev, 'description', ''))[:300],
                        "verification_status": ev.verification_status,
                        "created_at": ev.created_at.isoformat(),
                    })
                else:  # summary
                    ev_items_projected.append({
                        "id": str(ev.id),
                        "title": ev.title,
                        "source_type": ev.source_type,
                        "verification_status": ev.verification_status,
                        "created_at": ev.created_at.isoformat(),
                    })

        verified_skills.append({
            "competency_id": str(comp.id),
            "canonical_name": comp.canonical_name,
            "category": comp.category,
            "level": (getattr(m, 'proficiency_level', None) or getattr(m, 'demonstrated_level', None) or "Practitioner"),
            "score": m.relevance_score or 0.85,
            "status": m.status,
            "evidence_count": len(ev_items_projected),
            "evidence": ev_items_projected,
        })

    # Retrieve User Passport Config Sections (work exp, edu, portfolio)
    passport_config = db.query(UserPassportConfigRecord).filter(
        UserPassportConfigRecord.owner_user_id == inv.candidate_user_id
    ).first()

    work_exp = (passport_config.work_experiences or []) if passport_config else []
    education = (passport_config.education_entries or []) if passport_config else []
    portfolio = (passport_config.portfolio_projects or []) if passport_config else []
    certifications = (passport_config.certifications or []) if passport_config else []

    # Associated Job
    job_data = None
    if inv.job_id:
        job_record = db.query(JobPostingRecord).filter(JobPostingRecord.id == inv.job_id).first()
        if job_record:
            job_data = {
                "id": f"job-{job_record.id}",
                "job_uuid": str(job_record.id),
                "title": job_record.title,
                "company_name": job_record.company_name,
                "location_text": job_record.location_text,
                "remote_status": job_record.remote_status,
                "employment_type": job_record.employment_type,
                "seniority": job_record.seniority,
                "status": job_record.status,
                "requirements": job_record.extracted_requirements or [],
            }

    # Load Conversation Messages
    messages = (
        db.query(RecruiterMessage)
        .filter(RecruiterMessage.share_link_id == share_link.id)
        .order_by(RecruiterMessage.created_at)
        .all()
    )

    messages_data = [
        {
            "id": str(msg.id),
            "sender_name": msg.sender_name,
            "sender_email": msg.sender_email,
            "sender_user_id": str(msg.sender_user_id) if msg.sender_user_id else None,
            "company": msg.company,
            "subject": msg.subject,
            "message_body": msg.message_body,
            "is_read": msg.is_read,
            "reply_body": msg.reply_body,
            "replied_at": msg.replied_at.isoformat() if msg.replied_at else None,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]

    return {
        "invitation": {
            "id": str(inv.id),
            "share_link_id": str(inv.share_link_id),
            "share_token": share_link.token,
            "candidate_user_id": str(inv.candidate_user_id),
            "recruiter_email": inv.recruiter_email,
            "pipeline_status": inv.pipeline_status,
            "delivery_status": inv.delivery_status,
            "is_read": inv.is_read_by_recruiter,
            "read_at": inv.read_at.isoformat() if inv.read_at else None,
            "candidate_message": inv.candidate_message,
            "recruiter_notes": inv.recruiter_notes,
            "created_at": inv.created_at.isoformat(),
            "last_status_updated_at": inv.last_status_updated_at.isoformat() if inv.last_status_updated_at else None,
        },
        "passport": {
            "template_id": share_link.template_id,
            "identity": candidate_identity,
            "verified_skills": verified_skills,
            "work_experiences": work_exp,
            "education_entries": education,
            "portfolio_projects": portfolio,
            "certifications": certifications,
            "evidence_permission_level": evidence_permission_level,
        },
        "job": job_data,
        "messages": messages_data,
    }


# ==============================================================================
# 3. PIPELINE STATUS UPDATE & CANDIDATE NOTIFICATION
# ==============================================================================

@router.patch("/candidates/{invitation_id}/pipeline")
def update_candidate_pipeline_status(
    invitation_id: str,
    req: UpdatePipelineStatusRequest,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Updates the candidate's recruitment pipeline status (e.g. shortlisted, interview).
    Drives audit logs and sends a real in-app notification to the candidate.
    """
    try:
        inv_uuid = uuid.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation UUID format.")

    inv = db.query(CandidateShareInvitation).filter(
        CandidateShareInvitation.id == inv_uuid,
        (CandidateShareInvitation.organization_id == ctx.org_id)
        | (CandidateShareInvitation.recruiter_user_id == ctx.user_id),
    ).first()

    if not inv:
        raise HTTPException(status_code=404, detail="Candidate invitation not found.")

    valid_statuses = ("new", "reviewing", "shortlisted", "interview", "offer", "hired", "rejected")
    new_status = req.pipeline_status.lower()
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline status. Must be one of: {', '.join(valid_statuses)}",
        )

    now = datetime.now(timezone.utc)
    old_status = inv.pipeline_status
    inv.pipeline_status = new_status
    inv.last_status_updated_at = now

    if req.notes:
        inv.recruiter_notes = req.notes.strip()

    # Record event
    event = ShareAccessEvent(
        share_link_id=inv.share_link_id,
        action="pipeline_status_changed",
        details=f"Recruiter changed status from '{old_status}' to '{new_status}'.",
    )
    db.add(event)

    # Deliver persistent in-app notification to candidate
    status_label = new_status.replace("_", " ").title()
    cand_notif = UserNotification(
        user_id=inv.candidate_user_id,
        category="application_status",
        severity="info" if new_status not in ("hired", "rejected") else ("success" if new_status == "hired" else "warning"),
        title=f"Application Update: {status_label}",
        description=f"{ctx.organization.name} updated your application status to '{status_label}'.",
        action_route="/app/passport/messages",
        action_label="View Application",
        entity_type="candidate_share_invitation",
        entity_id=str(inv.id),
        read=False,
    )
    db.add(cand_notif)

    db.commit()
    db.refresh(inv)

    logger.info(f"Updated invitation {inv.id} pipeline to {new_status} by recruiter {ctx.user.email}")

    return {
        "success": True,
        "invitation_id": str(inv.id),
        "pipeline_status": inv.pipeline_status,
        "last_status_updated_at": inv.last_status_updated_at.isoformat(),
        "message": f"Candidate status updated to {status_label}.",
    }


# ==============================================================================
# 4. PRIVATE RECRUITER NOTES
# ==============================================================================

@router.put("/candidates/{invitation_id}/notes")
def update_candidate_recruiter_notes(
    invitation_id: str,
    req: UpdateRecruiterNotesRequest,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Saves private internal recruiter evaluation notes on a candidate.
    Notes are strictly organization-isolated and never visible to the candidate.
    """
    try:
        inv_uuid = uuid.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation UUID format.")

    inv = db.query(CandidateShareInvitation).filter(
        CandidateShareInvitation.id == inv_uuid,
        (CandidateShareInvitation.organization_id == ctx.org_id)
        | (CandidateShareInvitation.recruiter_user_id == ctx.user_id),
    ).first()

    if not inv:
        raise HTTPException(status_code=404, detail="Candidate invitation not found.")

    inv.recruiter_notes = req.notes.strip()
    db.commit()

    return {
        "success": True,
        "invitation_id": str(inv.id),
        "notes": inv.recruiter_notes,
        "recruiter_notes": inv.recruiter_notes,
        "message": "Evaluation notes saved successfully.",
    }


# ==============================================================================
# 5. RECRUITER TO CANDIDATE MESSAGING
# ==============================================================================

@router.post("/candidates/{invitation_id}/messages", status_code=status.HTTP_201_CREATED)
def send_candidate_message(
    invitation_id: str,
    req: RecruiterSendMessageRequest,
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Sends a two-way message from the recruiter directly to the candidate.
    Creates a persistent RecruiterMessage and delivers an in-app notification to candidate.
    """
    try:
        inv_uuid = uuid.UUID(invitation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid invitation UUID format.")

    inv = db.query(CandidateShareInvitation).filter(
        CandidateShareInvitation.id == inv_uuid,
        (CandidateShareInvitation.organization_id == ctx.org_id)
        | (CandidateShareInvitation.recruiter_user_id == ctx.user_id),
    ).first()

    if not inv:
        raise HTTPException(status_code=404, detail="Candidate invitation not found.")

    now = datetime.now(timezone.utc)
    new_msg = RecruiterMessage(
        recipient_user_id=inv.candidate_user_id,
        share_link_id=inv.share_link_id,
        sender_user_id=ctx.user_id,
        job_id=inv.job_id,
        sender_name=ctx.membership.public_contact_name or ctx.user.email.split("@")[0],
        sender_email=ctx.membership.public_contact_email or ctx.user.email,
        company=ctx.organization.name,
        role_title=ctx.membership.job_title or "Hiring Team",
        subject=req.subject.strip(),
        message_body=req.message_body.strip(),
        is_read=False,
    )
    db.add(new_msg)
    db.flush()

    # Deliver in-app notification to candidate
    cand_notif = UserNotification(
        user_id=inv.candidate_user_id,
        category="recruiter_message",
        severity="info",
        title=f"Message from {ctx.organization.name}",
        description=f"{new_msg.sender_name}: {req.subject.strip()}",
        action_route="/app/passport/messages",
        action_label="Reply to Recruiter",
        entity_type="recruiter_message",
        entity_id=str(new_msg.id),
        read=False,
    )
    db.add(cand_notif)

    # Record event
    event = ShareAccessEvent(
        share_link_id=inv.share_link_id,
        action="message_sent",
        details=f"Recruiter {ctx.user.email} sent message: '{req.subject.strip()}'.",
    )
    db.add(event)

    db.commit()
    db.refresh(new_msg)

    logger.info(f"Recruiter {ctx.user.email} sent message {new_msg.id} to candidate {inv.candidate_user_id}")

    return {
        "success": True,
        "message": "Message sent to candidate successfully.",
        "message_id": str(new_msg.id),
        "created_at": new_msg.created_at.isoformat(),
    }


# ==============================================================================
# 6. RECRUITER INBOX & CONVERSATIONS
# ==============================================================================

@router.get("/inbox")
def get_recruiter_inbox(
    ctx: RecruiterContext = Depends(get_current_recruiter_context),
    db: Session = Depends(get_db),
):
    """
    Returns the recruiter inbox with conversation threads across candidate applications.
    """
    org_id = ctx.org_id
    user_id = ctx.user_id

    # Find all share links connected to this recruiter/org
    invitations = db.query(CandidateShareInvitation).filter(
        (CandidateShareInvitation.organization_id == org_id)
        | (CandidateShareInvitation.recruiter_user_id == user_id)
        | (CandidateShareInvitation.recruiter_email == ctx.user.email)
    ).all()

    share_link_ids = [inv.share_link_id for inv in invitations]

    messages = []
    if share_link_ids:
        messages = (
            db.query(RecruiterMessage)
            .filter(RecruiterMessage.share_link_id.in_(share_link_ids))
            .order_by(desc(RecruiterMessage.created_at))
            .all()
        )

    # Group messages by candidate / share_link
    inv_by_share = {inv.share_link_id: inv for inv in invitations}
    cand_ids = [inv.candidate_user_id for inv in invitations]
    profiles = {}
    if cand_ids:
        for p in db.query(UserProfile).filter(UserProfile.id.in_(cand_ids)).all():
            profiles[p.id] = p

    flat_messages = []
    thread_map = {}
    for m in messages:
        inv = inv_by_share.get(m.share_link_id)
        cand_user_id = inv.candidate_user_id if inv else m.recipient_user_id
        prof = profiles.get(cand_user_id)

        m_dict = {
            "message_id": str(m.id),
            "share_link_id": str(m.share_link_id),
            "invitation_id": str(inv.id) if inv else None,
            "candidate_name": prof.display_name if prof else "Candidate",
            "candidate_email": prof.email if prof else "Confidential",
            "sender_name": m.sender_name,
            "sender_email": m.sender_email,
            "subject": m.subject,
            "message_body": m.message_body,
            "is_read": m.is_read,
            "reply_body": m.reply_body,
            "replied_at": m.replied_at.isoformat() if m.replied_at else None,
            "created_at": m.created_at.isoformat(),
        }
        flat_messages.append(m_dict)

        sl_key = str(m.share_link_id)
        if sl_key not in thread_map:
            thread_map[sl_key] = {
                "share_link_id": sl_key,
                "invitation_id": str(inv.id) if inv else None,
                "candidate_name": prof.display_name if prof else "Candidate",
                "candidate_email": prof.email if prof else "Confidential",
                "messages": [],
            }
        thread_map[sl_key]["messages"].append(m_dict)

    threads = list(thread_map.values())

    return {
        "total_messages": len(flat_messages),
        "unread_count": sum(1 for t in flat_messages if not t["is_read"] and t["sender_name"] != (ctx.membership.public_contact_name or ctx.user.email)),
        "messages": flat_messages,
        "threads": threads,
    }
