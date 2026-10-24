/**
 * SkillPassport Recruiter & Hiring Manager Portal API Client
 * Connects frontend recruiter portal to the FastAPI recruiter endpoints.
 */

import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

// ==============================================================================
// TYPES
// ==============================================================================

export interface RecruiterOrganization {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  location?: string | null;
  is_verified: boolean;
  created_at?: string;
}

export interface RecruiterProfile {
  user_id: string;
  email: string;
  full_name: string;
  role: "recruiter" | "hiring_manager" | "org_admin" | string;
  job_title?: string;
  status: "active" | "pending_approval" | "suspended" | string;
  public_contact_name?: string;
  public_contact_email?: string;
  is_public_contact_enabled: boolean;
  organization: RecruiterOrganization;
}

export interface RecruiterAuthResponse {
  success: boolean;
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  organization: RecruiterOrganization;
  token?: string;
  message: string;
}

export interface JobRequirementItem {
  name: string;
  category?: string;
  importance?: "required" | "preferred" | "nice_to_have" | string;
  expected_level?: "Foundational" | "Working" | "Practitioner" | "Advanced" | "Expert" | string;
  expected_level_numeric?: number;
  evidence_expectation?: string;
}

export interface RecruiterJob {
  id: string;
  job_uuid: string;
  title: string;
  company_name: string;
  location_text?: string;
  remote_status?: "remote" | "hybrid" | "on_site" | string;
  employment_type?: "full_time" | "part_time" | "contract" | "internship" | string;
  seniority?: "entry" | "mid" | "senior" | "lead" | "executive" | string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string;
  salary_period?: string;
  description: string;
  status: "draft" | "published" | "paused" | "closed" | string;
  posted_at?: string | null;
  created_at: string;
  updated_at?: string | null;
  public_recruiter_name?: string | null;
  public_recruiter_email?: string | null;
  requirements: JobRequirementItem[];
  requirements_count?: number;
  applications_count: number;
}

export interface CandidateInvitationSummary {
  invitation_id: string;
  share_link_id: string;
  share_token: string;
  template_id?: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_headline: string;
  candidate_email: string;
  job_id?: string | null;
  job_title: string;
  pipeline_status: "new" | "reviewing" | "shortlisted" | "interview" | "offer" | "hired" | "rejected" | string;
  delivery_status: "delivered" | "pending_account" | string;
  is_read: boolean;
  read_at?: string | null;
  candidate_message?: string | null;
  recruiter_notes?: string | null;
  created_at: string;
  last_status_updated_at?: string | null;
}

export interface RecruiterDashboardOverview {
  organization: RecruiterOrganization;
  recruiter: {
    user_id: string;
    name: string;
    email: string;
    role: string;
    job_title?: string;
  };
  metrics: {
    active_jobs_count: number;
    draft_jobs_count: number;
    paused_jobs_count: number;
    closed_jobs_count: number;
    total_jobs_count: number;
    candidate_shares_count: number;
    new_candidates_count: number;
    reviewing_candidates_count: number;
    shortlisted_candidates_count: number;
    interview_candidates_count: number;
    unread_messages_count: number;
  };
  recent_shares: any[];
  recent_jobs: any[];
}

// ==============================================================================
// AUTH HEADERS
// ==============================================================================

export function getRecruiterToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sp_recruiter_token");
}

export function setRecruiterAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem("sp_recruiter_token", token);
  localStorage.setItem("sp_recruiter_user", JSON.stringify(user));
}

export function clearRecruiterAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("sp_recruiter_token");
  localStorage.removeItem("sp_recruiter_user");
}

export function getStoredRecruiterUser(): any | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("sp_recruiter_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const customToken = getRecruiterToken();
  if (customToken) {
    return {
      Authorization: `Bearer ${customToken}`,
      "Content-Type": "application/json",
    };
  }

  // Fallback to Supabase session token
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
  } catch (e) {
    console.warn("Could not retrieve Supabase session for recruiter:", e);
  }

  return {
    "Content-Type": "application/json",
  };
}

// ==============================================================================
// API METHODS
// ==============================================================================

export async function registerRecruiter(data: {
  full_name: string;
  work_email: string;
  password: string;
  organization_name: string;
  job_title: string;
  website?: string;
  location?: string;
  industry?: string;
  company_size?: string;
}): Promise<RecruiterAuthResponse> {
  const res = await fetch(`${API_BASE}/recruiter/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || body.message || "Recruiter registration failed.");
  }

  if (body.token) {
    setRecruiterAuthSession(body.token, body);
  }

  return body;
}

export async function loginRecruiter(data: {
  email: string;
  password: string;
}): Promise<RecruiterAuthResponse> {
  const res = await fetch(`${API_BASE}/recruiter/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || body.message || "Recruiter authentication failed.");
  }

  if (body.token) {
    setRecruiterAuthSession(body.token, body);
  }

  return body;
}

export async function getCurrentRecruiterProfile(): Promise<RecruiterProfile> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/auth/me`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not retrieve recruiter profile.");
  }
  return body;
}

export async function getRecruiterDashboardOverview(): Promise<RecruiterDashboardOverview> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/dashboard/overview`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not load recruiter dashboard metrics.");
  }
  return body;
}

export async function listRecruiterJobs(params?: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; offset: number; limit: number; jobs: RecruiterJob[] }> {
  const headers = await getAuthHeaders();
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.search) sp.set("search", params.search);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));

  const url = `${API_BASE}/recruiter/jobs${sp.toString() ? `?${sp.toString()}` : ""}`;
  const res = await fetch(url, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not list organization job openings.");
  }
  return body;
}

export async function createJobPosting(data: {
  title: string;
  description: string;
  location_text?: string;
  remote_status?: string;
  employment_type?: string;
  seniority?: string;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  salary_period?: string;
  status?: "draft" | "published";
  extracted_requirements?: JobRequirementItem[];
  public_recruiter_name?: string;
  public_recruiter_email?: string;
  job_url?: string;
  apply_url?: string;
}): Promise<{ success: boolean; message: string; job: any }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/jobs`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not create job posting.");
  }
  return body;
}

export async function getRecruiterJobDetail(jobId: string): Promise<RecruiterJob> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/jobs/${jobId}`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not retrieve job opening details.");
  }
  return body;
}

export async function updateRecruiterJob(
  jobId: string,
  data: Partial<{
    title: string;
    description: string;
    location_text: string;
    remote_status: string;
    employment_type: string;
    seniority: string;
    salary_min: number;
    salary_max: number;
    salary_currency: string;
    salary_period: string;
    status: "draft" | "published" | "paused" | "closed";
    extracted_requirements: JobRequirementItem[];
    public_recruiter_name: string;
    public_recruiter_email: string;
  }>
): Promise<{ success: boolean; message: string; job: any }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/jobs/${jobId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not update job opening.");
  }
  return body;
}

export async function deleteOrCloseJob(
  jobId: string
): Promise<{ success: boolean; message: string; status: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/jobs/${jobId}`, {
    method: "DELETE",
    headers,
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not delete or close job.");
  }
  return body;
}

export async function listRecruiterCandidates(params?: {
  status?: string;
  job_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{
  total: number;
  offset: number;
  limit: number;
  pipeline_counts: Record<string, number>;
  candidates: CandidateInvitationSummary[];
}> {
  const headers = await getAuthHeaders();
  const sp = new URLSearchParams();
  if (params?.status) sp.set("status", params.status);
  if (params?.job_id) sp.set("job_id", params.job_id);
  if (params?.search) sp.set("search", params.search);
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.offset) sp.set("offset", String(params.offset));

  const url = `${API_BASE}/recruiter/candidates${sp.toString() ? `?${sp.toString()}` : ""}`;
  const res = await fetch(url, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not retrieve candidate pipeline.");
  }
  return body;
}

export async function getCandidatePassportDetail(invitationId: string): Promise<{
  invitation: CandidateInvitationSummary;
  passport: any;
  job?: any;
  messages: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/candidates/${invitationId}`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not load candidate passport review details.");
  }
  return body;
}

export async function updateCandidatePipelineStatus(
  invitationId: string,
  status: string,
  notes?: string
): Promise<{ success: boolean; message: string; pipeline_status: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/candidates/${invitationId}/pipeline`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ pipeline_status: status, notes }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not update pipeline status.");
  }
  return body;
}

export async function updateCandidateRecruiterNotes(
  invitationId: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/candidates/${invitationId}/notes`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ notes }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not save recruiter evaluation notes.");
  }
  return body;
}

export async function sendCandidateMessage(
  invitationId: string,
  data: { subject: string; message_body: string }
): Promise<{ success: boolean; message: string; message_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/candidates/${invitationId}/messages`, {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not send message to candidate.");
  }
  return body;
}

export async function getRecruiterInbox(): Promise<{
  total_messages: number;
  unread_count: number;
  messages: any[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/recruiter/inbox`, { headers });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not retrieve recruiter inbox.");
  }
  return body;
}

export async function replyToRecruiterMessage(
  messageId: string,
  replyBody: string
): Promise<{ success: boolean; messageId: string; replyBody: string; repliedAt: string }> {
  // Uses candidate auth headers
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_BASE}/sharing/messages/${messageId}/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ reply_body: replyBody }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body.detail || "Could not send reply.");
  }
  return body;
}
