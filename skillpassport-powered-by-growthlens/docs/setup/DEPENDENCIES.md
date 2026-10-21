# Dependencies & System Requirements — Skill Passport

This document catalogs every system, runtime, backend, and frontend dependency required to develop, build, and run Skill Passport.

---

## 1. System-Level Runtimes

| Component | Required Version | Verification Command | Description & Installation |
| :--- | :--- | :--- | :--- |
| **Node.js** | `>= 20.12.0` LTS | `node -v` | JavaScript runtime powering the Next.js frontend. Install via [nodejs.org](https://nodejs.org/) or `nvm` (`nvm install 20`). |
| **npm** | `>= 10.0.0` | `npm -v` | Node package manager included with Node.js. |
| **Python** | `3.11.x` or `3.12.x` | `python --version` | Backend language runtime. Requires standard `venv` and `pip`. |
| **Ollama** | `>= 0.3.0` | `ollama --version` | Local LLM inference runner. Provides REST API for Qwen3 8B model. Download from [ollama.ai](https://ollama.ai/). |
| **PostgreSQL** | `>= 15.0` | `psql --version` | Relational database. Can use Supabase Cloud (free tier) or local PostgreSQL container. |
| **Git** | `>= 2.30.0` | `git --version` | Version control. |

> [!IMPORTANT]
> **Windows C++ Build Tools**: ChromaDB and certain cryptographic packages compile native binary extensions on Windows. If installing on Windows, ensure the **Visual C++ Build Tools** (Visual Studio 2022 Build Tools) with "Desktop development with C++" is installed if pre-built wheels are unavailable.

---

## 2. Backend Dependencies (`requirements.txt`)

### 2.1 Web Framework & Routing
- **`fastapi` (`>= 0.115.0`)**: High-performance asynchronous web framework providing OpenAPI generation, dependency injection, and automatic request validation.
- **`uvicorn[standard]` (`>= 0.30.0`)**: ASGI web server running FastAPI with uvloop and httptools.
- **`pydantic` (`>= 2.8.0`)**: Data parsing, schema definition, and JSON contract validation.
- **`pydantic-settings` (`>= 2.4.0`)**: Typed environment variable loading from `.env` files.

### 2.2 Database & Persistence
- **`sqlalchemy` (`>= 2.0.30`)**: Modern SQL toolkit and Object Relational Mapper using 2.0 declarative style and typed queries.
- **`alembic` (`>= 1.13.0`)**: Database migration manager tracking schema revisions in `backend/alembic/`.
- **`psycopg2-binary` (`>= 2.9.9`)**: PostgreSQL database adapter enabling robust pooled connections.
- **`supabase` (`>= 2.7.0`)**: Official Supabase Python SDK for client-side table operations and Storage bucket management.

### 2.3 Security & Cryptography
- **`cryptography` (`>= 43.0.0`)**: Provides `Fernet` symmetric encryption (AES-128-CBC + HMAC-SHA256) for connector credentials.
- **`pyjwt[crypto]` (`>= 2.9.0`)**: JSON Web Token decoding and signature verification for Supabase Auth tokens.

### 2.4 Ingestion & Document Processing
- **`pymupdf` (`>= 1.24.0`, imported as `fitz`)**: Fast PDF text extraction, metadata parsing, and page rendering.
- **`python-docx` (`>= 1.1.0`)**: Extracts text, paragraph blocks, and tables from Word documents (`.docx`).
- **`python-pptx` (`>= 0.6.23`)**: Extracts slide text and shape notes from PowerPoint presentations (`.pptx`).
- **`trafilatura` (`>= 1.12.0`)**: Web content scraper that cleans boilerplate, ads, and navigation to extract pure readable body text from portfolio pages.
- **`beautifulsoup4` (`>= 4.12.0`)**: HTML DOM parser for custom web scraping and metadata extraction.
- **`pillow` (`>= 10.4.0`)**: Python Imaging Library for pre-processing scanned documents before OCR.

### 2.5 AI & Semantic Search
- **`chromadb` (`>= 0.5.0`)**: Open-source embedded vector database storing dense embeddings in `./chroma_data`.
- **`httpx` (`>= 0.27.0`)**: Asynchronous HTTP client communicating with Ollama (`/api/generate`, `/api/embeddings`).

### 2.6 Background Tasks & Queues
- **`celery` (`>= 5.4.0`)**: Distributed task queue for asynchronous ingestion jobs.
- **`redis` (`>= 5.0.0`)**: Redis Python client acting as broker and result backend for Celery.
  *(Note: When Redis is not available, Skill Passport automatically falls back to an in-memory background worker).*

### 2.7 Testing
- **`pytest` (`>= 8.3.0`)**: Test runner and fixture framework.
- **`pytest-asyncio` (`>= 0.24.0`)**: Asynchronous test runner for testing FastAPI async endpoints.

---

## 3. Frontend Dependencies (`package.json`)

### 3.1 Core Framework
- **`next` (`16.3.6`)**: React framework featuring the App Router, server-side rendering, Turbopack bundler, and API rewrites.
- **`react` & `react-dom` (`19.2.8`)**: Next-generation React library with concurrent features and server actions.
- **`typescript` (`^5.0.0`)**: Static typing and type contracts.

### 3.2 UI, Styling & Animation
- **`tailwindcss` (`^4.0.0`)**: Utility-first CSS engine configured with modern CSS-first `@theme` syntax.
- **`@tailwindcss/postcss` (`^4.0.0`)**: PostCSS plugin for Tailwind CSS v4.
- **`lucide-react` (`^1.48.0`)**: Modern, tree-shakeable SVG icon collection for UI navigation and status indicators.
- **`lottie-web` (`^5.13.0`)**: Vector animation renderer for loading states and celebratory cues.

### 3.3 Supabase Client
- **`@supabase/supabase-js` (`^2.117.3`)**: Isomorphic JavaScript client for Supabase authentication and realtime subscriptions.
- **`@supabase/ssr` (`^0.12.7`)**: Helper library for cookie-based authentication across Next.js Server Components, Client Components, and Middleware.

---

## 4. Local Model Dependencies (Ollama)

Skill Passport requires the following local models pulled into Ollama:

| Model Name | Size | Context Window | Purpose |
| :--- | :--- | :--- | :--- |
| **`qwen3:8b`** | 4.9 GB | 8192 tokens | Primary work analyzer, skill extraction, and JSON reasoning engine. |
| **`nomic-embed-text`**| 274 MB | 2048 tokens | High-performance embedding model for dense vector search in ChromaDB. |
| **`glm-ocr`** *(optional)*| 1.8 GB | - | Specialized vision model for complex multi-column OCR documents. |

---

## 5. Dependency Audit & Security Policy

All dependencies are regularly audited using:
```bash
# Frontend audit
npm audit

# Backend audit
pip-audit # (if installed) or safety check
```
Security vulnerabilities with available patches are resolved immediately according to the [Security Policy](../../SECURITY.md).
