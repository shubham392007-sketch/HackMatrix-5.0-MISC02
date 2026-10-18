import sys
import os

# Add repo to python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import engine
from sqlalchemy import text, inspect

queries = [
    """
    CREATE TABLE IF NOT EXISTS repository_readme_snapshots (
        id UUID PRIMARY KEY,
        owner_user_id UUID NOT NULL,
        selected_resource_id UUID NOT NULL REFERENCES selected_resources(id) ON DELETE CASCADE,
        repo_full_name VARCHAR(255) NOT NULL,
        connection_id UUID NOT NULL REFERENCES connected_sources(id) ON DELETE CASCADE,
        sync_run_id UUID REFERENCES source_sync_runs(id) ON DELETE SET NULL,
        readme_path VARCHAR(255) NOT NULL DEFAULT 'README.md',
        blob_sha VARCHAR(100),
        html_url TEXT,
        content_hash VARCHAR(64),
        raw_content TEXT,
        extracted_summary TEXT,
        sections_json JSONB DEFAULT '[]'::jsonb,
        sync_status VARCHAR(50) NOT NULL DEFAULT 'success',
        error_summary TEXT,
        retrieval_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        is_current BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_repo_readme_owner_repo ON repository_readme_snapshots (owner_user_id, repo_full_name);",
    "CREATE INDEX IF NOT EXISTS idx_repo_readme_current ON repository_readme_snapshots (selected_resource_id, is_current);",
]

with engine.connect() as conn:
    for q in queries:
        conn.execute(text(q))
    conn.commit()

inspector = inspect(engine)
tables = inspector.get_table_names()
print("Migration complete. repository_readme_snapshots exists:", "repository_readme_snapshots" in tables)
