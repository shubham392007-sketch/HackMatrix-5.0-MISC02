import pytest
from backend.llm.schemas import EvidenceExtractionResult, ExtractedSkill, ExtractedCompetency
from backend.llm.service import LLMService


def test_extraction_schema_validation():
    data = {
        "evidence_summary": "Implemented JWT middleware authentication",
        "skills": [{"name": "JWT", "confidence": 0.95}, {"name": "FastAPI", "confidence": 0.88}],
        "competencies": [{"name": "Backend Engineering & API Development", "confidence": 0.92}],
        "evidence_type": "commit",
        "evidence_strength": 0.85,
        "reasoning": "Commit adds JWT middleware to protect endpoints."
    }
    result = EvidenceExtractionResult.model_validate(data)
    assert result.evidence_summary == "Implemented JWT middleware authentication"
    assert len(result.skills) == 2
    assert result.skills[0].confidence == 0.95
    assert result.competencies[0].name == "Backend Engineering & API Development"


def test_extraction_schema_confidence_bounds():
    # Confidence > 1.0 must fail validation
    with pytest.raises(Exception):
        ExtractedSkill(name="Python", confidence=1.5)

    # Confidence < 0.0 must fail validation
    with pytest.raises(Exception):
        ExtractedCompetency(name="Data", confidence=-0.1)


def test_llm_service_json_parsing_with_code_fences():
    svc = LLMService()
    raw = """```json
    {
      "evidence_summary": "Fixed connection timeout",
      "skills": [{"name": "PostgreSQL", "confidence": 0.85}],
      "competencies": [{"name": "Database Systems & Storage", "confidence": 0.9}],
      "evidence_type": "bug_fix",
      "evidence_strength": 0.8,
      "reasoning": "Fixed query timeout in DB layer"
    }
    ```"""
    parsed = svc._parse_and_validate_extraction(raw)
    assert parsed.evidence_type == "bug_fix"
    assert parsed.skills[0].name == "PostgreSQL"
