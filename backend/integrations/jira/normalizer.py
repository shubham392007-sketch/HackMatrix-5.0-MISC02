"""Normalizer to map Jira issues to CanonicalEvidence."""
from datetime import datetime, timezone
from typing import Any, Dict
from backend.schemas.evidence import CanonicalEvidence
from backend.evidence.normalizer import truncate_content, sanitize_text


def _extract_adf_text(content_node: Any) -> str:
    """Helper to recursively extract plain text from Jira ADF (Atlassian Document Format)."""
    if isinstance(content_node, str):
        return content_node
    if not isinstance(content_node, dict):
        return ""
    
    text = ""
    if content_node.get("type") == "text":
        text += content_node.get("text", "")
    
    for child in content_node.get("content", []):
        text += _extract_adf_text(child) + " "
    return text.strip()


def normalize_jira_issue(
    issue: Dict[str, Any],
    instance_url: str,
    project_key: str,
    employee_id: str | None = None
) -> CanonicalEvidence:
    """Normalize a Jira issue dictionary into CanonicalEvidence."""
    key = issue.get("key", "UNKNOWN-0")
    fields = issue.get("fields", {}) or {}

    summary = fields.get("summary", "No summary")
    raw_desc = fields.get("description")
    description_text = _extract_adf_text(raw_desc) if raw_desc else "No description"
    
    status_obj = fields.get("status") or {}
    status_name = status_obj.get("name", "Unknown")

    assignee_obj = fields.get("assignee") or {}
    assignee_email = assignee_obj.get("emailAddress")
    assignee_name = assignee_obj.get("displayName") or assignee_obj.get("accountId") or "unassigned"

    updated_str = fields.get("updated") or fields.get("created")
    occurred_at = datetime.fromisoformat(updated_str.replace("Z", "+00:00")) if updated_str else datetime.now(timezone.utc)

    # Content synthesis bounded to avoid flooding LLM
    content_raw = f"Issue: {key} - {summary}\nStatus: {status_name}\nDescription: {description_text}"
    content = truncate_content(content_raw, max_length=1500)

    # Source reference includes instance to ensure global uniqueness
    clean_instance = instance_url.replace("https://", "").replace("http://", "").rstrip("/")
    source_reference = f"{clean_instance}#{key}"

    metadata = {
        "issue_key": key,
        "summary": summary,
        "status": status_name,
        "assignee_email": assignee_email,
        "assignee_name": assignee_name,
        "project_key": project_key,
        "resolution": (fields.get("resolution") or {}).get("name") if fields.get("resolution") else None,
        "instance": clean_instance,
    }

    return CanonicalEvidence(
        employee_id=employee_id,
        source="jira",
        source_type="issue",
        source_reference=source_reference,
        project_id=project_key,
        project_name=project_key,
        title=f"[{key}] {summary}",
        content=content,
        occurred_at=occurred_at,
        evidence_type="task",
        evidence_strength=0.85,
        metadata=metadata,
        is_mapped=employee_id is not None,
        unmapped_external_identity=assignee_email or assignee_name if employee_id is None else None
    )
