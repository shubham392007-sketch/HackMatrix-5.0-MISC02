"""Prompts for RAG Evidence Justification Engine."""
from typing import List, Dict, Any

JUSTIFICATION_SYSTEM_PROMPT = """You are the GrowthLens Evidence Justification Engine.
Your role is to evaluate retrieved evidence for an employee and competency, and formulate an evidence-grounded recommendation or development action.

STRICT OPERATIONAL RULES:
1. Use ONLY the retrieved evidence supplied in the context. NEVER invent projects, commits, issues, outcomes, or employee achievements.
2. Distinguish direct observation from interpretation.
3. Every claim must reference the exact evidence ID(s) provided in the context (e.g. "evidence_refs": ["uuid-1", "uuid-2"]).
4. If retrieved evidence is insufficient or irrelevant to the competency, you MUST NOT invent a recommendation.
   In that case, respond strictly with:
   - "action": null
   - "justification": "Insufficient evidence to generate a competency-specific action."
   - "evidence_refs": []
   - "confidence": 0.0
   - "evidence_sufficiency": "insufficient"
5. If evidence is relevant, provide a concrete development action and detailed justification referencing the specific evidence items. Set "evidence_sufficiency" to "sufficient" or "limited".
6. Output MUST be valid JSON adhering to the specified schema, without any conversational preamble or markdown code fences.

JSON Schema format:
{
  "competency": "Competency Name",
  "action": "Concrete next action, or null if insufficient",
  "justification": "Evidence-grounded rationale explaining the decision",
  "evidence_refs": ["evidence-id-1", "evidence-id-2"],
  "confidence": 0.85,
  "evidence_sufficiency": "sufficient | limited | insufficient"
}
"""


def build_justification_context(
    employee_id: str,
    competency: str,
    evidence_items: List[Dict[str, Any]],
    user_query: str | None = None
) -> str:
    """Constructs a bounded, controlled context string from retrieved evidence records."""
    if not evidence_items:
        return f"""TARGET EMPLOYEE: {employee_id}
TARGET COMPETENCY: {competency}

RETRIEVED EVIDENCE:
[No relevant evidence records found for this employee and competency]
"""

    context_lines = [
        f"TARGET EMPLOYEE: {employee_id}",
        f"TARGET COMPETENCY: {competency}",
    ]
    if user_query:
        context_lines.append(f"SPECIFIC INQUIRY: {user_query}")

    context_lines.append("\nRETRIEVED EVIDENCE RECORDS:")
    for idx, ev in enumerate(evidence_items, 1):
        ev_id = ev.get("evidence_id")
        src = ev.get("source", "unknown")
        src_type = ev.get("source_type", "activity")
        title = ev.get("title", "")
        content = ev.get("content", "")
        occurred = ev.get("occurred_at", "")
        proj = ev.get("project_name", "")

        context_lines.append(
            f"--- [EVIDENCE ITEM {idx}] ---\n"
            f"Evidence ID: {ev_id}\n"
            f"Source: {src} ({src_type})\n"
            f"Project: {proj}\n"
            f"Timestamp: {occurred}\n"
            f"Title: {title}\n"
            f"Details: {content}\n"
        )

    context_lines.append("Generate the structured justification JSON based exclusively on the records above:")
    return "\n".join(context_lines)
