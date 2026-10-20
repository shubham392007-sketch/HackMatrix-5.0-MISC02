from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "SkillPassport Evidence Intelligence API"
    app_version: str = "1.0.0"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    secret_key: str = "change-in-production-secret-key-32chars-min"

    # Database
    database_url: str = Field(
        default="postgresql+psycopg2://postgres:postgres@localhost:5432/postgres",
        description="SQLAlchemy database connection string",
    )
    direct_url: str = Field(
        default="",
        description="Direct database connection string for migrations",
    )
    db_pool_size: int = Field(
        default=8,
        description="SQLAlchemy QueuePool size (bounded <= 8 to preserve Supabase 15 limit)",
    )
    db_max_overflow: int = Field(
        default=0,
        description="SQLAlchemy QueuePool max overflow (0 enforces strict upper bound)",
    )
    db_pool_timeout: float = Field(
        default=20.0,
        description="Seconds to wait in queue for a connection from pool before timeout",
    )
    db_pool_recycle: int = Field(
        default=300,
        description="Seconds before recycling pooled connections to avoid stale socket drops",
    )
    db_pool_pre_ping: bool = Field(
        default=True,
        description="Test connection health on checkout with lightweight ping",
    )
    db_max_retries: int = Field(
        default=2,
        description="Maximum retry attempts for transient database queries",
    )
    db_circuit_breaker_threshold: int = Field(
        default=5,
        description="Number of consecutive failures before opening circuit breaker",
    )
    db_circuit_breaker_recovery_seconds: float = Field(
        default=15.0,
        description="Seconds before half-open probe in circuit breaker",
    )

    # Supabase
    supabase_url: str = Field(default="", description="Supabase project URL")
    supabase_publishable_key: str = Field(default="", description="Supabase publishable key")
    supabase_service_role_key: str = Field(default="", description="Supabase service role key (backend only)")
    supabase_storage_bucket: str = "evidence-originals"
    supabase_derivatives_bucket: str = "evidence-derivatives"

    # Encryption
    connector_credential_encryption_key: str = Field(
        default="",
        description="Fernet 32-byte urlsafe base64 key for encrypting GitHub PAT and Jira API tokens",
    )

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_qwen_model: str = "qwen3:8b"
    ollama_ocr_model: str = "glm-ocr"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_timeout_seconds: float = 120.0

    # ChromaDB
    chroma_persist_directory: str = "./chroma_data"

    # CORS & Upload Limits
    frontend_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    max_upload_size_mb: int = 25
    evidence_processing_concurrency: int = 1

    @property
    def cors_origins(self) -> List[str]:
        if not self.frontend_origins or self.app_env == "development":
            return ["*"]
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
