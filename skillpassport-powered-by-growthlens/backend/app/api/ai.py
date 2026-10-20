import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, case

from backend.app.db.session import get_db
from backend.app.api.dependencies import get_current_user, AuthenticatedUser
from backend.app.models.evidence import EvidenceItem
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.ai_governance import (
    AIAnalysisRun,
    WorkAnalysisResult,
    EvidenceQualityAssessment,
    VerificationDecision,
    HallucinationGuardResult,
    OutputValidationRun,
    EvidenceConflictRecord,
    PromptInjectionFinding,
    HumanReviewTask,
    AIEvaluationSuiteRun,
)
from backend.app.models.audit import ReviewAuditEvent
from backend.app.ai.work_analyzer import work_analyzer
from backend.app.ai.skill_extractor import skill_extractor
from backend.app.ai.guard import hallucination_guard
from backend.app.ai.conflict_service import conflict_service
from backend.app.ai.verification_service import verification_service
from backend.app.ai.evaluation_service import evaluation_service
from backend.app.core.logging import get_logger

logger = get_logger("api.ai")

router = APIRouter(prefix="/ai", tags=["AI Intelligence & Trust Governance"])


# --- Pydantic Schemas ---

class AnalysisRunRequest(BaseModel):
    evidence_ids: List[str] = Field(..., description="List of evidence item UUIDs to analyze")


class SkillExtractionRunRequest(BaseModel):
    evidence_ids: List[str] = Field(..., description="List of evidence item UUIDs to extract skills from")


class GuardEvaluateRequest(BaseModel):
    evidence_id: Optional[str] = Field(default=None, description="Evidence UUID or 'none' for self-claims")
    claim_text: str = Field(..., description="Skill claim to evaluate")
    supporting_excerpt: Optional[str] = Field(default="", description="Verbatim citation from source")
    claimed_skill_name: Optional[str] = None
    claimed_level: Optional[str] = Field(default="Practitioner", description="Claimed proficiency level")


class VerificationReviewRequest(BaseModel):
    action: str = Field(..., description="'verify', 'reject', 'flag_insufficient', 'partially_support'")
    rationale: str = Field(..., description="Detailed verification explanation")


class ConflictResolveRequest(BaseModel):
    resolution_decision: str = Field(..., description="'accept_a', 'accept_b', 'merge', 'reject_both'")
    resolution_notes: str = Field(..., description="Reasoning for conflict resolution")


class ReviewTaskActionRequest(BaseModel):
    action: str = Field(..., description="'approve', 'reject', 'escalate'")
    notes: str = Field(..., description="Reviewer notes")


class EvaluationRunRequest(BaseModel):
    suite_id: str = Field(default="suite-core-governance", description="Suite ID to run")


# --- 1. AI Overview ---

@router.get("/overview")
def get_ai_overview(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)

    total_analyses = db.query(WorkAnalysisResult).filter(WorkAnalysisResult.owner_user_id == owner_uuid).count()

    # Combine candidate and verified counts in single group-by query
    mapping_counts = dict(
        db.query(
            EvidenceCompetencyMapping.status,
            func.count(EvidenceCompetencyMapping.id)
        ).filter(
            EvidenceCompetencyMapping.owner_user_id == owner_uuid
        ).group_by(EvidenceCompetencyMapping.status).all()
    )
    candidate_skills = mapping_counts.get("candidate", 0)
    verified_skills = mapping_counts.get("verified", 0)

    claims_blocked = db.query(HallucinationGuardResult).filter(
        HallucinationGuardResult.owner_user_id == owner_uuid,
        HallucinationGuardResult.guard_outcome == "BLOCK",
    ).count()

    open_conflicts = db.query(EvidenceConflictRecord).filter(
        EvidenceConflictRecord.owner_user_id == owner_uuid,
        EvidenceConflictRecord.status == "open",
    ).count()

    # Aggregate validation runs in single query without pulling rows into memory
    val_stats = db.query(
        func.count(OutputValidationRun.id),
        func.count(case((OutputValidationRun.final_status == "valid", 1)))
    ).filter(
        OutputValidationRun.owner_user_id == owner_uuid
    ).first()
    total_validations = val_stats[0] if val_stats else 0
    valid_count = val_stats[1] if val_stats else 0

    pending_reviews = db.query(HumanReviewTask).filter(
        HumanReviewTask.owner_user_id == owner_uuid,
        HumanReviewTask.status == "pending",
    ).count()

    recent_audits = db.query(ReviewAuditEvent).filter(
        ReviewAuditEvent.actor_user_id == owner_uuid,
    ).order_by(desc(ReviewAuditEvent.event_timestamp)).limit(5).all()

    return {
        "metrics": {
            "total_analyses": total_analyses,
            "candidate_skills": candidate_skills,
            "verified_skills": verified_skills,
            "claims_blocked": claims_blocked,
            "open_conflicts": open_conflicts,
            "valid_outputs_count": valid_count,
            "total_validations": total_validations,
            "pending_reviews": pending_reviews,
        },
        "recent_audit_events": [
            {
                "id": str(a.id),
                "actor": user.metadata.get("full_name") or user.email or "Authorized User",
                "timestamp": a.event_timestamp.strftime("%b %d, %H:%M") if a.event_timestamp else "Recently",
                "event_type": a.event_type,
                "previous_state": a.previous_state or "unreviewed",
                "new_state": a.new_state or "candidate",
                "reason": a.reason_note or "Workflow state update",
            }
            for a in recent_audits
        ],
    }


# --- 2. Work Analysis ---

@router.post("/analysis/runs")
async def run_work_analysis(
    req: AnalysisRunRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    results = []

    for ev_id_str in req.evidence_ids:
        try:
            ev_uuid = uuid.UUID(ev_id_str)
            res = await work_analyzer.analyze_evidence_item(
                db=db,
                evidence_id=ev_uuid,
                owner_user_id=owner_uuid,
            )
            # Auto-detect conflicts on newly analyzed evidence
            conflict_service.detect_conflicts_for_evidence(db=db, owner_user_id=owner_uuid, evidence_id=ev_uuid)
            results.append(res)
        except Exception as e:
            logger.warning(f"Analysis failed for evidence {ev_id_str}: {e}")
            results.append({"evidence_id": ev_id_str, "status": "failed", "error": str(e)})

    return {"analyses": results, "total": len(results)}


@router.get("/analysis")
def list_work_analyses(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    analyses = db.query(WorkAnalysisResult).filter(
        WorkAnalysisResult.owner_user_id == owner_uuid,
    ).order_by(desc(WorkAnalysisResult.created_at)).limit(limit).all()

    # Pre-fetch evidence titles and extracted candidate skills from Domain 1
    ev_ids = [a.evidence_id for a in analyses]
    ev_items = {e.id: e for e in db.query(EvidenceItem).filter(EvidenceItem.id.in_(ev_ids)).all()} if ev_ids else {}

    ev_skills = {}
    if ev_ids:
        mappings = db.query(EvidenceCompetencyMapping, CompetencyTaxonomy).join(
            CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id
        ).filter(
            EvidenceCompetencyMapping.evidence_id.in_(ev_ids),
            EvidenceCompetencyMapping.owner_user_id == owner_uuid,
        ).all()
        for m, tax in mappings:
            ev_skills.setdefault(m.evidence_id, []).append({
                "name": tax.canonical_name,
                "category": tax.category,
                "proficiency": m.proficiency_level or "Intermediate",
                "corroborated_with_evidence": True,
                "justification": m.supporting_excerpt or m.rationale or "",
            })

    items_out = []
    for a in analyses:
        skills = ev_skills.get(a.evidence_id, []).copy()
        seen_names = {s["name"].lower() for s in skills}
        for tech in (a.technologies or []):
            if tech.lower() not in seen_names:
                seen_names.add(tech.lower())
                skills.append({
                    "name": tech,
                    "category": "Technical Tooling",
                    "proficiency": "Intermediate",
                    "corroborated_with_evidence": False,
                    "justification": f"Demonstrated in artifact code/stack ({tech})",
                })

        items_out.append({
            "analysis_id": str(a.id),
            "run_id": str(a.run_id) if a.run_id else None,
            "evidence_id": str(a.evidence_id),
            "title": ev_items.get(a.evidence_id).title if a.evidence_id in ev_items else "Evidence Artifact",
            "source_type": ev_items.get(a.evidence_id).source_provider if a.evidence_id in ev_items else "document",
            "summary": a.summary,
            "role": a.role_identified,
            "observed_facts": a.observed_facts,
            "claimed_information": a.claimed_information,
            "inferred_attributes": a.inferred_attributes,
            "technical_tasks": a.technical_tasks,
            "technologies": a.technologies,
            "demonstrated_skills": skills,
            "uncertainty_flags": a.uncertainty_flags,
            "confidence_score": a.confidence_score,
            "analysis_method": a.analysis_method,
            "model_name": a.model_name,
            "model_version": a.model_version,
            "fallback_used": a.fallback_used,
            "fallback_reason": a.fallback_reason,
            "analysis_status": a.analysis_status,
            "validation_status": a.validation_status,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })

    return {"items": items_out}


@router.get("/analysis/runs/{run_id}")
def get_analysis_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    run = db.query(AIAnalysisRun).filter(
        AIAnalysisRun.id == uuid.UUID(run_id),
        AIAnalysisRun.owner_user_id == owner_uuid,
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return {
        "run_id": str(run.id),
        "status": run.status,
        "model_name": run.model_name,
        "input_evidence_ids": run.input_evidence_ids,
        "output_record_refs": run.output_record_refs,
        "warnings": run.processing_warnings,
        "error_details": run.error_details,
        "started_at": run.started_at.isoformat() if run.started_at else None,
        "completed_at": run.completed_at.isoformat() if run.completed_at else None,
    }


# --- 3. Candidate Skill Extraction & Evidence Mapping ---

@router.post("/skill-extraction/runs")
async def run_skill_extraction(
    req: SkillExtractionRunRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    extracted_candidates = []

    for ev_id_str in req.evidence_ids:
        try:
            ev_uuid = uuid.UUID(ev_id_str)
            candidates = await skill_extractor.extract_candidate_skills(
                db=db,
                evidence_id=ev_uuid,
                owner_user_id=owner_uuid,
            )
            extracted_candidates.extend(candidates)
        except Exception as e:
            logger.warning(f"Skill extraction failed for evidence {ev_id_str}: {e}")

    return {"candidates": extracted_candidates, "total": len(extracted_candidates)}


@router.get("/candidate-skills")
def list_candidate_skills(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    mappings = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.owner_user_id == owner_uuid,
    ).all()

    # Pre-fetch competencies & evidence
    comp_ids = [m.competency_id for m in mappings]
    ev_ids = [m.evidence_id for m in mappings]
    comps = {c.id: c for c in db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id.in_(comp_ids)).all()} if comp_ids else {}
    evs = {e.id: e for e in db.query(EvidenceItem).filter(EvidenceItem.id.in_(ev_ids)).all()} if ev_ids else {}

    results = []
    for m in mappings:
        comp = comps.get(m.competency_id)
        ev = evs.get(m.evidence_id)
        results.append({
            "candidate_id": str(m.id),
            "mapping_id": str(m.id),
            "evidence_id": str(m.evidence_id),
            "evidence_title": ev.title if ev else "Evidence Item",
            "source_type": ev.source_provider if ev else "document",
            "competency_id": str(m.competency_id),
            "name": comp.canonical_name if comp else "General Engineering",
            "category": comp.category if comp else "Engineering",
            "confidence_score": m.relevance_score,
            "proficiency_level": m.proficiency_level,
            "supporting_excerpt": m.supporting_excerpt,
            "status": m.status,
            "rationale": m.rationale,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        })

    return {"candidates": results, "total": len(results)}


@router.get("/evidence-mappings")
def list_evidence_mappings(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    return list_candidate_skills(db, user)


@router.get("/evidence-mappings/{mapping_id}")
def get_evidence_mapping(
    mapping_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    m = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.id == uuid.UUID(mapping_id),
        EvidenceCompetencyMapping.owner_user_id == owner_uuid,
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Mapping not found")

    comp = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
    ev = db.query(EvidenceItem).filter(EvidenceItem.id == m.evidence_id).first()

    return {
        "mapping_id": str(m.id),
        "evidence_id": str(m.evidence_id),
        "evidence_title": ev.title if ev else "Evidence Item",
        "competency_id": str(m.competency_id),
        "name": comp.canonical_name if comp else "Engineering",
        "category": comp.category if comp else "General",
        "status": m.status,
        "proficiency_level": m.proficiency_level,
        "relevance_score": m.relevance_score,
        "supporting_excerpt": m.supporting_excerpt,
        "rationale": m.rationale,
    }


# --- 4. Verification Review ---

@router.get("/verification")
def list_verification_records(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    decisions = db.query(VerificationDecision).filter(
        VerificationDecision.owner_user_id == owner_uuid,
    ).order_by(desc(VerificationDecision.created_at)).all()

    return {
        "decisions": [
            {
                "decision_id": str(d.id),
                "candidate_mapping_id": str(d.candidate_mapping_id) if d.candidate_mapping_id else None,
                "verification_state": d.verification_state,
                "rationale": d.decision_rationale,
                "rule_version": d.rule_version,
                "created_at": d.created_at.isoformat() if d.created_at else None,
            }
            for d in decisions
        ]
    }


@router.post("/verification/{candidate_id}/review")
async def review_candidate_verification(
    candidate_id: str,
    req: VerificationReviewRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    try:
        cand_uuid = uuid.UUID(candidate_id)
        res = verification_service.review_candidate_skill(
            db=db,
            owner_user_id=owner_uuid,
            candidate_mapping_id=cand_uuid,
            action=req.action,
            rationale=req.rationale,
            reviewer_id=owner_uuid,
        )
        return res
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


# --- 5. Hallucination Guard ---

@router.post("/guard/evaluate")
async def evaluate_guard_claim(
    req: GuardEvaluateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    ev_uuid = None
    raw_ev = req.evidence_id
    if raw_ev and raw_ev.strip() and raw_ev.strip().lower() not in ["none", "null"]:
        try:
            ev_uuid = uuid.UUID(raw_ev.strip())
        except ValueError:
            # Synthetic / probe ID like "ev-fake-999"
            ev_uuid = None

    try:
        res = hallucination_guard.evaluate_claim(
            db=db,
            owner_user_id=owner_uuid,
            evidence_id=ev_uuid,
            claim_text=req.claim_text,
            supporting_excerpt=req.supporting_excerpt or "",
            claimed_skill_name=req.claimed_skill_name,
            claimed_level=req.claimed_level,
            raw_evidence_id_str=raw_ev,
        )
        return res
    except Exception as e:
        logger.error(f"Guard evaluation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/guard/results")
def list_guard_results(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    records = db.query(HallucinationGuardResult).filter(
        HallucinationGuardResult.owner_user_id == owner_uuid,
    ).order_by(desc(HallucinationGuardResult.created_at)).limit(100).all()

    results_out = []
    for r in records:
        reasons = r.reason_codes or []
        checks = {
            "evidence_exists": r.evidence_id is not None and "EVIDENCE_ID_NOT_FOUND" not in reasons and "INVENTED_EVIDENCE_ID" not in reasons and "ZERO_ATTRIBUTABLE_ARTIFACTS" not in reasons,
            "user_owns_evidence": r.ownership_check == "pass" and "OWNERSHIP_MISMATCH" not in reasons,
            "semantic_support_valid": r.citation_validation == "pass" and "CITATION_FABRICATED" not in reasons and "CITATION_NOT_FOUND" not in reasons and "CITATION_MISSING" not in reasons,
            "attribution_valid": "ATTRIBUTION_UNCERTAIN" not in reasons and "ATTRIBUTION_MISMATCH" not in reasons,
            "no_conflict": r.contradiction_check == "none" and "CONTRADICTORY_ATTRIBUTION" not in reasons,
            "level_supported": "LEVEL_NOT_SUPPORTED" not in reasons,
            "not_revoked": "EVIDENCE_REVOKED_OR_INVALIDATED" not in reasons and "CREDENTIAL_EXPIRED_OR_REVOKED" not in reasons,
        }

        # Extract claimed_skill_name and claimed_level if present in reason tags
        claimed_skill = "Extracted Skill Claim"
        claimed_level = "Practitioner"
        clean_reasons = []
        for code in reasons:
            if code.startswith("SKILL:"):
                claimed_skill = code[len("SKILL:"):]
            elif code.startswith("LEVEL:"):
                claimed_level = code[len("LEVEL:"):]
            else:
                clean_reasons.append(code)

        results_out.append({
            "guard_run_id": str(r.id),
            "evidence_id": str(r.evidence_id) if r.evidence_id else None,
            "claim_text": r.claim_text,
            "claimed_skill_name": claimed_skill,
            "claimed_level": claimed_level,
            "guard_outcome": r.guard_outcome,
            "citation_validation": r.citation_validation,
            "citation_verbatim_found": r.citation_verbatim_found,
            "ownership_check": r.ownership_check,
            "semantic_support_score": r.semantic_support_score,
            "contradiction_check": r.contradiction_check,
            "reason_codes": clean_reasons,
            "checks": checks,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    return {"results": results_out}


# --- 6. Output Validation ---

@router.get("/validation")
def list_output_validations(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    runs = db.query(OutputValidationRun).filter(
        OutputValidationRun.owner_user_id == owner_uuid,
    ).order_by(desc(OutputValidationRun.created_at)).limit(50).all()

    return {
        "validations": [
            {
                "run_id": str(v.id),
                "target_type": v.target_type,
                "schema_valid": v.schema_valid,
                "semantic_valid": v.semantic_valid,
                "missing_fields": v.missing_fields,
                "invalid_references": v.invalid_references,
                "error_messages": v.error_messages,
                "retry_count": v.retry_count,
                "final_status": v.final_status,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in runs
        ]
    }


# --- 7. Confidence & Uncertainty ---

@router.get("/confidence")
def get_confidence_breakdown(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    mappings = db.query(EvidenceCompetencyMapping).filter(
        EvidenceCompetencyMapping.owner_user_id == owner_uuid,
    ).all()

    claims = []
    for m in mappings:
        comp = db.query(CompetencyTaxonomy).filter(CompetencyTaxonomy.id == m.competency_id).first()
        ev = db.query(EvidenceItem).filter(EvidenceItem.id == m.evidence_id).first()

        uncertainties = []
        if ev and ev.is_collaborative:
            uncertainties.append("Collaborative artifact with shared attribution.")
        if m.relevance_score < 0.8:
            uncertainties.append("Moderate linguistic match confidence.")
        if m.status == "insufficient":
            uncertainties.append("Evidence content lacks sufficient demonstrable context.")

        claims.append({
            "candidate_id": str(m.id),
            "competency_name": comp.canonical_name if comp else "General Engineering",
            "category": comp.category if comp else "Engineering",
            "extraction_confidence": round(m.relevance_score * 100),
            "evidence_strength": ev.evidence_strength if ev else "medium",
            "verification_status": m.status,
            "uncertainty_reasons": uncertainties,
            "suggested_additional_evidence": "Submit commit with passing test suite or accredited assessment." if uncertainties else "Ready for verification review.",
            "source_reference": ev.title if ev else "Uploaded Evidence",
        })

    return {"claims": claims}


# --- 8. Conflict Resolution ---

@router.get("/conflicts")
def list_conflicts(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    conflicts = db.query(EvidenceConflictRecord).filter(
        EvidenceConflictRecord.owner_user_id == owner_uuid,
    ).order_by(desc(EvidenceConflictRecord.created_at)).all()

    return {
        "conflicts": [
            {
                "id": str(c.id),
                "evidence_a_id": str(c.evidence_a_id),
                "evidence_b_id": str(c.evidence_b_id),
                "conflict_field": c.conflict_field,
                "evidence_a_assertion": c.evidence_a_assertion,
                "evidence_b_assertion": c.evidence_b_assertion,
                "explanation": c.explanation,
                "suggested_resolution": c.suggested_resolution,
                "status": c.status,
                "resolution_decision": c.resolution_decision,
                "resolution_notes": c.resolution_notes,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in conflicts
        ]
    }


@router.post("/conflicts/{conflict_id}/resolve")
def resolve_conflict(
    conflict_id: str,
    req: ConflictResolveRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    try:
        conf_uuid = uuid.UUID(conflict_id)
        res = conflict_service.resolve_conflict(
            db=db,
            owner_user_id=owner_uuid,
            conflict_id=conf_uuid,
            resolution_decision=req.resolution_decision,
            resolution_notes=req.resolution_notes,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- 9. Human Review Queue ---

@router.get("/review-queue")
def list_review_tasks(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    tasks = db.query(HumanReviewTask).filter(
        HumanReviewTask.owner_user_id == owner_uuid,
    ).order_by(desc(HumanReviewTask.created_at)).all()

    return {
        "tasks": [
            {
                "id": str(t.id),
                "task_type": t.task_type,
                "priority": t.priority,
                "status": t.status,
                "title": t.title,
                "description": t.description,
                "evidence_id": str(t.evidence_id) if t.evidence_id else None,
                "candidate_mapping_id": str(t.candidate_mapping_id) if t.candidate_mapping_id else None,
                "conflict_id": str(t.conflict_id) if t.conflict_id else None,
                "reviewer_action": t.reviewer_action,
                "reviewer_notes": t.reviewer_notes,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in tasks
        ]
    }


@router.post("/review-queue/{task_id}/actions")
def action_review_task(
    task_id: str,
    req: ReviewTaskActionRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    try:
        t_uuid = uuid.UUID(task_id)
        res = verification_service.action_review_task(
            db=db,
            owner_user_id=owner_uuid,
            task_id=t_uuid,
            action=req.action,
            reviewer_notes=req.notes,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# --- 10. Prompt-Injection Protection ---

@router.get("/prompt-injection/findings")
def list_prompt_injection_findings(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    findings = db.query(PromptInjectionFinding).filter(
        PromptInjectionFinding.owner_user_id == owner_uuid,
    ).order_by(desc(PromptInjectionFinding.created_at)).all()

    return {
        "findings": [
            {
                "id": str(f.id),
                "evidence_id": str(f.evidence_id),
                "source_type": f.source_type,
                "risk_level": f.risk_level,
                "detected_pattern": f.detected_pattern,
                "quarantined_excerpt": f.quarantined_excerpt,
                "handling_outcome": f.handling_outcome,
                "action_taken": f.action_taken,
                "created_at": f.created_at.isoformat() if f.created_at else None,
            }
            for f in findings
        ]
    }


# --- 11. AI Evaluation Suite ---

@router.get("/evaluation/suites")
def list_evaluation_suites():
    return {"suites": evaluation_service.list_suites()}


@router.post("/evaluation/runs")
def run_evaluation_suite(
    req: EvaluationRunRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    return evaluation_service.run_suite(
        db=db,
        suite_id=req.suite_id,
        initiated_by=owner_uuid,
    )


@router.get("/evaluation/runs/{run_id}")
def get_evaluation_run(
    run_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    run = db.query(AIEvaluationSuiteRun).filter(
        AIEvaluationSuiteRun.id == uuid.UUID(run_id),
    ).first()
    if not run:
        raise HTTPException(status_code=404, detail="Evaluation run not found")

    return {
        "run_id": str(run.id),
        "suite_name": run.suite_name,
        "suite_version": run.suite_version,
        "total_tests": run.total_tests,
        "passed_tests": run.passed_tests,
        "failed_tests": run.failed_tests,
        "pass_rate": run.pass_rate,
        "results": run.results,
        "created_at": run.created_at.isoformat() if run.created_at else None,
    }


@router.get("/evaluation/runs/{run_id}/results")
def get_evaluation_run_results(
    run_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    return get_evaluation_run(run_id, db, user)


# --- 12. AI Audit Trail ---

@router.get("/audit")
def list_ai_audit_events(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    owner_uuid = uuid.UUID(user.id)
    events = db.query(ReviewAuditEvent).filter(
        ReviewAuditEvent.actor_user_id == owner_uuid,
    ).order_by(desc(ReviewAuditEvent.event_timestamp)).limit(limit).all()

    return {
        "events": [
            {
                "id": str(e.id),
                "actor": user.metadata.get("full_name") or user.email or "Authorized User",
                "timestamp": e.event_timestamp.strftime("%Y-%m-%d %H:%M:%S") if e.event_timestamp else "Recently",
                "target_type": e.target_record_type,
                "target_id": str(e.target_record_id) if e.target_record_id else "",
                "event_type": e.event_type,
                "previous_state": e.previous_state or "unreviewed",
                "new_state": e.new_state or "candidate",
                "reason": e.reason_note or "AI Governance Event",
                "metadata": e.audit_metadata or {},
            }
            for e in events
        ]
    }
