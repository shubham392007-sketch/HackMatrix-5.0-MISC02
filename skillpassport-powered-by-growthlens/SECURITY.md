# Security Policy — Skill Passport

Skill Passport treats user work evidence, proprietary code snippets, repository credentials, and verified skill records with enterprise-grade confidentiality and data protection standards.

---

## 1. Supported Versions

| Version | Status | Security Support |
| :--- | :--- | :--- |
| `0.1.x` / Current Main | Active Development | Supported (critical & high patches) |
| `< 0.1.0` | Deprecated | Unsupported |

---

## 2. Reporting a Vulnerability

If you discover a security vulnerability within Skill Passport, please do not open a public issue. Instead, follow responsible disclosure:

1. Send an email with technical details, steps to reproduce, and attack impact to `security@growthlens.io` (or the repository maintainers).
2. Include the affected file paths, endpoints, and reproduction payloads where applicable.
3. Allow up to 48 hours for an initial triage response before escalating.
4. Maintain confidentiality until a CVE or fix patch is released.

---

## 3. Core Security Architecture & Safeguards

### 3.1 Credential Encryption at Rest
- **Mechanism**: External connection credentials (e.g., GitHub Personal Access Tokens, Jira API Tokens) are encrypted using AES-128-CBC with HMAC authentication via **Fernet** (`cryptography.fernet.Fernet`).
- **Key Isolation**: The encryption key is sourced strictly via `CONNECTOR_CREDENTIAL_ENCRYPTION_KEY` from secure environment variables.
- **Masking**: Decrypted tokens are never returned via public REST API endpoints or serialized into frontend states. Responses only return token status (`"is_configured": true`) or masked prefixes.

### 3.2 Tenant Isolation & Authorization
- **Ownership Verification**: All evidence items, documents, sync runs, and analysis records enforce strict user ownership (`owner_user_id`).
- **Dependency Guard**: API route controllers resolve the authenticated user from the verified Supabase JWT bearer token (`get_current_user`). Any attempt to query or mutate another user's evidence yields an immediate HTTP 403 Forbidden or 404 Not Found.
- **Zero Cross-Tenant Leakage**: Vector indices (ChromaDB) and PostgreSQL queries always apply `owner_user_id` filter conditions.

### 3.3 Server-Side Request Forgery (SSRF) Protection
- **Portfolio & Web Scraping**: The web crawler service validates all submitted URLs before initiating HTTP requests:
  - Disallows internal loops (`localhost`, `127.0.0.1`, `::1`).
  - Disallows private IPv4/IPv6 ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`).
  - Enforces HTTPS/HTTP scheme restrictions and standard web ports.

### 3.4 Prompt Injection Quarantine
- **Threat Vector**: Ingested documents (PDFs, markdown files, PR descriptions) may contain adversarial system prompts intended to trick the LLM into claiming unwarranted skills.
- **Defense Gate**: The `PromptInjectionDetector` evaluates incoming text blocks against known evasion patterns before passing context to Ollama / Qwen3 8B. Suspect excerpts are quarantined into the `prompt_injection_findings` table and flagged for human review.

### 3.5 Hallucination & Citation Verification Guard
- **Deterministic Check**: Skills extracted by AI models must pass the 7-stage `HallucinationGuard` verification suite.
- **Verbatim Check**: If an AI model claims a specific technical task or skill, it must produce verbatim citation spans referencing the source evidence text. Fabricated claims are dropped immediately.

### 3.6 Database Protection & Connection Throttling
- **Exhaustion Prevention**: SQLAlchemy connection pooling is strictly bounded (`db_pool_size=8`, `max_overflow=0`) with pre-ping validation to prevent Postgres connection exhaustion.
- **Circuit Breaker**: An in-memory circuit breaker trips after 5 consecutive transient database errors, isolating downstream traffic for 15 seconds to allow upstream database recovery.
