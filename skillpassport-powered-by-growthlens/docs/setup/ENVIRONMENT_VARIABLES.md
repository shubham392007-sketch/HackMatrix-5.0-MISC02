# Environment Variables Reference — Skill Passport

This document catalogs every environment variable used in Skill Passport across the Next.js frontend and the FastAPI backend.

---

## 1. Quick Reference Matrix

| Variable Name | Target Service | Classification | Required? | Default / Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Frontend | **Public** | **Yes** | `https://your-ref.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Frontend | **Public** | **Yes** | `eyJhbGciOi...` |
| `NEXT_PUBLIC_BACKEND_URL` | Frontend | **Public** | No | `http://127.0.0.1:8001` |
| `NEXT_PUBLIC_API_URL` | Frontend | **Public** | No | `/api/v1` |
| `APP_ENV` | Backend | Internal | No | `development` |
| `API_V1_PREFIX` | Backend | Internal | No | `/api/v1` |
| `SECRET_KEY` | Backend | **Secret** | **Yes** (Prod) | `change-in-production-secret...` |
| `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY` | Backend | **Secret** | **Yes** | `32-byte-base64-fernet-key` |
| `DATABASE_URL` | Backend | **Secret** | **Yes** | `postgresql+psycopg2://...` |
| `DIRECT_URL` | Backend | **Secret** | No | `postgresql+psycopg2://...` |
| `DB_POOL_SIZE` | Backend | Internal | No | `8` |
| `DB_MAX_OVERFLOW` | Backend | Internal | No | `0` |
| `DB_POOL_TIMEOUT` | Backend | Internal | No | `20.0` |
| `DB_POOL_RECYCLE` | Backend | Internal | No | `300` |
| `DB_POOL_PRE_PING` | Backend | Internal | No | `True` |
| `SUPABASE_URL` | Backend | **Public** | **Yes** | `https://your-ref.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Backend | **Public** | No | `sb_publishable_...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | **Secret** | **Yes** | `your-service-role-key` |
| `SUPABASE_STORAGE_BUCKET` | Backend | Internal | No | `evidence-originals` |
| `SUPABASE_DERIVATIVES_BUCKET` | Backend | Internal | No | `evidence-derivatives` |
| `OLLAMA_BASE_URL` | Backend | Internal | No | `http://localhost:11434` |
| `OLLAMA_QWEN_MODEL` | Backend | Internal | No | `qwen3:8b` |
| `OLLAMA_EMBED_MODEL` | Backend | Internal | No | `nomic-embed-text` |
| `OLLAMA_TIMEOUT_SECONDS` | Backend | Internal | No | `180.0` |
| `OLLAMA_NUM_CTX` | Backend | Internal | No | `8192` |
| `CHROMA_PERSIST_DIRECTORY` | Backend | Internal | No | `./chroma_data` |
| `REDIS_URL` | Backend | Internal | No | `redis://localhost:6379/0` |
| `FRONTEND_ORIGINS` | Backend | Internal | No | `http://localhost:3000,http://localhost:3001` |
| `MAX_UPLOAD_SIZE_MB` | Backend | Internal | No | `25` |

---

## 2. Frontend Environment Variables (`.env.local`)

These variables are consumed by the Next.js application at build and runtime. Any variable starting with `NEXT_PUBLIC_` is embedded in the client bundle.

### `NEXT_PUBLIC_SUPABASE_URL`
- **Description**: The HTTPS root URL of your Supabase project.
- **Used by**: Supabase browser client (`src/lib/supabase/client.ts`).
- **Impact if missing**: Authentication and user session retrieval will fail immediately.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Description**: The public Supabase anonymous API key. Safe for client-side exposure; protected by Row Level Security (RLS) on PostgreSQL.
- **Used by**: Supabase browser client.

### `NEXT_PUBLIC_BACKEND_URL`
- **Description**: The absolute HTTP address where the FastAPI backend is hosted.
- **Default**: `http://127.0.0.1:8001`
- **Used by**: Server Components and direct server-to-server fetches.

### `NEXT_PUBLIC_API_URL`
- **Description**: The relative base path used by client components to invoke backend endpoints.
- **Default**: `/api/v1`
- **Note**: Next.js automatically rewrites `/api/v1/:path*` to `NEXT_PUBLIC_BACKEND_URL/api/v1/:path*`.

---

## 3. Backend Environment Variables (`backend/.env`)

These variables are loaded by `backend/app/core/config.py` using `pydantic-settings`.

### 3.1 Core Security & Encryption

#### `SECRET_KEY`
- **Description**: Application secret key used for session hashing and internal tokens.
- **Requirement**: Must be at least 32 characters in production.

#### `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY`
- **Description**: A 32-byte URL-safe base64-encoded key used by Fernet (`cryptography`) to encrypt external integration secrets (GitHub PATs, Jira tokens) in the `connected_sources` table.
- **How to generate**:
  ```bash
  python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```
- **Impact if missing or changed**: If changed or lost, previously encrypted connector tokens cannot be decrypted, requiring users to re-authenticate their connected sources.

---

### 3.2 Database & Pooling Configuration

#### `DATABASE_URL`
- **Description**: The primary SQLAlchemy connection string for runtime queries using `psycopg2`.
- **Format**: `postgresql+psycopg2://<user>:<password>@<host>:<port>/<dbname>`
- **Supabase Pooler Recommendation**: Use the Supabase Transaction Pooler (port `6543`) for runtime connections:
  ```text
  postgresql+psycopg2://postgres.projectref:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
  ```

#### `DIRECT_URL`
- **Description**: Direct connection string for session-mode operations and Alembic schema migrations (port `5432`).
- **Format**: `postgresql+psycopg2://postgres.projectref:PASSWORD@aws-0-region.pooler.supabase.com:5432/postgres?sslmode=require`

#### `DB_POOL_SIZE`
- **Description**: Maximum number of persistent connections held in the SQLAlchemy QueuePool.
- **Default**: `8`
- **Constraint**: Must remain `<= 8` when running against Supabase Free/Micro instances, which enforce a strict pool ceiling of 15 connections.

#### `DB_MAX_OVERFLOW`
- **Description**: Number of connections that can be opened beyond `DB_POOL_SIZE`.
- **Default**: `0` (Strictly enforces that no excess connections are spawned, preventing database pool exhaustion).

#### `DB_POOL_RECYCLE`
- **Description**: Number of seconds after which a pooled connection is recycled.
- **Default**: `300` (Recycles idle sockets before cloud network firewalls drop them silently).

#### `DB_POOL_PRE_PING`
- **Description**: If `True`, tests connections on checkout with a lightweight `SELECT 1` ping.
- **Default**: `True`

---

### 3.3 Supabase Service Keys & Storage

#### `SUPABASE_SERVICE_ROLE_KEY`
- **Description**: The privileged Supabase secret key that bypasses Row Level Security.
- **Security Rule**: **NEVER** expose this key to the frontend or commit it to version control.

#### `SUPABASE_STORAGE_BUCKET`
- **Description**: The Supabase Storage bucket name used for storing original uploaded files.
- **Default**: `evidence-originals`

#### `SUPABASE_DERIVATIVES_BUCKET`
- **Description**: The Supabase Storage bucket name used for extracted text derivatives and thumbnails.
- **Default**: `evidence-derivatives`

---

### 3.4 Ollama AI Inference

#### `OLLAMA_BASE_URL`
- **Description**: HTTP base URL for the local Ollama daemon.
- **Default**: `http://localhost:11434`

#### `OLLAMA_QWEN_MODEL`
- **Description**: Tag name of the Qwen model pulled in Ollama.
- **Default**: `qwen3:8b`

#### `OLLAMA_EMBED_MODEL`
- **Description**: Tag name of the embedding model pulled in Ollama.
- **Default**: `nomic-embed-text`

#### `OLLAMA_NUM_CTX`
- **Description**: Context window size in tokens allocated for inference requests.
- **Default**: `8192` (Selected for 100% GPU offload on 6GB-8GB VRAM graphics cards).

#### `OLLAMA_TIMEOUT_SECONDS`
- **Description**: HTTP timeout in seconds for LLM generation requests.
- **Default**: `180.0` (Accommodates cold starts and initial model loading into VRAM).
