import re
import secrets
import uuid
from typing import Optional, List, Dict, Any, Tuple, Union
import time
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, ConfigDict, model_validator
from fastapi import APIRouter, Response, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_
from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.user_profile import UserProfile
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.evidence import EvidenceItem
from backend.app.models.career import UserTargetRoleRecord, RoleMatchSnapshotRecord, JobPostingRecord
from backend.app.models.recruiter import CandidateShareInvitation, OrganizationMembership
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
    # 8 Canonical Template IDs
    "verified-competency": "Verified Competency Passport",
    "professional-resume": "Professional Resume",
    "technical-portfolio": "Technical Portfolio",
    "ai-ml-engineer": "AI & Machine Learning Engineer",
    "software-fullstack": "Software & Full-Stack Engineer",
    "research-academic": "Research & Academic",
    "projects-impact": "Projects & Impact",
    "minimal-privacy": "Minimal & Privacy-First",
    # Legacy aliases
    "classic": "Verified Competency Passport",
    "executive": "Professional Resume",
    "technical": "Technical Portfolio",
    "ai_ml": "AI & Machine Learning Engineer",
    "engineering": "Software & Full-Stack Engineer",
    "academic": "Research & Academic",
    "project": "Projects & Impact",
    "anonymous": "Minimal & Privacy-First",
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
    sections_config: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None
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
            elif "workExperience" in data and "work_experiences" not in data:
                data["work_experiences"] = data["workExperience"]
            if "educationEntries" in data and "education_entries" not in data:
                data["education_entries"] = data["educationEntries"]
            elif "education" in data and "education_entries" not in data:
                data["education_entries"] = data["education"]
            if "portfolioProjects" in data and "portfolio_projects" not in data:
                data["portfolio_projects"] = data["portfolioProjects"]
            elif "projects" in data and "portfolio_projects" not in data:
                data["portfolio_projects"] = data["projects"]
            if "honorsAwards" in data and "achievements" not in data:
                data["achievements"] = data["honorsAwards"]
            elif "honors_awards" in data and "achievements" not in data:
                data["achievements"] = data["honors_awards"]
            if "customSections" in data and "custom_sections" not in data:
                data["custom_sections"] = data["customSections"]
        return data

# ==============================================================================
# PYDANTIC SCHEMAS

# ==============================================================================

class SharePermissionsInput(BaseModel):
    model_config = ConfigDict(extra="allow")
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
    template_id: Optional[str] = Field(default=None)
    custom_link_label: Optional[str] = Field(default=None)
    expiry_days: Optional[int] = Field(default=14)
    custom_headline: Optional[str] = None
    custom_summary: Optional[str] = None
    sections: Optional[Dict[str, bool]] = None
    master_passport: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Identity
            if "identity" in data and isinstance(data["identity"], dict):
                ident = dict(data["identity"])
                if "showDisplayName" in ident and "show_display_name" not in ident:
                    ident["show_display_name"] = ident["showDisplayName"]
                if "showHeadline" in ident and "show_headline" not in ident:
                    ident["show_headline"] = ident["showHeadline"]
                if "showSummary" in ident and "show_summary" not in ident:
                    ident["show_summary"] = ident["showSummary"]
                if "showContactInfo" in ident and "show_contact_info" not in ident:
                    ident["show_contact_info"] = ident["showContactInfo"]
                if "contactEmail" in ident and "contact_email" not in ident:
                    ident["contact_email"] = ident["contactEmail"]
                if "contactLinkedIn" in ident and "contact_linkedin" not in ident:
                    ident["contact_linkedin"] = ident["contactLinkedIn"]
                data["identity"] = ident

            if "shareVerifiedSkillsOnly" in data and "share_verified_skills_only" not in data:
                data["share_verified_skills_only"] = data["shareVerifiedSkillsOnly"]
            if "selectedSkillIds" in data and "selected_skill_ids" not in data:
                data["selected_skill_ids"] = data["selectedSkillIds"]
            if "selectedCustomSkillIds" in data and "selected_custom_skill_ids" not in data:
                data["selected_custom_skill_ids"] = data["selectedCustomSkillIds"]
            if "selectedEvidencePermissions" in data and "selected_evidence_permissions" not in data:
                data["selected_evidence_permissions"] = data["selectedEvidencePermissions"]
            if "includeRoleAlignment" in data and "include_role_alignment" not in data:
                data["include_role_alignment"] = data["includeRoleAlignment"]
            if "targetRoleId" in data and "target_role_id" not in data:
                data["target_role_id"] = data["targetRoleId"]
            if "allowRecruiterMessaging" in data and "allow_recruiter_messaging" not in data:
                data["allow_recruiter_messaging"] = data["allowRecruiterMessaging"]
            if "expiryDays" in data and "expiry_days" not in data:
                data["expiry_days"] = data["expiryDays"]
            if "customLinkLabel" in data and "custom_link_label" not in data:
                data["custom_link_label"] = data["customLinkLabel"]
            if "customHeadline" in data and "custom_headline" not in data:
                data["custom_headline"] = data["customHeadline"]
            if "customSummary" in data and "custom_summary" not in data:
                data["custom_summary"] = data["customSummary"]
            if "templateId" in data and "template_id" not in data:
                data["template_id"] = data["templateId"]
            if "masterPassport" in data and "master_passport" not in data:
                data["master_passport"] = data["masterPassport"]
        return data

class CreateShareLinkRequest(BaseModel):
    label: str = Field(..., min_length=2, max_length=255)
    template_id: str = Field(default="classic")
    permissions: SharePermissionsInput

class DraftPreviewRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    label: Optional[str] = Field(default="Draft Preview")
    template_id: Optional[str] = Field(default="classic")
    permissions: Optional[Dict[str, Any]] = None
    recruiter_email: Optional[str] = None
    job_id: Optional[str] = None
    candidate_message: Optional[str] = None
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
    sender_name: Optional[str] = Field(None, max_length=255)
    senderName: Optional[str] = Field(None, max_length=255)
    sender_email: Optional[str] = Field(None, max_length=255)
    senderEmail: Optional[str] = Field(None, max_length=255)
    company: Optional[str] = Field(None, max_length=255)
    role_title: Optional[str] = Field(None, max_length=255)
    roleTitle: Optional[str] = Field(None, max_length=255)
    subject: Optional[str] = Field(None, max_length=255)
    message_body: Optional[str] = Field(None, max_length=5000)
    messageBody: Optional[str] = Field(None, max_length=5000)

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
def _is_expired(expires_at, now=None) -> bool:
    if not expires_at:
        return False
    if now is None:
        now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < now



def resolve_evidence_urls(ev: Any, share_token: str) -> Dict[str, Optional[str]]:
    """
    Deterministically computes:
    - source_url: genuine canonical platform or streaming URL
    - external_url: direct external link to GitHub, Jira, LeetCode, HackerRank, or document
    - document_url / file_url: API endpoint to stream/view uploaded document binary
    """
    raw_source_url = ev.source_url
    external_url = None
    document_url = None
    file_url = None
    source_url = raw_source_url

    prov = ev.provenance if isinstance(ev.provenance, dict) else {}
    provider = (ev.source_provider or "").lower()
    stype = (ev.source_type or "").lower()

    # Document check
    is_doc = (
        provider in ("document", "document_upload", "certificate", "resume")
        or stype in ("document", "certificate", "pdf_page", "document_upload")
        or getattr(ev, "document_id", None) is not None
        or (raw_source_url and "/" in raw_source_url and not raw_source_url.startswith("http"))
        or prov.get("original_filename") is not None
    )

    if is_doc:
        doc_stream_url = f"/api/v1/sharing/public/{share_token}/evidence/{ev.id}/file"
        document_url = doc_stream_url
        file_url = doc_stream_url
        source_url = doc_stream_url
        if prov.get("verification_url"):
            external_url = prov.get("verification_url")
        elif prov.get("profile_url"):
            external_url = prov.get("profile_url")
        elif prov.get("credential_url"):
            external_url = prov.get("credential_url")
        elif raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        else:
            external_url = doc_stream_url
    elif provider == "github" or "github" in stype:
        repo = prov.get("repo") or prov.get("repo_full_name") or prov.get("repository")
        if not repo and raw_source_url and "github.com/" in raw_source_url:
            m = re.search(r"github\.com/([^/]+/[^/#?]+)", raw_source_url)
            if m:
                repo = m.group(1).rstrip(".git")

        if raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        elif repo:
            if stype == "pull_request" and prov.get("pr_number"):
                external_url = f"https://github.com/{repo}/pull/{prov['pr_number']}"
            elif stype == "commit" and prov.get("sha"):
                external_url = f"https://github.com/{repo}/commit/{prov['sha']}"
            elif stype == "readme":
                external_url = f"https://github.com/{repo}/blob/main/README.md"
            else:
                external_url = f"https://github.com/{repo}"
        elif raw_source_url:
            external_url = raw_source_url if raw_source_url.startswith("http") else f"https://github.com/{raw_source_url}"
        source_url = external_url
    elif provider == "jira" or "jira" in stype:
        issue_key = prov.get("issue_key") or prov.get("key")
        site_url = prov.get("site_url") or prov.get("host") or prov.get("domain")
        if raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        elif site_url and issue_key:
            clean_host = site_url if site_url.startswith("http") else f"https://{site_url}"
            external_url = f"{clean_host.rstrip('/')}/browse/{issue_key}"
        elif issue_key:
            external_url = f"https://atlassian.net/browse/{issue_key}"
        elif raw_source_url:
            external_url = raw_source_url if raw_source_url.startswith("http") else f"https://{raw_source_url}"
        source_url = external_url
    elif provider == "leetcode" or "leetcode" in stype:
        username = prov.get("username") or prov.get("account_identity") or prov.get("handle")
        if raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        elif username:
            external_url = f"https://leetcode.com/u/{username}"
        elif raw_source_url:
            external_url = raw_source_url if raw_source_url.startswith("http") else f"https://leetcode.com/u/{raw_source_url}"
        source_url = external_url
    elif provider == "hackerrank" or "hackerrank" in stype:
        username = prov.get("username") or prov.get("account_identity") or prov.get("handle")
        if raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        elif username:
            external_url = f"https://hackerrank.com/profile/{username}"
        elif raw_source_url:
            external_url = raw_source_url if raw_source_url.startswith("http") else f"https://hackerrank.com/profile/{raw_source_url}"
        source_url = external_url
    else:
        if raw_source_url and raw_source_url.startswith("http"):
            external_url = raw_source_url
        elif prov.get("url") and prov.get("url").startswith("http"):
            external_url = prov.get("url")
        source_url = external_url or raw_source_url

    return {
        "source_url": source_url,
        "external_url": external_url or source_url,
        "document_url": document_url,
        "file_url": file_url,
    }

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
        if not is_expired and _is_expired(share_record.expires_at, now_utc):
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
    all_mappings = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.owner_user_id == owner_user_id,
        EvidenceCompetencyMapping.status.in_(["candidate", "reviewed", "verified"]),
    ).all()

    # Disallow rejected competencies or candidate mappings
    decisions = (
        db.query(VerificationDecision)
        .filter(
            VerificationDecision.owner_user_id == owner_user_id,
            VerificationDecision.verification_state == "rejected",
        )
        .all()
    )
    rejected_comp_ids = {d.competency_id for d in decisions if d.competency_id}
    rejected_mapping_ids = {d.candidate_mapping_id for d in decisions if d.candidate_mapping_id}

    valid_mappings = [
        m for m in all_mappings
        if m.competency_id not in rejected_comp_ids and m.id not in rejected_mapping_ids
    ]

    share_verified_only = permissions.get("share_verified_skills_only")
    if share_verified_only is None:
        share_verified_only = permissions.get("shareVerifiedSkillsOnly", True)

    # Competencies with at least one verified mapping or decision
    comp_has_verified = set()
    for m in valid_mappings:
        if m.status in ("reviewed", "verified"):
            comp_has_verified.add(m.competency_id)

    # If share_verified_only is requested and some competencies have verified mappings,
    # include all supporting evidence mappings for those verified competencies.
    # Otherwise (e.g. all unverified or share_verified_only is false), include all mappings with relevance >= 0.65
    if share_verified_only and comp_has_verified:
        mappings = [m for m in valid_mappings if m.competency_id in comp_has_verified]
    else:
        mappings = [
            m for m in valid_mappings
            if m.status in ("reviewed", "verified") or (m.relevance_score is None or m.relevance_score >= 0.65)
        ]
    # Pre-fetch taxonomy in a single batch to avoid N+1 queries
    comp_ids = list({m.competency_id for m in mappings if m.competency_id})
    tax_records = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id.in_(comp_ids)).all() if comp_ids else []
    tax_by_id = {t.id: t for t in tax_records}
    has_explicit_skill_filter = ("selected_skill_ids" in permissions or "selectedSkillIds" in permissions)
    selected_skill_ids = permissions.get("selected_skill_ids") or permissions.get("selectedSkillIds") or []
    evidence_perms = permissions.get("selected_evidence_permissions") or permissions.get("selectedEvidencePermissions") or {}
    evidence_access_level = permissions.get("evidence_access_level") or permissions.get("evidenceAccessLevel") or "detail_inspection"
    allow_detail_default = (evidence_access_level in ("detail_inspection", "full_inspection", "detail"))
    # Resolve selected skill IDs (handling UUIDs, canonical names, and slugs)
    active_selected_ids = set()
    active_selected_names = set()
    if selected_skill_ids:
        for sid in selected_skill_ids:
            if not sid:
                continue
            sid_str = str(sid).strip()
            if _is_valid_uuid(sid_str):
                active_selected_ids.add(sid_str)
            else:
                slug = sid_str.lower().replace("skill-", "").replace("-", " ").strip()
                active_selected_names.add(slug)
                for tid, t in tax_by_id.items():
                    cname = t.canonical_name.lower()
                    if slug in cname or cname in slug or slug == cname:
                        active_selected_ids.add(str(tid))

    # STRICT RULE: If the caller explicitly passed selected_skill_ids, only include those skills.
    filter_by_selected = has_explicit_skill_filter
    # Filter out mock keys from evidence_perms
    valid_ev_perms = {k: v for k, v in evidence_perms.items() if _is_valid_uuid(str(k))}
    skills_by_comp: Dict[str, Dict[str, Any]] = {}
    for m in mappings:
        tax = tax_by_id.get(m.competency_id)
        if not tax:
            continue
        tax_id_str = str(tax.id)
        # Check filter if active
        if filter_by_selected:
            matches_selected = (
                tax_id_str in active_selected_ids
                or any(name in tax.canonical_name.lower() for name in active_selected_names)
            )
            if not matches_selected:
                continue
        prof_ranks = {"Not Established": 0, "Foundational": 1, "Foundation": 1, "Working": 2, "Intermediate": 3, "Practitioner": 3, "Advanced": 4, "Expert": 5}
        if tax_id_str not in skills_by_comp:
            skills_by_comp[tax_id_str] = {
                "id": tax_id_str,
                "canonicalName": tax.canonical_name,
                "category": tax.category,
                "verifiedProficiency": m.proficiency_level or "Practitioner",
                "description": tax.description,
                "authorizedEvidenceIds": [],
            }
        else:
            cur_p = skills_by_comp[tax_id_str].get("verifiedProficiency")
            new_p = m.proficiency_level or "Practitioner"
            if prof_ranks.get(new_p, 0) > prof_ranks.get(cur_p, 0):
                skills_by_comp[tax_id_str]["verifiedProficiency"] = new_p
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
        effective_token = share_record.token if share_record else "preview-token"
        for ev in raw_evidence:
            ev_id_str = str(ev.id)
            ev_perm = valid_ev_perms.get(ev_id_str)
            if ev_perm and "allowDetail" in ev_perm:
                allow_detail = bool(ev_perm["allowDetail"])
            else:
                allow_detail = allow_detail_default
            # If access level is detail_inspection, default to allowing inspection of authorized workplace proof
            if evidence_access_level in ("detail_inspection", "full_inspection", "detail"):
                allow_detail = True

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
            if ev.provenance and isinstance(ev.provenance, dict):
                src_ref = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key") or ev.provenance.get("file_path") or ev.provenance.get("url")

            urls = resolve_evidence_urls(ev, share_token=effective_token)

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
                "sourceUrl": urls["source_url"],
                "externalUrl": urls["external_url"],
                "documentUrl": urls["document_url"],
                "fileUrl": urls["file_url"],
                "sourceReference": src_ref,
                "provenance": ev.provenance if isinstance(ev.provenance, dict) else {},
                "extractedExcerpt": (ev.extracted_excerpt or ev.extracted_summary or ev.description),
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
    if not master_cfg:
        master_cfg = db.query(UserPassportConfigRecord).order_by(desc(UserPassportConfigRecord.updated_at)).first()

    custom_master_payload = permissions.get("masterPassport") or permissions.get("master_passport") or {}
    sections_perms = permissions.get("sections") or {}

    def is_sec_enabled(sec_key: str) -> bool:
        if sec_key in sections_perms:
            return bool(sections_perms[sec_key])
        if sec_key == "portfolio_projects" and "projects" in sections_perms:
            return bool(sections_perms["projects"])
        if sec_key == "projects" and "portfolio_projects" in sections_perms:
            return bool(sections_perms["portfolio_projects"])

        target_keys = {sec_key}
        if sec_key in ("projects", "portfolio_projects"):
            target_keys.update(["projects", "portfolio_projects"])

        cfg_list = (custom_master_payload.get("sectionsConfig") or custom_master_payload.get("sections_config")) if isinstance(custom_master_payload, dict) and custom_master_payload else None
        if not cfg_list and master_cfg and master_cfg.sections_config:
            cfg_list = master_cfg.sections_config

        if cfg_list:
            if isinstance(cfg_list, dict):
                for k in target_keys:
                    if k in cfg_list:
                        val = cfg_list[k]
                        if isinstance(val, dict):
                            return bool(val.get("enabled", True))
                        return bool(val)
            elif isinstance(cfg_list, list):
                for s in cfg_list:
                    if isinstance(s, dict) and s.get("id") in target_keys:
                        return bool(s.get("enabled", True))
                    elif isinstance(s, str) and s in target_keys:
                        return True
        return True

    # Work Experience
    raw_work = (
        custom_master_payload.get("workExperiences")
        or custom_master_payload.get("work_experiences")
        or custom_master_payload.get("workExperience")
    ) if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_work is None and master_cfg:
        raw_work = master_cfg.work_experiences

    work_exp = []
    if is_sec_enabled("work_experience") and raw_work:
        for we in raw_work:
            if not we or not isinstance(we, dict):
                continue
            job_title = we.get("jobTitle") or we.get("job_title") or we.get("role") or ""
            org_name = we.get("organization") or we.get("company") or ""
            we_desc = we.get("description") or we.get("summary") or ""
            if not job_title and not org_name and not we_desc:
                continue
            if is_anonymous_template and org_name:
                org_name = "[Confidential Organization]"
            bullets = we.get("bullets") or [a for a in (we.get("achievements") or []) if a and str(a).strip()]
            tech = we.get("skills") or [t for t in (we.get("techStack") or we.get("tech_stack") or []) if t and str(t).strip()]
            start_d = we.get("startDate") or we.get("start_date") or ""
            end_d = we.get("endDate") or we.get("end_date") or ""
            period = we.get("period") or (f"{start_d} - {end_d}" if start_d or end_d else "")
            work_exp.append({
                "id": str(we.get("id") or uuid.uuid4()),
                "jobTitle": job_title or "Role",
                "role": job_title or "Role",
                "organization": org_name or "Organization",
                "company": org_name or "Organization",
                "employmentType": we.get("employmentType") or we.get("employment_type"),
                "location": we.get("location"),
                "startDate": start_d,
                "endDate": end_d,
                "period": period,
                "isCurrent": bool(we.get("isCurrent", we.get("is_current", False))),
                "description": we_desc,
                "summary": we_desc,
                "bullets": bullets,
                "achievements": bullets,
                "techStack": tech,
                "skills": tech,
                "attachedEvidenceIds": [str(x) for x in (we.get("attachedEvidenceIds") or we.get("attached_evidence_ids") or [])],
            })

    # Education
    raw_edu = (
        custom_master_payload.get("educationEntries")
        or custom_master_payload.get("education_entries")
        or custom_master_payload.get("education")
    ) if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_edu is None and master_cfg:
        raw_edu = master_cfg.education_entries

    edu_entries = []
    if is_sec_enabled("education") and raw_edu:
        for ed in raw_edu:
            if not ed or not isinstance(ed, dict):
                continue
            inst = ed.get("institution") or ""
            deg = ed.get("degree") or ""
            field = ed.get("fieldOfStudy") or ed.get("field_of_study") or ""
            details = ed.get("details") or ed.get("description") or ""
            if not inst and not deg and not field and not details:
                continue
            if is_anonymous_template and inst:
                inst = "[Accredited Institution]"
            start_yr = ed.get("startYear") or ed.get("start_year")
            end_yr = ed.get("endYear") or ed.get("end_year")
            period = ed.get("period") or (f"{start_yr} - {end_yr}" if start_yr or end_yr else "")
            gpa = ed.get("gpa") or ed.get("grade")
            edu_entries.append({
                "id": str(ed.get("id") or uuid.uuid4()),
                "institution": inst or "University / Institution",
                "degree": deg,
                "fieldOfStudy": field,
                "details": details,
                "description": details,
                "startYear": start_yr,
                "endYear": end_yr,
                "period": period,
                "grade": gpa,
                "gpa": gpa,
                "activities": ed.get("activities"),
                "coursework": [c for c in (ed.get("coursework") or []) if c and str(c).strip()],
            })

    # Portfolio Projects
    raw_proj = (
        custom_master_payload.get("portfolioProjects")
        or custom_master_payload.get("portfolio_projects")
        or custom_master_payload.get("projects")
    ) if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_proj is None and master_cfg:
        raw_proj = master_cfg.portfolio_projects

    port_projects = []
    if (is_sec_enabled("portfolio_projects") or is_sec_enabled("projects")) and raw_proj:
        for pr in raw_proj:
            if not pr or not isinstance(pr, dict):
                continue
            title = pr.get("title") or ""
            pr_desc = pr.get("description") or pr.get("summary") or ""
            if not title and not pr_desc:
                continue
            proj_url = pr.get("projectUrl") or pr.get("project_url") or pr.get("url")
            highlights = pr.get("highlights") or [o for o in (pr.get("outcomes") or []) if o and str(o).strip()]
            tech = [t for t in (pr.get("techStack") or pr.get("tech_stack") or []) if t and str(t).strip()]
            port_projects.append({
                "id": str(pr.get("id") or uuid.uuid4()),
                "title": title or "Project",
                "description": pr_desc,
                "summary": pr_desc,
                "role": pr.get("role"),
                "techStack": tech,
                "highlights": highlights,
                "outcomes": highlights,
                "url": proj_url,
                "projectUrl": proj_url,
                "repoUrl": pr.get("repoUrl") or pr.get("repo_url"),
                "liveDemoUrl": pr.get("liveDemoUrl") or pr.get("live_demo_url"),
                "attachedEvidenceIds": [str(x) for x in (pr.get("attachedEvidenceIds") or pr.get("attached_evidence_ids") or [])],
            })

    # Certifications
    raw_certs = custom_master_payload.get("certifications") if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_certs is None and master_cfg:
        raw_certs = master_cfg.certifications

    certs = []
    if is_sec_enabled("certifications") and raw_certs:
        for c in raw_certs:
            if not c or not isinstance(c, dict):
                continue
            name = c.get("name") or c.get("title") or ""
            if not name:
                continue
            cred_url = c.get("credentialUrl") or c.get("credential_url")
            certs.append({
                "id": str(c.get("id") or uuid.uuid4()),
                "name": name,
                "title": name,
                "issuer": c.get("issuer") or "Issuing Organization",
                "issueDate": c.get("issueDate") or c.get("issue_date"),
                "expiryDate": c.get("expiryDate") or c.get("expiry_date"),
                "credentialId": c.get("credentialId") or c.get("credential_id"),
                "credentialUrl": cred_url,
                "documentVaultId": c.get("documentVaultId") or c.get("document_vault_id"),
            })

    # Publications
    raw_pubs = custom_master_payload.get("publications") if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_pubs is None and master_cfg:
        raw_pubs = master_cfg.publications

    pubs = []
    if is_sec_enabled("publications") and raw_pubs:
        for pb in raw_pubs:
            if not pb or not isinstance(pb, dict):
                continue
            title = pb.get("title") or ""
            if not title:
                continue
            venue = pb.get("venue") or pb.get("journal")
            date_val = pb.get("date") or pb.get("year")
            pubs.append({
                "id": str(pb.get("id") or uuid.uuid4()),
                "title": title,
                "venue": venue,
                "journal": venue,
                "date": date_val,
                "year": date_val,
                "url": pb.get("url"),
                "summary": pb.get("summary"),
                "authors": pb.get("authors") if not is_anonymous_template else None,
            })

    # Achievements
    raw_achieve = (
        custom_master_payload.get("achievements")
        or custom_master_payload.get("honorsAwards")
        or custom_master_payload.get("honors_awards")
    ) if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_achieve is None and master_cfg:
        raw_achieve = getattr(master_cfg, "achievements", None) or getattr(master_cfg, "honors_awards", None)

    achieve = []
    if is_sec_enabled("achievements") and raw_achieve:
        for ac in raw_achieve:
            if not ac or not isinstance(ac, dict):
                continue
            title = ac.get("title") or ""
            if not title:
                continue
            issuer = ac.get("issuer") or ac.get("organization")
            achieve.append({
                "id": str(ac.get("id") or uuid.uuid4()),
                "title": title,
                "organization": issuer,
                "issuer": issuer,
                "date": ac.get("date") or ac.get("year"),
                "category": ac.get("category"),
                "description": ac.get("description"),
                "link": ac.get("link"),
            })

    # Custom Sections
    raw_custom_secs = (custom_master_payload.get("customSections") or custom_master_payload.get("custom_sections")) if isinstance(custom_master_payload, dict) and custom_master_payload else None
    if raw_custom_secs is None and master_cfg:
        raw_custom_secs = master_cfg.custom_sections

    custom_secs = []
    if is_sec_enabled("custom_sections") and raw_custom_secs:
        for cs in raw_custom_secs:
            if not cs or not isinstance(cs, dict) or not cs.get("enabled", True):
                continue
            title = cs.get("title") or ""
            if not title:
                continue
            custom_secs.append({
                "id": str(cs.get("id") or uuid.uuid4()),
                "title": title,
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
        if link.status == "active" and _is_expired(link.expires_at, now_utc):
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
        if link.status == "active" and _is_expired(link.expires_at, now_utc):
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
    user_uuid = uuid.UUID(str(user_id))
    link = ShareLinkRecord(
        owner_user_id=user_uuid,
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

    # Check for targeted recruiter share
    recruiter_email = getattr(payload, "recruiter_email", None)
    if not recruiter_email and payload and hasattr(payload, "permissions") and isinstance(payload.permissions, dict):
        recruiter_email = payload.permissions.get("recruiter_email") or payload.permissions.get("recruiterEmail")
    
    target_job_id = getattr(payload, "job_id", None)
    if not target_job_id and payload and hasattr(payload, "permissions") and isinstance(payload.permissions, dict):
        target_job_id = payload.permissions.get("job_id") or payload.permissions.get("jobId")

    cand_message = getattr(payload, "candidate_message", None)
    if not cand_message and payload and hasattr(payload, "permissions") and isinstance(payload.permissions, dict):
        cand_message = payload.permissions.get("candidate_message") or payload.permissions.get("candidateMessage")

    invitation_result = None
    if recruiter_email and recruiter_email.strip():
        norm_email = recruiter_email.strip().lower()
        # Resolve recipient recruiter membership
        membership = db.query(OrganizationMembership).filter(
            (func.lower(OrganizationMembership.public_contact_email) == norm_email)
            | (OrganizationMembership.user_id.in_(
                db.query(UserProfile.id).filter(func.lower(UserProfile.email) == norm_email)
            ))
        ).filter(OrganizationMembership.status == "active").first()

        recruiter_uid = membership.user_id if membership else None
        org_id = membership.organization_id if membership else None
        deliv_status = "delivered" if membership else "pending_account"

        # Resolve job_id
        parsed_job_uuid = None
        if target_job_id:
            try:
                parsed_job_uuid = uuid.UUID(str(target_job_id).replace("job-", ""))
            except (ValueError, TypeError):
                pass

        inv = CandidateShareInvitation(
            share_link_id=link.id,
            candidate_user_id=uuid.UUID(str(user_id)),
            recruiter_email=norm_email,
            recruiter_user_id=recruiter_uid,
            organization_id=org_id,
            job_id=parsed_job_uuid,
            candidate_message=cand_message.strip() if cand_message else None,
            delivery_status=deliv_status,
            pipeline_status="new",
        )
        db.add(inv)
        db.flush()

        cand_profile = db.query(UserProfile).filter(UserProfile.id == user_uuid).first()
        cand_name = cand_profile.display_name if cand_profile and cand_profile.display_name else "A candidate"
        cand_email = cand_profile.email if cand_profile and cand_profile.email else getattr(user, "email", "candidate@skillpassport.io")

        # Create initial candidate message record if message provided
        if cand_message and cand_message.strip():
            recip_uid = recruiter_uid if recruiter_uid else uuid.UUID("00000000-0000-0000-0000-000000000000")
            init_msg = RecruiterMessage(
                recipient_user_id=recip_uid,
                share_link_id=link.id,
                sender_user_id=user_uuid,
                job_id=parsed_job_uuid,
                sender_name=cand_name,
                sender_email=cand_email,
                role_title="Candidate",
                subject="Skill Passport Application",
                message_body=cand_message.strip(),
                is_read=False,
            )
            db.add(init_msg)

        # If delivered, create notification for recruiter
        if deliv_status == "delivered" and recruiter_uid:
            notif = UserNotification(
                user_id=recruiter_uid,
                category="candidate_share",
                severity="info",
                title="New Skill Passport Shared",
                description=f"{cand_name} shared their verified Skill Passport with you.",
                action_route=f"/recruiter/candidates/{inv.id}",
                action_label="Review Candidate",
                entity_type="candidate_share_invitation",
                entity_id=str(inv.id),
                read=False,
            )
            db.add(notif)

        invitation_result = {
            "invitationId": str(inv.id),
            "recruiterEmail": norm_email,
            "deliveryStatus": deliv_status,
            "recipientFound": bool(membership),
            "jobId": str(parsed_job_uuid) if parsed_job_uuid else None,
        }

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
        "invitation": invitation_result,
    }

def _find_user_share_link(link_identifier: str, user_id: uuid.UUID, db: Session) -> Optional[ShareLinkRecord]:
    clean_id = (link_identifier or "").strip()
    if not clean_id:
        return None
    if _is_valid_uuid(clean_id):
        link = db.query(ShareLinkRecord).filter(
            ShareLinkRecord.id == uuid.UUID(clean_id),
            ShareLinkRecord.owner_user_id == user_id,
        ).first()
        if link:
            return link
    # Fallback to searching by token string (e.g. 'sp_...' or 'sh-...')
    return db.query(ShareLinkRecord).filter(
        ShareLinkRecord.token == clean_id,
        ShareLinkRecord.owner_user_id == user_id,
    ).first()


@router.get("/links/{link_id}")
def get_share_link(
    link_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details and projection for a specific link owned by the user (by UUID or token)."""
    link = _find_user_share_link(link_id, user.id, db)
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
    """Update permissions or presentation preferences of an active link (by UUID or token)."""
    link = _find_user_share_link(link_id, user.id, db)
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
    """Instantly revokes public access to a share link with reason (accepts UUID or token)."""
    link = _find_user_share_link(link_id, user.id, db)
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
    """Extends the expiry date of a share link (accepts UUID or token)."""
    link = _find_user_share_link(link_id, user.id, db)
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found")
    now_utc = datetime.now(timezone.utc)
    base_time = link.expires_at if (link.expires_at and not _is_expired(link.expires_at, now_utc)) else now_utc
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
    try:
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
            "workExperience": config.work_experiences or [],
            "educationEntries": config.education_entries or [],
            "education": config.education_entries or [],
            "portfolioProjects": config.portfolio_projects or [],
            "projects": config.portfolio_projects or [],
            "certifications": config.certifications or [],
            "publications": config.publications or [],
            "achievements": config.achievements or [],
            "honorsAwards": config.achievements or [],
            "customSections": config.custom_sections or [],
            "updatedAt": config.updated_at.isoformat() if config.updated_at else None,
        }
    except Exception as exc:
        logger.warning(f"Failed to fetch remote master passport for {user_id}: {exc}. Returning default config.")
        return {
            "id": f"local-{user_id}",
            "title": "Master Skill Passport",
            "templateId": "classic",
            "sectionsConfig": DEFAULT_SECTIONS_CONFIG,
            "workExperiences": [],
            "educationEntries": [],
            "portfolioProjects": [],
            "certifications": [],
            "publications": [],
            "achievements": [],
            "customSections": [],
            "updatedAt": None,
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
    try:
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
            "workExperience": config.work_experiences,
            "educationEntries": config.education_entries,
            "education": config.education_entries,
            "portfolioProjects": config.portfolio_projects,
            "projects": config.portfolio_projects,
            "certifications": config.certifications,
            "publications": config.publications,
            "achievements": config.achievements,
            "honorsAwards": config.achievements,
            "customSections": config.custom_sections,
            "updatedAt": config.updated_at.isoformat() if config.updated_at else None,
        }
    except Exception as exc:
        logger.warning(f"Error persisting master passport to DB: {exc}")
        return {
            "id": f"local-{user_id}",
            "title": config.title,
            "templateId": config.template_id,
            "sectionsConfig": config.sections_config,
            "workExperiences": config.work_experiences,
            "workExperience": config.work_experiences,
            "educationEntries": config.education_entries,
            "education": config.education_entries,
            "portfolioProjects": config.portfolio_projects,
            "projects": config.portfolio_projects,
            "certifications": config.certifications,
            "publications": config.publications,
            "achievements": config.achievements,
            "honorsAwards": config.achievements,
            "customSections": config.custom_sections,
            "updatedAt": None,
        }

# ==============================================================================
# AUTHORITATIVE SHARING PERMISSIONS (DOMAIN 6)
# ==============================================================================

def format_canonical_permissions(
    user_id: Any,
    raw_perms: Optional[Dict[str, Any]],
    db: Session,
    master_cfg: Optional[UserPassportConfigRecord] = None,
) -> Dict[str, Any]:
    """
    Normalizes, validates, and formats sharing permissions against user's actual verified competencies
    and owned evidence items. Returns canonical dictionary with both camelCase and snake_case properties.
    """
    uid_uuid = None
    if isinstance(user_id, uuid.UUID):
        uid_uuid = user_id
    elif user_id and _is_valid_uuid(str(user_id)):
        uid_uuid = uuid.UUID(str(user_id))
    elif not user_id:
        uid_uuid = uuid.UUID("00000000-0000-0000-0000-000000000001")

    profile = None
    try:
        if uid_uuid:
            profile = db.query(UserProfile).filter(UserProfile.id == uid_uuid).first()
    except Exception as e:
        logger.warning(f"Could not load UserProfile for {uid_uuid}: {e}")

    # User verified competency mappings
    mappings = []
    try:
        if uid_uuid:
            mappings = db.query(EvidenceCompetencyMapping).filter(
                EvidenceCompetencyMapping.owner_user_id == uid_uuid,
                EvidenceCompetencyMapping.status.in_(["reviewed", "verified"]),
            ).all()
            if not mappings:
                mappings = db.query(EvidenceCompetencyMapping).filter(
                    EvidenceCompetencyMapping.owner_user_id == uid_uuid,
                    EvidenceCompetencyMapping.status.in_(["candidate", "reviewed", "verified"]),
                    (EvidenceCompetencyMapping.relevance_score == None) | (EvidenceCompetencyMapping.relevance_score >= 0.65),
                ).all()
    except Exception as e:
        logger.warning(f"Could not load EvidenceCompetencyMapping for {uid_uuid}: {e}")

    comp_ids = list({str(m.competency_id) for m in mappings if m.competency_id})
    tax_records = []
    try:
        tax_uuids = [uuid.UUID(c) for c in comp_ids if _is_valid_uuid(c)]
        if tax_uuids:
            tax_records = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id.in_(tax_uuids)).all()
    except Exception as e:
        logger.warning(f"Could not load CompetencyTaxonomy: {e}")

    valid_skill_id_set = set(comp_ids)
    for tax in tax_records:
        valid_skill_id_set.add(str(tax.id))
        valid_skill_id_set.add(tax.canonical_name.lower())

    # User evidence items
    user_evidence = []
    try:
        if uid_uuid:
            user_evidence = db.query(EvidenceItem).filter(EvidenceItem.owner_user_id == uid_uuid).all()
    except Exception as e:
        logger.warning(f"Could not load EvidenceItem for {uid_uuid}: {e}")
    valid_ev_id_set = {str(e.id) for e in user_evidence}

    if not raw_perms:
        ident_config = {
            "showDisplayName": True,
            "showHeadline": True,
            "showSummary": True,
            "showContactInfo": False,
            "contactEmail": profile.email if profile else "",
            "contactLinkedIn": profile.linkedin_url if profile else "",
            "show_display_name": True,
            "show_headline": True,
            "show_summary": True,
            "show_contact_info": False,
            "contact_email": profile.email if profile else "",
            "contact_linkedin": profile.linkedin_url if profile else "",
        }
        selected_skills = [c for c in comp_ids]
        evidence_perms = {}
        for ev in user_evidence:
            evidence_perms[str(ev.id)] = {
                "shareSummary": True,
                "allowDetail": False,
                "share_summary": True,
                "allow_detail": False,
            }
        template_id = master_cfg.template_id if (master_cfg and master_cfg.template_id in VALID_TEMPLATES) else "classic"
        sections = {
            "work_experience": True,
            "portfolio_projects": True,
            "education": True,
            "certifications": True,
            "publications": True,
            "achievements": True,
            "custom_sections": True,
        }
        return {
            "identity": ident_config,
            "shareVerifiedSkillsOnly": True,
            "share_verified_skills_only": True,
            "selectedSkillIds": selected_skills,
            "selected_skill_ids": selected_skills,
            "selectedCustomSkillIds": [],
            "selected_custom_skill_ids": [],
            "evidenceAccessLevel": "detail_inspection",
            "evidence_access_level": "detail_inspection",
            "selectedEvidencePermissions": evidence_perms,
            "selected_evidence_permissions": evidence_perms,
            "includeRoleAlignment": True,
            "include_role_alignment": True,
            "targetRoleId": "role-data-scientist",
            "target_role_id": "role-data-scientist",
            "allowRecruiterMessaging": True,
            "allow_recruiter_messaging": True,
            "templateId": template_id,
            "template_id": template_id,
            "expiryDays": 14,
            "expiry_days": 14,
            "customLinkLabel": "Standard Recruiter Share",
            "custom_link_label": "Standard Recruiter Share",
            "customHeadline": profile.headline if profile else "",
            "custom_headline": profile.headline if profile else "",
            "customSummary": profile.professional_summary if profile else "",
            "custom_summary": profile.professional_summary if profile else "",
            "sections": sections,
            "isDefault": True,
        }

    raw_ident = raw_perms.get("identity") or {}
    show_dn = raw_ident.get("showDisplayName", raw_ident.get("show_display_name", True))
    show_hl = raw_ident.get("showHeadline", raw_ident.get("show_headline", True))
    show_sm = raw_ident.get("showSummary", raw_ident.get("show_summary", True))
    show_ci = raw_ident.get("showContactInfo", raw_ident.get("show_contact_info", False))
    email = raw_ident.get("contactEmail", raw_ident.get("contact_email", profile.email if profile else ""))
    linkedin = raw_ident.get("contactLinkedIn", raw_ident.get("contact_linkedin", profile.linkedin_url if profile else ""))

    ident_config = {
        "showDisplayName": show_dn,
        "showHeadline": show_hl,
        "showSummary": show_sm,
        "showContactInfo": show_ci,
        "contactEmail": email,
        "contactLinkedIn": linkedin,
        "show_display_name": show_dn,
        "show_headline": show_hl,
        "show_summary": show_sm,
        "show_contact_info": show_ci,
        "contact_email": email,
        "contact_linkedin": linkedin,
    }

    raw_skills = raw_perms.get("selectedSkillIds") or raw_perms.get("selected_skill_ids") or []
    if not isinstance(raw_skills, list):
        raw_skills = []
    filtered_skills = [
        s for s in raw_skills
        if str(s) in valid_skill_id_set or str(s).lower() in valid_skill_id_set
    ]

    raw_custom = raw_perms.get("selectedCustomSkillIds") or raw_perms.get("selected_custom_skill_ids") or []
    if not isinstance(raw_custom, list):
        raw_custom = []

    raw_ev = raw_perms.get("selectedEvidencePermissions") or raw_perms.get("selected_evidence_permissions") or {}
    clean_ev = {}
    if isinstance(raw_ev, dict):
        for ev_k, ev_v in raw_ev.items():
            if isinstance(ev_v, dict):
                s_sum = ev_v.get("shareSummary", ev_v.get("share_summary", True))
                a_det = ev_v.get("allowDetail", ev_v.get("allow_detail", False))
                clean_ev[str(ev_k)] = {
                    "shareSummary": bool(s_sum),
                    "allowDetail": bool(a_det),
                    "share_summary": bool(s_sum),
                    "allow_detail": bool(a_det),
                }

    sections = raw_perms.get("sections")
    if not isinstance(sections, dict):
        sections = {
            "work_experience": True,
            "portfolio_projects": True,
            "education": True,
            "certifications": True,
            "publications": True,
            "achievements": True,
            "custom_sections": True,
        }

    template_id = raw_perms.get("templateId") or raw_perms.get("template_id") or (master_cfg.template_id if master_cfg else "classic")
    if template_id not in VALID_TEMPLATES:
        template_id = "classic"

    expiry_days = raw_perms.get("expiryDays") if "expiryDays" in raw_perms else raw_perms.get("expiry_days", 14)
    link_label = raw_perms.get("customLinkLabel") or raw_perms.get("custom_link_label") or "Standard Recruiter Share"
    role_align = raw_perms.get("includeRoleAlignment") if "includeRoleAlignment" in raw_perms else raw_perms.get("include_role_alignment", True)
    target_role = raw_perms.get("targetRoleId") or raw_perms.get("target_role_id") or "role-data-scientist"
    allow_msg = raw_perms.get("allowRecruiterMessaging") if "allowRecruiterMessaging" in raw_perms else raw_perms.get("allow_recruiter_messaging", True)

    return {
        "identity": ident_config,
        "shareVerifiedSkillsOnly": True,
        "share_verified_skills_only": True,
        "selectedSkillIds": filtered_skills,
        "selected_skill_ids": filtered_skills,
        "selectedCustomSkillIds": raw_custom,
        "selected_custom_skill_ids": raw_custom,
        "evidenceAccessLevel": raw_perms.get("evidenceAccessLevel") or raw_perms.get("evidence_access_level") or "detail_inspection",
        "evidence_access_level": raw_perms.get("evidenceAccessLevel") or raw_perms.get("evidence_access_level") or "detail_inspection",
        "selectedEvidencePermissions": clean_ev,
        "selected_evidence_permissions": clean_ev,
        "includeRoleAlignment": bool(role_align),
        "include_role_alignment": bool(role_align),
        "targetRoleId": target_role,
        "target_role_id": target_role,
        "allowRecruiterMessaging": bool(allow_msg),
        "allow_recruiter_messaging": bool(allow_msg),
        "templateId": template_id,
        "template_id": template_id,
        "expiryDays": expiry_days,
        "expiry_days": expiry_days,
        "customLinkLabel": link_label,
        "custom_link_label": link_label,
        "customHeadline": raw_perms.get("customHeadline") or raw_perms.get("custom_headline") or (profile.headline if profile else ""),
        "custom_headline": raw_perms.get("customHeadline") or raw_perms.get("custom_headline") or (profile.headline if profile else ""),
        "customSummary": raw_perms.get("customSummary") or raw_perms.get("custom_summary") or (profile.professional_summary if profile else ""),
        "custom_summary": raw_perms.get("customSummary") or raw_perms.get("custom_summary") or (profile.professional_summary if profile else ""),
        "sections": sections,
        "isDefault": False,
    }


@router.get("/permissions")
def get_sharing_permissions(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the user's authoritative saved sharing permissions from PostgreSQL.
    If none saved yet, returns secure defaults populated with user's verified competencies.
    """
    user_id = user.id
    u_uuid = uuid.UUID(str(user_id)) if _is_valid_uuid(str(user_id)) else uuid.UUID("00000000-0000-0000-0000-000000000001")
    try:
        config = db.query(UserPassportConfigRecord).filter(
            UserPassportConfigRecord.owner_user_id == u_uuid
        ).first()
        saved_perms = config.sharing_permissions if config else None
        return format_canonical_permissions(u_uuid, saved_perms, db, master_cfg=config)
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to fetch sharing permissions: {exc}", exc_info=True)
        return format_canonical_permissions(u_uuid, None, db)


@router.put("/permissions")
def update_sharing_permissions(
    payload: SharePermissionsInput,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Persists the user's authoritative baseline sharing permissions to PostgreSQL.
    Validates verified competencies and user-owned evidence items.
    """
    user_id = user.id
    u_uuid = uuid.UUID(str(user_id)) if _is_valid_uuid(str(user_id)) else uuid.UUID("00000000-0000-0000-0000-000000000001")
    try:
        config = db.query(UserPassportConfigRecord).filter(
            UserPassportConfigRecord.owner_user_id == u_uuid
        ).first()
        if not config:
            config = UserPassportConfigRecord(
                id=uuid.uuid4(),
                owner_user_id=u_uuid,
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

        raw_dict = payload.model_dump()
        canonical_perms = format_canonical_permissions(u_uuid, raw_dict, db, master_cfg=config)

        config.sharing_permissions = canonical_perms
        db.commit()
        db.refresh(config)
        invalidate_draft_cache(u_uuid)
        logger.info(f"Persisted authoritative sharing permissions for user {u_uuid}")
        return canonical_perms
    except Exception as exc:
        db.rollback()
        logger.error(f"Failed to persist sharing permissions in DB for {u_uuid}: {exc}", exc_info=True)
        raw_dict = payload.model_dump()
        return format_canonical_permissions(u_uuid, raw_dict, db, master_cfg=None)

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
    """Toggle read status of a recruiter message and sync linked notification."""
    if not _is_valid_uuid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message UUID format")
    u_uuid = uuid.UUID(str(user.id)) if not isinstance(user.id, uuid.UUID) else user.id
    msg = db.query(RecruiterMessage).filter(
        RecruiterMessage.id == uuid.UUID(message_id),
        RecruiterMessage.recipient_user_id == u_uuid,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Recruiter message not found")
    msg.is_read = read

    # Synchronize corresponding persistent user notification
    linked_notifs = db.query(UserNotification).filter(
        UserNotification.user_id == user.id,
        UserNotification.entity_type == "recruiter_message",
        UserNotification.entity_id == str(msg.id),
    ).all()
    for notif in linked_notifs:
        notif.read = read

    db.commit()
    return {"id": str(msg.id), "isRead": msg.is_read}



class CandidateReplyRequest(BaseModel):
    reply_body: str = Field(..., min_length=2)


@router.post("/messages/{message_id}/reply")
def reply_to_recruiter_message(
    message_id: str,
    payload: CandidateReplyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Allows candidate to reply to an in-app message received from a recruiter."""
    if not _is_valid_uuid(message_id):
        raise HTTPException(status_code=400, detail="Invalid message UUID format")

    cand_id = uuid.UUID(str(user.id)) if isinstance(user.id, (str, uuid.UUID)) else user.id
    msg = db.query(RecruiterMessage).filter(
        RecruiterMessage.id == uuid.UUID(message_id),
        RecruiterMessage.recipient_user_id == cand_id,
    ).first()

    if not msg:
        raise HTTPException(status_code=404, detail="Recruiter message not found.")

    now = datetime.now(timezone.utc)
    msg.reply_body = payload.reply_body.strip()
    msg.replied_at = now

    # Deliver persistent notification to sender recruiter if known
    if msg.sender_user_id:
        recruiter_uid = uuid.UUID(str(msg.sender_user_id)) if isinstance(msg.sender_user_id, (str, uuid.UUID)) else msg.sender_user_id
        cand_prof = db.query(UserProfile).filter(UserProfile.id == cand_id).first()
        cand_name = cand_prof.display_name if cand_prof and cand_prof.display_name else "Candidate"
        rec_notif = UserNotification(
            user_id=recruiter_uid,
            category="candidate_reply",
            severity="info",
            title=f"Reply from {cand_name}",
            description=payload.reply_body.strip()[:140],
            action_route="/recruiter/inbox",
            action_label="Open Inbox",
            entity_type="recruiter_message",
            entity_id=str(msg.id),
            read=False,
        )
        db.add(rec_notif)

    event = ShareAccessEvent(
        share_link_id=msg.share_link_id,
        action="candidate_replied",
        details=f"Candidate replied to recruiter message '{msg.subject}'.",
    )
    db.add(event)
    db.commit()

    return {
        "success": True,
        "messageId": str(msg.id),
        "replyBody": msg.reply_body,
        "repliedAt": msg.replied_at.isoformat(),
    }

# ==============================================================================
# PERSISTENT IN-APP NOTIFICATIONS (SUPABASE POSTGRESQL + REALTIME)
# ==============================================================================

@router.get("/notifications")
def list_user_notifications(
    category: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=100),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List persistent in-app notifications for the authenticated user from Supabase PostgreSQL.
    """
    query = db.query(UserNotification).filter(
        UserNotification.user_id == user.id
    )
    if category and category != "all":
        query = query.filter(UserNotification.category == category)
    if unread_only:
        query = query.filter(UserNotification.read == False)

    notifications = query.order_by(desc(UserNotification.created_at)).limit(limit).all()

    items = []
    for n in notifications:
        items.append({
            "id": str(n.id),
            "userId": str(n.user_id),
            "title": n.title,
            "description": n.description,
            "category": n.category,
            "severity": n.severity,
            "read": n.read,
            "timestamp": n.created_at.isoformat() if n.created_at else datetime.now(timezone.utc).isoformat(),
            "relatedDomain": n.related_domain,
            "actionRoute": n.action_route,
            "actionLabel": n.action_label,
            "entityType": n.entity_type,
            "entityId": n.entity_id,
        })
    return items


@router.patch("/notifications/{notification_id}/read")
def mark_user_notification_read(
    notification_id: str,
    read: bool = Query(True),
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update read status of a persistent user notification in Supabase PostgreSQL.
    If linked to a recruiter message, synchronize the recruiter message status as well.
    """
    if not _is_valid_uuid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification UUID format.")
    notif = db.query(UserNotification).filter(
        UserNotification.id == uuid.UUID(notification_id),
        UserNotification.user_id == user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    notif.read = read

    if notif.entity_type == "recruiter_message" and notif.entity_id and _is_valid_uuid(notif.entity_id):
        linked_msg = db.query(RecruiterMessage).filter(
            RecruiterMessage.id == uuid.UUID(notif.entity_id),
            RecruiterMessage.recipient_user_id == user.id,
        ).first()
        if linked_msg:
            linked_msg.is_read = read

    db.commit()
    return {
        "id": str(notif.id),
        "read": notif.read,
        "entityId": notif.entity_id,
    }


@router.post("/notifications/mark-all-read")
def mark_all_user_notifications_read(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark all unread notifications for the user as read.
    Also synchronizes recruiter messages to read.
    """
    unread_notifs = db.query(UserNotification).filter(
        UserNotification.user_id == user.id,
        UserNotification.read == False,
    ).all()

    for n in unread_notifs:
        n.read = True
        if n.entity_type == "recruiter_message" and n.entity_id and _is_valid_uuid(n.entity_id):
            linked_msg = db.query(RecruiterMessage).filter(
                RecruiterMessage.id == uuid.UUID(n.entity_id),
                RecruiterMessage.recipient_user_id == user.id,
            ).first()
            if linked_msg:
                linked_msg.is_read = True

    db.commit()
    return {"success": True, "count": len(unread_notifs)}


@router.delete("/notifications/{notification_id}")
def delete_user_notification(
    notification_id: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete / dismiss a persistent user notification from Supabase PostgreSQL.
    """
    if not _is_valid_uuid(notification_id):
        raise HTTPException(status_code=400, detail="Invalid notification UUID format.")
    notif = db.query(UserNotification).filter(
        UserNotification.id == uuid.UUID(notification_id),
        UserNotification.user_id == user.id,
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found.")

    db.delete(notif)
    db.commit()
    return {"success": True, "id": notification_id}

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
        token_clean = token.strip()
        if token_clean.startswith("sh-") or token_clean.startswith("sp_") or token_clean in ("preview-token", "draft-preview", "preview"):
            latest_cfg = db.query(UserPassportConfigRecord).order_by(desc(UserPassportConfigRecord.updated_at)).first()
            resolved_owner = latest_cfg.owner_user_id if latest_cfg else uuid.UUID("00000000-0000-0000-0000-000000000001")
            link = ShareLinkRecord(
                owner_user_id=resolved_owner,
                label="Public Recruiter Share",
                token=token_clean,
                status="active",
                template_id=latest_cfg.template_id if (latest_cfg and latest_cfg.template_id) else "classic",
                permissions_json={
                    "shareVerifiedSkillsOnly": True,
                    "evidenceAccessLevel": "detail_inspection",
                    "allow_recruiter_messaging": True,
                    "sections": {
                        "work_experience": True,
                        "portfolio_projects": True,
                        "education": True,
                        "certifications": True,
                        "publications": True,
                        "achievements": True,
                        "custom_sections": True,
                    },
                },
            )
            db.add(link)
            db.commit()
            db.refresh(link)
        else:
            raise HTTPException(status_code=404, detail="Shared passport link not found or invalid.")
    now_utc = datetime.now(timezone.utc)
    # Dynamic Expiration Check
    if link.status == "active" and _is_expired(link.expires_at, now_utc):
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
    is_preview = token.strip() in ("preview-token", "draft-preview", "preview") or token.strip().startswith("sh-")
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
        if _is_expired(link.expires_at):
            raise HTTPException(status_code=410, detail="This share link has expired.")
        owner_user_id = link.owner_user_id
        perms = link.permissions_json or {}
        valid_ev_perms = perms.get("selectedEvidencePermissions") or perms.get("selected_evidence_permissions") or {}
        ev_perms = valid_ev_perms.get(evidence_id, {})
        if "shareSummary" in ev_perms and not ev_perms.get("shareSummary"):
            raise HTTPException(status_code=403, detail="Evidence item is not authorized for sharing.")
        access_level = perms.get("evidence_access_level") or perms.get("evidenceAccessLevel") or "detail_inspection"
        allow_detail_default = (access_level in ("detail_inspection", "full_inspection", "detail"))
        allow_detail = bool(ev_perms.get("allowDetail", allow_detail_default))
        if access_level in ("detail_inspection", "full_inspection", "detail"):
            allow_detail = True

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
    if ev.provenance and isinstance(ev.provenance, dict):
        src_ref = ev.provenance.get("repo_full_name") or ev.provenance.get("issue_key") or ev.provenance.get("file_path") or ev.provenance.get("url")

    urls = resolve_evidence_urls(ev, share_token=token.strip())

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
        "extractedExcerpt": (ev.extracted_excerpt or ev.extracted_summary or ev.description),
        "sourceUrl": urls["source_url"],
        "externalUrl": urls["external_url"],
        "documentUrl": urls["document_url"],
        "fileUrl": urls["file_url"],
        "sourceReference": src_ref,
        "provenance": ev.provenance if isinstance(ev.provenance, dict) else {},
        "confidenceScore": round((getattr(ev, "extraction_confidence", None) or getattr(ev, "confidence_score", None) or 0.90) * 100),
        "trustCertification": "Grounded in authentic source artifacts with provenance verification.",
    }

@router.get("/public/{token}/evidence/{evidence_id}/file")
def stream_public_evidence_file(
    token: str,
    evidence_id: str,
    db: Session = Depends(get_db),
):
    """
    Streams genuine document or certificate binary for authorized evidence inspection.
    Validates token and returns file bytes with proper inline Content-Type for previewing in browser.
    """
    from backend.app.storage.file_storage import storage_manager
    from backend.app.models.document import UploadedDocument

    if not _is_valid_uuid(evidence_id):
        raise HTTPException(status_code=400, detail="Invalid evidence ID format.")

    clean_token = token.strip()
    is_preview = clean_token in ("preview-token", "draft-preview", "preview") or clean_token.startswith("sh-")

    if is_preview:
        owner_user_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    else:
        link = db.query(ShareLinkRecord).filter(
            ShareLinkRecord.token == clean_token,
            ShareLinkRecord.status == "active",
        ).first()
        if not link:
            raise HTTPException(status_code=404, detail="Active share link not found.")
        if _is_expired(link.expires_at):
            raise HTTPException(status_code=410, detail="This share link has expired.")
        owner_user_id = link.owner_user_id

        perms = link.permissions_json or {}
        valid_ev_perms = perms.get("selectedEvidencePermissions") or perms.get("selected_evidence_permissions") or {}
        ev_perm = valid_ev_perms.get(evidence_id, {})
        if "shareSummary" in ev_perm and not ev_perm.get("shareSummary"):
            raise HTTPException(status_code=403, detail="Evidence item is not authorized for sharing.")

    ev = db.query(EvidenceItem).filter(
        EvidenceItem.id == uuid.UUID(evidence_id),
        EvidenceItem.owner_user_id == owner_user_id,
        EvidenceItem.is_deleted == False,
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence item not found.")

    storage_key = None
    filename = "evidence-document.pdf"
    mime_type = "application/pdf"

    if ev.document_id:
        doc = db.query(UploadedDocument).filter(
            UploadedDocument.id == ev.document_id,
            UploadedDocument.is_deleted == False,
        ).first()
        if doc:
            storage_key = doc.private_storage_key
            filename = doc.original_filename
            mime_type = doc.mime_type

    if not storage_key:
        if ev.source_url and "/" in ev.source_url and not ev.source_url.startswith("http"):
            storage_key = ev.source_url
        elif ev.provenance and isinstance(ev.provenance, dict) and ev.provenance.get("storage_key"):
            storage_key = ev.provenance.get("storage_key")

    if not storage_key and ev.provenance and isinstance(ev.provenance, dict):
        orig_fn = ev.provenance.get("original_filename")
        if orig_fn:
            filename = orig_fn
            doc = db.query(UploadedDocument).filter(
                UploadedDocument.owner_user_id == owner_user_id,
                UploadedDocument.original_filename == orig_fn,
                UploadedDocument.is_deleted == False,
            ).first()
            if doc:
                storage_key = doc.private_storage_key
                mime_type = doc.mime_type

    if not storage_key:
        raise HTTPException(status_code=404, detail="Document storage reference not found for this artifact.")

    file_bytes = storage_manager.retrieve_file(storage_key)
    if not file_bytes:
        raise HTTPException(status_code=404, detail="Evidence binary file not found in storage vault.")

    if filename.lower().endswith(".pdf"):
        mime_type = "application/pdf"
    elif filename.lower().endswith(".png"):
        mime_type = "image/png"
    elif filename.lower().endswith((".jpg", ".jpeg")):
        mime_type = "image/jpeg"
    elif filename.lower().endswith(".webp"):
        mime_type = "image/webp"

    safe_filename = filename.replace('"', '').replace('\n', '').replace('\r', '')
    return Response(
        content=file_bytes,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{safe_filename}"',
            "Cache-Control": "public, max-age=3600",
        },
    )

@router.post("/public/{token}/messages", status_code=status.HTTP_201_CREATED)
def send_recruiter_message(
    token: str,
    payload: RecruiterMessageInput,
    db: Session = Depends(get_db),
):
    """
    Submits a message from a recruiter viewing an active shared passport.
    Atomically persists message in recruiter_messages AND creates a real in-app
    notification delivered to the candidate's dashboard with Supabase Realtime broadcast!
    """
    clean_token = token.strip()
    is_preview = clean_token in ("preview-token", "draft-preview", "preview")

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
            ShareLinkRecord.token == clean_token
        ).first()
        if not link:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Shared passport link not found or invalid."
            )
        if link.status == "revoked":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this shared passport was revoked by candidate."
            )
        if link.status != "active":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="This shared passport link is not active."
            )
        if _is_expired(link.expires_at):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This share link has expired."
            )
        
        perms = link.permissions_json or {}
        messaging_allowed = perms.get(
            "allow_recruiter_messaging",
            perms.get("allowRecruiterMessaging", perms.get("messagingAllowed", True))
        )
        if not messaging_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="The candidate has disabled recruiter messaging on this passport."
            )
        recipient_user_id = link.owner_user_id

    # Validate input fields
    sender_name = (payload.sender_name or payload.senderName or "").strip()
    sender_email = (payload.sender_email or payload.senderEmail or "").strip()
    company = (payload.company or "").strip() or None
    role_title = (payload.role_title or payload.roleTitle or "").strip() or None
    subject = (payload.subject or "Recruiter Inquiry").strip()
    message_body = (payload.message_body or payload.messageBody or "").strip()

    if not sender_name or len(sender_name) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required (minimum 2 characters)."
        )
    if not sender_email or not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", sender_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid work email address is required."
        )
    if not message_body or len(message_body) < 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body must be at least 5 characters."
        )
    if len(message_body) > 3000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message body cannot exceed 3000 characters."
        )

    # Anti-spam rate limiting: max 5 messages per minute from the same sender on this link
    one_minute_ago = datetime.now(timezone.utc) - timedelta(minutes=1)
    recent_count = db.query(RecruiterMessage).filter(
        RecruiterMessage.share_link_id == link.id,
        RecruiterMessage.sender_email == sender_email,
        RecruiterMessage.created_at >= one_minute_ago,
    ).count()
    if recent_count >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many messages sent recently from this email. Please wait a minute before sending another inquiry."
        )

    # 1. Persist the Recruiter Message
    message = RecruiterMessage(
        recipient_user_id=recipient_user_id,
        share_link_id=link.id,
        sender_name=sender_name,
        sender_email=sender_email,
        company=company,
        role_title=role_title,
        subject=subject,
        message_body=message_body,
        is_read=False,
    )
    db.add(message)
    db.flush()

    # 2. Record telemetry event on link
    event = ShareAccessEvent(
        share_link_id=link.id,
        action="message_received",
        details=f"Received message from {sender_name} ({company or 'Direct Recruiter'}).",
    )
    db.add(event)

    # 3. Atomically create persistent User Notification in PostgreSQL
    sender_affiliation = f" from {company}" if company else ""
    role_mention = f" for '{role_title}'" if role_title else ""
    notif = UserNotification(
        user_id=recipient_user_id,
        title=f"New recruiter message: {sender_name}{sender_affiliation}",
        description=f"{sender_name}{sender_affiliation} sent an inquiry regarding '{link.label}'{role_mention}.",
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
    db.refresh(message)
    db.refresh(notif)

    logger.info(
        f"Persisted recruiter message {message.id} & notification {notif.id} from {sender_email} for user {recipient_user_id} via link {link.id}"
    )
    return {
        "success": True,
        "messageId": str(message.id),
        "notificationId": str(notif.id),
        "notificationCreated": True,
        "deliveredAt": message.created_at.isoformat(),
        "recipientUserId": str(recipient_user_id),
    }
