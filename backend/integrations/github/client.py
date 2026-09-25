"""GitHub API Client using HTTPX with security controls and pagination."""
from typing import Any, Dict, List, Optional
import httpx

from backend.core.config import get_settings
from backend.core.exceptions import GitHubIntegrationError
from backend.core.logging import get_logger

logger = get_logger("integrations.github.client")


class GitHubClient:
    """Client for interacting with the GitHub REST API."""

    def __init__(self, token: Optional[str] = None):
        settings = get_settings()
        self.token = token or settings.github_token
        self.base_url = "https://api.github.com"
        self._headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GrowthLens-Evidence-Pipeline",
        }
        if self.token:
            self._headers["Authorization"] = f"token {self.token}"

    def test_connection(self) -> Dict[str, Any]:
        """Validate credentials by querying current user or rate limit."""
        if not self.token:
            return {"authenticated": False, "message": "No GitHub token configured"}
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/user", headers=self._headers)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "authenticated": True,
                        "username": data.get("login"),
                        "rate_limit_remaining": res.headers.get("x-ratelimit-remaining"),
                    }
                elif res.status_code == 401:
                    raise GitHubIntegrationError("Invalid GitHub token")
                else:
                    raise GitHubIntegrationError(f"GitHub connection failed: HTTP {res.status_code}")
        except httpx.RequestError as e:
            raise GitHubIntegrationError(f"GitHub network error: {str(e)}")

    def validate_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Check if target repository exists and is accessible."""
        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"{self.base_url}/repos/{owner}/{repo}", headers=self._headers)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "valid": True,
                        "name": data.get("full_name"),
                        "default_branch": data.get("default_branch"),
                        "private": data.get("private"),
                    }
                elif res.status_code == 404:
                    msg = f"Repository {owner}/{repo} not found."
                    if not self.token:
                        msg += " If this repository is private, configure GITHUB_TOKEN in your .env or authenticate on /auth."
                    raise GitHubIntegrationError(msg)
                elif res.status_code == 401:
                    raise GitHubIntegrationError("Unauthorized: Token does not have repository access")
                else:
                    raise GitHubIntegrationError(f"Failed to access repository: HTTP {res.status_code}")
        except httpx.RequestError as e:
            raise GitHubIntegrationError(f"GitHub network error: {str(e)}")

    def get_commits(self, owner: str, repo: str, per_page: int = 30, max_pages: int = 1) -> List[Dict[str, Any]]:
        """Retrieve recent commits with pagination support."""
        commits = []
        try:
            with httpx.Client(timeout=15.0) as client:
                for page in range(1, max_pages + 1):
                    url = f"{self.base_url}/repos/{owner}/{repo}/commits"
                    params = {"per_page": per_page, "page": page}
                    res = client.get(url, headers=self._headers, params=params)
                    if res.status_code == 200:
                        batch = res.json()
                        if not batch:
                            break
                        commits.extend(batch)
                    elif res.status_code == 404:
                        raise GitHubIntegrationError(f"Repository {owner}/{repo} not found")
                    elif res.status_code == 403 and "rate limit" in res.text.lower():
                        raise GitHubIntegrationError("GitHub API rate limit exceeded")
                    else:
                        raise GitHubIntegrationError(f"GitHub API error fetching commits: HTTP {res.status_code}")
            return commits
        except httpx.RequestError as e:
            raise GitHubIntegrationError(f"Network error while fetching commits: {str(e)}")

    def get_pull_requests(self, owner: str, repo: str, state: str = "all", per_page: int = 30, max_pages: int = 1) -> List[Dict[str, Any]]:
        """Retrieve pull requests with pagination support."""
        pulls = []
        try:
            with httpx.Client(timeout=15.0) as client:
                for page in range(1, max_pages + 1):
                    url = f"{self.base_url}/repos/{owner}/{repo}/pulls"
                    params = {"state": state, "per_page": per_page, "page": page}
                    res = client.get(url, headers=self._headers, params=params)
                    if res.status_code == 200:
                        batch = res.json()
                        if not batch:
                            break
                        pulls.extend(batch)
                    elif res.status_code == 404:
                        raise GitHubIntegrationError(f"Repository {owner}/{repo} not found")
                    elif res.status_code == 403 and "rate limit" in res.text.lower():
                        raise GitHubIntegrationError("GitHub API rate limit exceeded")
                    else:
                        raise GitHubIntegrationError(f"GitHub API error fetching PRs: HTTP {res.status_code}")
            return pulls
        except httpx.RequestError as e:
            raise GitHubIntegrationError(f"Network error while fetching PRs: {str(e)}")
