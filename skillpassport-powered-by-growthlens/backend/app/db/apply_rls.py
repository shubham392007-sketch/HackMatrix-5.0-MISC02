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

    "ALTER TABLE recruiter_messages REPLICA IDENTITY FULL;",
    "ALTER TABLE recruiter_messages ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS recruiter_messages_recipient_select ON recruiter_messages;",
    "CREATE POLICY recruiter_messages_recipient_select ON recruiter_messages FOR SELECT TO authenticated USING (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid);",
    "DROP POLICY IF EXISTS recruiter_messages_recipient_update ON recruiter_messages;",
    "CREATE POLICY recruiter_messages_recipient_update ON recruiter_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid) WITH CHECK (auth.uid() = recipient_user_id OR recipient_user_id = '00000000-0000-0000-0000-000000000001'::uuid);",

    "ALTER TABLE user_notifications REPLICA IDENTITY FULL;",
    "ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS user_notifications_user_select ON user_notifications;",
    "CREATE POLICY user_notifications_user_select ON user_notifications FOR SELECT TO authenticated USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);",
    "DROP POLICY IF EXISTS user_notifications_user_update ON user_notifications;",
    "CREATE POLICY user_notifications_user_update ON user_notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid) WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);",
    "DROP POLICY IF EXISTS user_notifications_user_delete ON user_notifications;",
    "CREATE POLICY user_notifications_user_delete ON user_notifications FOR DELETE TO authenticated USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);",
    "DROP POLICY IF EXISTS user_notifications_user_insert ON user_notifications;",
    "CREATE POLICY user_notifications_user_insert ON user_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001'::uuid);",

    "ALTER TABLE share_links REPLICA IDENTITY FULL;",
    "ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;",
    "DROP POLICY IF EXISTS share_links_owner_policy ON share_links;",
    "CREATE POLICY share_links_owner_policy ON share_links FOR ALL TO authenticated USING (auth.uid() = owner_user_id OR owner_user_id = '00000000-0000-0000-0000-000000000001'::uuid) WITH CHECK (auth.uid() = owner_user_id OR owner_user_id = '00000000-0000-0000-0000-000000000001'::uuid);",
    "DROP POLICY IF EXISTS share_links_anon_select ON share_links;",
    "CREATE POLICY share_links_anon_select ON share_links FOR SELECT TO anon USING (status = 'active');",
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
