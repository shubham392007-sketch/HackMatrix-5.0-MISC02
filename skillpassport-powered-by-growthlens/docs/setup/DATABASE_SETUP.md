# Database Setup & Connection Guide — Skill Passport

This guide covers PostgreSQL database configuration, Supabase integration, Alembic schema migrations, connection pool tuning, and the database circuit breaker architecture.

---

## 1. Architecture Overview

Skill Passport uses PostgreSQL as its primary transactional database. The system is designed to run seamlessly with hosted PostgreSQL via **Supabase** or a standard self-hosted PostgreSQL 15+ instance.

```text
┌─────────────────────────────────┐
│     FastAPI Application         │
│  (SQLAlchemy 2.0 QueuePool)     │
│  Bounded: Pool=8, Overflow=0    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│     Supabase Connection Pooler  │
│      (PgBouncer / Port 6543)    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│      PostgreSQL Database        │
│     (27 Relational Tables)      │
└─────────────────────────────────┘
```

---

## 2. Supabase Project Setup

### 2.1 Create Supabase Project
1. Log in to [supabase.com](https://supabase.com/) and create a new project.
2. Note your **Project Reference ID** (found in Project Settings → General).
3. Set a strong database password and record it safely.

### 2.2 Retrieve Connection Strings
In your Supabase Dashboard, navigate to **Project Settings** → **Database** → **Connection string**:

- **Transaction Mode (Pooler - Port 6543)**:  
  Used for `DATABASE_URL` during normal application operations:
  ```text
  postgresql+psycopg2://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
  ```
- **Session Mode (Direct - Port 5432)**:  
  Used for `DIRECT_URL` to run Alembic schema migrations and DDL statements:
  ```text
  postgresql+psycopg2://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require
  ```

### 2.3 Create Supabase Storage Buckets
Skill Passport uses two private storage buckets for evidence files:
1. Navigate to **Storage** in the Supabase Dashboard.
2. Click **Create new bucket**:
   - Bucket name: `evidence-originals`
   - Public bucket: **Disabled** (Private)
3. Click **Create new bucket**:
   - Bucket name: `evidence-derivatives`
   - Public bucket: **Disabled** (Private)

---

## 3. Running Schema Migrations (Alembic)

The database schema is managed via **Alembic**. Schema revisions are stored in `backend/alembic/versions/`.

### 3.1 Apply All Migrations
Ensure your virtual environment is active, then navigate to `backend/` and run:

```bash
cd backend
alembic upgrade head
cd ..
```

*Expected output:*
```text
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 001_initial_evidence_schema
```

### 3.2 Verifying Database Tables
After migration, PostgreSQL will contain **27 core tables**:

| Category | Table Name | Purpose |
| :--- | :--- | :--- |
| **User & Profile** | `user_profiles` | User profile data, onboarding state, job title, career goal |
| **Connected Sources** | `connected_sources` | OAuth/PAT credentials (Fernet encrypted), sync states |
| | `selected_resources` | Specific GitHub repositories or Jira projects selected for sync |
| | `source_sync_runs` | Telemetry, discovered vs imported counters, error summaries |
| | `raw_source_records` | Immutable raw JSON payloads and sha256 content hashes |
| **Documents & Uploads**| `uploaded_documents`| File metadata, storage keys, sha256, extraction state |
| | `document_chunks` | Parsed paragraphs, slide/page offsets, normalized text |
| **Work Ingestion** | `ingestion_jobs` | Execution state, attempt counts, stage progress |
| | `processing_events` | Granular event stream per job execution |
| | `web_crawl_records` | Cleaned web content, discovered links, SSRF status |
| **Evidence & Skills** | `evidence_items` | Canonical normalized evidence items with citations |
| | `evidence_relationships`| Cross-evidence links, prerequisite & collaborative links |
| | `competency_taxonomy` | Standardized skills hierarchy, aliases, and versions |
| | `evidence_competency_mappings`| Many-to-many skill-to-evidence links with proficiency scores |
| **Source Provenance** | `repository_language_snapshots` | Repository language size snapshots from GitHub API |
| | `repository_language_breakdowns` | Language byte counts and distribution percentages |
| | `repository_readme_snapshots` | Cleaned repository README sections and content hashes |
| **AI Work Decomposition**| `ai_analysis_runs` | Batch run tracker, model versions, warnings |
| | `work_analysis_results` | Facts, claims, inferred skills, technical tasks |
| | `evidence_quality_assessments`| Multi-factor evidence strength scoring (0-100) |
| **Trust & Governance**| `verification_decisions`| Deterministic verification status and rule versions |
| | `hallucination_guard_results`| 7-point citation verification outcomes and reason codes |
| | `output_validation_runs` | Schema conformity, missing fields, retry counts |
| | `evidence_conflicts` | Contradiction tracker between conflicting evidence items |
| | `prompt_injection_findings`| Quarantined adversarial prompt injection detections |
| | `human_review_tasks` | Review queue tasks for low-confidence or conflicting items |
| | `ai_evaluation_suite_runs`| Benchmarking and golden dataset regression tracking |
| **Audit Logging** | `review_audit_events` | Immutable log of state changes, overrides, and timestamps |

---

## 4. Connection Pooling & Reliability Configuration

Skill Passport is configured in `backend/app/core/config.py` with strict limits designed to prevent connection pool exhaustion:

```python
# Connection Pool Settings in backend/app/core/config.py
db_pool_size: int = 8          # QueuePool maximum size
db_max_overflow: int = 0       # Zero overflow prevents unbounded spillage
db_pool_timeout: float = 20.0  # Max seconds to wait for a connection
db_pool_recycle: int = 300     # 5-minute socket recycle to prevent silent drops
db_pool_pre_ping: bool = True  # Validates connection health before checkout
```

### Why These Pool Settings Matter:
1. **Supabase Micro Tier Limit (15 Connections)**:  
   Supabase micro instances allow at most 15 simultaneous connections. By fixing `db_pool_size = 8` and `db_max_overflow = 0`, Skill Passport guarantees it will never exceed this ceiling, leaving headroom for migrations, PgBouncer, and monitoring tools.
2. **Pre-Ping Protection**:  
   If an idle TCP connection is terminated by a firewall or network switch, `pre_ping = True` detects the dropped socket and transparently reconnects rather than throwing a broken pipe error to the user.

---

## 5. The Database Circuit Breaker

To protect the platform from cascading failures during database outages, Skill Passport implements a dedicated circuit breaker (`ReliabilityManager` in [`backend/app/db/reliability.py`](../../backend/app/db/reliability.py)).

### States & Transitions:
- **CLOSED (Normal)**: All database queries execute normally. Consecutive transient failure counter is reset on every successful query.
- **OPEN (Tripped)**: If **5 consecutive transient failures** occur within 60 seconds, the circuit breaker opens. Any subsequent database call immediately raises `DatabaseUnavailableError` with HTTP status `503 Service Unavailable` and a `Retry-After: 15` header without waiting for network timeouts.
- **HALF-OPEN (Probe)**: After **15 seconds** in the OPEN state, the breaker permits a single probe query. If successful, the circuit closes; if it fails, the breaker resets to OPEN for another 15 seconds.

---

## 6. Verifying Database Health

Execute the database test suite to verify connectivity, schema compliance, and circuit breaker operation:

```bash
python -m pytest backend/tests/test_database.py backend/tests/test_db_reliability.py -v
```
