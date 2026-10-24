/**
 * SkillPassport Domain 1: Evidence Intelligence & Work Ingestion API Client
 * Connects frontend UI components to the production FastAPI backend.
 */

import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = typeof window !== "undefined" ? "/api/v1" : `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function invalidateAuthTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    invalidateAuthTokenCache();
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

export class DatabaseUnavailableError extends Error {
  public status = 503;
  public retryAfter: number;
  public details?: any;

  constructor(
    message: string = "Database service is temporarily recovering. Please try again shortly.",
    retryAfter: number = 15,
    details?: any
  ) {
    super(message);
    this.name = "DatabaseUnavailableError";
    this.retryAfter = retryAfter;
    this.details = details;
  }
}

async function fetchWithDedupe(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method || "GET").toUpperCase();
  let response: Response;
  if (method !== "GET") {
    response = await _nativeFetch(input, init);
  } else {
    const key = typeof input === "string" ? input : input.toString();
    if (inFlightRequests.has(key)) {
      const pending = inFlightRequests.get(key)!;
      return pending.then((res) => res.clone());
    }

    const promise = _nativeFetch(input, init).finally(() => {
      inFlightRequests.delete(key);
    });
    inFlightRequests.set(key, promise);
    response = await promise;
  }

  if (response.status === 401) {
    invalidateAuthTokenCache();
    if (typeof window !== "undefined") {
      try {
        supabase.auth.signOut({ scope: "local" }).catch(() => {});
      } catch {}
    }
  }

  if (response.status === 503) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 15;
    const cloned = response.clone();
    let message = "Database service is temporarily recovering. Please try again shortly.";
    let details: any = undefined;
    try {
      const body = await cloned.json();
      if (body?.error?.message) {
        message = body.error.message;
      }
      details = body?.error?.details;
    } catch {}
    throw new DatabaseUnavailableError(message, retryAfter, details);
  }

  return response.clone();
}

const fetch = fetchWithDedupe;

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

// User Profile & Onboarding
export async function getMyProfile() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/profile/me`, { headers });
  if (!res.ok) throw new Error("Failed to load user profile");
  return res.json();
}

export async function updateMyProfile(updates: {
  display_name?: string;
  preferred_name?: string;
  headline?: string;
  current_role?: string;
  job_title?: string;
  specialization?: string;
  department_or_team?: string;
  location?: string;
  work_preference?: string;
  experience_level?: string;
  professional_goal?: string;
  professional_summary?: string;
  portfolio_url?: string;
  linkedin_url?: string;
  github_url?: string;
  privacy_preferences?: Record<string, any>;
  app_settings?: Record<string, any>;
  onboarding_status?: string;
  onboarding_current_step?: number;
  onboarding_current_category?: string;
  github_skipped?: boolean;
  jira_skipped?: boolean;
  onboarding_completed_at?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/profile/me`, {
    method: "PATCH",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update user profile");
  return res.json();
}

export async function getMyOnboardingSummary() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/profile/me/onboarding`, { headers });
  if (!res.ok) throw new Error("Failed to load onboarding summary");
  return res.json();
}

// GitHub Connector APIs
export async function testGitHubToken(token: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/test`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "GitHub validation failed" }));
    throw new Error(err.detail || "Invalid GitHub token");
  }
  return res.json();
}

export async function connectGitHub(token: string, repositories: string[] = []) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ token, selected_repositories: repositories }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to connect GitHub" }));
    throw new Error(err.detail || "GitHub connection failed");
  }
  return res.json();
}

export async function listGitHubRepositories(
  page: number = 1,
  perPage: number = 30,
  allAccessible: boolean = false,
  search?: string
) {
  const headers = await getAuthHeaders();
  let url = `${API_BASE}/connections/github/repositories?page=${page}&per_page=${perPage}`;
  if (allAccessible) {
    url += "&all_accessible=true";
  }
  if (search && search.trim()) {
    url += `&search=${encodeURIComponent(search.trim())}`;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Failed to load GitHub repositories");
  return res.json();
}

export async function updateSelectedRepositories(repositories: any[]) {
  const headers = await getAuthHeaders();
  const formatted = repositories.map((r) =>
    typeof r === "string" ? { full_name: r, name: r, selected: true } : r
  );
  const res = await fetch(`${API_BASE}/connections/github/repositories`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ repositories: formatted }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update repositories" }));
    throw new Error(err.detail || "Repository update failed");
  }
  return res.json();
}

export async function selectSingleGitHubRepository(repositoryIdOrFullName: string) {
  const headers = await getAuthHeaders();
  const encoded = encodeURIComponent(repositoryIdOrFullName);
  const res = await fetch(`${API_BASE}/connections/github/repositories/${encoded}/select`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to select repository" }));
    throw new Error(err.detail || "Repository selection failed");
  }
  return res.json();
}

export async function removeSelectedGitHubRepository(repositoryIdOrFullName: string) {
  const headers = await getAuthHeaders();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const encoded = encodeURIComponent(repositoryIdOrFullName);
    const res = await fetch(`${API_BASE}/connections/github/repositories/${encoded}`, {
      method: "DELETE",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    clearTimeout(timeoutId);
  }

  // Fallback to POST /connections/github/repositories/remove with JSON body
  try {
    const postRes = await fetch(`${API_BASE}/connections/github/repositories/remove`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ repository: repositoryIdOrFullName }),
    });
    if (postRes.ok) {
      return await postRes.json();
    }
    const err = await postRes.json().catch(() => ({ detail: "Failed to remove repository" }));
    throw new Error(err.detail || "Failed to remove repository from active sources");
  } catch (e: any) {
    throw new Error(e.message || "Failed to remove repository from active sources");
  }
}

export async function triggerGitHubSync(repository?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/sync`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(repository ? { repository } : {}),
  });
  return res.json();
}

// GitHub Repository Language Analysis APIs
export interface LanguageBreakdownItem {
  name: string;
  bytes: number;
  percentage: number;
}

export interface RepositoryLanguagesResponse {
  repository_id: string;
  repository_name: string;
  sync_status: "success" | "empty" | "failed" | "not_synced" | string;
  total_bytes: number;
  retrieval_timestamp: string | null;
  languages: LanguageBreakdownItem[];
  error_summary: string | null;
}

export interface RepositoryReadmeSection {
  level: number;
  title: string;
  line_number?: number;
  char_offset?: number;
}

export interface RepositoryReadmeResponse {
  repository_id: string;
  repository_name: string;
  sync_status: "success" | "not_found" | "forbidden" | "rate_limited" | "failed" | "not_synced" | string;
  readme_path: string;
  blob_sha: string | null;
  html_url: string | null;
  content_hash: string | null;
  raw_content: string | null;
  sections: RepositoryReadmeSection[];
  retrieval_timestamp: string | null;
  error_summary: string | null;
}

export async function getRepositoryReadme(repositoryIdOrFullName: string): Promise<RepositoryReadmeResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/readme`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load repository README" }));
    throw new Error(err.detail || "Failed to load repository README");
  }
  return res.json();
}

export async function refreshRepositoryReadme(repositoryIdOrFullName: string): Promise<RepositoryReadmeResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/readme/refresh`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to refresh repository README" }));
    throw new Error(err.detail || "Failed to refresh repository README");
  }
  return res.json();
}


export interface RepositorySummaryItem {
  repository_id: string;
  repository_name: string;
  sync_status: string;
  total_bytes: number;
  detected_languages_count: number;
  top_language: string | null;
  last_retrieved_at: string | null;
  languages: LanguageBreakdownItem[];
  error_summary: string | null;
}

export interface GitHubLanguagesSummaryResponse {
  total_selected_repositories: number;
  repositories_with_languages: number;
  total_bytes: number;
  last_synced_at: string | null;
  aggregate_languages: LanguageBreakdownItem[];
  repositories: RepositorySummaryItem[];
}

export async function getGitHubLanguagesSummary(): Promise<GitHubLanguagesSummaryResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/languages/summary`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load language summary" }));
    throw new Error(err.detail || "Failed to load GitHub language summary");
  }
  return res.json();
}

export async function getRepositoryLanguages(repositoryIdOrFullName: string): Promise<RepositoryLanguagesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/languages`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to load repository languages" }));
    throw new Error(err.detail || "Failed to load repository languages");
  }
  return res.json();
}

export async function refreshRepositoryLanguages(repositoryIdOrFullName: string): Promise<RepositoryLanguagesResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/languages/refresh`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to refresh repository languages" }));
    throw new Error(err.detail || "Failed to refresh repository languages");
  }
  return res.json();
}

export interface DiagnosticCheckItem {
  id: number;
  name: string;
  category: string;
  status: "pass" | "warning" | "fail";
  message: string;
  details: Record<string, any>;
  duration_ms: number;
}

export interface GitHubDiagnosticResponse {
  overall_status: "pass" | "warning" | "fail";
  passed: number;
  warnings: number;
  failed: number;
  total: number;
  diagnostic_score_pct: number;
  timestamp: string;
  checks: DiagnosticCheckItem[];
}

export async function getGitHubRepositorySyncStatus(repositoryIdOrFullName: string) {
  const headers = await getAuthHeaders();
  const encoded = encodeURIComponent(repositoryIdOrFullName);
  const res = await fetch(`${API_BASE}/connections/github/repositories/${encoded}/sync-status`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to get repository sync status" }));
    throw new Error(err.detail || "Failed to get repository sync status");
  }
  return res.json();
}

export async function syncSingleGitHubRepository(repositoryIdOrFullName: string) {
  const headers = await getAuthHeaders();
  const encoded = encodeURIComponent(repositoryIdOrFullName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const res = await fetch(`${API_BASE}/connections/github/repositories/${encoded}/sync`, {
      method: "POST",
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Repository sync failed" }));
      throw new Error(err.detail || "Repository sync failed");
    }
    return await res.json();
  } catch (err: any) {
    // If the network or browser interrupted the fetch (e.g. Failed to fetch or connection dropped),
    // check if the backend has finished or is processing the sync!
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const statusOutcome = await getGitHubRepositorySyncStatus(repositoryIdOrFullName);
      if (statusOutcome && (statusOutcome.status === "completed" || (statusOutcome.candidate_skills_count && statusOutcome.candidate_skills_count > 0))) {
        return statusOutcome;
      }
    } catch (statusErr) {
      // Ignore status query error and rethrow original error
    }
    throw err;
  }
}

export async function analyzeGitHubRepository(repositoryIdOrFullName: string, limit: number = 5) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/analyze?limit=${limit}`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Repository AI analysis failed" }));
    throw new Error(err.detail || "Repository AI analysis failed");
  }
  return res.json();
}

export async function getGitHubDiagnostic(): Promise<GitHubDiagnosticResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/diagnostic`, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to run GitHub diagnostic" }));
    throw new Error(err.detail || "Failed to run GitHub diagnostic");
  }
  return res.json();
}

// Jira Connector APIs
export async function testJiraCredentials(site_url: string, email: string, api_token: string) {
  const headers = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/connections/jira/test`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ site_url, email, api_token }),
    });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error("Database or backend service is temporarily recovering from high load. Please try again shortly.");
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = err.detail || err.error?.message || err.message || `Jira validation failed (${res.status})`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error("Cannot reach the SkillPassport backend server. Please check that the local server is running at http://127.0.0.1:8001.");
    }
    throw err;
  }
}

export async function connectJira(site_url: string, email: string, api_token: string, selected_projects: string[] = []) {
  const headers = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/connections/jira`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ site_url, email, api_token, selected_projects }),
    });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error("Database or backend service is temporarily recovering from high load. Please try again shortly.");
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = err.detail || err.error?.message || err.message || `Failed to connect Jira (${res.status})`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error("Cannot reach the SkillPassport backend server. Please check that the local server is running at http://127.0.0.1:8001.");
    }
    throw err;
  }
}

export async function listJiraProjects() {
  const headers = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/connections/jira/projects`, {
      headers,
    });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error("Database or backend service is temporarily recovering from high load. Please try again shortly.");
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = err.detail || err.error?.message || err.message || `Failed to load Jira projects (${res.status})`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error("Cannot reach the SkillPassport backend server. Please check that the local server is running at http://127.0.0.1:8001.");
    }
    throw err;
  }
}

export async function updateSelectedJiraProjects(projects: any[]) {
  const headers = await getAuthHeaders();
  const formatted = projects.map((p) =>
    typeof p === "string" ? { key: p, name: p, selected: true } : p
  );
  try {
    const res = await fetch(`${API_BASE}/connections/jira/projects`, {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ projects: formatted }),
    });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error("Database or backend service is temporarily recovering from high load. Please try again shortly.");
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = err.detail || err.error?.message || err.message || `Project update failed (${res.status})`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error("Cannot reach the SkillPassport backend server. Please check that the local server is running at http://127.0.0.1:8001.");
    }
    throw err;
  }
}

export async function triggerJiraSync(project_key?: string) {
  const headers = await getAuthHeaders();
  try {
    const res = await fetch(`${API_BASE}/connections/jira/sync`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(project_key ? { project_key } : {}),
    });
    if (!res.ok) {
      if (res.status === 503) {
        throw new Error("Database or backend service is temporarily recovering from high load. Please try again shortly.");
      }
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      const msg = err.detail || err.error?.message || err.message || `Jira synchronization failed (${res.status})`;
      throw new Error(msg);
    }
    return res.json();
  } catch (err: any) {
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new Error("Cannot reach the SkillPassport backend server. Please check that the local server is running at http://127.0.0.1:8001.");
    }
    throw err;
  }
}

// Connected Sources Listing & Disconnect
export async function listConnectedSources() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections`, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to load connected sources");
  return res.json();
}

export async function disconnectSource(connectionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/${connectionId}`, {
    method: "DELETE",
    headers,
  });
  return res.json();
}

// Document Upload & Management
export async function uploadEvidenceDocument(file: File, category: string = "other", title?: string) {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (title) formData.append("title", title);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(err.detail || "Document upload failed");
  }
  return res.json();
}

export async function listUploadedDocuments(category?: string) {
  const headers = await getAuthHeaders();
  const url = category ? `${API_BASE}/documents?category=${category}` : `${API_BASE}/documents`;
  const res = await fetch(url, { headers });
  return res.json();
}

export async function getUploadedDocument(documentId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${documentId}`, { headers });
  return res.json();
}

export async function reprocessUploadedDocument(documentId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${documentId}/reprocess`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Reprocessing failed" }));
    throw new Error(err.detail || "Document reprocessing failed");
  }
  return res.json();
}

export async function deleteUploadedDocument(documentId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/documents/${documentId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete document" }));
    throw new Error(err.detail || "Failed to delete document");
  }
  return res.json();
}


// Website & Portfolio Scraper
export interface PortfolioPreviewParams {
  url: string;
  title?: string;
  related_project?: string;
  claimed_contribution?: string;
  is_collaborative?: boolean;
}

export interface PortfolioScrapeParams {
  url: string;
  title?: string;
  related_project?: string;
  claimed_contribution?: string;
  is_collaborative?: boolean;
  max_depth?: number;
  max_pages?: number;
}

export async function previewPortfolio(params: PortfolioPreviewParams) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/portfolio/preview`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Preview failed" }));
    throw new Error(err.detail || err.error?.message || "Website preview failed");
  }
  return res.json();
}

export async function scrapePortfolio(
  paramsOrUrl: string | PortfolioScrapeParams,
  title?: string
) {
  const headers = await getAuthHeaders();
  const payload =
    typeof paramsOrUrl === "string"
      ? { url: paramsOrUrl, title }
      : paramsOrUrl;

  const res = await fetch(`${API_BASE}/portfolio/scrape`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Scraping failed" }));
    throw new Error(err.detail || err.error?.message || "Website scraping failed");
  }
  return res.json();
}

// Evidence Library & Review
export async function listEvidenceItems(params: {
  category?: string;
  provider?: string;
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
} = {}) {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  if (params.category) query.set("category", params.category);
  if (params.provider) query.set("provider", params.provider);
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.page) query.set("page", params.page.toString());
  if (params.pageSize) query.set("page_size", params.pageSize.toString());

  const res = await fetch(`${API_BASE}/evidence?${query.toString()}`, { headers });
  return res.json();
}

export async function getEvidenceItem(evidenceId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}`, { headers });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed to fetch evidence item: ${res.statusText}`);
  }
  return res.json();
}

export async function reviewEvidenceItem(evidenceId: string, status: "verified" | "disputed" | "unreviewed", notes?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}/review`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ verification_status: status, reviewer_notes: notes }),
  });
  return res.json();
}

export async function searchEvidenceSemantics(query: string, category?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/evidence/search`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ query, category }),
  });
  return res.json();
}

export async function deleteEvidenceItem(evidenceId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/evidence/${evidenceId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to delete evidence item" }));
    throw new Error(err.detail || "Failed to delete evidence item");
  }
  return res.json();
}


// Ingestion Runs
export async function listIngestionRuns(status?: string) {
  const headers = await getAuthHeaders();
  const url = status ? `${API_BASE}/ingestion-runs?status_filter=${status}` : `${API_BASE}/ingestion-runs`;
  const res = await fetch(url, { headers });
  return res.json();
}

export async function retryIngestionRun(runId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ingestion-runs/${runId}/retry`, {
    method: "POST",
    headers,
  });
  return res.json();
}

// Health Check
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health/ready`);
    return await res.json();
  } catch (e) {
    return { status: "unreachable", error: String(e) };
  }
}

// ==========================================
// Domain 3: AI Intelligence & Trust Governance
// ==========================================

export async function getAIOverview() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/overview`, { headers });
  if (!res.ok) throw new Error("Failed to load AI overview");
  return res.json();
}

export async function getAIBootstrap() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/bootstrap`, { headers });
  if (!res.ok) throw new Error("Failed to load AI bootstrap data");
  return res.json();
}

export async function runWorkAnalysis(evidenceIds: string[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/analysis/runs`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ evidence_ids: evidenceIds }),
  });
  if (!res.ok) throw new Error("Failed to run work analysis");
  return res.json();
}

export async function listWorkAnalyses() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/analysis`, { headers });
  if (!res.ok) throw new Error("Failed to list work analyses");
  return res.json();
}

export async function runSkillExtraction(evidenceIds: string[]) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/skill-extraction/runs`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ evidence_ids: evidenceIds }),
  });
  if (!res.ok) throw new Error("Failed to run skill extraction");
  return res.json();
}

export async function listCandidateSkills() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/candidate-skills`, { headers });
  if (!res.ok) throw new Error("Failed to load candidate skills");
  return res.json();
}

export async function listEvidenceMappings() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/evidence-mappings`, { headers });
  if (!res.ok) throw new Error("Failed to load evidence mappings");
  return res.json();
}

export async function getEvidenceMapping(mappingId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/evidence-mappings/${mappingId}`, { headers });
  if (!res.ok) throw new Error("Failed to load evidence mapping");
  return res.json();
}

export async function reviewCandidateVerification(
  candidateId: string,
  action: "verify" | "reject" | "flag_insufficient" | "partially_support",
  rationale: string
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/verification/${candidateId}/review`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action, rationale }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Verification failed" }));
    throw new Error(err.detail || "Verification review failed");
  }
  return res.json();
}

export async function listVerificationRecords() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/verification`, { headers });
  if (!res.ok) throw new Error("Failed to load verification records");
  return res.json();
}

export async function evaluateGuardClaim(params: {
  evidence_id?: string | null;
  claim_text: string;
  supporting_excerpt?: string;
  claimed_skill_name?: string;
  claimed_level?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/guard/evaluate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Guard evaluation failed" }));
    throw new Error(err.detail || "Guard evaluation failed");
  }
  return res.json();
}

export async function listGuardResults() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/guard/results`, { headers });
  if (!res.ok) throw new Error("Failed to load guard results");
  return res.json();
}

export async function listOutputValidations() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/validation`, { headers });
  if (!res.ok) throw new Error("Failed to load output validations");
  return res.json();
}

export async function getConfidenceBreakdown() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/confidence`, { headers });
  if (!res.ok) throw new Error("Failed to load confidence breakdown");
  return res.json();
}

export async function listConflicts() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/conflicts`, { headers });
  if (!res.ok) throw new Error("Failed to load conflicts");
  return res.json();
}

export async function resolveConflict(
  conflictId: string,
  resolutionDecision: "accept_a" | "accept_b" | "merge" | "reject_both",
  resolutionNotes: string
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/conflicts/${conflictId}/resolve`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      resolution_decision: resolutionDecision,
      resolution_notes: resolutionNotes,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Conflict resolution failed" }));
    throw new Error(err.detail || "Conflict resolution failed");
  }
  return res.json();
}

export async function listReviewTasks() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/review-queue`, { headers });
  if (!res.ok) throw new Error("Failed to load review queue");
  return res.json();
}

export async function actionReviewTask(
  taskId: string,
  action: "approve" | "reject" | "escalate",
  notes: string
) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/review-queue/${taskId}/actions`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Review task action failed" }));
    throw new Error(err.detail || "Review task action failed");
  }
  return res.json();
}

export async function listPromptInjectionFindings() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/prompt-injection/findings`, { headers });
  if (!res.ok) throw new Error("Failed to load prompt injection findings");
  return res.json();
}

export async function listEvaluationSuites() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/evaluation/suites`, { headers });
  if (!res.ok) throw new Error("Failed to load evaluation suites");
  return res.json();
}

export async function runEvaluationSuite(suiteId: string = "suite-core-governance") {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/evaluation/runs`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ suite_id: suiteId }),
  });
  if (!res.ok) throw new Error("Failed to run evaluation suite");
  return res.json();
}

export async function getEvaluationRun(runId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/evaluation/runs/${runId}`, { headers });
  if (!res.ok) throw new Error("Failed to load evaluation run");
  return res.json();
}

export async function listAIAuditEvents() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/ai/audit`, { headers });
  if (!res.ok) throw new Error("Failed to load AI audit events");
  return res.json();
}

// ==============================================================================
// Domain 2: Skill Intelligence & Passport API
// ==============================================================================

export async function listPassportSkills(): Promise<{
  skills: any[];
  metrics: {
    total_skills: number;
    verified_count: number;
    candidate_count: number;
    coverage_rate: number;
    top_proficiency: string;
    avg_confidence: number;
  };
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/skills`, { headers });
  if (!res.ok) throw new Error("Failed to load passport skills");
  return res.json();
}

export async function getPassportSkill(skillId: string): Promise<{
  skill: any;
  rubric: Record<string, string>;
  related_skills: any[];
  prerequisite_skills: any[];
  evidence: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/skills/${skillId}`, { headers });
  if (!res.ok) throw new Error(`Failed to load passport skill ${skillId}`);
  return res.json();
}

export async function listPassportTaxonomy(): Promise<{
  categories: any[];
  competencies: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/taxonomy`, { headers });
  if (!res.ok) throw new Error("Failed to load passport taxonomy");
  return res.json();
}

export async function listPassportCandidates(): Promise<{
  candidates: any[];
  total: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/candidates`, { headers });
  if (!res.ok) throw new Error("Failed to load passport candidates");
  return res.json();
}

export interface CandidateReviewResponse {
  decision_id: string;
  mapping_id: string;
  previous_state: string;
  verification_state: string;
  rationale: string;
  created_at?: string | null;
  skill_name?: string | null;
  category?: string | null;
  proficiency_level?: string | null;
  confidence_score?: number | null;
  evidence_id?: string | null;
}

export async function reviewPassportCandidate(
  mappingId: string,
  action: "verify" | "reject" | "flag_insufficient",
  rationale: string
): Promise<CandidateReviewResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/candidates/${mappingId}/review`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ action, rationale }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Candidate review failed" }));
    throw new Error(err.detail || "Candidate review failed");
  }
  return res.json();
}

export async function getPassportCoverage(): Promise<{
  health_score: number;
  sufficient_count: number;
  incomplete_count: number;
  insufficient_count: number;
  conflicting_count: number;
  total_skills: number;
  coverage_items: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/coverage`, { headers });
  if (!res.ok) throw new Error("Failed to load passport coverage");
  return res.json();
}

export async function listPassportHistory(): Promise<{
  events: any[];
  total: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/passport/history`, { headers });
  if (!res.ok) throw new Error("Failed to load passport history");
  return res.json();
}

// ==============================================================================
// DOMAIN 5: LEARN & GROW ENGINE API CLIENT
// ==============================================================================

export async function getLearningPriorities(targetRoleId?: string): Promise<{
  user_id: string;
  count: number;
  confidence_review_threshold: number;
  priorities: any[];
  target_role_title?: string;
}> {
  const headers = await getAuthHeaders();
  const url = targetRoleId
    ? `${API_BASE}/learning/priorities?target_role_id=${encodeURIComponent(targetRoleId)}`
    : `${API_BASE}/learning/priorities`;
  const res = await fetchWithDedupe(url, { headers });
  if (!res.ok) throw new Error("Failed to load learning priorities");
  return res.json();
}

export async function refreshCareerGaps(): Promise<{
  status: string;
  refreshed_at: string;
  count: number;
  priorities: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/refresh-gaps`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to refresh career gaps");
  return res.json();
}

// In-memory cache for domain blueprints
const _blueprintCache = new Map<string, { data: any; ts: number }>();
const BLUEPRINT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes TTL

export async function listDomainBlueprints(force: boolean = false): Promise<{ blueprints: any[] }> {
  const cacheKey = "__list_all__";
  if (!force) {
    const cached = _blueprintCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < BLUEPRINT_CACHE_TTL) {
      return cached.data;
    }
  }
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/blueprints`, { headers });
  if (!res.ok) throw new Error("Failed to load domain blueprints");
  const data = await res.json();
  _blueprintCache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

export async function getDomainBlueprint(domainId: string, force: boolean = false): Promise<any> {
  const cacheKey = `domain_${domainId}`;
  if (!force) {
    const cached = _blueprintCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < BLUEPRINT_CACHE_TTL) {
      return cached.data;
    }
  }
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/blueprints/${domainId}`, { headers });
  if (!res.ok) throw new Error(`Failed to load blueprint for domain ${domainId}`);
  const data = await res.json();
  _blueprintCache.set(cacheKey, { data, ts: Date.now() });
  return data;
}

export async function getDiagnosticQuestions(domainId: string): Promise<{
  domain_id: string;
  total_questions: number;
  questions: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/blueprints/${domainId}/diagnostic`, { headers });
  if (!res.ok) throw new Error(`Failed to load diagnostic questions for ${domainId}`);
  return res.json();
}

export async function submitDiagnostic(
  domainId: string,
  answers: Record<string, number>
): Promise<{
  attempt_id: string;
  domain_id: string;
  overall_score: number;
  passed: boolean;
  recommended_focus: string[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/blueprints/${domainId}/diagnostic/submit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });
  if (!res.ok) throw new Error("Diagnostic submission failed");
  return res.json();
}

export async function searchCuratedResources(
  query: string,
  skillId?: string,
  level: string = "intermediate",
  limit: number = 6
): Promise<{
  query: string;
  count: number;
  provider_statuses: Record<string, string>;
  resources: any[];
}> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams({ query, level, limit: String(limit) });
  if (skillId) params.append("skill_id", skillId);

  const res = await fetchWithDedupe(`${API_BASE}/learning/resources/search?${params.toString()}`, { headers });
  if (!res.ok) throw new Error("Resource search failed");
  return res.json();
}

export async function getLearningResourceById(resourceId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/resources/${resourceId}`, { headers });
  if (!res.ok) throw new Error(`Resource ${resourceId} not found`);
  return res.json();
}

export async function generateBackendRoadmap(
  domainIdOrOptions: string | {
    domain_id?: string;
    target_role_id?: string;
    skill_gap_id?: string;
    skill_id?: string;
    step_count?: number;
    force_regenerate?: boolean;
  } = "dist-sys",
  targetRoleId?: string,
  stepCount: number = 4
): Promise<any> {
  const headers = await getAuthHeaders();
  let payload: Record<string, any>;
  if (typeof domainIdOrOptions === "object" && domainIdOrOptions !== null) {
    payload = {
      domain_id: domainIdOrOptions.domain_id,
      target_role_id: domainIdOrOptions.target_role_id,
      skill_gap_id: domainIdOrOptions.skill_gap_id,
      skill_id: domainIdOrOptions.skill_id,
      step_count: domainIdOrOptions.step_count || 4,
      force_regenerate: Boolean(domainIdOrOptions.force_regenerate),
    };
  } else {
    payload = {
      domain_id: domainIdOrOptions,
      target_role_id: targetRoleId,
      step_count: stepCount,
    };
  }

  const res = await fetch(`${API_BASE}/learning/roadmaps/generate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to generate personalized roadmap");
  }
  return res.json();
}

export const generatePersonalizedRoadmap = generateBackendRoadmap;

export async function listUserRoadmaps(): Promise<{ user_id: string; roadmaps: any[] }> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/roadmaps`, { headers });
  if (!res.ok) throw new Error("Failed to load user roadmaps");
  return res.json();
}

export async function getRoadmapByPathId(pathId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/roadmaps/${pathId}`, { headers });
  if (!res.ok) throw new Error(`Failed to load roadmap ${pathId}`);
  return res.json();
}

export async function deleteLearningRoadmap(pathId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/roadmaps/${encodeURIComponent(pathId)}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) throw new Error("Failed to delete roadmap");
  return res.json();
}

export async function submitLearningAttempt(payload: {
  step_id: string;
  roadmap_id?: string;
  attempt_type: string;
  activity_id: string;
  score: number;
  signals?: Record<string, number>;
}): Promise<{
  attempt_id: string;
  step_id: string;
  score: number;
  passed: boolean;
  computed_mastery: number;
  step_updated: boolean;
  governance_note: string;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/attempts`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Attempt recording failed");
  return res.json();
}

export async function getLearningMasteryTelemetry(): Promise<{
  user_id: string;
  average_mastery: number;
  snapshot_count: number;
  recent_snapshots: any[];
  recent_attempts: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(`${API_BASE}/learning/mastery`, { headers });
  if (!res.ok) throw new Error("Failed to load mastery telemetry");
  return res.json();
}

export async function getLearningOverview(targetRoleId?: string): Promise<any> {
  const headers = await getAuthHeaders();
  const url = targetRoleId
    ? `${API_BASE}/learning/overview?target_role_id=${encodeURIComponent(targetRoleId)}`
    : `${API_BASE}/learning/overview`;
  const res = await fetchWithDedupe(url, { headers });
  if (!res.ok) throw new Error("Failed to load learning overview");
  return res.json();
}

export async function generateBackendAssessment(payload: {
  skill_id: string;
  skill_name?: string;
  roadmap_id?: string;
  step_id?: string;
  learning_objective?: string;
  difficulty?: string;
  force_regenerate?: boolean;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/assessments/generate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to generate assessment (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getBackendAssessment(assessmentId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(
    `${API_BASE}/learning/assessments/${encodeURIComponent(assessmentId)}`,
    { headers }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Assessment ${assessmentId} not found (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function submitBackendAssessment(
  assessmentId: string,
  answers: Record<string, number>,
  isSkipped: boolean = false
): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE}/learning/assessments/${encodeURIComponent(assessmentId)}/submit`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ answers, is_skipped: isSkipped }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Assessment submission failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getLearningStep(stepId: string, roadmapId?: string): Promise<any> {
  const headers = await getAuthHeaders();
  const url = roadmapId
    ? `${API_BASE}/learning/steps/${encodeURIComponent(stepId)}?roadmap_id=${encodeURIComponent(roadmapId)}`
    : `${API_BASE}/learning/steps/${encodeURIComponent(stepId)}`;
  const res = await fetchWithDedupe(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Step ${stepId} not found (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function ensureLearningStep(payload: {
  topic_id: string;
  domain_id?: string;
  roadmap_id?: string;
  target_role_id?: string;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/steps/ensure`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to ensure learning step (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getLearningStepPacket(
  stepId: string,
  roadmapId?: string,
  regenerate?: boolean
): Promise<any> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (roadmapId) params.set("roadmap_id", roadmapId);
  if (regenerate) params.set("regenerate", "true");
  const qs = params.toString() ? `?${params.toString()}` : "";
  const url = `${API_BASE}/learning/steps/${encodeURIComponent(stepId)}/packet${qs}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Step packet ${stepId} not found (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function validatePracticeCode(payload: {
  exercise_id: string;
  code: string;
  language?: string;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/practice/validate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Practice validation failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export const submitMiniProjectApi = submitProjectToBackend;

export async function submitProjectToBackend(payload: {
  project_id: string;
  github_repo_url: string;
  summary_notes?: string;
  step_id?: string;
  roadmap_id?: string;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/projects/submit`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Project submission failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getProjectSubmission(projectId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(
    `${API_BASE}/learning/projects/submissions/${encodeURIComponent(projectId)}`,
    { headers }
  );
  if (!res.ok) {
    if (res.status === 404) return null;
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to fetch project submission (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function listMiniProjects(params?: {
  domain_id?: string;
  gap_id?: string;
  roadmap_id?: string;
}): Promise<{ domain_id?: string; count: number; projects: any[] }> {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();
  if (params?.domain_id) searchParams.set("domain_id", params.domain_id);
  if (params?.gap_id) searchParams.set("gap_id", params.gap_id);
  if (params?.roadmap_id) searchParams.set("roadmap_id", params.roadmap_id);

  const queryStr = searchParams.toString();
  const url = `${API_BASE}/learning/projects${queryStr ? `?${queryStr}` : ""}`;
  const res = await fetchWithDedupe(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to list mini-projects (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function generateMiniProjects(payload: {
  domain_id: string;
  domain_title?: string;
  skill_id?: string;
  skill_name?: string;
  gap_id?: string;
  target_role_id?: string;
  roadmap_id?: string;
  count?: number;
  force_regenerate?: boolean;
}): Promise<{ status: string; count: number; domain_id: string; projects: any[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/projects/generate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to generate mini-projects (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getMiniProjectDetail(projectId: string): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetchWithDedupe(
    `${API_BASE}/learning/projects/${encodeURIComponent(projectId)}`,
    { headers }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to load project details (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 9 — Evidence Provenance APIs
// ─────────────────────────────────────────────────────────────────────────────

export async function getSkillGapProvenance(
  skillId: string,
  roleId?: string,
  gapId?: string,
  forceRefresh: boolean = false
): Promise<any> {
  const headers = await getAuthHeaders();
  const params = new URLSearchParams();
  if (roleId) params.append("role_id", roleId);
  if (gapId) params.append("gap_id", gapId);
  if (forceRefresh) params.append("force_refresh", "true");

  const queryStr = params.toString() ? `?${params.toString()}` : "";
  const url = `${API_BASE}/learning/assessments/provenance/${encodeURIComponent(skillId)}${queryStr}`;

  // Use standard fetch if forceRefresh is true to avoid cached promise
  const fetcher = forceRefresh ? fetch : fetchWithDedupe;
  const res = await fetcher(url, { headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to fetch skill provenance (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function evaluateSkillGapProvenance(payload: {
  skill_id: string;
  target_role_id?: string;
  gap_id?: string;
  force_refresh?: boolean;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/assessments/provenance/evaluate`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to evaluate skill provenance (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 12 — Learning Progress & History APIs
// ─────────────────────────────────────────────────────────────────────────────

export async function markStepComplete(
  stepId: string,
  payload?: { roadmap_id?: string; notes?: string }
): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/steps/${encodeURIComponent(stepId)}/complete`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to mark step complete (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function skipLearningStep(
  stepId: string,
  payload?: { roadmap_id?: string; notes?: string }
): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/steps/${encodeURIComponent(stepId)}/skip`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to skip step (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function resumeLearningStep(
  stepId: string,
  payload?: { roadmap_id?: string; notes?: string }
): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/steps/${encodeURIComponent(stepId)}/resume`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to resume step (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function getLearningHistory(params?: {
  limit?: number;
  offset?: number;
  domain_id?: string;
  activity_type?: string;
  roadmap_id?: string;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.append("limit", String(params.limit));
  if (params?.offset) searchParams.append("offset", String(params.offset));
  if (params?.domain_id) searchParams.append("domain_id", params.domain_id);
  if (params?.activity_type) searchParams.append("activity_type", params.activity_type);
  if (params?.roadmap_id) searchParams.append("roadmap_id", params.roadmap_id);

  const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${API_BASE}/learning/history${queryStr}`, {
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to fetch learning history (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export async function recordLearningActivity(payload: {
  activity_type: string;
  title: string;
  detail?: string;
  roadmap_id?: string;
  step_id?: string;
  domain_id?: string;
  skill_id?: string;
  target_role_id?: string;
  resource_id?: string;
  assessment_id?: string;
  project_id?: string;
  score?: number;
  link_route?: string;
  activity_status?: string;
  activity_metadata?: Record<string, any>;
}): Promise<any> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/learning/history/record`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error: any = new Error(err.detail || `Failed to record learning activity (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.json();
}
