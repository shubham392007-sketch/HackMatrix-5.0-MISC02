/**
 * SkillPassport Domain 1: Evidence Intelligence & Work Ingestion API Client
 * Connects frontend UI components to the production FastAPI backend.
 */

import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

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
    const token = data.session?.access_token;
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
  headline?: string;
  current_role?: string;
  job_title?: string;
  specialization?: string;
  department_or_team?: string;
  experience_level?: string;
  professional_goal?: string;
  professional_summary?: string;
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

export async function syncSingleGitHubRepository(repositoryIdOrFullName: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/github/repositories/${repositoryIdOrFullName}/sync`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Repository sync failed" }));
    throw new Error(err.detail || "Repository sync failed");
  }
  return res.json();
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
  const res = await fetch(`${API_BASE}/connections/jira/test`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ site_url, email, api_token }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Jira validation failed" }));
    throw new Error(err.detail || "Invalid Jira credentials");
  }
  return res.json();
}

export async function connectJira(site_url: string, email: string, api_token: string, selected_projects: string[] = []) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/jira`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ site_url, email, api_token, selected_projects }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to connect Jira" }));
    throw new Error(err.detail || "Jira connection failed");
  }
  return res.json();
}

export async function listJiraProjects() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/jira/projects`, {
    headers,
  });
  if (!res.ok) throw new Error("Failed to load Jira projects");
  return res.json();
}

export async function updateSelectedJiraProjects(projects: any[]) {
  const headers = await getAuthHeaders();
  const formatted = projects.map((p) =>
    typeof p === "string" ? { key: p, name: p, selected: true } : p
  );
  const res = await fetch(`${API_BASE}/connections/jira/projects`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ projects: formatted }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to update projects" }));
    throw new Error(err.detail || "Project update failed");
  }
  return res.json();
}

export async function triggerJiraSync(project_key?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/connections/jira/sync`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(project_key ? { project_key } : {}),
  });
  return res.json();
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

export async function reviewPassportCandidate(
  mappingId: string,
  action: "verify" | "reject" | "flag_insufficient",
  rationale: string
): Promise<{
  success: boolean;
  decision_id: string;
  status: string;
  message: string;
}> {
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
