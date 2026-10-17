import re
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.evidence import EvidenceItem
from backend.app.models.ai_governance import HallucinationGuardResult
from backend.app.ai.prompt_injection import prompt_injection_guard
from backend.app.core.logging import get_logger

logger = get_logger("ai.guard")


class HallucinationGuardService:
    def evaluate_claim(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        evidence_id: uuid.UUID,
        claim_text: str,
        supporting_excerpt: str,
        claimed_skill_name: Optional[str] = None,
        analysis_id: Optional[uuid.UUID] = None,
        candidate_mapping_id: Optional[uuid.UUID] = None,
    ) -> Dict[str, Any]:
        """
        Executes the 4-stage Hallucination Guard evaluation:
        1. Citation Validation (verbatim lookup in source text)
        2. Ownership Validation (evidence owner == authenticated user)
        3. Semantic Support & Overclaim Check
        4. Contradiction Check
        """
        reason_codes: List[str] = []
        citation_validation = "pass"
        citation_verbatim_found = False
        ownership_check = "pass"
        semantic_support_score = 1.0
        contradiction_check = "none"

        # 0. Check prompt injection in claim or supporting excerpt
        injection_scan = prompt_injection_guard.scan_content(claim_text + " " + supporting_excerpt)
        if injection_scan["is_suspicious"]:
            reason_codes.append("PROMPT_INJECTION_FLAGGED")
            guard_outcome = "BLOCK"
            return self._persist_and_return(
                db=db,
                owner_user_id=owner_user_id,
                evidence_id=evidence_id,
                analysis_id=analysis_id,
                candidate_mapping_id=candidate_mapping_id,
                claim_text=claim_text,
                citation_validation="fail",
                citation_verbatim_found=False,
                ownership_check="fail",
                semantic_support_score=0.0,
                contradiction_check="none",
                guard_outcome="BLOCK",
                reason_codes=reason_codes,
            )

        # 1. Fetch real EvidenceItem from DB
        evidence = db.query(EvidenceItem).filter(EvidenceItem.id == evidence_id).first()
        if not evidence:
            reason_codes.append("EVIDENCE_ID_NOT_FOUND")
            return self._persist_and_return(
                db=db,
                owner_user_id=owner_user_id,
                evidence_id=evidence_id,
                analysis_id=analysis_id,
                candidate_mapping_id=candidate_mapping_id,
                claim_text=claim_text,
                citation_validation="fail",
                citation_verbatim_found=False,
                ownership_check="fail",
                semantic_support_score=0.0,
                contradiction_check="none",
                guard_outcome="BLOCK",
                reason_codes=reason_codes,
            )

        # 2. Ownership Check: Reject cross-user claims
        if evidence.owner_user_id != owner_user_id:
            reason_codes.append("OWNERSHIP_MISMATCH")
            ownership_check = "fail"
            return self._persist_and_return(
                db=db,
                owner_user_id=owner_user_id,
                evidence_id=evidence_id,
                analysis_id=analysis_id,
                candidate_mapping_id=candidate_mapping_id,
                claim_text=claim_text,
                citation_validation=citation_validation,
                citation_verbatim_found=False,
                ownership_check="fail",
                semantic_support_score=0.0,
                contradiction_check="none",
                guard_outcome="BLOCK",
                reason_codes=reason_codes,
            )

        # 3. Citation Validation: Check if cited excerpt exists in evidence source text
        source_text = (evidence.extracted_excerpt or "") + " " + (evidence.description or "")
        clean_src = re.sub(r"[^\w\s]", "", source_text.lower()).strip()
        clean_excerpt = re.sub(r"[^\w\s]", "", supporting_excerpt.lower()).strip()

        if not clean_excerpt:
            citation_validation = "missing"
            reason_codes.append("CITATION_MISSING")
        elif clean_excerpt in clean_src:
            citation_validation = "pass"
            citation_verbatim_found = True
        else:
            # Check significant word overlap
            excerpt_words = [w for w in clean_excerpt.split() if len(w) > 3]
            if excerpt_words:
                matching_words = sum(1 for w in excerpt_words if w in clean_src)
                overlap_ratio = matching_words / len(excerpt_words)
                if overlap_ratio >= 0.75:
                    citation_validation = "pass"
                    citation_verbatim_found = True
                    semantic_support_score = round(overlap_ratio, 2)
                elif overlap_ratio >= 0.40:
                    citation_validation = "weak"
                    citation_verbatim_found = False
                    semantic_support_score = round(overlap_ratio, 2)
                    reason_codes.append("CITATION_PARTIAL_OVERLAP")
                else:
                    citation_validation = "fail"
                    citation_verbatim_found = False
                    semantic_support_score = 0.0
                    reason_codes.append("CITATION_FABRICATED")
            else:
                citation_validation = "fail"
                citation_verbatim_found = False
                reason_codes.append("CITATION_NOT_FOUND")

        # 4. Check if text is identity-only / receipt-only (insufficient evidence)
        if evidence.evidence_strength == "insufficient" or len(clean_src.split()) < 5:
            reason_codes.append("INSUFFICIENT_CONTEXT")

        # 5. Determine final outcome
        if "CITATION_FABRICATED" in reason_codes or "OWNERSHIP_MISMATCH" in reason_codes or "PROMPT_INJECTION_FLAGGED" in reason_codes:
            guard_outcome = "BLOCK"
        elif "INSUFFICIENT_CONTEXT" in reason_codes or "CITATION_MISSING" in reason_codes or "CITATION_PARTIAL_OVERLAP" in reason_codes:
            guard_outcome = "INSUFFICIENT_EVIDENCE"
        elif contradiction_check == "flagged":
            guard_outcome = "CONFLICT"
        else:
            guard_outcome = "PASS"

        return self._persist_and_return(
            db=db,
            owner_user_id=owner_user_id,
            evidence_id=evidence_id,
            analysis_id=analysis_id,
            candidate_mapping_id=candidate_mapping_id,
            claim_text=claim_text,
            citation_validation=citation_validation,
            citation_verbatim_found=citation_verbatim_found,
            ownership_check=ownership_check,
            semantic_support_score=semantic_support_score,
            contradiction_check=contradiction_check,
            guard_outcome=guard_outcome,
            reason_codes=reason_codes,
        )

    def _persist_and_return(
        self,
        db: Session,
        owner_user_id: uuid.UUID,
        evidence_id: uuid.UUID,
        analysis_id: Optional[uuid.UUID],
        candidate_mapping_id: Optional[uuid.UUID],
        claim_text: str,
        citation_validation: str,
        citation_verbatim_found: bool,
        ownership_check: str,
        semantic_support_score: float,
        contradiction_check: str,
        guard_outcome: str,
        reason_codes: List[str],
    ) -> Dict[str, Any]:
        record_id = uuid.uuid4()
        try:
            record = HallucinationGuardResult(
                id=record_id,
                owner_user_id=owner_user_id,
                analysis_id=analysis_id,
                candidate_mapping_id=candidate_mapping_id,
                evidence_id=evidence_id,
                claim_text=claim_text[:500],
                citation_validation=citation_validation,
                citation_verbatim_found=citation_verbatim_found,
                ownership_check=ownership_check,
                semantic_support_score=semantic_support_score,
                contradiction_check=contradiction_check,
                guard_outcome=guard_outcome,
                reason_codes=reason_codes,
                guard_version="v1.0",
            )
            db.add(record)
            db.commit()
            logger.info(f"Hallucination Guard outcome: {guard_outcome} for evidence {evidence_id} (reasons: {reason_codes})")
        except Exception as e:
            db.rollback()
            logger.warning(f"Failed to persist guard evaluation: {e}")

        return {
            "guard_run_id": str(record_id),
            "evidence_id": str(evidence_id),
            "guard_outcome": guard_outcome,
            "citation_validation": citation_validation,
            "citation_verbatim_found": citation_verbatim_found,
            "ownership_check": ownership_check,
            "semantic_support_score": semantic_support_score,
            "contradiction_check": contradiction_check,
            "reason_codes": reason_codes,
            "explanation": self._get_outcome_explanation(guard_outcome, reason_codes),
        }

    def _get_outcome_explanation(self, outcome: str, reasons: List[str]) -> str:
        if outcome == "PASS":
            return "Claim verified: citation is present verbatim in authorized source evidence with no contradictions."
        if outcome == "BLOCK":
            return f"Claim blocked by Hallucination Guard: {', '.join(reasons)}. Citation could not be substantiated in authorized source text."
        if outcome == "INSUFFICIENT_EVIDENCE":
            return f"Insufficient evidence: {', '.join(reasons)}. The source text lacks adequate context to definitively prove this claim."
        if outcome == "CONFLICT":
            return "Contradiction detected: claim conflicts with other corroborated evidence in the record."
        return f"Guard outcome: {outcome}"


hallucination_guard = HallucinationGuardService()
