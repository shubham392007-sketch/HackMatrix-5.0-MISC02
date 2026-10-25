import { ProficiencyLevel } from "./passport";

export type ShareStatus = "active" | "expired" | "revoked" | "restricted" | "unavailable";

export type EvidenceAccessLevel = "none" | "summary_only" | "detail_inspection";

export type PassportTemplateId =
  | "verified-competency"
  | "professional-resume"
  | "technical-portfolio"
  | "ai-ml-engineer"
  | "software-fullstack"
  | "research-academic"
  | "projects-impact"
  | "minimal-privacy"
  | "classic"
  | "executive"
  | "technical"
  | "ai_ml"
  | "engineering"
  | "academic"
  | "project"
  | "anonymous";

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
  selectedCustomSkillIds: string[]; // subset of user-declared custom skills (opt-in)
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
  allowRecruiterMessaging: boolean;
  templateId?: PassportTemplateId;
  expiryDays: number | null; // e.g. 7, 14, 30, null (never)
  customLinkLabel?: string;
  customHeadline?: string;
  customSummary?: string;
  sections?: Record<string, boolean>;
}

export interface ShareRecord {
  id?: string;
  shareId: string; // The token string
  label: string;
  templateId?: PassportTemplateId;
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
  sourceProvider?: string;
  project: string;
  date?: string;
  shortSummary: string;
  relatedSkillName: string;
  claimedContribution: string;
  allowDetailInspection: boolean;
  extractedExcerpt?: string;
  sourceReference?: string;
  sourceUrl?: string;
  externalUrl?: string;
  documentUrl?: string;
  fileUrl?: string;
  provenance?: Record<string, any>;
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

export interface AuthorizedCustomSkill {
  id: string;
  title: string;
  description: string;
  context?: string;
  selfAssessedLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  tags: string[];
  attachedEvidenceIds: string[];
  externalProjectUrl?: string;
  createdAt?: string;
  verificationLabel: string; // "User-declared · Not independently verified"
  isVerified: false;
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
  templateId?: PassportTemplateId;
  candidateProfile: {
    displayName?: string;
    headline?: string;
    summary?: string;
    contactEmail?: string;
    contactLinkedIn?: string;
    isAnonymous?: boolean;
  };
  verifiedSkills: AuthorizedVerifiedSkill[];
  customSkills: AuthorizedCustomSkill[];
  authorizedEvidence: AuthorizedEvidenceItem[];
  roleAlignment?: AuthorizedRoleAlignment | null;
  allowRecruiterMessaging: boolean;
  verificationGuaranteeNote: string;
  workExperience?: WorkExperienceEntry[];
  education?: EducationEntry[];
  projects?: PortfolioProjectEntry[];
  certifications?: CertificationEntry[];
  publications?: PublicationEntry[];
  achievements?: AchievementEntry[];
  customSections?: CustomSectionEntry[];
  sectionsConfig?: SectionConfigItem[];
}

export interface ShareActivityEvent {
  id: string;
  timestamp: string;
  shareId: string;
  shareLabel: string;
  action: "created" | "viewed" | "permissions_updated" | "revoked" | "expired" | "message_received";
  details: string;
}

export interface CustomSkill {
  id: string;
  title: string;
  description: string;
  context?: string;
  selfAssessedLevel: "Beginner" | "Intermediate" | "Advanced" | "Expert";
  tags: string[];
  attachedEvidenceIds: string[];
  externalProjectUrl?: string;
  createdAt?: string;
  verificationLabel: string;
  isVerified: false;
}

export interface RecruiterMessage {
  id: string;
  shareLinkId: string;
  shareLinkLabel: string;
  senderName: string;
  senderEmail: string;
  company?: string;
  roleTitle?: string;
  subject?: string;
  messageBody: string;
  isRead: boolean;
  createdAt: string;
}

export interface SharingOverviewData {
  readiness: {
    verified_skills_count: number;
    candidate_skills_count: number;
    eligible_evidence_count: number;
    custom_skills_count: number;
    is_ready_to_share: boolean;
  };
  links: {
    total_links: number;
    active_links: number;
    expired_links: number;
    revoked_links: number;
    total_access_count: number;
    recent_links: Array<{
      id: string;
      token: string;
      label: string;
      template_id: PassportTemplateId;
      status: ShareStatus;
      created_at: string;
      expires_at: string | null;
      access_count: number;
    }>;
  };
  messaging: {
    unread_count: number;
    total_count: number;
  };
  recent_activities: Array<{
    id: string;
    action: string;
    details: string;
    timestamp: string;
    share_link_id: string;
  }>;
}

export interface WorkExperienceEntry {
  id: string;
  jobTitle: string;
  organization: string;
  employmentType?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  isCurrent?: boolean;
  description: string;
  achievements?: string[];
  techStack?: string[];
  attachedEvidenceIds?: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startYear?: string;
  endYear?: string;
  grade?: string;
  activities?: string;
  coursework?: string[];
}

export interface PortfolioProjectEntry {
  id: string;
  title: string;
  description: string;
  role?: string;
  techStack?: string[];
  outcomes?: string[];
  projectUrl?: string;
  repoUrl?: string;
  liveDemoUrl?: string;
  attachedEvidenceIds?: string[];
}

export interface CertificationEntry {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
  documentVaultId?: string;
}

export interface PublicationEntry {
  id: string;
  title: string;
  venue?: string;
  date?: string;
  url?: string;
  summary?: string;
  authors?: string;
}

export interface AchievementEntry {
  id: string;
  title: string;
  organization?: string;
  date?: string;
  category?: string;
  description?: string;
  link?: string;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  date?: string;
}

export interface CustomSectionEntry {
  id: string;
  title: string;
  content?: string;
  items?: CustomSectionItem[];
  links?: Array<{ label: string; url: string }>;
  attachedEvidenceIds?: string[];
  enabled: boolean;
}

export interface SectionConfigItem {
  id: string;
  title: string;
  enabled: boolean;
  orderIndex: number;
}

export interface UserMasterPassport {
  id?: string;
  title: string;
  templateId: PassportTemplateId;
  sectionsConfig: SectionConfigItem[];
  workExperiences: WorkExperienceEntry[];
  educationEntries: EducationEntry[];
  portfolioProjects: PortfolioProjectEntry[];
  certifications: CertificationEntry[];
  publications: PublicationEntry[];
  achievements: AchievementEntry[];
  customSections: CustomSectionEntry[];
  updatedAt?: string;
}
