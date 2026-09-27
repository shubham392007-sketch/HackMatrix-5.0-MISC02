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

  search: (employeeId: string, query: string) =>
    request<{
      results: Array<{
        content: string;
        metadata: Record<string, unknown>;
        score: number;
      }>;
    }>(`/api/rag/search`, {
      method: "POST",
      body: JSON.stringify({ employee_id: employeeId, query, top_k: 5 }),
    }),

  justify: (employeeId: string, competency: string, question: string) =>
    request<{
      competency: string;
      action: string;
      justification: string;
      evidence_refs: string[];
      confidence: number;
      evidence_sufficiency: string;
    }>(`/api/rag/justify`, {
      method: "POST",
      body: JSON.stringify({ employee_id: employeeId, competency, question }),
    }),
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

/* ── Feature 3: Recommendations ──────────────────────────── */

export const recommendations = {
  get: (learnerId: string) =>
    request<RecommendationsResponse>(
      `/api/v1/learner/${learnerId}/recommendations`
    ),

  requestMentorship: (
    managerId: string,
    mentorId: string,
    menteeId: string,
    competencyId: string
  ) =>
    request<{ status: string }>(`/api/v1/manager/mentorship/request`, {
      method: "POST",
      body: JSON.stringify({
        manager_id: managerId,
        mentor_id: mentorId,
        mentee_id: menteeId,
        competency_id: competencyId,
      }),
    }),
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
