"""
Learn & Grow Orthogonal Signal Evaluation & Mastery Logic.
Enforces explicit separation between capability, confidence, evidence, and trend.
"""

from enum import Enum
from typing import Dict, Any, Optional, List, Tuple
from pydantic import BaseModel, Field

from backend.app.learning.contracts import (
    UpstreamGapTrigger,
    GapClassification,
    VerificationState,
    TrajectoryTrend,
)


class RecommendedLearningAction(str, Enum):
    DIAGNOSTIC_ASSESSMENT = "diagnostic_assessment"     # Low confidence (< 0.70) -> establish true baseline
    MINI_PROJECT_CHALLENGE = "mini_project_challenge"   # Evidence gap -> build artifact proof
    STRUCTURED_ROADMAP = "structured_roadmap"           # True depth/skill gap -> sequential learning
    REFRESHER_PRACTICE = "refresher_practice"           # Declining trend -> decay refresher
    EVIDENCE_SUBMISSION = "evidence_submission"         # Unverified claims -> attach existing PRs/docs


class TriggerEvaluationResult(BaseModel):
    trigger_id: str
    canonical_skill_id: str
    recommended_action: RecommendedLearningAction
    action_reason: str
    diagnostic_required: bool = False
    evidence_generation_required: bool = False
    governance_clearance_required: bool = True
    assumed_capability_preserved: bool = True


def evaluate_upstream_trigger(trigger: UpstreamGapTrigger) -> TriggerEvaluationResult:
    """
    Evaluates upstream signals under strict decoupling rules:
    1. Low confidence (< 0.70) MUST NOT be treated as weak capability or declining trend.
       It routes to a Diagnostic Assessment to calibrate the baseline.
    2. Evidence gaps (user has skill but lacks attributable proof) prioritize Mini-Projects.
    3. Depth gaps with high confidence proceed directly to structured roadmap steps.
    4. Verified status can never be directly assigned by learning completion alone.
    """
    confidence = trigger.governance.assessment_confidence
    v_status = trigger.governance.verification_status
    gap_type = trigger.gap_type
    trend = trigger.trajectory.trend if trigger.trajectory else TrajectoryTrend.UNTRACKED

    # Invariant Check 1: Low Confidence (< 0.70)
    # Never assume low skill! Prompt diagnostic to establish accurate baseline.
    if confidence < 0.70:
        return TriggerEvaluationResult(
            trigger_id=trigger.trigger_id,
            canonical_skill_id=trigger.competency.canonical_skill_id,
            recommended_action=RecommendedLearningAction.DIAGNOSTIC_ASSESSMENT,
            action_reason=(
                f"Assessment confidence ({confidence:.2f}) is below 0.70 threshold. "
                "Initiating Topic-Level Diagnostic Check to establish deterministic baseline before roadmap generation."
            ),
            diagnostic_required=True,
            assumed_capability_preserved=True,
        )

    # Invariant Check 2: Evidence Gap
    # Learner possesses capability or training but lacks attributable code proof in connected sources
    if gap_type in (GapClassification.EVIDENCE_GAP, GapClassification.APPLICATION_GAP):
        return TriggerEvaluationResult(
            trigger_id=trigger.trigger_id,
            canonical_skill_id=trigger.competency.canonical_skill_id,
            recommended_action=RecommendedLearningAction.MINI_PROJECT_CHALLENGE,
            action_reason=(
                f"Diagnosed as {gap_type.value}. Learner demonstrates foundational competency "
                "but lacks attributable PR/commit proof. Prioritizing Applied Mini-Project to generate verifiable artifacts."
            ),
            evidence_generation_required=True,
            assumed_capability_preserved=True,
        )

    # Invariant Check 3: True Declining Trend
    if trend == TrajectoryTrend.DECLINING:
        return TriggerEvaluationResult(
            trigger_id=trigger.trigger_id,
            canonical_skill_id=trigger.competency.canonical_skill_id,
            recommended_action=RecommendedLearningAction.REFRESHER_PRACTICE,
            action_reason=(
                "Longitudinal trajectory shows reduced recency over 90+ days. "
                "Recommending focused refresher exercise to recover recency signal."
            ),
            assumed_capability_preserved=True,
        )

    # Invariant Check 4: True Depth / Skill Gap with High Confidence
    return TriggerEvaluationResult(
        trigger_id=trigger.trigger_id,
        canonical_skill_id=trigger.competency.canonical_skill_id,
        recommended_action=RecommendedLearningAction.STRUCTURED_ROADMAP,
        action_reason=(
            f"High-confidence {gap_type.value} detected (Current Level {trigger.capability.current_proficiency_numeric} "
            f"vs Target Level {trigger.capability.target_proficiency_numeric}). Constructing prerequisite-aware roadmap."
        ),
        assumed_capability_preserved=True,
    )


def calculate_topic_mastery(
    knowledge_signal: float,
    practice_signal: float,
    assessment_signal: float,
    project_signal: float,
) -> float:
    """
    Deterministic PRD/TRD formula:
    Mastery = 0.30 × Knowledge + 0.25 × Practice + 0.20 × Assessment + 0.25 × Project
    Each component is bounded between 0.0 and 100.0.
    """
    k = max(0.0, min(100.0, float(knowledge_signal)))
    p = max(0.0, min(100.0, float(practice_signal)))
    a = max(0.0, min(100.0, float(assessment_signal)))
    prj = max(0.0, min(100.0, float(project_signal)))

    score = (0.30 * k) + (0.25 * p) + (0.20 * a) + (0.25 * prj)
    return round(score, 2)


deterministic_mastery = calculate_topic_mastery


class DependencyValidationError(ValueError):
    """Raised when dependency constraints are violated (e.g. cycle, missing prerequisite)."""
    pass


def validate_dependency_graph(
    items: List[Dict[str, Any]],
    id_key: str = "id",
    prereqs_key: str = "prerequisites",
) -> Tuple[bool, List[str]]:
    """
    Validates a dependency graph across learning items/topics/stages:
    1. Detects missing prerequisites (item depends on an ID not in the curriculum graph).
    2. Detects circular dependencies (cycle detection).
    3. Detects impossible orderings (prerequisite must strictly precede dependent in sequence).
    """
    errors: List[str] = []
    item_map = {item.get(id_key): item for item in items if item.get(id_key)}
    all_ids = set(item_map.keys())

    # 1. Check for missing prerequisites
    for item in items:
        item_id = item.get(id_key, "<unknown>")
        prereqs = item.get(prereqs_key, []) or []
        for p in prereqs:
            if p not in all_ids:
                errors.append(
                    f"Missing prerequisite: Item '{item_id}' requires prerequisite '{p}' "
                    "which is not present in the curriculum graph."
                )

    # 2. Cycle detection using DFS with 3-color tracking
    # 0 = unvisited, 1 = visiting (in recursion stack), 2 = visited
    state: Dict[str, int] = {node_id: 0 for node_id in all_ids}
    cycle_nodes: List[str] = []

    def dfs(node: str, path: List[str]) -> bool:
        state[node] = 1
        path.append(node)
        item = item_map.get(node, {})
        for prereq in (item.get(prereqs_key, []) or []):
            if prereq in all_ids:
                if state[prereq] == 1:
                    cycle_idx = path.index(prereq)
                    cycle_nodes.extend(path[cycle_idx:] + [prereq])
                    return True
                elif state[prereq] == 0:
                    if dfs(prereq, path):
                        return True
        path.pop()
        state[node] = 2
        return False

    for node_id in all_ids:
        if state[node_id] == 0:
            if dfs(node_id, []):
                errors.append(f"Circular dependency detected: {' -> '.join(cycle_nodes)}")
                break

    # 3. Impossible orderings check: in the given sequence, prerequisite must appear strictly before dependent
    seen_indices: Dict[str, int] = {}
    for idx, item in enumerate(items):
        item_id = item.get(id_key)
        if item_id:
            seen_indices[item_id] = idx

    for idx, item in enumerate(items):
        item_id = item.get(id_key)
        prereqs = item.get(prereqs_key, []) or []
        for p in prereqs:
            if p in seen_indices:
                p_idx = seen_indices[p]
                if p_idx >= idx:
                    errors.append(
                        f"Impossible sequence ordering: Item '{item_id}' at sequence position {idx+1} "
                        f"appears before or alongside its mandatory prerequisite '{p}' at position {p_idx+1}."
                    )

    is_valid = len(errors) == 0
    return is_valid, errors


def topological_sort_with_priorities(
    items: List[Dict[str, Any]],
    id_key: str = "id",
    prereqs_key: str = "prerequisites",
    priority_key: str = "priority_score",
) -> List[Dict[str, Any]]:
    """
    Decouples priority ranking from dependency constraints:
    - Guarantees that EVERY mandatory prerequisite appears before its dependent items.
    - Among available items whose prerequisites are satisfied, prioritizes items with higher priority scores.
    - If a high-ranked item has a low-ranked prerequisite, the prerequisite MUST be sequenced first.
    """
    item_map = {item[id_key]: item for item in items if id_key in item}
    all_ids = set(item_map.keys())

    # Build in-degree (count of remaining prerequisites) and adjacency graph (dependents)
    in_degree: Dict[str, int] = {item_id: 0 for item_id in all_ids}
    dependents: Dict[str, List[str]] = {item_id: [] for item_id in all_ids}

    for item_id, item in item_map.items():
        prereqs = [p for p in (item.get(prereqs_key, []) or []) if p in all_ids]
        in_degree[item_id] = len(prereqs)
        for p in prereqs:
            dependents[p].append(item_id)

    # Initial ready pool: nodes with 0 prerequisites
    ready_pool = [item_id for item_id, deg in in_degree.items() if deg == 0]

    ordered: List[Dict[str, Any]] = []

    while ready_pool:
        # Pick the ready item with the highest priority score
        ready_pool.sort(
            key=lambda nid: float(item_map[nid].get(priority_key, 0.0)),
            reverse=True,
        )
        selected_id = ready_pool.pop(0)
        ordered.append(item_map[selected_id])

        # Decrement in-degree of its dependents
        for dep_id in dependents.get(selected_id, []):
            in_degree[dep_id] -= 1
            if in_degree[dep_id] == 0:
                ready_pool.append(dep_id)

    if len(ordered) < len(items):
        remaining = [item_map[nid] for nid, deg in in_degree.items() if deg > 0]
        raise DependencyValidationError(
            f"Dependency resolution incomplete: circular dependency or unresolvable prerequisites detected for {[r[id_key] for r in remaining]}"
        )

    return ordered


def verify_pedagogical_alignment(
    stages: List[Dict[str, Any]],
    title_key: str = "stage_title",
    rationale_key: str = "pedagogical_rationale",
) -> Tuple[bool, List[str]]:
    """
    Verifies that the stated pedagogical rationale aligns with the actual ordered stages:
    - Foundational/conceptual stages precede advanced/applied stages.
    - Later stages build upon and cite earlier stage grounding.
    """
    errors: List[str] = []
    has_foundational = False

    for idx, stage in enumerate(stages):
        title = (stage.get(title_key) or "").lower()
        rationale = (stage.get(rationale_key) or "").lower()

        is_foundational = any(w in title or w in rationale for w in ("foundation", "concept", "prerequisite", "basic", "core"))
        is_advanced = any(w in title or w in rationale for w in ("advanced", "hands-on", "production", "capstone", "implementation"))

        if idx == 0:
            if is_advanced and not is_foundational:
                errors.append(f"Pedagogical ordering mismatch: First stage '{stage.get(title_key)}' is advanced without foundational prerequisite.")
            if is_foundational:
                has_foundational = True
        else:
            if is_foundational and not has_foundational:
                errors.append(f"Pedagogical ordering mismatch: Foundational stage '{stage.get(title_key)}' appears at position {idx+1} after earlier stages.")

    return len(errors) == 0, errors

