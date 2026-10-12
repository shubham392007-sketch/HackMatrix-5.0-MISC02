export type { DemoRole } from "./ai";

export type SourceType =
  | "github"
  | "jira"
  | "certificate"
  | "document"
  | "portfolio"
  | "research"
  | "resume"
  | "other";

export type ConnectionStatus =
  | "connected"
  | "demo_connected"
  | "not_connected"
  | "needs_attention"
  | "syncing";

export type ProcessingStatus =
  | "discovered"
  | "normalized"
  | "extracted"
  | "indexed"
  | "ready_for_review"
  | "processing"
  | "failed";

export type ReviewStatus =
  | "unreviewed"
  | "pending_review"
  | "source_checked"
  | "needs_confirmation"
  | "partially_supported"
  | "insufficient_evidence"
  | "verified"
  | "rejected";

export type EvidenceStrength = "high" | "medium" | "low";

export interface CandidateSkill {
  id: string;
  name: string;
  category: string;
  excerpt: string;
  associationReason: string;
  status: "candidate" | "reviewed" | "flagged" | "insufficient";
  proficiencyLevel: "Foundation" | "Working" | "Practitioner" | "Advanced";
}

export interface ProcessingStageRecord {
  stage: string;
  status: "completed" | "processing" | "pending" | "failed";
  timestamp: string;
  detail: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description: string;
  sourceType: SourceType;
  sourceReference: string;
  sourceUrl?: string;
  project: string;
  evidenceType: string;
  date: string;
  claimedContribution: string;
  author: string;
  isCollaborative: boolean;
  evidenceStrength: EvidenceStrength;
  extractionConfidence: number; // percentage 0-100
  processingStatus: ProcessingStatus;
  reviewStatus: ReviewStatus;
  normalizedMetadata: {
    format: string;
    fileSize?: string;
    authorIdentified: string;
    commitCount?: number;
    issueKey?: string;
  };
  extractedSummary: string;
  candidateSkills: CandidateSkill[];
  duplicateWarning?: {
    isDuplicate: boolean;
    reason: string;
    conflictingItemId: string;
    reviewed: boolean;
  };
  processingHistory: ProcessingStageRecord[];
}

export interface IngestionRun {
  runId: string;
  source: string;
  sourceType: SourceType;
  startTime: string;
  completionTime?: string;
  recordsDiscovered: number;
  recordsNormalized: number;
  recordsExtracted: number;
  recordsIndexed: number;
  itemsReviewNeeded: number;
  failedCount: number;
  status: "completed" | "processing" | "partially_completed" | "failed";
  errorMessage?: string;
  stages: ProcessingStageRecord[];
}

export interface ConnectedSource {
  id: string;
  name: string;
  type: SourceType;
  status: ConnectionStatus;
  lastSync: string;
  importedRecordsCount: number;
  accountIdentity: string;
  permissions: string[];
  selectedEntities: string[]; // repos or projects
}
