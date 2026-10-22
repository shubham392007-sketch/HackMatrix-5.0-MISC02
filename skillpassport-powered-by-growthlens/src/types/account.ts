export interface UserProfile {
  id: string;
  displayName: string;
  headline: string;
  currentRole: string;
  summary: string;
  organization: string;
  location: string;
  avatarUrl?: string;
  avatarInitials: string;
  contactEmail: string;
  contactLinkedIn: string;
  portfolioUrl?: string;
  lastUpdated: string;
}

export type ConnectionSyncStatus =
  | "connected"
  | "not_connected"
  | "connecting"
  | "syncing"
  | "needs_attention"
  | "permission_change_requested"
  | "disconnected"
  | "failed";

export interface ConnectedSourceDetails {
  id: string;
  name: string;
  type: "github" | "jira" | "gitlab" | "manual_upload" | "custom";
  status: ConnectionSyncStatus;
  accountIdentity: string;
  organization?: string;
  authorizedPermissions: string[];
  importedDataCategories: string[];
  lastSuccessfulSync: string;
  lastSyncAttempt: string;
  importedRecordsCount: number;
  syncWarning?: string;
  errorMessage?: string;
  isPrototypeSimulation: boolean;
}

export interface PrivacyPreferences {
  shareVerifiedSkillsOnlyDefault: boolean;
  includeEvidenceSummariesDefault: boolean;
  excludeContactInfoDefault: boolean;
  includeRoleAlignmentDefault: boolean;
  requireExplicitDetailConsent: boolean;
  allowPublicRecruiterIndexing: boolean;
  anonymizeOrganizationNames: boolean;
  dataRetentionMonths: number;
  lastUpdated: string;
}

export type NotificationCategory =
  | "evidence"
  | "verification"
  | "learning"
  | "sharing"
  | "system";

export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  timestamp: string;
  read: boolean;
  relatedDomain: string;
  actionRoute?: string;
  actionLabel?: string;
  dedupKey?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
}

export interface AppSettings {
  displayDensity: "comfortable" | "compact";
  sidebarCollapsed: boolean;
  themePreference: "system" | "light";
  notificationPreferences: {
    evidenceImports: boolean;
    verificationUpdates: boolean;
    learningMilestones: boolean;
    passportSharingViews: boolean;
    governanceAlerts: boolean;
    emailDigestWeekly: boolean;
  };
  prototypeVersion: string;
  lastSaved: string;
}

export type ActivityCategory =
  | "profile"
  | "connection"
  | "evidence"
  | "verification"
  | "learning"
  | "sharing"
  | "privacy"
  | "system";

export interface UnifiedActivityEvent {
  id: string;
  title: string;
  description: string;
  category: ActivityCategory;
  sourceDomain: string;
  timestamp: string;
  status: "completed" | "in_progress" | "flagged" | "failed" | "revoked";
  relatedRecordId?: string;
  route?: string;
  actor?: string;
}

export interface HelpTopic {
  id: string;
  category:
    | "evidence"
    | "candidate_vs_verified"
    | "confidence_vs_verification"
    | "proficiency"
    | "learning_vs_skills"
    | "role_alignment"
    | "passport_sharing"
    | "accounts_privacy";
  categoryLabel: string;
  title: string;
  shortSummary: string;
  detailedContent: string[];
  keyRules: string[];
  relatedRoute?: string;
  relatedRouteLabel?: string;
}
