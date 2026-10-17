import uuid
from typing import Optional, List
from datetime import datetime
from sqlalchemy import String, Text, DateTime, Integer, BigInteger, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.models.base import Base, TimestampMixin


class UploadedDocument(Base, TimestampMixin):
    __tablename__ = "uploaded_documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    evidence_category: Mapped[str] = mapped_column(String(50), nullable=False)  # "certificate", "resume", "project_report", "research", "other"
    user_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, default=dict)
    
    storage_bucket: Mapped[str] = mapped_column(String(100), default="evidence-originals", nullable=False)
    private_storage_key: Mapped[str] = mapped_column(String(512), nullable=False, unique=True)
    
    document_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    processing_state: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)  # "queued", "processing", "completed", "failed"
    extraction_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    error_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)

    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_uploaded_docs_owner_hash", "owner_user_id", "sha256_hash"),
        Index("idx_uploaded_docs_owner_state", "owner_user_id", "processing_state"),
    )


class DocumentChunk(Base, TimestampMixin):
    __tablename__ = "document_chunks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("uploaded_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    page_or_slide_number: Mapped[int] = mapped_column(Integer, nullable=False)
    section_title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    
    original_text: Mapped[str] = mapped_column(Text, nullable=False)
    normalized_text: Mapped[str] = mapped_column(Text, nullable=False)
    char_offset_start: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    char_offset_end: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    extraction_method: Mapped[str] = mapped_column(String(50), nullable=False)  # "pymupdf_direct", "glm_ocr", "docx_parser", "pptx_parser"
    chunk_hash: Mapped[str] = mapped_column(String(64), nullable=False)

    document = relationship("UploadedDocument", back_populates="chunks")

    __table_args__ = (
        Index("idx_doc_chunks_doc_page", "document_id", "page_or_slide_number"),
    )
