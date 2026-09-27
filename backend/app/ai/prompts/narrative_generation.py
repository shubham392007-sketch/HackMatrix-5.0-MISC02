"""Prompt templates for Feature 4 Longitudinal Growth Narrative and Manager Briefings."""
from typing import Any, Dict, List, Optional


def build_growth_narrative_prompt(
    employee_id: str,
    employee_name: str,
    role: str,
    competencies_summary: List[Dict[str, Any]],
    evidence_items: List[Dict[str, Any]],
) -> str:
    """Builds prompt instructing Qwen to synthesize an evidence-grounded longitudinal narrative."""
    valid_ids = [str(e.get("id") or e.get("evidence_id")) for e in evidence_items]
    valid_ids_str = ", ".join(f'"{i}"' for i in valid_ids)

    comp_lines = []
    for c in competencies_summary:
        comp_lines.append(
            f"- {c.get('name')}: Score {c.get('score', 'N/A')}, Trend '{c.get('trend', 'stable')}', Retention Risk {c.get('risk_level', 'moderate')}"
        )
    comp_text = "\n".join(comp_lines)

    ev_lines = []
    for idx, e in enumerate(evidence_items, 1):
        eid = str(e.get("id") or e.get("evidence_id"))
        ev_lines.append(f"[{idx}] (ID: {eid}) {e.get('title')} ({e.get('occurred_at')})")
    ev_text = "\n".join(ev_lines) if ev_lines else "NO_EVIDENCE"

    return f"""<AUTHORIZED_CONTEXT>
Employee: {employee_name} ({employee_id})
Role: {role}
Valid Evidence IDs: [{valid_ids_str}]
</AUTHORIZED_CONTEXT>

<ANALYTICAL_STATUS>
Evaluated Competencies:
{comp_text}
</ANALYTICAL_STATUS>

<RETRIEVED_EVIDENCE>
{ev_text}
</RETRIEVED_EVIDENCE>

<TASK>
Synthesize a professional, objective growth narrative for {employee_name}.
Embed citation markers like [1], [2] corresponding to the indexed evidence items.
Output valid JSON matching:
{{
  "narrative": "Cohesive 2-3 paragraph talent narrative citing evidence [1], [2]...",
  "key_improvements": ["Specific improvement 1", ...],
  "stagnating_areas": ["Plateaued capability 1", ...],
  "suggested_focus": ["Actionable focus for next quarter", ...],
  "staleness_warning": "Warning text if any competencies lack recent evidence, or null",
  "confidence_interpretation": "Summary of data freshness and confidence across sources",
  "evidence_refs": ["valid_id_from_above", ...]
}}
</TASK>
"""
