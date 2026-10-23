from typing import List, Dict, Any, Optional


class PrioritizationService:
    """
    Deterministic, normalized Gap Prioritization Service (Policy v2026.2).
    Calculates explainable priority scores bounded strictly within [0.0, 100.0].

    Formula:
      G_i = 1.0 - effective_coverage (remaining gap)
      I_i = normalized requirement importance [0.5, 1.0]
      U_i = normalized requirement criticality / urgency [0.5, 1.0]
      Base_Priority = 100.0 * G_i * I_i * U_i
      Final_Priority = clamp(Base_Priority * Effort_Adjustment * Leverage_Adjustment, 0.0, 100.0)
    """

    POLICY_VERSION = "v2026.2"

    IMPORTANCE_MAP: Dict[str, float] = {
        "critical": 1.0,
        "high": 0.85,
        "medium": 0.70,
        "low": 0.50,
    }

    URGENCY_MAP: Dict[str, float] = {
        "core_required": 1.0,
        "supporting": 0.80,
        "preferred": 0.60,
        "differentiating": 0.50,
    }

    @staticmethod
    def calculate_priority_score(
        inputs: Dict[str, float],
        effort_sensitivity: float = 1.0,
        leverage_weight: float = 1.0,
    ) -> float:
        gap_factor = max(0.05, min(1.0, inputs.get("gap_factor", 0.5)))
        importance = max(0.4, min(1.0, inputs.get("importance_factor", 0.7)))
        urgency = max(0.4, min(1.0, inputs.get("urgency_factor", 0.8)))
        effort = max(1.0, min(5.0, inputs.get("estimated_effort", 2.0)))
        has_evidence = inputs.get("has_evidence", 0.0) > 0.5

        # Base normalized score in [0, 100]
        base_score = 100.0 * gap_factor * importance * urgency

        # Effort discount (higher effort slightly reduces priority if sensitivity is high)
        effort_discount = max(0.60, 1.0 - 0.08 * (effort - 1.0) * effort_sensitivity)

        # Evidence leverage boost (existing work can be extended faster)
        leverage_boost = min(1.25, 1.0 + (0.12 * leverage_weight if has_evidence else 0.0))

        final_score = base_score * effort_discount * leverage_boost
        return round(min(100.0, max(1.0, final_score)), 1)

    def prioritize_gaps(
        self,
        gaps: List[Dict[str, Any]],
        focus_mode: str = "default",  # default, top3, quick_wins, core_blockers
        effort_sensitivity: float = 1.0,
        leverage_weight: float = 1.0,
    ) -> List[Dict[str, Any]]:
        scored_gaps = []

        for g in gaps:
            req_type = g.get("requirement_type", "core_required")
            importance = str(g.get("importance", "medium")).lower()
            effective_cov = float(g.get("effective_coverage", 0.0))
            dist = int(g.get("proficiency_distance", 1))
            ev_ids = g.get("relevant_evidence_ids", [])
            has_ev = len(ev_ids) > 0

            # Normalized factors
            gap_factor = max(0.1, round(1.0 - effective_cov, 3))
            imp_factor = self.IMPORTANCE_MAP.get(importance, 0.70)
            urg_factor = self.URGENCY_MAP.get(req_type, 0.80)

            # Estimated effort heuristic (1 to 5)
            if g.get("gap_type") == "evidence_gap":
                est_effort = 1.5  # Just needs attributable proof/verification
            elif dist <= 1:
                est_effort = 2.0
            elif dist == 2:
                est_effort = 3.5
            else:
                est_effort = 4.5

            inputs = {
                "gap_factor": gap_factor,
                "importance_factor": imp_factor,
                "urgency_factor": urg_factor,
                "estimated_effort": est_effort,
                "has_evidence": 1.0 if has_ev else 0.0,
                "criticality": imp_factor * 5.0,  # Backward compatibility for test fixtures
                "level_gap": float(dist),
                "dependency_impact": 1.5 if g.get("gap_type") == "dependency_gap" else 1.0,
                "evidence_leverage": 1.5 if has_ev else 1.0,
                "user_fit": 1.2 if g.get("evidence_status") == "incomplete" else 1.0,
                "marginal_gain": 3.0 if req_type == "core_required" else 2.0,
            }

            score = self.calculate_priority_score(
                inputs,
                effort_sensitivity=effort_sensitivity,
                leverage_weight=leverage_weight,
            )

            is_core_blocker = (req_type == "core_required") and (imp_factor >= 0.85 or dist >= 2 or g.get("gap_type") == "skill_gap")
            is_quick_win = (est_effort <= 2.5) and (score >= 40.0)

            explanation = (
                f"Ranked at {score}/100: {importance.capitalize()} importance ({int(imp_factor*100)}%), "
                f"{req_type.replace('_', ' ')} urgency, and remaining gap of {int(gap_factor*100)}%."
            )
            if has_ev:
                explanation += f" Boosted by {len(ev_ids)} existing attributable project artifact(s)."

            scored_gap = dict(g)
            scored_gap["priority_inputs"] = inputs
            scored_gap["priority_score"] = score
            scored_gap["why_prioritized"] = explanation
            scored_gap["is_core_blocker"] = is_core_blocker
            scored_gap["is_quick_win"] = is_quick_win
            scored_gaps.append(scored_gap)

        # Sort descending by priority_score
        sorted_gaps = sorted(scored_gaps, key=lambda x: x["priority_score"], reverse=True)

        # Focus mode filtering
        if focus_mode == "top3":
            selected = sorted_gaps[:3]
        elif focus_mode == "quick_wins":
            selected = [g for g in sorted_gaps if g["is_quick_win"]]
            if not selected:
                selected = sorted_gaps[:3]
        elif focus_mode == "core_blockers":
            selected = [g for g in sorted_gaps if g["is_core_blocker"]]
            if not selected:
                selected = [g for g in sorted_gaps if g.get("requirement_type") == "core_required"]
        else:
            selected = sorted_gaps

        # Re-assign sequential rank
        for idx, g in enumerate(selected):
            g["priority_rank"] = idx + 1

        return selected


prioritization_service = PrioritizationService()
