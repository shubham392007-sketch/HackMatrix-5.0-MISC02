from datetime import datetime, timezone
import pytest
from backend.schemas.evidence import CanonicalEvidence
from backend.evidence.normalizer import truncate_content, sanitize_text
from backend.evidence.deduplication import build_evidence_dedup_key


def test_canonical_evidence_validation():
    now = datetime.now(timezone.utc)
    ev = CanonicalEvidence(
        source="github",
        source_type="commit",
        source_reference="org/repo#abc1234",
        title="Refactor ETL pipeline",
        content="Optimized Pandas chunking logic",
        occurred_at=now,
        project_name="DataEngine",
        evidence_strength=0.9
    )
    assert ev.evidence_id is not None
    assert ev.source == "github"
    assert ev.source_type == "commit"
    assert ev.evidence_strength == 0.9
    assert ev.is_mapped is True


def test_deduplication_pair_creation():
    pair = build_evidence_dedup_key("GitHub", "myorg/repo#abc1234")
    assert pair == ("github", "myorg/repo#abc1234")


def test_content_truncation():
    giant_text = "word " * 1000
    truncated = truncate_content(giant_text, max_length=200)
    assert len(truncated) <= 230
    assert "[Content truncated...]" in truncated
