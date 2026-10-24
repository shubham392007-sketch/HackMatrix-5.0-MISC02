"""
Row Level Security (RLS) enforcement script for SkillPassport & GrowthLens tables.
Idempotently enables RLS and sets strict access policies:
- User-scoped tables: restricted to auth.uid() == owner_user_id (or user_id / id)
- Public catalogues: readable by anon and authenticated users
- Service role: full bypass on all tables
"""
import sys
import os
import time
from sqlalchemy import text, create_engine

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.dirname(backend_dir))

from backend.app.core.config import get_settings


def get_rls_statements():
    stmts = []

    # 1. User Profiles (scoped by id = auth.uid())
    stmts.extend([
        "ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS user_profiles_service_role_policy ON user_profiles;",
        "CREATE POLICY user_profiles_service_role_policy ON user_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);",
        "DROP POLICY IF EXISTS user_profiles_owner_policy ON user_profiles;",
        "CREATE POLICY user_profiles_owner_policy ON user_profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);",
    ])

    # 2. User-scoped tables with owner_user_id
    owner_user_tables = [
        "user_target_roles",
        "role_match_snapshots",
        "learning_roadmaps",
        "evidence_items",
        "learning_assessments",
        "learning_attempts",
        "learning_mastery_snapshots",
        "learning_project_submissions",
        "connected_sources",
        "source_sync_runs",
        "raw_source_records",
        "uploaded_documents",
        "ingestion_jobs",
        "processing_events",
        "evidence_relationships",
        "evidence_competency_mappings",
        "web_crawl_records",
        "ai_analysis_runs",
        "work_analysis_results",
        "evidence_quality_assessments",
        "verification_decisions",
        "hallucination_guard_results",
        "output_validation_runs",
        "evidence_conflicts",
        "prompt_injection_findings",
        "human_review_tasks",
        "repository_language_snapshots",
        "repository_readme_snapshots",
        "share_records",
    ]

    for tbl in owner_user_tables:
        stmts.extend([
            f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;",
            f"DROP POLICY IF EXISTS {tbl}_service_role_policy ON {tbl};",
            f"CREATE POLICY {tbl}_service_role_policy ON {tbl} FOR ALL TO service_role USING (true) WITH CHECK (true);",
            f"DROP POLICY IF EXISTS {tbl}_owner_policy ON {tbl};",
            f"CREATE POLICY {tbl}_owner_policy ON {tbl} FOR ALL TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",
        ])

    # 3. User-scoped tables with user_id
    user_id_tables = ["employees", "profiles", "user_integrations"]
    for tbl in user_id_tables:
        stmts.extend([
            f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;",
            f"DROP POLICY IF EXISTS {tbl}_service_role_policy ON {tbl};",
            f"CREATE POLICY {tbl}_service_role_policy ON {tbl} FOR ALL TO service_role USING (true) WITH CHECK (true);",
            f"DROP POLICY IF EXISTS {tbl}_user_policy ON {tbl};",
            f"CREATE POLICY {tbl}_user_policy ON {tbl} FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);",
        ])

    # 4. Child tables with relationship joins
    stmts.extend([
        # learning_steps -> learning_roadmaps
        "ALTER TABLE learning_steps ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS learning_steps_service_role_policy ON learning_steps;",
        "CREATE POLICY learning_steps_service_role_policy ON learning_steps FOR ALL TO service_role USING (true) WITH CHECK (true);",
        "DROP POLICY IF EXISTS learning_steps_user_policy ON learning_steps;",
        "CREATE POLICY learning_steps_user_policy ON learning_steps FOR ALL TO authenticated USING ("
        "  EXISTS (SELECT 1 FROM learning_roadmaps WHERE learning_roadmaps.id = learning_steps.roadmap_id AND learning_roadmaps.owner_user_id = auth.uid())"
        ") WITH CHECK ("
        "  EXISTS (SELECT 1 FROM learning_roadmaps WHERE learning_roadmaps.id = learning_steps.roadmap_id AND learning_roadmaps.owner_user_id = auth.uid())"
        ");",

        # document_chunks -> uploaded_documents
        "ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS document_chunks_service_role_policy ON document_chunks;",
        "CREATE POLICY document_chunks_service_role_policy ON document_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);",
        "DROP POLICY IF EXISTS document_chunks_user_policy ON document_chunks;",
        "CREATE POLICY document_chunks_user_policy ON document_chunks FOR ALL TO authenticated USING ("
        "  EXISTS (SELECT 1 FROM uploaded_documents WHERE uploaded_documents.id = document_chunks.document_id AND uploaded_documents.owner_user_id = auth.uid())"
        ") WITH CHECK ("
        "  EXISTS (SELECT 1 FROM uploaded_documents WHERE uploaded_documents.id = document_chunks.document_id AND uploaded_documents.owner_user_id = auth.uid())"
        ");",
    ])

    # 5. Public catalogues (public read for all, service_role write)
    public_catalogue_tables = [
        "competency_taxonomy",
        "job_postings",
        "learning_resources",
        "competencies",
        "skills",
        "organizations",
        "selected_resources",
        "unmapped_skill_candidates",
        "repository_language_breakdowns",
        "competency_trajectories",
        "evidence_competencies",
        "evidence_skills",
        "recommendations",
        "recommendation_evidence",
        "ai_evaluation_suite_runs",
        "review_audit_events",
        "share_access_logs",
        "integrations",
        "integration_identities",
        "ingestion_runs",
        "manager_assignments",
        "employee_competencies",
    ]

    for tbl in public_catalogue_tables:
        stmts.extend([
            f"ALTER TABLE {tbl} ENABLE ROW LEVEL SECURITY;",
            f"DROP POLICY IF EXISTS {tbl}_service_role_policy ON {tbl};",
            f"CREATE POLICY {tbl}_service_role_policy ON {tbl} FOR ALL TO service_role USING (true) WITH CHECK (true);",
            f"DROP POLICY IF EXISTS {tbl}_public_read_policy ON {tbl};",
            f"CREATE POLICY {tbl}_public_read_policy ON {tbl} FOR SELECT TO anon, authenticated USING (true);",
        ])

    # 6. Hybrid table: role_demand_models (curated models have owner_user_id IS NULL; custom have owner_user_id)
    stmts.extend([
        "ALTER TABLE role_demand_models ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS role_demand_models_service_role_policy ON role_demand_models;",
        "CREATE POLICY role_demand_models_service_role_policy ON role_demand_models FOR ALL TO service_role USING (true) WITH CHECK (true);",
        "DROP POLICY IF EXISTS role_demand_models_read_policy ON role_demand_models;",
        "CREATE POLICY role_demand_models_read_policy ON role_demand_models FOR SELECT TO anon, authenticated USING ((owner_user_id IS NULL) OR (auth.uid() = owner_user_id));",
        "DROP POLICY IF EXISTS role_demand_models_insert_policy ON role_demand_models;",
        "CREATE POLICY role_demand_models_insert_policy ON role_demand_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_user_id);",
        "DROP POLICY IF EXISTS role_demand_models_modify_policy ON role_demand_models;",
        "CREATE POLICY role_demand_models_modify_policy ON role_demand_models FOR UPDATE TO authenticated USING (auth.uid() = owner_user_id) WITH CHECK (auth.uid() = owner_user_id);",
        "DROP POLICY IF EXISTS role_demand_models_delete_policy ON role_demand_models;",
        "CREATE POLICY role_demand_models_delete_policy ON role_demand_models FOR DELETE TO authenticated USING (auth.uid() = owner_user_id);",
    ])

    # 7. Job Search Cache (authenticated searchers can read/write, service_role full)
    stmts.extend([
        "ALTER TABLE job_search_cache ENABLE ROW LEVEL SECURITY;",
        "DROP POLICY IF EXISTS job_search_cache_service_role_policy ON job_search_cache;",
        "CREATE POLICY job_search_cache_service_role_policy ON job_search_cache FOR ALL TO service_role USING (true) WITH CHECK (true);",
        "DROP POLICY IF EXISTS job_search_cache_authenticated_policy ON job_search_cache;",
        "CREATE POLICY job_search_cache_authenticated_policy ON job_search_cache FOR ALL TO authenticated USING (true) WITH CHECK (true);",
    ])

    return stmts


def apply():
    settings = get_settings()
    engine = create_engine(
        settings.database_url,
        pool_pre_ping=True,
        pool_recycle=60,
    )

    statements = get_rls_statements()
    print(f"Applying {len(statements)} RLS statements to database with auto-reconnect...")

    success_count = 0
    for idx, stmt in enumerate(statements):
        applied = False
        for attempt in range(4):
            try:
                with engine.connect() as conn:
                    conn.execute(text(stmt))
                    conn.commit()
                applied = True
                success_count += 1
                break
            except Exception as e:
                if attempt == 3:
                    print(f"Failed statement {idx+1}/{len(statements)}: {stmt[:60]}... -> {e}")
                time.sleep(0.3)

    print(f"Successfully executed {success_count}/{len(statements)} RLS statements.")


if __name__ == "__main__":
    apply()
