import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
from sqlalchemy import text
from backend.app.db.session import engine, SessionLocal
from backend.app.core.config import get_settings

def run_cleanup():
    print("Connecting to database...")
    settings = get_settings()
    
    # User application tables in public schema to truncate
    public_tables = [
        "human_review_tasks",
        "review_audit_events",
        "evidence_conflicts",
        "evidence_relationships",
        "evidence_quality_assessments",
        "hallucination_guard_results",
        "output_validation_runs",
        "prompt_injection_findings",
        "work_analysis_results",
        "ai_analysis_runs",
        "ai_evaluation_suite_runs",
        "evidence_competency_mappings",
        "document_chunks",
        "evidence_items",
        "uploaded_documents",
        "selected_resources",
        "repository_language_snapshots",
        "repository_language_breakdowns",
        "raw_source_records",
        "source_sync_runs",
        "connected_sources",
        "processing_events",
        "ingestion_jobs",
        "web_crawl_records",
        "user_profiles",
    ]

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                print(f"Executing database cleanup (attempt {attempt})...")
                
                # 1. Truncate all public application tables
                for tbl in public_tables:
                    try:
                        conn.execute(text(f"TRUNCATE TABLE public.{tbl} CASCADE;"))
                        print(f"  [CLEARED] public.{tbl}")
                    except Exception as e:
                        print(f"  [WARN] Failed to truncate public.{tbl}: {e}")
                
                # 2. Delete all users from auth.users (cascades to identities, sessions, tokens)
                try:
                    res = conn.execute(text("DELETE FROM auth.users;"))
                    print(f"  [CLEARED] auth.users (deleted all Supabase accounts)")
                except Exception as e:
                    print(f"  [WARN] Failed to clear auth.users via SQL: {e}")
                
                # Commit transactions
                conn.commit()
                print("Database transaction committed successfully.")
                break
        except Exception as e:
            print(f"Connection error on attempt {attempt}: {e}")
            if attempt < max_retries:
                time.sleep(2)
            else:
                raise e

    # Also clean local chroma data directory if any
    chroma_dir = settings.chroma_persist_directory
    if os.path.exists(chroma_dir):
        import shutil
        try:
            print(f"Clearing ChromaDB directory: {chroma_dir}")
            for item in os.listdir(chroma_dir):
                item_path = os.path.join(chroma_dir, item)
                if os.path.isfile(item_path):
                    os.remove(item_path)
                elif os.path.isdir(item_path):
                    shutil.rmtree(item_path)
            print("ChromaDB storage wiped clean.")
        except Exception as e:
            print(f"Warning clearing chroma directory: {e}")

    # Re-seed canonical competency taxonomy so the system is ready for new evidence
    try:
        from backend.app.db.seeds import seed_canonical_taxonomy
        db = SessionLocal()
        count = seed_canonical_taxonomy(db)
        print(f"Ensured canonical taxonomy is seeded ({count} added / verified active).")
        db.close()
    except Exception as e:
        print(f"Warning verifying taxonomy seeds: {e}")

    print("\nDATABASE CLEANUP AND RESET COMPLETE!")
    return 0

if __name__ == "__main__":
    sys.exit(run_cleanup())
