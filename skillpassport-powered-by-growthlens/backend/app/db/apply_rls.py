from backend.app.db.session import engine
from sqlalchemy import text

sql_statements = [
    "ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS user_profiles_owner_policy ON user_profiles;",
    "CREATE POLICY user_profiles_owner_policy ON user_profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);",

    "ALTER TABLE evidence_items ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS evidence_items_owner_policy ON evidence_items;",
    "CREATE POLICY evidence_items_owner_policy ON evidence_items FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",

    "ALTER TABLE uploaded_documents ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS uploaded_documents_owner_policy ON uploaded_documents;",
    "CREATE POLICY uploaded_documents_owner_policy ON uploaded_documents FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",

    "ALTER TABLE connected_sources ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS connected_sources_owner_policy ON connected_sources;",
    "CREATE POLICY connected_sources_owner_policy ON connected_sources FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",

    "ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS ingestion_jobs_owner_policy ON ingestion_jobs;",
    "CREATE POLICY ingestion_jobs_owner_policy ON ingestion_jobs FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",

    "ALTER TABLE web_crawl_records ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS web_crawl_records_owner_policy ON web_crawl_records;",
    "CREATE POLICY web_crawl_records_owner_policy ON web_crawl_records FOR ALL USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",
]

def apply():
    with engine.connect() as conn:
        for stmt in sql_statements:
            try:
                conn.execute(text(stmt))
                conn.commit()
                print("Executed:", stmt[:60])
            except Exception as e:
                print("Error on", stmt[:60], ":", e)

if __name__ == "__main__":
    apply()
