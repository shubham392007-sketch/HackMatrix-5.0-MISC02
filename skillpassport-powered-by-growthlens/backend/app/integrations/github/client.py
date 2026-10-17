import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.core.exceptions import ConnectorAuthError, InsufficientPermissionsError
from backend.app.core.logging import get_logger, mask_secret

logger = get_logger("integrations.github")

GITHUB_API_BASE = "https://api.github.com"


class GitHubClient:
    def __init__(self, token: str):
        self.token = token.strip()
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "Authorization": f"Bearer {self.token}",
            "User-Agent": "SkillPassport-Evidence-Ingestion/1.0",
        }

    async def test_connection(self) -> Dict[str, Any]:
        """
        Validates GitHub PAT against /user endpoint.
        Returns user identity, scopes, and connection status.
        Never returns or logs the raw token.
        """
        logger.info(f"Testing GitHub connection for token {mask_secret(self.token)}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(f"{GITHUB_API_BASE}/user", headers=self.headers)
            except httpx.RequestError as e:
                logger.error(f"GitHub network error: {e}")
                return {
                    "valid": False,
                    "error_category": "NETWORK_UNAVAILABLE",
                    "message": "Unable to reach GitHub API. Check network connectivity.",
                }

        # Differentiate response status codes
        if response.status_code == 401:
            return {
                "valid": False,
                "error_category": "INVALID_TOKEN",
                "message": "Bad credentials. The token is invalid, expired, or revoked.",
            }
        elif response.status_code == 403:
            remaining = response.headers.get("x-ratelimit-remaining", "unknown")
            if remaining == "0":
                reset_time = response.headers.get("x-ratelimit-reset", "unknown")
                return {
                    "valid": False,
                    "error_category": "RATE_LIMITED",
                    "message": f"GitHub API rate limit exceeded. Resets at {reset_time}.",
                }
            return {
                "valid": False,
                "error_category": "INSUFFICIENT_PERMISSIONS",
                "message": "Token lacks required permissions or organization approval is needed.",
            }
        elif response.status_code != 200:
            return {
                "valid": False,
                "error_category": "API_ERROR",
                "message": f"GitHub API returned unexpected status {response.status_code}.",
            }

        data = response.json()
        oauth_scopes = response.headers.get("x-oauth-scopes", "")
        scopes_list = [s.strip() for s in oauth_scopes.split(",") if s.strip()]

        return {
            "valid": True,
            "username": data.get("login"),
            "display_name": data.get("name") or data.get("login"),
            "avatar_url": data.get("avatar_url"),
            "html_url": data.get("html_url"),
            "public_repos": data.get("public_repos", 0),
            "total_private_repos": data.get("total_private_repos", 0),
            "scopes": scopes_list,
        }

    async def list_repositories(self, page: int = 1, per_page: int = 30) -> List[Dict[str, Any]]:
        """Lists accessible repositories with pagination."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/user/repos",
                headers=self.headers,
                params={"per_page": min(per_page, 100), "page": page, "sort": "updated"},
            )
            if response.status_code != 200:
                raise ConnectorAuthError("GitHub", f"Failed to list repositories: HTTP {response.status_code}")

            repos = response.json()
            return [
                {
                    "id": str(r.get("id")),
                    "name": r.get("name"),
                    "full_name": r.get("full_name"),
                    "owner": r.get("owner", {}).get("login"),
                    "html_url": r.get("html_url"),
                    "description": r.get("description"),
                    "is_private": r.get("private", False),
                    "language": r.get("language"),
                    "updated_at": r.get("updated_at"),
                    "default_branch": r.get("default_branch", "main"),
                }
                for r in repos
            ]

    async def fetch_repository_commits(self, owner: str, repo: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Fetches recent commits from the repository."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/commits",
                headers=self.headers,
                params={"per_page": limit},
            )
            if response.status_code != 200:
                logger.warning(f"Could not fetch commits for {owner}/{repo}: {response.status_code}")
                return []

            commits = response.json()
            results = []
            for c in commits:
                commit_data = c.get("commit", {})
                author_data = commit_data.get("author", {})
                results.append({
                    "sha": c.get("sha"),
                    "message": commit_data.get("message"),
                    "author_name": author_data.get("name"),
                    "author_email": author_data.get("email"),
                    "timestamp": author_data.get("date"),
                    "html_url": c.get("html_url"),
                    "repo": f"{owner}/{repo}",
                })
            return results

    async def fetch_pull_requests(self, owner: str, repo: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Fetches recent pull requests with attribution and review metadata."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{GITHUB_API_BASE}/repos/{owner}/{repo}/pulls",
                headers=self.headers,
                params={"state": "all", "per_page": limit, "sort": "updated"},
            )
            if response.status_code != 200:
                logger.warning(f"Could not fetch PRs for {owner}/{repo}: {response.status_code}")
                return []

            prs = response.json()
            results = []
            for pr in prs:
                results.append({
                    "number": pr.get("number"),
                    "title": pr.get("title"),
                    "body": pr.get("body") or "",
                    "state": pr.get("state"),
                    "merged_at": pr.get("merged_at"),
                    "created_at": pr.get("created_at"),
                    "html_url": pr.get("html_url"),
                    "author_login": pr.get("user", {}).get("login"),
                    "repo": f"{owner}/{repo}",
                })
            return results

    async def fetch_repository_languages(self, owner: str, repo: str) -> Dict[str, Any]:
        """
        Fetches repository language byte breakdown from GET /repos/{owner}/{repo}/languages.
        Returns:
            {
                "success": bool,
                "languages": Dict[str, int],  # e.g. {"TypeScript": 66900, "Python": 24400}
                "status_code": int,
                "error": Optional[str],
                "error_category": Optional[str],
            }
        """
        logger.info(f"Fetching language statistics for {owner}/{repo}")
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(
                    f"{GITHUB_API_BASE}/repos/{owner}/{repo}/languages",
                    headers=self.headers,
                )
            except httpx.RequestError as e:
                logger.error(f"GitHub network error fetching languages for {owner}/{repo}: {e}")
                return {
                    "success": False,
                    "languages": {},
                    "status_code": 0,
                    "error": "Unable to reach GitHub API. Check network connectivity.",
                    "error_category": "NETWORK_UNAVAILABLE",
                }

        if response.status_code == 200:
            try:
                data = response.json()
            except Exception:
                data = {}
            if not isinstance(data, dict):
                data = {}
            # Clean and ensure integer byte counts >= 0
            cleaned = {
                str(k): int(v)
                for k, v in data.items()
                if isinstance(v, (int, float)) and v >= 0
            }
            return {
                "success": True,
                "languages": cleaned,
                "status_code": 200,
                "error": None,
                "error_category": None,
            }
        elif response.status_code == 404:
            return {
                "success": False,
                "languages": {},
                "status_code": 404,
                "error": f"Repository {owner}/{repo} not found or inaccessible.",
                "error_category": "NOT_FOUND",
            }
        elif response.status_code == 403:
            remaining = response.headers.get("x-ratelimit-remaining", "")
            if remaining == "0":
                return {
                    "success": False,
                    "languages": {},
                    "status_code": 403,
                    "error": "GitHub API rate limit exceeded.",
                    "error_category": "RATE_LIMITED",
                }
            return {
                "success": False,
                "languages": {},
                "status_code": 403,
                "error": "Access forbidden. Token lacks repo read permissions.",
                "error_category": "FORBIDDEN",
            }
        else:
            return {
                "success": False,
                "languages": {},
                "status_code": response.status_code,
                "error": f"GitHub API returned unexpected status {response.status_code}.",
                "error_category": "API_ERROR",
            }
