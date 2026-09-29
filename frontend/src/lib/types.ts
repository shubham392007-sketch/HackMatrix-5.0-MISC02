/* ── Core Domain Types ──────────────────────────────────── */

export type TrendDirection = "improving" | "stagnating" | "declining" | "insufficient";

export interface Learner {
  learner_id: string;
  name: string;
  department: string;
  active_competencies: number;
  total_evidence: number;
  role?: string;
  tenure_months?: number;
}

export interface Competency {
  competency_id: string;
  competency_name: string;
  current_score: number;
  trend: TrendDirection;
  confidence: number;
  evidence_count: number;
  last_evidence_date: string;
  days_since_last: number;
}

export interface RetentionAssessment {
  learner_id: string;
  competency_id: string;
  competency_name: string;
  historical_trend: TrendDirection;
  historical_trend_confidence: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  decay_probability_30d: number;
  decay_probability_60d: number;
  decay_probability_90d: number;
  decay_probability_180d: number;
  estimated_retention_half_life_days: number;
  prediction_confidence: number;
  risk_factors: string[];
  survival_curve: Array<{ day: number; probability: number }>;
  evidence_timeline: Array<{
    date: string;
    score: number;
    source: string;
    title: string;
  }>;
  recommendations: Array<{
    action: string;
    rationale: string;
    estimated_impact: string;
  }>;
  freshness: number;
  cross_competency_overview?: Array<{
    competency_id: string;
    competency_name: string;
    risk_score: number;
    risk_level: string;
    trend: TrendDirection;
  }>;
}

export interface SimulationResult {
  learner_id: string;
  competency_id: string;
  baseline: {
    trend: TrendDirection;
    risk_score: number;
    risk_level: string;
    half_life_days: number;
  };
  projected: {
    trend: TrendDirection;
    risk_score: number;
    risk_level: string;
    half_life_days: number;
    projected_curve: Array<{ day: number; probability: number }>;
  };
  risk_delta: number;
  model_estimated_effect: string;
  confidence: number;
}

export interface ResourceDeepLink {
  video_id: string;
  video_url: string;
  deep_link_url: string;
  title: string;
  channel_title?: string;
  thumbnail_url?: string;
  duration?: string;
  timestamp_seconds?: number;
  timestamp_formatted?: string;
  matched_topic?: string;
  matched_snippet?: string;
  timestamp_available: boolean;
}

export interface MentorSuggestion {
  mentor_id: string;
  mentor_name: string;
  mentor_email?: string;
  mentor_department?: string;
  competency_id?: string;
  competency_name?: string;
  mentor_trend?: string;
  mentor_confidence?: number;
  pairing_status?: string;
  pairing_id?: string;
}

export interface RecommendationExplanation {
  action: string;
  action_type: string;
  target_gap: string;
  reason: string;
  expected_benefit: string;
  evidence_refs: string[];
  confidence: number;
}

export interface Recommendation {
  id?: string;
  competency: string;
  trend?: string;
  confidence?: number;
  priority?: "HIGH" | "MEDIUM" | "LOW";
  action: string;
  action_type?: "micro_learning" | "peer_mentorship" | "evidence_gathering";
  status?: "generated" | "viewed" | "started" | "completed" | "dismissed" | "expired";
  justification?: string;
  evidence_ref?: string;
  evidence_refs?: string[];
  supporting_evidence_details?: Array<{
    id: string;
    title?: string;
    source?: string;
    content?: string;
    occurred_at?: string;
  }>;
  external_link?: string;
  resource?: ResourceDeepLink;
  mentor_suggestion?: MentorSuggestion;
  ai_explanation?: RecommendationExplanation;
  created_at?: string;
}

/* ── Feature 4 Types ─────────────────────────────────────── */

export interface GrowthNarrative {
  learner_id: string;
  narrative: string;
  manager_briefing: {
    key_improvements: string[];
    stagnating_areas: string[];
    suggested_focus: string[];
  };
  claims: Array<{
    claim: string;
    evidence_ids: string[];
    confidence: number;
  }>;
  generated_at: string;
  evidence_sources: number;
  competencies_analyzed: number;
  confidence_level: string;
}

export interface PeerBenchmark {
  learner_id: string;
  competency_id: string;
  competency_name: string;
  percentile: number;
  cohort_size: number;
  comparison: string;
  time_period: string;
  privacy_safe: boolean;
  benchmark_available: boolean;
  message?: string;
}

export interface ConfidenceDecay {
  learner_id: string;
  competency_id: string;
  competency_name: string;
  current_confidence: number;
  freshness_score: number;
  freshness_label: string;
  days_since_last_evidence: number;
  decay_curve: Array<{
    day: number;
    confidence: number;
    upper_band: number;
    lower_band: number;
  }>;
}

export interface HeatmapMember {
  learner_id: string;
  name: string;
  competencies: Record<string, {
    trend: TrendDirection;
    confidence: number;
    score: number;
  }>;
}

export interface TeamHeatmap {
  team_id: string;
  team_name: string;
  members: HeatmapMember[];
  competency_names: string[];
  patterns: Array<{
    competency: string;
    observation: string;
    severity: string;
  }>;
}

/* ── Evidence Types ──────────────────────────────────────── */

export interface Evidence {
  id: string;
  source: string;
  source_type: string;
  title: string;
  content: string;
  occurred_at: string;
  evidence_strength: number;
  skills: string[];
  competencies: string[];
  project_name?: string;
  ai_summary?: string;
  raw_evidence?: string;
  raw_score?: number;
  ai_interpretation?: string;
}


/* ── API Response Wrappers ───────────────────────────────── */

export interface LearnersResponse {
  learners: Learner[];
}

export interface CompetenciesResponse {
  learner_id: string;
  competencies: Competency[];
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
}

export interface EvidenceResponse {
  employee_id: string;
  count: number;
  evidence: Evidence[];
}

/* ── Feature 2: Competency Trajectory & ML Types ─────────── */

export interface TrajectoryProbabilities {
  improving: number;
  stagnating: number;
  declining: number;
}

export interface TrajectoryPrediction {
  id: string;
  employee_id: string;
  organization_id?: string;
  competency_id: string;
  competency_name: string;
  trend: "improving" | "stagnating" | "declining" | "insufficient_evidence";
  probabilities: TrajectoryProbabilities;
  confidence: number;
  freshness: "fresh" | "recent" | "aging" | "stale";
  days_since_last_evidence: number;
  evidence_count: number;
  last_evidence_at?: string;
  first_evidence_at?: string;
  insufficient_evidence: boolean;
  model_version: string;
  generated_at: string;
  supporting_evidence_ids: string[];
  supporting_evidence_titles: string[];
  explanation?: string;
  is_simulated?: boolean;
  evidence_timeline?: Array<{
    date: string;
    score: number;
    source?: string;
    title?: string;
    source_type?: string;
    evidence_id?: string;
    isObserved?: boolean;
  }>;
}


export interface WhatIfSimulationRequest {
  employee_id: string;
  competency_id: string;
  action_type: string;
  simulated_score: number;
  days_from_now?: number;
  simulated_description?: string;
}

export interface WhatIfSimulationResponse {
  employee_id: string;
  competency_id: string;
  competency_name: string;
  baseline: TrajectoryPrediction;
  projected: TrajectoryPrediction;
  trend_changed: boolean;
  probability_delta: Record<string, number>;
  confidence_delta: number;
  simulated_action: Record<string, unknown>;
  disclaimer: string;
}
