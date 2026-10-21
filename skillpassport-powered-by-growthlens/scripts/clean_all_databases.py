import os
import shutil
import sys
from pathlib import Path

# Force UTF-8 stdout on Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Set up path to import backend modules
sys.path.insert(0, r"D:\HackMatrix-MISC02\skillpassport-powered-by-growthlens")

from sqlalchemy import inspect, text
from backend.app.db.session import engine
import chromadb

print("=========================================================")
print("  SKILLPASSPORT DATABASE CLEANUP & RESET FOR FRESH TESTING")
print("=========================================================")

# ---------------------------------------------------------------------
# 1. Clean PostgreSQL Application Tables
# ---------------------------------------------------------------------
print("\n[1/3] Cleaning Supabase PostgreSQL tables...")

TABLES_TO_TRUNCATE = [
    "ai_analysis_runs",
    "ai_evaluation_suite_runs",
    "connected_sources",
    "document_chunks",
    "evidence_competency_mappings",
    "evidence_conflicts",
    "evidence_items",
    "evidence_quality_assessments",
    "evidence_relationships",
    "hallucination_guard_results",
    "human_review_tasks",
    "ingestion_jobs",
    "output_validation_runs",
    "processing_events",
    "prompt_injection_findings",
    "raw_source_records",
    "repository_language_breakdowns",
    "repository_language_snapshots",
    "repository_readme_snapshots",
    "review_audit_events",
    "selected_resources",
    "source_sync_runs",
    "uploaded_documents",
    "user_profiles",
    "verification_decisions",
    "web_crawl_records",
    "work_analysis_results",
]

with engine.connect() as conn:
    trans = conn.begin()
    try:
        quoted_tables = ", ".join([f'public."{t}"' for t in TABLES_TO_TRUNCATE])
        sql = f"TRUNCATE TABLE {quoted_tables} CASCADE;"
        conn.execute(text(sql))
        trans.commit()
        print("  [OK] Successfully truncated all 27 application data tables.")
    except Exception as e:
        try:
            trans.rollback()
        except Exception:
            pass
        print(f"  [ERROR] Failed to truncate tables: {e}")
        sys.exit(1)

# Verify table counts
print("\n  PostgreSQL Table Counts after Truncate:")
with engine.connect() as conn:
    for t in sorted(TABLES_TO_TRUNCATE):
        count = conn.execute(text(f'SELECT count(*) FROM public."{t}"')).scalar()
        print(f"    - {t}: {count} rows")

    # Verify preserved system tables
    taxonomy_count = conn.execute(text('SELECT count(*) FROM public.competency_taxonomy')).scalar()
    alembic_count = conn.execute(text('SELECT count(*) FROM public.alembic_version')).scalar()
    print(f"\n  Preserved System Tables:")
    print(f"    - competency_taxonomy: {taxonomy_count} canonical skills (intact)")
    print(f"    - alembic_version: {alembic_count} migration record (intact)")

# ---------------------------------------------------------------------
# 2. Clean ChromaDB Vector Database
# ---------------------------------------------------------------------
print("\n[2/3] Cleaning ChromaDB vector databases...")

chroma_dirs = [
    Path(r"D:\HackMatrix-MISC02\skillpassport-powered-by-growthlens\backend\data\chroma_db"),
    Path(r"D:\HackMatrix-MISC02\skillpassport-powered-by-growthlens\chroma_data"),
    Path(r"D:\HackMatrix-MISC02\chroma_data"),
]

for cdir in chroma_dirs:
    if cdir.exists():
        try:
            client = chromadb.PersistentClient(path=str(cdir))
            collections = client.list_collections()
            print(f"  Checking ChromaDB at {cdir.name}: found {len(collections)} collections")
            for c in collections:
                c_name = c.name
                doc_count = c.count()
                client.delete_collection(c_name)
                # Re-create empty collection if it's the primary evidence store
                client.get_or_create_collection(
                    name=c_name,
                    metadata={"description": "SkillPassport evidence and document semantic embeddings"}
                )
                print(f"    [OK] Cleared collection '{c_name}' (was {doc_count} items, now 0)")
        except Exception as e:
            print(f"    [WARN] Error clearing ChromaDB at {cdir}: {e}")

# ---------------------------------------------------------------------
# 3. Clean Local Evidence Vault & Temporary Uploads
# ---------------------------------------------------------------------
print("\n[3/3] Cleaning Local Evidence Vault & upload storage...")

vault_dir = Path(r"D:\HackMatrix-MISC02\skillpassport-powered-by-growthlens\backend\data\evidence_vault")
if vault_dir.exists():
    deleted_files = 0
    deleted_dirs = 0
    for item in vault_dir.iterdir():
        if item.is_file():
            item.unlink()
            deleted_files += 1
        elif item.is_dir():
            shutil.rmtree(item)
            deleted_dirs += 1
    print(f"  [OK] Cleaned evidence vault: removed {deleted_files} files and {deleted_dirs} user subdirectories.")
else:
    vault_dir.mkdir(parents=True, exist_ok=True)
    print("  [OK] Created clean evidence vault directory.")

temp_img = Path(r"D:\HackMatrix-MISC02\skillpassport-powered-by-growthlens\backend\data\temp_cert_img.png")
if temp_img.exists():
    temp_img.unlink()
    print("  [OK] Removed temp_cert_img.png.")

print("\n=========================================================")
print("  CLEANUP COMPLETE: ALL DATABASES READY FOR FRESH TESTING")
print("=========================================================")
