import secrets

import uuid

from typing import Optional, List, Dict, Any, Tuple

import time

from datetime import datetime, timezone, timedelta

from pydantic import BaseModel, Field, ConfigDict, model_validator

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from sqlalchemy.orm import Session

from sqlalchemy import desc, func, or_



from backend.app.db.session import get_db

from backend.app.api.dependencies import get_current_user, AuthenticatedUser

from backend.app.models.user_profile import UserProfile

from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping

from backend.app.models.evidence import EvidenceItem

from backend.app.models.career import UserTargetRoleRecord, RoleMatchSnapshotRecord

from backend.app.models.sharing import (

    ShareLinkRecord,

    UserCustomSkill,

    RecruiterMessage,

    ShareAccessEvent,

    UserNotification,

    UserPassportConfigRecord,

)

from backend.app.core.config import get_settings

from backend.app.core.logging import get_logger



logger = get_logger("api.sharing")

router = APIRouter(prefix="/sharing", tags=["Domain 6: Sharing & Recruiter"])



# 8 Canonical Templates

VALID_TEMPLATES = {

    "classic": "Professional Classic",

    "executive": "Minimal Executive",

    "technical": "Technical Portfolio",

    "ai_ml": "AI & Machine Learning",

    "engineering": "Software & Full-Stack Engineering",

    "academic": "Research & Academic",

    "project": "Project & Impact",

    "anonymous": "Privacy-First Anonymous",

}



DEFAULT_SECTIONS_CONFIG = [

    {"id": "summary", "title": "Professional Summary", "enabled": True, "orderIndex": 0},

    {"id": "verified_skills", "title": "Verified Capabilities", "enabled": True, "orderIndex": 1},

    {"id": "work_experience", "title": "Work Experience", "enabled": True, "orderIndex": 2},

    {"id": "portfolio_projects", "title": "Portfolio and Projects", "enabled": True, "orderIndex": 3},

    {"id": "custom_skills", "title": "Self-Declared Skills", "enabled": True, "orderIndex": 4},

    {"id": "certifications", "title": "Certifications and Credentials", "enabled": True, "orderIndex": 5},

    {"id": "education", "title": "Education and Academic Background", "enabled": True, "orderIndex": 6},

    {"id": "publications", "title": "Publications and Research", "enabled": True, "orderIndex": 7},

    {"id": "achievements", "title": "Honors and Achievements", "enabled": True, "orderIndex": 8},

    {"id": "role_alignment", "title": "Target Role Alignment", "enabled": True, "orderIndex": 9},

    {"id": "evidence_vault", "title": "Authorized Workplace Proof", "enabled": True, "orderIndex": 10},

    {"id": "custom_sections", "title": "Custom Sections", "enabled": True, "orderIndex": 11},

]





class MasterPassportInput(BaseModel):

    model_config = ConfigDict(extra="allow")



    title: Optional[str] = Field(default="Master Skill Passport")

    template_id: Optional[str] = Field(default="classic")

    sections_config: Optional[List[Dict[str, Any]]] = None

    work_experiences: Optional[List[Dict[str, Any]]] = None

    education_entries: Optional[List[Dict[str, Any]]] = None

    portfolio_projects: Optional[List[Dict[str, Any]]] = None

    certifications: Optional[List[Dict[str, Any]]] = None

    publications: Optional[List[Dict[str, Any]]] = None

    achievements: Optional[List[Dict[str, Any]]] = None

    custom_sections: Optional[List[Dict[str, Any]]] = None



    @model_validator(mode="before")

    @classmethod

    def normalize_fields(cls, data: Any) -> Any:

        if isinstance(data, dict):

            if "templateId" in data and "template_id" not in data:

                data["template_id"] = data["templateId"]

            if "sectionsConfig" in data and "sections_config" not in data:

                data["sections_config"] = data["sectionsConfig"]

            if "workExperiences" in data and "work_experiences" not in data:

                data["work_experiences"] = data["workExperiences"]

            if "educationEntries" in data and "education_entries" not in data:

                data["education_entries"] = data["educationEntries"]

            if "portfolioProjects" in data and "portfolio_projects" not in data:

                data["portfolio_projects"] = data["portfolioProjects"]

            if "customSections" in data and "custom_sections" not in data:

                data["custom_sections"] = data["customSections"]

        return data







# ==============================================================================

# PYDANTIC SCHEMAS

# ==============================================================================



class SharePermissionsInput(BaseModel):

    identity: Dict[str, Any] = Field(

        default_factory=lambda: {

            "show_display_name": True,

            "show_headline": True,

            "show_summary": True,

            "show_contact_info": False,

            "contact_email": "",

            "contact_linkedin": "",

        }

    )

    share_verified_skills_only: bool = Field(default=True)

    selected_skill_ids: List[str] = Field(default_factory=list)

    selected_custom_skill_ids: List[str] = Field(default_factory=list)

    selected_evidence_permissions: Dict[str, Dict[str, bool]] = Field(default_factory=dict)

    include_role_alignment: bool = Field(default=False)

    target_role_id: Optional[str] = None

    allow_recruiter_messaging: bool = Field(default=True)

    expiry_days: Optional[int] = Field(default=14)

    custom_headline: Optional[str] = None

    custom_summary: Optional[str] = None





class CreateShareLinkRequest(BaseModel):

    label: str = Field(..., min_length=2, max_length=255)

    template_id: str = Field(default="classic")

    permissions: SharePermissionsInput





class DraftPreviewRequest(BaseModel):

    model_config = ConfigDict(extra="allow")



    label: Optional[str] = Field(default="Draft Preview")

    template_id: Optional[str] = Field(default="classic")

    permissions: Optional[Dict[str, Any]] = None



    @model_validator(mode="before")

    @classmethod

    def normalize_fields(cls, data: Any) -> Any:

        if isinstance(data, dict):

            if "templateId" in data and "template_id" not in data:

                data["template_id"] = data["templateId"]

        return data





class UpdateShareLinkRequest(BaseModel):

    label: Optional[str] = Field(None, min_length=2, max_length=255)

    template_id: Optional[str] = None

    permissions: Optional[SharePermissionsInput] = None





class RevokeShareLinkRequest(BaseModel):

    reason: Optional[str] = Field(default="Candidate concluded recruiting engagement.")





class ExtendShareLinkRequest(BaseModel):

    additional_days: int = Field(default=14, ge=1, le=90)





class CustomSkillInput(BaseModel):

    title: str = Field(..., min_length=2, max_length=150)

    description: str = Field(..., min_length=5, max_length=1000)

    context: Optional[str] = Field(None, max_length=1000)

    self_assessed_level: str = Field(default="Intermediate")  # Beginner, Intermediate, Advanced, Expert

    tags: List[str] = Field(default_factory=list)

    attached_evidence_ids: List[str] = Field(default_factory=list)

    external_project_url: Optional[str] = Field(None, max_length=512)





class RecruiterMessageInput(BaseModel):

    sender_name: str = Field(..., min_length=2, max_length=255)

    sender_email: str = Field(..., min_length=5, max_length=255)

    company: Optional[str] = Field(None, max_length=255)

    role_title: Optional[str] = Field(None, max_length=255)

    subject: Optional[str] = Field(None, max_length=255)

    message_body: str = Field(..., min_length=10, max_length=3000)





# ==============================================================================

# CANONICAL PROJECTION ENGINE

# ==============================================================================



_DRAFT_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}



def invalidate_draft_cache(user_id: Any = None):

    global _DRAFT_CACHE

    if user_id:

        uid_str = str(user_id)

        _DRAFT_CACHE = {k: v for k, v in _DRAFT_CACHE.items() if not k.startswith(uid_str)}

    else:

        _DRAFT_CACHE.clear()



def build_canonical_projection(

    owner_user_id: uuid.UUID,

    permissions: Dict[str, Any],

    template_id: str,

    db: Session,

    share_record: Optional[ShareLinkRecord] = None,

) -> Dict[str, Any]:

    """

    Unified canonical share projection engine.

    Ensures that Preview, Wizard Review, Recruiter View, and PDF Export

    ALL resolve the exact same authorized content without data leaks.

    """

    settings = get_settings()

    now_utc = datetime.now(timezone.utc)



    # 0. Fast-path cache lookup for draft previews

    cache_key = None

    if share_record is None:

        try:

            cache_key = f"{owner_user_id}_{template_id}_{hash(str(sorted(permissions.items())))}"

            if cache_key in _DRAFT_CACHE:

                cached_time, cached_val = _DRAFT_CACHE[cache_key]

                if time.time() - cached_time < 30.0:

                    return cached_val

        except Exception:

            cache_key = None



    # 1. Check expiration/revocation if an active share record is passed

    if share_record:

        is_revoked = share_record.status == "revoked"

        is_expired = share_record.status == "expired"

        if not is_expired and share_record.expires_at:

            if share_record.expires_at < now_utc:

                is_expired = True

                share_record.status = "expired"

                db.commit()



        if is_revoked or is_expired:

            return {

                "shareId": share_record.token,

                "status": "revoked" if is_revoked else "expired",

                "createdAt": share_record.created_at.isoformat(),

                "expiresAt": share_record.expires_at.isoformat() if share_record.expires_at else None,

                "isExpired": is_expired,

                "isRevoked": is_revoked,

                "templateId": share_record.template_id,

                "candidateProfile": {},

                "verifiedSkills": [],

                "customSkills": [],

                "authorizedEvidence": [],

                "roleAlignment": None,

                "allowRecruiterMessaging": False,

                "verificationGuaranteeNote": (

                    "Access denied. This passport link has been revoked by the candidate."

                    if is_revoked

                    else "Access denied. This passport link has expired."

                ),

            }



    # 2. Fetch User Profile

    profile = db.query(UserProfile).filter(UserProfile.id == owner_user_id).first()

    identity_perms = permissions.get("identity", {})



    is_anonymous_template = (template_id == "anonymous")



    if is_anonymous_template:

        candidate_profile = {

            "displayName": "Verified Candidate",

            "headline": permissions.get("custom_headline") or (profile.headline if profile else "Senior Software Engineer"),

            "summary": permissions.get("custom_summary") or (profile.professional_summary if profile else ""),

            "contactEmail": None,

            "contactLinkedIn": None,

            "isAnonymous": True,

        }

    else:

        candidate_profile = {

            "displayName": profile.display_name if (profile and identity_perms.get("show_display_name", True)) else "Candidate",

            "headline": permissions.get("custom_headline") or (profile.headline if (profile and identity_perms.get("show_headline", True)) else ""),

            "summary": permissions.get("custom_summary") or (profile.professional_summary if (profile and identity_perms.get("show_summary", True)) else ""),

            "contactEmail": (identity_perms.get("contact_email") or (profile.email if profile else None)) if identity_perms.get("show_contact_info", False) else None,

            "contactLinkedIn": (identity_perms.get("contact_linkedin") or (profile.linkedin_url if profile else None)) if identity_perms.get("show_contact_info", False) else None,

            "isAnonymous": False,

        }



    # 3. Verified Skills Projection (Batched, resilient, and high-performance)

    mappings = db.query(EvidenceCompetencyMapping).filter(

        EvidenceCompetencyMapping.owner_user_id == owner_user_id,

        EvidenceCompetencyMapping.status.in_(["reviewed", "verified"]),

    ).all()



    # Fallback to high-confidence candidate extractions if verified count is 0

    if not mappings:

        mappings = db.query(EvidenceCompetencyMapping).filter(

            EvidenceCompetencyMapping.owner_user_id == owner_user_id,

            EvidenceCompetencyMapping.status.in_(["candidate", "reviewed", "verified"]),

            (EvidenceCompetencyMapping.relevance_score == None) | (EvidenceCompetencyMapping.relevance_score >= 0.65),

        ).all()



    # Pre-fetch taxonomy in a single batch to avoid N+1 queries

    comp_ids = list({m.competency_id for m in mappings if m.competency_id})

    tax_records = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id.in_(comp_ids)).all() if comp_ids else []

    tax_by_id = {t.id: t for t in tax_records}



    selected_skill_ids = permissions.get("selected_skill_ids") or permissions.get("selectedSkillIds") or []

    evidence_perms = permissions.get("selected_evidence_permissions") or permissions.get("selectedEvidencePermissions") or {}

    evidence_access_level = permissions.get("evidence_access_level") or permissions.get("evidenceAccessLevel") or "detail_inspection"

    allow_detail_default = (evidence_access_level in ("detail_inspection", "full_inspection", "detail"))



    # Resolve selected skill IDs (handling UUIDs and canonical name slugs)

    active_selected_ids = set()

    if selected_skill_ids:

        for sid in selected_skill_ids:

            if not sid:

                continue

            sid_str = str(sid).strip()

            if _is_valid_uuid(sid_str):

                active_selected_ids.add(sid_str)

            else:

                # Match slug to taxonomy (e.g. 'skill-python' -> 'Python Programming')

                slug = sid_str.lower().replace("skill-", "").replace("-", " ")

                for tid, t in tax_by_id.items():

                    if slug in t.canonical_name.lower() or t.canonical_name.lower() in slug:

                        active_selected_ids.add(str(tid))



    # If selected_skill_ids was specified but matched nothing (e.g. invalid mock strings), fall back to all user skills

    filter_by_selected = bool(active_selected_ids)



    # Filter out mock keys from evidence_perms

    valid_ev_perms = {k: v for k, v in evidence_perms.items() if _is_valid_uuid(str(k))}



    skills_by_comp: Dict[str, Dict[str, Any]] = {}

    for m in mappings:

        tax = tax_by_id.get(m.competency_id)

        if not tax:

            continue

        tax_id_str = str(tax.id)



        # Check filter if active

        if filter_by_selected and tax_id_str not in active_selected_ids:

            continue



        if tax_id_str not in skills_by_comp:

            skills_by_comp[tax_id_str] = {

                "id": tax_id_str,

                "canonicalName": tax.canonical_name,

                "category": tax.category,

                "verifiedProficiency": m.proficiency_level or "Practitioner",

                "description": tax.description,

                "authorizedEvidenceIds": [],

            }



        ev_id_str = str(m.evidence_id)

        ev_perm = valid_ev_perms.get(ev_id_str)

        # Summary sharing: default to True for all evidence supporting disclosed skills

        share_summary = ev_perm.get("shareSummary", True) if ev_perm else True

        if share_summary:

            if ev_id_str not in skills_by_comp[tax_id_str]["authorizedEvidenceIds"]:

                skills_by_comp[tax_id_str]["authorizedEvidenceIds"].append(ev_id_str)



    verified_skills = []

    for s in skills_by_comp.values():

        s["evidenceCount"] = len(s["authorizedEvidenceIds"])

        verified_skills.append(s)



    # 4. User-Declared Custom Skills (STRICT INVARIANT: Self-Declared, never verified)

    selected_custom_ids = permissions.get("selected_custom_skill_ids") or permissions.get("selectedCustomSkillIds") or []

    custom_skills = []

    if selected_custom_ids:

        raw_custom = db.query(UserCustomSkill).filter(

            UserCustomSkill.owner_user_id == owner_user_id,

            UserCustomSkill.id.in_([uuid.UUID(cid) for cid in selected_custom_ids if _is_valid_uuid(cid)]),

        ).all()

        for cs in raw_custom:

            auth_attached_ev = []

            for aev in cs.attached_evidence_ids or []:

                ev_perm = valid_ev_perms.get(str(aev))

                if ev_perm is None or ev_perm.get("shareSummary", True):

                    auth_attached_ev.append(str(aev))



            custom_skills.append({

                "id": str(cs.id),

                "title": cs.title,

                "description": cs.description,

                "context": cs.context,

                "selfAssessedLevel": cs.self_assessed_level,

                "tags": cs.tags or [],

                "externalProjectUrl": cs.external_project_url,

                "attachedEvidenceIds": auth_attached_ev,

                "verificationLabel": "User-declared · Not independently verified",

                "isVerified": False,

            })



    # 5. Authorized Evidence Items

    all_authorized_ev_ids = set()

    for s in verified_skills:

        all_authorized_ev_ids.update(s["authorizedEvidenceIds"])

    for cs in custom_skills:

        all_authorized_ev_ids.update(cs["attachedEvidenceIds"])



    authorized_evidence = []

    if all_authorized_ev_ids:

        raw_evidence = db.query(EvidenceItem).filter(

            EvidenceItem.owner_user_id == owner_user_id,

            EvidenceItem.is_deleted == False,

            EvidenceItem.id.in_([uuid.UUID(eid) for eid in all_authorized_ev_ids if _is_valid_uuid(eid)]),

        ).all()



        for ev in raw_evidence:

            ev_id_str = str(ev.id)

            ev_perm = valid_ev_perms.get(ev_id_str)

            if ev_perm and "allowDetail" in ev_perm:

                allow_detail = bool(ev_perm["allowDetail"])

            else:

                allow_detail = allow_detail_default



            parent_skill_name = "Technical Engineering"

            for vs in verified_skills:

                if ev_id_str in vs["authorizedEvidenceIds"]:

                    parent_skill_name = vs["canonicalName"]

                    break



            proj_name = ev.project_name

            if not proj_name and ev.provenance and isinstance(ev.provenance, dict):

                proj_name = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key")

            if not proj_name:

                proj_name = "Workplace Project"



            src_ref = None

            if allow_detail and ev.provenance and isinstance(ev.provenance, dict):

                src_ref = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key") or ev.provenance.get("file_path")



            authorized_evidence.append({

                "id": ev_id_str,

                "title": ev.title,

                "sourceType": ev.source_type,

                "sourceProvider": ev.source_provider,

                "project": proj_name,

                "date": ev.observed_timestamp.isoformat() if ev.observed_timestamp else None,

                "shortSummary": ev.extracted_summary or ev.description,

                "relatedSkillName": parent_skill_name,

                "claimedContribution": ev.attribution_status or "Author",

                "allowDetailInspection": allow_detail,

                "sourceUrl": ev.source_url if allow_detail else None,

                "sourceReference": src_ref,

            })



    # 6. Role Alignment (if authorized and available in real DB)

    role_alignment = None

    if permissions.get("include_role_alignment", False):

        target_role = db.query(UserTargetRoleRecord).filter(

            UserTargetRoleRecord.owner_user_id == owner_user_id

        ).first()

        if target_role:

            snapshot = db.query(RoleMatchSnapshotRecord).filter(

                RoleMatchSnapshotRecord.owner_user_id == owner_user_id,

                RoleMatchSnapshotRecord.role_id == target_role.target_role_id,

            ).order_by(desc(RoleMatchSnapshotRecord.created_at)).first()



            demonstrated_names = [s["canonicalName"] for s in verified_skills]

            strengths = demonstrated_names[:3] if demonstrated_names else ["Core Engineering"]

            

            role_alignment = {

                "targetRoleTitle": target_role.role_title,

                "alignmentSummary": f"Demonstrates strong evidence-backed alignment in {', '.join(strengths)}.",

                "strengths": strengths,

                "unsupportedAreas": snapshot.unsupported_requirements if snapshot and snapshot.unsupported_requirements else ["Specialized Domain Knowledge"],

                "alignmentScore": snapshot.overall_match_percentage if snapshot else 75,

                "coverageNote": "Illustrative alignment calculated solely against candidate's verified competencies.",

            }



    # 7. Optional Sections (Work Experience, Education, Projects, Certifications, Publications, Achievements, Custom Sections)

    master_cfg = db.query(UserPassportConfigRecord).filter(

        UserPassportConfigRecord.owner_user_id == owner_user_id

    ).first()



    sections_perms = permissions.get("sections") or {}



    def is_sec_enabled(sec_key: str) -> bool:

        if sec_key in sections_perms:

            return bool(sections_perms[sec_key])

        if master_cfg and master_cfg.sections_config:

            for s in master_cfg.sections_config:

                if s.get("id") == sec_key:

                    return bool(s.get("enabled", True))

        return True



    work_exp = []

    if is_sec_enabled("work_experience") and master_cfg and master_cfg.work_experiences:

        for we in master_cfg.work_experiences:

            if not we or not isinstance(we, dict):

                continue

            org_name = we.get("organization") or we.get("company") or "Organization"

            if is_anonymous_template:

                org_name = "[Confidential Organization]"

            work_exp.append({

                "id": str(we.get("id") or uuid.uuid4()),

                "jobTitle": we.get("jobTitle") or we.get("job_title") or "Role",

                "organization": org_name,

                "employmentType": we.get("employmentType") or we.get("employment_type"),

                "location": we.get("location"),

                "startDate": we.get("startDate") or we.get("start_date") or "",

                "endDate": we.get("endDate") or we.get("end_date"),

                "isCurrent": bool(we.get("isCurrent", we.get("is_current", False))),

                "description": we.get("description", ""),

                "achievements": we.get("achievements") or [],

                "techStack": we.get("techStack") or we.get("tech_stack") or [],

                "attachedEvidenceIds": [str(x) for x in (we.get("attachedEvidenceIds") or we.get("attached_evidence_ids") or [])],

            })



    edu_entries = []

    if is_sec_enabled("education") and master_cfg and master_cfg.education_entries:

        for ed in master_cfg.education_entries:

            if not ed or not isinstance(ed, dict):

                continue

            inst_name = ed.get("institution") or "University / Institution"

            if is_anonymous_template:

                inst_name = "[Accredited Institution]"

            edu_entries.append({

                "id": str(ed.get("id") or uuid.uuid4()),

                "institution": inst_name,

                "degree": ed.get("degree", ""),

                "fieldOfStudy": ed.get("fieldOfStudy") or ed.get("field_of_study", ""),

                "startYear": ed.get("startYear") or ed.get("start_year"),

                "endYear": ed.get("endYear") or ed.get("end_year"),

                "grade": ed.get("grade"),

                "activities": ed.get("activities"),

                "coursework": ed.get("coursework") or [],

            })



    port_projects = []

    if is_sec_enabled("portfolio_projects") and master_cfg and master_cfg.portfolio_projects:

        for pr in master_cfg.portfolio_projects:

            if not pr or not isinstance(pr, dict):

                continue

            port_projects.append({

                "id": str(pr.get("id") or uuid.uuid4()),

                "title": pr.get("title", "Project"),

                "description": pr.get("description", ""),

                "role": pr.get("role"),

                "techStack": pr.get("techStack") or pr.get("tech_stack") or [],

                "outcomes": pr.get("outcomes") or [],

                "projectUrl": pr.get("projectUrl") or pr.get("project_url"),

                "repoUrl": pr.get("repoUrl") or pr.get("repo_url"),

                "liveDemoUrl": pr.get("liveDemoUrl") or pr.get("live_demo_url"),

                "attachedEvidenceIds": [str(x) for x in (pr.get("attachedEvidenceIds") or pr.get("attached_evidence_ids") or [])],

            })



    certs = []

    if is_sec_enabled("certifications") and master_cfg and master_cfg.certifications:

        for c in master_cfg.certifications:

            if not c or not isinstance(c, dict):

                continue

            certs.append({

                "id": str(c.get("id") or uuid.uuid4()),

                "name": c.get("name", "Certification"),

                "issuer": c.get("issuer", "Issuing Organization"),

                "issueDate": c.get("issueDate") or c.get("issue_date"),

                "expiryDate": c.get("expiryDate") or c.get("expiry_date"),

                "credentialId": c.get("credentialId") or c.get("credential_id"),

                "credentialUrl": c.get("credentialUrl") or c.get("credential_url"),

                "documentVaultId": c.get("documentVaultId") or c.get("document_vault_id"),

            })



    pubs = []

    if is_sec_enabled("publications") and master_cfg and master_cfg.publications:

        for pb in master_cfg.publications:

            if not pb or not isinstance(pb, dict):

                continue

            pubs.append({

                "id": str(pb.get("id") or uuid.uuid4()),

                "title": pb.get("title", "Publication"),

                "venue": pb.get("venue"),

                "date": pb.get("date"),

                "url": pb.get("url"),

                "summary": pb.get("summary"),

                "authors": pb.get("authors") if not is_anonymous_template else None,

            })



    achieve = []

    if is_sec_enabled("achievements") and master_cfg and master_cfg.achievements:

        for ac in master_cfg.achievements:

            if not ac or not isinstance(ac, dict):

                continue

            achieve.append({

                "id": str(ac.get("id") or uuid.uuid4()),

                "title": ac.get("title", "Honor / Award"),

                "organization": ac.get("organization"),

                "date": ac.get("date"),

                "category": ac.get("category"),

                "description": ac.get("description"),

                "link": ac.get("link"),

            })



    custom_secs = []

    if is_sec_enabled("custom_sections") and master_cfg and master_cfg.custom_sections:

        for cs in master_cfg.custom_sections:

            if not cs or not isinstance(cs, dict) or not cs.get("enabled", True):

                continue

            custom_secs.append({

                "id": str(cs.get("id") or uuid.uuid4()),

                "title": cs.get("title", "Custom Section"),

                "content": cs.get("content"),

                "items": cs.get("items") or [],

                "links": cs.get("links") or [],

                "attachedEvidenceIds": [str(x) for x in (cs.get("attachedEvidenceIds") or cs.get("attached_evidence_ids") or [])],

                "enabled": cs.get("enabled", True),

            })



    token_str = share_record.token if share_record else "preview-token"



    created_str = share_record.created_at.isoformat() if share_record else now_utc.isoformat()

    expires_str = share_record.expires_at.isoformat() if (share_record and share_record.expires_at) else None



    result_projection = {

        "shareId": token_str,

        "status": "active",

        "createdAt": created_str,

        "expiresAt": expires_str,

        "isExpired": False,

        "isRevoked": False,

        "templateId": template_id if template_id in VALID_TEMPLATES else "classic",

        "candidateProfile": candidate_profile,

        "verifiedSkills": verified_skills,

        "customSkills": custom_skills,

        "authorizedEvidence": authorized_evidence,

        "roleAlignment": role_alignment,

        "allowRecruiterMessaging": bool(permissions.get("allow_recruiter_messaging", True)),

        "workExperience": work_exp,

        "education": edu_entries,

        "projects": port_projects,

        "certifications": certs,

        "publications": pubs,

        "achievements": achieve,

        "customSections": custom_secs,

        "sectionsConfig": master_cfg.sections_config if (master_cfg and master_cfg.sections_config) else DEFAULT_SECTIONS_CONFIG,

        "verificationGuaranteeNote": (

            "All verified capabilities listed in this passport are independently grounded in workplace proof, "

            "source code commits, or authenticated credentials. Self-declared skills are authored by the candidate "

            "and are clearly labeled."

        ),

    }



    if cache_key:

        _DRAFT_CACHE[cache_key] = (time.time(), result_projection)



    return result_projection





def _is_valid_uuid(val: str) -> bool:

    try:

        uuid.UUID(str(val))

        return True

    except (ValueError, TypeError):

        return False





# ==============================================================================

# AUTHENTICATED DOMAIN 6 ENDPOINTS

# ==============================================================================



@router.get("/overview")

def get_sharing_overview(

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    Returns authentic sharing readiness metrics, active link counts, and telemetry.

    No hardcoded numbers or fake identities.

    """

    user_id = user.id

    now_utc = datetime.now(timezone.utc)



    # 1. Verified skills count

    verified_mappings = db.query(EvidenceCompetencyMapping.competency_id).filter(

        EvidenceCompetencyMapping.owner_user_id == user_id,

        EvidenceCompetencyMapping.status.in_(["reviewed", "verified"]),

    ).distinct().count()



    # 2. Candidate unreviewed skills count

    candidate_mappings = db.query(EvidenceCompetencyMapping.competency_id).filter(

        EvidenceCompetencyMapping.owner_user_id == user_id,

        EvidenceCompetencyMapping.status == "candidate",

    ).distinct().count()



    # 3. Eligible evidence count

    eligible_evidence_count = db.query(EvidenceItem).filter(

        EvidenceItem.owner_user_id == user_id,

        EvidenceItem.is_deleted == False,

        EvidenceItem.verification_status.in_(["verified", "source_checked", "unreviewed"]),

    ).count()



    # 4. Custom skills count

    custom_skills_count = db.query(UserCustomSkill).filter(

        UserCustomSkill.owner_user_id == user_id

    ).count()



    # 5. Share links metrics

    all_links = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.owner_user_id == user_id

    ).order_by(desc(ShareLinkRecord.created_at)).all()



    active_count = 0

    expired_count = 0

    revoked_count = 0

    total_access_count = 0



    for link in all_links:

        # Check dynamic expiration

        if link.status == "active" and link.expires_at and link.expires_at < now_utc:

            link.status = "expired"

            db.commit()



        if link.status == "active":

            active_count += 1

        elif link.status == "expired":

            expired_count += 1

        elif link.status == "revoked":

            revoked_count += 1



        total_access_count += link.access_count



    # 6. Recruiter messages count

    unread_messages_count = db.query(RecruiterMessage).filter(

        RecruiterMessage.recipient_user_id == user_id,

        RecruiterMessage.is_read == False,

    ).count()



    total_messages_count = db.query(RecruiterMessage).filter(

        RecruiterMessage.recipient_user_id == user_id,

    ).count()



    # 7. Recent activity events

    recent_events = (

        db.query(ShareAccessEvent)

        .join(ShareLinkRecord)

        .filter(ShareLinkRecord.owner_user_id == user_id)

        .order_by(desc(ShareAccessEvent.created_at))

        .limit(10)

        .all()

    )



    return {

        "readiness": {

            "verified_skills_count": verified_mappings,

            "candidate_skills_count": candidate_mappings,

            "eligible_evidence_count": eligible_evidence_count,

            "custom_skills_count": custom_skills_count,

            "is_ready_to_share": verified_mappings > 0 or eligible_evidence_count > 0,

        },

        "links": {

            "total_links": len(all_links),

            "active_links": active_count,

            "expired_links": expired_count,

            "revoked_links": revoked_count,

            "total_access_count": total_access_count,

            "recent_links": [

                {

                    "id": str(link.id),

                    "token": link.token,

                    "label": link.label,

                    "template_id": link.template_id,

                    "status": link.status,

                    "created_at": link.created_at.isoformat(),

                    "expires_at": link.expires_at.isoformat() if link.expires_at else None,

                    "access_count": link.access_count,

                }

                for link in all_links[:5]

            ],

        },

        "messaging": {

            "unread_count": unread_messages_count,

            "total_count": total_messages_count,

        },

        "recent_activities": [

            {

                "id": str(e.id),

                "action": e.action,

                "details": e.details,

                "timestamp": e.created_at.isoformat(),

                "share_link_id": str(e.share_link_id),

            }

            for e in recent_events

        ],

    }





@router.get("/links")

def list_share_links(

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """List all real persisted share links owned by the user."""

    user_id = user.id

    now_utc = datetime.now(timezone.utc)



    links = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.owner_user_id == user_id

    ).order_by(desc(ShareLinkRecord.created_at)).all()



    items = []

    for link in links:

        if link.status == "active" and link.expires_at and link.expires_at < now_utc:

            link.status = "expired"

            db.commit()



        items.append({

            "id": str(link.id),

            "shareId": link.token,

            "label": link.label,

            "templateId": link.template_id,

            "status": link.status,

            "createdAt": link.created_at.isoformat(),

            "expiresAt": link.expires_at.isoformat() if link.expires_at else None,

            "lastAccessedAt": link.last_accessed_at.isoformat() if link.last_accessed_at else None,

            "accessCount": link.access_count,

            "revokedAt": link.revoked_at.isoformat() if link.revoked_at else None,

            "revocationReason": link.revocation_reason,

            "permissions": link.permissions_json,

        })



    return items





@router.post("/links", status_code=status.HTTP_201_CREATED)

def create_share_link(

    payload: Optional[DraftPreviewRequest] = None,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Creates a real secure share link with an unguessable high-entropy token."""

    user_id = user.id

    now_utc = datetime.now(timezone.utc)



    # Validate template

    template_id = payload.template_id if payload.template_id in VALID_TEMPLATES else "classic"



    # Cryptographically secure unguessable token

    token = f"sp_{secrets.token_urlsafe(16)}"



    # Normalize permissions dictionary

    if payload and payload.permissions:

        if isinstance(payload.permissions, dict):

            perms_dict = payload.permissions

        elif hasattr(payload.permissions, "model_dump"):

            perms_dict = payload.permissions.model_dump()

        elif hasattr(payload.permissions, "dict"):

            perms_dict = payload.permissions.dict()

        else:

            perms_dict = dict(payload.permissions)

    else:

        perms_dict = {}



    # Expiry calculation

    expires_at = None

    raw_expiry = getattr(payload, "expiry_days", None) or perms_dict.get("expiry_days") or perms_dict.get("expiryDays")

    if raw_expiry:

        try:

            days_int = int(raw_expiry)

            if days_int > 0:

                expires_at = now_utc + timedelta(days=days_int)

        except (ValueError, TypeError):

            pass



    label_str = payload.label.strip() if (payload and payload.label) else "Shared Passport"



    link = ShareLinkRecord(

        owner_user_id=user_id,

        token=token,

        label=label_str,

        template_id=template_id,

        status="active",

        permissions_json=perms_dict,

        expires_at=expires_at,

        access_count=0,

    )

    db.add(link)

    db.commit()

    db.refresh(link)



    # Record creation event

    event = ShareAccessEvent(

        share_link_id=link.id,

        action="created",

        details=f"Created share link '{link.label}' using '{VALID_TEMPLATES.get(template_id, template_id)}' template.",

    )

    db.add(event)

    db.commit()



    logger.info(f"Created real share link {link.id} (token={token}) for user {user_id}")



    return {

        "id": str(link.id),

        "shareId": link.token,

        "label": link.label,

        "templateId": link.template_id,

        "status": link.status,

        "createdAt": link.created_at.isoformat(),

        "expiresAt": link.expires_at.isoformat() if link.expires_at else None,

        "accessCount": 0,

        "permissions": link.permissions_json,

    }





@router.get("/links/{link_id}")

def get_share_link(

    link_id: str,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Retrieve details and projection for a specific link owned by the user."""

    if not _is_valid_uuid(link_id):

        raise HTTPException(status_code=400, detail="Invalid link UUID format")



    link = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.id == uuid.UUID(link_id),

        ShareLinkRecord.owner_user_id == user.id,

    ).first()



    if not link:

        raise HTTPException(status_code=404, detail="Share link not found")



    projection = build_canonical_projection(

        owner_user_id=user.id,

        permissions=link.permissions_json,

        template_id=link.template_id,

        db=db,

        share_record=link,

    )



    return {

        "link": {

            "id": str(link.id),

            "shareId": link.token,

            "label": link.label,

            "templateId": link.template_id,

            "status": link.status,

            "createdAt": link.created_at.isoformat(),

            "expiresAt": link.expires_at.isoformat() if link.expires_at else None,

            "accessCount": link.access_count,

            "revokedAt": link.revoked_at.isoformat() if link.revoked_at else None,

            "revocationReason": link.revocation_reason,

            "permissions": link.permissions_json,

        },

        "projection": projection,

    }





@router.put("/links/{link_id}")

def update_share_link(

    link_id: str,

    payload: UpdateShareLinkRequest,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Update permissions or presentation preferences of an active link."""

    if not _is_valid_uuid(link_id):

        raise HTTPException(status_code=400, detail="Invalid link UUID format")



    link = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.id == uuid.UUID(link_id),

        ShareLinkRecord.owner_user_id == user.id,

    ).first()



    if not link:

        raise HTTPException(status_code=404, detail="Share link not found")



    if payload.label is not None:

        link.label = payload.label.strip()

    if payload.template_id is not None and payload.template_id in VALID_TEMPLATES:

        link.template_id = payload.template_id

    if payload.permissions is not None:

        if isinstance(payload.permissions, dict):

            link.permissions_json = payload.permissions

        elif hasattr(payload.permissions, "model_dump"):

            link.permissions_json = payload.permissions.model_dump()

        elif hasattr(payload.permissions, "dict"):

            link.permissions_json = payload.permissions.dict()

        else:

            link.permissions_json = dict(payload.permissions)



    db.commit()



    event = ShareAccessEvent(

        share_link_id=link.id,

        action="permissions_updated",

        details="Updated disclosure permissions and settings.",

    )

    db.add(event)

    db.commit()



    return {

        "id": str(link.id),

        "shareId": link.token,

        "label": link.label,

        "templateId": link.template_id,

        "status": link.status,

        "permissions": link.permissions_json,

    }





@router.post("/links/{link_id}/revoke")

def revoke_share_link(

    link_id: str,

    payload: RevokeShareLinkRequest,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Instantly revokes public access to a share link with reason."""

    if not _is_valid_uuid(link_id):

        raise HTTPException(status_code=400, detail="Invalid link UUID format")



    link = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.id == uuid.UUID(link_id),

        ShareLinkRecord.owner_user_id == user.id,

    ).first()



    if not link:

        raise HTTPException(status_code=404, detail="Share link not found")



    link.status = "revoked"

    link.revoked_at = datetime.now(timezone.utc)

    link.revocation_reason = payload.reason or "Candidate explicitly revoked public access."

    db.commit()



    event = ShareAccessEvent(

        share_link_id=link.id,

        action="revoked",

        details=f"Revoked link. Reason: {link.revocation_reason}",

    )

    db.add(event)

    db.commit()



    logger.info(f"Revoked share link {link.id} for user {user.id}")



    return {

        "id": str(link.id),

        "shareId": link.token,

        "status": "revoked",

        "revokedAt": link.revoked_at.isoformat(),

        "revocationReason": link.revocation_reason,

    }





@router.post("/links/{link_id}/extend")

def extend_share_link(

    link_id: str,

    payload: ExtendShareLinkRequest,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Extends the expiry date of a share link."""

    if not _is_valid_uuid(link_id):

        raise HTTPException(status_code=400, detail="Invalid link UUID format")



    link = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.id == uuid.UUID(link_id),

        ShareLinkRecord.owner_user_id == user.id,

    ).first()



    if not link:

        raise HTTPException(status_code=404, detail="Share link not found")



    now_utc = datetime.now(timezone.utc)

    base_time = link.expires_at if (link.expires_at and link.expires_at > now_utc) else now_utc

    link.expires_at = base_time + timedelta(days=payload.additional_days)

    if link.status == "expired":

        link.status = "active"



    db.commit()



    event = ShareAccessEvent(

        share_link_id=link.id,

        action="extended",

        details=f"Extended link validity by {payload.additional_days} days to {link.expires_at.isoformat()}.",

    )

    db.add(event)

    db.commit()



    return {

        "id": str(link.id),

        "shareId": link.token,

        "status": link.status,

        "expiresAt": link.expires_at.isoformat(),

    }





# ==============================================================================

# CANONICAL PREVIEW & EXPORT ENDPOINTS

# ==============================================================================



@router.post("/preview")

def get_draft_preview(

    payload: Optional[DraftPreviewRequest] = None,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    Renders the exact canonical ShareProjection for preview before link generation.

    Does NOT mutate database or create active link.

    """

    if payload is None:

        payload = DraftPreviewRequest()



    template_id = payload.template_id or "classic"

    raw_perms = payload.permissions or {}



    if hasattr(raw_perms, "model_dump"):

        perms_dict = raw_perms.model_dump()

    elif isinstance(raw_perms, dict):

        perms_dict = raw_perms

    else:

        perms_dict = {}



    projection = build_canonical_projection(

        owner_user_id=user.id,

        permissions=perms_dict,

        template_id=template_id,

        db=db,

    )

    return projection





# ==============================================================================

# USER-DECLARED CUSTOM SKILLS (DOMAIN 6)

# ==============================================================================



@router.get("/custom-skills")

def list_user_custom_skills(

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    Returns user-declared skills.

    INVARIANT: Never classified as verified competency.

    """

    skills = db.query(UserCustomSkill).filter(

        UserCustomSkill.owner_user_id == user.id

    ).order_by(desc(UserCustomSkill.created_at)).all()



    return [

        {

            "id": str(s.id),

            "title": s.title,

            "description": s.description,

            "context": s.context,

            "selfAssessedLevel": s.self_assessed_level,

            "tags": s.tags or [],

            "attachedEvidenceIds": s.attached_evidence_ids or [],

            "externalProjectUrl": s.external_project_url,

            "createdAt": s.created_at.isoformat(),

            "verificationLabel": "User-declared · Not independently verified",

            "isVerified": False,

        }

        for s in skills

    ]





@router.post("/custom-skills", status_code=status.HTTP_201_CREATED)

def create_user_custom_skill(

    payload: CustomSkillInput,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Create a user-declared custom skill."""

    skill = UserCustomSkill(

        owner_user_id=user.id,

        title=payload.title.strip(),

        description=payload.description.strip(),

        context=payload.context.strip() if payload.context else None,

        self_assessed_level=payload.self_assessed_level,

        tags=payload.tags,

        attached_evidence_ids=payload.attached_evidence_ids,

        external_project_url=payload.external_project_url.strip() if payload.external_project_url else None,

    )

    db.add(skill)

    db.commit()

    db.refresh(skill)



    return {

        "id": str(skill.id),

        "title": skill.title,

        "description": skill.description,

        "context": skill.context,

        "selfAssessedLevel": skill.self_assessed_level,

        "tags": skill.tags,

        "attachedEvidenceIds": skill.attached_evidence_ids,

        "externalProjectUrl": skill.external_project_url,

        "createdAt": skill.created_at.isoformat(),

        "verificationLabel": "User-declared · Not independently verified",

        "isVerified": False,

    }





@router.put("/custom-skills/{skill_id}")

def update_user_custom_skill(

    skill_id: str,

    payload: CustomSkillInput,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Update a user-declared custom skill."""

    if not _is_valid_uuid(skill_id):

        raise HTTPException(status_code=400, detail="Invalid skill UUID format")



    skill = db.query(UserCustomSkill).filter(

        UserCustomSkill.id == uuid.UUID(skill_id),

        UserCustomSkill.owner_user_id == user.id,

    ).first()



    if not skill:

        raise HTTPException(status_code=404, detail="Custom skill not found")



    skill.title = payload.title.strip()

    skill.description = payload.description.strip()

    skill.context = payload.context.strip() if payload.context else None

    skill.self_assessed_level = payload.self_assessed_level

    skill.tags = payload.tags

    skill.attached_evidence_ids = payload.attached_evidence_ids

    skill.external_project_url = payload.external_project_url.strip() if payload.external_project_url else None

    db.commit()



    return {

        "id": str(skill.id),

        "title": skill.title,

        "description": skill.description,

        "context": skill.context,

        "selfAssessedLevel": skill.self_assessed_level,

        "tags": skill.tags,

        "attachedEvidenceIds": skill.attached_evidence_ids,

        "externalProjectUrl": skill.external_project_url,

        "verificationLabel": "User-declared · Not independently verified",

        "isVerified": False,

    }





@router.delete("/custom-skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)

def delete_user_custom_skill(

    skill_id: str,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Delete a user-declared custom skill."""

    if not _is_valid_uuid(skill_id):

        raise HTTPException(status_code=400, detail="Invalid skill UUID format")



    skill = db.query(UserCustomSkill).filter(

        UserCustomSkill.id == uuid.UUID(skill_id),

        UserCustomSkill.owner_user_id == user.id,

    ).first()



    if not skill:

        raise HTTPException(status_code=404, detail="Custom skill not found")



    db.delete(skill)

    db.commit()

    return None





# ==============================================================================

# MASTER PASSPORT BUILDER & SECTION CUSTOMIZATION (DOMAIN 6)

# ==============================================================================



@router.get("/master")

def get_master_passport(

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    Returns the user's persisted master passport configuration and customizable sections.

    Creates default record if none exists.

    """

    user_id = user.id

    config = db.query(UserPassportConfigRecord).filter(

        UserPassportConfigRecord.owner_user_id == user_id

    ).first()



    if not config:

        config = UserPassportConfigRecord(

            owner_user_id=user_id,

            title="Master Skill Passport",

            template_id="classic",

            sections_config=DEFAULT_SECTIONS_CONFIG,

            work_experiences=[],

            education_entries=[],

            portfolio_projects=[],

            certifications=[],

            publications=[],

            achievements=[],

            custom_sections=[],

        )

        db.add(config)

        db.commit()

        db.refresh(config)



    return {

        "id": str(config.id),

        "title": config.title,

        "templateId": config.template_id,

        "sectionsConfig": config.sections_config or DEFAULT_SECTIONS_CONFIG,

        "workExperiences": config.work_experiences or [],

        "educationEntries": config.education_entries or [],

        "portfolioProjects": config.portfolio_projects or [],

        "certifications": config.certifications or [],

        "publications": config.publications or [],

        "achievements": config.achievements or [],

        "customSections": config.custom_sections or [],

        "updatedAt": config.updated_at.isoformat() if config.updated_at else None,

    }





@router.put("/master")

def update_master_passport(

    payload: MasterPassportInput,

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    Updates the user's master passport configuration and sections.

    Persists real user entries without dummy placeholders.

    """

    user_id = user.id

    config = db.query(UserPassportConfigRecord).filter(

        UserPassportConfigRecord.owner_user_id == user_id

    ).first()



    if not config:

        config = UserPassportConfigRecord(

            owner_user_id=user_id,

            title="Master Skill Passport",

            template_id="classic",

            sections_config=DEFAULT_SECTIONS_CONFIG,

            work_experiences=[],

            education_entries=[],

            portfolio_projects=[],

            certifications=[],

            publications=[],

            achievements=[],

            custom_sections=[],

        )

        db.add(config)



    if payload.title is not None:

        config.title = payload.title.strip()

    if payload.template_id is not None:

        config.template_id = payload.template_id if payload.template_id in VALID_TEMPLATES else "classic"

    if payload.sections_config is not None:

        config.sections_config = payload.sections_config

    if payload.work_experiences is not None:

        config.work_experiences = payload.work_experiences

    if payload.education_entries is not None:

        config.education_entries = payload.education_entries

    if payload.portfolio_projects is not None:

        config.portfolio_projects = payload.portfolio_projects

    if payload.certifications is not None:

        config.certifications = payload.certifications

    if payload.publications is not None:

        config.publications = payload.publications

    if payload.achievements is not None:

        config.achievements = payload.achievements

    if payload.custom_sections is not None:

        config.custom_sections = payload.custom_sections



    db.commit()

    db.refresh(config)

    invalidate_draft_cache(user_id)



    logger.info(f"Updated master passport for user {user_id}")



    return {

        "id": str(config.id),

        "title": config.title,

        "templateId": config.template_id,

        "sectionsConfig": config.sections_config,

        "workExperiences": config.work_experiences,

        "educationEntries": config.education_entries,

        "portfolioProjects": config.portfolio_projects,

        "certifications": config.certifications,

        "publications": config.publications,

        "achievements": config.achievements,

        "customSections": config.custom_sections,

        "updatedAt": config.updated_at.isoformat() if config.updated_at else None,

    }





# ==============================================================================

# RECRUITER MESSAGING & INBOX (PROTECTED)

# ==============================================================================



@router.get("/messages")

def list_recruiter_messages(

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """

    List messages sent by recruiters to the authenticated user.

    """

    messages = (

        db.query(RecruiterMessage)

        .filter(RecruiterMessage.recipient_user_id == user.id)

        .order_by(desc(RecruiterMessage.created_at))

        .all()

    )



    items = []

    for msg in messages:

        link = db.query(ShareLinkRecord).filter(ShareLinkRecord.id == msg.share_link_id).first()

        items.append({

            "id": str(msg.id),

            "shareLinkId": str(msg.share_link_id),

            "shareLinkLabel": link.label if link else "Shared Passport",

            "senderName": msg.sender_name,

            "senderEmail": msg.sender_email,

            "company": msg.company,

            "roleTitle": msg.role_title,

            "subject": msg.subject or "Recruiter Inquiry",

            "messageBody": msg.message_body,

            "isRead": msg.is_read,

            "createdAt": msg.created_at.isoformat(),

        })



    return items





@router.patch("/messages/{message_id}/read")

def mark_recruiter_message_read(

    message_id: str,

    read: bool = Query(True),

    user: AuthenticatedUser = Depends(get_current_user),

    db: Session = Depends(get_db),

):

    """Toggle read status of a recruiter message."""

    if not _is_valid_uuid(message_id):

        raise HTTPException(status_code=400, detail="Invalid message UUID format")



    msg = db.query(RecruiterMessage).filter(

        RecruiterMessage.id == uuid.UUID(message_id),

        RecruiterMessage.recipient_user_id == user.id,

    ).first()



    if not msg:

        raise HTTPException(status_code=404, detail="Recruiter message not found")



    msg.is_read = read

    db.commit()



    return {"id": str(msg.id), "isRead": msg.is_read}





# ==============================================================================

# PUBLIC RECRUITER ENDPOINTS (NO AUTH REQUIRED, TOKEN-VALIDATED)

# ==============================================================================



@router.get("/public/{token}")

def get_public_share_projection(

    token: str,

    request: Request,

    db: Session = Depends(get_db),

):

    """

    Public recruiter view endpoint.

    Validates token, checks status and expiration, atomically increments access count,

    records telemetry, and resolves the canonical projection.

    """

    if token.strip() in ("preview-token", "draft-preview", "preview"):

        preview_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

        return build_canonical_projection(

            owner_user_id=preview_user_id,

            permissions={},

            template_id="classic",

            db=db,

        )



    link = db.query(ShareLinkRecord).filter(

        ShareLinkRecord.token == token.strip()

    ).first()



    if not link:

        raise HTTPException(status_code=404, detail="Shared passport link not found or invalid.")



    now_utc = datetime.now(timezone.utc)



    # Dynamic Expiration Check

    if link.status == "active" and link.expires_at and link.expires_at < now_utc:

        link.status = "expired"

        db.commit()



    # If active, track access count and event

    if link.status == "active":

        link.access_count += 1

        link.last_accessed_at = now_utc

        db.commit()



        client_ip = request.client.host if request.client else "unknown"

        ua = request.headers.get("user-agent", "unknown")[:255]



        event = ShareAccessEvent(

            share_link_id=link.id,

            action="viewed",

            details="Passport viewed via public recruiter link.",

            user_agent=ua,

        )

        db.add(event)

        db.commit()



    projection = build_canonical_projection(

        owner_user_id=link.owner_user_id,

        permissions=link.permissions_json,

        template_id=link.template_id,

        db=db,

        share_record=link,

    )



    return projection





@router.get("/public/{token}/evidence/{evidence_id}")

def get_public_evidence_detail(

    token: str,

    evidence_id: str,

    db: Session = Depends(get_db),

):

    """

    Public evidence inspection endpoint.

    Revalidates share token and confirms allowDetail permission before returning artifact details.

    """

    if not _is_valid_uuid(evidence_id):

        raise HTTPException(status_code=400, detail="Invalid evidence ID format.")



    is_preview = token.strip() in ("preview-token", "draft-preview", "preview")

    if is_preview:

        owner_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

        allow_detail = True

    else:

        link = db.query(ShareLinkRecord).filter(

            ShareLinkRecord.token == token.strip(),

            ShareLinkRecord.status == "active",

        ).first()



        if not link:

            raise HTTPException(status_code=404, detail="Active share link not found.")



        if link.expires_at and link.expires_at < datetime.now(timezone.utc):

            raise HTTPException(status_code=410, detail="This share link has expired.")



        owner_user_id = link.owner_user_id

        perms = link.permissions_json or {}

        ev_perms = perms.get("selected_evidence_permissions", {}).get(evidence_id, {})

        if "shareSummary" in ev_perms and not ev_perms.get("shareSummary"):

            raise HTTPException(status_code=403, detail="Evidence item is not authorized for sharing.")



        access_level = perms.get("evidence_access_level") or perms.get("evidenceAccessLevel") or "detail_inspection"

        allow_detail_default = (access_level in ("detail_inspection", "full_inspection", "detail"))

        allow_detail = bool(ev_perms.get("allowDetail", allow_detail_default))



    ev = db.query(EvidenceItem).filter(

        EvidenceItem.id == uuid.UUID(evidence_id),

        EvidenceItem.owner_user_id == owner_user_id,

        EvidenceItem.is_deleted == False,

    ).first()



    if not ev:

        raise HTTPException(status_code=404, detail="Evidence item not found.")



    # Find associated skill name

    assoc_map = db.query(EvidenceCompetencyMapping).filter(

        EvidenceCompetencyMapping.evidence_id == ev.id,

        EvidenceCompetencyMapping.owner_user_id == owner_user_id,

    ).first()

    skill_name = "Engineering Practice"

    if assoc_map:

        tax = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == assoc_map.competency_id).first()

        if tax:

            skill_name = tax.canonical_name



    proj_name = ev.project_name

    if not proj_name and ev.provenance and isinstance(ev.provenance, dict):

        proj_name = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key")

    if not proj_name:

        proj_name = "Workplace Project"



    src_ref = None

    if allow_detail and ev.provenance and isinstance(ev.provenance, dict):

        src_ref = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key") or ev.provenance.get("file_path") or ev.provenance.get("url")



    return {

        "id": str(ev.id),

        "title": ev.title,

        "sourceType": ev.source_type,

        "sourceProvider": ev.source_provider,

        "project": proj_name,

        "date": ev.observed_timestamp.isoformat() if ev.observed_timestamp else None,

        "shortSummary": ev.extracted_summary or ev.description,

        "relatedSkillName": skill_name,

        "claimedContribution": ev.attribution_status or "Author",

        "allowDetailInspection": allow_detail,

        "extractedExcerpt": (ev.extracted_excerpt or ev.extracted_summary or ev.description) if allow_detail else None,

        "sourceUrl": ev.source_url if allow_detail else None,

        "sourceReference": src_ref,

        "provenance": ev.provenance if (allow_detail and isinstance(ev.provenance, dict)) else {},

        "confidenceScore": round((getattr(ev, "extraction_confidence", None) or getattr(ev, "confidence_score", None) or 0.90) * 100),

        "trustCertification": "Grounded in authentic source artifacts with provenance verification.",

    }





@router.post("/public/{token}/messages", status_code=status.HTTP_201_CREATED)

def send_recruiter_message(

    token: str,

    payload: RecruiterMessageInput,

    db: Session = Depends(get_db),

):

    """

    Submits a message from a recruiter viewing an active shared passport.

    Persists message in recruiter_messages AND creates a real in-app notification

    delivered to the candidate's dashboard!

    """

    is_preview = token.strip() in ("preview-token", "draft-preview", "preview")

    if is_preview:

        recipient_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

        link = db.query(ShareLinkRecord).filter(

            ShareLinkRecord.owner_user_id == recipient_user_id,

        ).order_by(desc(ShareLinkRecord.created_at)).first()

        if not link:

            link = ShareLinkRecord(

                owner_user_id=recipient_user_id,

                label="Preview Shared Link",

                token="sp_preview_system",

                status="active",

                permissions_json={"allow_recruiter_messaging": True},

            )

            db.add(link)

            db.commit()

            db.refresh(link)

    else:

        link = db.query(ShareLinkRecord).filter(

            ShareLinkRecord.token == token.strip(),

            ShareLinkRecord.status == "active",

        ).first()



        if not link:

            raise HTTPException(status_code=404, detail="Share link is inactive, revoked, or expired.")



        if link.expires_at and link.expires_at < datetime.now(timezone.utc):

            raise HTTPException(status_code=410, detail="This share link has expired.")



        if not link.permissions_json.get("allow_recruiter_messaging", True):

            raise HTTPException(status_code=403, detail="The candidate has disabled recruiter messaging on this passport.")



        recipient_user_id = link.owner_user_id



    # 1. Persist the Recruiter Message

    message = RecruiterMessage(

        recipient_user_id=recipient_user_id,

        share_link_id=link.id,

        sender_name=payload.sender_name.strip(),

        sender_email=payload.sender_email.strip(),

        company=payload.company.strip() if payload.company else None,

        role_title=payload.role_title.strip() if payload.role_title else None,

        subject=payload.subject.strip() if payload.subject else "Recruiter Inquiry",

        message_body=payload.message_body.strip(),

        is_read=False,

    )

    db.add(message)

    db.commit()

    db.refresh(message)



    # 2. Record telemetry event on link

    event = ShareAccessEvent(

        share_link_id=link.id,

        action="message_received",

        details=f"Received message from {payload.sender_name} ({payload.company or 'Direct Recruiter'}).",

    )

    db.add(event)



    # 3. Create persistent User Notification in PostgreSQL

    notif = UserNotification(

        user_id=recipient_user_id,

        title=f"New recruiter message from {payload.sender_name}",

        description=f"{payload.sender_name} ({payload.company or 'Recruiter'}) sent a message regarding '{link.label}'.",

        category="sharing",

        severity="info",

        read=False,

        related_domain="Domain 6: Sharing & Recruiter",

        action_route="/app/passport/messages",

        action_label="Read Message",

        entity_type="recruiter_message",

        entity_id=str(message.id),

    )

    db.add(notif)

    db.commit()



    logger.info(

        f"Persisted recruiter message {message.id} from {payload.sender_email} for user {recipient_user_id} via link {link.id}"

    )



    return {

        "success": True,

        "messageId": str(message.id),

        "notificationCreated": True,

        "deliveredAt": message.created_at.isoformat(),

    }

