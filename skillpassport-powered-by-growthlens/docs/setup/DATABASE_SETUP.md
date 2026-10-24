# Database Setup & PostgreSQL Connectivity Guide — Skill Passport

This comprehensive guide covers PostgreSQL database configuration with Supabase, connection mode selection (Session Pooler vs Direct vs Transaction), connection pool tuning, resolving IPv6 compatibility and `EMAXCONNSESSION` errors, Alembic schema migrations, and the database circuit breaker architecture.

> [!CAUTION]
> **CREDENTIAL INTEGRITY WARNING**  
> Never commit `.env`, connection strings, or database passwords to Git. Connection strings contain credentials that grant full read/write access to your database. Ensure `.env` is listed in `.gitignore` and always use environment variables.

---

## 1. Architecture Overview

Skill Passport uses PostgreSQL as its primary transactional database. The system connects via **SQLAlchemy 2.0** to hosted PostgreSQL on **Supabase** via the Supavisor connection pooler.

```text
┌────────────────────────────────────────────────────────┐
│               FastAPI Application Process               │
│             (SQLAlchemy 2.0 Engine QueuePool)          │
│       Bounded: pool_size=2, max_overflow=0             │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ IPv4 TCP (Port 5432)
                            ▼
┌────────────────────────────────────────────────────────┐
│             Supabase Session Pooler (Supavisor)        │
│          Host: aws-0-[REGION].pooler.supabase.com      │
│        Session Mode: Max 15 Total Project Clients      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│                 PostgreSQL Database                    │
│            (34 Relational Tables, Schema 001)          │
└────────────────────────────────────────────────────────┘
```

---

## 2. Supabase Connection Modes & Why Session Pooler is Required

When connecting to a Supabase PostgreSQL database from local development or cloud environments, three connection strings exist in the Supabase Dashboard:

| Connection Mode | Port | Host Pattern | IPv4 / IPv6 | Supported by Skill Passport? | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Session Pooler** (Recommended) | `5432` | `aws-0-[region].pooler.supabase.com` | **IPv4 Compatible** | **YES (Primary)** | Supports prepared statements, session variables, and standard connections. Bounded by 15 project sessions on free tier. |
| **Transaction Pooler** | `6543` | `aws-0-[region].pooler.supabase.com` | **IPv4 Compatible** | Needs explicit config | Closes connection after each transaction. Breaks client-side prepared statements and `SET` commands unless specifically tuned. |
| **Direct Connection** | `5432` | `db.[project-ref].supabase.co` | **IPv6 ONLY** (Free tier) | Fails on IPv4 networks | Lacks IPv4 address without paid Supabase IPv4 Add-on. Attempts result in `TimeoutError` on IPv4 networks. |

### 2.1 The IPv6 Incompatibility Root Cause
On Supabase Free Tier, the direct hostname `db.[project-ref].supabase.co` resolves exclusively to IPv6 `AAAA` records. On local networks, ISPs, or hosting providers without active IPv6 routing, any attempt to connect to `db.[project-ref].supabase.co:5432` results in:
```text
TimeoutError: timed out
# or: could not connect to server: Connection timed out
```
**Resolution:** Always use the **Session Pooler** (`aws-0-[region].pooler.supabase.com` on port `5432`), which resolves to standard IPv4 addresses and connects reliably.

---

## 3. How to Obtain the Correct Connection String from Supabase Dashboard

To configure your local environment with the verified compatible connection string:

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **Connect** (at the top header) or navigate to **Project Settings** → **Database** → **Connection string**.
3. Select the **Session Pooler** tab.
4. Ensure the port shown is `5432`.
5. Select **URI** (or SQLAlchemy format).
6. The URI will follow this structure:
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[YOUR-REGION].pooler.supabase.com:5432/postgres
   ```
7. Copy this string and configure it in your local `.env` as described in Section 4.

---

## 4. Local `.env` Configuration & Password Encoding

### 4.1 URL-Encoding Reserved Characters in Passwords
If your Supabase database password contains reserved URI characters such as `@`, `:`, `/`, `?`, `#`, `!`, `[`, or `]`, they must be percent-encoded once so the URI parser does not misinterpret the username/host delimiter.

You can encode your password safely using Python without sharing it:
```bash
python -c "import urllib.parse; print(urllib.parse.quote_plus('YOUR_PASSWORD_HERE'))"
```
Example:
- Plain password: `P@ssword!123`
- Encoded password: `P%40ssword%21123`

> [!WARNING]
> Do not double-encode an already encoded password. If your password was already generated without special characters, no encoding is required.

### 4.2 Configuring `.env`
Set the normalized connection string in `skillpassport-powered-by-growthlens/.env`:
```bash
# Primary database connection (Session Pooler, Port 5432, IPv4 compatible)
DATABASE_URL=postgresql+psycopg2://postgres.[PROJECT-REF]:[ENCODED_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

# Direct URL (also set to Session Pooler for reliable IPv4 Alembic migrations)
DIRECT_URL=postgresql+psycopg2://postgres.[PROJECT-REF]:[ENCODED_PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require

# Bounded connection pool (strictly capped to prevent EMAXCONNSESSION)
DB_POOL_SIZE=2
DB_MAX_OVERFLOW=0
DB_POOL_TIMEOUT=10.0
DB_POOL_RECYCLE=300
DB_POOL_PRE_PING=True

# Circuit breaker & retry limits
DB_MAX_RETRIES=2
DB_CIRCUIT_BREAKER_THRESHOLD=5
DB_CIRCUIT_BREAKER_RECOVERY_SECONDS=15.0
```

> [!NOTE]
> Skill Passport automatically normalizes `postgres://` and `postgresql://` URIs to `postgresql+psycopg2://` at startup via Pydantic model validation.

---

## 5. Resolving `FATAL: (EMAXCONNSESSION)` & Connection Budgeting

### 5.1 What Causes `EMAXCONNSESSION`?
Supabase Free Tier enforces a hard project ceiling of **15 concurrent client connections** in session pooler mode:
```text
FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15
```

This error is triggered when the sum of connections across all consumers exceeds 15:
- Multiple Uvicorn/Gunicorn worker processes (e.g. 4 workers $\times$ 8 pool size $= 32 > 15$).
- Next.js or Prisma client holding persistent pool sessions.
- Open Supabase Studio tabs or SQL Editor sessions.
- Background Celery workers or migration scripts running concurrently.
- Unbounded pool overflow (`max_overflow > 0`).

### 5.2 The Aggregate Connection Budget
Skill Passport enforces a conservative connection budget that stays well within 15:

| Process | Connection Limit | Rationale |
| :--- | :--- | :--- |
| **FastAPI Backend (Uvicorn)** | **2** (`pool_size=2`, `max_overflow=0`) | Handles all API requests with fast connection checkout and return |
| **Background Queue / Celery** | **1** (`worker_concurrency=1`) | Sequential background task execution |
| **Dev Tools / Studio / Migrations** | **4** (Temporary headroom) | Reserved for CLI, Alembic migrations, and Supabase Studio |
| **Safety Headroom** | **8** | Guaranteed buffer to prevent pool exhaustion |
| **Total Project Aggregate** | **7** connections | **Well below the 15-connection ceiling** |

### 5.3 Diagnostic Checklist for Connection Exhaustion
If `EMAXCONNSESSION` occurs:
1. **Check running processes**: Ensure only one instance of Uvicorn is running:
   ```bash
   Get-Process python | Select-Object Id, ProcessName, WorkingSet
   ```
2. **Verify pool configuration**: Ensure `DB_POOL_SIZE` is set to `2` and `DB_MAX_OVERFLOW` is `0`.
3. **Verify request session closure**: Confirm that database sessions in custom code use `with SessionLocal() as db:` or FastAPI's `db: Session = Depends(get_db)` so they close and release connections immediately.
4. **Inspect active Supabase connections**: In Supabase Dashboard, go to **Reports** → **Database** to view active connection counts.

---

## 6. Verifying PostgreSQL Connectivity

Test connectivity in three increasing levels of scope:

### Test A: Basic TCP & DNS Resolution
Confirm that your machine can resolve and open a TCP socket to the Supabase pooler on port 5432:
```bash
python -c "
import socket
host = 'aws-0-ap-northeast-1.pooler.supabase.com' # Replace with your pooler host
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.settimeout(5.0)
s.connect((host, 5432))
print('TCP Connect to port 5432 SUCCESS!')
s.close()
"
```

### Test B: Safe Read-Only `SELECT 1` Query
Execute a non-destructive query using the application's SQLAlchemy engine:
```bash
python -c "
from backend.app.db.session import engine
from sqlalchemy import text
with engine.connect() as conn:
    print('SELECT 1 result:', conn.execute(text('SELECT 1;')).scalar())
"
```
*Expected output:* `SELECT 1 result: 1`

### Test C: Read-Only Application Table Query
Verify access to application tables without writing any records:
```bash
python -c "
from backend.app.db.session import SessionLocal
from backend.app.models.user_profile import UserProfile
from backend.app.models.taxonomy import CompetencyTaxonomy
with SessionLocal() as db:
    print('Taxonomy rows:', db.query(CompetencyTaxonomy).count())
    print('User profile rows:', db.query(UserProfile).count())
"
```

---

## 7. Schema Inspection & Alembic Migrations

The database schema is managed via **Alembic**. Schema revisions are in `backend/alembic/versions/`.

### 7.1 Inspect Current Database Revision
To check the current revision without modifying the database:
```bash
python -c "
from backend.app.db.session import engine
from sqlalchemy import text
with engine.connect() as conn:
    print('DB Alembic version:', conn.execute(text('SELECT version_num FROM alembic_version;')).fetchall())
"
```
*Current valid revision:* `001_initial_evidence_schema`

### 7.2 Database Tables (34 Core Tables)
The active database schema contains 34 relational tables covering:
- **Authentication & User:** `user_profiles`, `user_target_roles`
- **Connected Sources:** `connected_sources`, `selected_resources`, `source_sync_runs`, `raw_source_records`
- **Source Provenance:** `repository_language_snapshots`, `repository_language_breakdowns`, `repository_readme_snapshots`
- **Document Processing:** `uploaded_documents`, `document_chunks`, `web_crawl_records`
- **Work Ingestion:** `ingestion_jobs`, `processing_events`
- **Evidence & Taxonomy:** `evidence_items`, `evidence_relationships`, `competency_taxonomy`, `evidence_competency_mappings`
- **AI Decomposition:** `ai_analysis_runs`, `work_analysis_results`, `evidence_quality_assessments`
- **Trust & Governance:** `verification_decisions`, `hallucination_guard_results`, `output_validation_runs`, `evidence_conflicts`, `prompt_injection_findings`, `human_review_tasks`, `ai_evaluation_suite_runs`, `review_audit_events`
- **Career Intelligence:** `job_postings`, `job_search_cache`, `role_demand_models`, `role_match_snapshots`

---

## 8. Database Circuit Breaker & Automatic Recovery

Skill Passport implements an automatic circuit breaker (`DatabaseCircuitBreaker` in [`backend/app/db/reliability.py`](../../backend/app/db/reliability.py)):

- **CLOSED State**: Database queries execute normally. Consecutive transient failure count resets to 0 on success.
- **OPEN State**: If **5 consecutive connection failures** occur within 60 seconds, the circuit trips to OPEN. Subsequent database calls fail fast with `HTTP 503 Service Unavailable` and a `Retry-After: 15` header, preventing request cascading and allowing the Supabase pooler to drain.
- **HALF-OPEN State**: After a 15-second recovery window, the breaker permits a single probe query. If the probe succeeds, the circuit closes; if it fails, it returns to OPEN for another 15 seconds.

---

## 9. Running Automated Reliability Tests

Run the full database and pool reliability test suite (22 unit & integration tests):
```bash
cd skillpassport-powered-by-growthlens
python -m pytest backend/tests/test_db_reliability.py backend/tests/test_postgres_pool_reliability.py -v
```
All 22 tests must pass with `100%`.
