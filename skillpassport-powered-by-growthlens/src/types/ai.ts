export type DemoRole = "employee" | "reviewer" | "admin" | "manager" | "recruiter" | "auditor";

export type AnalysisStatus = "completed" | "partial" | "failed" | "processing";

export interface ObservedFact {
  id: string;
  fact: string;
  excerpt: string;
  evidence_id: string;
  source_locus?: string;
}

export interface InferredAttribute {
  id: string;
  attribute: string;
  interpretation: string;
  confidence: number;
  is_tentative: boolean;
}

export interface DetectedActivity {
  task: string;
  contribution_level: "author" | "collaborator" | "reviewer";
  attribution_state: "confirmed" | "pending_confirmation";
}

export interface WorkAnalysisResult {
  analysis_id: string;
  source_id: string;
  source_title: string;
  source_type: string;
  observed_facts: ObservedFact[];
  inferred_attributes: InferredAttribute[];
  detected_activities: DetectedActivity[];
  key_findings: string[];
  uncertainty_flags: string[];
  status: AnalysisStatus;
  model_name: string;
  model_version: string;
  prompt_version: string;
  created_at: string;
}

export interface ExtractionCandidateItem {
  id: string;
  original_label: string;
  canonical_skill_id: string | null;
  canonical_name: string;
  category: string;
  skill_type: "technical" | "methodological" | "communication";
  confidence: number; // 0-100 model extraction confidence
  evidence_ids: string[];
  supporting_excerpt: string;
  extraction_rationale: string;
  taxonomy_status: "resolved" | "ambiguous" | "duplicate" | "unmapped";
  review_state: "pending_review" | "reviewed" | "flagged" | "insufficient";
  ambiguity_flags: string[];
  created_at: string;
}

export interface EvidenceMappingItem {
  id: string;
  candidate_skill_id: string;
  candidate_label: string;
  canonical_skill_id: string;
  evidence_id: string;
  evidence_title: string;
  source_type: string;
  occurred_date: string;
  relationship_type:
    | "direct_implementation"
    | "project_documentation"
    | "course_certificate"
    | "self_claim"
    | "conflicting";
  supporting_excerpt: string;
  relevance_score: number;
  attribution_state: "confirmed" | "unconfirmed" | "collaborative";
  mapping_status: "active" | "flagged_incorrect" | "needs_evidence";
  review_history: Array<{ action: string; actor: string; timestamp: string }>;
}

export interface SkillVerificationRecord {
  verification_id: string;
  skill_id: string;
  skill_name: string;
  claimed_proficiency: string;
  verified_proficiency: string;
  verification_status:
    | "verified"
    | "pending_review"
    | "partially_verified"
    | "insufficient_evidence"
    | "conflicting"
    | "not_verified";
  supporting_evidence_ids: string[];
  evidence_strength: "high" | "medium" | "low";
  extraction_confidence: number;
  proficiency_rationale: string;
  insufficient_evidence_reasons?: string[];
  missing_evidence_needed?: string[];
  decision_rationale: string;
  verification_policy_version: string;
  last_reviewed: string;
  simulated_decision: boolean;
}

export interface ConfidenceClaim {
  id: string;
  skill_id: string;
  skill_name: string;
  extraction_confidence: number; // NLP token probability
  evidence_strength: "high" | "medium" | "low"; // Artifact depth
  verification_state: string; // Official passport gate
  proficiency_estimate: string; // Model's suggested level
  evidence_volume: number;
  evidence_recency: string;
  coverage_score: number;
  uncertainty_reasons: string[];
  needed_to_improve: string[];
}

export interface ConflictSourceSide {
  id: string;
  name: string;
  type: string;
  date: string;
  claim: string;
  excerpt: string;
  author: string;
}

export interface ConflictRecord {
  id: string;
  title: string;
  conflict_type:
    | "proficiency_discrepancy"
    | "timeline_mismatch"
    | "attribution_dispute"
    | "duplicate_competency";
  description: string;
  status: "open" | "resolved" | "insufficient_evidence";
  source_a: ConflictSourceSide;
  source_b: ConflictSourceSide;
  suggested_resolution: string;
  resolution_outcome?: {
    decision: string;
    rationale: string;
    actor: string;
    timestamp: string;
  };
}

export type GuardOutcome =
  | "PASS"
  | "FLAGGED"
  | "BLOCK"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICT";

export interface GuardClaimResult {
  id: string;
  claim_title: string;
  associated_skill: string;
  claimed_level: string;
  evidence_id: string | null;
  guard_outcome: GuardOutcome;
  reason_code: string;
  explanation: string;
  checks: {
    evidence_exists: boolean;
    user_owns_evidence: boolean;
    semantic_support_valid: boolean;
    attribution_valid: boolean;
    no_conflict: boolean;
    level_supported: boolean;
    not_revoked: boolean;
  };
}

export interface OutputValidationIssue {
  field: string;
  severity: "error" | "warning";
  message: string;
}

export interface OutputValidationRecord {
  run_id: string;
  output_type: "skill_extraction" | "work_analysis" | "proficiency_rubric";
  status: "valid" | "invalid" | "validation_failed" | "retry_pending";
  schema_version: string;
  model_version: string;
  prompt_version: string;
  timestamp: string;
  issues: OutputValidationIssue[];
  retryable: boolean;
  received_payload_summary: Record<string, string | number | boolean>;
}

export interface PromptInjectionFlag {
  id: string;
  source_id: string;
  source_title: string;
  source_type: string;
  flagged_excerpt: string;
  detection_rule: string;
  threat_category:
    | "instruction_override"
    | "fake_verification_marker"
    | "credential_exfiltration";
  disposition: "quarantined_and_ignored" | "sanitized" | "processing_blocked";
  status: "flagged" | "reviewed_and_dismissed" | "confirmed_threat";
  timestamp: string;
}

export interface HumanReviewTask {
  id: string;
  claim_id: string;
  title: string;
  category:
    | "insufficient_evidence"
    | "conflict"
    | "ambiguous_mapping"
    | "unsupported_claim"
    | "suspicious_injection";
  priority: "high" | "medium" | "low";
  assigned_role: "Authorized Reviewer" | "Demo Administrator";
  status: "pending" | "reviewed" | "rejected" | "escalated";
  created_at: string;
  context_summary: string;
}

export interface AIEvalCase {
  case_id: string;
  category:
    | "unsupported_claims"
    | "conflicting_sources"
    | "schema_validation"
    | "prompt_injection"
    | "extraction_fidelity";
  scenario_title: string;
  expected_behavior: string;
  simulated_result: string;
  outcome: "pass" | "fail" | "inconclusive";
  tested_model: string;
  dataset_version: string;
  failure_notes?: string;
  timestamp: string;
}

export interface AIAuditEvent {
  id: string;
  timestamp: string;
  event_type:
    | "analysis_completed"
    | "candidate_extracted"
    | "guard_blocked"
    | "conflict_recorded"
    | "review_decision"
    | "validation_retried"
    | "injection_quarantined";
  affected_entity_type:
    | "source"
    | "candidate_skill"
    | "conflict"
    | "validation_run"
    | "verification";
  affected_entity_id: string;
  previous_state?: string;
  new_state: string;
  reason: string;
  actor: string;
  model_or_policy_version?: string;
  run_id?: string;
}
