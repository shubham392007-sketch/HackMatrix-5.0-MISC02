from sqlalchemy import String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional
from datetime import datetime
import uuid

from backend.app.models.base import Base, TimestampMixin


class UserProfile(Base, TimestampMixin):
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    display_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    current_role: Mapped[str] = mapped_column(String(100), default="employee", nullable=False)
    
    # Calibration details
    job_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    specialization: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    department_or_team: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    experience_level: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    professional_goal: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    professional_summary: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Onboarding workflow state
    onboarding_status: Mapped[str] = mapped_column(
        String(50),
        default="not_started",
        nullable=False,
    )  # 'not_started', 'in_progress', 'completed'
    
    onboarding_current_step: Mapped[int] = mapped_column(
        default=1,
        nullable=False,
    )  # 1: Profile, 2: GitHub, 3: Jira, 4: Evidence

    onboarding_current_category: Mapped[str] = mapped_column(
        String(50),
        default="resume",
        nullable=False,
    )  # 'resume', 'certificates', 'projects', 'research', 'portfolio', 'other'
    
    github_skipped: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    
    jira_skipped: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    onboarding_completed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
