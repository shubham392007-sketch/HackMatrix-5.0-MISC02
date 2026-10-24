export type StepStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "completed"
  | "needs_remediation";

export type TopicDifficulty = "Beginner" | "Intermediate" | "Advanced";

export interface LearningTopic {
  id: string;
  title: string;
  description: string;
  difficulty: TopicDifficulty;
  estimated_minutes: number;
  learning_objective: string;
  prerequisites: string[]; // Topic IDs that must be completed
  related_skill_id?: string; // Canonical skill id (e.g. "skill-python")
  knowledge_signal: number; // 0-100
  practice_signal: number; // 0-100
  assessment_signal: number; // 0-100
  project_signal: number; // 0-100
  current_mastery: number; // 0.30 K + 0.25 P + 0.20 A + 0.25 Prj
  target_mastery: number;
  status: StepStatus;
}

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  topics: LearningTopic[];
}

export interface DomainBlueprint {
  domain_id: string;
  title: string;
  version: string;
  status: "active" | "draft" | "archived";
  description: string;
  target_mastery: number;
  estimated_hours: number;
  learning_objectives: string[];
  modules: LearningModule[];
}

export interface DiagnosticQuestion {
  id: string;
  question_text: string;
  domain_id: string;
  module_id: string;
  topic_id: string;
  category: "concept" | "reasoning" | "implementation" | "application";
  options: string[];
  correct_index: number;
  code_snippet?: string;
  explanation: string;
}

export interface DiagnosticResult {
  attempt_id: string;
  domain_id: string;
  completed_at: string;
  overall_score: number;
  concept_score: number;
  reasoning_score: number;
  implementation_score: number;
  application_score: number;
  topic_scores: Record<string, number>;
  strong_topics: string[];
  weak_topics: string[];
  prerequisite_weaknesses: string[];
  recommended_focus: string[];
}

export interface RoadmapStep {
  step_id: string;
  topic_id: string;
  module_id: string;
  title: string;
  learning_objective: string;
  difficulty: TopicDifficulty;
  estimated_minutes: number;
  current_mastery: number;
  target_mastery: number;
  prerequisite_ids: string[];
  prerequisites_met: boolean;
  status: StepStatus;
  recommendation_reason: string;
  recommended_resource_ids: string[];
  practice_exercise_ids: string[];
  assessment_id?: string;
  project_id?: string;
}

export interface LearningRoadmap {
  id?: string;
  path_id: string;
  domain_id: string;
  domain_title: string;
  blueprint_version?: string;
  target_role_id?: string;
  target_role_title?: string;
  generation_method?: string;
  ai_model?: string;
  latency_seconds?: number;
  baseline_mastery: number;
  current_mastery: number;
  target_mastery: number;
  total_steps?: number;
  completed_steps?: number;
  study_hours_per_week?: number;
  preference?: "text-first" | "video-first" | "practice-first";
  pace?: "standard" | "fast_track";
  steps: RoadmapStep[];
  created_at?: string;
  updated_at?: string;
}

export interface LearningStepPacket {
  step_id: string;
  topic_id: string;
  title: string;
  learning_objective: string;
  why_this_matters: string;
  what_is_it: string;
  why_and_when: string;
  worked_example: {
    title: string;
    explanation: string;
    code?: string;
    visual_note?: string;
  };
  common_mistakes: string[];
  implementation_steps: string[];
  knowledge_check: Array<{
    question: string;
    options: string[];
    correct_index: number;
    explanation: string;
  }>;
  source_attribution: string;
}

export interface LearningResource {
  id: string;
  title: string;
  resource_type:
    | "video"
    | "article"
    | "official_docs"
    | "tutorial"
    | "practice_exercise"
    | "project_guide";
  provider: string;
  duration_minutes: number;
  difficulty: TopicDifficulty;
  domain_id: string;
  topic_id: string;
  learning_objective: string;
  description?: string;
  relevance_score: number; // Illustrative 0-100
  selection_explanation: string;
  concepts_covered: string[];
  concepts_not_covered: string[];
  roadmap_position: string;
  url: string;
  thumbnail_url?: string;
  author_or_channel?: string;
  validation_status?: string;
  is_playable?: boolean | null;
  provider_metadata?: Record<string, any>;
  is_fallback?: boolean;
}

export interface PracticeExercise {
  id: string;
  topic_id: string;
  domain_id: string;
  title: string;
  difficulty: TopicDifficulty;
  estimated_minutes: number;
  learning_objective: string;
  format:
    | "multiple_choice"
    | "code_completion"
    | "error_identification"
    | "applied_scenario";
  prompt: string;
  starter_code?: string;
  options?: string[];
  correct_index?: number;
  solution_explanation: string;
  completed: boolean;
  score?: number;
}

export interface AssessmentQuestion {
  id: string;
  text: string;
  topic_id: string;
  category: "concept" | "application";
  options: string[];
  correct_index: number;
  code_block?: string;
  explanation: string;
}

export interface KnowledgeAssessment {
  id: string;
  domain_id: string;
  title: string;
  time_limit_minutes: number;
  passing_threshold: number; // e.g. 70
  questions: AssessmentQuestion[];
}

export interface AssessmentAttempt {
  attempt_id: string;
  assessment_id: string;
  timestamp: string;
  total_score: number;
  passed: boolean;
  concept_score: number;
  application_score: number;
  objective_results: Array<{
    topic_id: string;
    score: number;
    passed: boolean;
    feedback: string;
  }>;
  feedback: string;
  needs_remediation: boolean;
  failed_topic_ids: string[];
}

export interface MiniProjectRubricItem {
  criterion: string;
  weight_pct: number;
  description: string;
}

export interface MiniProjectAttempt {
  attempt_id: string;
  project_id: string;
  submitted_at: string;
  github_repo_url: string;
  summary_notes: string;
  status: "submitted" | "evaluated";
  rubric_scores: Array<{
    criterion: string;
    score: number;
    feedback: string;
  }>;
  total_score?: number | null;
  feedback?: string;
  generated_artifact_id?: string;
  candidate_evidence_id?: string;
}

export interface MiniProject {
  id: string;
  project_id?: string;
  title: string;
  domain_id: string;
  domain_title?: string;
  skill_id?: string;
  skill_name?: string;
  gap_id?: string;
  roadmap_id?: string;
  target_role_id?: string;
  difficulty?: string;
  estimated_hours?: number;
  problem_statement: string;
  relevance_to_gap: string;
  objectives: string[];
  learning_objectives?: string[];
  required_steps: string[];
  expected_deliverables?: string[];
  implementation_requirements?: string[];
  milestones?: Array<{
    step: number;
    title: string;
    description: string;
    acceptance: string;
  }>;
  acceptance_criteria?: string[];
  dataset_description: string;
  submission_requirements: string[];
  rubric: MiniProjectRubricItem[];
  submission_instructions?: string;
  resources?: Array<{
    title: string;
    type: string;
    url_hint?: string;
  }>;
  generation_method?: string;
  ai_provider?: string;
  ai_model?: string;
  latency_seconds?: number;
  generation_status?: string;
  status: "not_started" | "in_progress" | "submitted" | "evaluated";
  submitted_attempt?: MiniProjectAttempt;
}

export interface RemediationSession {
  session_id: string;
  attempt_id: string;
  domain_id: string;
  failed_score: number;
  failed_objectives: string[];
  strong_objectives: string[];
  concept_refresher: string;
  worked_examples: Array<{
    title: string;
    explanation: string;
    code?: string;
  }>;
  guided_exercise_id: string;
  micro_test: Array<{
    question: string;
    options: string[];
    correct_index: number;
  }>;
  status: "pending" | "completed";
}

export interface LearningHistoryEvent {
  id: string;
  timestamp: string;
  type:
    | "diagnostic"
    | "step_completed"
    | "resource_viewed"
    | "practice_completed"
    | "practice_attempted"
    | "assessment_attempt"
    | "assessment_completed"
    | "project_submitted"
    | "project_evaluated"
    | "remediation_completed"
    | "roadmap_adjusted"
    | "roadmap_started"
    | "candidate_evidence_generated"
    | string;
  title: string;
  domain_id: string;
  topic_id?: string;
  step_id?: string;
  roadmap_id?: string;
  detail: string;
  link_route?: string;
  score?: number;
  activity_status?: string;
  activity_metadata?: Record<string, any>;
  created_at?: string;
}

export interface StepCompleteResponse {
  status: string;
  already_completed: boolean;
  step_id: string;
  title: string;
  current_mastery: number;
  target_mastery: number;
  completed_at: string;
  roadmap_id: string;
  path_id: string;
  activity_id?: string;
  roadmap_progress: {
    completed_steps: number;
    total_steps: number;
    completion_percentage: number;
    current_mastery: number;
    target_mastery: number;
    status: string;
  };
}

export interface LearningHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  activities: Array<{
    id: string;
    owner_user_id: string;
    roadmap_id?: string | null;
    step_id?: string | null;
    activity_type: string;
    activity_status: string;
    title: string;
    detail?: string | null;
    domain_id?: string | null;
    skill_id?: string | null;
    target_role_id?: string | null;
    resource_id?: string | null;
    assessment_id?: string | null;
    project_id?: string | null;
    score?: number | null;
    link_route?: string | null;
    activity_metadata?: Record<string, any>;
    created_at?: string;
    updated_at?: string;
  }>;
}

export interface CandidateLearningEvidence {
  artifact_id: string;
  evidence_id: string; // Links to Domain 1 EvidenceItem.id
  title: string;
  source_type: "LEARNING_PROJECT";
  domain_id: string;
  topic_id: string;
  related_skill_id: string;
  project_id: string;
  submitted_at: string;
  provenance: string;
  evidence_state:
    | "Learning Activity Completed"
    | "Candidate Evidence Created"
    | "Awaiting Review"
    | "Under Review"
    | "Verified"
    | "Insufficient Evidence";
  verification_notes: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 9 — Evidence-Provenance Types for Lagging Skills
// ─────────────────────────────────────────────────────────────────────────────

export interface RequirementSourceRef {
  title: string;
  source_type: "target_role_model" | "job_description" | "benchmark_curriculum" | "canonical_taxonomy" | string;
  requirement: string;
  source_reference: string;
  source_url?: string | null;
}

export interface UserEvidenceSourceRef {
  evidence_id: string;
  title: string;
  provider: "github" | "document_upload" | "jira" | "portfolio" | "assessment" | string;
  source_type: string;
  observed_date?: string | null;
  source_url?: string | null;
  evidence_strength: "high" | "medium" | "low" | string;
  extraction_confidence: number;
  verification_status: "verified" | "source_checked" | "candidate" | "unreviewed" | "conflicting" | "rejected" | string;
  excerpt: string;
  is_contradicting: boolean;
  contradiction_reason?: string | null;
}

export type EvidenceSufficiencyType =
  | "verified_skill_gap"
  | "evidence_gap"
  | "conflicting_evidence"
  | "awaiting_analysis"
  | "verified_learning_need";

export interface SkillGapAssessment {
  id: string;
  owner_user_id: string;
  skill_id: string;
  canonical_name: string;
  target_role_id: string;
  target_role_title: string;
  gap_id: string;
  gap_type: string;
  required_proficiency: string;
  current_proficiency: string;
  proficiency_distance: number;
  evidence_sufficiency: EvidenceSufficiencyType;
  confidence_score: number;
  assessment_rationale: string;
  requirement_sources: RequirementSourceRef[];
  supporting_evidence: UserEvidenceSourceRef[];
  contradicting_evidence: UserEvidenceSourceRef[];
  analysis_run_id: string;
  ai_provider: "ollama_qwen" | "cached_existing" | "deterministic_engine" | string;
  ai_model: string;
  prompt_version: string;
  validation_status: "passed" | "flagged" | "partial" | string;
  is_human_reviewed: boolean;
  roadmap_id?: string | null;
  roadmap_path_id?: string | null;
  created_at: string;
  updated_at: string;
}
