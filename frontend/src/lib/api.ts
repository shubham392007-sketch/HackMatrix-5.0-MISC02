import type {
  LearnersResponse,
  CompetenciesResponse,
  RetentionAssessment,
  SimulationResult,
  RecommendationsResponse,
  GrowthNarrative,
  PeerBenchmark,
  ConfidenceDecay,
  TeamHeatmap,
  EvidenceResponse,
  TrajectoryPrediction,
  WhatIfSimulationRequest,
  WhatIfSimulationResponse,
  Evidence,
  Recommendation,
} from "./types";
import { supabase } from "./supabase";

const BASE = "";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const authHeader: Record<string, string> = {};
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      authHeader["Authorization"] = `Bearer ${session.access_token}`;
    }
  } catch {
    // Non-blocking fallback
  }

  const res = await fetch(`${BASE}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/* ── Feature 1: Evidence Intelligence ────────────────────── */

export const evidence = {
  list: (employeeId: string, limit = 50, offset = 0) =>
    request<EvidenceResponse>(
      `/api/evidence/${employeeId}?limit=${limit}&offset=${offset}`
    ),

  search: (employeeId: string, query: string, competency?: string) =>
    request<{
      employee_id: string;
      query: string;
      retrieved_count: number;
      evidence: Array<{
        evidence_id: string;
        source: string;
        source_type: string;
        source_reference: string;
        title: string;
        content: string;
        occurred_at: string;
        project_name?: string;
        similarity_score?: number;
        metadata: Record<string, unknown>;
      }>;
    }>(`/api/rag/search`, {
      method: "POST",
      body: JSON.stringify({ employee_id: employeeId, query, competency, limit: 5 }),
    }),

  justify: (employeeId: string, competency: string, question: string) =>
    request<{
      competency: string;
      action?: string | null;
      justification: string;
      evidence_refs: string[];
      confidence: number;
      evidence_sufficiency: string;
      retrieved_evidence?: Array<{
        evidence_id: string;
        source: string;
        source_type: string;
        source_reference: string;
        title: string;
        content: string;
        occurred_at: string;
        project_name?: string;
        similarity_score?: number;
        metadata: Record<string, unknown>;
      }>;
    }>(`/api/rag/justify`, {
      method: "POST",
      body: JSON.stringify({ employee_id: employeeId, competency, question, request_context: question }),
    }),
};

export const profile = {
  me: () => request<any>("/api/profile/me"),
  update: (data: {
    full_name?: string;
    job_title?: string;
    department?: string;
    avatar_url?: string;
    onboarding_completed?: boolean;
  }) =>
    request<any>("/api/profile/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  integrations: () => request<Record<string, any>>("/api/profile/integrations"),
  updateGithub: (data: {
    token: string;
    username?: string;
    repository_owner?: string;
    repository_name?: string;
  }) =>
    request<any>("/api/profile/integrations/github", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateJira: (data: {
    base_url: string;
    email: string;
    api_token: string;
    project_key?: string;
  }) =>
    request<any>("/api/profile/integrations/jira", {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  disconnect: (provider: string) =>
    request<{ success: boolean; message: string }>(`/api/profile/integrations/${provider}`, {
      method: "DELETE",
    }),
  validateGithub: (data: { token: string; repository_owner?: string; repository_name?: string }) =>
    request<{ valid: boolean; username?: string; message: string; rate_limit_remaining?: number }>(
      "/api/profile/validate/github",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
  validateJira: (data: { base_url: string; email: string; api_token: string; project_key?: string }) =>
    request<{ valid: boolean; display_name?: string; message: string }>(
      "/api/profile/validate/jira",
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
};

export const integrations = {
  githubStatus: () =>
    request<{ provider: string; configured: boolean; status: string; details: Record<string, unknown> }>(
      `/api/integrations/github/status`
    ),
  testGithub: () =>
    request<Record<string, unknown>>(`/api/integrations/github/test`, {
      method: "POST",
    }),
  syncGithub: (params: {
    owner?: string;
    repo?: string;
    limit_commits?: number;
    limit_prs?: number;
    run_ai_extraction?: boolean;
    target_employee_id?: string;
  } = {}) =>
    request<Record<string, unknown>>(`/api/integrations/github/sync`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
  jiraStatus: () =>
    request<{ provider: string; configured: boolean; status: string; details: Record<string, unknown> }>(
      `/api/integrations/jira/status`
    ),
  testJira: () =>
    request<Record<string, unknown>>(`/api/integrations/jira/test`, {
      method: "POST",
    }),
  syncJira: (params: {
    project_key?: string;
    max_issues?: number;
    run_ai_extraction?: boolean;
    target_employee_id?: string;
  } = {}) =>
    request<Record<string, unknown>>(`/api/integrations/jira/sync`, {
      method: "POST",
      body: JSON.stringify(params),
    }),
  runHistory: (source?: string) =>
    request<{ runs: Array<Record<string, unknown>> }>(
      `/api/ingestion/runs${source ? `?source=${source}` : ""}`
    ),
};

/* ── Feature 2: Trajectory & Retention ───────────────────── */

export const trajectory = {
  learners: (limit = 15) =>
    request<LearnersResponse>(`/api/v1/learners?limit=${limit}`),

  competencies: (learnerId: string) =>
    request<CompetenciesResponse>(
      `/api/v1/learner/${learnerId}/competencies`
    ),

  retention: (learnerId: string, competencyId?: string) => {
    const url = competencyId
      ? `/api/v1/learner/${learnerId}/retention?competency_id=${competencyId}`
      : `/api/v1/learner/${learnerId}/retention`;
    return request<RetentionAssessment>(url);
  },

  simulate: (
    learnerId: string,
    competencyId: string,
    actionType: string,
    simulatedScore: number
  ) =>
    request<SimulationResult>(
      `/api/v1/learner/${learnerId}/retention/simulate`,
      {
        method: "POST",
        body: JSON.stringify({
          competency_id: competencyId,
          action_type: actionType,
          simulated_score: simulatedScore,
        }),
      }
    ),

  whatIfActions: () =>
    request<{ actions: Array<{ id: string; label: string; type: string }> }>(
      `/api/v1/what-if/actions`
    ),

  /* Continuous Feature 2 LSTM endpoints */
  allTrajectories: (employeeId: string) =>
    request<TrajectoryPrediction[]>(`/api/v1/trajectories/${employeeId}`),

  singleTrajectory: (employeeId: string, competencyId: string) =>
    request<TrajectoryPrediction>(`/api/v1/trajectories/${employeeId}/${competencyId}`),

  simulateTrajectory: (req: WhatIfSimulationRequest) =>
    request<WhatIfSimulationResponse>(`/api/v1/trajectories/simulate`, {
      method: "POST",
      body: JSON.stringify(req),
    }),

  modelStatus: () =>
    request<Record<string, unknown>>(`/api/v1/model/status`),

  modelEvaluation: () =>
    request<Record<string, unknown>>(`/api/v1/model/evaluation`),
};

export const trajectoryApi = trajectory;

/* ── Feature 3: Recommendations ──────────────────────────── */

export const recommendations = {
  get: (learnerId: string, explain = true) =>
    request<RecommendationsResponse>(
      `/api/v1/learner/${learnerId}/recommendations?explain=${explain}`
    ),

  generate: (employeeId: string) =>
    request<{ status: string; count: number; recommendations: Recommendation[] }>(
      `/api/v1/recommendations/generate/${employeeId}`,
      { method: "POST" }
    ),

  updateStatus: (recommendationId: string, status: "started" | "completed" | "dismissed") =>
    request<{ id: string; status: string; updated_at: string }>(
      `/api/v1/recommendations/${recommendationId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }
    ),

  requestMentorship: (
    menteeId: string,
    mentorId: string,
    competencyId: string,
    recommendationId?: string,
    note?: string,
    managerId?: string
  ) =>
    request<{ id: string; status: string; message: string }>(
      `/api/v1/recommendations/mentorship/request`,
      {
        method: "POST",
        body: JSON.stringify({
          mentee_id: menteeId,
          mentor_id: mentorId,
          competency_id: competencyId,
          recommendation_id: recommendationId,
          note,
          manager_id: managerId,
        }),
      }
    ),

  pairings: (employeeId?: string) =>
    request<{ pairings: Array<Record<string, any>> }>(
      `/api/v1/recommendations/mentorship/requests${employeeId ? `?employee_id=${employeeId}` : ""}`
    ),

  updatePairingStatus: (pairingId: string, status: string, feedback?: string) =>
    request<{ id: string; status: string; updated_at: string }>(
      `/api/v1/recommendations/mentorship/${pairingId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status, feedback }),
      }
    ),

  catalog: () =>
    request<{ rules: Array<Record<string, any>> }>(
      `/api/v1/recommendations/catalog`
    ),
};

/* ── Feature 4: Growth Intelligence ──────────────────────── */

export const intelligence = {
  narrative: (learnerId: string) =>
    request<GrowthNarrative>(`/feature4/api/narrative/${learnerId}`),

  benchmark: (learnerId: string, competencyId: string) =>
    request<PeerBenchmark>(
      `/feature4/api/benchmark/${learnerId}/${competencyId}`
    ),

  confidenceDecay: (learnerId: string, competencyId: string) =>
    request<ConfidenceDecay>(
      `/feature4/api/confidence-decay/${learnerId}/${competencyId}`
    ),

  teamHeatmap: (teamId: string) =>
    request<TeamHeatmap>(`/feature4/api/heatmap/team/${teamId}`),
};

/* ── Manager Evidence Intelligence ───────────────────────── */

export interface ManagerTeamMember {
  id: string;
  name: string;
  email: string;
  role?: string;
  department?: string;
  feature4_status?: string;
  feature3_status?: string;
  evidence_count: number;
  competency_count?: number;
  competencies?: string[];
  last_evidence_at?: string;
}

export interface ManagerTeamOverview {
  manager_id: string;
  team_members: ManagerTeamMember[];
  total_evidence: number;
  total_members: number;
  competencies_represented?: number;
  evidence_sources?: number;
  latest_evidence?: string;
  sources_breakdown: Record<string, number>;
  competency_coverage?: Record<string, number>;
}

export interface ManagerEmployeeEvidence {
  employee_id: string;
  employee_name: string;
  department?: string;
  role?: string;
  feature4_status?: string;
  count: number;
  evidence: Evidence[];
  sources_breakdown: Record<string, number>;
  competencies_detected: string[];
  competency_counts?: Record<string, number>;
}

export interface ManagerEmployeeSummary {
  employee_id: string;
  employee_name: string;
  department?: string;
  role?: string;
  feature4_status?: string;
  feature3_status?: string;
  evidence_count: number;
  sources: Record<string, number>;
  competencies_detected: string[];
  competency_counts?: Record<string, number>;
  freshest_evidence_at?: string;
  oldest_evidence_at?: string;
}

export const managerEvidence = {
  teamOverview: (department?: string, search?: string) =>
    request<ManagerTeamOverview>(
      `/api/manager/evidence/team?${[
        department ? `department=${encodeURIComponent(department)}` : "",
        search ? `search=${encodeURIComponent(search)}` : "",
      ].filter(Boolean).join("&")}`
    ),

  feature4Participants: (department?: string, search?: string) =>
    request<ManagerTeamOverview>(
      `/api/manager/evidence/feature4-participants?${[
        department ? `department=${encodeURIComponent(department)}` : "",
        search ? `search=${encodeURIComponent(search)}` : "",
      ].filter(Boolean).join("&")}`
    ),

  employeeEvidence: (
    employeeId: string,
    limit = 50,
    offset = 0,
    sourceFilter?: string,
    competencyFilter?: string,
    search?: string
  ) =>
    request<ManagerEmployeeEvidence>(
      `/api/manager/evidence/team/${employeeId}?${[
        `limit=${limit}`,
        `offset=${offset}`,
        sourceFilter ? `source_filter=${encodeURIComponent(sourceFilter)}` : "",
        competencyFilter ? `competency_filter=${encodeURIComponent(competencyFilter)}` : "",
        search ? `search=${encodeURIComponent(search)}` : "",
      ].filter(Boolean).join("&")}`
    ),

  employeeSummary: (employeeId: string) =>
    request<ManagerEmployeeSummary>(
      `/api/manager/evidence/team/${employeeId}/summary`
    ),

  evidenceDetail: (employeeId: string, evidenceId: string) =>
    request<any>(`/api/manager/evidence/team/${employeeId}/evidence/${evidenceId}`),

  competenciesBreakdown: (employeeId: string) =>
    request<any[]>(`/api/manager/evidence/team/${employeeId}/competencies`),

  askRAG: (employeeId: string, question: string, competency?: string) =>
    request<{
      competency: string;
      action?: string;
      justification: string;
      evidence_refs: string[];
      confidence: number;
      evidence_sufficiency: string;
    }>(`/api/manager/evidence/team/${employeeId}/ask`, {
      method: "POST",
      body: JSON.stringify({ question, competency }),
    }),

  departments: () =>
    request<{ departments: string[] }>(`/api/manager/evidence/departments`),
};

/* ── Manager Trajectory Intelligence ─────────────────────── */

export interface ManagerTrajectoryTeamMember {
  employee_id: string;
  name: string;
  email: string;
  department?: string;
  competency_count: number;
  total_evidence: number;
  average_confidence: number;
  trend_distribution: {
    improving: number;
    stagnating: number;
    declining: number;
    insufficient_evidence: number;
  };
  dominant_trend: "attention_needed" | "improving" | "stagnating" | "insufficient_evidence" | "no_data";
  latest_evidence_at?: string;
}

export interface ManagerTrajectoryTeamOverview {
  team_members: ManagerTrajectoryTeamMember[];
  total_members: number;
  total_competencies_tracked: number;
  trend_distribution: {
    improving: number;
    stagnating: number;
    declining: number;
    insufficient_evidence: number;
  };
  average_confidence: number;
  department_filter?: string;
}

export interface ManagerEmployeeTrajectories {
  employee_id: string;
  employee_name: string;
  department?: string;
  trajectory_count: number;
  trajectories: TrajectoryPrediction[];
}

export interface ManagerCompetencyTrend {
  competency_id: string;
  competency_name: string;
  employee_count: number;
  trend_distribution: {
    improving: number;
    stagnating: number;
    declining: number;
    insufficient_evidence: number;
  };
  health: "healthy" | "at_risk" | "critical";
}

export interface ManagerTeamTrends {
  competency_trends: ManagerCompetencyTrend[];
  total_employees: number;
  department_filter?: string;
}

export const managerTrajectory = {
  teamOverview: (department?: string) =>
    request<ManagerTrajectoryTeamOverview>(
      `/api/manager/trajectory/team${department ? `?department=${encodeURIComponent(department)}` : ""}`
    ),

  employeeTrajectories: (employeeId: string, refresh = false) =>
    request<ManagerEmployeeTrajectories>(
      `/api/manager/trajectory/team/${employeeId}${refresh ? "?refresh=true" : ""}`
    ),

  singleCompetency: (employeeId: string, competencyId: string, refresh = false) =>
    request<TrajectoryPrediction>(
      `/api/manager/trajectory/team/${employeeId}/${competencyId}${refresh ? "?refresh=true" : ""}`
    ),

  teamTrends: (department?: string) =>
    request<ManagerTeamTrends>(
      `/api/manager/trajectory/trends${department ? `?department=${encodeURIComponent(department)}` : ""}`
    ),

  departments: () =>
    request<{ departments: string[] }>(`/api/manager/trajectory/departments`),
};

/* ── Health Check ────────────────────────────────────────── */

export const health = {
  check: () =>
    request<{
      status: string;
      app: string;
      version: string;
      services: Record<string, { status: string; connected: boolean }>;
    }>(`/api/health`),
};
