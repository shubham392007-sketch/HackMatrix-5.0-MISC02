"""Pydantic schemas for User Profile and Organization / Manager structures."""
from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field, model_validator


class UserRole(str, Enum):
    EMPLOYEE = "EMPLOYEE"
    MANAGER = "MANAGER"
    ADMIN = "ADMIN"


class OrganizationSchema(BaseModel):
    id: str
    name: str
    slug: Optional[str] = None
    created_at: Optional[datetime] = None


class UserProfile(BaseModel):
    id: str
    user_id: Optional[str] = None
    full_name: str
    email: str
    role: str = Field("EMPLOYEE", description="Role: EMPLOYEE, MANAGER, or ADMIN")
    organization_id: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    github_username: Optional[str] = None
    jira_account_id: Optional[str] = None
    onboarding_completed: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @model_validator(mode="before")
    @classmethod
    def set_user_id(cls, data):
        if isinstance(data, dict):
            if not data.get("user_id") and data.get("id"):
                data["user_id"] = data["id"]
        return data


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    avatar_url: Optional[str] = None
    github_username: Optional[str] = None
    jira_account_id: Optional[str] = None
    onboarding_completed: Optional[bool] = None


class ManagerAssignmentCreate(BaseModel):
    manager_id: str
    employee_id: str
    organization_id: Optional[str] = None


ManagerAssignmentRequest = ManagerAssignmentCreate


class ManagerAssignmentResponse(BaseModel):
    id: str
    manager_id: str
    employee_id: str
    organization_id: str
    created_at: Optional[datetime] = None


# ─────────────────────────────────────────────────────────────
# Integration Setup & Validation Schemas for Profile Completion
# ─────────────────────────────────────────────────────────────

class ValidateGitHubRequest(BaseModel):
    token: str
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None


class ValidateGitHubResponse(BaseModel):
    valid: bool
    username: Optional[str] = None
    rate_limit_remaining: Optional[int] = None
    repository_accessible: Optional[bool] = None
    message: str


class ValidateJiraRequest(BaseModel):
    base_url: str
    email: str
    api_token: str
    project_key: Optional[str] = None


class ValidateJiraResponse(BaseModel):
    valid: bool
    display_name: Optional[str] = None
    email: Optional[str] = None
    project_accessible: Optional[bool] = None
    message: str


class GitHubIntegrationSetup(BaseModel):
    token: str
    username: Optional[str] = None
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None


class JiraIntegrationSetup(BaseModel):
    base_url: str
    email: str
    api_token: str
    project_key: Optional[str] = None


class CompleteOnboardingRequest(BaseModel):
    full_name: Optional[str] = None
    job_title: str
    department: str
    github: Optional[GitHubIntegrationSetup] = None
    jira: Optional[JiraIntegrationSetup] = None


class UserIntegrationSummary(BaseModel):
    provider: str
    is_active: bool
    connection_status: str
    external_username: Optional[str] = None
    base_url: Optional[str] = None
    repository_owner: Optional[str] = None
    repository_name: Optional[str] = None
    project_key: Optional[str] = None
    token_masked: Optional[str] = None
    last_validated_at: Optional[datetime] = None


class OnboardingCompletionResponse(BaseModel):
    success: bool
    profile: UserProfile
    integrations: dict[str, UserIntegrationSummary]
    message: str
