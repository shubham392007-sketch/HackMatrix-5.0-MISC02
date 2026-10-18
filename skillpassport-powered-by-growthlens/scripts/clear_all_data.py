import sys
import os
import shutil
sys.path.insert(0, os.path.abspath("."))
from sqlalchemy import create_engine, text
from backend.app.core.config import get_settings

def clear_all():
    settings = get_settings()
    engine = create_engine(settings.database_url)
    
    print("=" * 65)
    print("SKILL PASSPORT: COMPLETE DATABASE & ACCOUNT RESET")
    print("=" * 65)
    
    # 1. Truncate all public application data tables
    public_tables = [
        "ai_evaluation_suite_runs",
        "review_audit_events",
        "prompt_injection_findings",
        "human_review_tasks",
        "output_validation_runs",
        "hallucination_guard_results",
        "evidence_competency_mappings",
        "work_analysis_results",
        "ai_analysis_runs",
        "evidence_relationships",
        "evidence_conflicts",
        "evidence_quality_assessments",
        "verification_decisions",
        "document_chunks",
        "uploaded_documents",
        "web_crawl_records",
        "repository_readme_snapshots",
        "repository_language_breakdowns",
        "repository_language_snapshots",
        "evidence_items",
        "raw_source_records",
        "processing_events",
        "ingestion_jobs",
        "source_sync_runs",
        "selected_resources",
        "connected_sources",
        "user_profiles",
    ]
    
    print("\n1. Truncating all user & application data tables...")
    with engine.begin() as conn:
        for t in public_tables:
            try:
                conn.execute(text(f'TRUNCATE TABLE public."{t}" RESTART IDENTITY CASCADE;'))
                print(f"   [OK] Truncated public.{t}")
            except Exception as e:
                print(f"   [FAIL] Error truncating public.{t}: {e}")

    # 2. Clear all Supabase Auth user accounts
    print("\n2. Deleting all Supabase Auth user accounts...")
    with engine.begin() as conn:
        try:
            res = conn.execute(text("DELETE FROM auth.users;"))
            print(f"   [OK] Successfully deleted {res.rowcount} accounts from auth.users (cascaded to sessions & identities).")
        except Exception as e:
            print(f"   [FAIL] Error deleting auth.users: {e}")

    # 3. Clear ChromaDB vector stores
    print("\n3. Clearing local ChromaDB vector store directories...")
    chroma_dirs = [
        os.path.abspath("./chroma_data"),
        os.path.abspath("../chroma_data"),
    ]
    for c_dir in chroma_dirs:
        if os.path.exists(c_dir):
            try:
                shutil.rmtree(c_dir)
                os.makedirs(c_dir, exist_ok=True)
                print(f"   [OK] Cleared ChromaDB directory: {c_dir}")
            except Exception as e:
                print(f"   Notice clearing {c_dir}: {e}")

    # 4. Final Verification
    print("\n4. Final Verification of Table Counts:")
    with engine.connect() as conn:
        auth_cnt = conn.execute(text("SELECT count(*) FROM auth.users")).scalar()
        print(f"   auth.users count: {auth_cnt}")
        
        all_empty = True
        for t in public_tables:
            cnt = conn.execute(text(f'SELECT count(*) FROM public."{t}"')).scalar()
            if cnt > 0:
                print(f"   WARNING: public.{t} still has {cnt} rows!")
                all_empty = False
            else:
                print(f"   public.{t}: 0 rows")
                
        tax_cnt = conn.execute(text("SELECT count(*) FROM public.competency_taxonomy")).scalar()
        print(f"\n   Reference Taxonomy: public.competency_taxonomy: {tax_cnt} canonical definitions intact.")

    print("\n" + "=" * 65)
    if auth_cnt == 0 and all_empty:
        print("ALL SUPABASE ACCOUNTS AND DATABASES ARE COMPLETELY WIPED & READY!")
    else:
        print("RESET FINISHED WITH WARNINGS (Check output above)")
    print("=" * 65)

if __name__ == "__main__":
    clear_all()
