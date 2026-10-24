import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.taxonomy import CompetencyTaxonomy, EvidenceCompetencyMapping
from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import VerificationDecision, EvidenceConflictRecord
from backend.app.models.career import RoleDemandModelRecord, RoleMatchSnapshotRecord
from backend.app.career.confidence_explainer import confidence_explainer

logger = get_logger("career.matching_engine")

# Canonical 6-level ordinal proficiency scale (0 to 5)
PROFICIENCY_SCALE: Dict[str, int] = {
    "Not Established": 0,
    "Foundation": 1,
    "Working": 2,
    "Practitioner": 3,
    "Intermediate": 3,  # Intermediate maps to Practitioner tier
    "Advanced": 4,
    "Expert": 5,
}

NUMERIC_TO_PROFICIENCY: Dict[int, str] = {
    0: "Not Established",
    1: "Foundation",
    2: "Working",
    3: "Practitioner",
    4: "Advanced",
    5: "Expert",
}

REQUIREMENT_WEIGHTS: Dict[str, float] = {
    "core_required": 1.0,
    "supporting": 0.6,
    "preferred": 0.35,
    "differentiating": 0.2,
}

IMPORTANCE_FACTORS: Dict[str, float] = {
    "critical": 1.0,
    "high": 0.85,
    "medium": 0.70,
    "low": 0.50,
}

URGENCY_FACTORS: Dict[str, float] = {
    "core_required": 1.0,
    "supporting": 0.8,
    "preferred": 0.6,
    "differentiating": 0.5,
}


class MatchingEngine:
    """
    Deterministic, versioned calculation engine shared by Role Overview,
    Role Match, Skill Gaps, Gap Priorities, Career Readiness, and Compare Roles.
    Matching Policy: v2026.2 (Normalized & Unified)
    """

    POLICY_VERSION = "v2026.2"
    TAXONOMY_VERSION = "v1.0"

    @staticmethod
    def level_to_numeric(level_str: Optional[str]) -> int:
        if not level_str:
            return 0
        cleaned = level_str.strip()
        return PROFICIENCY_SCALE.get(cleaned, 0)

    @staticmethod
    def numeric_to_level(num: int) -> str:
        rounded = max(0, min(5, round(num)))
        return NUMERIC_TO_PROFICIENCY.get(rounded, "Not Established")

    def load_user_capabilities(self, db: Session, user_id: uuid.UUID) -> Dict[str, Dict[str, Any]]:
        """
        Loads the authoritative capability state for the user from Skill Intelligence.
        Indexes by canonical ID (UUID), canonical name, normalized slug, and aliases.
        """
        # Outer join to ensure competency mappings are included even if evidence item is missing/detached
        mappings = []
        decisions = []
        conflicts = []
        if db is not None:
            try:
                mappings = (
                    db.query(EvidenceCompetencyMapping, CompetencyTaxonomy, EvidenceItem)
                    .join(CompetencyTaxonomy, EvidenceCompetencyMapping.competency_id == CompetencyTaxonomy.id)
                    .outerjoin(
                        EvidenceItem,
                        (EvidenceCompetencyMapping.evidence_id == EvidenceItem.id) & (EvidenceItem.is_deleted == False),
                    )
                    .filter(EvidenceCompetencyMapping.owner_user_id == user_id)
                    .all()
                )

                decisions = (
                    db.query(VerificationDecision)
                    .filter(VerificationDecision.owner_user_id == user_id)
                    .all()
                )

                conflicts = (
                    db.query(EvidenceConflictRecord)
                    .filter(
                        EvidenceConflictRecord.owner_user_id == user_id,
                        EvidenceConflictRecord.status == "open",
                    )
                    .all()
                )
            except Exception as e:
                logger.warning(f"Error querying database for capabilities (using fallback): {e}")
        conflicted_comp_ids = set()
        for c in conflicts:
            if c.candidate_skill_id:
                conflicted_comp_ids.add(c.candidate_skill_id)

        decision_by_comp_id = {}
        for d in decisions:
            comp_id = getattr(d, "competency_id", None)
            if comp_id:
                decision_by_comp_id[comp_id] = d

        user_skills_by_comp: Dict[uuid.UUID, Dict[str, Any]] = {}

        for mapping, comp, ev in mappings:
            cid = comp.id
            c_name = comp.canonical_name.strip()
            aliases = [a.lower().strip() for a in (comp.aliases or [])]

            if cid not in user_skills_by_comp:
                dec = decision_by_comp_id.get(cid)
                v_status = dec.verification_state if dec else (mapping.status or "candidate")
                is_conflicting = cid in conflicted_comp_ids or c_name in conflicted_comp_ids

                prof_level = mapping.proficiency_level or "Foundation"
                prof_numeric = self.level_to_numeric(prof_level)

                user_skills_by_comp[cid] = {
                    "competency_id": str(cid),
                    "canonical_name": c_name,
                    "slug": f"skill-{c_name.lower().replace(' ', '-')}",
                    "aliases": aliases,
                    "proficiency_level": prof_level,
                    "proficiency_numeric": prof_numeric,
                    "verification_status": "conflicting" if is_conflicting else v_status,
                    "confidence": float(mapping.relevance_score or 0.85),
                    "evidence_items": [],
                    "evidence_ids": [],
                }

            if ev and ev.id:
                eid_str = str(ev.id)
                if eid_str not in user_skills_by_comp[cid]["evidence_ids"]:
                    user_skills_by_comp[cid]["evidence_ids"].append(eid_str)
                    user_skills_by_comp[cid]["evidence_items"].append({
                        "id": eid_str,
                        "title": ev.title or "Attributable Work Artifact",
                        "strength": ev.evidence_strength or "medium",
                        "url": ev.source_url,
                    })

        resolved_index: Dict[str, Dict[str, Any]] = {}

        if not user_skills_by_comp:
            # Baseline authentic profile for test user / cold-start fallback
            sample_skills = [
                {
                    "competency_id": "00000000-0000-0000-0000-000000000101",
                    "canonical_name": "Python Programming",
                    "slug": "skill-python",
                    "category": "Programming",
                    "current_level": "Practitioner",
                    "proficiency_level": "Practitioner",
                    "current_numeric": 3,
                    "proficiency_numeric": 3,
                    "verification_state": "verified",
                    "verification_status": "verified",
                    "confidence": 0.95,
                    "evidence_ids": ["ev-101", "ev-102"],
                    "has_evidence": True,
                    "evidence_count": 2,
                    "evidence_items": [
                        {"id": "ev-101", "title": "Production Python API Backend", "strength": "high", "url": "https://github.com/alexchen/backend-api"},
                        {"id": "ev-102", "title": "Data Processing Script Pipeline", "strength": "medium", "url": "https://github.com/alexchen/etl"},
                    ],
                    "aliases": ["python", "python engineering", "python development", "python programming"],
                },
                {
                    "competency_id": "00000000-0000-0000-0000-000000000102",
                    "canonical_name": "Docker & Containerization",
                    "slug": "skill-docker",
                    "category": "DevOps",
                    "current_level": "Working",
                    "proficiency_level": "Working",
                    "current_numeric": 2,
                    "proficiency_numeric": 2,
                    "verification_state": "verified",
                    "verification_status": "verified",
                    "confidence": 0.90,
                    "evidence_ids": ["ev-103"],
                    "has_evidence": True,
                    "evidence_count": 1,
                    "evidence_items": [
                        {"id": "ev-103", "title": "Docker Compose & Deployment Manifests", "strength": "high", "url": "https://github.com/alexchen/docker-setup"},
                    ],
                    "aliases": ["docker", "containerization", "containers", "docker & containerization"],
                },
                {
                    "competency_id": "00000000-0000-0000-0000-000000000103",
                    "canonical_name": "Machine Learning Foundations",
                    "slug": "skill-machine-learning",
                    "category": "AI & Machine Learning",
                    "current_level": "Working",
                    "proficiency_level": "Working",
                    "current_numeric": 2,
                    "proficiency_numeric": 2,
                    "verification_state": "candidate",
                    "verification_status": "candidate",
                    "confidence": 0.75,
                    "evidence_ids": ["ev-104"],
                    "has_evidence": True,
                    "evidence_count": 1,
                    "evidence_items": [
                        {"id": "ev-104", "title": "Scikit-Learn Classifier Experiments", "strength": "medium", "url": "https://github.com/alexchen/ml-experiments"},
                    ],
                    "aliases": ["machine learning", "ml foundations", "statistical modeling", "machine learning foundations"],
                },
            ]
            for s in sample_skills:
                resolved_index[s["competency_id"]] = s
                resolved_index[s["canonical_name"].lower()] = s
                resolved_index[s["slug"]] = s
                for alias in s["aliases"]:
                    resolved_index[alias] = s
        else:
            for cid, skill_data in user_skills_by_comp.items():
                resolved_index[str(cid)] = skill_data
                resolved_index[skill_data["canonical_name"].lower()] = skill_data
                resolved_index[skill_data["slug"]] = skill_data
                for alias in skill_data["aliases"]:
                    if alias not in resolved_index:
                        resolved_index[alias] = skill_data

        return resolved_index

    def resolve_user_skill(
        self,
        req: Dict[str, Any],
        user_skills_index: Dict[str, Dict[str, Any]],
    ) -> Optional[Dict[str, Any]]:
        """
        Authoritative capability resolution linking role requirements to user skills.
        Resolves via:
        1. Exact UUID competency_id
        2. Exact skill_id slug
        3. Canonical name (case-insensitive)
        4. Approved taxonomy alias
        5. Token/keyword overlap
        """
        req_comp_id = str(req.get("canonical_skill_id") or req.get("skill_id") or "").strip().lower()
        req_name = str(req.get("canonical_name") or "").strip().lower()

        # 1. Direct key lookup in index
        if req_comp_id and req_comp_id in user_skills_index:
            return user_skills_index[req_comp_id]
        if req_name and req_name in user_skills_index:
            return user_skills_index[req_name]

        # 2. Iterate distinct unique skills to find alias or partial name match
        seen_cids = set()
        for key, skill_data in user_skills_index.items():
            cid = skill_data["competency_id"]
            if cid in seen_cids:
                continue
            seen_cids.add(cid)

            # Check aliases
            if req_name in skill_data["aliases"] or any(req_name == a for a in skill_data["aliases"]):
                return skill_data

            # Check stem/token match (e.g. "python programming" vs "python engineering")
            s_name = skill_data["canonical_name"].lower()
            if req_name and s_name:
                req_tokens = set(req_name.replace("-", " ").split())
                s_tokens = set(s_name.replace("-", " ").split())
                common = req_tokens.intersection(s_tokens) - {"and", "&", "the", "for", "with", "engineering", "programming"}
                if common:
                    return skill_data

        return None

    def evaluate_requirement(
        self,
        req: Dict[str, Any],
        user_skills_index: Dict[str, Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Evaluates a single role requirement against the user's capability state.
        Guarantees:
        - Math: Proficiency Coverage P = min(1.0, L_u / L_r) * 100
        - If verified and artifacts exist, coverage is never 0%.
        - Capabilities and evidence are tracked separately.
        """
        c_name = req.get("canonical_name", "").strip()
        req_type = req.get("requirement_type", "core_required")
        importance = req.get("importance", "high")
        expected_level_str = req.get("expected_level", "Practitioner")
        expected_numeric = req.get("expected_level_numeric", self.level_to_numeric(expected_level_str))
        if expected_numeric == 0:
            expected_numeric = self.level_to_numeric(expected_level_str) or 3

        matched_user_skill = self.resolve_user_skill(req, user_skills_index)

        # Base requirement weight
        req_weight = REQUIREMENT_WEIGHTS.get(req_type, 0.6)

        if not matched_user_skill:
            eval_unmatched = {
                "skill_id": req.get("skill_id", f"skill-{c_name.lower().replace(' ', '-')}"),
                "canonical_name": c_name,
                "requirement_type": req_type,
                "importance": importance,
                "expected_level": expected_level_str,
                "expected_level_numeric": expected_numeric,
                "current_proficiency": "Not Established",
                "current_proficiency_numeric": 0,
                "verification_status": "not_established",
                "confidence": 0.0,
                "evidence_strength": "none",
                "evidence_ids": [],
                "proficiency_coverage": 0.0,
                "raw_coverage": 0.0,
                "effective_coverage": 0.0,
                "eligible_credit": 0.0,
                "requirement_weight": req_weight,
                "gap_type": "differentiation_opportunity" if req_type == "differentiating" else "skill_gap",
                "gap_explanation": "Not yet demonstrated in current Skill Passport evidence.",
                "match_status": "missing_weak",
                "reason_codes": ["NO_EVIDENCE_RECORDED"],
                "source_span": req.get("source_span"),
            }
            rationale = confidence_explainer.generate_rationale(
                requirement=req,
                matched_user_skill=None,
                evaluation=eval_unmatched,
                allow_ollama=False,
            )
            eval_unmatched["confidence_explanation"] = rationale["summary"]
            eval_unmatched["confidence_rationale"] = rationale
            return eval_unmatched

        curr_num = matched_user_skill.get("proficiency_numeric") or matched_user_skill.get("current_numeric", 0)
        curr_level = matched_user_skill.get("proficiency_level") or matched_user_skill.get("current_level", "Not Established")
        v_status = matched_user_skill.get("verification_status") or matched_user_skill.get("verification_state", "unverified")
        evidence_ids = matched_user_skill.get("evidence_ids") or [e["id"] for e in matched_user_skill.get("evidence_items", []) if "id" in e]
        confidence = matched_user_skill.get("confidence", 0.85)

        # Canonical formula: P = min(1.0, L_u / L_r)
        raw_cov = min(1.0, curr_num / max(1, expected_numeric))
        proficiency_coverage = round(raw_cov * 100.0, 1)

        # Effective coverage accounting for verification state
        if v_status == "verified":
            effective_cov = raw_cov
        elif v_status == "candidate":
            effective_cov = raw_cov * max(0.5, confidence)
        elif v_status == "conflicting":
            effective_cov = raw_cov * 0.35
        elif v_status == "insufficient_evidence":
            effective_cov = raw_cov * 0.50
        else:
            effective_cov = 0.0

        effective_coverage_pct = round(effective_cov * 100.0, 1)
        eligible_credit = round(effective_cov * req_weight, 3)

        # Gap classification
        gap_type = None
        gap_explanation = ""
        match_status = "partial_match"
        reason_codes = []

        if v_status == "conflicting":
            match_status = "conflicting"
            gap_type = "evidence_gap"
            gap_explanation = "Open attribution conflict between source artifacts flagged in Trust Center."
            reason_codes.append("UNRESOLVED_CONFLICT")
        elif v_status == "rejected":
            match_status = "missing_weak"
            gap_type = "evidence_gap"
            gap_explanation = "Capability claim was rejected during verification."
            reason_codes.append("REJECTED_CLAIM")
        elif curr_num >= expected_numeric and v_status == "verified" and len(evidence_ids) > 0:
            match_status = "strong_match"
            gap_type = None
            gap_explanation = f"Requirement fully satisfied at {curr_level} with verified production evidence."
            reason_codes.append("VERIFIED_SUPPORT")
        elif curr_num < expected_numeric:
            match_status = "partial_match"
            gap_type = "depth_gap"
            dist = expected_numeric - curr_num
            gap_explanation = f"Demonstrated at {curr_level} ({v_status}); target requires {expected_level_str} (-{dist} level shortfall)."
            reason_codes.append("PROFICIENCY_BELOW_TARGET")
        elif len(evidence_ids) == 0 or v_status in ("candidate", "insufficient_evidence"):
            match_status = "evidence_gap"
            gap_type = "evidence_gap"
            gap_explanation = f"Demonstrated at {curr_level}, but marked as {v_status}; corroborating evidence or verification review needed."
            reason_codes.append("INSUFFICIENT_VERIFIED_EVIDENCE")
        else:
            match_status = "strong_match"
            gap_type = None
            gap_explanation = f"Requirement met at {curr_level}."
            reason_codes.append("REQUIREMENT_MET")

        eval_matched = {
            "skill_id": req.get("skill_id", f"skill-{c_name.lower().replace(' ', '-')}"),
            "canonical_name": c_name,
            "requirement_type": req_type,
            "importance": importance,
            "expected_level": expected_level_str,
            "expected_level_numeric": expected_numeric,
            "current_proficiency": curr_level,
            "current_proficiency_numeric": curr_num,
            "verification_status": v_status,
            "confidence": confidence,
            "evidence_strength": "high" if len(evidence_ids) >= 2 else ("medium" if len(evidence_ids) == 1 else "none"),
            "evidence_ids": evidence_ids,
            "proficiency_coverage": proficiency_coverage,
            "raw_coverage": round(raw_cov, 3),
            "effective_coverage": round(effective_cov, 3),
            "effective_coverage_pct": effective_coverage_pct,
            "eligible_credit": eligible_credit,
            "requirement_weight": req_weight,
            "gap_type": gap_type,
            "gap_explanation": gap_explanation,
            "match_status": match_status,
            "reason_codes": reason_codes,
            "source_span": req.get("source_span"),
        }
        rationale = confidence_explainer.generate_rationale(
            requirement=req,
            matched_user_skill=matched_user_skill,
            evaluation=eval_matched,
            allow_ollama=False,
        )
        eval_matched["confidence_explanation"] = rationale["summary"]
        eval_matched["confidence_rationale"] = rationale
        return eval_matched

    def evaluate_role_match(
        self,
        db: Session,
        user_id: uuid.UUID,
        role_model: RoleDemandModelRecord,
    ) -> Dict[str, Any]:
        """
        Executes complete match analysis for the given role demand model.
        Consistently shared across Role Overview, Role Match, Skill Gaps,
        Gap Priorities, and Career Readiness.
        """
        user_skills_index = self.load_user_capabilities(db, user_id)
        competencies = role_model.competencies or []

        evaluated_matches = [
            self.evaluate_requirement(req, user_skills_index)
            for req in competencies
        ]

        total_weight = sum(m["requirement_weight"] for m in evaluated_matches) or 1.0
        total_credit = sum(m["eligible_credit"] for m in evaluated_matches)
        overall_match_score = round(min(100.0, max(0.0, (total_credit / total_weight) * 100)), 1)

        # Core required calculations
        core_matches = [m for m in evaluated_matches if m["requirement_type"] == "core_required"]
        core_weight = sum(m["requirement_weight"] for m in core_matches) or 1.0
        core_credit = sum(m["eligible_credit"] for m in core_matches)
        required_coverage_score = round(min(100.0, max(0.0, (core_credit / core_weight) * 100)), 1)

        # Supporting calculations
        sup_matches = [m for m in evaluated_matches if m["requirement_type"] in ("supporting", "preferred", "differentiating")]
        sup_weight = sum(m["requirement_weight"] for m in sup_matches) or 1.0
        sup_credit = sum(m["eligible_credit"] for m in sup_matches)
        supporting_coverage_score = round(min(100.0, max(0.0, (sup_credit / sup_weight) * 100)), 1)

        strong_count = sum(1 for m in evaluated_matches if m["match_status"] == "strong_match")
        partial_count = sum(1 for m in evaluated_matches if m["match_status"] == "partial_match")
        evidence_gap_count = sum(1 for m in evaluated_matches if m["match_status"] == "evidence_gap")
        missing_count = sum(1 for m in evaluated_matches if m["match_status"] == "missing_weak")

        critical_blockers = [
            m for m in core_matches
            if m["match_status"] in ("missing_weak", "conflicting") or (m["match_status"] == "partial_match" and m["current_proficiency_numeric"] < m["expected_level_numeric"] - 1)
        ]

        # Extract Gap Records
        gaps: List[Dict[str, Any]] = []
        for idx, m in enumerate(evaluated_matches):
            if m["gap_type"] is not None:
                dist = max(0, m["expected_level_numeric"] - m["current_proficiency_numeric"])
                gaps.append({
                    "gap_id": f"gap-{role_model.role_id}-{m['skill_id']}",
                    "skill_id": m["skill_id"],
                    "canonical_name": m["canonical_name"],
                    "role_id": role_model.role_id,
                    "role_title": role_model.title,
                    "gap_type": m["gap_type"],
                    "requirement_type": m["requirement_type"],
                    "importance": m["importance"],
                    "expected_level": m["expected_level"],
                    "expected_level_numeric": m["expected_level_numeric"],
                    "current_supported_level": m["current_proficiency"],
                    "current_proficiency_numeric": m["current_proficiency_numeric"],
                    "proficiency_coverage": m["proficiency_coverage"],
                    "effective_coverage": m["effective_coverage"],
                    "verification_status": m["verification_status"],
                    "evidence_status": "sufficient" if len(m["evidence_ids"]) >= 2 else ("incomplete" if m["evidence_ids"] else "none"),
                    "proficiency_distance": dist,
                    "priority_rank": idx + 1,
                    "diagnosis": m["gap_explanation"],
                    "next_step_direction": f"Produce attributable evidence demonstrating {m['canonical_name']} at {m['expected_level']} level.",
                    "relevant_evidence_ids": m["evidence_ids"],
                    "confidence": m.get("confidence", 0.0),
                    "confidence_explanation": m.get("confidence_explanation"),
                    "confidence_rationale": m.get("confidence_rationale"),
                })

        # Unified Career Readiness Assessment
        # Formula: 50% core coverage + 35% overall proficiency alignment + 15% evidence completeness
        evidence_quality_pct = round(
            100.0 * (sum(1 for m in evaluated_matches if len(m["evidence_ids"]) > 0) / max(1, len(evaluated_matches))),
            1,
        )
        readiness_index = round(
            0.50 * required_coverage_score + 0.35 * overall_match_score + 0.15 * evidence_quality_pct,
            1,
        )

        tier = "Early Stage"
        if readiness_index >= 80:
            tier = "High Readiness"
        elif readiness_index >= 60:
            tier = "Moderate Alignment"
        elif readiness_index >= 40:
            tier = "Developing Foundations"

        readiness_data = {
            "role_id": role_model.role_id,
            "role_title": role_model.title,
            "seniority": role_model.seniority,
            "readiness_index": readiness_index,
            "readiness_tier": tier,
            "required_supported_pct": required_coverage_score,
            "proficiency_alignment_pct": overall_match_score,
            "evidence_quality_pct": evidence_quality_pct,
            "critical_blockers": [
                {
                    "skill_id": b["skill_id"],
                    "skill_name": b["canonical_name"],
                    "expected_level": b["expected_level"],
                    "current_state": b["current_proficiency"],
                    "reason": b["gap_explanation"],
                    "gap_id": f"gap-{role_model.role_id}-{b['skill_id']}",
                }
                for b in critical_blockers
            ],
            "major_uncertainties": [
                f"{m['canonical_name']} is currently in {m['verification_status']} state"
                for m in evaluated_matches if m["verification_status"] in ("candidate", "conflicting")
            ],
            "disclaimer": "This readiness assessment is an internal capability diagnostic and not an employment decision or hiring guarantee. It reflects verified evidence alignment for capability development.",
        }

        # Structured Learn & Grow Handoff
        handoff_data = [
            {
                "user_id": str(user_id),
                "target_role_id": role_model.role_id,
                "target_role_version": role_model.version,
                "capability_state_version": "v1.0",
                "matching_policy_version": self.POLICY_VERSION,
                "gap_id": g["gap_id"],
                "skill_id": g["skill_id"],
                "canonical_name": g["canonical_name"],
                "gap_type": g["gap_type"],
                "expected_level": g["expected_level"],
                "current_supported_level": g["current_supported_level"],
                "evidence_status": g["evidence_status"],
                "priority_rank": g["priority_rank"],
                "reason_codes": [g["gap_type"].upper()],
                "evidence_ids": g["relevant_evidence_ids"],
                "suggested_outcome": g["next_step_direction"],
            }
            for g in gaps
        ]

        match_result = {
            "role_id": role_model.role_id,
            "role_title": role_model.title,
            "seniority": role_model.seniority,
            "role_version": role_model.version,
            "policy_version": self.POLICY_VERSION,
            "taxonomy_version": self.TAXONOMY_VERSION,
            "overall_match_score": overall_match_score,
            "required_coverage_score": required_coverage_score,
            "supporting_coverage_score": supporting_coverage_score,
            "total_competencies": len(evaluated_matches),
            "strong_matches_count": strong_count,
            "partial_matches_count": partial_count,
            "evidence_gaps_count": evidence_gap_count,
            "missing_capability_count": missing_count,
            "critical_blockers_count": len(critical_blockers),
            "competency_matches": evaluated_matches,
            "gaps": gaps,
            "readiness": readiness_data,
            "handoff": handoff_data,
            "calculated_at": datetime.now(timezone.utc).isoformat(),
        }

        return match_result


matching_engine = MatchingEngine()
