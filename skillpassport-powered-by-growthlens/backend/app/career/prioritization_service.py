from typing import List, Dict, Any, Optional
from backend.app.core.logging import get_logger

logger = get_logger("career.prioritization_service")


class PrioritizationService:
    """
    Deterministic, system-calculated Gap Prioritization Service (Policy v2026.2).
    Calculates objective, explainable priority scores bounded strictly within [0.0, 100.0].
    
    Invariants:
    - Manual sliders (effort_sensitivity, leverage_weight) are eliminated from priority math.
    - System scores are strictly objective, derived from:
        G_i = 1.0 - effective_coverage (remaining gap)
        I_i = normalized requirement importance [0.50, 1.00]
        U_i = normalized requirement criticality / urgency [0.50, 1.00]
        Effort_Discount = objective heuristic discount based on gap distance [0.60, 1.00]
        Leverage_Multiplier = objective boost from existing attributable artifacts [1.00, 1.25]
    - Topological DAG Prerequisite Ordering:
        Prerequisites strictly precede dependent competencies in the priority sequence.
    - User goal overrides (user_pinned_ids) flag preference without corrupting objective scores.
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
        effort_sensitivity: Optional[float] = None,
        leverage_weight: Optional[float] = None,
    ) -> float:
        """
        Objective system priority score calculator.
        Manual slider parameters are accepted for backward compatibility but ignored.
        """
        gap_factor = max(0.05, min(1.0, inputs.get("gap_factor", 0.5)))
        importance = max(0.4, min(1.0, inputs.get("importance_factor", 0.7)))
        urgency = max(0.4, min(1.0, inputs.get("urgency_factor", 0.8)))
        effort = max(1.0, min(5.0, inputs.get("estimated_effort", 2.0)))
        has_evidence = inputs.get("has_evidence", 0.0) > 0.5
        ev_count = int(inputs.get("evidence_count", 1 if has_evidence else 0))

        # Base normalized score in [0, 100]
        base_score = 100.0 * gap_factor * importance * urgency

        # Objective effort discount (higher gap distance requires more effort, discount up to 40%)
        effort_discount = max(0.60, 1.0 - 0.08 * (effort - 1.0))

        # Objective evidence leverage boost (existing work can be extended faster)
        leverage_boost = min(1.25, 1.0 + (0.08 * min(3, ev_count) if has_evidence else 0.0))

        final_score = base_score * effort_discount * leverage_boost
        return round(min(100.0, max(1.0, final_score)), 1)

    def topological_sort_with_priorities(
        self,
        items: List[Dict[str, Any]],
        user_pinned_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Sequences gaps with topological DAG prerequisite constraints:
        - Guarantees that EVERY mandatory prerequisite strictly precedes its dependent gaps.
        - Among ready items (0 unsatisfied prerequisites), orders by user-pin preference first,
          then by descending objective priority_score.
        - Handles circular dependencies safely by falling back to priority score ordering for cycles.
        """
        if not items:
            return []

        item_map: Dict[str, Dict[str, Any]] = {}
        for item in items:
            key = item.get("skill_id") or item.get("gap_id")
            if key:
                item_map[key] = item

        all_ids = set(item_map.keys())
        pinned_set = set(user_pinned_ids or [])

        # Build in-degree (count of remaining prerequisites) and dependents graph
        in_degree: Dict[str, int] = {item_id: 0 for item_id in all_ids}
        dependents: Dict[str, List[str]] = {item_id: [] for item_id in all_ids}

        for item_id, item in item_map.items():
            prereqs = item.get("prerequisite_skill_ids") or item.get("prerequisites") or []
            # Only consider prerequisites that are themselves unmet gaps in the current set
            unmet_prereqs = [p for p in prereqs if p in all_ids and p != item_id]
            in_degree[item_id] = len(unmet_prereqs)
            for p in unmet_prereqs:
                dependents[p].append(item_id)

        # Initial ready pool: gaps whose prerequisites are already satisfied or none required
        ready_pool = [item_id for item_id, deg in in_degree.items() if deg == 0]
        ordered: List[Dict[str, Any]] = []

        while ready_pool:
            # Pick ready item: pinned first, then highest objective priority_score
            ready_pool.sort(
                key=lambda nid: (
                    1 if nid in pinned_set or item_map[nid].get("is_user_pinned") else 0,
                    float(item_map[nid].get("priority_score", 0.0)),
                ),
                reverse=True,
            )
            selected_id = ready_pool.pop(0)
            ordered.append(item_map[selected_id])

            # Decrement in-degree of dependents
            for dep_id in dependents.get(selected_id, []):
                in_degree[dep_id] -= 1
                if in_degree[dep_id] == 0:
                    ready_pool.append(dep_id)

        # Resilient cycle resolution: append any remaining cycle items sorted by priority_score
        if len(ordered) < len(items):
            ordered_keys = {it.get("skill_id") or it.get("gap_id") for it in ordered}
            remaining = [it for it in items if (it.get("skill_id") or it.get("gap_id")) not in ordered_keys]
            remaining.sort(key=lambda x: float(x.get("priority_score", 0.0)), reverse=True)
            logger.warning(
                f"Dependency cycle detected for {[r.get('skill_id') for r in remaining]}; appended by priority score."
            )
            ordered.extend(remaining)

        return ordered

    def prioritize_gaps(
        self,
        gaps: List[Dict[str, Any]],
        focus_mode: str = "default",  # default, top3, quick_wins, core_blockers
        effort_sensitivity: Optional[float] = None,
        leverage_weight: Optional[float] = None,
        user_pinned_ids: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        scored_gaps = []
        pinned_set = set(user_pinned_ids or [])

        for g in gaps:
            req_type = g.get("requirement_type", "core_required")
            importance = str(g.get("importance", "medium")).lower()
            effective_cov = float(g.get("effective_coverage", 0.0))
            dist = int(g.get("proficiency_distance", 1))
            ev_ids = g.get("relevant_evidence_ids", [])
            has_ev = len(ev_ids) > 0
            skill_id = g.get("skill_id") or g.get("gap_id", "")
            is_pinned = skill_id in pinned_set

            # Normalized factors
            gap_factor = max(0.1, round(1.0 - effective_cov, 3))
            imp_factor = self.IMPORTANCE_MAP.get(importance, 0.70)
            urg_factor = self.URGENCY_MAP.get(req_type, 0.80)

            # Objective estimated effort heuristic (1 to 5)
            if g.get("gap_type") == "evidence_gap":
                est_effort = 1.5  # Attributable evidence verification needed
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
                "evidence_count": len(ev_ids),
                "criticality": imp_factor * 5.0,  # Backward compatibility for test fixtures
                "level_gap": float(dist),
                "dependency_impact": 1.5 if g.get("gap_type") == "dependency_gap" else 1.0,
                "evidence_leverage": 1.5 if has_ev else 1.0,
                "user_fit": 1.2 if g.get("evidence_status") == "incomplete" else 1.0,
                "marginal_gain": 3.0 if req_type == "core_required" else 2.0,
            }

            # Objective system score (no slider bias)
            score = self.calculate_priority_score(inputs)

            is_core_blocker = (req_type == "core_required") and (imp_factor >= 0.85 or dist >= 2 or g.get("gap_type") == "skill_gap")
            is_quick_win = (est_effort <= 2.5) and (score >= 40.0)

            prereqs = g.get("prerequisite_skill_ids") or g.get("prerequisites") or []

            explanation = (
                f"Ranked at {score}/100: {importance.capitalize()} importance ({int(imp_factor*100)}%), "
                f"{req_type.replace('_', ' ')} urgency, and remaining gap of {int(gap_factor*100)}%."
            )
            if prereqs:
                explanation += f" Has prerequisite(s): {', '.join(prereqs)}."
            if has_ev:
                explanation += f" Boosted by {len(ev_ids)} existing attributable project artifact(s)."
            if is_pinned:
                explanation += " (User goal override applied)."

            scored_gap = dict(g)
            scored_gap["priority_inputs"] = inputs
            scored_gap["priority_score"] = score
            scored_gap["why_prioritized"] = explanation
            scored_gap["is_core_blocker"] = is_core_blocker
            scored_gap["is_quick_win"] = is_quick_win
            scored_gap["is_user_pinned"] = is_pinned
            scored_gaps.append(scored_gap)

        # Topological sort ensuring prerequisites strictly precede dependents
        ordered_gaps = self.topological_sort_with_priorities(scored_gaps, user_pinned_ids=user_pinned_ids)

        # Focus mode filtering
        if focus_mode == "top3":
            selected = ordered_gaps[:3]
        elif focus_mode == "quick_wins":
            selected = [g for g in ordered_gaps if g["is_quick_win"]]
            if not selected:
                selected = ordered_gaps[:3]
        elif focus_mode == "core_blockers":
            selected = [g for g in ordered_gaps if g["is_core_blocker"]]
            if not selected:
                selected = [g for g in ordered_gaps if g.get("requirement_type") == "core_required"]
        else:
            selected = ordered_gaps

        # Re-assign sequential rank
        for idx, g in enumerate(selected):
            g["priority_rank"] = idx + 1

        return selected


prioritization_service = PrioritizationService()

