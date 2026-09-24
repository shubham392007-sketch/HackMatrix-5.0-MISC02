from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anon/public key")
    supabase_service_role_key: str = Field(..., description="Supabase service role key (backend only)")

    # Ollama
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="qwen3:8b")

    # ChromaDB
    chroma_host: str = Field(default="localhost")
    chroma_port: int = Field(default=8000)

    # Embeddings
    embedding_provider: str = Field(default="ollama")
    embedding_model: str = Field(default="nomic-embed-text")

    # GitHub
    github_token: str = Field(default="")
    github_repository_owner: str = Field(default="")
    github_repository_name: str = Field(default="")

    # Jira
    jira_base_url: str = Field(default="")
    jira_email: str = Field(default="")
    jira_api_token: str = Field(default="")
    jira_project_key: str = Field(default="")

    # Application
    app_name: str = Field(default="GrowthLens")
    app_version: str = Field(default="0.1.0")
    debug: bool = Field(default=False)

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
