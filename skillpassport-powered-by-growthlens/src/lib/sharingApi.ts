import { supabase } from "@/lib/supabase/client";
import {
  ShareRecord,
  ShareProjection,
  SharePermissionsConfig,
  CustomSkill,
  RecruiterMessage,
  SharingOverviewData,
  UserMasterPassport,
} from "@/types/sharing";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";
const API_BASE = `${BACKEND_URL.replace(/\/$/, "")}/api/v1/sharing`;

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch (err) {
    console.warn("Could not retrieve Supabase session token:", err);
  }
  return { Authorization: "Bearer sp_demo_alexchen_valid" };
}

export const sharingApi = {
  // 1. Overview metrics
  async getOverview(): Promise<SharingOverviewData> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/overview`, { headers: authHeaders });
    } catch {
      res = await fetch("/api/v1/sharing/overview", { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch sharing overview: ${res.statusText}`);
    }
    return res.json();
  },

  // 2. Share links
  async listLinks(): Promise<ShareRecord[]> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links`, { headers: authHeaders });
    } catch {
      res = await fetch("/api/v1/sharing/links", { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to list share links: ${res.statusText}`);
    }
    return res.json();
  },

  async createLink(payload: {
    label?: string;
    template_id?: string;
    templateId?: string;
    permissions?: SharePermissionsConfig;
  } | SharePermissionsConfig): Promise<ShareRecord> {
    const authHeaders = await getAuthHeader();
    const formatted = "label" in payload
      ? {
          label: payload.label || "Selective Skill Passport Share",
          template_id: payload.template_id || payload.templateId || "classic",
          permissions: payload.permissions,
        }
      : {
          label: (payload as any).customLinkLabel || "Selective Skill Passport Share",
          template_id: (payload as any).templateId || "classic",
          permissions: payload,
        };
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });
    } catch {
      res = await fetch("/api/v1/sharing/links", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(formatted),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create share link: ${res.statusText}`);
    }
    return res.json();
  },

  async getLink(linkId: string): Promise<{ link: ShareRecord; projection: ShareProjection }> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links/${linkId}`, { headers: authHeaders });
    } catch {
      res = await fetch(`/api/v1/sharing/links/${linkId}`, { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to get share link: ${res.statusText}`);
    }
    return res.json();
  },

  async updateLink(
    linkId: string,
    payload: { label?: string; template_id?: string; permissions?: SharePermissionsConfig }
  ): Promise<Partial<ShareRecord>> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links/${linkId}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      res = await fetch(`/api/v1/sharing/links/${linkId}`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      throw new Error(`Failed to update share link: ${res.statusText}`);
    }
    return res.json();
  },

  async revokeLink(linkId: string, reason?: string): Promise<any> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links/${linkId}/revoke`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    } catch {
      res = await fetch(`/api/v1/sharing/links/${linkId}/revoke`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
    }
    if (!res.ok) {
      throw new Error(`Failed to revoke share link: ${res.statusText}`);
    }
    return res.json();
  },

  async extendLink(linkId: string, additionalDays: number = 14): Promise<any> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/links/${linkId}/extend`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ additional_days: additionalDays }),
      });
    } catch {
      res = await fetch(`/api/v1/sharing/links/${linkId}/extend`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ additional_days: additionalDays }),
      });
    }
    if (!res.ok) {
      throw new Error(`Failed to extend share link: ${res.statusText}`);
    }
    return res.json();
  },

  // 3. Draft Preview
  async getDraftPreview(payload?: {
    label?: string;
    template_id?: string;
    templateId?: string;
    permissions?: Partial<SharePermissionsConfig>;
  } | SharePermissionsConfig): Promise<ShareProjection> {
    const authHeaders = await getAuthHeader();
    let bodyPayload: any = {};
    if (payload) {
      if ("permissions" in payload || "label" in payload) {
        bodyPayload = {
          label: (payload as any).label || "Draft Preview",
          template_id: (payload as any).template_id || (payload as any).templateId || "classic",
          permissions: (payload as any).permissions || {},
        };
      } else {
        bodyPayload = {
          label: (payload as any).customLinkLabel || "Draft Preview",
          template_id: (payload as any).templateId || "classic",
          permissions: payload,
        };
      }
    }
    const fetchDraft = async () => {
      try {
        return await fetch(`${API_BASE}/preview`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      } catch {
        return await fetch("/api/v1/sharing/preview", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      }
    };

    let res = await fetchDraft();
    if (res.status === 503) {
      await new Promise((r) => setTimeout(r, 600));
      res = await fetchDraft();
    }

    if (!res.ok) {
      throw new Error(`Failed to generate draft preview: ${res.statusText}`);
    }
    return res.json();
  },

  // 4. Custom Skills
  async listCustomSkills(): Promise<CustomSkill[]> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/custom-skills`, { headers: authHeaders });
    } catch {
      res = await fetch("/api/v1/sharing/custom-skills", { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to list custom skills: ${res.statusText}`);
    }
    return res.json();
  },

  async createCustomSkill(payload: {
    title: string;
    description: string;
    context?: string;
    self_assessed_level: string;
    tags: string[];
    attached_evidence_ids: string[];
    external_project_url?: string;
  }): Promise<CustomSkill> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/custom-skills`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      res = await fetch("/api/v1/sharing/custom-skills", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to create custom skill: ${res.statusText}`);
    }
    return res.json();
  },

  async deleteCustomSkill(skillId: string): Promise<void> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/custom-skills/${skillId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
    } catch {
      res = await fetch(`/api/v1/sharing/custom-skills/${skillId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
    }
    if (!res.ok && res.status !== 204) {
      throw new Error(`Failed to delete custom skill: ${res.statusText}`);
    }
  },

  // 5. Recruiter Messages
  async listMessages(): Promise<RecruiterMessage[]> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/messages`, { headers: authHeaders });
    } catch {
      res = await fetch("/api/v1/sharing/messages", { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to list recruiter messages: ${res.statusText}`);
    }
    return res.json();
  },

  async markMessageRead(messageId: string, read: boolean = true): Promise<{ id: string; isRead: boolean }> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/messages/${messageId}/read?read=${read}`, {
        method: "PATCH",
        headers: authHeaders,
      });
    } catch {
      res = await fetch(`/api/v1/sharing/messages/${messageId}/read?read=${read}`, {
        method: "PATCH",
        headers: authHeaders,
      });
    }
    if (!res.ok) {
      throw new Error(`Failed to mark message read: ${res.statusText}`);
    }
    return res.json();
  },

  // 6. Public Recruiter Endpoints
  async getPublicProjection(token: string): Promise<ShareProjection> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/public/${token}`);
    } catch {
      res = await fetch(`/api/v1/sharing/public/${token}`);
    }
    if (res.status === 404) {
      throw new Error("NOT_FOUND");
    }
    if (res.status === 410) {
      throw new Error("EXPIRED");
    }
    if (!res.ok) {
      throw new Error(`Failed to load shared passport: ${res.statusText}`);
    }
    return res.json();
  },

  async getPublicEvidenceDetail(token: string, evidenceId: string): Promise<any> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/public/${token}/evidence/${evidenceId}`);
    } catch {
      res = await fetch(`/api/v1/sharing/public/${token}/evidence/${evidenceId}`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Unable to inspect evidence");
    }
    return res.json();
  },

  async sendPublicMessage(
    token: string,
    payload: {
      sender_name: string;
      sender_email: string;
      company?: string;
      role_title?: string;
      subject?: string;
      message_body: string;
    }
  ): Promise<{ success: boolean; messageId: string; deliveredAt: string }> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/public/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      res = await fetch(`/api/v1/sharing/public/${token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to send message to candidate");
    }
    return res.json();
  },

  // 7. Master Passport & Section Customization
  async getMasterPassport(): Promise<UserMasterPassport> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/master`, { headers: authHeaders });
    } catch {
      res = await fetch("/api/v1/sharing/master", { headers: authHeaders });
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch master passport: ${res.statusText}`);
    }
    return res.json();
  },

  async updateMasterPassport(payload: Partial<UserMasterPassport>): Promise<UserMasterPassport> {
    const authHeaders = await getAuthHeader();
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/master`, {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch {
      res = await fetch("/api/v1/sharing/master", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Failed to update master passport: ${res.statusText}`);
    }
    return res.json();
  },
};
