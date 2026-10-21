# Contributing to Skill Passport

Thank you for your interest in contributing to **Skill Passport**, an evidence-backed skill intelligence platform. This document outlines our engineering standards, development lifecycle, and contribution guidelines.

---

## 1. Engineering Philosophy

Skill Passport adheres to five core technical values:

1. **Evidence Primacy**: Every skill signal, proficiency score, or career insight must tie back to verifiable work artifacts (commits, PRs, documents, issue tracking). Synthetic data or unsubstantiated claims are strictly disallowed.
2. **Deterministic Governance**: AI model outputs must pass through multi-layer verification gates (Hallucination Guard, Output Validation, Quarantined Injection Detection) before writing canonical records.
3. **Defense in Depth**: External credentials (GitHub PATs, Jira API tokens) must remain encrypted at rest via Fernet and never leak into logs or client responses.
4. **Resilient Data Access**: Bounded connection pooling and active circuit breakers prevent downstream cascading failures against PostgreSQL.
5. **Architectural Separation**: Keep frontend presentation components strictly decoupled from domain business logic and database models.

---

## 2. Repository Structure

```text
skillpassport-powered-by-growthlens/
├── backend/
│   ├── alembic/              # Schema migration scripts and version history
│   ├── app/
│   │   ├── ai/               # AI inference, prompt templates, guards & extraction
│   │   ├── api/              # FastAPI route controllers and dependencies
│   │   ├── core/             # Configuration, logging, security, and exceptions
│   │   ├── db/               # Engine, connection pooling, and reliability breakers
│   │   ├── integrations/     # External provider adapters (GitHub, Jira)
│   │   ├── models/           # SQLAlchemy 2.0 ORM data models
│   │   ├── rag/              # ChromaDB vector index and retrieval logic
│   │   ├── schemas/          # Pydantic v2 validation contracts
│   │   ├── storage/          # Local vault and Supabase Storage adapters
│   │   └── workers/          # Celery background tasks & in-memory runner
│   └── tests/                # Pytest integration and unit test suite
├── docs/                     # Architectural, setup, and domain documentation
├── public/                   # Static browser assets and icons
├── src/
│   ├── app/                  # Next.js 16 App Router pages and layout trees
│   ├── components/           # Reusable React 19 UI components
│   ├── context/              # Client-side React context providers (EvidenceContext)
│   ├── lib/                  # Client utility functions, Supabase client, and API proxies
│   └── types/                # TypeScript interface and type definitions
├── .env.example              # Centralized environment variable template
├── package.json              # Node.js project manifest & scripts
├── requirements.txt          # Python dependencies
└── tsconfig.json             # TypeScript compiler configuration
```

---

## 3. Development Workflow

### 3.1 Branching Strategy

- `main`: Production-ready, deployable branch. Directly protected.
- `feature/<domain>-<short-description>`: New functional capabilities (e.g., `feature/evidence-jira-webhook`, `feature/ai-guard-citation-scoring`).
- `fix/<issue-description>`: Defect repairs and regression patches (e.g., `fix/connection-pool-timeout`).
- `docs/<topic>`: Documentation updates and architectural records.

### 3.2 Commit Conventions

We enforce [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <short imperative summary>

[optional body explaining context and rationale]

[optional footer referencing issue numbers]
```

- **Allowed types**: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`.
- **Allowed scopes**: `evidence`, `skills`, `ai`, `governance`, `db`, `auth`, `ui`, `deps`.

*Example*: `feat(governance): add verbatim citation checker to hallucination guard`

---

## 4. Code Standards & Style

### 4.1 Python (Backend)

- **Python Version**: 3.11+ or 3.12+.
- **Typing**: Strict type hints on all functions and class methods (`def analyze_work(evidence: EvidenceItem) -> WorkAnalysisResult:`).
- **ORM Standard**: Use SQLAlchemy 2.0 syntax (`select(Model).where(...)` instead of legacy `session.query(Model)`).
- **Session Management**: Always obtain DB sessions via FastAPI dependency injection (`db: Session = Depends(get_db)`) or context managers (`with SessionLocal() as db:`). Never leave naked connections open.
- **Pydantic**: Use Pydantic v2 `BaseModel` with explicit field definitions and type annotations.

### 4.2 TypeScript & React (Frontend)

- **Framework**: Next.js 16 (Turbopack) with React 19.
- **Components**: Functional components only. Distinguish Server Components from Client Components (`'use client'`).
- **Styling**: Tailwind CSS v4 design tokens. Avoid raw inline style blocks except for dynamic values (such as CSS custom property stagger delays).
- **State & Data Fetching**: Centralize evidence and governance state in `EvidenceContext.tsx`. Use typed API wrappers in `src/lib/evidenceApi.ts`.

---

## 5. Database Schema Changes

Do not modify existing database tables manually in the Supabase web dashboard.

1. Create or modify the SQLAlchemy model in `backend/app/models/`.
2. Generate an Alembic revision script:
   ```bash
   cd backend
   alembic revision --autogenerate -m "describe_schema_change"
   ```
3. Inspect the generated migration in `backend/alembic/versions/` for correctness.
4. Execute the migration locally:
   ```bash
   alembic upgrade head
   ```

---

## 6. Testing & Quality Verification

Before submitting a Pull Request, you must verify your changes against the test suite:

### 6.1 Backend Verification
```bash
# From repository root
python -m pytest skillpassport-powered-by-growthlens/backend/tests -v
```

### 6.2 Frontend Verification
```bash
# From repository root
cd skillpassport-powered-by-growthlens
npm run lint
npm run build
```

---

## 7. Pull Request Checklist

When opening a Pull Request, ensure the following criteria are met:

- [ ] New features include corresponding automated tests in `backend/tests/`.
- [ ] Code follows formatting guidelines (no unused imports, no print debugging).
- [ ] No secrets, tokens, private keys, or credentials committed.
- [ ] Documentation updated in `docs/` if domain architecture, APIs, or schemas changed.
- [ ] All existing test suites pass without regression.
