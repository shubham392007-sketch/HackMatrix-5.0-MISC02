/**
 * SkillPassport Evidence Vault API Client
 * Facilitates interaction with the persistent Evidence Vault backend endpoints.
 */

import { supabase } from "@/lib/supabase/client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api/v1`;

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

export function invalidateVaultAuthTokenCache() {
  cachedToken = null;
  tokenExpiresAt = 0;
}

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange(() => {
    invalidateVaultAuthTokenCache();
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

export interface VaultSummary {
  total_artifacts: number;
  uploaded_documents: number;
  web_snapshots: number;
  repository_artifacts: number;
  connected_records: number;
  processing_issues: number;
  storage_used_bytes: number;
  last_activity_at: string | null;
}

export type VaultArtifactType =
  | "uploaded_document"
  | "web_snapshot"
  | "repository_readme"
  | "connected_source_record";

export interface VaultArtifact {
  id: string;
  artifact_type: VaultArtifactType;
  title: string;
  filename: string | null;
  mime_type: string | null;
  file_size_bytes: number;
  category: string;
  source_provider: string;
  source_url: string | null;
  observed_at: string | null;
  created_at: string | null;
  processing_state: string;
  has_original_file: boolean;
  has_snapshot: boolean;
  has_extracted_text: boolean;
  extracted_summary: string | null;
  evidence_id: string | null;
  verification_status: string;
  provenance: Record<string, any>;
}

export interface VaultArtifactListResponse {
  items: VaultArtifact[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface VaultArtifactChunk {
  chunk_index: number;
  page_or_slide_number: number;
  section_title: string | null;
  original_text: string;
  normalized_text: string;
  extraction_method: string;
}

export interface VaultCandidateSkill {
  id: string;
  name: string;
  category: string;
  proficiency_level: string;
  confidence: number;
  supporting_excerpt: string;
  rationale: string;
  status: string;
}

export interface VaultArtifactDetail extends VaultArtifact {
  chunks?: VaultArtifactChunk[];
  full_extracted_text?: string | null;
  extracted_headings?: Record<string, any>;
  discovered_links?: Record<string, any>;
  sections_json?: Array<Record<string, any>>;
  user_metadata?: Record<string, any>;
  linked_evidence?: {
    id: string | null;
    title: string | null;
    evidence_strength?: string;
    verification_status: string;
    extraction_confidence?: number;
    candidate_skills: VaultCandidateSkill[];
    audit_trail?: Array<{
      id: string;
      event_type: string;
      previous_state: string;
      new_state: string;
      reason_note: string;
      timestamp: string | null;
    }>;
  } | null;
}

/**
 * Fetches the user-specific vault summary metrics.
 */
export async function getVaultSummary(): Promise<VaultSummary> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/vault/summary`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to load vault summary (status ${res.status})`);
  }
  return res.json();
}

/**
 * Lists user-specific vault artifacts with filtering, search, and pagination.
 */
export async function listVaultArtifacts(params: {
  category?: string;
  search?: string;
  has_original?: boolean;
  has_snapshot?: boolean;
  page?: number;
  page_size?: number;
}): Promise<VaultArtifactListResponse> {
  const headers = await getAuthHeaders();
  const q = new URLSearchParams();
  if (params.category && params.category !== "all") q.set("category", params.category);
  if (params.search) q.set("search", params.search);
  if (typeof params.has_original === "boolean") q.set("has_original", String(params.has_original));
  if (typeof params.has_snapshot === "boolean") q.set("has_snapshot", String(params.has_snapshot));
  if (params.page) q.set("page", String(params.page));
  if (params.page_size) q.set("page_size", String(params.page_size));

  const qs = q.toString() ? `?${q.toString()}` : "";
  const res = await fetch(`${API_BASE}/vault/artifacts${qs}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to list vault artifacts (status ${res.status})`);
  }
  return res.json();
}

/**
 * Retrieves full details for a single vault artifact.
 */
export async function getVaultArtifactDetail(
  artifactType: VaultArtifactType,
  artifactId: string
): Promise<VaultArtifactDetail> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/vault/artifacts/${artifactType}/${artifactId}`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to load artifact details (status ${res.status})`);
  }
  return res.json();
}

/**
 * Builds the authorized preview URL for an artifact.
 */
export function getVaultPreviewUrl(artifactType: VaultArtifactType, artifactId: string): string {
  return `${API_BASE}/vault/artifacts/${artifactType}/${artifactId}/preview-file`;
}

/**
 * Builds the authorized download URL for an artifact.
 */
export function getVaultDownloadUrl(artifactType: VaultArtifactType, artifactId: string): string {
  return `${API_BASE}/vault/artifacts/${artifactType}/${artifactId}/download`;
}

/**
 * Fetches the binary file as an object URL for secure, authenticated inline display in browser.
 */
export async function fetchVaultPreviewBlob(
  artifactType: VaultArtifactType,
  artifactId: string
): Promise<{ blobUrl: string; contentType: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/vault/artifacts/${artifactType}/${artifactId}/preview-file`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Unable to load preview stream (status ${res.status})`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  return {
    blobUrl,
    contentType: res.headers.get("Content-Type") || blob.type || "application/octet-stream",
  };
}

/**
 * Triggers a native authenticated download in the browser.
 */
export async function triggerVaultDownload(
  artifactType: VaultArtifactType,
  artifactId: string,
  preferredFilename?: string
): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/vault/artifacts/${artifactType}/${artifactId}/download`, {
    headers,
  });
  if (!res.ok) {
    throw new Error(`Download request failed with status ${res.status}`);
  }

  // Parse filename from Content-Disposition if available
  let filename = preferredFilename || "download";
  const disp = res.headers.get("Content-Disposition");
  if (disp && disp.includes("filename=")) {
    const match = disp.match(/filename\*?=['"]?(?:UTF-8'')?([^;"'\n]*)['"]?/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    }
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
}
