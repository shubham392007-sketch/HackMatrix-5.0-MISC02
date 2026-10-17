import httpx
import base64
from typing import Dict, Any, List, Optional
from backend.app.core.exceptions import ConnectorAuthError
from backend.app.core.logging import get_logger, mask_secret

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
                "message": "Invalid Jira email or API token.",
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

    async def list_projects(self) -> List[Dict[str, Any]]:
        """Lists accessible projects in the Jira instance."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.site_url}/rest/api/3/project/search",
                headers=self.headers,
                params={"recent": 20},
            )
            if response.status_code != 200:
                raise ConnectorAuthError("Jira", f"Failed to list projects: HTTP {response.status_code}")

            data = response.json()
            values = data.get("values", [])
            return [
                {
                    "id": p.get("id"),
                    "key": p.get("key"),
                    "name": p.get("name"),
                    "project_type_key": p.get("projectTypeKey"),
                    "url": f"{self.site_url}/browse/{p.get('key')}",
                    "avatar_url": p.get("avatarUrls", {}).get("48x48"),
                }
                for p in values
            ]

    async def search_issues(self, project_key: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Searches recent completed/updated issues in project."""
        jql = f"project = '{project_key}' ORDER BY updated DESC"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{self.site_url}/rest/api/3/search",
                headers=self.headers,
                params={
                    "jql": jql,
                    "maxResults": limit,
                    "fields": "summary,description,status,issuetype,assignee,reporter,created,updated,resolutiondate,components",
                },
            )
            if response.status_code != 200:
                logger.warning(f"Could not search issues for project {project_key}: {response.status_code}")
                return []

            data = response.json()
            issues = data.get("issues", [])
            results = []
            for issue in issues:
                fields = issue.get("fields", {})
                desc = extract_adf_text(fields.get("description"))
                assignee = fields.get("assignee") or {}
                results.append({
                    "id": issue.get("id"),
                    "key": issue.get("key"),
                    "summary": fields.get("summary"),
                    "description": desc,
                    "status_name": fields.get("status", {}).get("name"),
                    "status_category": fields.get("status", {}).get("statusCategory", {}).get("key"),
                    "issue_type": fields.get("issuetype", {}).get("name"),
                    "assignee_name": assignee.get("displayName"),
                    "assignee_email": assignee.get("emailAddress"),
                    "created_at": fields.get("created"),
                    "updated_at": fields.get("updated"),
                    "resolved_at": fields.get("resolutiondate"),
                    "url": f"{self.site_url}/browse/{issue.get('key')}",
                    "project_key": project_key,
                })
            return results
