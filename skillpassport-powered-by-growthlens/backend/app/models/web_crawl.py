import uuid
from typing import Optional
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.models.base import Base, TimestampMixin


class WebCrawlRecord(Base, TimestampMixin):
    __tablename__ = "web_crawl_records"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    job_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingestion_jobs.id", ondelete="SET NULL"),
        nullable=True,
    )
    
    submitted_url: Mapped[str] = mapped_column(Text, nullable=False)
    final_url: Mapped[str] = mapped_column(Text, nullable=False)
    page_title: Mapped[str] = mapped_column(String(512), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    
    crawl_depth: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    http_status: Mapped[int] = mapped_column(Integer, default=200, nullable=False)
    extraction_status: Mapped[str] = mapped_column(String(50), default="extracted", nullable=False)
    
    extracted_headings: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    cleaned_content: Mapped[str] = mapped_column(Text, nullable=False)
    discovered_links: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)

    __table_args__ = (
        Index("idx_web_crawl_owner_url", "owner_user_id", "submitted_url"),
    )
