/**
 * Settings & Access Product Help & Conceptual Guidance Data Catalog
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 7 Settings & Access features, 4 guided workflows, and core architecture/privacy rules.
 */

export type SettingsHelpTopicId =
  | "overview"
  | "profile"
  | "connections"
  | "vault"
  | "privacy"
  | "notifications"
  | "preferences"
  | "activity"
  | "help"
  | "workflows"
  | "glossary";

export interface SettingsStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface SettingsConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface SettingsStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface SettingsTroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface SettingsHelpTopic {
  id: SettingsHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  requiredRole: "All Roles (Employee, Reviewer, Admin)" | "Reviewer or Admin" | "Administrator Only";
  iconName: "User" | "FolderGit2" | "ShieldCheck" | "Bell" | "Sliders" | "Clock" | "HelpCircle" | "BookOpen";
  summary: string;
  purpose: string;
  whenToUse: string[];
  whoCanUse: string;
  prerequisites: string[];
  stepByStep: SettingsStepInstruction[];
  practicalExample: SettingsConcreteExample;
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  understandingStatus: {
    statusBadges: SettingsStatusDefinition[];
    trustPrinciples: string[];
    privacyCaveat: string;
  };
  troubleshooting: SettingsTroubleshootingItem[];
  whatHappensNext: {
    downstreamFeature: string;
    nextStepAction: string;
    targetRoute: string;
  };
}

export const SETTINGS_HELP_TOPICS: Record<SettingsHelpTopicId, SettingsHelpTopic> = {
  vault: {
    id: "vault",
    title: "Evidence Vault & Persistent Archive",
    shortTitle: "Evidence Vault",
    canonicalRoute: "/app/settings/vault",
    badgeLabel: "Personal Archive",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "FolderGit2",
    summary:
      "A persistent, user-specific archive that lets you revisit genuine stored certificates, resumes, captured website snapshots, repository artifacts, and connected-source records.",
    purpose:
      "Provides a single private place to inspect original uploaded files, review extracted text chunks, verify web snapshots from portfolio crawls, and follow verified source deep links.",
    whenToUse: [
      "When you need to re-download the original PDF, DOCX, or presentation uploaded as career evidence.",
      "When verifying what text was extracted from a certificate or resume and mapped to candidate skills.",
      "When inspecting a point-in-time web crawl snapshot of your portfolio or project documentation.",
      "When following verified deep links back to original GitHub repositories or Jira issues.",
    ],
    whoCanUse:
      "All authenticated users. The Evidence Vault strictly enforces row-level security and tenant isolation; users can only view, preview, and download their own authorized artifacts.",
    prerequisites: [
      "Authenticated session via Supabase JWT.",
      "At least one uploaded document, web crawl snapshot, or connected GitHub/Jira source record.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Evidence Vault",
        action: "Open the persistent archive from Settings & Access or the top bar.",
        buttonOrPath: "/app/settings/vault",
        details: "Inspect aggregate summary cards showing total accessible artifacts, stored bytes, and web snapshots.",
      },
      {
        stepNumber: 2,
        title: "Filter by Category or Search",
        action: "Select an artifact category filter chip or type in the search bar.",
        buttonOrPath: "Filter Chips ('Uploaded Documents', 'Certificates', 'Web Snapshots', 'GitHub')",
        details: "Quickly locate specific documents by title, original filename, or external source URL.",
      },
      {
        stepNumber: 3,
        title: "Inspect & Preview Artifact",
        action: "Click 'Inspect & Preview' on any artifact card to launch the comprehensive Artifact Viewer.",
        buttonOrPath: "Inspect & Preview Button",
        details: "Review the full PDF pages, high-resolution images, rendered Markdown READMEs, or captured web snapshots.",
      },
      {
        stepNumber: 4,
        title: "Examine Extracted Text & Chunks",
        action: "Switch to the 'Extracted Content' tab in the viewer modal.",
        buttonOrPath: "Extracted Content Tab",
        details: "Inspect the exact normalized text, page numbers, and chunk hashes used for grounded AI skill extraction.",
      },
      {
        stepNumber: 5,
        title: "Download Verified Original Binary",
        action: "Click the 'Download' button in the viewer or on the artifact card.",
        buttonOrPath: "Download Original Button",
        details: "Streams the authentic stored file bytes directly with authorized Content-Disposition headers.",
      },
    ],
    practicalExample: {
      title: "Inspecting an AWS Architect Certificate & Verifying Extracted Chunks",
      startingState: "Candidate uploaded a PDF certificate ('cert_test.pdf') during onboarding.",
      actionTaken: "Opened /app/settings/vault, searched for 'Cloud Architect', and opened the Artifact Viewer.",
      resultingOutcome: "Previewed original PDF pages inline, confirmed chunk extraction method 'PyMuPDF+OCR', and reviewed the linked candidate competency 'Senior Distributed Systems Architecture'.",
      inspectionGuide: "Verify the SHA-256 fingerprint in the 'Source & Provenance' tab matches the cryptographic content hash.",
      recoveryNote: "If preview fails due to unsupported format, use the Download button to retrieve the intact binary directly.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Authenticated User Session",
        "Uploaded document binaries or automated crawl records in database",
      ],
      outputArtifacts: [
        "Interactive PDF/image preview streams",
        "Normalized document chunk listings",
        "Authorized binary downloads with safe filenames",
        "Direct navigable deep links to GitHub repositories and Jira issues",
      ],
      originAndProcessing:
        "Artifacts are ingested through Domain 1 (Evidence Workspace), persisted in the private storage vault and database snapshots, and rendered on-demand in the Vault.",
      generatedVsPersisted:
        "The original files and web crawl records are genuinely persisted on disk and in PostgreSQL. Derived chunks and competency mappings are permanently linked via foreign keys.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "completed",
          badgeLabel: "COMPLETED",
          meaning: "Artifact was fully ingested, original file persisted, and structured text extracted.",
        },
        {
          status: "extracted",
          badgeLabel: "EXTRACTED",
          meaning: "Web snapshot was captured and text extracted into immutable database record.",
        },
        {
          status: "insufficient_content",
          badgeLabel: "INSUFFICIENT CONTENT",
          meaning: "Artifact was uploaded but contained insufficient verifiable text to propose candidate competencies.",
        },
        {
          status: "failed",
          badgeLabel: "FAILED",
          meaning: "Binary extraction or crawl failed due to formatting or network constraints.",
        },
      ],
      trustPrinciples: [
        "No Fake Previews: Never show a manufactured document when an original file is unavailable.",
        "Strict Ownership: A user cannot access another user's certificate or resume by guessing artifact UUIDs.",
        "Distinction of Sources: Live websites and point-in-time web crawl snapshots are clearly differentiated.",
      ],
      privacyCaveat:
        "Files stored in the Evidence Vault are private by default. They are never published or shared with recruiters unless explicitly included in an active passport share link.",
    },
    troubleshooting: [
      {
        symptom: "Preview area displays an error message instead of PDF pages",
        probableCause: "Browser security settings or strict sandbox policy preventing inline iframe PDF display.",
        verifiedRemedy: "Click the 'Download' button to save and view the intact PDF in your local viewer, or inspect the 'Extracted Content' tab for parsed text.",
      },
      {
        symptom: "Live website shows different content than the stored snapshot",
        probableCause: "The target website updated its pages after the initial ingestion crawl completed.",
        verifiedRemedy: "The snapshot accurately reflects the state at capture time. To capture new changes, re-run portfolio crawling under Evidence Workspace.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Evidence Library & AI Work Analysis",
      nextStepAction: "Inspect Grounded Competencies in Evidence Library",
      targetRoute: "/app/evidence/library",
    },
  },
  overview: {
    id: "overview",
    title: "Settings & Access Domain Overview",
    shortTitle: "Overview",
    canonicalRoute: "/app/settings",
    badgeLabel: "Shared Account Foundation",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Sliders",
    summary:
      "The Settings & Access domain serves as the authoritative account hub across all Skill Passport modules. It manages user identity, external provider integrations, selective privacy boundaries, notification preferences, and persistent activity history.",
    purpose:
      "Provide a centralized, authentic management environment for authenticated users. Connects to real Supabase PostgreSQL user_profiles, manages read-only GitHub/Jira access tokens, enforces selective recruiter disclosure tiers, and maintains an immutable audit log.",
    whenToUse: [
      "Updating professional headlines, roles, location, or work preferences.",
      "Connecting a new GitHub repository organization or Jira workspace.",
      "Configuring recruiter link disclosure defaults (hiding email, anonymizing companies).",
      "Auditing recent verification decisions and ingestion activities.",
      "Reviewing and clearing unread operational notifications.",
    ],
    whoCanUse: "Any authenticated user. All data is strictly isolated to the caller's verified Supabase user ID.",
    prerequisites: [
      "Active Supabase Auth session with valid JWT token.",
      "Authenticated user profile record in PostgreSQL user_profiles table.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Domain Hub",
        action: "Navigate to Settings & Access overview",
        buttonOrPath: "/app/settings",
        details: "Inspect quick cards for Profile, Connected Accounts, Privacy, Notifications, and Activity History.",
      },
      {
        stepNumber: 2,
        title: "Verify System Status",
        action: "Review Backend Infrastructure & Connection Status",
        buttonOrPath: "Bottom card on /app/settings",
        details: "Confirms live connectivity to FastAPI backend, Supabase connection pooler (bounded size 8), and Ollama AI engine.",
      },
      {
        stepNumber: 3,
        title: "Manage Dedicated Workspaces",
        action: "Click any workspace quick-link",
        buttonOrPath: "Card CTA buttons (e.g. 'Edit Profile', 'Manage Sources')",
        details: "Transitions to specific configuration interfaces with real server-side persistence.",
      },
    ],
    practicalExample: {
      title: "Illustrative User Journey: Onboarding & Account Hardening",
      startingState: "New user signed in with verified Supabase Auth credentials, blank profile defaults.",
      actionTaken: "User navigates to Profile, fills display name, focus headline, connects GitHub token, and enforces privacy defaults.",
      resultingOutcome: "UserProfile record persisted in PostgreSQL; GitHub integration active; initial activity recorded in audit feed.",
      inspectionGuide: "Verify top bar avatar initials match display name; inspect /app/activity to see profile updated event.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Authenticated user session (JWT)", "Server configuration"],
      outputArtifacts: ["UserProfile database record", "ConnectedSource rows", "Audit activity records"],
      originAndProcessing: "All data originates from authenticated API calls to FastAPI /api/v1/profile, /connections, and /passport/history.",
      generatedVsPersisted: "All changes persist directly to Supabase PostgreSQL. No local-only mock storage is used in production paths.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "Connected & Active", badgeLabel: "Green Badge", meaning: "Backend service and database session pool are operational." },
        { status: "Session Re-synced", badgeLabel: "Emerald Pill", meaning: "Profile snapshot refreshed from server." },
      ],
      trustPrinciples: [
        "Self-reported profile data never modifies verified skill badges or bypasses evaluation gates.",
        "Zero-knowledge public recruiter projection: only authorized items are disclosed.",
      ],
      privacyCaveat: "Ordinary profile edits will never automatically make private documents or repository URLs public.",
    },
    troubleshooting: [
      {
        symptom: "Profile changes do not reflect immediately in top bar",
        probableCause: "Browser tab has cached previous auth profile snapshot.",
        verifiedRemedy: "Click 'Re-sync Server State' on /app/settings or refresh the page to reload the latest database row.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Profile Identity",
      nextStepAction: "Configure professional headline, current role, and portfolio handles",
      targetRoute: "/app/settings/profile",
    },
  },

  profile: {
    id: "profile",
    title: "Profile Identity & Career Context",
    shortTitle: "Profile",
    canonicalRoute: "/app/settings/profile",
    badgeLabel: "User Identity",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "User",
    summary:
      "Manage your professional headline, current role, organization, location, work arrangement preferences, experience tier, and portfolio handles.",
    purpose:
      "Establish an authentic, self-described professional profile for recruiter previews and passport overviews while strictly preserving the integrity boundary between self-descriptions and verified capabilities.",
    whenToUse: [
      "Setting your display name and preferred given name.",
      "Highlighting a technical focus headline (e.g. 'Distributed Systems & Go Developer').",
      "Specifying work preferences (Remote, Hybrid, Onsite).",
      "Updating executive professional summary and personal portfolio links.",
    ],
    whoCanUse: "All authenticated users. Edits apply exclusively to the logged-in user's account.",
    prerequisites: ["Active Supabase user session."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Navigate to Profile Identity",
        action: "Open Profile Settings",
        buttonOrPath: "/app/settings/profile",
        details: "Form loads with server-persisted profile snapshot.",
      },
      {
        stepNumber: 2,
        title: "Edit Professional Details",
        action: "Fill or update desired fields",
        buttonOrPath: "Input fields and textareas",
        details: "Display name is mandatory. For students or early-career, focus headlines on technical areas of passion.",
      },
      {
        stepNumber: 3,
        title: "Review Unsaved Changes Banner",
        action: "Confirm pending edits",
        buttonOrPath: "Amber banner at top of form",
        details: "Shows 'Discard' to revert to the server snapshot, or 'Save Changes'.",
      },
      {
        stepNumber: 4,
        title: "Save Changes",
        action: "Submit profile form",
        buttonOrPath: "Save Profile Changes button",
        details: "Sends PATCH /api/v1/profile/me. Updates top bar initials and passport overview.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Early-Career Contributor Profile",
      startingState: "User is a university senior transitioning to backend software engineering.",
      actionTaken: "Sets title to 'Student Software Engineer', headline to 'Distributed Systems & Go | Open-Source Contributor', preference to 'Remote'.",
      resultingOutcome: "Profile saved in PostgreSQL. Passport overview updates. No unearned senior badges are fabricated.",
      inspectionGuide: "Verify top bar shows updated initials; inspect /app/passport to see headline in overview header.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Full Display Name (required)", "Current Title", "Headline", "Location", "Work Preference", "Summary"],
      outputArtifacts: ["Updated user_profiles record in Supabase PostgreSQL"],
      originAndProcessing: "Transmitted via HTTPS PATCH to FastAPI /api/v1/profile/me with JWT bearer token validation.",
      generatedVsPersisted: "Authoritatively persisted in user_profiles table. Discard restores the server snapshot.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "Verified Auth", badgeLabel: "Emerald Monospace", meaning: "Email is bound to authoritative Supabase Auth account." },
        { status: "Unsaved Changes", badgeLabel: "Amber Alert", meaning: "Local form input differs from server snapshot." },
      ],
      trustPrinciples: [
        "Self-reported headline or bio never creates verified skill badges.",
        "Skill verification requires independent deliverable artifacts and human governance approval.",
      ],
      privacyCaveat: "Contact email and handles are withheld from recruiters by default until explicitly authorized in Domain 6.",
    },
    troubleshooting: [
      {
        symptom: "Save button is disabled",
        probableCause: "No form fields have been modified, or validation errors exist.",
        verifiedRemedy: "Ensure display name is non-empty and all provided URLs follow valid format.",
      },
      {
        symptom: "Discard Changes reverted my typed input",
        probableCause: "Discard intentionally resets the form to the last saved database snapshot.",
        verifiedRemedy: "Re-enter edits and click 'Save Profile Changes' to persist.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Passport Overview",
      nextStepAction: "View how profile details present in your unified Skill Passport",
      targetRoute: "/app/passport",
    },
  },

  connections: {
    id: "connections",
    title: "Connected Accounts & Sources",
    shortTitle: "Connected Accounts",
    canonicalRoute: "/app/settings/connections",
    badgeLabel: "Integrations & Sync",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "FolderGit2",
    summary:
      "Review connected repository organizations, issue trackers, authorized scopes, imported artifact counts, and on-demand synchronization status.",
    purpose:
      "Manage external development tools (GitHub, Jira) using least-privilege read-only permissions to discover authentic work deliverables without leaking proprietary code or sensitive keys.",
    whenToUse: [
      "Checking which GitHub repositories or Jira projects are actively linked.",
      "Triggering an on-demand sync after merging pull requests or completing sprint epics.",
      "Disconnecting an external source without losing previously verified skills.",
      "Reviewing granted permission scopes and imported artifact counts.",
    ],
    whoCanUse: "All authenticated users. Sources are strictly filtered by user ID.",
    prerequisites: ["Authorized personal access token or OAuth authorization with target provider."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Configured Sources",
        action: "Inspect configured cards",
        buttonOrPath: "/app/settings/connections",
        details: "Displays provider icon, account identity, granted scopes, and deliverable counts.",
      },
      {
        stepNumber: 2,
        title: "Trigger Synchronization",
        action: "Click 'Sync Now'",
        buttonOrPath: "Sync Now button on active source card",
        details: "Calls /api/v1/connections/github/sync. Triggers background ingestion run and normalizes new commits.",
      },
      {
        stepNumber: 3,
        title: "Disconnect Source if Needed",
        action: "Click 'Disconnect'",
        buttonOrPath: "Disconnect button on source card",
        details: "Opens confirmation modal explaining that previously verified evidence remains protected in library.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Connecting Personal GitHub Account",
      startingState: "User has 0 connected sources.",
      actionTaken: "User clicks 'Configure GitHub Source' -> enters read-only token with 'repo:status' and 'read:user' -> selects repository.",
      resultingOutcome: "Source appears in Connected Accounts as 'Connected & Active'; imported pull requests populate Evidence Library.",
      inspectionGuide: "Inspect imported artifact count on card; check /app/evidence/runs for completed job.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Provider credentials/token (encrypted)", "Selected repository/project scope"],
      outputArtifacts: ["ConnectedSource database record", "RawSourceRecord items", "Normalized EvidenceItem rows"],
      originAndProcessing: "FastAPI connector calls GitHub GraphQL/REST API; secrets encrypted with AES-GCM.",
      generatedVsPersisted: "Connection records and evidence items are persisted in PostgreSQL with strict foreign keys.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "Connected & Active", badgeLabel: "Emerald Badge", meaning: "Source token is verified and actively polling." },
        { status: "Needs Attention", badgeLabel: "Amber Badge", meaning: "Token expired or permission reauthorization required." },
        { status: "Disconnected", badgeLabel: "Slate Badge", meaning: "Polling stopped. Previously verified evidence preserved." },
      ],
      trustPrinciples: [
        "Disconnecting a provider NEVER erases earned verified credentials or past evidence.",
        "Ingestion sanitizer strips hardcoded passwords and proprietary diffs automatically.",
      ],
      privacyCaveat: "Third-party recruiters never receive direct API access to your private GitHub or Jira tokens.",
    },
    troubleshooting: [
      {
        symptom: "Card shows 0 deliverables in library",
        probableCause: "Repository has no merged PRs matching the authenticated author's git email.",
        verifiedRemedy: "Verify that git commit author email matches your authenticated account or configured identity.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Evidence Library",
      nextStepAction: "Inspect normalized work deliverables imported from connected accounts",
      targetRoute: "/app/evidence/library",
    },
  },

  privacy: {
    id: "privacy",
    title: "Privacy, Data Sovereignty & Consent",
    shortTitle: "Privacy & Consent",
    canonicalRoute: "/app/settings/privacy",
    badgeLabel: "Data Governance",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "ShieldCheck",
    summary:
      "Configure candidate-controlled data boundaries, default recruiter disclosure tiers, contact anonymization, and export your personal GDPR archive.",
    purpose:
      "Guarantee candidate data sovereignty through zero-knowledge public sharing, server-enforced disclosure allowlists, and immutable verification rules.",
    whenToUse: [
      "Enforcing that unverified candidate claims are never shown to external recruiters.",
      "Hiding contact details (email, LinkedIn) by default on newly created share links.",
      "Anonymizing employer or client names on external recruiter views.",
      "Exporting a complete JSON archive of personal capability data.",
      "Managing and revoking active recruiter links.",
    ],
    whoCanUse: "All authenticated users.",
    prerequisites: ["Authenticated user account."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Inspect Disclosure Tiers",
        action: "Review Tiers 1 through 4",
        buttonOrPath: "/app/settings/privacy",
        details: "Understands boundaries between Private Library (Tier 1) and Recruiter Summary (Tier 3).",
      },
      {
        stepNumber: 2,
        title: "Toggle Default Recruiter Preferences",
        action: "Toggle privacy switches",
        buttonOrPath: "Switches in 'Default Preferences for New Recruiter Links'",
        details: "Controls contact info visibility, artifact inspection authorization, and company anonymization.",
      },
      {
        stepNumber: 3,
        title: "Save Defaults",
        action: "Click 'Save Defaults'",
        buttonOrPath: "Save Defaults button (appears when toggled)",
        details: "Persists preferences to PostgreSQL user_profiles.privacy_preferences.",
      },
      {
        stepNumber: 4,
        title: "Export Personal Archive",
        action: "Click 'Export Data Archive (.json)'",
        buttonOrPath: "Export button in Personal Data Sovereignty section",
        details: "Generates a clean JSON file containing profile information, privacy preferences, and verified capability metadata.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Preparing for Recruiter Sharing",
      startingState: "User wants to share skills with an external hiring team without exposing employer client names or private code URLs.",
      actionTaken: "User enables 'Anonymize Employer Names' and 'Require Explicit Authorization for Detailed Artifact Inspection'.",
      resultingOutcome: "Newly generated recruiter share links default to sanitized summaries with company names masked.",
      inspectionGuide: "Open Domain 6 Share Wizard (/app/passport/sharing) to verify defaults pre-populate correctly.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Privacy toggles (boolean settings)"],
      outputArtifacts: ["privacy_preferences JSONB column in user_profiles", "Exported JSON archive file"],
      originAndProcessing: "Preferences enforced by FastAPI backend during recruiter share projection.",
      generatedVsPersisted: "Persisted server-side across all sessions and browser devices.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "ALWAYS ACTIVE", badgeLabel: "Emerald Badge", meaning: "Enforce Verified Skills Only cannot be disabled by user preferences." },
        { status: "STRICTLY PRIVATE", badgeLabel: "Slate Monospace", meaning: "Tier 1 evidence cannot be accessed by external links." },
      ],
      trustPrinciples: [
        "Unverified candidate claims and AI hallucinations are permanently barred from recruiter sharing.",
        "Revoking a recruiter link immediately purges public accessibility in real time.",
      ],
      privacyCaveat: "Privacy defaults pre-populate new links; already-active links must be managed in Domain 6 Access Hub.",
    },
    troubleshooting: [
      {
        symptom: "A recruiter can still see an older link after I changed defaults",
        probableCause: "Changing default preferences affects future links. Existing active links maintain their created grants.",
        verifiedRemedy: "Navigate to /app/passport/access and click 'Revoke' on the specific active link.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Recruiter Experience & Sharing",
      nextStepAction: "Create selective recruiter share links using your configured privacy defaults",
      targetRoute: "/app/passport/sharing",
    },
  },

  notifications: {
    id: "notifications",
    title: "Notification Center & Operational Alerts",
    shortTitle: "Notifications",
    canonicalRoute: "/app/notifications",
    badgeLabel: "Alerts & Events",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Bell",
    summary:
      "Monitor operational ingestion milestones, human verification review updates, AI analysis alerts, and recruiter link view hits.",
    purpose:
      "Provide an authentic, synchronized notification stream derived directly from real backend pipeline runs, review decisions, and access events.",
    whenToUse: [
      "Reviewing completed repository ingestion runs and newly detected candidate skills.",
      "Checking when a human reviewer corroborates or questions a skill claim.",
      "Monitoring recruiter views on active public passport links.",
      "Filtering notifications by category (Evidence, Verification, AI, Governance).",
      "Clearing read notifications to keep top-bar badge count accurate.",
    ],
    whoCanUse: "All authenticated users.",
    prerequisites: ["Authenticated user account."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Notification Center",
        action: "Click bell icon in top bar or navigate to /app/notifications",
        buttonOrPath: "/app/notifications",
        details: "Displays unread badge count and chronological alert list.",
      },
      {
        stepNumber: 2,
        title: "Filter by Category",
        action: "Click category pills (e.g. 'Evidence', 'Verification', 'Trust & Governance')",
        buttonOrPath: "Filter pills at top of feed",
        details: "Isolates events by domain or enables 'Unread Only' checkbox.",
      },
      {
        stepNumber: 3,
        title: "Inspect or Action Alert",
        action: "Click action route link (e.g. 'Inspect Ingestion Run', 'Open Review Queue')",
        buttonOrPath: "Action link on alert card",
        details: "Navigates directly to the relevant domain interface.",
      },
      {
        stepNumber: 4,
        title: "Mark as Read",
        action: "Click check icon on individual card or 'Mark All as Read'",
        buttonOrPath: "Mark All as Read button",
        details: "Synchronizes unread count in real time across the top bar.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Ingestion Run Completion Alert",
      startingState: "Background sync job finished processing repository commits.",
      actionTaken: "System creates genuine notification with run ID and extracted candidate skills count.",
      resultingOutcome: "Top bar shows unread badge; user clicks 'Inspect Ingestion Run' -> opens /app/evidence/runs.",
      inspectionGuide: "Verify notification card displays accurate run ID and click action route.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Pipeline event producers (ingestion runs, review decisions, share hits)"],
      outputArtifacts: ["AppNotification records stored per user session in state"],
      originAndProcessing: "Synthesized from real backend job statuses, review audit events, and sharing hits.",
      generatedVsPersisted: "Read states and dismissed items are persisted per authenticated user ID.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "SUCCESS", badgeLabel: "Green Badge", meaning: "Pipeline or verification completed without warnings." },
        { status: "WARNING", badgeLabel: "Amber Badge", meaning: "Attention required (e.g. token expiring, candidate conflict)." },
        { status: "INFO", badgeLabel: "Blue Badge", meaning: "Operational telemetry or recruiter link view recorded." },
      ],
      trustPrinciples: [
        "Unread badge counts reflect genuine user notifications, not hardcoded constants.",
        "Turning off notification routing preferences never suppresses mandatory security alerts.",
      ],
      privacyCaveat: "Notifications containing sensitive internal repository details are never transmitted over unencrypted public channels.",
    },
    troubleshooting: [
      {
        symptom: "Top bar bell shows unread count but list appears empty",
        probableCause: "A category filter or 'Unread Only' filter is currently active.",
        verifiedRemedy: "Click 'All Events' and uncheck 'Unread Only' to view all recorded alerts.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Preferences & Settings",
      nextStepAction: "Configure in-app notification routing rules per category",
      targetRoute: "/app/settings",
    },
  },

  preferences: {
    id: "preferences",
    title: "Application Preferences & Display Rules",
    shortTitle: "Preferences",
    canonicalRoute: "/app/settings",
    badgeLabel: "System Preferences",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Sliders",
    summary:
      "Adjust user interface density (Comfortable vs. Compact), configure in-app notification routing categories, and inspect infrastructure health.",
    purpose:
      "Provide accessible UI controls and notification routing preferences that persist directly to the user's account in PostgreSQL.",
    whenToUse: [
      "Switching between Comfortable (relaxed spacing) and Compact (dense tables) UI modes.",
      "Enabling or muting specific notification categories (e.g. learning milestones, sharing views).",
      "Re-synchronizing local client state with the server.",
      "Checking backend database pool and AI model telemetry.",
    ],
    whoCanUse: "All authenticated users.",
    prerequisites: ["Authenticated user account."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Choose Display Density",
        action: "Select 'Comfortable Density' or 'Compact Density'",
        buttonOrPath: "Density cards in Section B",
        details: "Compact density tightens tables and padding for high-throughput workflows.",
      },
      {
        stepNumber: 2,
        title: "Configure Notification Routing",
        action: "Toggle switches for notification categories",
        buttonOrPath: "Toggles in Section C",
        details: "Disabling a category suppresses in-app toast alerts and top-bar unread increments.",
      },
      {
        stepNumber: 3,
        title: "Save Preferences",
        action: "Click 'Save Preferences'",
        buttonOrPath: "Save Preferences button",
        details: "Persists app_settings to backend user_profiles table.",
      },
      {
        stepNumber: 4,
        title: "Re-sync Server State",
        action: "Click 'Re-sync Server State' if needed",
        buttonOrPath: "Re-sync button in Section D",
        details: "Forces an immediate refresh of authenticated profile and settings from PostgreSQL.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Setting Up High-Density Review Workflow",
      startingState: "Reviewer wants condensed tables and muted learning milestone alerts.",
      actionTaken: "Selects 'Compact Density', turns off 'Learning Diagnostics' notifications, clicks 'Save Preferences'.",
      resultingOutcome: "Preferences saved to Supabase user_profiles.app_settings. Survives browser refresh.",
      inspectionGuide: "Reload the page to verify compact density and toggle states persist.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Display density selection", "Category toggle states"],
      outputArtifacts: ["app_settings JSONB in user_profiles table"],
      originAndProcessing: "Sent via PATCH /api/v1/profile/me and applied to frontend context.",
      generatedVsPersisted: "Persisted server-side in PostgreSQL.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "Comfortable Density", badgeLabel: "Default Pill", meaning: "Standard Moonwood spacing and cards." },
        { status: "Compact Density", badgeLabel: "Dense Pill", meaning: "Condensed layouts for engineering dashboards." },
      ],
      trustPrinciples: [
        "Muting a notification category does not disable underlying governance or verification rules.",
        "System telemetry displays genuine server connection status.",
      ],
      privacyCaveat: "Settings are scoped exclusively to the authenticated caller's account ID.",
    },
    troubleshooting: [
      {
        symptom: "Re-sync Server State shows error toast",
        probableCause: "Backend service is recovering from network restart or pool re-initialization.",
        verifiedRemedy: "Wait 5-10 seconds and retry. Circuit breaker auto-recovers on healthy ping.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Activity History",
      nextStepAction: "Inspect the chronological audit trail of account actions and decisions",
      targetRoute: "/app/activity",
    },
  },

  activity: {
    id: "activity",
    title: "Activity History & Audit Feed",
    shortTitle: "Activity History",
    canonicalRoute: "/app/activity",
    badgeLabel: "Audit Trail",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Clock",
    summary:
      "Explore a unified chronological timeline of profile updates, repository ingestions, skill verification decisions, and privacy changes.",
    purpose:
      "Deliver a transparent, searchable, and filtered audit trail sourced authoritatively from ReviewAuditEvent, VerificationDecision, and genuine session events.",
    whenToUse: [
      "Verifying when a candidate skill was extracted or promoted to Verified status.",
      "Confirming that a profile headline or summary change was recorded.",
      "Reviewing past repository synchronization and evidence ingestion events.",
      "Searching for specific skills or actors in your personal history.",
      "Filtering by domain (Profile, Sources, Evidence, Verification, Learning, Sharing, Privacy).",
    ],
    whoCanUse: "All authenticated users. Queries only return records owned by or attributed to the authenticated user.",
    prerequisites: ["Authenticated user account."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Activity History",
        action: "Navigate to /app/activity",
        buttonOrPath: "/app/activity",
        details: "Loads chronological feed of authentic database audit events.",
      },
      {
        stepNumber: 2,
        title: "Search Feed",
        action: "Type in search bar (e.g. 'Python', 'Profile', 'Verification')",
        buttonOrPath: "Search input at top",
        details: "Dynamically filters events by title, description, domain, or actor.",
      },
      {
        stepNumber: 3,
        title: "Filter by Category",
        action: "Click category pills (e.g. 'Verification', 'Profile', 'Evidence')",
        buttonOrPath: "Category selector pills",
        details: "Isolates specific activity categories.",
      },
      {
        stepNumber: 4,
        title: "Inspect Event Details",
        action: "Click 'Open Detailed View'",
        buttonOrPath: "Open Detailed View link on event card",
        details: "Navigates directly to the referenced skill (/app/passport/skills/...) or source setting.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Verifying a Skill Promotion Event",
      startingState: "User's candidate claim 'PostgreSQL Query Optimization' was reviewed by a human verifier.",
      actionTaken: "Verifier corroborated the claim. Event recorded in ReviewAuditEvent table.",
      resultingOutcome: "Event appears in /app/activity with 'COMPLETED' badge: 'Skill Verification Decision: PostgreSQL Query Optimization'.",
      inspectionGuide: "Click 'Open Detailed View' to navigate to the verified skill detail page.",
    },
    inputsAndOutputs: {
      requiredInputs: ["ReviewAuditEvent records from /api/v1/passport/history", "Real session user events"],
      outputArtifacts: ["Unified chronological audit feed with search and filtering"],
      originAndProcessing: "Queried from ReviewAuditEvent joined with CompetencyTaxonomy by owner UUID.",
      generatedVsPersisted: "Events are persisted in PostgreSQL. Empty state renders honestly when 0 events exist.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "COMPLETED", badgeLabel: "Green Badge", meaning: "Action or verification policy transition completed successfully." },
        { status: "FLAGGED", badgeLabel: "Amber Badge", meaning: "Item flagged for human review or policy discrepancy." },
        { status: "REVOKED", badgeLabel: "Rose Badge", meaning: "Public recruiter link or access grant revoked." },
      ],
      trustPrinciples: [
        "Audit events originate from real database rows, never fake sample arrays.",
        "Empty state honestly reports 'No activity has been recorded for this period.' without fake fallback cards.",
      ],
      privacyCaveat: "Activity events are strictly partitioned by authenticated user ID; other users' activities are never visible.",
    },
    troubleshooting: [
      {
        symptom: "No activity events appear on a brand new account",
        probableCause: "Brand new account has not yet uploaded deliverables, updated profile, or completed verification reviews.",
        verifiedRemedy: "Update your profile or connect a GitHub repository to generate your initial audit events.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Help & Explanations",
      nextStepAction: "Review conceptual architecture rules and verification standards",
      targetRoute: "/app/help",
    },
  },

  help: {
    id: "help",
    title: "Help, Explanations & Conceptual Architecture",
    shortTitle: "Help & Explanations",
    canonicalRoute: "/app/help",
    badgeLabel: "Knowledge Base",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "HelpCircle",
    summary:
      "Browse in-depth conceptual guides and glossary definitions explaining Skill Passport's evidence provenance, verification standards, and anti-hallucination rules.",
    purpose:
      "Educate developers, recruiters, and engineering managers on the verifiable truth standard, confidence vs. verification distinctions, and proficiency scales.",
    whenToUse: [
      "Understanding why self-reported skills are rejected in favor of repository provenance.",
      "Learning the difference between probabilistic AI confidence and empirical verification.",
      "Understanding how proficiency levels (Working Knowledge to Lead) are calculated.",
      "Reviewing selective disclosure rules before sharing with external recruiters.",
    ],
    whoCanUse: "All users.",
    prerequisites: ["None."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Knowledge Catalog",
        action: "Navigate to /app/help",
        buttonOrPath: "/app/help",
        details: "Displays searchable knowledge topics covering all core architectural pillars.",
      },
      {
        stepNumber: 2,
        title: "Search Topics",
        action: "Type a keyword (e.g. 'provenance', 'confidence', 'proficiency')",
        buttonOrPath: "Search input at top",
        details: "Searches titles, summaries, key rules, and detailed explanations.",
      },
      {
        stepNumber: 3,
        title: "Expand Topic Details",
        action: "Click on any topic card",
        buttonOrPath: "Chevron expander on card",
        details: "Reveals detailed paragraphs, key architectural rules, and direct links to relevant features.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Disputing an AI Extracted Claim",
      startingState: "User noticed an extracted candidate claim with 92% confidence that seems misaligned.",
      actionTaken: "Reads 'Confidence vs. Verification: A Fundamental Architectural Distinction'.",
      resultingOutcome: "Understands that 92% confidence is merely model certainty, not verified proof, and that the claim remains quarantined.",
      inspectionGuide: "Navigate to /app/passport/candidates to inspect or discard the quarantined claim.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Search query or category filter"],
      outputArtifacts: ["In-depth conceptual articles and rule checklists"],
      originAndProcessing: "Curated canonical knowledge base aligned with implemented TRD/PRD specifications.",
      generatedVsPersisted: "Static client-side knowledge catalog.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "THE VERIFIABLE TRUTH STANDARD", badgeLabel: "Emerald Header", meaning: "Skill Passport replaces resumes with cryptographically grounded proof." },
      ],
      trustPrinciples: [
        "A skill is not a badge you award yourself; it is an empirical state backed by authentic work deliverables.",
        "Probabilistic AI certainty can never substitute for deterministic human or deliverable verification.",
      ],
      privacyCaveat: "All help guidance accurately documents implemented features without prototype simulation disclaimers.",
    },
    troubleshooting: [
      {
        symptom: "Search returns zero results",
        probableCause: "Overly specific search query.",
        verifiedRemedy: "Click 'Reset Search' or browse by category filter pills.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Profile Identity",
      nextStepAction: "Apply your knowledge by maintaining an authentic professional profile",
      targetRoute: "/app/settings/profile",
    },
  },

  workflows: {
    id: "workflows",
    title: "Guided Settings & Access Workflows",
    shortTitle: "Workflows",
    canonicalRoute: "/app/settings",
    badgeLabel: "Guided Procedures",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Sliders",
    summary:
      "Step-by-step procedures for the 4 core Settings & Access user flows: profile setup, repository connection, privacy hardening, and audit trail inspection.",
    purpose: "Provide clear, end-to-end guidance for high-impact account management tasks.",
    whenToUse: [
      "Setting up a new Skill Passport profile from scratch.",
      "Connecting a GitHub organization and syncing deliverables.",
      "Configuring privacy defaults before sharing with recruiters.",
      "Conducting an audit of all verification decisions and access events.",
    ],
    whoCanUse: "All authenticated users.",
    prerequisites: ["Authenticated user account."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Workflow 1: Profile Configuration",
        action: "Set display name, focus headline, experience tier, and portfolio links",
        buttonOrPath: "/app/settings/profile",
        details: "Validates inputs and persists to user_profiles table.",
      },
      {
        stepNumber: 2,
        title: "Workflow 2: Provider Connection & Sync",
        action: "Link GitHub organization with read-only token and click 'Sync Now'",
        buttonOrPath: "/app/settings/connections",
        details: "Triggers real background ingestion run to discover pull requests.",
      },
      {
        stepNumber: 3,
        title: "Workflow 3: Privacy Boundaries & Export",
        action: "Enforce verified-only policy, hide contact info by default, export JSON archive",
        buttonOrPath: "/app/settings/privacy",
        details: "Saves preferences and downloads personal capability archive.",
      },
      {
        stepNumber: 4,
        title: "Workflow 4: Activity Inspection",
        action: "Search and filter persistent timeline events",
        buttonOrPath: "/app/activity",
        details: "Verifies that all updates and verification decisions have been logged.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Complete Account Setup",
      startingState: "New user signs in for the first time.",
      actionTaken: "Completes Profile -> Connects GitHub -> Sets Privacy Defaults -> Inspects initial Activity event.",
      resultingOutcome: "Account fully hardened and ready for verifiable skill passport generation.",
      inspectionGuide: "Check top bar, connections card, and activity feed.",
    },
    inputsAndOutputs: {
      requiredInputs: ["User input across all 4 workflows"],
      outputArtifacts: ["Configured account, connected sources, privacy preferences, and audit history"],
      originAndProcessing: "Coordinated across FastAPI /profile, /connections, and /passport endpoints.",
      generatedVsPersisted: "All states persisted to PostgreSQL.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "STEP-BY-STEP", badgeLabel: "Emerald Badge", meaning: "Follow numbered sequences in order." },
      ],
      trustPrinciples: [
        "Complete workflows preserve the integrity boundary between self-descriptions and verified capabilities.",
      ],
      privacyCaveat: "Each workflow respects candidate data sovereignty.",
    },
    troubleshooting: [
      {
        symptom: "Workflow step fails due to network error",
        probableCause: "Transient database connection recovery.",
        verifiedRemedy: "Wait a few seconds and click save/sync again.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Settings Overview",
      nextStepAction: "Return to Settings & Access overview",
      targetRoute: "/app/settings",
    },
  },

  glossary: {
    id: "glossary",
    title: "Settings & Access Conceptual Glossary",
    shortTitle: "Glossary",
    canonicalRoute: "/app/help",
    badgeLabel: "Architectural Principles",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "BookOpen",
    summary:
      "Definitions of core concepts: Integrity Boundary, Zero-Knowledge Disclosure, Least-Privilege Ingestion, Non-Negotiable Invariants, and Disconnection Semantics.",
    purpose: "Provide unambiguous architectural definitions for terms used across Settings & Access.",
    whenToUse: [
      "Clarifying why self-reported profile fields cannot verify skills.",
      "Understanding what happens when an external source is disconnected.",
      "Reviewing how privacy allowlists protect employer intellectual property.",
    ],
    whoCanUse: "All users.",
    prerequisites: ["None."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Integrity Boundary",
        action: "Understand separation between self-reported profile and empirical skills",
        buttonOrPath: "Definition 1",
        details: "Self-descriptions represent personal intent; verified skills represent proven deliverables.",
      },
      {
        stepNumber: 2,
        title: "Least-Privilege Ingestion",
        action: "Understand token permissions",
        buttonOrPath: "Definition 2",
        details: "Requires only read permissions; all proprietary code diffs and secrets are sanitized.",
      },
      {
        stepNumber: 3,
        title: "Disconnection Invariant",
        action: "Understand evidence retention upon source disconnection",
        buttonOrPath: "Definition 3",
        details: "Disconnecting stops future imports but preserves previously earned verified credentials.",
      },
    ],
    practicalExample: {
      title: "Illustrative Scenario: Contract Termination Safety",
      startingState: "Engineer leaves an employer and their GitHub organization access is revoked.",
      actionTaken: "User marks GitHub source as disconnected in Settings.",
      resultingOutcome: "Future polling stops, but all previously imported PRs and verified skills remain in Passport.",
      inspectionGuide: "Open /app/passport/skills to confirm verified badges are intact.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Glossary search term"],
      outputArtifacts: ["Conceptual definitions"],
      originAndProcessing: "Standardized architectural principles.",
      generatedVsPersisted: "Reference catalog.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "CORE INVARIANTS", badgeLabel: "Emerald Badge", meaning: "Guaranteed architectural rules of Skill Passport." },
      ],
      trustPrinciples: [
        "Truth over claims: empirical deliverables supersede resume assertions.",
      ],
      privacyCaveat: "Data sovereignty guarantees candidate control at all times.",
    },
    troubleshooting: [
      {
        symptom: "Unclear on a specific term",
        probableCause: "Complex architectural boundary.",
        verifiedRemedy: "Review full explanation in /app/help.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Help & Explanations",
      nextStepAction: "Read full articles on /app/help",
      targetRoute: "/app/help",
    },
  },
};

export function getSettingsHelpTopicIdFromPathname(pathname: string): SettingsHelpTopicId {
  if (!pathname) return "overview";
  if (pathname.includes("/app/settings/profile")) return "profile";
  if (pathname.includes("/app/settings/connections")) return "connections";
  if (pathname.includes("/app/settings/vault")) return "vault";
  if (pathname.includes("/app/settings/privacy")) return "privacy";
  if (pathname.includes("/app/notifications")) return "notifications";
  if (pathname.includes("/app/activity")) return "activity";
  if (pathname.includes("/app/help")) return "help";
  if (pathname === "/app/settings") return "preferences";
  return "overview";
}

export interface SettingsGuidedWorkflow {
  id: string;
  title: string;
  summary: string;
  phases: Array<{
    phaseNumber: number;
    featureTitle: string;
    route: string;
    action: string;
    outcome: string;
  }>;
}

export interface SettingsGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute: string;
  relatedRouteLabel: string;
}

export const SETTINGS_GUIDED_WORKFLOWS: SettingsGuidedWorkflow[] = [
  {
    id: "workflow-profile-hardening",
    title: "Workflow 1: Authentic Profile Setup & Identity Hardening",
    summary:
      "Configure your verified professional identity, job title, career tier, and personal links, ensuring self-reported claims remain strictly segregated from empirical verified competencies.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Navigate to Profile Settings",
        route: "/app/settings/profile",
        action: "Open /app/settings/profile from the navigation sidebar or user menu.",
        outcome: "View current profile loaded live from the Supabase user_profiles table with live initials and avatar.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Configure Identity & Career Tier",
        route: "/app/settings/profile",
        action: "Update Display Name, Headline, Experience Level (Junior to Principal), and Work Preference.",
        outcome: "Dynamic badges and avatar initials update in real time in the live preview card.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Link Professional Deliverable Hubs",
        route: "/app/settings/profile",
        action: "Add validated URLs for GitHub, LinkedIn, and personal portfolio.",
        outcome: "URLs are validated for format and saved to user_profiles; external profile icons appear active.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Review Integrity Boundary & Persist",
        route: "/app/settings/profile",
        action: "Acknowledge the Integrity Notice and click 'Save Changes'.",
        outcome: "Server returns HTTP 200; state is saved to PostgreSQL; success toast confirms persistence.",
      },
    ],
  },
  {
    id: "workflow-connection-sync",
    title: "Workflow 2: External Deliverable Source Connection & Ingestion",
    summary:
      "Connect authentic work providers (GitHub or Jira) using read-only tokens and trigger an on-demand sync without exposing proprietary code diffs or API credentials.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Inspect Connected Accounts",
        route: "/app/settings/connections",
        action: "Navigate to /app/settings/connections to review currently active integrations.",
        outcome: "If no sources are connected, view the honest empty state with zero fake cards.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Authorize Provider Integration",
        route: "/app/settings/connections",
        action: "Click 'Connect' on GitHub or Jira and supply read-only credentials or OAuth authorization.",
        outcome: "Source record is registered in the database with status 'Connected' and read-only scope.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Trigger On-Demand Ingestion Run",
        route: "/app/settings/connections",
        action: "Click 'Sync Now' on the connected source card.",
        outcome: "Background task triggers ingestion run; status updates to 'Syncing' and records last synced timestamp.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Verify Discovered Deliverables",
        route: "/app/evidence/runs",
        action: "Click 'Inspect Runs' to view discovered commits, pull requests, and review items in the Evidence Center.",
        outcome: "Ingested artifacts appear in the Evidence Library with cryptographic origin hashes.",
      },
    ],
  },
  {
    id: "workflow-privacy-hardening",
    title: "Workflow 3: Privacy Boundaries & GDPR Data Archive Export",
    summary:
      "Configure recruiter disclosure tiers to protect personal contact details and proprietary employer IP, then export a complete machine-readable archive of all capability data.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Review Recruiter Link Disclosure Tiers",
        route: "/app/settings/privacy",
        action: "Navigate to /app/settings/privacy and evaluate current disclosure rules.",
        outcome: "Inspect options for Public, Verified Recruiters Only, or Restricted Access.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Set Sensitive Data Concealment",
        route: "/app/settings/privacy",
        action: "Toggle 'Hide Email & Phone' and 'Mask Current Employer Name' switches.",
        outcome: "Preferences save immediately to JSONB column in Supabase and apply to all shared passport links.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Confirm Verified-Only Public Policy",
        route: "/app/settings/privacy",
        action: "Verify that Candidate and Provisional claims are permanently quarantined from public view.",
        outcome: "Ensures recruiters only see competencies that have passed empirical verification.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Export Personal Data Archive (GDPR)",
        route: "/app/settings/privacy",
        action: "Click 'Export Data Archive' under the Personal Data Archive section.",
        outcome: "Browser initiates immediate JSON download containing profile, connected sources, preferences, and verified badges.",
      },
    ],
  },
  {
    id: "workflow-audit-inspection",
    title: "Workflow 4: Security Audit Trail & Activity Inspection",
    summary:
      "Inspect, search, and filter the immutable activity timeline to verify verification decisions, credential awards, and security-relevant configuration updates.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Open Activity Timeline",
        route: "/app/activity",
        action: "Navigate to /app/activity to view chronologically ordered lifecycle events.",
        outcome: "Timeline loads real database audit records; empty state displays if no activity exists yet.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Filter by Event Category",
        route: "/app/activity",
        action: "Select filter pills: 'All Events', 'Verification', 'Ingestion', 'Security', or 'Settings'.",
        outcome: "Timeline immediately filters to display only events matching the chosen category.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Search Specific Deliverables or Actions",
        route: "/app/activity",
        action: "Type a query (e.g. 'FastAPI', 'GitHub', or 'Reviewer') into the search input.",
        outcome: "Results match against event titles, actor names, and detailed metadata.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Audit Event Metadata & Actor Attribution",
        route: "/app/activity",
        action: "Click on an event to expand its full metadata, actor email, and cryptographic audit identifier.",
        outcome: "Confirm immutable proof of what action occurred, who authorized it, and when it executed.",
      },
    ],
  },
];

export const SETTINGS_CONCEPTUAL_GLOSSARY: SettingsGlossaryTerm[] = [
  {
    term: "Integrity Boundary",
    definition:
      "The non-negotiable architectural separation between self-reported profile fields (such as bio, headline, and career goals) and empirical verified skills. Self-assertions can never fabricate, alter, or inflate a verified competency badge.",
    context:
      "Enforced at both the UI and database layer. Modifying your profile headline does not touch the verified_skills or candidate_skills tables.",
    relatedRoute: "/app/settings/profile",
    relatedRouteLabel: "Profile Settings",
  },
  {
    term: "Least-Privilege Ingestion",
    definition:
      "An ingestion security pattern where connected source integrations request only the minimum read-only permissions required to index work metadata (e.g. PR titles, commit lines, ticket statuses) without write access.",
    context:
      "Configured in /app/settings/connections. Skill Passport never requests write access to codebases or stores plaintext repository secrets.",
    relatedRoute: "/app/settings/connections",
    relatedRouteLabel: "Connected Accounts",
  },
  {
    term: "Disconnection Invariant",
    definition:
      "A data safety guarantee ensuring that disconnecting an external provider (such as GitHub or Jira) stops future ingestion polling immediately, but never revokes or deletes previously verified credentials and audit records.",
    context:
      "Prevents career disruption when an engineer changes employers or loses organization access. Verified skills remain permanent proof of past deliverables.",
    relatedRoute: "/app/settings/connections",
    relatedRouteLabel: "Connected Accounts",
  },
  {
    term: "Selective Recruiter Disclosure",
    definition:
      "Candidate-controlled privacy tiers that allow sharing authenticated skill badges and deliverable evidence with prospective employers while concealing personal email addresses, phone numbers, and current company names.",
    context:
      "Configured in /app/settings/privacy to prevent unsolicited headhunting and protect employer intellectual property.",
    relatedRoute: "/app/settings/privacy",
    relatedRouteLabel: "Privacy & Consent",
  },
  {
    term: "Session Pool Management",
    definition:
      "The database connectivity discipline implemented in the FastAPI backend and Supabase PostgreSQL pooler. Restricts connection pool size (e.g. 8 connections max) and disables unbound overflow to prevent connection exhaustion.",
    context:
      "Monitored under /app/settings in the Infrastructure Telemetry card to prevent EMAXCONNSESSION failures.",
    relatedRoute: "/app/settings",
    relatedRouteLabel: "Preferences & Infrastructure",
  },
  {
    term: "Immutable Audit Logging",
    definition:
      "A permanent, append-only record of all security, identity, and verification events. Every human review decision, automated ingestion run, and profile mutation generates an auditable entry with timestamps and actor IDs.",
    context:
      "Accessible in /app/activity and /app/ai/audit. Events cannot be modified or deleted by end users.",
    relatedRoute: "/app/activity",
    relatedRouteLabel: "Activity History",
  },
  {
    term: "Verifiable Truth Standard",
    definition:
      "The foundational philosophy of Skill Passport: replacing self-reported, unverifiable resume claims with cryptographically anchored deliverable evidence and dual-lane automated/human verification.",
    context:
      "Documented in /app/help. Emphasizes that skills represent empirical deliverables rather than self-awarded endorsements.",
    relatedRoute: "/app/help",
    relatedRouteLabel: "Help & Explanations",
  },
  {
    term: "Candidate Sovereignty",
    definition:
      "The principle that individual engineers own and control their career data. Candidates decide which repositories to connect, which privacy rules to enforce, and can export a full machine-readable archive of their capability data at any time.",
    context:
      "Governs all Settings & Access features and satisfies GDPR/CCPA portability mandates.",
    relatedRoute: "/app/settings/privacy",
    relatedRouteLabel: "Privacy & Consent",
  },
];

