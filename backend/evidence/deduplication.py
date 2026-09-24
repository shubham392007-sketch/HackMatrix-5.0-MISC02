"""Evidence deduplication utilities."""
from typing import Tuple


def build_evidence_dedup_key(source: str, source_reference: str) -> Tuple[str, str]:
    """
    Constructs the canonical deduplication pair for an evidence item.
    - GitHub: ('github', f'{owner}/{repo}#{sha}' or f'{owner}/{repo}#pr-{number}')
    - Jira: ('jira', f'{instance}#{issue_key}' or f'{instance}#{issue_key}-v{updated}')
    """
    return (source.lower().strip(), source_reference.strip())
