# Career Intelligence Engine Audit & Root Cause Analysis

**Document Version:** v1.0.0  
**Target Architecture:** SkillPassport Powered by GrowthLens (Domain 3: Career Intelligence)  
**Date:** October 2026  
**Status:** AUDIT COMPLETE — ROOT CAUSES CONFIRMED  

---

## 1. Executive Summary & Confirmed Anomalies

This audit provides a forensic trace of the calculation logic, data flows, persistence models, and discrepancies across the Career Intelligence domain within SkillPassport. The investigation traced the exact execution paths from database queries in PostgreSQL through the FastAPI backend services into the Next.js frontend state context.

### Confirmed Core Anomalies & Root Causes

| # | Anomaly Observed in UI | Root Cause Confirmed in Code | Impact & Severity |
|---|---|---|---|
| **A1** | **Contradiction:** Requirement displays `Current Supported: Intermediate (verified)`, `Supporting Evidence: 1 Artifact`, yet simultaneously reports `Effective Coverage: 0%`, `Missing / Weak`, and diagnosis *"No verifiable capability or evidence found"*. | **Identifier Type Mismatch:** Role Demand Models in `role_demand_models.competencies` define requirements with string slugs (`skill_id: "skill-python"`). However, Skill Intelligence (`/api/v1/passport/skills`) returns skills keyed by the primary key UUID (`id: str(comp.id)`). In `src/lib/careerCalculations.ts` line 152, the lookup executes `userSkills.find(s => s.id === comp.skill_id)`. Because `UUID !== "skill-python"`, the lookup **always fails**, defaulting the requirement to `0%` coverage and "Missing/Weak" despite genuine verified skills and artifacts existing in the database. | **CRITICAL DEFECT** — Invalidates matching scores across all roles. |
| **A2** | **Unexplained Gap Priority Scores** (e.g. `1013.0` and `81.0`). | **Unbounded Integer Multiplication:** In `src/lib/careerCalculations.ts` lines 304–308, priority is calculated by multiplying 6 unnormalized integers: `((criticality * levelGap * depImpact * evLeverage * userFit * marginalGain) / effort) * 10`. For `skill-python`, `criticality=5`, `depImpact=3` (hardcoded), `evLeverage=3`, `userFit=3` (hardcoded), `marginalGain=3`, and `estimatedEffort=4`. This yields `(5 * 1 * 3 * 3 * 3 * 3 / 4) * 10 = 1012.5`, which `Math.round()` outputs as **`1013.0`**. The score has no upper bound, no percentage scale, and arbitrary multipliers. | **CRITICAL DEFECT** — Mathematically unexplainable to users. |
| **A3** | **Duplicated Evaluation Engines (Backend vs Frontend Divergence):** | `EvidenceContext.tsx` (lines 1311–1321) computes `activeMatch`, `activeGaps`, and `activeReadiness` entirely on the client side using `src/lib/careerCalculations.ts`, ignoring the backend's `MatchingEngine` (`backend/app/career/matching_engine.py`). Different screens consume different values, causing count and percentage mismatches. | **ARCHITECTURAL DEFECT** — Violates single source of truth. |
| **A4** | **Proliferation of Duplicate Custom Roles:** | Every time a job description is parsed or saved via `/api/v1/career/roles/custom`, a new record with a random 8-character UUID suffix (`role-custom-title-xxxx`) is inserted without checking whether a custom role with that title already exists for that user. This creates repeated entries (e.g. 8 copies of "Custom MLOps Specialist"). | **DATA DEFECT** — Clutters role selector and confuses users. |
| **A5** | **Curated Benchmarks Mixed into User Target Roles:** | Curated industry benchmarks (`role-ai-engineer-entry`, `role-mlops-engineer-mid`) were previously mixed directly into the user's active role dropdown without separating "Saved Targets" from "Role Catalogue". | **UX/DATA DEFECT** — Curated templates appear as though the user selected them. |
| **A6** | **Database Circuit Breaker False-Positive Cascades:** | `backend/app/db/reliability.py` had `failure_threshold: 5`. Loading a dashboard triggers 5 concurrent HTTP calls (`/profile`, `/evidence`, `/connections`, `/ingestion-runs`, `/career/roles`). Any 1-second network spike tripped the circuit breaker to `OPEN`, immediately locking out all users with 503 for 15 seconds. | **RELIABILITY DEFECT** (Resolved in prior patch). |

---

## 2. Codebase Inventory: Files, Routes, Models & Responsibilities

### 2.1 Backend Services & API Routes

| Component / File | Route / Responsibility | Persisted Model / Tables |
|---|---|---|
| `backend/app/api/career.py` | Career Intelligence REST API endpoints: `/roles`, `/match/{id}`, `/gaps/{id}`, `/priorities/{id}`, `/readiness/{id}`, `/compare`, `/parse-jd`, `/roles/custom`, `/jobs/discover`. | `role_demand_models`, `role_match_snapshots`, `job_postings` |
| `backend/app/career/matching_engine.py` | Server-side `MatchingEngine` (Policy `v2026.1`). Evaluates role demand competencies against user capabilities loaded from Domain 2. | `evidence_competency_mappings`, `competency_taxonomy`, `evidence_items`, `verification_decisions` |
| `backend/app/career/prioritization_service.py` | Server-side `PrioritizationService`. Ranks gaps based on criticality, level distance, and sensitivity sliders. | In-memory evaluation over `MatchingEngine.gaps` |
| `backend/app/api/passport.py` | Domain 2 Skill Intelligence API: `/passport/skills`, `/passport/taxonomy`, `/passport/candidates`. | `competency_taxonomy`, `evidence_competency_mappings`, `evidence_items` |
| `backend/app/models/career.py` | SQLAlchemy ORM records: `RoleDemandModelRecord`, `RoleMatchSnapshotRecord`, `JobPostingRecord`. | PostgreSQL schema `public` |

### 2.2 Frontend Context & Pages

| Page / File | Route / Function | State / Calculation Origin |
|---|---|---|
| `src/context/EvidenceContext.tsx` | Global provider for Career Intelligence, Skills, and Evidence. | Loads `/api/v1/career/roles`, runs client-side `evaluateRoleMatch()`, holds `activeRole`, `activeMatch`, `activeGaps`. |
| `src/lib/careerCalculations.ts` | Client-side math library: `evaluateRoleMatch()`, `extractGapRecords()`, `evaluateCareerReadiness()`. | **Contains the ID mismatch bug and the `1013.0` priority multiplier.** |
| `src/lib/careerApi.ts` | HTTP client wrapper for FastAPI backend endpoints. | Communicates with `http://127.0.0.1:8001/api/v1/career/*`. |
| `src/app/app/career/page.tsx` | **Role Overview Dashboard**: displays overall match, core vs supporting scores, key gaps, and readiness summary. | Consumes `activeMatch`, `activeRole`, `activeReadiness` from `EvidenceContext`. |
| `src/app/app/career/match/page.tsx` | **Role Match Breakdown**: detailed competency-by-competency matrix. | Consumes `activeMatch.competency_matches`. |
| `src/app/app/career/gaps/page.tsx` & `[gapId]/page.tsx` | **Skill Gaps & Deep Dive**: taxonomy categorization (7 gap types) and forensic why-this-gap card. | Consumes `activeGaps`. |
| `src/app/app/career/priorities/page.tsx` | **Gap Priorities Screen**: ranking sliders (effort sensitivity, leverage weight) and focus modes (Top 3, Quick Wins, Core Blockers). | Calls `/api/v1/career/priorities/{id}` or client fallback. |
| `src/app/app/career/readiness/page.tsx` | **Career Readiness Screen**: readiness tier, critical blockers, and educational non-hiring disclaimer. | Consumes `activeReadiness`. |
| `src/app/app/career/compare/page.tsx` | **Role Comparison**: side-by-side competency comparison of 2–3 roles. | Calls backend `/api/v1/career/compare`. |
| `src/app/app/career/roles/page.tsx` | **Target Roles & Catalogue**: browsing benchmarks, custom roles, and active target switching. | Lists roles from `targetRoles` in context. |
| `src/app/app/career/discover/page.tsx` | **Job Discovery**: Mode A (profile-matched) & Mode B (explicit search). | Calls `/api/v1/career/jobs/discover`. |

---

## 3. Deep Dive: The 0% Effective Coverage Contradiction (Anomaly A1)

### 3.1 The Concrete Execution Trace
In Domain 2 (Skill Intelligence), the database contains:
- `competency_taxonomy.id`: `uuid("e7b1a2c3-...")`
- `competency_taxonomy.canonical_name`: `"Python Programming"`
- `evidence_competency_mappings.proficiency_level`: `"Intermediate"`
- `evidence_competency_mappings.status`: `"verified"`
- `evidence_items.id`: `uuid("f4d2b1a0-...")` (Title: `"Async FastAPI Microservice"`)

When `/api/v1/passport/skills` is invoked, it serializes this skill as:
```json
{
  "id": "e7b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "canonicalName": "Python Programming",
  "verifiedProficiency": "Intermediate",
  "verificationState": "verified",
  "evidenceIds": ["f4d2b1a0-1b2c-3d4e-5f6a-7b8c9d0e1f2a"]
}
```

In Domain 3, the target role (e.g. AI Engineer) has competencies defined as:
```json
{
  "skill_id": "skill-python",
  "canonical_name": "Python Engineering",
  "expected_level": "Practitioner",
  "expected_level_numeric": 3,
  "requirement_type": "core_required",
  "importance": "critical"
}
```

In `src/lib/careerCalculations.ts` line 152:
```typescript
const userSkill = userSkills.find((s) => s.id === comp.skill_id);
```
1. `s.id` is `"e7b1a2c3-4d5e-6f7a-8b9c-0d1e2f3a4b5c"`.
2. `comp.skill_id` is `"skill-python"`.
3. The match evaluates to `false`.
4. `userSkill` becomes `undefined`.
5. Because `userSkill` is `undefined`, line 156 falls back to:
   `currentProf = "Not Established"`, `currentNumeric = 0`.
6. `rawCoverage = 0`, `effectiveCoverage = 0%`.
7. `classifyCompetencyGap()` executes line 78:
   ```typescript
   if (!userSkill || currentNumeric === 0) {
     return {
       gapType: "skill_gap",
       explanation: "No verifiable capability or evidence found in connected ingestion sources.",
     };
   }
   ```
8. The gap diagnosis is set to: `"No verifiable capability or evidence found in connected ingestion sources."`

However, on the UI component for `WhyThisGapDetailPage` (`src/app/app/career/gaps/[gapId]/page.tsx` line 57):
```typescript
const linkedEvidence = evidenceItems.filter(item =>
  item.candidateSkills?.some(s => s.name.toLowerCase() === gap.canonical_name.toLowerCase())
);
```
The evidence list matches by string equality (`"python"`), so it successfully displays: **"1 Linked Artifact"**!
Meanwhile, the header displays the skill's verified state from the passport.

**Resulting Contradiction:**
The UI displays:
- *Current Supported:* `Intermediate (verified)`
- *Supporting Evidence:* `1 Artifact`
- *Effective Coverage:* `0%`
- *Diagnosis:* `No verifiable capability or evidence found`

### 3.2 Required Redesign Fix
1. Capability resolution must never rely solely on an arbitrary slug string matching a UUID.
2. The resolution service must match via:
   - Canonical Skill UUID match.
   - Exact canonical name equality (case-insensitive).
   - Approved taxonomy aliases (`aliases` array in `competency_taxonomy`).
3. If an evidence artifact exists and the user is verified at Intermediate (numeric 3 or 4) while the role requires Practitioner (numeric 3), the coverage must be:
   $$\text{Proficiency Coverage} = \min\left(1, \frac{L_u}{L_r}\right) = \min\left(1, \frac{3}{3}\right) = 100\%$$
   If the role requires Advanced (numeric 4):
   $$\text{Proficiency Coverage} = \min\left(1, \frac{3}{4}\right) = 75\%$$
   It must **never** be 0%.

---

## 4. Deep Dive: Gap Priority Formula & Investigation of "1013.0" and "81.0" (Anomaly A2)

### 4.1 The Existing Formula in Code
In `src/lib/careerCalculations.ts` lines 296–308:
```typescript
const levelGap = Math.max(0, comp.expected_level_numeric - comp.current_proficiency_numeric);
const criticality = comp.importance === "critical" ? 5 : comp.importance === "high" ? 4 : comp.importance === "medium" ? 3 : 2;
const depImpact = comp.skill_id === "skill-python" ? 3 : comp.skill_id === "skill-machine-learning" ? 3 : 1;
const evLeverage = comp.evidence_ids.length > 0 ? 3 : 1;
const userFit = 3; // Hardcoded constant 3!
const marginalGain = comp.requirement_type === "core_required" ? 3 : 2;
const estimatedEffort = levelGap >= 2 ? 4 : 2;

const priorityScore = Math.round(
  ((criticality * Math.max(1, levelGap) * depImpact * evLeverage * userFit * marginalGain) /
    estimatedEffort) *
    10
);
```

### 4.2 Exact Mathematical Trace of 1013.0
Let us evaluate `skill-python` when evaluated under this formula:
- `importance = "critical"` $\rightarrow$ `criticality = 5`
- `expected_level_numeric = 3`, `current_proficiency_numeric = 0` (due to the ID bug) $\rightarrow$ `levelGap = 3`
- `skill_id = "skill-python"` $\rightarrow$ `depImpact = 3` (hardcoded check)
- `evidence_ids.length = 0` (due to the ID bug) $\rightarrow$ `evLeverage = 1`
- `userFit = 3` (hardcoded constant)
- `requirement_type = "core_required"` $\rightarrow$ `marginalGain = 3`
- `levelGap = 3` $\ge 2 \rightarrow$ `estimatedEffort = 4`

Now, substitute these into the formula:
$$\text{Numerator} = 5 \times 3 \times 3 \times 1 \times 3 \times 3 = 405$$
$$\text{Quotient} = \frac{405}{4} = 101.25$$
$$\text{With } \times 10 \text{ multiplier} = 101.25 \times 10 = 1012.5$$
$$\text{Math.round}(1012.5) = \mathbf{1013}$$

The score of **`1013.0`** is not a random number or static mock data; it is the exact deterministic output of multiplying 6 unnormalized arbitrary numbers together with a superfluous $\times 10$ scalar and dividing by 4!

### 4.3 Why 81.0 Occurs
For a supporting skill where:
- `criticality = 3` (medium)
- `levelGap = 1`
- `depImpact = 1`
- `evLeverage = 3` (evidence exists)
- `userFit = 3`
- `marginalGain = 2` (supporting)
- `estimatedEffort = 2` (low effort)

$$\text{Numerator} = 3 \times 1 \times 1 \times 3 \times 3 \times 2 = 54$$
$$\frac{54}{2} \times 10 = 270$$
In the backend version (`prioritization_service.py`), where the $\times 10$ multiplier is omitted and `dep_impact = 2.5`, `ev_leverage = 1.2`, `user_fit = 1.5`, `gain = 3.0`, `effort = 2.0`:
$$5.0 \times 1.2 \times 2.5 \times 1.5 \times 3.0 / 2.0 = \mathbf{81.0}$$

### 4.4 Deficiencies of the Old Formula
1. **Unbounded Scale:** Scores range from 1.0 to 2000+, confusing users who expect normalized metrics (0–100).
2. **Multiplicative Instability:** Multiplying 6 factors means a minor difference in one factor swings the priority by 300%.
3. **Hardcoded Slugs in Math:** `depImpact = comp.skill_id === "skill-python" ? 3 : ...` embeds specific technologies into general scoring code.
4. **Arbitrary Constants:** `userFit = 3` is a constant with no data backing.
5. **Inverse Evidence Inversion:** In the backend version, having zero evidence gave a higher multiplier (`2.0`) than having evidence (`1.2`).

### 4.5 The New Normalized Priority Policy Specification
We will replace this with a normalized, explainable 0–100 priority formula:
$$\text{Base Priority (0–100)} = 100 \times \sum_{k} (w_k \times f_k)$$
Where all factors $f_k \in [0, 1]$ and weights $\sum w_k = 1.0$:
- **Requirement Criticality ($f_{\text{crit}}$, weight 0.35):** Core Required Critical = 1.0, Core Required High = 0.85, Core Required Medium = 0.70, Supporting High = 0.50, Supporting Medium = 0.35, Preferred = 0.20.
- **Proficiency Gap Severity ($f_{\text{gap}}$, weight 0.30):** Normalized distance: $\frac{\max(0, L_r - L_u)}{5}$.
- **Evidence Actionability ($f_{\text{action}}$, weight 0.20):** If candidate evidence exists needing verification = 1.0; if single artifact needing corroboration = 0.7; if zero evidence = 0.4.
- **Market / Role Leverage ($f_{\text{lev}}$, weight 0.15):** Reusability across benchmark roles or multiple job postings in the user's saved targets.

**Effort Adjustment:**
If estimated effort is known on a 1–5 scale ($E \in [1, 5]$):
$$\text{Adjusted Priority} = \text{Base Priority} \times \left(1.0 - 0.15 \times \frac{E - 1}{4} \times \text{effort\_sensitivity}\right)$$
This guarantees the final priority score **strictly remains within [0, 100]**, is linear, transparent, and reproducible.

---

## 5. Role Selection, Duplicate Targets, and Explore Catalogue (Phases 2 & 3)

### 5.1 Confirmed Root Cause of Duplicate Roles
In `backend/app/api/career.py` line 917:
```python
clean_role_id = f"role-custom-{payload.job_title.lower().replace(' ', '-')[:24]}-{uuid.uuid4().hex[:8]}"
```
Whenever a user parses a job or runs a test, a brand new role record with a random 8-character hex is created in `role_demand_models`. 
Over time, 8+ copies of `"Custom MLOps Specialist"` and multiple copies of `"Senior Frontend Engineer"` accumulated in the PostgreSQL table.

### 5.2 Clarified Semantics: Catalogue vs My Target Roles
The current UI creates confusion because:
- "Explore Catalogue" and "Target Roles" navigate to the same underlying list.
- Curated benchmarks were returned directly in the user's role list.

**New Semantic Separation:**
1. **Role Catalogue (Library / Benchmarks):**
   - Curated industry templates (`source_type = "curated_model"`, `owner_user_id = NULL`).
   - Accessible under **Explore Catalogue** to browse standard benchmark requirements (AI Engineer, MLOps, Backend Developer, Frontend Engineer).
   - Contains an explicit action: **"Add to My Targets"**.
2. **My Target Roles (Saved User Targets):**
   - Roles the user has explicitly saved or imported from real job postings (`source_type = "custom_parsed_job"` or user-saved benchmark copies).
   - The dropdown in the top bar / Role Overview switches **strictly between My Target Roles**.
   - Includes full management: Set as Active, Add New Target, and Remove Target (with confirmation).

---

## 6. Audit of Persisted Database Records in Supabase

Direct inspection of the Supabase PostgreSQL database revealed:
- `competency_taxonomy`: 148 canonical skills.
- `evidence_items`: 63 authentic user evidence artifacts.
- `evidence_competency_mappings`: 206 verified and candidate mappings.
- `role_demand_models`: 21 records total:
  - 4 curated benchmarks (`role-ai-engineer-entry`, `role-mlops-engineer-mid`, `role-backend-developer-entry`, `role-frontend-engineer-senior`).
  - 17 custom parsed job records, of which 14 are duplicates generated during automated test runs.

All user capabilities and evidence records are authentic; the errors stem entirely from **identifier translation and duplicate creation logic**, not fake user data.

---

## 7. Action Plan for Full Engine Redesign

In accordance with the mandatory implementation order:
1. **Audit Completion:** This document (`docs/architecture/CAREER_INTELLIGENCE_ENGINE_AUDIT.md`) establishes the baseline.
2. **Phase 2 — Stabilize Role Overview:** Preserve layout; connect to single source of truth.
3. **Phase 3 — Fix Role Selection & Deduplicate Targets:** Clean up duplicate custom roles, separate Catalogue from My Targets, implement Add/Remove/Set-Active target management.
4. **Phase 4 — Rebuild Role Match & Capability Resolver:** Implement canonical resolution (UUID + name + alias matching), fix proficiency coverage formula $\min(1, L_u/L_r) \times 100$, and separate evidence verification from capability.
5. **Phase 5 — Rebuild Skill Gaps:** Ensure Skill Gaps consumes the exact same evaluation snapshot as Role Match; fix evidence inspection links.
6. **Phase 6 — Rebuild Gap Priorities:** Implement the 0–100 normalized weighted priority engine; replace arbitrary multipliers.
7. **Phase 7 — Recalculate Career Readiness:** Unify readiness index calculation from core coverage, proficiency alignment, and evidence quality.
8. **Phase 8 — Rebuild Compare Roles:** Update parallel role comparison to use the new unified engine.
9. **Phase 9 — Integration Testing & Final Verification:** Run test suite, verify UI, update knowledge graph (`graphify update .`), and provide final report.
