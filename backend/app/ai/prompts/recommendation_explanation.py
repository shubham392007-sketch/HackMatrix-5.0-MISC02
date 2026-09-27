"""Prompt templates for Feature 3 Recommendation Explanation and Contextualization."""
from typing import Any, Dict, List


def build_recommendation_explanation_prompt(
    employee_id: str,
    competency: str,
    trend: str,
    recommended_action: Dict[str, Any],
    evidence_items: List[Dict[str, Any]],
) -> str:
    """Builds prompt instructing Qwen to ground a recommended micro-learning or mentorship action in observed gaps."""
    valid_ids = [str(e.get("id") or e.get("evidence_id")) for e in evidence_items]
    valid_ids_str = ", ".join(f'"{i}"' for i in valid_ids)

    ev_summaries = []
    for e in evidence_items:
        eid = str(e.get("id") or e.get("evidence_id"))
        ev_summaries.append(f"[{eid}] {e.get('title')}: {e.get('content')}")
    ev_text = "\n".join(ev_summaries) if ev_summaries else "NO_EVIDENCE"

    act_type = recommended_action.get("type", "micro_learning")
    act_title = recommended_action.get("title", recommended_action.get("action", "Recommended Action"))
    act_topic = recommended_action.get("topic", "Skill Advancement")

    return f"""<AUTHORIZED_CONTEXT>
Employee ID: {employee_id}
Competency: {competency} (Observed Trend: {trend})
Valid Evidence IDs: [{valid_ids_str}]
</AUTHORIZED_CONTEXT>

<RECOMMENDATION_DECISION>
Selected Action Title: {act_title}
Action Category: {act_type}
Target Topic: {act_topic}
[CRITICAL: Do NOT alter or replace this recommended action. Your task is to explain WHY this action addresses the observed gap.]
</RECOMMENDATION_DECISION>

<RETRIEVED_EVIDENCE>
{ev_text}
</RETRIEVED_EVIDENCE>

<TASK>
Explain the rationale connecting the observed evidence gap to this specific intervention.
Output valid JSON matching:
{{
  "action": "{act_title}",
  "action_type": "{act_type}",
  "target_gap": "Specific deficit or decelerating skill area identified from evidence",
  "reason": "Clear explanation of how the recommendation targets that exact deficit",
  "expected_benefit": "Expected technical and retention impact upon completion",
  "evidence_refs": ["valid_id_from_above", ...],
  "confidence": 0.85
}}
</TASK>
"""
