# GrowthLens Security & Privacy Architecture

This document outlines the security architecture, data governance policies, threat modeling, and privacy safeguards implemented across the GrowthLens platform.

---

## 1. Security Philosophy & Invariants

Talent intelligence systems process highly sensitive personnel data, including engineering work logs, performance evaluations, and career trajectory indicators. GrowthLens is designed around four inviolable security invariants:

1. **Zero External Data Exfiltration for AI Inference**: Code diffs, Jira issues, and competency scores are **never** transmitted to public cloud LLMs (e.g. OpenAI or Anthropic). All generative synthesis and embedding generation run strictly within private compute perimeters via Ollama and ChromaDB.
2. **Absolute Multi-Tenant & Employee Isolation**: Employees can only view their own evidence, trajectories, and recommendations. Cross-employee querying is strictly restricted to authorized direct managers and organization administrators.
3. **Immutable Audit Trails**: The What-If Counterfactual Simulator evaluates prospective interventions in transient memory. Production evidence and trajectory tables cannot be overwritten or mutated by simulation runs.
4. **Automated Secret & PII Scrubbing**: All data passing into logs, vector stores, or LLM prompt contexts is sanitized through an automated redaction filter to eliminate accidentally committed secrets, tokens, and credentials.

---

## 2. Authentication & Authorization Architecture

GrowthLens uses a multi-layered security model combining Supabase Auth with FastAPI role-based access control (RBAC).

```mermaid
flowchart TD
    Client[Next.js Client / User] -->|1. Request with Bearer JWT| Edge[FastAPI Auth Gateway]
    Edge -->|2. Verify JWT & Expiry| SupaAuth[Supabase Auth Service]
    SupaAuth -->>|3. Valid Claims (sub, role)| Edge
    Edge -->|4. Resolve Context & Role| RBAC{RBAC Policy Engine}
    
    RBAC -->|Employee Role| EmpCheck{Target Employee == Auth User?}
    EmpCheck -->|Yes| PermitEmp[Grant Access]
    EmpCheck -->|No| DenyEmp[403 Cross-Employee Access Denied]

    RBAC -->|Manager Role| MgrCheck{Auth User is Direct Manager?}
    MgrCheck -->|Yes| PermitMgr[Grant Access to Team View]
    MgrCheck -->|No| DenyMgr[403 Unauthorized Hierarchy]

    RBAC -->|Org Admin| PermitAdmin[Grant Full Organization Scope]
```

### 2.1 Role-Based Access Control (RBAC) Matrix

| Resource / Endpoint | Employee Role | Manager Role | Organization Admin |
|---|---|---|---|
| **Own Evidence & Trajectories** | Full Read | Full Read | Full Read |
| **Peer Evidence & Trajectories** | Denied (403) | Direct Reports Only | Full Read |
| **What-If Counterfactual Simulator** | Own Profile Only | Direct Reports Only | Full Read |
| **Personal Recommendations** | Full Read / Write | Read Only | Full Read |
| **Team Skill Heatmap** | Denied (403) | Managed Teams Only | All Teams |
| **Peer Benchmark (Anonymized)** | View Aggregated Percentile | View Aggregated Percentile | Full Access |
| **Model Retrain & Evaluation** | Denied (403) | Denied (403) | Authorized |

---

## 3. Automated Secret Redaction & Log Sanitization

Software engineering commits and Jira tickets frequently contain accidental credential leaks. GrowthLens protects its logs and vector indexes via `backend/core/security.py`.

### 3.1 Regex Detection Patterns
The redaction engine continuously intercepts data flows using high-precision regular expressions:

```python
# Token detection patterns
_SECRET_VALUE_PATTERNS = [
    re.compile(r"^(eyJ[A-Za-z0-9_-]+)"),          # Supabase / Auth JWTs
    re.compile(r"^(ghp_[A-Za-z0-9]{36})"),        # GitHub Personal Access Tokens
    re.compile(r"^(gho_[A-Za-z0-9]{36})"),        # GitHub OAuth Tokens
    re.compile(r"^(xox[bpsa]-[A-Za-z0-9-]+)"),    # Slack App & Bot Tokens
    re.compile(r"(AKIA[0-9A-Z]{16})"),            # AWS Access Key IDs
    re.compile(r"(sk_live_[0-9a-zA-Z]{24})"),     # Stripe Live Keys
]
```

### 3.2 Secure Logging Formatter
Logs emitted by backend workers are serialized as structured JSON via `SecureJsonFormatter`. Any field matching sensitive keywords (`token`, `secret`, `key`, `password`, `credential`, `authorization`) is automatically truncated to 4 characters or replaced with `***REDACTED***`.

---

## 4. On-Premise AI Safety & Data Sovereignty

| Threat Vector | Cloud LLM Architecture (Vulnerable) | GrowthLens Architecture (Secure) |
|---|---|---|
| **Intellectual Property Leakage** | Proprietary code diffs sent to third-party endpoints | **Zero external calls**: Local Ollama `qwen3:8b` instance |
| **Data Retention Exploitation** | Vendor retains prompts for foundational model retraining | Weights remain immutable on local private host |
| **Vector Index Poisoning** | Multi-tenant cloud vector database vulnerabilities | ChromaDB SQLite vector store isolated per deployment |
| **API Availability & Rate Limits** | External outages break performance reviews | Fully operational offline on local enterprise hardware |

---

## 5. PostgreSQL Row-Level Security (RLS)

Database queries in production utilize PostgreSQL Row-Level Security policies to enforce tenant boundaries directly at the database engine layer:

```sql
-- Enforce employee evidence isolation
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can only view their own evidence"
ON public.evidence
FOR SELECT
USING (auth.uid() = employee_id);

-- Enforce manager team access
CREATE POLICY "Managers can view team evidence"
ON public.evidence
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.manager_id = auth.uid()
    AND teams.id = evidence.team_id
  )
);
```

---

## 6. Responsible Disclosure & Security Contacts

If you discover a potential security vulnerability within GrowthLens, please report it to the core engineering team:

- **Security Lead**: Shubham Pokale (`shubhampokale700@gmail.com`)
- **Systems Architect**: Siddhesh Birewar (`siddhesh.birewar@gmail.com`)
- **Response SLA**: Initial triage within 24 hours; patch deployment within 72 hours.
