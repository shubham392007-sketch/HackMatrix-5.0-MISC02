# Pre-Flight Verification Checklist — Skill Passport

This checklist provides a structured, verifiable sequence of tests that developers and collaborators must execute to confirm their local environment is fully operational.

---

## 📋 Verification Matrix

- [ ] **Stage 1**: Environment Configuration & File Manifest
- [ ] **Stage 2**: Ollama & Model Readiness
- [ ] **Stage 3**: Database & Migration Integrity
- [ ] **Stage 4**: Backend API Service Verification
- [ ] **Stage 5**: Frontend Compilation & Proxy Verification
- [ ] **Stage 6**: Automated Test Suite Execution

---

## Stage 1: Environment Configuration & File Manifest

Execute these checks to confirm all configuration files exist and contain valid values:

### 1.1 Verify Files Exist
```bash
# Verify config files exist in the project root
test -f .env.local && echo "✓ Frontend .env.local exists" || echo "✗ Missing .env.local"
test -f backend/.env && echo "✓ Backend .env exists" || echo "✗ Missing backend/.env"
```

### 1.2 Verify Fernet Encryption Key
Confirm `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY` in `backend/.env` is a valid 32-byte base64 string:
```bash
python -c "
import os
from cryptography.fernet import Fernet
from backend.app.core.config import get_settings
key = get_settings().connector_credential_encryption_key
try:
    Fernet(key.encode())
    print('✓ Fernet encryption key is valid')
except Exception as e:
    print('✗ Invalid Fernet key:', e)
"
```

---

## Stage 2: Ollama & Local AI Readiness

Confirm the local LLM daemon is running with required models loaded:

### 2.1 Verify Ollama Service
```bash
curl -s http://localhost:11434/api/tags | grep -q "qwen3:8b" && echo "✓ Ollama is online with qwen3:8b" || echo "✗ qwen3:8b model not found"
```

### 2.2 Verify Embedding Model
```bash
curl -s http://localhost:11434/api/tags | grep -q "nomic-embed-text" && echo "✓ nomic-embed-text is available" || echo "✗ nomic-embed-text not found"
```

---

## Stage 3: Database & Migration Integrity

Confirm database connectivity and schema migrations:

### 3.1 Verify Alembic Current Revision
```bash
cd backend
alembic current
cd ..
```
*Expected output:* `001_initial_evidence_schema (head)`.

### 3.2 Verify Table Count
Verify that all 27 core database tables exist in PostgreSQL:
```bash
python -c "
from backend.app.db.session import engine
from sqlalchemy import inspect
insp = inspect(engine)
tables = insp.get_table_names()
print(f'Total tables found: {len(tables)}')
assert len(tables) >= 27, f'Expected at least 27 tables, found {len(tables)}'
print('✓ Database schema verification passed')
"
```

---

## Stage 4: Backend API Service Verification

With the backend running on `http://127.0.0.1:8001`:

### 4.1 Health Check Endpoint
```bash
curl -s http://127.0.0.1:8001/api/v1/health
```
*Expected response contains:* `"status": "healthy"`.

### 4.2 Liveness & Readiness Probes
```bash
curl -s http://127.0.0.1:8001/api/v1/health/liveness
curl -s http://127.0.0.1:8001/api/v1/health/readiness
```
*Expected response:* HTTP 200 with service health statuses.

### 4.3 OpenAPI Documentation
Open `http://127.0.0.1:8001/docs` in your browser. Verify all 9 router sections are visible:
- `Health`
- `Profile`
- `Connections`
- `Documents`
- `Portfolio`
- `Evidence`
- `IngestionRuns`
- `AI`
- `Passport`

---

## Stage 5: Frontend Compilation & Proxy Verification

With the frontend running on `http://localhost:3001`:

### 5.1 Homepage Verification
Visit `http://localhost:3001` in your browser.  
- [ ] Hero headline "See capability as it changes" displays correctly.
- [ ] No JavaScript console errors in Developer Tools.

### 5.2 Authenticated Route Verification
Navigate to:
- `http://localhost:3001/app/evidence/library` (Evidence Workspace)
- `http://localhost:3001/app/passport/skills` (Skill Passport)
- `http://localhost:3001/app/ai` (AI Intelligence Dashboard)

### 5.3 Next.js Proxy Verification
Open browser DevTools Network tab and verify that requests to:
`http://localhost:3001/api/v1/health`  
return HTTP 200 proxied from the backend.

---

## Stage 6: Automated Test Suite Execution

Run the complete backend test suite:

```bash
python -m pytest backend/tests -v
```

*Expected output:*
```text
======================= 16 passed in X.XXs =======================
```

---

## 🎯 Verification Sign-off

When all 6 stages above pass without errors, your local development environment is **Fully Operational** and ready for active feature development.
