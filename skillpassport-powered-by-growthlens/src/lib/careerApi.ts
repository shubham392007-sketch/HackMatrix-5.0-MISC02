/**
 * SkillPassport Domain: Career Intelligence & Cost-Aware Job Discovery API Client
 * Connects frontend UI components to the FastAPI Career Intelligence endpoints.
 */

import { supabase } from "@/lib/supabase/client";
import {
  RoleDemandModel,
  RoleMatchResult,
  GapRecord,
  CareerReadinessAssessment,
  GapExplanation,
  GapExplanationsResponse,
  ProviderStatusInfo,
  JobProviderStatus,
  NormalizedJob,
  JobDiscoveryResponse,
  JobDiscoveryParams,
} from "@/types/career";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = typeof window !== "undefined" ? "/api/v1" : `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function invalidateCareerAuthToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    invalidateCareerAuthToken();
  });
}

async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    const now = Date.now();
    if (cachedToken && now < tokenExpiresAt) {
      return {
        Authorization: `Bearer ${cachedToken}`,
      };
    }
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token;
    if (!token && process.env.NODE_ENV === "development" && typeof window !== "undefined") {
      if (sessionStorage.getItem("sp_session_auth") === "true" || localStorage.getItem("sp_dev_auth") === "true") {
        token = "sp_demo_vernit";
      }
    }
    if (token) {
      cachedToken = token;
      const expiresAt = data.session?.expires_at ? data.session.expires_at * 1000 : now + 60000;
      tokenExpiresAt = Math.min(now + 60000, expiresAt - 5000);
      return {
        Authorization: `Bearer ${token}`,
      };
    }
  } catch (e) {
    console.warn("Could not retrieve Supabase session:", e);
  }
  return {};
}

// In-flight GET request deduplication
const inFlightRequests = new Map<string, Promise<Response>>();
const _nativeFetch = globalThis.fetch.bind(globalThis);

async function fetchWithDedupe(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = init?.method?.toUpperCase() || "GET";
  if (method === "GET") {
    const key = typeof input === "string" ? input : (input as URL).toString();
    const existing = inFlightRequests.get(key);
    if (existing) {
      return existing.then((r) => r.clone());
    }
    const reqPromise = _nativeFetch(input, init).finally(() => {
      inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, reqPromise);
    return reqPromise.then((r) => r.clone());
  }
  return _nativeFetch(input, init);
}

// ==============================================================================
// TYPES
// ==============================================================================

export type {
  ProviderStatusInfo,
  JobProviderStatus,
  NormalizedJob,
  JobDiscoveryResponse,
  JobDiscoveryParams,
};

// ==============================================================================
// CAREER API METHODS
// ==============================================================================

/**
 * 1. Check Job Search Provider Configuration Status
 */
export async function getJobProviderStatus(): Promise<JobProviderStatus> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/jobs/status`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch provider status: ${res.status}`);
  }
  return res.json();
}

/**
 * 2. Discover Real Jobs (Mode A or Mode B)
 */
export async function discoverJobs(params: JobDiscoveryParams): Promise<JobDiscoveryResponse> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/jobs/discover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message =
      typeof errorBody.detail === "string"
        ? errorBody.detail
        : errorBody.detail?.message ||
          errorBody.message ||
          `Job discovery request failed (${res.status})`;
    throw new Error(message);
  }
  return res.json();
}

/**
 * 3. Retrieve normalized job details
 */
export async function getJobDetails(jobId: string): Promise<NormalizedJob> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/jobs/${encodeURIComponent(jobId)}`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch job details: ${res.status}`);
  }
  return res.json();
}

/**
 * 4. Extract skill requirements from job posting
 */
export async function extractJobRequirements(jobId: string): Promise<{
  job_id: string;
  title: string;
  company_name: string;
  extracted_competencies: any[];
  extracted_count: number;
}> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/jobs/${encodeURIComponent(jobId)}/extract`, {
    method: "POST",
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to extract requirements: ${res.status}`);
  }
  return res.json();
}

/**
 * 5. List Curated and Custom Role Demand Models
 */
export async function listRoles(params?: {
  category?: string;
  seniority?: string;
}): Promise<RoleDemandModel[]> {
  const authHeaders = await getAuthHeaders();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001");
  const url = new URL(`${API_BASE}/career/roles`, baseUrl);
  if (params?.category) url.searchParams.set("category", params.category);
  if (params?.seniority) url.searchParams.set("seniority", params.seniority);

  const res = await fetchWithDedupe(url.toString(), {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to list roles: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : (data.roles || []);
}

/**
 * 6. Get a specific Role Demand Model by ID
 */
export async function getRoleDemandModel(roleId: string): Promise<RoleDemandModel> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/roles/${encodeURIComponent(roleId)}`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get role demand model: ${res.status}`);
  }
  return res.json();
}

/**
 * 7. Get user's active target role
 */
export async function getUserTargetRole(): Promise<{
  has_target?: boolean;
  user_id?: string;
  target_role_id: string | null;
  target_role_version: string | null;
  role_title: string | null;
  selected_at?: string;
  updated_at?: string;
}> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/target`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get user target role: ${res.status}`);
  }
  return res.json();
}

/**
 * 8. Set user's active target role
 */
export async function setUserTargetRole(
  targetRoleId: string,
  roleTitle: string,
  targetRoleVersion: string = "v2026.1"
): Promise<{ status: string; target_role_id: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/target`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      target_role_id: targetRoleId,
      target_role_version: targetRoleVersion,
      role_title: roleTitle,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to set user target role: ${res.status}`);
  }
  return res.json();
}

/**
 * 9. Calculate / fetch Role Match
 */
export async function getRoleMatch(roleId: string): Promise<RoleMatchResult> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/match/${encodeURIComponent(roleId)}`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get role match: ${res.status}`);
  }
  return res.json();
}

/**
 * 10. Get Skill Gaps for role
 */
export async function getSkillGaps(roleId: string): Promise<{
  role_id: string;
  role_title: string;
  total_gaps: number;
  gaps: GapRecord[];
}> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/gaps/${encodeURIComponent(roleId)}`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get skill gaps: ${res.status}`);
  }
  return res.json();
}

/**
 * 10b. Get Evidence-Grounded Gap Explanations via Ollama
 */
export async function getGapExplanations(
  roleId: string,
  forceRefresh: boolean = false
): Promise<GapExplanationsResponse> {
  const authHeaders = await getAuthHeaders();
  const url = `${API_BASE}/career/gaps/${encodeURIComponent(roleId)}/explanations${
    forceRefresh ? "?force_refresh=true" : ""
  }`;
  const res = await _nativeFetch(url, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get gap explanations: ${res.status}`);
  }
  return res.json();
}

/**
 * 11. Prioritize Gaps with dynamic inputs
 */
export async function getGapPriorities(
  roleId: string,
  options?: {
    focus_mode?: "default" | "top3" | "quick_wins" | "core_blockers";
    effort_sensitivity?: number;
    leverage_weight?: number;
  }
): Promise<{
  role_id: string;
  role_title: string;
  focus_mode: string;
  total_ranked: number;
  ranked_gaps: GapRecord[];
}> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/priorities/${encodeURIComponent(roleId)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({
      focus_mode: options?.focus_mode || "default",
      effort_sensitivity: options?.effort_sensitivity ?? 1.0,
      leverage_weight: options?.leverage_weight ?? 1.0,
    }),
  });
  if (!res.ok) {
    throw new Error(`Failed to get gap priorities: ${res.status}`);
  }
  return res.json();
}

/**
 * 12. Get Career Readiness Assessment
 */
export async function getCareerReadiness(roleId: string): Promise<CareerReadinessAssessment> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/career/readiness/${encodeURIComponent(roleId)}`, {
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    throw new Error(`Failed to get career readiness: ${res.status}`);
  }
  return res.json();
}

/**
 * 13. Compare 2 or 3 Roles
 */
export async function compareRoles(roleIds: string[]): Promise<{
  comparison_timestamp: string;
  formula_version: string;
  roles: Array<{
    role: RoleDemandModel;
    match: RoleMatchResult;
    readiness: CareerReadinessAssessment;
    total_gaps: number;
    critical_blockers_count: number;
  }>;
}> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/compare`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify({ role_ids: roleIds }),
  });
  if (!res.ok) {
    throw new Error(`Failed to compare roles: ${res.status}`);
  }
  return res.json();
}

/**
 * 14. Parse raw Job Description text
 */
export async function parseJobDescription(payload: {
  raw_text: string;
  job_title?: string;
  company_name?: string;
  seniority?: string;
  context?: string;
  source_url?: string;
}): Promise<{
  job_title: string;
  company_name: string;
  seniority: string;
  context: string;
  source_url?: string;
  extracted_competencies: any[];
  total_extracted: number;
  provenance: string;
}> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/parse-jd`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to parse job description: ${res.status}`);
  }
  return res.json();
}

/**
 * 14b. Parse Job Description from URL (SSRF-safe)
 */
export async function parseJobDescriptionFromUrl(payload: {
  url: string;
  job_title?: string;
  company_name?: string;
  seniority?: string;
  context?: string;
}): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/parse-jd/url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to parse job description from URL: ${res.status}`);
  }
  return res.json();
}

/**
 * 15. Save Custom Role Demand Model
 */
export async function saveCustomRole(payload: {
  job_title: string;
  company_name?: string;
  seniority?: string;
  context?: string;
  source_url?: string;
  extracted_competencies: any[];
}): Promise<RoleDemandModel> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/roles/custom`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to save custom role: ${res.status}`);
  }
  return res.json();
}

/**
 * 16. Delete or deactivate a saved target role
 */
export async function deleteRole(roleId: string): Promise<{ status: string; message: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/roles/${encodeURIComponent(roleId)}`, {
    method: "DELETE",
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to delete role: ${res.status}`);
  }
  return res.json();
}

/**
 * 17. Save a catalogue benchmark template into My Target Roles
 */
export async function saveCatalogueRoleToTargets(roleId: string): Promise<{ status: string; role_id: string; title: string }> {
  const authHeaders = await getAuthHeaders();
  const res = await _nativeFetch(`${API_BASE}/career/roles/${encodeURIComponent(roleId)}/save-to-targets`, {
    method: "POST",
    headers: { ...authHeaders },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to save catalogue role to targets: ${res.status}`);
  }
  return res.json();
}

/**
 * 18. Get Learn & Grow Structured Handoff
 */
export async function getLearnGrowHandoff(roleId: string): Promise<any> {
  const authHeaders = await getAuthHeaders();
  const res = await fetchWithDedupe(
    `${API_BASE}/career/learn-grow-handoff/${encodeURIComponent(roleId)}`,
    {
      headers: { ...authHeaders },
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to get learn & grow handoff: ${res.status}`);
  }
  return res.json();
}
