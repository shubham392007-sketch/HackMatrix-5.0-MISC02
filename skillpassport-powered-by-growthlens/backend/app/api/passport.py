import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import (
    VerificationDecision,
    EvidenceConflictRecord,
    HallucinationGuardResult,
    HumanReviewTask,
)
from backend.app.models.audit import ReviewAuditEvent
from backend.app.ai.verification_service import verification_service
from backend.app.core.logging import get_logger

logger = get_logger("api.passport")
router = APIRouter(prefix="/passport", tags=["Domain 2: Skill Intelligence & Passport"])

PROFICIENCY_RANKS = {
    "Not Established": 0,
    "Foundational": 1,
    "Foundation": 1,
    "Working": 2,
    "Intermediate": 3,
    "Practitioner": 3,
    "Advanced": 4,
    "Expert": 5,
}

CANONICAL_RUBRICS = {
    "Foundation": "Understands underlying architectural theory and principles; passes conceptual assessments.",
    "Working": "Applies standard syntax, library patterns, and standard configurations under supervised engineering review.",
    "Practitioner": "Designs, implements, and debugs independent production features, microservices, or data pipelines.",
    "Advanced": "Architects resilient multi-tier distributed topologies, handles performance bottlenecks, and leads peer design reviews.",
    "Expert": "Defines core engineering standards, publishes domain frameworks, and orchestrates enterprise-scale mission-critical infrastructure.",
}


class CandidateReviewRequest(BaseModel):
    action: str = Field(..., description="'verify', 'reject', or 'flag_insufficient'")
    rationale: str = Field(..., min_length=3, description="Justification for the review decision")


# ==============================================================================
# 1. VERIFIED SKILLS & CAPABILITY PROFILE
# ==============================================================================

@router.get("/skills")
def list_passport_skills(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns the authenticated user's canonical skill profile aggregated strictly from
    persisted EvidenceCompetencyMappings and VerificationDecisions. Zero demo data.
    """
    owner_uuid = uuid.UUID(user.id)

    # 1. Fetch user's evidence mappings with competency taxonomy and evidence details
    mappings = (
        db.query(EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem)
        .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
        .join(EvidenceItem, EvidenceCompetencyMapping.evidence_id == EvidenceItem.id)
        .filter(
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
            EvidenceItem.is_deleted == False,
        )
        .all()
    )

    # 2. Fetch user's verification decisions
    decisions = (
        db.query(VerificationDecision)
        .filter(VerificationDecision.owner_user_id == owner_uuid)
        .order_by(desc(VerificationDecision.created_at))
        .all()
    )
    decision_by_mapping = {d.candidate_mapping_id: d for d in decisions if d.candidate_mapping_id}
    decision_by_comp = {}
    for d in decisions:
        if d.competency_id and d.competency_id not in decision_by_comp:
            decision_by_comp[d.competency_id] = d

    # 3. Check open evidence conflicts for owner
    open_conflicts = (
        db.query(EvidenceConflictRecord)
        .filter(
            EvidenceConflictRecord.owner_user_id == owner_uuid,
            EvidenceConflictRecord.status == "open",
        )
        .all()
    )
    conflicted_evidence_ids = set()
    for c in open_conflicts:
        if c.evidence_a_id:
            conflicted_evidence_ids.add(c.evidence_a_id)
        if c.evidence_b_id:
            conflicted_evidence_ids.add(c.evidence_b_id)

    # 4. Group by Competency
    comp_groups: Dict[uuid.UUID, Dict[str, Any]] = {}
    for mapping, comp, ev in mappings:
        cid = comp.id
        if cid not in comp_groups:
            comp_groups[cid] = {
                "competency": comp,
                "mappings": [],
                "evidence_items": [],
            }
        comp_groups[cid]["mappings"].append(mapping)
        comp_groups[cid]["evidence_items"].append(ev)

    skill_items = []
    verified_skills = []
    distinct_verified_evidence_ids = set()

    for cid, data in comp_groups.items():
        comp: CompetencyTaxonomy = data["competency"]
        cmap_list: List[EvidenceCompetencyMapping] = data["mappings"]
        ev_list: List[EvidenceItem] = data["evidence_items"]

        # Determine verification state
        has_verified_mapping = any(m.status == "verified" for m in cmap_list)
        comp_decision = decision_by_comp.get(cid)
        has_verified_decision = comp_decision and comp_decision.verification_state == "verified"

        if has_verified_mapping or has_verified_decision:
            verif_state = "verified"
        elif any(m.status == "candidate" for m in cmap_list):
            verif_state = "candidate"
        elif any(m.status == "insufficient" for m in cmap_list):
            verif_state = "insufficient_evidence"
        else:
            verif_state = "rejected"

        # Determine proficiencies
        raw_levels = [m.proficiency_level for m in cmap_list if m.proficiency_level]
        if not raw_levels:
            raw_levels = ["Practitioner"]
        sorted_levels = sorted(raw_levels, key=lambda l: PROFICIENCY_RANKS.get(l, 2), reverse=True)
        estimated_prof = sorted_levels[0]

        if verif_state == "verified":
            verified_prof = estimated_prof
        else:
            verified_prof = "Not Established"

        # Distinct evidence IDs
        ev_ids = list({str(e.id) for e in ev_list})
        if verif_state == "verified":
            for eid in ev_ids:
                distinct_verified_evidence_ids.add(eid)

        # Coverage state calculation
        has_conflict = any(e.id in conflicted_evidence_ids for e in ev_list)
        if has_conflict:
            coverage_state = "conflicting"
        elif len(ev_ids) >= 2 or any(e.evidence_strength == "high" for e in ev_list):
            coverage_state = "sufficient"
        elif len(ev_ids) == 1:
            coverage_state = "incomplete"
        else:
            coverage_state = "insufficient"

        # Rationale & Limitations
        newest_mapping = sorted(cmap_list, key=lambda m: m.created_at or datetime.min, reverse=True)[0]
        rationale = newest_mapping.rationale or f"Evidence extracted across {len(ev_ids)} attributable work artifacts."
        if comp_decision and comp_decision.decision_rationale:
            rationale = comp_decision.decision_rationale

        if coverage_state == "sufficient":
            limitations = "Corroborated across multiple independent artifacts. Ready for high-assurance credential export."
        elif coverage_state == "incomplete":
            limitations = "Single evidence artifact observed. Connect an additional repository or project document to substantiate depth."
        elif coverage_state == "conflicting":
            limitations = "Conflicting attributions detected across source records. Review required in Trust Center."
        else:
            limitations = "Zero workplace artifacts confirm this capability. Theoretical or self-reported only."

        # Latest observed evidence date
        dates = [e.observed_timestamp for e in ev_list if e.observed_timestamp]
        latest_date_str = max(dates).strftime("%Y-%m-%d") if dates else "Recently"

        # Confidence
        avg_relevance = sum(m.relevance_score for m in cmap_list) / len(cmap_list) if cmap_list else 0.85
        confidence_pct = min(99, max(50, round(avg_relevance * 100)))

        item = {
            "id": str(comp.id),
            "canonicalName": comp.canonical_name,
            "definition": comp.description,
            "category": comp.category,
            "aliases": comp.aliases or [],
            "relatedSkillIds": [],
            "prerequisiteSkillIds": [str(comp.parent_competency_id)] if comp.parent_competency_id else [],
            "verificationState": verif_state,
            "estimatedProficiency": estimated_prof,
            "verifiedProficiency": verified_prof,
            "confidence": confidence_pct,
            "evidenceStrength": "high" if coverage_state == "sufficient" else ("medium" if coverage_state == "incomplete" else "low"),
            "evidenceIds": ev_ids,
            "coverageState": coverage_state,
            "assessmentRationale": rationale,
            "limitations": limitations,
            "lastEvidenceDate": latest_date_str,
        }

        skill_items.append(item)
        if verif_state == "verified":
            verified_skills.append(item)

    # Top proficiency calculation
    if verified_skills:
        highest_rank = max(PROFICIENCY_RANKS.get(s["verifiedProficiency"], 0) for s in verified_skills)
        top_tier_skills = [s for s in verified_skills if PROFICIENCY_RANKS.get(s["verifiedProficiency"], 0) == highest_rank]
        top_prof_name = top_tier_skills[0]["verifiedProficiency"]
        top_skill_names = " & ".join(s["canonicalName"] for s in top_tier_skills[:2])
        top_proficiency_display = {
            "level": top_prof_name,
            "skills_preview": top_skill_names,
        }
    else:
        top_proficiency_display = {
            "level": "None Established",
            "skills_preview": "No verified competencies",
        }

    # Avg extraction confidence
    if verified_skills:
        avg_conf = round(sum(s["confidence"] for s in verified_skills) / len(verified_skills))
    else:
        avg_conf = 0

    return {
        "skills": skill_items,
        "metrics": {
            "total_tracked": len(skill_items),
            "verified_count": len(verified_skills),
            "linked_artifacts_count": len(distinct_verified_evidence_ids),
            "top_proficiency": top_proficiency_display["level"],
            "top_proficiency_details": top_proficiency_display,
            "avg_extraction_confidence": avg_conf,
        },
    }


@router.get("/skills/{skill_id}")
def get_passport_skill_detail(
    skill_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns complete profile for a single competency with linked artifacts and rubric.
    """
    owner_uuid = uuid.UUID(user.id)
    try:
        comp_uuid = uuid.UUID(skill_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid skill ID format")

    comp = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == comp_uuid).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Competency not found in canonical taxonomy")

    mappings = (
        db.query(EvidenceCompetencyMapping, EvidenceItem)
        .join(EvidenceItem, EvidenceCompetencyMapping.evidence_id == EvidenceItem.id)
        .filter(
            EvidenceCompetencyMapping.competency_id == comp_uuid,
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
            EvidenceItem.is_deleted == False,
        )
        .all()
    )

    linked_artifacts = []
    for m, ev in mappings:
        linked_artifacts.append({
            "mapping_id": str(m.id),
            "evidence_id": str(ev.id),
            "title": ev.title,
            "source_provider": ev.source_provider,
            "source_type": ev.source_type,
            "source_url": ev.source_url,
            "extracted_excerpt": m.supporting_excerpt or ev.extracted_excerpt,
            "rationale": m.rationale,
            "status": m.status,
            "proficiency_level": m.proficiency_level,
            "relevance_score": m.relevance_score,
            "observed_timestamp": ev.observed_timestamp.isoformat() if ev.observed_timestamp else None,
        })

    # Related siblings in same category
    siblings = (
        db.query(CompetencyTaxonomy)
        .filter(
            CompetencyTaxonomy.category == comp.category,
            CompetencyTaxonomy.id != comp.id,
        )
        .limit(4)
        .all()
    )

    return {
        "id": str(comp.id),
        "canonical_name": comp.canonical_name,
        "category": comp.category,
        "definition": comp.description,
        "aliases": comp.aliases or [],
        "taxonomy_version": comp.taxonomy_version,
        "parent_competency_id": str(comp.parent_competency_id) if comp.parent_competency_id else None,
        "linked_artifacts": linked_artifacts,
        "related_competencies": [
            {"id": str(s.id), "canonical_name": s.canonical_name, "category": s.category}
            for s in siblings
        ],
        "rubric": CANONICAL_RUBRICS,
    }


# ==============================================================================
# 2. CANONICAL TAXONOMY & ONTOLOGY
# ==============================================================================

@router.get("/taxonomy")
def list_canonical_taxonomy(
    search: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns canonical taxonomy categories and competencies from CompetencyTaxonomy.
    """
    query = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.status == "active")

    if category and category.lower() != "all":
        query = query.filter(CompetencyTaxonomy.category == category)

    if search and search.strip():
        q = f"%{search.strip().lower()}%"
        query = query.filter(
            func.lower(CompetencyTaxonomy.canonical_name).like(q)
            | func.lower(CompetencyTaxonomy.description).like(q)
        )

    comps = query.order_by(CompetencyTaxonomy.category, CompetencyTaxonomy.canonical_name).all()

    # Build category breakdown
    cat_counts = (
        db.query(CompetencyTaxonomy.category, func.count(CompetencyTaxonomy.id))
        .filter(CompetencyTaxonomy.status == "active")
        .group_by(CompetencyTaxonomy.category)
        .all()
    )

    categories = [
        {
            "id": f"cat-{cat.lower().replace(' ', '-').replace('&', 'and')}",
            "name": cat,
            "description": f"Domain specifications and competencies for {cat}.",
            "competency_count": count,
        }
        for cat, count in cat_counts
    ]

    return {
        "categories": categories,
        "competencies": [
            {
                "id": str(c.id),
                "canonical_name": c.canonical_name,
                "normalized_name": c.normalized_name,
                "category": c.category,
                "description": c.description,
                "aliases": c.aliases or [],
                "parent_competency_id": str(c.parent_competency_id) if c.parent_competency_id else None,
                "taxonomy_version": c.taxonomy_version,
            }
            for c in comps
        ],
        "total_catalogued": len(comps),
    }


# ==============================================================================
# 3. CANDIDATE REVIEW & ADJUDICATION
# ==============================================================================

@router.get("/candidates")
def list_candidate_claims(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Lists unverified candidate skill claims for the authenticated user requiring review.
    """
    owner_uuid = uuid.UUID(user.id)

    # Candidate mappings
    candidates = (
        db.query(EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem)
        .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
        .join(EvidenceItem, EvidenceCompetencyMapping.evidence_id == EvidenceItem.id)
        .filter(
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
            EvidenceCompetencyMapping.status.in_(["candidate", "insufficient", "flagged"]),
            EvidenceItem.is_deleted == False,
        )
        .order_by(desc(EvidenceCompetencyMapping.created_at))
        .all()
    )

    # Fetch Guard results for linked evidence
    ev_ids = [m.evidence_id for m, _, _ in candidates]
    guards = (
        db.query(HallucinationGuardResult)
        .filter(
            HallucinationGuardResult.owner_user_id == owner_uuid,
            HallucinationGuardResult.evidence_id.in_(ev_ids),
        )
        .all()
    ) if ev_ids else []
    guard_map = {g.evidence_id: g for g in guards}

    claims_out = []
    for mapping, comp, ev in candidates:
        guard = guard_map.get(ev.id)
        guard_outcome = guard.guard_outcome if guard else "UNEVALUATED"

        claims_out.append({
            "mapping_id": str(mapping.id),
            "competency_id": str(comp.id),
            "canonical_name": comp.canonical_name,
            "category": comp.category,
            "definition": comp.description,
            "proposed_proficiency": mapping.proficiency_level or "Practitioner",
            "confidence": min(99, max(50, round((mapping.relevance_score or 0.85) * 100))),
            "extraction_rationale": mapping.rationale,
            "supporting_excerpt": mapping.supporting_excerpt or ev.extracted_excerpt,
            "status": mapping.status,
            "evidence_id": str(ev.id),
            "evidence_title": ev.title,
            "evidence_source": ev.source_provider,
            "evidence_type": ev.source_type,
            "evidence_strength": ev.evidence_strength,
            "evidence_date": ev.observed_timestamp.strftime("%Y-%m-%d") if ev.observed_timestamp else "Recently",
            "guard_outcome": guard_outcome,
            "created_at": mapping.created_at.isoformat() if mapping.created_at else None,
        })

    return {"candidates": claims_out, "total": len(claims_out)}


@router.post("/candidates/{mapping_id}/review")
def review_candidate_claim(
    mapping_id: str,
    req: CandidateReviewRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Submits formal adjudication decision on a candidate claim.
    """
    owner_uuid = uuid.UUID(user.id)
    try:
        target_uuid = uuid.UUID(mapping_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid ID format")

    # 1. Lookup by EvidenceCompetencyMapping.id
    mapping = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.id == target_uuid,
        EvidenceCompetencyMapping.owner_user_id == owner_uuid,
    ).first()

    # 2. If not found by mapping ID, lookup by competency_id
    if not mapping:
        mapping = db.query(EvidenceCompetencyMapping).filter(
            EvidenceCompetencyMapping.competency_id == target_uuid,
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
            EvidenceCompetencyMapping.status.in_(["candidate", "insufficient", "flagged", "unreviewed"]),
        ).first()

    if not mapping:
        raise HTTPException(status_code=404, detail="Candidate skill claim not found")

    try:
        res = verification_service.review_candidate_skill(
            db=db,
            owner_user_id=owner_uuid,
            candidate_mapping_id=mapping.id,
            action=req.action,
            rationale=req.rationale,
            reviewer_id=owner_uuid,
        )
        return res

    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error reviewing candidate claim {mapping_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal verification failure")


# ==============================================================================
# 4. EVIDENCE COVERAGE ANALYSIS
# ==============================================================================

@router.get("/coverage")
def get_evidence_coverage_summary(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Calculates deterministic evidence coverage health across all tracked user skills.
    Zero demo data.
    """
    owner_uuid = uuid.UUID(user.id)

    mappings = (
        db.query(EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem)
        .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
        .join(EvidenceItem, EvidenceCompetencyMapping.evidence_id == EvidenceItem.id)
        .filter(
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
            EvidenceItem.is_deleted == False,
        )
        .all()
    )

    open_conflicts = (
        db.query(EvidenceConflictRecord)
        .filter(
            EvidenceConflictRecord.owner_user_id == owner_uuid,
            EvidenceConflictRecord.status == "open",
        )
        .all()
    )
    conflicted_ev_ids = {c.evidence_a_id for c in open_conflicts if c.evidence_a_id} | {
        c.evidence_b_id for c in open_conflicts if c.evidence_b_id
    }

    comp_map: Dict[uuid.UUID, Dict[str, Any]] = {}
    for mapping, comp, ev in mappings:
        cid = comp.id
        if cid not in comp_map:
            comp_map[cid] = {
                "comp": comp,
                "mappings": [],
                "evidence": [],
            }
        comp_map[cid]["mappings"].append(mapping)
        comp_map[cid]["evidence"].append(ev)

    sufficient_items = []
    incomplete_items = []
    insufficient_items = []
    conflicting_items = []

    evaluated_competencies = []

    for cid, data in comp_map.items():
        comp: CompetencyTaxonomy = data["comp"]
        ev_list: List[EvidenceItem] = data["evidence"]
        cmap_list: List[EvidenceCompetencyMapping] = data["mappings"]

        distinct_ev_ids = list({str(e.id) for e in ev_list})
        has_conflict = any(e.id in conflicted_ev_ids for e in ev_list)

        if has_conflict:
            cov_state = "conflicting"
            rec_action = "Resolve contradictory source attributions in the Trust Center."
            conflicting_items.append(comp.canonical_name)
        elif len(distinct_ev_ids) >= 2 or any(e.evidence_strength == "high" for e in ev_list):
            cov_state = "sufficient"
            rec_action = "Coverage is robust and corroborated. Ready for verified passport export."
            sufficient_items.append(comp.canonical_name)
        elif len(distinct_ev_ids) == 1:
            cov_state = "incomplete"
            rec_action = "Connect an additional repository or PR to provide independent cross-source corroboration."
            incomplete_items.append(comp.canonical_name)
        else:
            cov_state = "insufficient"
            rec_action = "Upload project technical report or connect commit activity demonstrating practical execution."
            insufficient_items.append(comp.canonical_name)

        dates = [e.observed_timestamp for e in ev_list if e.observed_timestamp]
        latest_date_str = max(dates).strftime("%Y-%m-%d") if dates else "None recorded"

        is_verified = any(m.status == "verified" for m in cmap_list)
        verif_state = "verified" if is_verified else ("candidate" if any(m.status == "candidate" for m in cmap_list) else "insufficient_evidence")

        prof_levels = [m.proficiency_level for m in cmap_list if m.proficiency_level]
        prof = prof_levels[0] if prof_levels else "Practitioner"

        evaluated_competencies.append({
            "skill_id": str(comp.id),
            "canonical_name": comp.canonical_name,
            "category": comp.category,
            "verification_state": verif_state,
            "verified_proficiency": prof if is_verified else "Not Established",
            "coverage_state": cov_state,
            "linked_artifact_count": len(distinct_ev_ids),
            "last_corroboration_date": latest_date_str,
            "recommended_action": rec_action,
        })

    total_evaluated = len(evaluated_competencies)
    health_score = round((len(sufficient_items) / total_evaluated) * 100) if total_evaluated > 0 else 0

    return {
        "health_score": health_score,
        "counts": {
            "total": total_evaluated,
            "sufficient": len(sufficient_items),
            "incomplete": len(incomplete_items),
            "insufficient": len(insufficient_items),
            "conflicting": len(conflicting_items),
        },
        "sufficient_count": len(sufficient_items),
        "incomplete_count": len(incomplete_items),
        "insufficient_count": len(insufficient_items),
        "conflicting_count": len(conflicting_items),
        "total_skills": total_evaluated,
        "competencies": evaluated_competencies,
    }



# ==============================================================================
# 5. SKILL HISTORY & AUDIT TIMELINE
# ==============================================================================

@router.get("/history")
def get_skill_history_timeline(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Returns authentic lifecycle events for the user's competencies sourced strictly
    from ReviewAuditEvent and VerificationDecision. Zero mock data.
    """
    owner_uuid = uuid.UUID(user.id)
    if not isinstance(limit, int):
        limit = 50

    # 1. Fetch review audit events for this user
    audit_events = (
        db.query(ReviewAuditEvent)
        .filter(ReviewAuditEvent.actor_user_id == owner_uuid)
        .order_by(desc(ReviewAuditEvent.event_timestamp))
        .limit(limit)
        .all()
    )

    # 2. Fetch candidate mappings to resolve skill names
    mapping_ids = [e.target_record_id for e in audit_events if e.target_record_id]
    mappings = (
        db.query(EvidenceCompetencyMapping, CompetencyTaxonomy)
        .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
        .filter(EvidenceCompetencyMapping.id.in_(mapping_ids))
        .all()
    ) if mapping_ids else []
    mapping_comp_map = {m.id: comp for m, comp in mappings}

    events_out = []
    actor_name = user.metadata.get("full_name") or user.email or "Authorized Reviewer"

    for e in audit_events:
        comp = mapping_comp_map.get(e.target_record_id)
        skill_name = comp.canonical_name if comp else "Extracted Competency"
        skill_id = str(comp.id) if comp else str(e.target_record_id)

        # Map internal event_type to UI eventType
        if e.event_type == "verification_granted":
            ev_type = "verified_state_changed"
            prev_val = e.previous_state or "Candidate"
            new_val = f"Verified (Level: {e.audit_metadata.get('proficiency', 'Practitioner') if e.audit_metadata else 'Practitioner'})"
            actor = "SkillPassport Guard"
        elif e.event_type == "status_change":
            ev_type = "verified_state_changed"
            prev_val = e.previous_state or "Under Review"
            new_val = e.new_state or "Insufficient Evidence"
            actor = "SkillPassport Guard"
        elif "extract" in e.event_type:
            ev_type = "candidate_extracted"
            prev_val = "None"
            new_val = f"Candidate (Level: {e.new_state})"
            actor = "System Pipeline"
        elif "link" in e.event_type:
            ev_type = "evidence_linked"
            prev_val = "Unlinked"
            new_val = e.new_state or "Linked Artifact"
            actor = "System Pipeline"
        else:
            ev_type = "verified_state_changed"
            prev_val = e.previous_state or "Candidate"
            new_val = e.new_state or "Updated"
            actor = actor_name

        events_out.append({
            "id": str(e.id),
            "timestamp": e.event_timestamp.strftime("%Y-%m-%d %H:%M") if e.event_timestamp else "Recently",
            "skillId": skill_id,
            "skillName": skill_name,
            "eventType": ev_type,
            "previousValue": prev_val,
            "newValue": new_val,
            "reason": e.reason_note or "Authoritative verification policy transition",
            "relatedEvidenceId": str(e.target_record_id) if e.target_record_id else None,
            "actor": actor,
        })

    return {"events": events_out, "total": len(events_out)}
