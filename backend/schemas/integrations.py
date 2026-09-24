"""Pydantic schemas for integration endpoints."""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class GitHubSyncRequest(BaseModel):
    owner: Optional[str] = Field(default=None, description="Repository owner/organization")
    repo: Optional[str] = Field(default=None, description="Repository name")
    limit_commits: int = Field(default=15, ge=1, le=100)
    limit_prs: int = Field(default=10, ge=1, le=50)
    run_ai_extraction: bool = Field(default=True, description="Whether to trigger Qwen3 skill extraction")


class JiraSyncRequest(BaseModel):
    project_key: Optional[str] = Field(default=None, description="Jira project key (e.g. 'DEV')")
    max_issues: int = Field(default=20, ge=1, le=100)
    run_ai_extraction: bool = Field(default=True, description="Whether to trigger Qwen3 skill extraction")


class IdentityMapRequest(BaseModel):
    employee_id: str = Field(..., description="Internal GrowthLens employee UUID")
    provider: str = Field(..., description="'github' or 'jira'")
    external_username: Optional[str] = Field(default=None, description="GitHub username or Jira account name")
    external_email: Optional[str] = Field(default=None, description="Jira email or commit author email")
    external_user_id: Optional[str] = Field(default=None, description="External provider UUID / accountId")


class IntegrationStatusResponse(BaseModel):
    provider: str
    configured: bool
    status: str
    details: Dict[str, Any] = Field(default_factory=dict)
