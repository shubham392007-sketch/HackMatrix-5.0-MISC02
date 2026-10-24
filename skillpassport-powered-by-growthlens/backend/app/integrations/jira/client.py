import httpx
import base64
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.app.core.exceptions import ConnectorAuthError
from backend.app.core.logging import get_logger

logger = get_logger("integrations.jira")


def extract_adf_text(content: Any) -> str:
    """Extracts human-readable plaintext from Atlassian Document Format (ADF) JSON structure."""
    if isinstance(content, str):
        return content
    if not isinstance(content, dict):
        return ""

    text_parts = []
    if content.get("type") == "text":
        return content.get("text", "")

    for child in content.get("content", []):
        text_parts.append(extract_adf_text(child))

    return " ".join([p for p in text_parts if p.strip()])


class JiraCloudClient:
    def __init__(self, site_url: str, email: str, api_token: str):
        # Normalize site URL
        cleaned_url = site_url.strip().rstrip("/")
        if not cleaned_url.startswith("http"):
            cleaned_url = f"https://{cleaned_url}"
        self.site_url = cleaned_url
        self.email = email.strip()
        self.api_token = api_token.strip()

        # Jira Cloud uses Basic Auth with email:api_token
        auth_bytes = f"{self.email}:{self.api_token}".encode("utf-8")
        auth_header = base64.b64encode(auth_bytes).decode("utf-8")
        self.headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth_header}",
            "User-Agent": "SkillPassport-Evidence-Ingestion/1.0",
        }

    async def test_connection(self) -> Dict[str, Any]:
        """
        Validates credentials against Jira Cloud /rest/api/3/myself.
        Returns user profile and site identity.
        """
        logger.info(f"Testing Jira connection to {self.site_url} for {self.email}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{self.site_url}/rest/api/3/myself", headers=self.headers)
            except (httpx.TimeoutException, httpx.ConnectTimeout) as e:
                logger.error(f"Jira timeout error: {e}")
                return {
                    "valid": False,
                    "error_category": "NETWORK_TIMEOUT",
                    "message": f"Connection to Jira site '{self.site_url}' timed out. Please check your network and try again.",
                }
            except httpx.RequestError as e:
                logger.error(f"Jira network error: {e}")
                return {
                    "valid": False,
                    "error_category": "NETWORK_UNAVAILABLE",
                    "message": f"Could not connect to Jira site '{self.site_url}'. Check site URL and network.",
                }

        if response.status_code == 401:
            return {
                "valid": False,
                "error_category": "INVALID_CREDENTIALS",
                "message": "Invalid Jira account email or API token.",
            }
        elif response.status_code == 403:
            return {
                "valid": False,
                "error_category": "FORBIDDEN",
                "message": "User lacks access to Jira REST API or account is suspended.",
            }
        elif response.status_code == 404:
            return {
                "valid": False,
                "error_category": "WRONG_SITE_URL",
                "message": f"Jira Cloud API not found at {self.site_url}. Confirm your Atlassian site domain.",
            }
        elif response.status_code == 429:
            retry_after = response.headers.get("Retry-After", "10")
            return {
                "valid": False,
                "error_category": "RATE_LIMITED",
                "message": f"Jira API rate limit exceeded. Please retry after {retry_after} seconds.",
            }
        elif response.status_code != 200:
            return {
                "valid": False,
                "error_category": "API_ERROR",
                "message": f"Jira returned HTTP {response.status_code}.",
            }

        data = response.json()
        return {
            "valid": True,
            "account_id": data.get("accountId"),
            "display_name": data.get("displayName"),
            "email_address": data.get("emailAddress") or self.email,
            "site_url": self.site_url,
            "time_zone": data.get("timeZone"),
            "active": data.get("active", True),
        }

    async def list_projects(self, max_projects: int = 100) -> List[Dict[str, Any]]:
        """
        Lists accessible projects in the Jira instance with pagination.
        Supports up to max_projects.
        """
        results: List[Dict[str, Any]] = []
        start_at = 0
        page_size = 50

        async with httpx.AsyncClient(timeout=12.0) as client:
            while start_at < max_projects:
                params = {
                    "startAt": start_at,
                    "maxResults": min(page_size, max_projects - start_at),
                    "expand": "description,lead",
                }
                try:
                    response = await client.get(
                        f"{self.site_url}/rest/api/3/project/search",
                        headers=self.headers,
                        params=params,
                    )
                except httpx.RequestError as e:
                    logger.error(f"Error fetching Jira projects at startAt={start_at}: {e}")
                    if results:
                        break
                    raise ConnectorAuthError("Jira", f"Failed to connect to Jira projects endpoint: {e}")

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "2"))
                    await asyncio.sleep(min(retry_after, 5))
                    continue

                if response.status_code != 200:
                    if results:
                        break
                    raise ConnectorAuthError("Jira", f"Failed to list projects: HTTP {response.status_code}")

                data = response.json()
                values = data.get("values", [])
                if not values:
                    break

                for p in values:
                    lead = p.get("lead") or {}
                    results.append({
                        "id": str(p.get("id")),
                        "key": p.get("key"),
                        "name": p.get("name"),
                        "project_type_key": p.get("projectTypeKey", "software"),
                        "url": f"{self.site_url}/browse/{p.get('key')}",
                        "avatar_url": p.get("avatarUrls", {}).get("48x48"),
                        "description": p.get("description"),
                        "lead_name": lead.get("displayName"),
                    })

                is_last = data.get("isLast", True)
                if is_last or len(values) < page_size:
                    break

                start_at += len(values)

        return results

    async def search_issues(
        self,
        project_key: str,
        since_timestamp: Optional[datetime] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Searches recent completed/updated issues in project.
        Supports incremental sync using since_timestamp.
        """
        jql = f"project = '{project_key}'"
        if since_timestamp:
            since_str = since_timestamp.strftime("%Y-%m-%d %H:%M")
            jql += f" AND updated >= '{since_str}'"
        jql += " ORDER BY updated DESC"

        results: List[Dict[str, Any]] = []
        start_at = 0
        batch_size = min(limit, 50)

        async with httpx.AsyncClient(timeout=15.0) as client:
            while len(results) < limit:
                params = {
                    "jql": jql,
                    "startAt": start_at,
                    "maxResults": min(batch_size, limit - len(results)),
                    "fields": "summary,description,status,issuetype,assignee,reporter,created,updated,resolutiondate,components,labels",
                }
                try:
                    response = await client.get(
                        f"{self.site_url}/rest/api/3/search",
                        headers=self.headers,
                        params=params,
                    )
                except httpx.RequestError as e:
                    logger.warning(f"Network error querying Jira issues for project {project_key}: {e}")
                    break

                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", "2"))
                    logger.warning(f"Jira 429 rate limited for {project_key}. Backing off for {retry_after}s.")
                    await asyncio.sleep(min(retry_after, 5))
                    continue

                if response.status_code != 200:
                    logger.warning(f"Could not search issues for project {project_key}: HTTP {response.status_code}")
                    break

                data = response.json()
                issues = data.get("issues", [])
                if not issues:
                    break

                for issue in issues:
                    fields = issue.get("fields", {})
                    desc = extract_adf_text(fields.get("description"))
                    assignee = fields.get("assignee") or {}
                    reporter = fields.get("reporter") or {}
                    components = [c.get("name") for c in fields.get("components", []) if c.get("name")]
                    labels = fields.get("labels") or []

                    results.append({
                        "id": str(issue.get("id")),
                        "key": issue.get("key"),
                        "summary": fields.get("summary") or "Untitled Issue",
                        "description": desc,
                        "status_name": fields.get("status", {}).get("name", "Unknown"),
                        "status_category": fields.get("status", {}).get("statusCategory", {}).get("key", "undefined"),
                        "issue_type": fields.get("issuetype", {}).get("name", "Task"),
                        "assignee_name": assignee.get("displayName"),
                        "assignee_email": assignee.get("emailAddress"),
                        "reporter_name": reporter.get("displayName"),
                        "reporter_email": reporter.get("emailAddress"),
                        "components": components,
                        "labels": labels,
                        "created_at": fields.get("created"),
                        "updated_at": fields.get("updated"),
                        "resolved_at": fields.get("resolutiondate"),
                        "url": f"{self.site_url}/browse/{issue.get('key')}",
                        "project_key": project_key,
                    })

                total = data.get("total", 0)
                start_at += len(issues)
                if start_at >= total or len(issues) < batch_size:
                    break

        return results
