"""Normalizer to map GitHub raw payloads to CanonicalEvidence."""
from datetime import datetime, timezone
from typing import Any, Dict
from backend.schemas.evidence import CanonicalEvidence
from backend.evidence.normalizer import truncate_content, sanitize_text


def normalize_github_commit(
    commit: Dict[str, Any],
    owner: str,
    repo: str,
    employee_id: str | None = None
) -> CanonicalEvidence:
    """Normalize a GitHub commit dictionary into CanonicalEvidence."""
    sha = commit.get("sha", "")
    commit_data = commit.get("commit", {})
    message = commit_data.get("message", "No commit message")
    author_info = commit_data.get("author", {}) or {}
    github_author = commit.get("author") or {}
    
    author_username = github_author.get("login") or author_info.get("name") or "unknown"
    author_email = author_info.get("email")

    date_str = author_info.get("date")
    occurred_at = datetime.fromisoformat(date_str.replace("Z", "+00:00")) if date_str else datetime.now(timezone.utc)

    # First line of commit message as title
    lines = message.strip().split("\n")
    title = lines[0] if lines else "Git Commit"
    # Content bounded to avoid oversized diffs
    content = truncate_content(message, max_length=1500)

    source_reference = f"{owner}/{repo}#{sha}"
    html_url = commit.get("html_url", f"https://github.com/{owner}/{repo}/commit/{sha}")

    metadata = {
        "sha": sha,
        "author_username": author_username,
        "author_email": author_email,
        "html_url": html_url,
        "repository": f"{owner}/{repo}",
        "stats": commit.get("stats", {})
    }

    return CanonicalEvidence(
        employee_id=employee_id,
        source="github",
        source_type="commit",
        source_reference=source_reference,
        project_id=f"{owner}/{repo}",
        project_name=repo,
        title=title,
        content=content,
        occurred_at=occurred_at,
        evidence_type="commit",
        evidence_strength=0.85,
        metadata=metadata,
        is_mapped=employee_id is not None,
        unmapped_external_identity=author_username if employee_id is None else None
    )


def normalize_github_pr(
    pr: Dict[str, Any],
    owner: str,
    repo: str,
    employee_id: str | None = None
) -> CanonicalEvidence:
    """Normalize a GitHub pull request into CanonicalEvidence."""
    number = pr.get("number")
    title = pr.get("title", f"Pull Request #{number}")
    body = pr.get("body") or "No description provided."
    user_info = pr.get("user", {}) or {}
    author_username = user_info.get("login", "unknown")

    created_at_str = pr.get("created_at")
    occurred_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00")) if created_at_str else datetime.now(timezone.utc)

    content_text = f"Title: {title}\nDescription:\n{body}\nState: {pr.get('state')}"
    content = truncate_content(content_text, max_length=1500)
    source_reference = f"{owner}/{repo}#pr-{number}"

    metadata = {
        "pr_number": number,
        "state": pr.get("state"),
        "author_username": author_username,
        "html_url": pr.get("html_url"),
        "merged_at": pr.get("merged_at"),
        "repository": f"{owner}/{repo}",
    }

    return CanonicalEvidence(
        employee_id=employee_id,
        source="github",
        source_type="pull_request",
        source_reference=source_reference,
        project_id=f"{owner}/{repo}",
        project_name=repo,
        title=title,
        content=content,
        occurred_at=occurred_at,
        evidence_type="pull_request",
        evidence_strength=0.9,
        metadata=metadata,
        is_mapped=employee_id is not None,
        unmapped_external_identity=author_username if employee_id is None else None
    )
