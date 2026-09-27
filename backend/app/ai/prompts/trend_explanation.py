"""Prompt templates for Feature 2 Analytical Trajectory & Trend Explanation."""
from typing import Any, Dict, List, Optional


def build_trend_explanation_prompt(
    employee_id: str,
    competency: str,
    trend: str,
    confidence: float,
    period: str,
    trajectory_points: List[Dict[str, Any]],
    evidence_items: List[Dict[str, Any]],
) -> str:
    """Builds prompt instructing Qwen to explain the deterministic Weibull/analytical trend."""
    valid_ids = [str(e.get("id") or e.get("evidence_id")) for e in evidence_items]
    valid_ids_str = ", ".join(f'"{i}"' for i in valid_ids)

    evidence_formatted = []
    for e in evidence_items:
        eid = str(e.get("id") or e.get("evidence_id"))
        evidence_formatted.append(
            f"Evidence ID: {eid} | {e.get('occurred_at')} | {e.get('title')}: {e.get('content')}"
        )
    evidence_text = "\n".join(evidence_formatted) if evidence_formatted else "NO_EVIDENCE_RECORDS"

    return f"""<AUTHORIZED_CONTEXT>
Employee ID: {employee_id}
Competency: {competency}
Evaluation Period: {period}
Valid Evidence IDs: [{valid_ids_str}]
</AUTHORIZED_CONTEXT>

<ANALYTICAL_RESULT>
Authoritative Calculated Trend: {trend}
Analytical Model Confidence: {confidence}
Trajectory Milestones: {trajectory_points}
[CRITICAL: You must EXPLAIN why the analytical engine observed the trend '{trend}'. You MUST NOT change or override this trend status.]
</ANALYTICAL_RESULT>

<RETRIEVED_EVIDENCE>
{evidence_text}
</RETRIEVED_EVIDENCE>

<TASK>
Explain the observed trajectory in natural language grounded directly in the evidence items.
Output valid JSON matching:
{{
  "competency": "{competency}",
  "trend": "{trend}",
  "summary": "1-2 paragraph clear explanation of growth or retention pattern",
  "supporting_evidence": ["Summary of items supporting this trend", ...],
  "contradictory_evidence": ["Summary of contradictory or ambiguous items, if any", ...],
  "missing_evidence": "Gaps, cadence dropoffs, or recency issues",
  "confidence": {confidence},
  "insufficient_evidence": false,
  "evidence_refs": ["valid_id_from_above", ...]
}}

If evidence is too sparse to support '{trend}', set "insufficient_evidence": true and explain what is missing.
</TASK>
"""
