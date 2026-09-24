"""Jira Cloud REST API Client with security controls and pagination."""
from typing import Any, Dict, List, Optional
import httpx

from backend.core.config import get_settings
from backend.core.exceptions import JiraIntegrationError
from backend.core.logging import get_logger

logger = get_logger("integrations.jira.client")


class JiraClient:
    """Client for interacting with the Jira Cloud REST API (v3)."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        email: Optional[str] = None,
        api_token: Optional[str] = None,
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.jira_base_url).rstrip("/")
        self.email = email or settings.jira_email
        self.api_token = api_token or settings.jira_api_token
        self.auth = (self.email, self.api_token) if (self.email and self.api_token) else None
        self._headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "GrowthLens-Evidence-Pipeline",
        }

    def test_connection(self) -> Dict[str, Any]:
        """Validate credentials against Jira /myself endpoint."""
        if not self.base_url or not self.auth:
            return {"authenticated": False, "message": "Jira credentials or base URL not configured"}
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/rest/api/3/myself", headers=self._headers, auth=self.auth)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "authenticated": True,
                        "display_name": data.get("displayName"),
                        "email": data.get("emailAddress"),
                    }
                elif res.status_code in (401, 403):
                    raise JiraIntegrationError("Invalid Jira email or API token")
                else:
                    raise JiraIntegrationError(f"Jira connection failed: HTTP {res.status_code}")
        except httpx.RequestError as e:
            raise JiraIntegrationError(f"Jira network error: {str(e)}")

    def validate_project(self, project_key: str) -> Dict[str, Any]:
        """Validate that target project key exists and is accessible."""
        if not self.base_url or not self.auth:
            raise JiraIntegrationError("Jira credentials not configured")
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/rest/api/3/project/{project_key}", headers=self._headers, auth=self.auth)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "valid": True,
                        "key": data.get("key"),
                        "name": data.get("name"),
                        "project_type": data.get("projectTypeKey"),
                    }
                elif res.status_code == 404:
                    raise JiraIntegrationError(f"Jira project '{project_key}' not found")
                elif res.status_code in (401, 403):
                    raise JiraIntegrationError("Unauthorized to access Jira project")
                else:
                    raise JiraIntegrationError(f"Failed to access Jira project: HTTP {res.status_code}")
        except httpx.RequestError as e:
            raise JiraIntegrationError(f"Jira network error: {str(e)}")

    def search_issues(
        self,
        project_key: str,
        max_results: int = 50,
        start_at: int = 0,
    ) -> List[Dict[str, Any]]:
        """Search issues in project using JQL with pagination support."""
        if not self.base_url or not self.auth:
            raise JiraIntegrationError("Jira credentials not configured")
        try:
            jql = f"project = '{project_key}' ORDER BY updated DESC"
            fields = ["summary", "description", "status", "assignee", "creator", "updated", "created", "comment", "resolution"]
            with httpx.Client(timeout=15.0) as client:
                res = client.get(
                    f"{self.base_url}/rest/api/3/search",
                    headers=self._headers,
                    auth=self.auth,
                    params={
                        "jql": jql,
                        "maxResults": max_results,
                        "startAt": start_at,
                        "fields": ",".join(fields),
                    },
                )
                if res.status_code == 200:
                    return res.json().get("issues", [])
                elif res.status_code == 404:
                    raise JiraIntegrationError(f"Jira project '{project_key}' not found")
                elif res.status_code in (401, 403):
                    raise JiraIntegrationError("Unauthorized access to Jira search")
                else:
                    raise JiraIntegrationError(f"Jira search failed: HTTP {res.status_code}")
        except httpx.RequestError as e:
            raise JiraIntegrationError(f"Jira network error: {str(e)}")
