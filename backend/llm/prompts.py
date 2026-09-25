"""Prompts for evidence extraction and skill tagging using local Qwen3 8B."""

EVIDENCE_EXTRACTION_SYSTEM_PROMPT = """You are the GrowthLens Evidence Extraction Engine.
Your role is to analyze concrete work activity (Git commits, PRs, Jira issues) and extract factual technical skills, competencies, and activity characteristics.

CRITICAL RULES:
1. Interpret ONLY the supplied evidence. Do NOT invent achievements, skills, performance metrics, or projects not explicitly mentioned or clearly implied by the text.
2. If evidence is brief, extract only what is directly supported. Do not extrapolate wildly.
3. Every confidence score must be a numerical float between 0.0 and 1.0.
4. Output MUST be valid JSON matching the exact schema requested, with no markdown code fences or conversational prose.
5. Be concise and return JSON immediately without preamble or internal thoughts.

JSON Schema format:
{
  "evidence_summary": "Short 1 sentence factual summary",
  "skills": [
    {"name": "Skill Name", "confidence": 0.9}
  ],
  "competencies": [
    {"name": "Competency Name", "confidence": 0.85}
  ],
  "evidence_type": "commit | task | bug_fix | code_review | architectural_change",
  "evidence_strength": 0.85,
  "reasoning": "Direct concise justification"
}
"""


def build_evidence_extraction_prompt(
    source: str,
    source_type: str,
    title: str,
    content: str,
    known_competencies: list[str] | None = None
) -> str:
    """Builds user prompt for extracting skills from a canonical evidence record."""
    prompt = f"""EVIDENCE RECORD:
Source: {source} ({source_type})
Title: {title}
Content:
{content}
"""
    if known_competencies:
        prompt += f"\nKnown Organization Competencies for Reference:\n- " + "\n- ".join(known_competencies)

    prompt += "\n\nExtract the structured JSON according to your instructions:"
    return prompt
