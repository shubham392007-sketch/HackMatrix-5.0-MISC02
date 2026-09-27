# GrowthLens Qwen3 AI Security & Tenant Isolation

## 1. Threat Model & Mitigations
1. **Prompt Injection**:
   - *Risk*: Malicious text inside a commit message or Jira task attempts to alter competency scoring or extract confidential records.
   - *Mitigation*: Raw text is quarantined in `<RETRIEVED_EVIDENCE>`. Strict instructions forbid command execution. LLM Output Validator enforces Pydantic schemas.

2. **Cross-Tenant / Cross-Employee Leakage**:
   - *Risk*: Qwen cites an evidence record belonging to Employee A while justifying Employee B.
   - *Mitigation*: `LLMOutputValidator.validate_evidence_references` verifies every cited evidence ID against Supabase PostgreSQL filtered strictly by `employee_id`. Unauthenticated or mismatched IDs are immediately purged.

3. **Hallucinated Citations & Metrics**:
   - *Risk*: Model invents an evidence ID or overrides a Weibull decay rate.
   - *Mitigation*: Qwen is an explanation layer, not a calculation engine. Math is calculated deterministically before LLM invocation. Returned `evidence_refs` are filtered against candidate sets and database records.

4. **Credential Leakage**:
   - *Risk*: GitHub PATs, Jira API keys, or Supabase service keys accidentally forwarded to the LLM.
   - *Mitigation*: `backend.core.security.sanitize_for_llm` and `redact_dict` automatically strip PATs (`ghp_*`), JWTs (`eyJ*`), Slack tokens, and secrets from all payloads and logs.
