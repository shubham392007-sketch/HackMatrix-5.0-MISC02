# Local Development Guide — Skill Passport

This guide walks collaborators step-by-step through setting up, configuring, running, and verifying the entire **Skill Passport** application locally on your machine.

---

## 1. System Requirements

Ensure your machine meets the following prerequisites:

| Component | Minimum Version | Recommended / Target |
| :--- | :--- | :--- |
| **Operating System** | Windows 10/11, macOS 13+, or Ubuntu 22.04+ | Windows 11 / Ubuntu 22.04 |
| **Node.js** | `v20.12.0` LTS | `v20.x` or `v22.x` |
| **npm** | `v10.x` | `v10.x` |
| **Python** | `3.11.0` | `3.11.9` or `3.12.x` |
| **Ollama** | `v0.3.0+` | Latest with GPU support (NVIDIA CUDA / Apple Metal) |
| **RAM & VRAM** | 16 GB System RAM | 16 GB+ RAM, 6 GB+ VRAM (for Qwen3 8B GPU offload) |
| **PostgreSQL** | PostgreSQL 15+ | Hosted Supabase instance or local Postgres 15+ |

---

## 2. Port Allocation & Network Architecture

Skill Passport operates across two coordinated local servers:

- **Frontend Application**: `http://localhost:3001` (Next.js 16 App Router)
- **Backend API Service**: `http://127.0.0.1:8001` (FastAPI with Uvicorn)
- **Local LLM Engine**: `http://localhost:11434` (Ollama daemon)
- **Local Vector Index**: `chroma_data/` (embedded ChromaDB)

> [!NOTE]
> Next.js proxies client requests from `http://localhost:3001/api/v1/:path*` directly to `http://127.0.0.1:8001/api/v1/:path*` using the rewrite configuration in [`next.config.ts`](../../next.config.ts). This eliminates browser CORS issues during development.

---

## 3. Step-by-Step Installation

### Step 3.1: Clone the Repository
```bash
git clone <repository-url>
cd HackMatrix-MISC02/skillpassport-powered-by-growthlens
```

---

### Step 3.2: Configure Environment Variables

Create the local environment files from the master template:

#### Windows (PowerShell):
```powershell
# In the skillpassport-powered-by-growthlens directory:
Copy-Item .env.example .env.local
Copy-Item .env.example backend\.env
```

#### macOS / Linux (Bash):
```bash
# In the skillpassport-powered-by-growthlens directory:
cp .env.example .env.local
cp .env.example backend/.env
```

#### Generate a Fernet Credential Key:
Run this Python one-liner to generate a valid 32-byte Fernet base64 key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Paste this generated key into `backend/.env` under `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY`.

#### Fill In Your Supabase Credentials:
Edit `.env.local` and `backend/.env`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase URL (e.g., `https://xyzcompany.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anon key
- `DATABASE_URL`: Your PostgreSQL connection string with psycopg2
- `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key (backend only)

---

### Step 3.3: Set Up Python Backend Environment

#### Windows (PowerShell):
```powershell
# Create a dedicated virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Upgrade pip and install all backend requirements
python -m pip install --upgrade pip
pip install -r requirements.txt
```

#### macOS / Linux (Bash):
```bash
# Create a dedicated virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip and install all backend requirements
pip install --upgrade pip
pip install -r requirements.txt
```

---

### Step 3.4: Set Up Node.js Frontend Environment

In the root of `skillpassport-powered-by-growthlens`:
```bash
npm install
```

---

### Step 3.5: Run Database Schema Migrations

Apply the Alembic migrations to set up the 27 database tables:

```bash
cd backend
alembic upgrade head
cd ..
```

---

### Step 3.6: Set Up Ollama & Download Models

1. Ensure Ollama is installed and running in the background. Check via:
   ```bash
   ollama list
   ```
2. Pull the required models:
   ```bash
   ollama pull qwen3:8b
   ollama pull nomic-embed-text
   ```
3. Verify the Ollama HTTP API responds:
   ```bash
   curl http://localhost:11434/api/tags
   ```

---

## 4. Starting the Application

To run the complete system, launch the backend and frontend in separate terminals.

### Terminal 1: Backend API Service

Activate your virtual environment, then start Uvicorn:

#### Windows (PowerShell):
```powershell
.\venv\Scripts\Activate.ps1
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

#### macOS / Linux (Bash):
```bash
source venv/bin/activate
uvicorn backend.app.main:app --host 127.0.0.1 --port 8001 --reload
```

*Expected output:*
```text
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Starting SkillPassport Evidence Intelligence API [v1.0.0] in development mode
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8001 (Press CTRL+C to quit)
```

---

### Terminal 2: Frontend Application

In the root of `skillpassport-powered-by-growthlens`:

```bash
npm run dev
```

*Expected output:*
```text
   ▲ Next.js 16.3.6 (Turbopack)
   - Local:        http://localhost:3001
   - Network:      http://192.168.x.x:3001
   ✓ Starting...
   ✓ Ready in 1200ms
```

---

## 5. Verifying the Local Setup

1. **Backend Health Check**:
   Open `http://127.0.0.1:8001/api/v1/health` in your browser.  
   Expected JSON response:
   ```json
   {
     "status": "healthy",
     "app": "SkillPassport Evidence Intelligence API",
     "version": "1.0.0",
     "services": {
       "database": {"status": "healthy", "connected": true},
       "ollama": {"status": "healthy", "connected": true, "model_available": true}
     }
   }
   ```
2. **Interactive API Documentation**:
   Visit `http://127.0.0.1:8001/docs` (Swagger UI) or `http://127.0.0.1:8001/redoc`.
3. **Frontend Application**:
   Visit `http://localhost:3001`. You can navigate through:
   - `/` — Homepage & Architecture overview
   - `/app/evidence/library` — Evidence Workspace
   - `/app/passport/skills` — Skill Passport & Verified ledger
   - `/app/ai` — AI Intelligence & Governance dashboard

---

## 6. Running Automated Tests

Run backend tests:
```bash
# From repository root
python -m pytest backend/tests -v
```

Run frontend lint and build validation:
```bash
npm run lint
npm run build
```
