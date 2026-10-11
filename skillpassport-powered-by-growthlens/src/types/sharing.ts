import { ProficiencyLevel } from "./passport";

export type ShareStatus = "active" | "expired" | "revoked" | "restricted" | "unavailable";

export type EvidenceAccessLevel = "none" | "summary_only" | "detail_inspection";

export interface CandidateIdentityConfig {
  showDisplayName: boolean;
  showHeadline: boolean;
  showSummary: boolean;
  showContactInfo: boolean;
  contactEmail?: string;
  contactLinkedIn?: string;
}

export interface SharePermissionsConfig {
  identity: CandidateIdentityConfig;
  shareVerifiedSkillsOnly: boolean; // Must always be true (security enforce)
  selectedSkillIds: string[]; // subset of verified skills
  evidenceAccessLevel: EvidenceAccessLevel;
  selectedEvidencePermissions: Record<
    string,
    {
      shareSummary: boolean;
      allowDetail: boolean;
    }
  >;
  includeRoleAlignment: boolean;
  targetRoleId?: string;
  expiryDays: number | null; // e.g. 7, 14, 30, null (never)
  customLinkLabel?: string;
}

export interface ShareRecord {
  shareId: string;
  label: string;
  status: ShareStatus;
  createdAt: string;
  expiresAt: string | null;
  lastAccessedAt?: string;
  permissions: SharePermissionsConfig;
  revokedAt?: string;
  revocationReason?: string;
  accessCount: number;
}

export interface AuthorizedEvidenceItem {
  id: string;
  title: string;
  sourceType: string;
  project: string;
  date?: string;
  shortSummary: string;
  relatedSkillName: string;
  claimedContribution: string;
  allowDetailInspection: boolean;
  sourceReference?: string;
  sourceUrl?: string;
}

export interface AuthorizedVerifiedSkill {
  id: string;
  canonicalName: string;
  category: string;
  verifiedProficiency: ProficiencyLevel;
  description: string;
  evidenceCount: number;
  authorizedEvidenceIds: string[];
}

export interface AuthorizedRoleAlignment {
  targetRoleTitle: string;
  alignmentSummary: string;
  strengths: string[];
  unsupportedAreas: string[];
  alignmentScore?: number; // Illustrative match indicator
  coverageNote: string;
}

/**
 * Strict Allowlist Share Projection
 * This is the ONLY data payload exposed to recruiter-facing components.
 * Contains zero internal AI traces, zero candidate raw documents, and zero unverified claims.
 */
export interface ShareProjection {
  shareId: string;
  status: ShareStatus;
  createdAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  isRevoked: boolean;
  candidateProfile: {
    displayName?: string;
    headline?: string;
    summary?: string;
    contactEmail?: string;
    contactLinkedIn?: string;
  };
  verifiedSkills: AuthorizedVerifiedSkill[];
  authorizedEvidence: AuthorizedEvidenceItem[];
  roleAlignment?: AuthorizedRoleAlignment | null;
  verificationGuaranteeNote: string;
}

export interface ShareActivityEvent {
  id: string;
  timestamp: string;
  shareId: string;
  shareLabel: string;
  action: "created" | "viewed" | "permissions_updated" | "revoked" | "expired";
  details: string;
}
