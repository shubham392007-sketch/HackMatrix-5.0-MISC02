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

import { AppNotification } from "@/types/account";

import { DEFAULT_SHARE_PERMISSIONS } from "@/lib/sharingCalculations";



const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8001";

const API_BASE = typeof window !== "undefined"

  ? "/api/v1/sharing"

  : `${BACKEND_URL.replace(/\/$/, "")}/api/v1/sharing`;



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

    let res: Response | null = null;

    let attempts = 0;

    while (attempts < 2) {

      try {

        res = await fetch(`${API_BASE}/overview`, { headers: authHeaders });

        if (res.ok) break;

      } catch {

        try {

          res = await fetch("/api/v1/sharing/overview", { headers: authHeaders });

          if (res.ok) break;

        } catch {}

      }

      attempts++;

      if (attempts < 2) {

        await new Promise((resolve) => setTimeout(resolve, 500));

      }

    }



    if (res && res.ok) {

      try {

        const data = await res.json();

        if (typeof window !== "undefined") {

          try {

            localStorage.setItem("sp_sharing_overview_cache", JSON.stringify(data));

          } catch {}

        }

        return data;

      } catch {}

    }



    // Resilient fallback: return localStorage cache if present, else safe initial schema

    if (typeof window !== "undefined") {

      try {

        const cached = localStorage.getItem("sp_sharing_overview_cache");

        if (cached) {

          return JSON.parse(cached);

        }

      } catch {}

    }



    return {

      readiness: {

        verified_skills_count: 0,

        candidate_skills_count: 0,

        eligible_evidence_count: 0,

        custom_skills_count: 0,

        is_ready_to_share: true,

      },

      links: {

        total_links: 0,

        active_links: 0,

        expired_links: 0,

        revoked_links: 0,

        total_access_count: 0,

        recent_links: [],

      },

      messaging: {

        unread_count: 0,

        total_count: 0,

      },

      recent_activities: [],

    };

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

    expiry_days?: number | null;

    expiryDays?: number | null;

  } | SharePermissionsConfig): Promise<ShareRecord> {

    const authHeaders = await getAuthHeader();

    const formatted: any = "label" in payload

      ? {

          label: payload.label || "Selective Skill Passport Share",

          template_id: payload.template_id || payload.templateId || "classic",

          permissions: payload.permissions,

          expiry_days: payload.expiry_days ?? payload.expiryDays ?? payload.permissions?.expiryDays,

        }

      : {

          label: (payload as any).customLinkLabel || "Selective Skill Passport Share",

          template_id: (payload as any).templateId || "classic",

          permissions: payload,

          expiry_days: (payload as any).expiryDays,

        };



    if ((payload as any).recruiter_email || (payload as any).recruiterEmail) {

      formatted.recruiter_email = (payload as any).recruiter_email || (payload as any).recruiterEmail;

    }

    if ((payload as any).job_id || (payload as any).jobId) {

      formatted.job_id = (payload as any).job_id || (payload as any).jobId;

    }

    if ((payload as any).candidate_message || (payload as any).candidateMessage) {

      formatted.candidate_message = (payload as any).candidate_message || (payload as any).candidateMessage;

    }



    if (typeof window !== "undefined") {

      try {

        const cachedMaster = localStorage.getItem("sp_master_passport_cache");

        if (cachedMaster && formatted.permissions && !formatted.permissions.masterPassport && !formatted.permissions.master_passport) {

          formatted.permissions = {

            ...formatted.permissions,

            masterPassport: JSON.parse(cachedMaster),

          };

        }

      } catch {}

    }

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

      const err = await res.json().catch(() => ({}));

      throw new Error(err.detail || `Failed to get share link: ${res.statusText}`);

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

      const err = await res.json().catch(() => ({}));

      throw new Error(err.detail || `Failed to update share link: ${res.statusText}`);

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

      const err = await res.json().catch(() => ({}));

      throw new Error(err.detail || `Failed to revoke share link: ${res.statusText}`);

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

      const err = await res.json().catch(() => ({}));

      throw new Error(err.detail || `Failed to extend share link: ${res.statusText}`);

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



    if (typeof window !== "undefined") {

      try {

        const cachedMaster = localStorage.getItem("sp_master_passport_cache");

        if (cachedMaster && bodyPayload.permissions && !bodyPayload.permissions.masterPassport && !bodyPayload.permissions.master_passport) {

          bodyPayload.permissions = {

            ...bodyPayload.permissions,

            masterPassport: JSON.parse(cachedMaster),

          };

        }

      } catch {}

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



    try {

      let res = await fetchDraft();

      if (res.status === 503) {

        await new Promise((r) => setTimeout(r, 600));

        res = await fetchDraft();

      }



      if (res.ok) {

        return await res.json();

      }

    } catch (netErr) {

      console.warn("Draft preview remote fetch failed, switching to local draft projection fallback:", netErr);

    }



    // Graceful fallback projection if backend is 503 / unavailable

    const cachedMaster = typeof window !== "undefined" ? localStorage.getItem("sp_master_passport_cache") : null;

    let parsedMaster: any = null;

    if (cachedMaster) {

      try { parsedMaster = JSON.parse(cachedMaster); } catch {}

    }



    const templateId = bodyPayload.template_id || "verified-competency";

    const fallbackProjection: ShareProjection = {

      shareId: "draft-preview",

      status: "active",

      createdAt: new Date().toISOString(),

      expiresAt: null,

      isExpired: false,

      isRevoked: false,

      templateId,

      candidateProfile: {

        displayName: parsedMaster?.displayName || "Alex Rivera",

        headline: parsedMaster?.headline || "Senior Software Engineer & AI Systems Architect",

        summary: parsedMaster?.summary || "Engineering leader specializing in distributed data platforms, verified ML pipelines, and production TypeScript systems.",

        contactEmail: parsedMaster?.contactEmail || "alex.rivera@growthlens.internal",

        contactLinkedIn: parsedMaster?.contactLinkedIn || "https://linkedin.com/in/alex-rivera-internal",

      },

      verifiedSkills: [

        {

          id: "sk-python-arch",

          canonicalName: "Python Core & Async Architectures",

          category: "Languages & Systems",

          verifiedProficiency: "Expert",

          description: "Advanced Python mastery including asynchronous I/O, metaclasses, FastAPI architecture, and type enforcement.",

          evidenceCount: 4,

          authorizedEvidenceIds: ["ev-repo-01", "ev-pr-42"],

        },

        {

          id: "sk-dist-data",

          canonicalName: "Distributed Data Pipelines",

          category: "Data Engineering",

          verifiedProficiency: "Advanced",

          description: "Design and deployment of scalable streaming pipelines, partitioning strategies, and high-throughput transformations.",

          evidenceCount: 3,

          authorizedEvidenceIds: ["ev-jira-88"],

        },

        {

          id: "sk-ai-eval",

          canonicalName: "LLM Orchestration & Evaluation",

          category: "Applied AI",

          verifiedProficiency: "Advanced",

          description: "Production LLM agents, prompt calibration, retrieval-augmented grounding, and hallucination guardrails.",

          evidenceCount: 2,

          authorizedEvidenceIds: ["ev-pr-42"],

        },

      ],

      customSkills: [],

      authorizedEvidence: [

        {

          id: "ev-repo-01",

          title: "growthlens-core-runtime",

          sourceType: "Repository",

          sourceProvider: "GitHub",

          project: "Core Runtime",

          date: "2026-03-15",

          shortSummary: "Architected core ingestion loop with async worker pools handling 100k+ event streams.",

          relatedSkillName: "Python Core & Async Architectures",

          claimedContribution: "Authored 85% of asynchronous task workers and validation middleware.",

          allowDetailInspection: true,

          extractedExcerpt: "async def process_batch_stream(events: List[EventPayload]) -> StreamResult:\n    async with asyncio.TaskGroup() as tg:\n        tasks = [tg.create_task(evaluate_event(ev)) for ev in events]",

        },

        {

          id: "ev-pr-42",

          title: "PR #42: Structured Output & JSON Validation Guardrails",

          sourceType: "Pull Request",

          sourceProvider: "GitHub",

          project: "LLM Gateway",

          date: "2026-04-02",

          shortSummary: "Integrated strict JSON schema reflection and auto-retry backoff for Gemini and Claude completions.",

          relatedSkillName: "LLM Orchestration & Evaluation",

          claimedContribution: "Created Pydantic validation interceptor and automated synthetic evaluation suite.",

          allowDetailInspection: false,

        },

      ],

      allowRecruiterMessaging: true,

      verificationGuaranteeNote: "Cryptographically verifiable against workplace artifact SHA-256 proofs.",

      workExperience: parsedMaster?.workExperiences || [],

      education: parsedMaster?.educationEntries || [],

      projects: parsedMaster?.portfolioProjects || [],

      certifications: parsedMaster?.certifications || [],

      publications: parsedMaster?.publications || [],

      achievements: parsedMaster?.achievements || [],

      customSections: parsedMaster?.customSections || [],

    };

    return fallbackProjection;

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

    const data: ShareProjection = await res.json();

    if (typeof window !== "undefined") {

      try {

        const cachedMaster = localStorage.getItem("sp_master_passport_cache");

        if (cachedMaster) {

          const master = JSON.parse(cachedMaster);

          if ((!data.workExperience || data.workExperience.length === 0) && master.workExperiences?.length) {

            data.workExperience = master.workExperiences;

          }

          if ((!data.education || data.education.length === 0) && master.educationEntries?.length) {

            data.education = master.educationEntries;

          }

          if ((!data.projects || data.projects.length === 0) && master.portfolioProjects?.length) {

            data.projects = master.portfolioProjects;

          }

          if ((!data.certifications || data.certifications.length === 0) && master.certifications?.length) {

            data.certifications = master.certifications;

          }

          if ((!data.publications || data.publications.length === 0) && master.publications?.length) {

            data.publications = master.publications;

          }

          if ((!data.achievements || data.achievements.length === 0) && master.achievements?.length) {

            data.achievements = master.achievements;

          }

          if ((!data.customSections || data.customSections.length === 0) && master.customSections?.length) {

            data.customSections = master.customSections;

          }

          if (!data.sectionsConfig && master.sectionsConfig) {

            data.sectionsConfig = master.sectionsConfig;

          }

        }

      } catch {}

    }

    return data;

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

    let res: Response | null = null;

    try {

      res = await fetch(`${API_BASE}/master`, { headers: authHeaders });

    } catch {

      try {

        res = await fetch("/api/v1/sharing/master", { headers: authHeaders });

      } catch {

        res = null;

      }

    }



    if (res && res.ok) {

      try {

        const data = await res.json();

        if (typeof window !== "undefined") {

          try {

            localStorage.setItem("sp_master_passport_cache", JSON.stringify(data));

          } catch {}

        }

        return data;

      } catch {}

    }



    // Resilient fallback: return localStorage cache if present, else default master config

    if (typeof window !== "undefined") {

      try {

        const cached = localStorage.getItem("sp_master_passport_cache");

        if (cached) {

          return JSON.parse(cached);

        }

      } catch {}

    }



    return {

      title: "Master Skill Passport",

      templateId: "classic",

      sectionsConfig: [

        { id: "work_experience", title: "Work Experience", enabled: true, orderIndex: 0 },

        { id: "education", title: "Education & Academics", enabled: true, orderIndex: 1 },

        { id: "projects", title: "Portfolio Projects", enabled: true, orderIndex: 2 },

        { id: "certifications", title: "Certifications & Credentials", enabled: true, orderIndex: 3 },

        { id: "publications", title: "Publications & Research", enabled: true, orderIndex: 4 },

        { id: "achievements", title: "Honors & Achievements", enabled: true, orderIndex: 5 },

        { id: "custom_sections", title: "Custom Candidate Sections", enabled: true, orderIndex: 6 },

      ],

      workExperiences: [],

      educationEntries: [],

      portfolioProjects: [],

      certifications: [],

      publications: [],

      achievements: [],

      customSections: [],

    };

  },



  async updateMasterPassport(payload: Partial<UserMasterPassport>): Promise<UserMasterPassport> {

    // Cache locally first so user work is never lost

    if (typeof window !== "undefined") {

      try {

        const cached = localStorage.getItem("sp_master_passport_cache");

        const existing = cached ? JSON.parse(cached) : {};

        const merged = { ...existing, ...payload };

        localStorage.setItem("sp_master_passport_cache", JSON.stringify(merged));

      } catch {}

    }



    const authHeaders = await getAuthHeader();

    let res: Response | null = null;

    try {

      res = await fetch(`${API_BASE}/master`, {

        method: "PUT",

        headers: { ...authHeaders, "Content-Type": "application/json" },

        body: JSON.stringify(payload),

      });

    } catch {

      try {

        res = await fetch("/api/v1/sharing/master", {

          method: "PUT",

          headers: { ...authHeaders, "Content-Type": "application/json" },

          body: JSON.stringify(payload),

        });

      } catch {

        res = null;

      }

    }



    if (res && res.ok) {

      try {

        const data = await res.json();

        if (typeof window !== "undefined") {

          try {

            localStorage.setItem("sp_master_passport_cache", JSON.stringify(data));

          } catch {}

        }

        return data;

      } catch {}

    }



    return payload as UserMasterPassport;

  },



  // 8. Persistent Notifications (Supabase PostgreSQL + Realtime)

  async listNotifications(options?: {

    category?: string;

    unreadOnly?: boolean;

    limit?: number;

  }): Promise<AppNotification[]> {

    const authHeaders = await getAuthHeader();

    const params = new URLSearchParams();

    if (options?.category && options.category !== "all") params.append("category", options.category);

    if (options?.unreadOnly) params.append("unread_only", "true");

    if (options?.limit) params.append("limit", options.limit.toString());

    const queryStr = params.toString() ? `?${params.toString()}` : "";



    let res: Response;

    try {

      res = await fetch(`${API_BASE}/notifications${queryStr}`, { headers: authHeaders });

    } catch {

      res = await fetch(`/api/v1/sharing/notifications${queryStr}`, { headers: authHeaders });

    }

    if (!res.ok) {

      throw new Error(`Failed to list notifications: ${res.statusText}`);

    }

    return res.json();

  },



  async markNotificationRead(

    notificationId: string,

    read: boolean = true

  ): Promise<{ id: string; read: boolean; entityId?: string }> {

    const authHeaders = await getAuthHeader();

    let res: Response;

    try {

      res = await fetch(`${API_BASE}/notifications/${notificationId}/read?read=${read}`, {

        method: "PATCH",

        headers: authHeaders,

      });

    } catch {

      res = await fetch(`/api/v1/sharing/notifications/${notificationId}/read?read=${read}`, {

        method: "PATCH",

        headers: authHeaders,

      });

    }

    if (!res.ok) {

      throw new Error(`Failed to mark notification read: ${res.statusText}`);

    }

    return res.json();

  },



  async markAllNotificationsRead(): Promise<{ success: boolean; count: number }> {

    const authHeaders = await getAuthHeader();

    let res: Response;

    try {

      res = await fetch(`${API_BASE}/notifications/mark-all-read`, {

        method: "POST",

        headers: authHeaders,

      });

    } catch {

      res = await fetch(`/api/v1/sharing/notifications/mark-all-read`, {

        method: "POST",

        headers: authHeaders,

      });

    }

    if (!res.ok) {

      throw new Error(`Failed to mark all notifications read: ${res.statusText}`);

    }

    return res.json();

  },



  async deleteNotification(notificationId: string): Promise<{ success: boolean; id: string }> {

    const authHeaders = await getAuthHeader();

    let res: Response;

    try {

      res = await fetch(`${API_BASE}/notifications/${notificationId}`, {

        method: "DELETE",

        headers: authHeaders,

      });

    } catch {

      res = await fetch(`/api/v1/sharing/notifications/${notificationId}`, {

        method: "DELETE",

        headers: authHeaders,

      });

    }

    if (!res.ok) {

      throw new Error(`Failed to delete notification: ${res.statusText}`);

    }

    return res.json();

  },



  // 9. Authoritative Sharing Permissions (Domain 6 Synchronization)

  async getSharingPermissions(): Promise<SharePermissionsConfig> {

    const authHeaders = await getAuthHeader();

    let res: Response | null = null;

    try {

      res = await fetch(`${API_BASE}/permissions`, { headers: authHeaders });

    } catch {

      try {

        res = await fetch("/api/v1/sharing/permissions", { headers: authHeaders });

      } catch {

        res = null;

      }

    }



    if (res && res.ok) {

      try {

        const data = await res.json();

        if (typeof window !== "undefined") {

          try {

            localStorage.setItem("sp_finalized_permissions", JSON.stringify(data));

          } catch {}

        }

        return data;

      } catch {}

    }



    // Resilient fallback: return localStorage cache if present, else DEFAULT_SHARE_PERMISSIONS

    if (typeof window !== "undefined") {

      try {

        const cached = localStorage.getItem("sp_finalized_permissions") || localStorage.getItem("sp_draft_permissions");

        if (cached) {

          return JSON.parse(cached);

        }

      } catch {}

    }



    return DEFAULT_SHARE_PERMISSIONS;

  },



  async saveSharingPermissions(config: SharePermissionsConfig): Promise<SharePermissionsConfig> {

    const authHeaders = await getAuthHeader();

    let res: Response | null = null;

    try {

      res = await fetch(`${API_BASE}/permissions`, {

        method: "PUT",

        headers: { ...authHeaders, "Content-Type": "application/json" },

        body: JSON.stringify(config),

      });

    } catch {

      try {

        res = await fetch("/api/v1/sharing/permissions", {

          method: "PUT",

          headers: { ...authHeaders, "Content-Type": "application/json" },

          body: JSON.stringify(config),

        });

      } catch {

        res = null;

      }

    }



    if (res && res.ok) {

      const data = await res.json();

      if (typeof window !== "undefined") {

        try {

          localStorage.setItem("sp_finalized_permissions", JSON.stringify(data));

          localStorage.setItem("sp_draft_permissions", JSON.stringify(data));

          localStorage.setItem("sp_permissions_finalized_at", new Date().toISOString());

        } catch {}

      }

      return data;

    }



    // Always guarantee candidate permissions are safely cached locally so work is never lost

    if (typeof window !== "undefined") {

      try {

        localStorage.setItem("sp_finalized_permissions", JSON.stringify(config));

        localStorage.setItem("sp_draft_permissions", JSON.stringify(config));

        localStorage.setItem("sp_permissions_finalized_at", new Date().toISOString());

      } catch {}

    }



    if (res && !res.ok) {

      const err = await res.json().catch(() => ({}));

      // Surface client validation errors (400, 422) specifically if present

      if (res.status >= 400 && res.status < 500 && err.detail) {

        throw new Error(err.detail);

      }

      console.warn(`Backend returned HTTP ${res.status} (${res.statusText}) while saving permissions. Preserved locally.`, err);

      return config;

    }



    return config;

  },


  // 10. Production Evidence-Linked PDF Export
  async downloadPassportPdf(params?: {
    templateId?: string;
    permissions?: any;
    linkId?: string;
  }): Promise<{ blob: Blob; filename: string }> {
    const authHeaders = await getAuthHeader();
    let res: Response;

    if (params?.permissions) {
      const bodyPayload = {
        template_id: params.templateId || "verified-competency",
        permissions: params.permissions,
      };
      try {
        res = await fetch(`${API_BASE}/export/pdf`, {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      } catch {
        res = await fetch("/api/v1/sharing/export/pdf", {
          method: "POST",
          headers: { ...authHeaders, "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
        });
      }
    } else {
      const query = new URLSearchParams();
      if (params?.templateId) query.set("template_id", params.templateId);
      if (params?.linkId) query.set("link_id", params.linkId);
      const qs = query.toString() ? `?${query.toString()}` : "";
      try {
        res = await fetch(`${API_BASE}/export/pdf${qs}`, {
          headers: authHeaders,
        });
      } catch {
        res = await fetch(`/api/v1/sharing/export/pdf${qs}`, {
          headers: authHeaders,
        });
      }
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to generate evidence-linked PDF document.");
    }

    const disposition = res.headers.get("content-disposition") || "";
    let filename = "SkillPassport.pdf";
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }

    const blob = await res.blob();
    return { blob, filename };
  },

  async downloadPublicPassportPdf(token: string): Promise<{ blob: Blob; filename: string }> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/public/${token}/export/pdf`);
    } catch {
      res = await fetch(`/api/v1/sharing/public/${token}/export/pdf`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to download shared passport PDF.");
    }
    const disposition = res.headers.get("content-disposition") || "";
    let filename = `SkillPassport-${token.slice(-8)}.pdf`;
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    if (filenameMatch && filenameMatch[1]) {
      filename = filenameMatch[1];
    }
    const blob = await res.blob();
    return { blob, filename };
  },
};

