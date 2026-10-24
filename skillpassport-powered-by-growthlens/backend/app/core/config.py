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
        default=10,
        description="SQLAlchemy QueuePool size (supports concurrent frontend requests safely)",
    )
    db_max_overflow: int = Field(
        default=5,
        description="SQLAlchemy QueuePool max overflow",
    )
    db_pool_timeout: float = Field(
        default=30.0,
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
    ollama_timeout_seconds: float = 180.0
    ollama_num_ctx: int = Field(
        default=8192,
        description="Effective context window (num_ctx) for Ollama inference requests (target: 8192 tokens for 100% GPU offload on 6GB VRAM)",
    )

    # ChromaDB
    chroma_persist_directory: str = "./chroma_data"

    # CORS & Upload Limits
    frontend_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"
    max_upload_size_mb: int = 25
    evidence_processing_concurrency: int = 1

    # Career Intelligence & Job Discovery Providers (Cost-Aware Orchestration)
    theirstack_api_key: str = Field(default="", description="TheirStack API Key")
    jsearch_api_key: str = Field(default="", description="RapidAPI JSearch API Key")
    jsearch_api_host: str = Field(default="jsearch.p.rapidapi.com", description="RapidAPI JSearch Host")
    fantastic_jobs_api_key: str = Field(default="", description="Fantastic.jobs API Key")
    fantastic_jobs_api_host: str = Field(default="active-jobs-db.p.rapidapi.com", description="RapidAPI Active Jobs Host")
    job_search_primary_provider: str = Field(default="theirstack", description="Primary job search provider: theirstack | jsearch | fantastic_jobs")
    job_search_fallback_provider: str = Field(default="jsearch", description="Fallback job search provider")
    job_search_max_results: int = Field(default=10, description="Conservative default limit per search (1 page / 10 jobs) to minimize credit consumption")
    job_search_cache_ttl_minutes: int = Field(default=120, description="Job search cache TTL in minutes")
    job_search_enable_fallback: bool = Field(default=True, description="Whether to allow fallback to secondary provider on eligible failures")
    job_search_monthly_budget: float = Field(default=0.0, description="Optional monthly budget cap (0.0 = unlimited/unknown)")

    @field_validator("database_url")
    @classmethod
    def validate_and_normalize_database_url(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError(
                "DATABASE_URL is required. Configure it with your Supabase Session Pooler connection string in .env."
            )
        v = v.strip()
        if v.startswith("postgres://"):
            v = "postgresql+psycopg2://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+psycopg2://" + v[len("postgresql://"):]
        # Automatically use Supabase Transaction Mode pooler (port 6543) instead of Session Mode (port 5432)
        # to prevent EMAXCONNSESSION (max clients reached in session mode: 15)
        if "pooler.supabase.com:5432" in v:
            v = v.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
        return v

    @field_validator("direct_url")
    @classmethod
    def normalize_direct_url(cls, v: str) -> str:
        if not v:
            return ""
        v = v.strip()
        if v.startswith("postgres://"):
            v = "postgresql+psycopg2://" + v[len("postgres://"):]
        elif v.startswith("postgresql://"):
            v = "postgresql+psycopg2://" + v[len("postgresql://"):]
        # Automatically use Supabase Transaction Mode pooler (port 6543) instead of Session Mode (port 5432)
        # to prevent EMAXCONNSESSION (max clients reached in session mode: 15)
        if "pooler.supabase.com:5432" in v:
            v = v.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543")
        return v

    @property
    def sanitized_database_url(self) -> str:
        """Returns the database URL with the password redacted for safe logging."""
        if not self.database_url:
            return "[NOT CONFIGURED]"
        try:
            import urllib.parse
            parsed = urllib.parse.urlparse(self.database_url)
            if parsed.password:
                netloc = f"{parsed.username}:***@{parsed.hostname}"
                if parsed.port:
                    netloc += f":{parsed.port}"
                return parsed._replace(netloc=netloc).geturl()
            return self.database_url
        except Exception:
            return "[REDACTED]"

    @property
    def cors_origins(self) -> List[str]:
        raw = self.frontend_origins or ""
        parsed = [origin.strip() for origin in raw.split(",") if origin.strip()]
        defaults = [
            "http://localhost:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:3001",
        ]
        seen = set()
        result = []
        for o in parsed + defaults:
            if o not in seen:
                seen.add(o)
                result.append(o)
        return result


@lru_cache()
def get_settings() -> Settings:
    return Settings()
