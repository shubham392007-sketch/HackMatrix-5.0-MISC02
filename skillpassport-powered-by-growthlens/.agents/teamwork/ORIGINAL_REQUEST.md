# Original User Request

## 2026-10-23T16:48:23Z

# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Coordinate three specialized agents (Agent A, Agent B, Agent C) to execute Career Intelligence, Skill Intelligence, Job Parser, and End-to-End Data Integration.
> Requested team: Three specialized agents (Agent A: Career Intelligence & Job Parser; Agent B: Skill Intelligence & Canonical Matching; Agent C: Data Platform & Learn & Grow Integration)

Career Intelligence, Skill Intelligence, Job Description Parser, and Learn & Grow end-to-end integration across Supabase PostgreSQL, ChromaDB, and frontend application layer.

Working directory: D:\HackMatrix-MISC02\HackMatrix-MISC02\skillpassport-powered-by-growthlens
Integrity mode: development

---

## Mandatory Execution Clarification

After approval, execute the implementation across all three agents. Do not stop at repository inspection, a plan, or a list of recommendations. Agree on shared contracts first, implement within the assigned ownership boundaries, integrate the changes, run the available tests, and fix failures introduced by the work.

Before changing the database, inspect the existing migration history, schema, foreign keys, RLS policies, generated types, and current data dependencies. Preserve existing user data and unrelated working changes. Use safe, reviewed migrations; never reset the database or drop existing tables as a shortcut.

Treat the canonical proficiency scale and confidence semantics as authoritative. Validate the scoring formula against them before implementation. Distinguish proficiency, confidence, verification, evidence quality, and assessment completeness. Unknown or unavailable assessments must not silently become zero or 100%.

The final acceptance report must distinguish unit tests, mocked integration tests, and live-service verification. Never claim that Supabase migrations, provider integrations, or end-to-end workflows passed unless they were actually executed and verified. Do not commit or push without explicit authorization.

---

## Team Structure & File Ownership

### Agent A — Career Intelligence, Role Discovery & Job Description Parser
- **Owns**: Career Intelligence pages and frontend flows (`src/app/app/career/*`), Role discovery and job search (`backend/app/career/*`, providers), Active target role selection, Role catalogue and target-role persistence, Role match, skill gap, priority, readiness and role comparison UI, Job Description Parser (`/app/career/job-parser`), Career Intelligence API integration and tests (`backend/tests/test_career_intelligence.py`).
- **Responsibilities**:
  - Remove default AI Engineer active role; present explicit "No active target role selected" state.
  - Implement functional Mode A (from Skill Passport) and Mode B (explicit search) job discovery across diverse career families (e.g., Cryptography, LLM Security, Forensics).
  - Implement full end-to-end Job Description Parser with SSRF-safe URL scraping, structured requirement extraction, and review/persistence.
  - Consume shared matching and data contracts without duplicating logic.

### Agent B — Skill Intelligence & Canonical Matching Engine
- **Owns**: Canonical skill taxonomy and aliases (`backend/app/taxonomy/*`, `CompetencyTaxonomy`), skill identity resolution, proficiency and confidence interpretation, requirement-to-user-skill matching, effective coverage, gap classification, gap priority, and career readiness calculations (`backend/app/career/matching_engine.py`, `prioritization_service.py`).
- **Responsibilities**:
  - Inspect the canonical proficiency scale and legacy mappings first before applying any formula. Do not hard-code `100 * min(Assessed Level / Required Level, 1)` unless the validated scale supports that arithmetic calculation; implement the mathematically and semantically correct normalized scoring function.
  - Disentangle proficiency, confidence, verification state, and evidence quality.
  - Implement system-calculated gap priorities based on role importance, proficiency gap size, and foundational prerequisites (removing user-facing sensitivity/leverage sliders).
  - Fix Career Readiness calculations when core requirements are missing or unassessable, distinguishing incomplete/provisional states from 0% failures.

### Agent C — Data Platform, Supabase, ChromaDB, Cache & Learn & Grow Integration
- **Owns**: Supabase schema, relationships, migrations, constraints, and indexes (`backend/alembic/versions/*`, `backend/app/models/*`), database access layer and repositories, RLS policies and user authorization, ChromaDB indexing and synchronization, cache keys and invalidation, and Career Intelligence -> Learn & Grow handoff contracts.
- **Responsibilities**:
  - Verify actual existing entities, migrations, and foreign keys before creating or modifying tables. Do not create artificial relationships or reset existing data just to satisfy an abstract diagram.
  - User-owned records must have proper ownership constraints, and a roadmap must reference the exact evaluation snapshot it was generated from.
  - Build and enforce the validated Career Intelligence evaluation snapshot contract consumed by Learn & Grow.
  - Ensure Learn & Grow generates roadmaps from real upstream gaps and persists its own steps, diagnostics, attempts, and project submissions durably.
  - Maintain ChromaDB and cache synchronization without creating duplicate sources of truth.

---

## Requirements

### R1. No Default Active Role
A new user or user without a selected target role must see "No active target role selected" on Discover Jobs and "You haven't selected a target role yet" in Change Role. Target selection must be explicitly user-driven, user-scoped, and persisted.

### R2. Real Job Discovery Across Career Families (Mode A & Mode B)
- **Mode A**: Queries real job postings using the user's persisted canonical skills, proficiency, and verification states from Skill Intelligence.
- **Mode B**: Allows independent exploration across distinct domains (e.g., Advanced Cryptography, LLM Security, Cybersecurity, CTF Development, Penetration Testing) without forcing software engineering defaults.

### R3. Effective Skill Coverage & Normalized Matching
Agent B must validate the canonical proficiency scale first, then implement effective skill coverage, calibrated confidence indicators, explicit match classifications (meets, partial, below, unverified, not found), and role requirement weights (core, important, supporting).

### R4. System-Calculated Gap Priorities
Calculate gap priorities automatically based on requirement criticality, proficiency gap, and prerequisite ordering. Remove sensitivity/leverage manual sliders while preserving user goal overrides separately from system scores.

### R5. Resilient Career Readiness
Component scores (Core Coverage, Proficiency Alignment, Evidence Traceability) must handle missing or unextracted requirements with explicit availability states (`PROVISIONAL`, `INSUFFICIENT_DATA`), never penalizing users with a false 0% when a parser or extraction is unavailable.

### R6. Complete Job Description Parser
Support pasted text and SSRF-safe URL extraction. Extract structured job metadata, responsibilities, and qualifications mapped to canonical taxonomy IDs with provenance spans. Provide a review screen before saving and comparing against the user's Skill Passport.

### R7. Connected Data Architecture & Security
Audit actual Supabase PostgreSQL relationships, foreign keys, and indexes. Enforce user-scoped RLS policies. Ensure roadmaps reference the exact upstream evaluation snapshot without artificial tables. Keep ChromaDB embeddings and cache keys synchronized with database records.

### R8. Career Intelligence → Learn & Grow Handoff
Establish a validated, versioned evaluation contract between Career Intelligence and Learn & Grow. Generate dynamic roadmaps from actual unmet gaps and persist Learn & Grow diagnostics, assessments, and mini-project submissions.

### R9. Cross-Domain Integrity & Preservation
Ensure Evidence Workspace -> AI Intelligence -> Trust Governance -> Skill Intelligence -> Career Intelligence -> Learn & Grow operates with consistent taxonomy, typed contracts, and zero fake or hardcoded mock scores.

---

## Acceptance Criteria

### Role Selection & Discovery
- [ ] New users see "No active target role selected" without AI Engineer default fallback.
- [ ] Mode A discovers jobs based on real Skill Passport skills; Mode B returns relevant security postings for security queries.
- [ ] Saved target roles activate, switch, and remove cleanly with database persistence.

### Matching & Readiness Engine
- [ ] Proficiency coverage formula validated against the project's canonical scale semantics.
- [ ] Confidence is displayed separately from assessed proficiency level.
- [ ] Missing core requirements yield a `PROVISIONAL` or `INSUFFICIENT_DATA` readiness status rather than a false 0%.
- [ ] Sensitivity and leverage sliders are removed from Gap Priorities; priorities are ordered by prerequisites and importance.

### Job Description Parser
- [ ] Valid job descriptions parse into structured requirements mapped to canonical skills with source spans.
- [ ] User review interface allows editing, confirming, and saving parsed job targets.
- [ ] URL ingestion blocks internal IPs and private networks (SSRF safe).

### Data Integrity & Learn & Grow
- [ ] Agent C audits and aligns real database entities, foreign keys, and ownership constraints without resetting data.
- [ ] Learning roadmaps reference the exact Career Intelligence evaluation snapshot from which they were generated.
- [ ] Learn & Grow dynamically generates steps and persists attempts/submissions without hardcoded mock data.
- [ ] All automated tests in `test_career_intelligence.py` and `test_learning_*.py` pass 100%.
- [ ] Frontend compiles with `npx tsc --noEmit` with 0 errors.
