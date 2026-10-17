import {
  UserProfile,
  AppNotification,
  AppSettings,
  PrivacyPreferences,
  UnifiedActivityEvent,
  HelpTopic,
  ConnectedSourceDetails,
} from "@/types/account";

export const INITIAL_USER_PROFILE: UserProfile = {
  id: "",
  displayName: "",
  headline: "",
  currentRole: "",
  summary: "",
  organization: "",
  location: "",
  avatarInitials: "",
  contactEmail: "",
  contactLinkedIn: "",
  portfolioUrl: "",
  lastUpdated: "",
};

export const INITIAL_APP_SETTINGS: AppSettings = {
  displayDensity: "comfortable",
  sidebarCollapsed: false,
  themePreference: "light",
  notificationPreferences: {
    evidenceImports: true,
    verificationUpdates: true,
    learningMilestones: true,
    passportSharingViews: true,
    governanceAlerts: true,
    emailDigestWeekly: false,
  },
  prototypeVersion: "v1.4.0 (Interactive Prototype — Domains 1-6 + Shared Layer)",
  lastSaved: "Today, 11:20 AM",
};

export const INITIAL_PRIVACY_PREFERENCES: PrivacyPreferences = {
  shareVerifiedSkillsOnlyDefault: true,
  includeEvidenceSummariesDefault: true,
  excludeContactInfoDefault: true,
  includeRoleAlignmentDefault: true,
  requireExplicitDetailConsent: true,
  allowPublicRecruiterIndexing: false,
  anonymizeOrganizationNames: false,
  dataRetentionMonths: 24,
  lastUpdated: "2026-03-22",
};

export const INITIAL_CONNECTED_SOURCE_DETAILS: ConnectedSourceDetails[] = [
  {
    id: "src-github-main",
    name: "GitHub Organization",
    type: "github",
    status: "connected",
    accountIdentity: "alexrivera-dev",
    organization: "growthlens-ai",
    authorizedPermissions: [
      "read:user",
      "repo:status",
      "read:org",
      "read:discussion",
    ],
    importedDataCategories: [
      "Merged Pull Requests",
      "Commit Metadata",
      "Code Reviews",
      "Repository Releases",
    ],
    lastSuccessfulSync: "Today, 09:30 AM",
    lastSyncAttempt: "Today, 09:30 AM",
    importedRecordsCount: 14,
    isPrototypeSimulation: true,
  },
  {
    id: "src-jira-prod",
    name: "Jira Issue Tracker",
    type: "jira",
    status: "connected",
    accountIdentity: "alex.rivera@growthlens.internal",
    organization: "GL-INFRA",
    authorizedPermissions: [
      "read:jira-work",
      "read:jira-user",
      "read:project:jira",
    ],
    importedDataCategories: [
      "Resolved Sprint Epics",
      "Completed Technical Stories",
      "Architecture RFC Submissions",
    ],
    lastSuccessfulSync: "Yesterday, 04:15 PM",
    lastSyncAttempt: "Yesterday, 04:15 PM",
    importedRecordsCount: 9,
    isPrototypeSimulation: true,
  },
  {
    id: "src-gitlab-secondary",
    name: "GitLab Enterprise",
    type: "gitlab",
    status: "needs_attention",
    accountIdentity: "alex-r-secondary",
    organization: "Legacy Systems",
    authorizedPermissions: ["read_api", "read_repository"],
    importedDataCategories: ["Legacy Pipeline Commits"],
    lastSuccessfulSync: "4 days ago",
    lastSyncAttempt: "Today, 08:00 AM",
    importedRecordsCount: 3,
    syncWarning:
      "Personal access token expires in 3 days. Reauthorization recommended to prevent automated sync interruptions.",
    isPrototypeSimulation: true,
  },
  {
    id: "src-manual-portfolio",
    name: "Manual Deliverable Uploads",
    type: "manual_upload",
    status: "connected",
    accountIdentity: "Candidate Self-Uploaded",
    authorizedPermissions: ["Internal Provenance Parsing"],
    importedDataCategories: [
      "Technical Architecture RFCs",
      "Data Pipeline Benchmark Reports",
    ],
    lastSuccessfulSync: "2 days ago",
    lastSyncAttempt: "2 days ago",
    importedRecordsCount: 4,
    isPrototypeSimulation: true,
  },
];

export const INITIAL_APP_NOTIFICATIONS: AppNotification[] = [
  {
    id: "notif-01",
    title: "Evidence Ingestion Completed",
    description:
      "Successfully ingested 4 new commits from repository 'growthlens-ai/telemetry-pipeline'. 2 candidate skills extracted.",
    category: "evidence",
    severity: "success",
    timestamp: "10 minutes ago",
    read: false,
    relatedDomain: "Domain 1: Evidence Intelligence",
    actionRoute: "/app/evidence/runs",
    actionLabel: "Inspect Ingestion Run",
  },
  {
    id: "notif-02",
    title: "Verification Review Requested",
    description:
      "Candidate skill 'Distributed Stream Processing' has 3 corroborating evidence artifacts awaiting human review.",
    category: "verification",
    severity: "info",
    timestamp: "1 hour ago",
    read: false,
    relatedDomain: "Domain 3: AI Verification",
    actionRoute: "/app/ai/review-queue",
    actionLabel: "Open Review Queue",
  },
  {
    id: "notif-03",
    title: "Mini-Project Evaluation Completed",
    description:
      "Automated evaluation completed for 'Stream Ingestion Pipeline' (Score: 88%). Generated candidate learning evidence.",
    category: "learning",
    severity: "success",
    timestamp: "3 hours ago",
    read: false,
    relatedDomain: "Domain 5: Learning Intelligence",
    actionRoute: "/app/learning/projects/project-data-preprocessing",
    actionLabel: "View Evaluation",
  },
  {
    id: "notif-04",
    title: "Recruiter Passport Link Viewed",
    description:
      "Your shared passport link 'Stripe Senior Platform Engineer' was accessed by an external recruiter in San Francisco.",
    category: "sharing",
    severity: "info",
    timestamp: "5 hours ago",
    read: true,
    relatedDomain: "Domain 6: Sharing & Recruiter Experience",
    actionRoute: "/app/passport/access",
    actionLabel: "Manage Access",
  },
  {
    id: "notif-05",
    title: "Connection Sync Warning",
    description:
      "GitLab Enterprise token expires in 3 days. Reauthorize to prevent sync disruptions for legacy evidence.",
    category: "system",
    severity: "warning",
    timestamp: "Yesterday",
    read: true,
    relatedDomain: "Shared Settings",
    actionRoute: "/app/settings/connections",
    actionLabel: "Review Connections",
  },
];

export const INITIAL_UNIFIED_ACTIVITIES: UnifiedActivityEvent[] = [
  {
    id: "act-u-01",
    title: "Profile Information Updated",
    description:
      "Updated professional headline and summary in Account Settings. Changes propagated to passport preview.",
    category: "profile",
    sourceDomain: "Account Settings",
    timestamp: "Today, 10:15 AM",
    status: "completed",
    actor: "Alex Rivera",
    route: "/app/settings/profile",
  },
  {
    id: "act-u-02",
    title: "Created Selective Recruiter Link",
    description:
      "Generated link 'Stripe Senior Platform Engineer Recruiter' with 4 verified skills and 14-day expiry.",
    category: "sharing",
    sourceDomain: "Domain 6: Sharing & Recruiter",
    timestamp: "Today, 09:45 AM",
    status: "completed",
    relatedRecordId: "share-recruiter-demo",
    route: "/app/passport/access",
  },
  {
    id: "act-u-03",
    title: "Ingested GitHub Commits & PRs",
    description:
      "Imported 4 commits from repository 'growthlens-ai/telemetry-pipeline'. Processed and normalized.",
    category: "evidence",
    sourceDomain: "Domain 1: Ingestion",
    timestamp: "Today, 09:30 AM",
    status: "completed",
    relatedRecordId: "run-ing-102",
    route: "/app/evidence/runs",
  },
  {
    id: "act-u-04",
    title: "Mini-Project Evaluation Passed",
    description:
      "Mini-project 'Stream Ingestion Pipeline' evaluated by automated sandbox. Evaluated score: 88%.",
    category: "learning",
    sourceDomain: "Domain 5: Learning",
    timestamp: "Today, 08:15 AM",
    status: "completed",
    relatedRecordId: "project-data-preprocessing",
    route: "/app/learning/projects/project-data-preprocessing",
  },
  {
    id: "act-u-05",
    title: "Skill Verification Confirmed",
    description:
      "Human reviewer corroborated candidate claim 'Python Systems Programming' to Verified Advanced.",
    category: "verification",
    sourceDomain: "Domain 3: AI Verification",
    timestamp: "Yesterday, 04:30 PM",
    status: "completed",
    relatedRecordId: "skill-python",
    route: "/app/passport/skills/skill-python",
  },
  {
    id: "act-u-06",
    title: "Revoked Third-Party Agency Share Link",
    description:
      "Candidate revoked public URL 'Revoked Agency Screening Link'. Public link immediately returned 403 denied.",
    category: "sharing",
    sourceDomain: "Domain 6: Sharing & Recruiter",
    timestamp: "Yesterday, 02:10 PM",
    status: "revoked",
    relatedRecordId: "share-revoked",
    route: "/app/passport/access",
  },
  {
    id: "act-u-07",
    title: "Jira Sprint Deliverables Synchronized",
    description:
      "Imported 3 completed epics from project GL-INFRA. 2 candidate capabilities mapped to taxonomy.",
    category: "connection",
    sourceDomain: "Domain 1: Connected Sources",
    timestamp: "Yesterday, 11:20 AM",
    status: "completed",
    relatedRecordId: "src-jira-prod",
    route: "/app/evidence/sources",
  },
];

export const HELP_TOPICS_CATALOG: HelpTopic[] = [
  {
    id: "help-evidence-provenance",
    category: "evidence",
    categoryLabel: "Evidence & Provenance",
    title: "What Counts as Professional Evidence & Why Provenance Matters",
    shortSummary:
      "SkillPassport rejects unverified assertions. Learn what constitutes authentic work evidence and why source provenance is required.",
    detailedContent: [
      "In traditional recruiting, skills are represented by uncorroborated resume bullet points or self-assessments that cannot be objectively verified. SkillPassport fundamentally shifts this dynamic by anchoring every claim in cryptographically attributable, real-world work artifacts.",
      "Professional evidence includes merged pull requests, git commit histories, reviewed architecture RFCs, resolved sprint tickets, code review contributions, and certified project deliverables. Every item contains immutable metadata: author attribution, timestamp, repository source, and technical deliverable diff.",
      "Crucially: Connecting a code repository or uploading a document does NOT automatically verify a skill. Ingestion is only the first step. The system extracts candidate claims, normalizes the technical contributions, and routes them to strict verification before any skill is promoted to the passport.",
    ],
    keyRules: [
      "Raw source files are normalized and hashed upon ingestion.",
      "Candidate claims without source artifacts cannot enter the verified passport.",
      "Proprietary code diffs and sensitive API keys are stripped by the privacy sanitizer.",
    ],
    relatedRoute: "/app/evidence",
    relatedRouteLabel: "Explore Evidence Center",
  },
  {
    id: "help-candidate-vs-verified",
    category: "candidate_vs_verified",
    categoryLabel: "Candidate vs. Verified Skills",
    title: "Candidate Claims vs. Verified Competencies",
    shortSummary:
      "Understand the difference between a candidate skill identified by AI extraction and an explicitly verified passport competency.",
    detailedContent: [
      "SkillPassport maintains a strict state boundary between work claims and verified competencies. A 'Candidate Skill' represents an inferred capability detected by the AI analysis engine during work ingestion, or a self-claimed interest.",
      "Candidate skills are explicitly quarantined. They are displayed in internal candidate queues, review logs, and growth action plans, but they are NEVER projected on external recruiter passports or counted as verified qualifications.",
      "A skill only transitions to 'Verified' status when it meets the corroboration threshold: multiple independent work artifacts, confirmed author attribution, and review approval. This eliminates AI hallucination and resume inflation.",
    ],
    keyRules: [
      "Candidate skills have verificationState: 'candidate' or 'unverified'.",
      "Verified skills have verificationState: 'verified' and cannot be edited by text forms.",
      "External recruiter views strictly filter by verificationState === 'verified'.",
    ],
    relatedRoute: "/app/passport/candidates",
    relatedRouteLabel: "Review Candidate Skills",
  },
  {
    id: "help-confidence-vs-verification",
    category: "confidence_vs_verification",
    categoryLabel: "Confidence vs. Verification",
    title: "Confidence vs. Verification: A Fundamental Architectural Distinction",
    shortSummary:
      "A high AI confidence score is NOT proof of a skill. Learn why model certainty and procedural verification are completely different concepts.",
    detailedContent: [
      "One of the core safety rules of SkillPassport is that statistical AI confidence cannot substitute for procedural verification.",
      "AI Confidence (e.g. 94%) measures the model's probabilistic certainty that a specific text span or code diff discusses a particular technical topic. However, probabilistic certainty is susceptible to prompt injection, context misinterpretation, and generative hallucination.",
      "Verification Status (e.g. 'Verified Advanced') is an empirical determination based on verified authorship, merged repository status, code impact metrics, and human-in-the-loop review. A claim with 99% AI confidence remains unverified until it satisfies all empirical verification gates.",
    ],
    keyRules: [
      "Confidence = Model uncertainty metric (probabilistic).",
      "Verification = Empirical proof of real contribution (deterministic).",
      "High confidence never overrides lack of supporting artifacts.",
    ],
    relatedRoute: "/app/ai/confidence",
    relatedRouteLabel: "Inspect AI Confidence Engine",
  },
  {
    id: "help-proficiency-scale",
    category: "proficiency",
    categoryLabel: "Proficiency Scale",
    title: "The Four-Tier Demonstrated Proficiency Scale",
    shortSummary:
      "How SkillPassport evaluates depth of expertise from Working Knowledge to Advanced Systems Mastery.",
    detailedContent: [
      "Proficiency in SkillPassport reflects the complexity, impact, and autonomy demonstrated across corroborated work artifacts:",
      "1. Working Knowledge (Level 1-2): Demonstrated ability to use the technology to execute straightforward tasks, bugfixes, or basic features under guidance.",
      "2. Practitioner (Level 3): Demonstrated autonomous feature delivery, idiomatic architecture, unit testing, and production bug triage.",
      "3. Advanced (Level 4): Demonstrated mastery of system architecture, concurrency, optimization, asynchronous communication, and peer code review.",
      "4. Expert / Lead (Level 5): Demonstrated organizational impact, design of core frameworks, cross-team standards, and production scaling.",
    ],
    keyRules: [
      "Proficiency is calculated from artifact complexity, not candidate self-ratings.",
      "Proficiency requires consistent corroboration across multiple independent deliverables.",
    ],
    relatedRoute: "/app/passport/skills",
    relatedRouteLabel: "View Verified Skills",
  },
  {
    id: "help-learning-vs-skills",
    category: "learning_vs_skills",
    categoryLabel: "Learning Mastery vs. Verified Skills",
    title: "Learning Mastery vs. Verified Professional Skills",
    shortSummary:
      "Completing a course or assessment proves educational mastery, but does not automatically verify a professional skill.",
    detailedContent: [
      "SkillPassport's Learning Intelligence domain guides developers through targeted curriculum, practice sandboxes, and diagnostic assessments to close role capability gaps.",
      "However, educational completion is fundamentally distinct from professional deliverable execution. Passing a multiple-choice diagnostic proves theoretical comprehension, but does not prove ability to ship resilient production software under business constraints.",
      "To bridge this gap, completed mini-projects generate 'Candidate Learning Evidence'. This candidate evidence is routed into the human review queue, where it can be evaluated as an authentic artifact to corroborate a passport competency.",
    ],
    keyRules: [
      "Assessment completion updates learning mastery, not passport verification.",
      "Mini-projects create candidate evidence artifacts that undergo provenance verification.",
      "Learning builds capability; production deliverables prove it.",
    ],
    relatedRoute: "/app/learning",
    relatedRouteLabel: "Open Learning Intelligence",
  },
  {
    id: "help-role-alignment",
    category: "role_alignment",
    categoryLabel: "Role Alignment & Gap Analysis",
    title: "How Role Alignment & Gaps Are Evaluated",
    shortSummary:
      "A missing skill in role alignment represents an evidence gap, not proof of inability. Learn how role match works.",
    detailedContent: [
      "Role Intelligence compares a candidate's verified capability profile against the structured demand model of a target role (e.g., Senior Platform Engineer, AI Data Specialist).",
      "An alignment score (e.g. 78%) reflects the percentage of core and differentiating competencies that have been corroborated by authentic work items.",
      "Crucially: An evidence gap means only that no corroborated artifacts have been authorized or ingested in that domain. It does NOT mean the candidate cannot learn or perform the task. Transparent gaps give hiring teams high confidence in the candidate's honesty, allowing interviews to focus on real evaluation rather than resume fact-checking.",
    ],
    keyRules: [
      "Alignment scores compare verified skills with role requirements.",
      "Evidence gaps are framed constructively as growth opportunities.",
      "Alignment scores are illustrative match indicators, not hiring probabilities.",
    ],
    relatedRoute: "/app/career",
    relatedRouteLabel: "Inspect Role Intelligence",
  },
  {
    id: "help-passport-sharing",
    category: "passport_sharing",
    categoryLabel: "Passport Sharing & Recruiter Experience",
    title: "Selective Disclosure, Links, Expiry & Immediate Revocation",
    shortSummary:
      "Candidates have 100% control over what external recruiters see. Learn about projection allowlists, summary vs detail, and link lifecycles.",
    detailedContent: [
      "SkillPassport guarantees candidate data sovereignty through selective disclosure allowlists. When you create a shared passport link, you decide exactly which verified skills, evidence items, and contact details are included.",
      "Summary vs. Deep Inspection: You can share a high-level summary of an engineering achievement while restricting access to deep repository URLs and commit hashes to safeguard proprietary employer IP.",
      "Lifecycles & Immediate Revocation: Shared links can be set with automatic expiration dates (e.g. 7, 14, 30 days) or revoked instantly with one click. When revoked, the public URL immediately purges all capability data and returns a zero-knowledge revoked state.",
    ],
    keyRules: [
      "Public recruiter views run on a strict allowlist projection (no internal state leaked).",
      "Revocation immediately disables public data access in real-time.",
      "Recruiters can inspect verified artifacts without accessing private internal code.",
    ],
    relatedRoute: "/app/passport/sharing",
    relatedRouteLabel: "Manage Passport Sharing",
  },
  {
    id: "help-accounts-privacy",
    category: "accounts_privacy",
    categoryLabel: "Connected Accounts & Privacy Governance",
    title: "Source Access, Data Retention & Disconnection Boundaries",
    shortSummary:
      "How connected GitHub and Jira accounts work, and why disconnecting a source preserves previously verified evidence.",
    detailedContent: [
      "SkillPassport connects to development tools (GitHub, Jira, GitLab) via read-only API tokens to discover merged PRs, commits, and completed tasks.",
      "Imported Evidence Retention vs. Source Sync: Disconnecting a source stops automated future data imports, but does NOT automatically erase previously imported and verified work deliverables. This ensures that verified credentials you have earned are not lost if an employer account or access token changes.",
      "Data Minimization: Secrets, proprietary API keys, internal credentials, and personally identifiable information are systematically stripped by the ingestion sanitizer before evidence is stored in the library.",
    ],
    keyRules: [
      "Source connections require only read permissions.",
      "Disconnecting a source stops sync without silently deleting earned evidence.",
      "All credentials in this prototype are safely simulated in client-side state.",
    ],
    relatedRoute: "/app/settings/privacy",
    relatedRouteLabel: "Open Privacy & Consent",
  },
];
