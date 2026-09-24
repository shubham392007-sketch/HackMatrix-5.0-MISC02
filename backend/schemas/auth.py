"""Pydantic schemas for authentication and onboarding."""
from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    name: str = Field(..., description="Full Name", min_length=2)
    email: EmailStr = Field(..., description="Work Email")
    password: str = Field(..., description="Password", min_length=6)
    role: Optional[str] = Field(default="Software Engineer", description="Job title / role")
    department: Optional[str] = Field(default="Engineering", description="Department / squad")
    
    # GitHub Credentials
    github_username: Optional[str] = Field(default=None, description="GitHub username")
    github_token: Optional[str] = Field(default=None, description="GitHub Personal Access Token")
    github_repository_owner: Optional[str] = Field(default=None, description="Default repository owner")
    github_repository_name: Optional[str] = Field(default=None, description="Default repository name")

    # Jira Credentials
    jira_base_url: Optional[str] = Field(default=None, description="Jira Cloud base URL (https://domain.atlassian.net)")
    jira_email: Optional[str] = Field(default=None, description="Jira account email")
    jira_api_token: Optional[str] = Field(default=None, description="Jira API Token")
    jira_project_key: Optional[str] = Field(default=None, description="Default Jira project key")


class LoginRequest(BaseModel):
    email: EmailStr = Field(..., description="Registered Email")
    password: str = Field(..., description="Password")


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    employee: Dict[str, Any]
    integrations: Dict[str, Any] = Field(default_factory=dict)
