# Career Intelligence — Cost-Aware Job Discovery Addendum

> **Purpose:** Add two job-discovery modes to Career Intelligence while minimizing API usage and preventing unnecessary spending across TheirStack, JSearch, and Fantastic.jobs.
>
> **Implementation rule:** Treat this document as an addition to `CAREER_INTELLIGENCE_ANTIGRAVITY_BUILD_SPEC.md`. Read both documents. Preserve the existing application architecture and UI; inspect the repository before changing anything. Do not replace existing functionality or create a parallel Career Intelligence system.

## 1. User-facing feature

Add a clear **Discover Jobs** workflow with two modes:

### Mode A — Find jobs that fit my skills
Use the user's existing Skill Intelligence profile to search for relevant real job postings.

Inputs available from existing domains may include:
- Canonical skill ID/name
- Proficiency or maturity level
- Confidence score
- Verification/review status
- Supporting evidence references
- Recent usage or demonstrated application, if already available
- User's preferred location, remote preference, seniority, employment type, and other saved filters, if available

Use a bounded, configurable set of the user's strongest relevant skills to construct a compact search query. Do not put every skill, every evidence item, or the user's entire history into a provider request. Prefer high-confidence, evidence-supported skills, but do not infer a desired career solely from the current skills: show the user that this mode discovers roles related to their current profile.

Return the best relevant roles/jobs ranked locally using transparent criteria such as skill overlap, seniority, location, recency, and evidence-supported capability. The ranking must not imply that the user is qualified merely because keywords overlap.

### Mode B — Find jobs for a role I choose
Allow the user to enter a target role in free text (for example, “Machine Learning Engineer”, “MLOps Engineer”, “AI Engineer”, or any other role). Let them optionally select location, remote/on-site, seniority, job type, and posting recency.

Search for that explicit role even if it does not match their current skill profile. The chosen role must take precedence over inferred role suggestions. Do not force the user to select only from a hard-coded role catalogue.

### Results and actions
For each real job posting, display available fields returned by the provider:
- Job title and company
- Location / remote status, if supplied
- Posting date or freshness information, if supplied
- Employment type and salary range, if supplied
- Short description or relevant description excerpt
- Original job URL / application URL
- Data source/provider and retrieval timestamp
- Skills/requirements extracted from the job description, with source spans where feasible
- Match summary against the user's Skill Intelligence profile
- Clear labels for verified match, partial/low-confidence match, evidence gap, and missing demonstrated skill, using the shared matching engine

Provide loading, no-results, stale-cache, provider-unavailable, and partial-results states. Never invent jobs, application URLs, salary data, posting dates, skills, or API success.

## 2. API-credit minimization is a primary requirement

The application has credentials for three providers:
- TheirStack
- JSearch (RapidAPI)
- Fantastic.jobs

Do not automatically call all three for each search. Implement a **provider adapter layer** and a **cost-aware search orchestrator** that chooses one suitable provider for the request, deduplicates results, and only uses a fallback when necessary and permitted by configured budget policy.

### Mandatory cost rules
1. **Inspect the current provider plans, endpoint docs, configured keys, and actual response/usage metadata before selecting defaults.** Do not hard-code guessed prices, quotas, or “one credit returns all jobs” assumptions.
2. The current public documentation indicates that TheirStack Job Search API credits are charged per job returned, not simply per request. A larger result limit can therefore cost more. Confirm the user's actual plan and endpoint behavior before implementation.
3. JSearch documentation indicates that each page (up to 10 results) consumes one request credit; `num_pages` may multiply usage. Start with one page unless the user explicitly asks for more and the configured budget allows it.
4. Fantastic.jobs documentation distinguishes API request quotas from job credits, and its active job endpoints can consume a job credit per job returned. Confirm the account's actual plan, endpoint, and quota headers before choosing a limit.
5. Never assume any provider can return unlimited/all matching jobs for one credit. “Show all results” means show all results already returned or safely fetched within the user's plan and budget. Fetch more pages only if allowed and transparently show whether more results are available.
6. Keep result limits configurable through server-side configuration. Use a conservative default for initial searches (for example, one JSearch page or a small bounded result count for providers billed per returned job), then tune based on the user's actual plans.
7. Do not fetch job descriptions or enrich every result with additional paid calls unless the response lacks information essential to the user's requested workflow. Prefer description fields already included in the search response.
8. Do not perform provider searches during ordinary page render, navigation, re-renders, or repeated component mounting. Search only after a user action, or through a deliberate scheduled ingestion process that is explicitly configured.
9. Prevent duplicate concurrent requests for the same user/query/filter combination. Use in-flight request coalescing, query normalization, and a server-side cache.
10. Do not retry non-transient errors. Use bounded exponential backoff with jitter for transient network failures and HTTP 429/5xx responses, respecting `Retry-After` and provider rate limits. Do not fan out retries to all providers.
11. A provider timeout or quota error must not crash the app or erase valid cached results. Display cached results when available, label them as cached/stale, and explain when fresh search failed.
12. Do not silently switch to a paid fallback after a credit/quota error. Fallback must follow explicit provider priority, availability, and budget policy. Log which provider was selected and why, without logging API keys or sensitive user data.
13. Store API keys only in server-side environment variables or the existing secrets manager. Never expose keys to React/browser code, client logs, URLs, or committed files.

### Suggested configuration
Use the repository's existing configuration style. If none exists, add server-side variables with names similar to:

- `THEIRSTACK_API_KEY`
- `JSEARCH_API_KEY`
- `JSEARCH_API_HOST`
- `FANTASTIC_JOBS_API_KEY`
- `JOB_SEARCH_PRIMARY_PROVIDER` (one configured provider)
- `JOB_SEARCH_FALLBACK_PROVIDER` (optional)
- `JOB_SEARCH_MAX_RESULTS` (conservative default)
- `JOB_SEARCH_CACHE_TTL_MINUTES`
- `JOB_SEARCH_ENABLE_FALLBACK`
- `JOB_SEARCH_MONTHLY_BUDGET` or provider-specific budget limits, if usage can be measured reliably

Never require all three keys to be configured. A provider without a valid key must be marked unavailable and skipped. Do not invent a budget balance if provider usage/billing cannot be queried; expose “usage unknown” instead.

## 3. Provider selection strategy

Build a provider registry with a consistent internal interface, for example:

- `searchJobs(query, filters, limit, cursor?)`
- `normalizeJob(providerPayload)`
- `getUsageMetadata(response)` when available
- `classifyProviderError(error)`
- `getProviderCapabilities()`

Normalize each provider's results into one internal job schema while preserving source-specific IDs and metadata.

### Selection algorithm
1. Normalize the requested role or derive a compact query from the user's strongest relevant skills.
2. Normalize filters and create a stable cache key from mode, normalized query, location, seniority, remote/job type, freshness window, and relevant user-profile version.
3. Return a fresh cached result if one exists. Do not call any provider.
4. If an identical request is already running, await/share that request rather than starting another paid call.
5. Select one eligible configured provider using explicit server-side priority and known capabilities/cost policy.
6. Request only the configured initial result count. Do not request extra pages automatically.
7. Normalize, validate, deduplicate, and cache returned jobs.
8. Rank locally against the user's skill profile. Ranking and match calculation must not require another job-search API call.
9. If the first provider fails, serve stale cached data when available. Only use a configured fallback for eligible errors and only if the fallback is enabled and budget policy permits it.
10. If results are too few, offer a **Load more / Broaden search** action. Do not automatically fan out to all three APIs.
11. When the user explicitly requests broader coverage, explain that additional provider calls or pages may consume additional quota/credits when that is known. Respect the configured limit and provider's pagination mechanism.

Keep the provider priority configurable; do not permanently assume one provider is cheapest or best until the user's actual plans, quotas, and required data fields are verified. A reasonable initial policy is one primary provider per search and one optional fallback—not parallel calls to all providers.

## 4. Skill-based discovery query

For Mode A:
1. Read the existing Skill Intelligence data through the established backend/service; do not create a second skill inventory.
2. Exclude deleted, rejected, or otherwise disallowed skill claims according to existing Trust & Governance rules.
3. Rank usable skills using existing confidence, proficiency, evidence, and recency/usage signals where those fields genuinely exist.
4. Select a configurable, bounded number of strong relevant skills (initially 5–10 at most, but do not assume all 10 are equally valuable).
5. Construct a concise search query using role/title synonyms and a small number of high-signal skills. Avoid a huge boolean query that reduces recall or consumes excess resources.
6. Search jobs using one selected provider.
7. Rank the returned jobs locally with a deterministic, explainable score. Show the factors that contributed to relevance.
8. If no useful skills/evidence exist, do not invent a profile. Prompt the user to select a target role instead.

Skill-based discovery and target-role discovery are separate modes. Switching modes must not overwrite the user's chosen target role unless the user explicitly sets the discovered role as their active target.

## 5. Target-role workflow and Career Intelligence integration

A discovered job is not automatically the same thing as a canonical role model. Keep these concepts separate:

- **Job posting:** one employer's real, time-specific vacancy.
- **Role demand model:** a normalized, versioned set of skill requirements extracted from a posting or curated role template.
- **User capability profile:** the existing Skill Intelligence/Trust & Governance data.
- **Match result:** a versioned comparison between one capability-profile version and one role-demand-model version.

For a selected job:
1. Let the user open the original listing.
2. Extract skill requirements from the available job description using the existing taxonomy and extraction approach.
3. Preserve the source description/span for each extracted requirement where possible.
4. Let the user review/edit extracted requirements before saving them as a custom role model, particularly when extraction confidence is low.
5. Only recalculate the target-role match after the role model is saved or the user explicitly chooses “Compare my skills.”
6. Do not automatically make every discovered job the user's active target role.
7. Reuse the same match/gap/prioritization/readiness services used by the other Career Intelligence screens. Do not implement separate formulas for job cards and role pages.
8. Keep the future Learn & Grow handoff as structured output (canonical skill IDs, target proficiency, gap type, priority, explanation, and supporting role requirement). Do not build Learn & Grow as part of this change.

## 6. Normalized job record and deduplication

Reuse existing database tables if appropriate; do not create duplicate tables without inspection. The normalized record should support fields equivalent to:

- `id` (internal ID)
- `provider`
- `provider_job_id`
- `canonical_dedupe_key`
- `title`
- `company_name`
- `company_domain` (nullable)
- `location_text` (nullable)
- `remote_status` (nullable)
- `employment_type` (nullable)
- `seniority` (nullable)
- `salary_min`, `salary_max`, `salary_currency`, `salary_period` (nullable)
- `description` or stored description reference (respect provider terms and retention policies)
- `job_url` / `apply_url`
- `posted_at` (nullable)
- `first_seen_at`, `last_seen_at`, `retrieved_at`
- `is_stale` / status where applicable
- `raw_source_metadata` (minimal, sanitized, and policy-compliant)
- `content_hash` for detecting changes

Deduplicate first by provider + provider job ID, then by a conservative cross-provider key using normalized title, company/domain, location, and canonical URL. Avoid merging two distinct openings solely because their titles match. Preserve all provider-source associations for a merged listing and retain the best original application URL.

Respect each provider's terms for storage, caching, redistribution, and retention. Do not persist full descriptions indefinitely unless permitted by the provider's terms and the application's policy.

## 7. API and service boundaries

Follow existing backend conventions. The exact route names must match the repository's framework and routing style; do not blindly create these names if equivalent routes already exist.

Suggested operations:
- `POST /career-intelligence/jobs/discover` — mode + filters; calls orchestrator only after explicit user action.
- `GET /career-intelligence/jobs` — retrieve saved/cached jobs without a provider call.
- `GET /career-intelligence/jobs/{job_id}` — retrieve normalized details.
- `POST /career-intelligence/jobs/{job_id}/analyze` — extract/refresh requirements only when requested and permitted.
- `POST /career-intelligence/jobs/{job_id}/compare` — compare selected job requirements with current user skills.
- `GET /career-intelligence/jobs/search-status` — optional provider configuration/health status, never expose secrets.

Validate requests, enforce user authorization, apply server-side limits, and return a predictable response with results, source, cache status, timestamp, `has_more`, and safe error information. Do not leak raw provider errors, credentials, or stack traces to the client.

## 8. UI requirements

Add a discovery entry point within the existing Career Intelligence UI without redesigning the domain.

The UI should make the two modes obvious:
- **Find jobs matching my skills**
- **Search for a role I want**

Include a role text input for the second mode, optional filters, and a single explicit **Find Jobs** action. Show the number of results, provider/source label where appropriate, retrieval time, and cached/stale status.

For Mode A, show a brief explanation such as “Based on your strongest evidence-supported skills,” and let the user inspect which skills influenced the search. Do not expose private evidence content in provider queries.

Each job card should support:
- View original job
- View extracted requirements
- Compare my skills
- Save/track this job if existing persistence patterns support it
- Load more, only when supported and explicitly clicked

Do not show fabricated sample jobs as real results. Development fixtures must be clearly marked and never appear as live production data.

## 9. Failure handling and operational safety

Handle at least:
- Missing provider key
- Provider timeout
- HTTP 401/403 authentication/configuration error
- HTTP 429 rate limit/quota
- HTTP 5xx
- Malformed provider response
- Empty results
- Cache/database temporarily unavailable
- Partial provider result set
- Duplicate jobs
- Expired/closed listing when the provider exposes that information

Do not use endless retries. Do not turn an API failure into a successful empty search. Return cached data if appropriate, label it honestly, and let the user retry manually. Use circuit breaking or a short cooldown after repeated provider failures so the application does not repeatedly spend credits on a failing provider.

Record privacy-safe operational metrics:
- Provider selected
- Request success/failure category
- Result count
- Cache hit/miss
- Known request/credit usage when provided
- Latency
- Fallback reason

Never log API keys, authorization headers, or full private user evidence.

## 10. Acceptance tests — feature is incomplete until these pass

1. A user can search for a role they explicitly enter, even if the role differs from their current skills.
2. A user can discover roles from their existing skills without entering a target role.
3. Skill-based search uses a bounded selection of valid Skill Intelligence skills and never submits the entire evidence history to a provider.
4. A normal search calls at most one provider.
5. A fresh cache hit makes zero provider calls.
6. Two identical concurrent searches share one provider request.
7. Pagination/additional-provider fallback occurs only after an explicit action or an approved, documented fallback condition.
8. The application does not assume “all jobs for one credit”; result limits respect actual provider billing semantics and configured budgets.
9. Provider credentials are server-only.
10. Jobs returned by different providers are deduplicated conservatively without discarding valid distinct vacancies.
11. The UI labels provider, cache status, freshness, and partial results accurately.
12. A provider quota failure does not crash Career Intelligence or silently trigger all other paid providers.
13. Cached data remains viewable during provider/database outages when available, with an honest stale-data label.
14. Job requirement extraction preserves source provenance and allows review before creating a custom role model.
15. All match/gap/readiness calculations reuse the existing shared engine and remain consistent across Career Intelligence pages.
16. Existing domains, authentication, evidence records, and database policies remain intact.

## 11. Required implementation report

When done, report:
- Files/components/services added or changed
- Existing services and tables reused
- Which provider is configured as primary and why, based on verified plan/capability details
- Provider keys/configuration that are missing (names only; never print key values)
- Actual result/credit/request limits configured
- Cache TTL and fallback policy
- Tests run and results
- Any unresolved provider terms, quota visibility, or integration limitations

Do not claim that API usage is minimized or that a provider is working unless code and tests demonstrate it. Do not fabricate API credentials, quotas, pricing, job data, or successful requests.
