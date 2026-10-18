import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.db.session import engine
from sqlalchemy import text, inspect

queries = [
    # 1. Composite index for filtering evidence by provider and deletion status per owner
    "CREATE INDEX IF NOT EXISTS idx_evidence_owner_provider ON evidence_items (owner_user_id, source_provider, is_deleted);",

    # 2. Composite index on evidence mapping lookup
    "CREATE INDEX IF NOT EXISTS idx_mapping_evidence_status ON evidence_competency_mappings (evidence_id, status);",

    # 3. Fast lookup of selected resources for a connection
    "CREATE INDEX IF NOT EXISTS idx_selected_resources_conn_selected ON selected_resources (connection_id, is_selected);",

    # 4. Composite index for current repository language snapshots
    "CREATE INDEX IF NOT EXISTS idx_repo_lang_lookup ON repository_language_snapshots (selected_resource_id, owner_user_id, is_current);",
]

print("Applying performance indexes to Supabase PostgreSQL...")
with engine.connect() as conn:
    for q in queries:
        print(f"Executing: {q}")
        conn.execute(text(q))
    conn.commit()

print("Indexes applied successfully!")
