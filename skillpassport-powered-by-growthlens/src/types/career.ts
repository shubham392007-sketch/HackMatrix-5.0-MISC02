import {
  ProficiencyLevel,
  SkillVerificationState,
  SkillItem,
} from "./passport";

export type RequirementType =
  | "core_required"
  | "supporting"
  | "preferred"
  | "differentiating";

export type ImportanceLevel = "critical" | "high" | "medium" | "low";

export type GapClassification =
  | "skill_gap"
  | "depth_gap"
  | "evidence_gap"
  | "application_gap"
  | "dependency_gap"
  | "differentiation_opportunity"
  | "freshness_gap";

export type MappingStatus =
  | "mapped"
  | "alias_resolved"
  | "related"
  | "ambiguous"
  | "unrecognized"
  | "needs_review";

export interface RoleCompetency {
  skill_id: string; // canonical skill id e.g. "skill-python"
  canonical_name: string;
  category: string;
  requirement_type: RequirementType;
  importance: ImportanceLevel;
  presence_rate?: number; // e.g. 92% in market
  expected_level: ProficiencyLevel;
  expected_level_numeric: number; // 0 to 5
  evidence_expectation: string;
  prerequisites: string[];
  reason_codes: string[];
  source_references: string[];
  mapping_status: MappingStatus;
  source_span?: string;
}

export interface RoleDemandModel {
  role_id: string;
  version: string; // e.g. "v2026.1"
  title: string;
  seniority: "Entry Level" | "Mid Level" | "Senior Level" | "Staff / Lead";
  context: string; // e.g. "Product / GenAI", "Distributed Systems"
  description: string;
  provenance: string;
  source_type: "curated_model" | "custom_parsed_job";
  competencies: RoleCompetency[];
  created_at: string;
  updated_at: string;
}

export interface CompetencyMatchResult {
  skill_id: string;
  canonical_name: string;
  requirement_type: RequirementType;
  importance: ImportanceLevel;
  expected_level: ProficiencyLevel;
  expected_level_numeric: number;
  current_proficiency: ProficiencyLevel;
  current_proficiency_numeric: number;
  verification_status: SkillVerificationState | "not_established";
  confidence: number;
  evidence_strength: "high" | "medium" | "low" | "none";
  evidence_ids: string[];
  raw_coverage: number; // min(1, current / expected)
  effective_coverage: number; // adjusted for verification state
  gap_type: GapClassification | null;
  gap_explanation: string;
  match_status:
    | "strong_match"
    | "partial_match"
    | "evidence_gap"
    | "missing_weak"
    | "conflicting";
  reason_codes: string[];
}

export interface RoleMatchResult {
  role_id: string;
  role_title: string;
  role_version: string;
  overall_match_score: number; // 0 to 100 illustrative percentage
  required_coverage_score: number; // 0 to 100
  supporting_coverage_score: number; // 0 to 100
  total_competencies: number;
  strong_matches_count: number;
  partial_matches_count: number;
  evidence_gaps_count: number;
  missing_capability_count: number;
  critical_blockers_count: number;
  competency_matches: CompetencyMatchResult[];
  calculated_at: string;
}

export interface GapPriorityInputs {
  criticality: number; // 1-5
  level_gap: number; // 0-4
  dependency_impact: number; // 1-3
  evidence_leverage: number; // 1-3
  user_fit: number; // 1-3
  marginal_gain: number; // 1-3
  estimated_effort: number; // 1-5
}

export interface GapRecord {
  gap_id: string;
  skill_id: string;
  canonical_name: string;
  role_id: string;
  role_title: string;
  gap_type: GapClassification;
  requirement_type: RequirementType;
  importance: ImportanceLevel;
  expected_level: ProficiencyLevel;
  current_supported_level: ProficiencyLevel;
  verification_status: SkillVerificationState | "not_established";
  evidence_status: "sufficient" | "insufficient" | "none" | "conflicting";
  proficiency_distance: number;
  priority_rank: number;
  priority_score: number;
  priority_inputs: GapPriorityInputs;
  why_prioritized: string;
  project_leverage_example?: {
    project_name: string;
    current_contribution: string;
    extension_idea: string;
  };
  diagnosis: string;
  next_step_direction: string;
  relevant_evidence_ids: string[];
}

export interface CareerReadinessAssessment {
  role_id: string;
  role_title: string;
  readiness_index: number; // 0 to 100
  readiness_tier:
    | "High Readiness"
    | "Moderate Alignment"
    | "Developing Foundations"
    | "Early Stage";
  required_supported_pct: number;
  proficiency_alignment_pct: number;
  evidence_quality_pct: number;
  critical_blockers: Array<{
    skill_id: string;
    skill_name: string;
    expected_level: string;
    current_state: string;
    reason: string;
    gap_id: string;
  }>;
  major_uncertainties: string[];
  disclaimer: string;
}

export interface ParsedJobDescription {
  id: string;
  raw_text: string;
  job_title: string;
  organization?: string;
  seniority: string;
  context: string;
  responsibilities: string[];
  extracted_competencies: Array<{
    original_label: string;
    canonical_skill_id: string | null;
    requirement_type: RequirementType;
    importance: ImportanceLevel;
    expected_level: ProficiencyLevel;
    evidence_expectation: string;
    source_span: string;
    status: "mapped" | "ambiguous" | "unmapped";
  }>;
  status: "empty" | "parsing" | "completed" | "partial" | "saved";
  parsed_at: string;
}
