from functools import lru_cache

from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

from pydantic import Field, field_validator

import os





class Settings(BaseSettings):

    model_config = SettingsConfigDict(

        env_file=(

            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend", ".env"),

            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),

        ),

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

        default=5,

        description="SQLAlchemy engine connection pool size (conservative default)",

    )

    db_max_overflow: int = Field(

        default=10,

        description="Maximum temporary connections above pool_size during traffic spikes",

    )

    db_pool_timeout: int = Field(

        default=30,

        description="Seconds to wait before giving up on acquiring a connection from pool",

    )

    db_pool_recycle: int = Field(

        default=1800,

        description="Seconds after which idle connections are recycled (30 min)",

    )

    db_pool_pre_ping: bool = Field(

        default=True,

        description="Validate connection health via SELECT 1 before checkout",

    )

    circuit_breaker_failure_threshold: int = Field(

        default=5,

        description="Number of consecutive failures to trip the circuit breaker",

    )

    circuit_breaker_recovery_timeout: int = Field(

        default=30,

        description="Seconds to wait before half-opening a tripped circuit breaker",

    )



    # Supabase (PostgREST direct fallback)

    supabase_url: str = ""

    supabase_anon_key: str = ""

    supabase_publishable_key: str = ""

    supabase_service_role_key: str = ""

    supabase_storage_bucket: str = "evidence-originals"

    supabase_derivatives_bucket: str = "evidence-derivatives"



    # Encryption & Redis

    connector_credential_encryption_key: str = ""

    redis_url: str = "redis://localhost:6379/0"



    # Integrations

    github_client_id: str = ""

    github_client_secret: str = ""

    github_token_encryption_key: str = "development-key-32bytes-base64=="

    jira_client_id: str = ""

    jira_client_secret: str = ""

    jira_token_encryption_key: str = "development-key-32bytes-base64=="



    # Ollama

    ollama_base_url: str = "http://localhost:11434"

    ollama_qwen_model: str = "qwen3:8b"

    ollama_ocr_model: str = "glm-ocr"

    ollama_embed_model: str = "nomic-embed-text"

    ollama_timeout_seconds: float = 180.0

    ollama_roadmap_timeout_seconds: Optional[float] = Field(

        default=None,

        description="Dedicated timeout in seconds for roadmap generation requests (defaults to 45.0s, falls back to ollama_timeout_seconds)",

    )

    ollama_assessment_timeout_seconds: Optional[float] = Field(

        default=None,

        description="Dedicated timeout in seconds for assessment generation requests (defaults to 120.0s, falls back to ollama_timeout_seconds if > 45.0)",

    )

    ollama_num_ctx: int = Field(

        default=8192,

        description="Effective context window (num_ctx) for Ollama inference requests (target: 8192 tokens for 100% GPU offload on 6GB VRAM)",

    )



    @property

    def effective_roadmap_timeout_seconds(self) -> float:

        if "OLLAMA_ROADMAP_TIMEOUT_SECONDS" in os.environ:

            return float(os.environ["OLLAMA_ROADMAP_TIMEOUT_SECONDS"])

        if self.ollama_roadmap_timeout_seconds is not None:

            return float(self.ollama_roadmap_timeout_seconds)

        if "OLLAMA_TIMEOUT_SECONDS" in os.environ:

            return float(os.environ["OLLAMA_TIMEOUT_SECONDS"])

        return float(self.ollama_timeout_seconds or 45.0)



    @property

    def effective_assessment_timeout_seconds(self) -> float:

        if "OLLAMA_ASSESSMENT_TIMEOUT_SECONDS" in os.environ:

            return float(os.environ["OLLAMA_ASSESSMENT_TIMEOUT_SECONDS"])

        if self.ollama_assessment_timeout_seconds is not None:

            return float(self.ollama_assessment_timeout_seconds)

        if "OLLAMA_TIMEOUT_SECONDS" in os.environ and float(os.environ["OLLAMA_TIMEOUT_SECONDS"]) > 45.0:

            return float(os.environ["OLLAMA_TIMEOUT_SECONDS"])

        return 120.0



    # ChromaDB

    chroma_persist_directory: str = "./chroma_data"



    # CORS & Upload Limits

    frontend_origins: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

    max_upload_size_mb: int = 25

    evidence_processing_concurrency: int = 1



    # Career Intelligence & Job Discovery Providers (Cost-Aware Orchestration)

    theirstack_api_key: str = Field(default="", description="TheirStack API Key")

    theirstack_api_keys: str = Field(default="", description="Comma or newline separated list of TheirStack API keys for failover")

    jsearch_api_key: str = Field(default="", description="RapidAPI JSearch API Key")

    jsearch_api_host: str = Field(default="jsearch.p.rapidapi.com", description="RapidAPI JSearch Host")

    fantastic_jobs_api_key: str = Field(default="", description="Fantastic.jobs API Key")

    fantastic_jobs_api_host: str = Field(default="active-jobs-db.p.rapidapi.com", description="RapidAPI Active Jobs Host")

    job_search_primary_provider: str = Field(default="theirstack", description="Primary job search provider: theirstack | jsearch | fantastic_jobs")

    job_search_fallback_provider: str = Field(default="jsearch", description="Fallback job search provider")

    job_search_max_results: int = Field(default=50, description="Default limit per search (up to 50 jobs)")

    job_search_cache_ttl_minutes: int = Field(default=120, description="Job search cache TTL in minutes")

    job_search_enable_fallback: bool = Field(default=True, description="Whether to allow fallback to secondary provider on eligible failures")

    job_search_monthly_budget: float = Field(default=0.0, description="Optional monthly budget cap (0.0 = unlimited/unknown)")



    @property

    def theirstack_keys(self) -> List[str]:

        keys: List[str] = []

        source_strings = [self.theirstack_api_keys, self.theirstack_api_key]

        for src in source_strings:

            if not src:

                continue

            for k in src.replace("\n", ",").split(","):

                k_clean = k.strip()

                if k_clean and k_clean not in keys:

                    keys.append(k_clean)

        return keys



    @property

    def cors_origins(self) -> List[str]:

        if not self.frontend_origins or self.app_env == "development":

            return ["*"]

        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]





@lru_cache()

def get_settings() -> Settings:

    s = Settings()

    if 'OLLAMA_TIMEOUT_SECONDS' not in os.environ:

        os.environ['OLLAMA_TIMEOUT_SECONDS'] = str(s.ollama_timeout_seconds)

    if 'OLLAMA_BASE_URL' not in os.environ:

        os.environ['OLLAMA_BASE_URL'] = s.ollama_base_url

    return s





settings = get_settings()

