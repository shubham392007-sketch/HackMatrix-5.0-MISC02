export type SkillVerificationState =
  | "verified"
  | "candidate"
  | "insufficient_evidence"
  | "conflicting"
  | "rejected";

export type ProficiencyLevel =
  | "Not Established"
  | "Foundation"
  | "Working"
  | "Practitioner"
  | "Advanced"
  | "Expert";

export type CoverageState =
  | "sufficient"
  | "incomplete"
  | "insufficient"
  | "conflicting";

export interface SkillItem {
  id: string; // e.g. "skill-python"
  canonicalName: string;
  definition: string;
  category: string;
  aliases: string[];
  relatedSkillIds: string[];
  prerequisiteSkillIds: string[];
  verificationState: SkillVerificationState;
  estimatedProficiency: ProficiencyLevel;
  verifiedProficiency: ProficiencyLevel;
  confidence: number; // 0-100 extraction/model confidence
  evidenceStrength: "high" | "medium" | "low";
  evidenceIds: string[]; // references to Domain 1 EvidenceItem.id (e.g. "ev-01", "ev-03")
  coverageState: CoverageState;
  assessmentRationale: string;
  limitations: string;
  lastEvidenceDate: string;
}

export interface SkillHistoryEvent {
  id: string;
  timestamp: string;
  skillId: string;
  skillName: string;
  eventType:
    | "candidate_extracted"
    | "evidence_linked"
    | "proficiency_estimated"
    | "verified_state_changed"
    | "mapping_corrected"
    | "conflict_flagged";
  previousValue?: string;
  newValue: string;
  reason: string;
  relatedEvidenceId?: string;
  actor: "System Pipeline" | "Reviewer (Alex Rivera)" | "Verification Guard";
}

export interface TaxonomyCategory {
  id: string;
  name: string;
  description: string;
  skillIds: string[];
}
