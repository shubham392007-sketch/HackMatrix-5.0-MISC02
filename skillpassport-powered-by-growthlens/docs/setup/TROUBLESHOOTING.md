# Troubleshooting & Diagnostic Runbook — Skill Passport

This guide documents known operational failure modes, root causes, diagnostic checks, and verified resolutions.

---

## 1. Quick Diagnostic Flowchart

```text
Problem Encountered?
 ├── Frontend won't load (Connection Refused on :3001) ──► See Section 2: Port Conflicts
 ├── Backend won't start (ValidationError / Address in use) ──► See Section 2 & Section 9
 ├── Backend returns 503 Service Unavailable ──► See Section 3: Database Circuit Breaker
 ├── AI Analysis fails or falls back to regex ──► See Section 4: Ollama & AI Diagnostics
 ├── Next.js returns 502 on /api/v1/* requests ──► See Section 5: API Proxy & Rewrites
 └── GitHub/Jira sync fails with Decryption Error ──► See Section 6: Fernet Key Mismatch
```

---

## 2. Port Conflicts & Server Binding

### Symptom: `Error: listen EADDRINUSE: address already in use 0.0.0.0:3001` or `[Errno 10048] address already in use`

#### Root Cause:
Another application (or an orphaned previous instance of Next.js or Uvicorn) is holding port 3001 or 8001.

#### Resolution:
**Windows (PowerShell):**
```powershell
# Identify process using port 3001 or 8001
Get-NetTCPConnection -LocalPort 3001,8001 -ErrorAction SilentlyContinue | Select-Object LocalPort,OwningProcess

# Terminate the offending process by PID
Stop-Process -Id <PID> -Force
```

**macOS / Linux (Bash):**
```bash
# Identify and kill process on port 3001 or 8001
lsof -i :3001
lsof -i :8001
kill -9 <PID>
```

---

## 3. Database Connection Issues & Circuit Breaker Trips

### 3.1 Symptom: `HTTP 503 Service Unavailable` with `"Database circuit breaker is OPEN"`

#### Root Cause:
The `ReliabilityManager` tripped into the **OPEN** state after encountering 5 consecutive transient database connection errors within 60 seconds.

#### Diagnostic Checks:
1. Verify Supabase project status in the Supabase Dashboard.
2. Check backend console logs for the underlying exception (e.g., `OperationalError: could not connect to server` or `remaining connection slots are reserved`).
3. Note the `Retry-After: 15` header returned in the HTTP 503 response.

#### Resolution:
- If using Supabase, ensure your `DATABASE_URL` connects to the **Transaction Pooler** on port `6543`, not directly to port `5432`.
- Verify that `DB_POOL_SIZE` is set to `8` and `DB_MAX_OVERFLOW` is set to `0` in `backend/.env`.
- Wait 15 seconds for the circuit breaker to enter the `HALF-OPEN` state and execute a recovery probe.

---

### 3.2 Symptom: `FATAL: remaining connection slots are reserved for non-replication superuser connections`

#### Root Cause:
The maximum connection limit on your PostgreSQL database (typically 15 connections on Supabase Free/Micro tier) has been exceeded by other clients, tools, or multiple local development workers.

#### Resolution:
1. Terminate extraneous connections in Supabase SQL Editor:
   ```sql
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE datname = 'postgres' AND pid <> pg_backend_pid();
   ```
2. In `backend/.env`, verify that:
   ```ini
   DB_POOL_SIZE=8
   DB_MAX_OVERFLOW=0
   ```
3. Restart the backend API server.

---

## 4. Ollama & AI Diagnostics

### 4.1 Symptom: `Work analysis returned fallback_used: true`

#### Root Cause:
The backend attempted to contact Ollama at `http://localhost:11434`, but the service timed out or was unreachable, triggering the deterministic heuristic fallback parser.

#### Diagnostic Checks:
1. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```
2. Verify the `qwen3:8b` model is downloaded:
   ```bash
   ollama list
   ```

#### Resolution:
1. Start the Ollama application or daemon (`ollama serve`).
2. Pull the model if missing:
   ```bash
   ollama pull qwen3:8b
   ```
3. If inference is timing out on CPU-only machines, increase the timeout in `backend/.env`:
   ```ini
   OLLAMA_TIMEOUT_SECONDS=300.0
   ```

---

### 4.2 Symptom: Ollama Out of Memory (OOM) or Crashing

#### Root Cause:
Allocating too large a context window on GPUs with less than 6 GB of VRAM.

#### Resolution:
Ensure `OLLAMA_NUM_CTX` is set to `8192` in `backend/.env`. If running on 4 GB GPUs, reduce `OLLAMA_NUM_CTX` to `4096`.

---

## 5. Frontend API Proxy (502 Bad Gateway)

### Symptom: Frontend console shows `GET /api/v1/... 502 Bad Gateway`

#### Root Cause:
The Next.js dev server is running on `http://localhost:3001`, but the FastAPI backend is not running on `http://127.0.0.1:8001`.

#### Resolution:
1. Start the FastAPI backend server in a separate terminal:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
   ```
2. Test the backend directly:
   ```bash
   curl http://127.0.0.1:8001/api/v1/health
   ```
3. Refresh the frontend browser page.

---

## 6. Credential Encryption & Fernet Token Errors

### Symptom: `cryptography.fernet.InvalidToken` when syncing GitHub or Jira

#### Root Cause:
The `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY` in `backend/.env` was changed or regenerated after existing credentials were encrypted into the database.

#### Resolution:
- If the original key was backed up, restore it into `backend/.env`.
- If the key is permanently lost, delete and re-connect the affected integration in `/app/evidence/sources`, which will re-encrypt the new token under the current active key.

---

## 7. Document Upload & Extraction Errors

### Symptom: Document upload succeeds, but status remains `FAILED` or `EXTRACTION_ERROR`

#### Root Cause:
1. The uploaded PDF is password-protected or contains corrupted byte streams.
2. The file exceeds `MAX_UPLOAD_SIZE_MB` (default: 25 MB).
3. The uploaded image has low contrast or unsupported dimensions.

#### Diagnostic Checks:
Inspect the document extraction record via the backend test suite:
```bash
python -m pytest backend/tests/test_document_extraction_integrity.py -v
```

#### Resolution:
- Ensure uploaded PDFs are unencrypted.
- Check `error_summary` in the `uploaded_documents` table for specific parser stack traces.

---

## 8. ChromaDB SQLite3 Version Compatibility

### Symptom: `RuntimeError: Your system has an unsupported version of sqlite3. Chroma requires sqlite3 >= 3.35.0.`

#### Root Cause:
Common on older Linux distributions (CentOS 7, Ubuntu 18.04) or older Python builds on Windows.

#### Resolution:
Install `pysqlite3-binary` and inject it before importing chromadb:
```bash
pip install pysqlite3-binary
```
Add to `backend/app/main.py` before other imports:
```python
__import__('pysqlite3')
import sys
sys.modules['sqlite3'] = sys.modules.pop('pysqlite3')
```
*(Modern Windows 10/11 and Python 3.11+ ship with SQLite 3.40+ and do not require this workaround).*
