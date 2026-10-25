/**
 * Domain 6: Sharing & Recruiter Experience
 * Product Help & Conceptual Guidance Data Catalog
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers candidate sharing workflows, recruiter portal & review experience,
 * public shared views, 3-layer architecture, 5 evidence states, 7 quality dimensions,
 * 4 guided workflows, and 18 conceptual glossary terms.
 */

export type SharingHelpTopicId =
  | "overview"
  | "share"
  | "permissions"
  | "builder"
  | "preview"
  | "access"
  | "messages"
  | "export"
  | "recruiter-passport"
  | "recruiter-portal"
  | "public-evidence"
  | "workflows"
  | "glossary";

export interface SharingStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface SharingConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface SharingStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface SharingTroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface SharingHelpTopic {
  id: SharingHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  requiredRole: "All Users (Candidates & Recruiters)" | "Candidate Only" | "Recruiter Only" | "Administrator";
  iconName:
    | "Share2"
    | "Link2"
    | "Lock"
    | "SlidersHorizontal"
    | "Eye"
    | "ShieldCheck"
    | "Mail"
    | "Download"
    | "Briefcase"
    | "Users"
    | "FileCheck2"
    | "Compass"
    | "HelpCircle";
  summary: string;
  purpose: string; // What this feature does
  whenToUse: string[]; // When should I use it?
  whoCanUse: string; // Who can use it?
  prerequisites: string[]; // What must be available before starting?
  stepByStep: SharingStepInstruction[]; // Numbered instructions using actual UI controls
  practicalExample: SharingConcreteExample; // Realistic illustrative scenario
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  understandingStatus: {
    statusBadges: SharingStatusDefinition[];
    trustPrinciples: string[];
    sharingTrustCaveat: string;
  };
  troubleshooting: SharingTroubleshootingItem[]; // What can go wrong and how to recover
  whatHappensNext: {
    downstreamFeature: string;
    nextStepAction: string;
    targetRoute: string;
  };
  knownLimitations: {
    status: "fully_implemented" | "partially_implemented";
    notes: string;
  };
  relatedLinks: Array<{ label: string; href: string }>;
}

export interface SharingGuidedWorkflow {
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
  keyTakeaway: string;
}

export interface SharingGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOPIC GUIDES FOR ALL DOMAIN 6 FEATURES
// ─────────────────────────────────────────────────────────────────────────────

export const SHARING_HELP_TOPICS: Record<SharingHelpTopicId, SharingHelpTopic> = {
  // ── 1. DOMAIN OVERVIEW ────────────────────────────────────────────────────
  overview: {
    id: "overview",
    title: "Domain 6: Sharing & Recruiter Experience Overview",
    shortTitle: "Overview",
    canonicalRoute: "/app/passport/sharing",
    badgeLabel: "Domain 6 Hub",
    requiredRole: "All Users (Candidates & Recruiters)",
    iconName: "Share2",
    summary:
      "Skill Passport Sharing enables candidates to present a selective, permission-governed view of their capabilities to employers, while providing recruiters with an authentic, evidence-backed evaluation portal.",
    purpose:
      "Domain 6 establishes the authoritative bridge between candidate capability data and external hiring decision-makers. Rather than publishing an uncurated profile indiscriminately, it provides granular control over disclosure across three connected layers: Underlying Records → Selected Shared View → Recipient's Permitted Experience. It strictly prevents unverified claims from being presented as verified, guarantees data minimization, and tracks audit telemetry.",
    whenToUse: [
      "When preparing to apply for a job and wanting to share verified technical credentials.",
      "When configuring granular sharing permissions to exclude private internal notes, work-in-progress drafts, or non-work documents.",
      "When generating a secure share link with custom expiry, template styling, and recruiter messaging.",
      "When reviewing inbound recruiter inquiries received on active passport shares.",
      "When operating as a recruiter to review shared candidate portfolios, audit code evidence, and assess job-role alignment.",
    ],
    whoCanUse:
      "Candidates manage their sharing preferences, content builder, and active links. Recruiters use the Recruiter Portal and public shared views to evaluate candidate competence without compromising candidates' private workspaces.",
    prerequisites: [
      "At least one verified skill or candidate project in Skill Passport.",
      "Active user account in Skill Passport.",
      "For recruiters: an authenticated recruiter profile associated with a verified organization.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Underlying Passport Records",
        action: "Inspect verified skills, proficiency tiers, and evidence attachments.",
        buttonOrPath: "AppTopBar / AppSidebar → Verified Skills (/app/passport/skills)",
        details:
          "Ensure that your stored skills reflect your authentic abilities and that self-declared skills are distinctly categorized from evidence-verified competencies.",
      },
      {
        stepNumber: 2,
        title: "Customize Content & Templates",
        action: "Select an archetype template and reorder display sections.",
        buttonOrPath: "Sharing Hub → Passport Content Builder (/app/passport/builder)",
        details:
          "Choose from 8 distinct layout archetypes (e.g. Technical Portfolio, AI/ML Specialist, Executive Summary) matching your target audience.",
      },
      {
        stepNumber: 3,
        title: "Configure Sharing Permissions",
        action: "Set granular section visibility and evidence inspection levels.",
        buttonOrPath: "Sharing Hub → Sharing Permissions (/app/passport/permissions)",
        details:
          "Choose between 'None', 'Summary Only', or 'Detail Inspection' for evidence, and toggle identity or role-alignment sections.",
      },
      {
        stepNumber: 4,
        title: "Preview Recipient View",
        action: "Verify the candidate and recruiter perspective before distribution.",
        buttonOrPath: "Sharing Hub → Live Passport Preview (/app/passport/preview)",
        details:
          "Inspect the preview to confirm that private documents, internal system notes, and restricted credentials are completely hidden.",
      },
      {
        stepNumber: 5,
        title: "Generate and Distribute Secure Share Link",
        action: "Create a cryptographically unguessable share token.",
        buttonOrPath: "Sharing Hub → Create Share Link (/app/passport/share)",
        details:
          "Set link labels, optional expiry dates (7, 14, 30 days, or permanent), and enable reciprocal recruiter messaging.",
      },
    ],
    practicalExample: {
      title: "Targeted Senior Full-Stack Engineering Share",
      startingState:
        "A software engineer has 14 verified skills, 2 self-declared skills, and 8 project evidence items (some containing internal enterprise client names).",
      actionTaken:
        "The engineer sets evidence access to 'Summary Only' with selected projects set to 'Detail Inspection' for public GitHub repos. They exclude personal contact numbers, choose the 'Technical Portfolio' template, and generate an active link labelled 'Acme Corp Senior Role'.",
      resultingOutcome:
        "The generated public link (/p/sp_shr_acme821) displays only the chosen technical projects, highlights verified full-stack skills with cryptographic provenance, clearly badges self-declared skills as 'Self-Declared · Not independently verified', and hides private client documents.",
      inspectionGuide:
        "Open '/app/passport/preview?view=recruiter' or open the link in an incognito window to verify the recipient experience.",
      recoveryNote:
        "If an unintended project was included, navigate to '/app/passport/access' and immediately click 'Revoke Access' to terminate the link.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Candidate Skill Passport record (verified skills, custom skills, evidence items).",
        "Permission configuration object (section flags, evidence access level, expiry).",
        "Target audience context (general portfolio vs technical recruiter).",
      ],
      outputArtifacts: [
        "Cryptographically secure share link (/p/[shareId]).",
        "Persistent ShareLinkRecord in Postgres DB.",
        "ShareAccessEvent audit trail logs.",
      ],
      originAndProcessing:
        "Generated client-side via permission forms, validated server-side in backend/app/api/sharing.py, and persisted to share_links table.",
      generatedVsPersisted:
        "Share configuration and audit logs are fully persisted in Postgres. Public projections are dynamically rendered from persisted records with strict sanitization.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "active",
          badgeLabel: "Active Share",
          meaning: "The link is live and accessible to anyone with the unique URL.",
          nextAction: "Share link with intended recipients.",
        },
        {
          status: "expired",
          badgeLabel: "Expired",
          meaning: "The link has passed its configured expiration timestamp and rejects all access.",
          nextAction: "Generate a new share link or renew expiration date.",
        },
        {
          status: "revoked",
          badgeLabel: "Revoked",
          meaning: "The candidate manually terminated access. All capability data is permanently blocked from this URL.",
          nextAction: "Create a new share link if sharing needs to be resumed.",
        },
      ],
      trustPrinciples: [
        "A shared passport is a filtered view, never a transfer of the full underlying workspace.",
        "Permissions for an individual link are immutably captured at creation; changing global defaults does not silently alter existing links.",
        "Self-declared skills are always labeled distinctly and never count toward verified totals.",
        "Recruiter messaging delivery is tracked and confirmed by server receipt, not client click.",
      ],
      sharingTrustCaveat:
        "Permission to view a passport does not guarantee the candidate's real-world job performance or replace technical interviews. It proves that the displayed evidence met the application's verification criteria.",
    },
    troubleshooting: [
      {
        symptom: "A section added to my profile does not appear in my shared passport.",
        probableCause: "The section was not enabled in that link's specific permissions or is not supported by the chosen template.",
        verifiedRemedy: "Check the permissions assigned to that individual link in '/app/passport/access' or create a new link with the section enabled.",
      },
      {
        symptom: "I updated my general sharing settings, but existing links didn't change.",
        probableCause: "Global defaults only govern newly created links. Existing links maintain their saved configuration.",
        verifiedRemedy: "This is intentional behavior to prevent accidental over-sharing on existing links. To update an existing share, generate a new link or edit the share's specific settings.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Create Share Link",
      nextStepAction: "Configure and generate a secure token to distribute to employers.",
      targetRoute: "/app/passport/share",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Full sharing lifecycle, granular permission gating, 8 templates, recruiter portal, and audit logs are live in production.",
    },
    relatedLinks: [
      { label: "Create Share Link", href: "/app/passport/share" },
      { label: "Sharing Permissions", href: "/app/passport/permissions" },
      { label: "Passport Builder", href: "/app/passport/builder" },
      { label: "Manage Access", href: "/app/passport/access" },
    ],
  },

  // ── 2. CREATE SHARE LINK ──────────────────────────────────────────────────
  share: {
    id: "share",
    title: "Create Share Link & Link Hub",
    shortTitle: "Create Link",
    canonicalRoute: "/app/passport/share",
    badgeLabel: "Links Hub",
    requiredRole: "Candidate Only",
    iconName: "Link2",
    summary:
      "Generate cryptographically unguessable share links with custom audience labels, expiration dates, template archetypes, and reciprocal recruiter messaging.",
    purpose:
      "Allows candidates to create and manage dedicated share URLs tailored to specific employers or opportunities. Each link possesses its own independent configuration, ensuring that sharing with one recipient never accidentally exposes details intended only for another.",
    whenToUse: [
      "When applying to a specific company and wanting to provide a tailored, verifiable portfolio.",
      "When you need an expiring link (e.g. 7 or 14 days) for a time-limited job interview process.",
      "When enabling recruiters to send direct inquiries through an integrated contact modal.",
    ],
    whoCanUse: "All candidates with an active Skill Passport.",
    prerequisites: [
      "Review of passport accuracy in Verified Skills (/app/passport/skills).",
      "Preview confirmation in Passport Preview (/app/passport/preview).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Click 'Create New Share Link'",
        action: "Open the link generation modal in the Sharing Hub.",
        buttonOrPath: "Create Share Link → Primary Button 'Create Share Link' (/app/passport/share)",
        details: "Opens the multi-step link creation wizard.",
      },
      {
        stepNumber: 2,
        title: "Enter Audience Label",
        action: "Provide a descriptive name (e.g. 'Stripe - Staff Platform Engineer').",
        buttonOrPath: "Modal Input → 'Link Label / Intended Audience'",
        details: "Labels are private to your dashboard and help you identify who is accessing the link.",
      },
      {
        stepNumber: 3,
        title: "Select Template Archetype",
        action: "Pick from 8 templates (e.g. Technical Portfolio, Verified Competency, Executive Summary).",
        buttonOrPath: "Modal Select → 'Passport Template'",
        details: "Controls visual hierarchy, layout density, and prominent capability cards.",
      },
      {
        stepNumber: 4,
        title: "Configure Link Expiry & Messaging",
        action: "Choose link validity period and enable the 'Contact Candidate' button.",
        buttonOrPath: "Modal Radios → 'Expires in: 7 Days / 14 Days / 30 Days / Never'",
        details: "Toggle 'Allow Recruiter Messaging' to receive inbound inquiries into your passport inbox.",
      },
      {
        stepNumber: 5,
        title: "Generate and Copy URL",
        action: "Submit form and copy the resulting URL.",
        buttonOrPath: "Modal Button → 'Generate Link' then 'Copy URL'",
        details: "Produces a secure link format: 'https://skillpassport.io/p/sp_shr_[token]'.",
      },
    ],
    practicalExample: {
      title: "Expiring 14-Day Share for Technical Interview",
      startingState: "A candidate is interviewing with Google Cloud and needs to provide proof of distributed systems competence.",
      actionTaken:
        "The candidate creates a share labeled 'Google Cloud Interview', selects the 'Technical Portfolio' template, enables 'Detail Inspection' for the Kubernetes repo, checks 'Allow Recruiter Messaging', and sets expiration to 14 days.",
      resultingOutcome:
        "A unique token is created. Google recruiters can inspect code commits and test suites. After 14 days, the link automatically expires and denies access.",
      inspectionGuide: "View the active link and its countdown timer in '/app/passport/access'.",
      recoveryNote: "If the recruiter asks for an extension, edit the expiration date in '/app/passport/access'.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Link label", "Template selection", "Expiration choice", "Messaging preference"],
      outputArtifacts: ["Unique ShareLinkRecord with crypto token", "Public URL: /p/[token]"],
      originAndProcessing: "Handled by backend POST /api/v1/sharing/links with server-side token generation.",
      generatedVsPersisted: "Persisted in PostgreSQL database with access counters and timestamps.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "active", badgeLabel: "Active", meaning: "Link is valid and accessible.", nextAction: "Distribute link." },
        { status: "expired", badgeLabel: "Expired", meaning: "Link passed expiration date.", nextAction: "Renew or delete." },
        { status: "revoked", badgeLabel: "Revoked", meaning: "Manually revoked by candidate.", nextAction: "No action." },
      ],
      trustPrinciples: [
        "Tokens are generated with cryptographically secure random bytes.",
        "Link configurations cannot be tampered with by URL parameter manipulation.",
      ],
      sharingTrustCaveat:
        "Sending a link to one person does not prevent them from forwarding it. Use link expiration and revocation controls to manage exposure over time.",
    },
    troubleshooting: [
      {
        symptom: "The copied link gives a 404 Not Found error.",
        probableCause: "The token in the URL was truncated when copying or pasting.",
        verifiedRemedy: "Use the 'Copy Link' button in the Sharing Hub to copy the complete unaltered URL.",
      },
      {
        symptom: "The link shows 'Access Expired'.",
        probableCause: "The configured expiration date has passed.",
        verifiedRemedy: "Renew the link or create a new share link in '/app/passport/share'.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Live Passport Preview",
      nextStepAction: "Review exactly how the recipient will see your passport before sharing.",
      targetRoute: "/app/passport/preview",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Token generation, validation, custom labels, and expiration triggers are fully active.",
    },
    relatedLinks: [
      { label: "Sharing Overview", href: "/app/passport/sharing" },
      { label: "Manage Access", href: "/app/passport/access" },
      { label: "Passport Preview", href: "/app/passport/preview" },
    ],
  },

  // ── 3. SHARING PERMISSIONS ────────────────────────────────────────────────
  permissions: {
    id: "permissions",
    title: "Sharing Permissions & Data Minimization",
    shortTitle: "Permissions",
    canonicalRoute: "/app/passport/permissions",
    badgeLabel: "Data Governance",
    requiredRole: "Candidate Only",
    iconName: "Lock",
    summary:
      "Configure granular section visibility, evidence exposure levels (None / Summary / Detail), and global sharing defaults.",
    purpose:
      "Enforces the fundamental principle of candidate data minimization: only disclose what is relevant to the recipient's purpose. Protects private internal documents, unvetted drafts, and sensitive personal identifiers from being exposed.",
    whenToUse: [
      "Before creating new share links to set your baseline sharing preferences.",
      "When applying to sensitive roles where proprietary employer code must be restricted to summaries only.",
      "When tailoring a share to hide non-technical sections (e.g. hiding education or certifications for a pure code review).",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["Stored skills and evidence items in Skill Passport."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Permissions Manager",
        action: "Navigate to the Sharing Permissions workspace.",
        buttonOrPath: "AppTopBar → Sharing Permissions (/app/passport/permissions)",
        details: "Displays current global default permissions and section switches.",
      },
      {
        stepNumber: 2,
        title: "Configure Identity & Contact Disclosure",
        action: "Toggle visibility of full name, headline, summary, and email/LinkedIn.",
        buttonOrPath: "Card → 'Candidate Identity & Contact Information'",
        details: "Disabling contact info allows anonymous technical skill reviews.",
      },
      {
        stepNumber: 3,
        title: "Set Evidence Access Level",
        action: "Select 'None', 'Summary Only', or 'Detail Inspection'.",
        buttonOrPath: "Radio Group → 'Evidence Access Level'",
        details:
          "'Summary Only' exposes the project title and brief explanation without code excerpts or files. 'Detail Inspection' permits full file/repo inspection.",
      },
      {
        stepNumber: 4,
        title: "Select Specific Skills & Sections",
        action: "Check or uncheck individual skill categories and sections.",
        buttonOrPath: "Section Checkboxes → 'Skills, Projects, Education, Work Experience'",
        details: "Unchecked sections will be completely omitted from the rendered recipient view.",
      },
      {
        stepNumber: 5,
        title: "Save Permissions Configuration",
        action: "Save settings to apply as future share defaults.",
        buttonOrPath: "Bottom Action Bar → 'Save Permissions'",
        details: "Updates user sharing preferences in Postgres.",
      },
    ],
    practicalExample: {
      title: "Redacting Proprietary Enterprise Architecture Work",
      startingState: "A candidate worked on a confidential enterprise fintech platform with high-level architectural artifacts.",
      actionTaken:
        "The candidate sets Evidence Access Level to 'Summary Only' and toggles off 'Internal Project Documents'. For public open-source repos, they specifically enable 'Detail Inspection'.",
      resultingOutcome:
        "Recruiters see the verified fintech competency and summary of responsibilities, but cannot view internal architectural diagrams or confidential client references.",
      inspectionGuide: "Verify the redacted view in Passport Preview (/app/passport/preview).",
      recoveryNote: "Permission changes can be adjusted at any time in '/app/passport/permissions'.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Identity toggle states", "Section selection checkboxes", "Evidence access level enum"],
      outputArtifacts: ["Updated user default SharePermissionsConfig in DB"],
      originAndProcessing: "Stored in database and applied by backend projection engine.",
      generatedVsPersisted: "Persisted in user profile metadata and individual ShareLinkRecords.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "detail", badgeLabel: "Detail Inspection", meaning: "Full artifact view & file inspection enabled.", nextAction: "Ensure private files are excluded." },
        { status: "summary", badgeLabel: "Summary Only", meaning: "Summaries visible, raw code/files hidden.", nextAction: "Ideal for proprietary work." },
        { status: "none", badgeLabel: "No Evidence", meaning: "Skills displayed with verification badge only; evidence items hidden.", nextAction: "Use for high-level overviews." },
      ],
      trustPrinciples: [
        "Default to least privilege: private internal extraction notes are never exposed.",
        "Individual share settings always override global defaults.",
      ],
      sharingTrustCaveat:
        "Setting evidence to 'None' prevents recipients from independently reviewing proof. Balance privacy with evidence sufficiency.",
    },
    troubleshooting: [
      {
        symptom: "A recruiter asks to see code evidence, but the link shows 'Evidence details restricted'.",
        probableCause: "The share was created with 'Summary Only' or 'None' evidence access.",
        verifiedRemedy: "Create a new share link with 'Detail Inspection' enabled for that specific recruiter.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Passport Content Builder",
      nextStepAction: "Organize and curate which skills and projects feature prominently.",
      targetRoute: "/app/passport/builder",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Three-tier evidence access gating and section filtering are fully active.",
    },
    relatedLinks: [
      { label: "Sharing Overview", href: "/app/passport/sharing" },
      { label: "Live Preview", href: "/app/passport/preview" },
      { label: "Passport Builder", href: "/app/passport/builder" },
    ],
  },

  // ── 4. PASSPORT CONTENT BUILDER ───────────────────────────────────────────
  builder: {
    id: "builder",
    title: "Passport Content Builder",
    shortTitle: "Content Builder",
    canonicalRoute: "/app/passport/builder",
    badgeLabel: "Curation Engine",
    requiredRole: "Candidate Only",
    iconName: "SlidersHorizontal",
    summary:
      "Select layout archetypes, reorder display sections, highlight signature competencies, and curate custom headline and summary copy.",
    purpose:
      "Enables candidates to present their verified capabilities in the most effective structural layout for their target career trajectory, from fast executive overviews to deep code-focused portfolios.",
    whenToUse: [
      "When curating a tailored presentation for a specific role archetype (e.g. Research vs Engineering).",
      "When highlighting top 3 signature skills above general competencies.",
      "When drafting a custom introductory executive summary for a shared passport.",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["Verified skills in Skill Passport."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Choose Template Archetype",
        action: "Select from 8 visual templates.",
        buttonOrPath: "Builder Grid → 'Template Picker' (e.g. Technical Portfolio, AI/ML Specialist)",
        details: "Instantly updates layout structure and typography preview.",
      },
      {
        stepNumber: 2,
        title: "Reorder Display Sections",
        action: "Drag and drop or toggle section order (Skills, Projects, Experience, Role Match).",
        buttonOrPath: "List Items → 'Drag Handles / Section Toggles'",
        details: "Place your strongest capabilities at the top of the recipient's screen.",
      },
      {
        stepNumber: 3,
        title: "Curate Signature Skills",
        action: "Pin up to 5 verified skills as featured highlights.",
        buttonOrPath: "Skill Cards → 'Pin as Signature Skill'",
        details: "Signature skills receive prominent visual callouts and priority evidence badges.",
      },
      {
        stepNumber: 4,
        title: "Write Custom Headline & Summary",
        action: "Craft a tailored introductory statement.",
        buttonOrPath: "Textarea → 'Custom Passport Headline & Bio'",
        details: "Explain your professional focus directly to the recruiter.",
      },
      {
        stepNumber: 5,
        title: "Save Builder Configuration",
        action: "Persist configuration for use in share generation.",
        buttonOrPath: "Action Button → 'Apply & Save Template'",
        details: "Updates builder profile state.",
      },
    ],
    practicalExample: {
      title: "Transitioning from Backend to AI Systems Engineer",
      startingState: "A candidate has both backend Java skills and recently verified PyTorch & LLM fine-tuning skills.",
      actionTaken:
        "The candidate chooses the 'AI/ML Engineer' template, pins PyTorch, LangChain, and Vector DBs as top signature skills, reorders 'AI Projects' above 'Enterprise Backend', and adds a targeted summary.",
      resultingOutcome:
        "The recipient recruiter immediately encounters the candidate as an AI Systems specialist with relevant model training evidence front and center.",
      inspectionGuide: "Preview in '/app/passport/preview'.",
      recoveryNote: "Reset to default order at any time using 'Reset to Default Layout'.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Template ID", "Section order array", "Signature skill IDs", "Custom summary text"],
      outputArtifacts: ["Builder configuration object saved to profile"],
      originAndProcessing: "Managed in React state and synced to database.",
      generatedVsPersisted: "Persisted in user profile and attached to share links.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "customized", badgeLabel: "Custom Layout", meaning: "Custom template & section order applied.", nextAction: "Preview before sharing." },
        { status: "default", badgeLabel: "Default Layout", meaning: "Standard Skill Passport layout.", nextAction: "Customize as desired." },
      ],
      trustPrinciples: [
        "Customizing presentation order never alters underlying verification status or evidence integrity.",
      ],
      sharingTrustCaveat:
        "Highlighting certain skills does not make other unpinned skills invalid; all verified skills remain accessible in the full skills list.",
    },
    troubleshooting: [
      {
        symptom: "Reordered sections revert when navigating away.",
        probableCause: "You did not click 'Apply & Save Template' before leaving.",
        verifiedRemedy: "Ensure you click the save button at the bottom of the builder page.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Live Passport Preview",
      nextStepAction: "Preview the curated layout as an external viewer.",
      targetRoute: "/app/passport/preview",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "8 layout templates and section reordering are fully active.",
    },
    relatedLinks: [
      { label: "Live Preview", href: "/app/passport/preview" },
      { label: "Sharing Permissions", href: "/app/passport/permissions" },
      { label: "Create Share Link", href: "/app/passport/share" },
    ],
  },

  // ── 5. LIVE PASSPORT PREVIEW & RECRUITER MODE ──────────────────────────────
  preview: {
    id: "preview",
    title: "Live Passport Preview & Recruiter Mode",
    shortTitle: "Preview",
    canonicalRoute: "/app/passport/preview",
    badgeLabel: "Recipient Simulation",
    requiredRole: "Candidate Only",
    iconName: "Eye",
    summary:
      "Inspect exactly what external recipients will see before distributing a link. Toggle between Candidate View and Recruiter View.",
    purpose:
      "Prevents accidental disclosure of private records and ensures that formatting, evidence summaries, and verified badges appear as intended. Simulates the actual public recipient interface (/p/[shareId]).",
    whenToUse: [
      "Mandatory pre-share step before sending any link to external parties.",
      "To verify that excluded sections or restricted evidence items are completely hidden.",
      "To test how recruiter contact buttons and role-alignment cards display.",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["Configured permissions or builder template."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Live Preview",
        action: "Navigate to the preview workspace.",
        buttonOrPath: "AppTopBar / AppSidebar → Live Passport Preview (/app/passport/preview)",
        details: "Renders your passport inside an interactive preview frame.",
      },
      {
        stepNumber: 2,
        title: "Switch Between Templates",
        action: "Use the top template switcher to compare layouts.",
        buttonOrPath: "Top Bar → Template Select Dropdown",
        details: "Preview how your data adapts to different visual archetypes.",
      },
      {
        stepNumber: 3,
        title: "Toggle Recruiter Mode",
        action: "Click 'Recruiter View' toggle to simulate hiring manager experience.",
        buttonOrPath: "Top Bar Toggle → 'Recruiter View (?view=recruiter)'",
        details: "Reveals recruiter evaluation cues, evidence inspection drawers, and contact modals.",
      },
      {
        stepNumber: 4,
        title: "Audit Redactions & Evidence Gating",
        action: "Click into individual skills to test evidence expansion.",
        buttonOrPath: "Skill Cards → 'Inspect Evidence'",
        details: "Confirm that only authorized summaries and files are accessible.",
      },
      {
        stepNumber: 5,
        title: "Proceed to Create Share Link",
        action: "Once satisfied with the preview, click 'Create Share Link'.",
        buttonOrPath: "Top Bar Action → 'Share This View'",
        details: "Opens link generation with the confirmed configuration.",
      },
    ],
    practicalExample: {
      title: "Catching an Accidental Internal Note Before Distribution",
      startingState: "A candidate is preparing a passport share for an executive recruiter.",
      actionTaken:
        "The candidate opens Passport Preview and inspects a project card. They notice an internal debugging note in one project summary.",
      resultingOutcome:
        "The candidate returns to Evidence Workspace to edit the summary before creating the link, avoiding sharing confidential internal comments.",
      inspectionGuide: "Check every expandable card in preview mode.",
      recoveryNote: "Editing evidence metadata immediately updates all future and active draft previews.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Current passport data", "Active template selection", "View mode (candidate vs recruiter)"],
      outputArtifacts: ["Rendered interactive simulation of /p/[shareId]"],
      originAndProcessing: "Rendered via TemplateDispatcher component using draft projection API.",
      generatedVsPersisted: "Dynamic client-side preview with zero persistent side-effects.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "preview_mode", badgeLabel: "Preview Mode", meaning: "Draft simulation; no public link is active yet.", nextAction: "Audit content and create link." },
        { status: "recruiter_view", badgeLabel: "Recruiter Perspective", meaning: "Shows recipient evaluation controls and contact buttons.", nextAction: "Confirm ease of evaluation." },
      ],
      trustPrinciples: [
        "What you see in preview is mathematically identical to what the public endpoint renders for those permissions.",
      ],
      sharingTrustCaveat:
        "Previewing your passport does not generate a shareable link; you must explicitly create a share link to distribute it.",
    },
    troubleshooting: [
      {
        symptom: "Preview displays empty sections.",
        probableCause: "The corresponding data (e.g. projects or certifications) has not been added to your profile.",
        verifiedRemedy: "Add the necessary evidence items in Evidence Workspace (/app/evidence).",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Create Share Link",
      nextStepAction: "Generate a live link based on the verified preview.",
      targetRoute: "/app/passport/share",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Full interactive simulation with recruiter toggle is active.",
    },
    relatedLinks: [
      { label: "Create Share Link", href: "/app/passport/share" },
      { label: "Passport Builder", href: "/app/passport/builder" },
      { label: "Sharing Permissions", href: "/app/passport/permissions" },
    ],
  },

  // ── 6. MANAGE SHARED ACCESS & REVOCATION ──────────────────────────────────
  access: {
    id: "access",
    title: "Manage Shared Access & Revocation",
    shortTitle: "Manage Access",
    canonicalRoute: "/app/passport/access",
    badgeLabel: "Access Control",
    requiredRole: "Candidate Only",
    iconName: "ShieldCheck",
    summary:
      "Monitor active share links, view real-time access telemetry, inspect recipient visit logs, and immediately revoke public access.",
    purpose:
      "Gives candidates continuous authority over their distributed data. When a hiring cycle ends or an opportunity is closed, candidates can immediately revoke any link, purging public capability data from that URL.",
    whenToUse: [
      "To check how many times a recruiter has viewed your shared passport.",
      "To review the access history, timestamps, and sections viewed.",
      "To terminate access immediately when you no longer want a recipient to view your data.",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["At least one share link created."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Shared Access Hub",
        action: "Navigate to Manage Shared Access.",
        buttonOrPath: "AppTopBar / AppSidebar → Manage Shared Access (/app/passport/access)",
        details: "Lists all active, expired, and revoked share links.",
      },
      {
        stepNumber: 2,
        title: "Review Access Telemetry",
        action: "Inspect view counts, last accessed timestamps, and recipient labels.",
        buttonOrPath: "Link Cards → 'Access Count & Last Viewed'",
        details: "Real-time logs populated from server-side ShareAccessEvent records.",
      },
      {
        stepNumber: 3,
        title: "Inspect Link Details & Permissions",
        action: "Click 'View Details' on any link card.",
        buttonOrPath: "Link Card → 'View Permissions & History'",
        details: "Shows the exact configuration attached to that specific token.",
      },
      {
        stepNumber: 4,
        title: "Execute Immediate Revocation",
        action: "Click 'Revoke Access' and confirm in the confirmation dialog.",
        buttonOrPath: "Link Card → 'Revoke Access' button (red)",
        details: "Immediately sets link status to 'revoked' and records the revocation timestamp.",
      },
      {
        stepNumber: 5,
        title: "Verify Public Blocking",
        action: "Confirm that navigating to the URL renders the 'Access Revoked' screen.",
        buttonOrPath: "Link Details → 'Test Link (/p/[token])'",
        details: "Confirms that all capability data is completely scrubbed from public display.",
      },
    ],
    practicalExample: {
      title: "Ending Access After Offer Acceptance",
      startingState: "A candidate had distributed 3 share links to different companies and accepts an offer from one.",
      actionTaken:
        "The candidate navigates to '/app/passport/access' and clicks 'Revoke Access' on the links shared with the other two companies.",
      resultingOutcome:
        "The two links immediately display the formal 'Access Revoked by Candidate' notification. All skills, projects, and contact info are purged from those URLs.",
      inspectionGuide: "Check status in the access list; revoked links display a red 'Revoked' badge.",
      recoveryNote:
        "Revocation cannot guarantee that a recipient has not already taken screenshots or saved offline PDFs while the link was active.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Share link ID", "Revocation confirmation reason"],
      outputArtifacts: ["Updated ShareLinkRecord (status: 'revoked', revoked_at: now())"],
      originAndProcessing: "Processed via POST /api/v1/sharing/links/{id}/revoke.",
      generatedVsPersisted: "Permanently stored in database.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "active", badgeLabel: "Active", meaning: "Link is accepting incoming visits.", nextAction: "Monitor access." },
        { status: "revoked", badgeLabel: "Revoked", meaning: "Permanently terminated by candidate.", nextAction: "No action required." },
        { status: "expired", badgeLabel: "Expired", meaning: "Automatically closed by expiry timer.", nextAction: "Renew if requested." },
      ],
      trustPrinciples: [
        "Revocation takes effect immediately on the next HTTP request.",
        "Managing or revoking one link never alters or disables any other active link.",
      ],
      sharingTrustCaveat:
        "Remember that revoking a link cannot erase information that an external recruiter previously copied or downloaded.",
    },
    troubleshooting: [
      {
        symptom: "Revoked link is still cached in my browser.",
        probableCause: "Local browser HTTP cache.",
        verifiedRemedy: "Hard refresh (Ctrl+F5 or Cmd+Shift+R) or test in an incognito window to see the authoritative server response.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Recruiter Inquiries",
      nextStepAction: "Review messages sent by recruiters while the links were active.",
      targetRoute: "/app/passport/messages",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Real-time revocation, access event logging, and status tracking are fully operational.",
    },
    relatedLinks: [
      { label: "Sharing Overview", href: "/app/passport/sharing" },
      { label: "Create Share Link", href: "/app/passport/share" },
      { label: "Recruiter Inquiries", href: "/app/passport/messages" },
    ],
  },

  // ── 7. RECRUITER INQUIRIES & CANDIDATE INBOX ──────────────────────────────
  messages: {
    id: "messages",
    title: "Recruiter Inquiries & Candidate Inbox",
    shortTitle: "Inquiries",
    canonicalRoute: "/app/passport/messages",
    badgeLabel: "Communication Hub",
    requiredRole: "Candidate Only",
    iconName: "Mail",
    summary:
      "Receive, review, and reply to inbound technical inquiries and interview requests sent by recruiters viewing your shared passport.",
    purpose:
      "Provides a secure, professional channel for recruiters to ask follow-up questions about specific project contributions, tools, or assessments without exposing the candidate's personal phone number or private email.",
    whenToUse: [
      "When a recruiter views your public passport and submits an inquiry via the 'Contact Candidate' modal.",
      "To read questions regarding specific evidence artifacts or technical trade-offs.",
      "To reply directly through the integrated communication interface.",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["At least one share link with 'Allow Recruiter Messaging' enabled."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Inquiries Inbox",
        action: "Navigate to Recruiter Inquiries.",
        buttonOrPath: "AppTopBar / AppSidebar → Recruiter Inquiries (/app/passport/messages)",
        details: "Displays unread badge counts and chronological message threads.",
      },
      {
        stepNumber: 2,
        title: "Inspect Inbound Message",
        action: "Click an inquiry to open the full conversation thread.",
        buttonOrPath: "Message Item → Click to Open",
        details: "Shows recruiter name, company, verified status, subject, and message body.",
      },
      {
        stepNumber: 3,
        title: "Verify Associated Share Link",
        action: "Check which share link the recruiter used to contact you.",
        buttonOrPath: "Message Header → 'Associated Share Link: [Label]'",
        details: "Provides context on which permissions and projects the recruiter viewed.",
      },
      {
        stepNumber: 4,
        title: "Compose and Send Reply",
        action: "Type your professional response and click 'Send Reply'.",
        buttonOrPath: "Composer Textarea → 'Send Reply' button",
        details: "Dispatches reply directly to the recruiter's inbox with confirmed delivery status.",
      },
      {
        stepNumber: 5,
        title: "Mark as Addressed / Archive",
        action: "Archive or flag completed conversations.",
        buttonOrPath: "Thread Actions → 'Archive Conversation'",
        details: "Keeps your active inbox focused on current opportunities.",
      },
    ],
    practicalExample: {
      title: "Clarifying Distributed Caching Architecture",
      startingState: "A recruiter from a fintech firm reviews a shared passport and sends an inquiry: 'Could you explain why Redis Cluster was selected over Memcached in Project Alpha?'",
      actionTaken:
        "The candidate opens '/app/passport/messages', reviews the message, and types a detailed technical response explaining replication requirements and persistence guarantees.",
      resultingOutcome:
        "The recruiter receives the response in their Recruiter Inbox, verifying candidate depth and scheduling a formal technical interview.",
      inspectionGuide: "Review message status in '/app/passport/messages'.",
      recoveryNote: "Messages cannot be unsent once delivered; review draft carefully before submitting.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Candidate reply text", "Recipient recruiter user ID / email"],
      outputArtifacts: ["RecruiterMessage record updated with reply_body and replied_at timestamp"],
      originAndProcessing: "Stored in recruiter_messages table in Postgres.",
      generatedVsPersisted: "Full thread history is permanently persisted.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "unread", badgeLabel: "Unread", meaning: "New inquiry requiring candidate attention.", nextAction: "Open and review." },
        { status: "replied", badgeLabel: "Replied", meaning: "Candidate has sent a response.", nextAction: "Awaiting recruiter response." },
        { status: "archived", badgeLabel: "Archived", meaning: "Conversation concluded.", nextAction: "No action." },
      ],
      trustPrinciples: [
        "A message is marked delivered only upon successful database persistence and server receipt.",
        "Candidate contact details remain private unless explicitly disclosed in message body.",
      ],
      sharingTrustCaveat:
        "Keep communications professional and focused on demonstrated capabilities. Do not share confidential credentials or keys in messages.",
    },
    troubleshooting: [
      {
        symptom: "No inquiries received despite high link views.",
        probableCause: "The 'Allow Recruiter Messaging' toggle was turned off when the link was created.",
        verifiedRemedy: "Ensure 'Allow Recruiter Messaging' is checked when generating share links.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Manage Shared Access",
      nextStepAction: "Review overall link engagement and access history.",
      targetRoute: "/app/passport/access",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Two-way recruiter-candidate messaging with delivery tracking is fully operational.",
    },
    relatedLinks: [
      { label: "Manage Access", href: "/app/passport/access" },
      { label: "Sharing Overview", href: "/app/passport/sharing" },
      { label: "Create Share Link", href: "/app/passport/share" },
    ],
  },

  // ── 8. PASSPORT EXPORT & PORTABILITY ──────────────────────────────────────
  export: {
    id: "export",
    title: "Passport Export & Portability",
    shortTitle: "Export",
    canonicalRoute: "/app/passport/export",
    badgeLabel: "Portability",
    requiredRole: "Candidate Only",
    iconName: "Download",
    summary:
      "Export your verified Skill Passport in industry-standard formats, including PDF resumes, JSON-LD data packages, and W3C Verifiable Credentials.",
    purpose:
      "Guarantees candidate data portability and sovereign ownership. Candidates can export their verified skills, evidence logs, and audit credentials for offline distribution or inclusion in external HR systems.",
    whenToUse: [
      "When an employer requires a traditional PDF resume attached to an application form.",
      "When integrating skill credentials with an external learning ledger or ATS.",
      "When keeping personal offline archives of verified technical capabilities.",
    ],
    whoCanUse: "All candidates.",
    prerequisites: ["Verified skills in Skill Passport."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Passport Export Workspace",
        action: "Navigate to Passport Export.",
        buttonOrPath: "AppTopBar / AppSidebar → Passport Export (/app/passport/export)",
        details: "Displays export format options and preview options.",
      },
      {
        stepNumber: 2,
        title: "Select Export Format",
        action: "Choose between PDF, JSON-LD, or W3C Verifiable Credential.",
        buttonOrPath: "Format Selector Cards → 'PDF / JSON / Verifiable Credential'",
        details: "PDF is styled according to your selected template archetype.",
      },
      {
        stepNumber: 3,
        title: "Configure Export Inclusions",
        action: "Choose whether to include verification hashes and QR code verification links.",
        buttonOrPath: "Checkboxes → 'Include Verification QR Code & Hashes'",
        details: "Allows recipients of the printed PDF to verify authenticity online.",
      },
      {
        stepNumber: 4,
        title: "Generate and Download",
        action: "Click 'Download Export Package'.",
        buttonOrPath: "Primary Action Button → 'Download [Format]'",
        details: "Generates the file directly in your browser with zero data loss.",
      },
    ],
    practicalExample: {
      title: "Submitting PDF Resume with Verification QR Code",
      startingState: "A candidate is applying to a company whose portal only accepts PDF uploads.",
      actionTaken:
        "The candidate selects the 'Professional Resume' template in Export, checks 'Include Verification QR Code', and downloads the PDF.",
      resultingOutcome:
        "The PDF contains clean, structured skills and a scannable QR code that directs hiring managers to the live verified Skill Passport.",
      inspectionGuide: "Open the downloaded PDF and scan the QR code with a mobile device.",
      recoveryNote: "Re-export at any time to include newly verified skills.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Selected export format", "Inclusion toggles (QR code, hashes)"],
      outputArtifacts: ["PDF document", "JSON-LD credential file"],
      originAndProcessing: "Generated client-side via print stylesheet or server-side PDF generator.",
      generatedVsPersisted: "Downloaded locally to the user's filesystem.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "portable", badgeLabel: "Portable Data", meaning: "Data is packaged without vendor lock-in.", nextAction: "Download archive." },
        { status: "cryptographic", badgeLabel: "Cryptographic QR", meaning: "QR code links to authoritative public verification endpoint.", nextAction: "Verify scan." },
      ],
      trustPrinciples: [
        "Exported documents preserve the distinction between verified competencies and self-declared skills.",
      ],
      sharingTrustCaveat:
        "A static PDF cannot be remotely revoked once sent. Distribute PDFs with the same discretion as share links.",
    },
    troubleshooting: [
      {
        symptom: "PDF formatting breaks across pages.",
        probableCause: "Browser print margins or scaling.",
        verifiedRemedy: "In browser print settings, select 'Default Margins' and disable 'Headers and Footers'.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Sharing Overview",
      nextStepAction: "Return to the central sharing management dashboard.",
      targetRoute: "/app/passport/sharing",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "PDF, JSON-LD, and print view generation are fully operational.",
    },
    relatedLinks: [
      { label: "Sharing Overview", href: "/app/passport/sharing" },
      { label: "Passport Builder", href: "/app/passport/builder" },
      { label: "Live Preview", href: "/app/passport/preview" },
    ],
  },

  // ── 9. RECRUITER PASSPORT EXPERIENCE ──────────────────────────────────────
  "recruiter-passport": {
    id: "recruiter-passport",
    title: "Recruiter Passport Experience (/p/[shareId])",
    shortTitle: "Recruiter View",
    canonicalRoute: "/p/[shareId]",
    badgeLabel: "Public Recipient View",
    requiredRole: "All Users (Candidates & Recruiters)",
    iconName: "Briefcase",
    summary:
      "The public, recipient-facing passport view. Allows recruiters to review candidate competence, inspect supporting code artifacts, assess role fit, and submit inquiries.",
    purpose:
      "Serves as the authoritative, tamper-resistant presentation of a candidate's demonstrated capabilities. Structured to make evaluation fast, objective, and auditable while protecting candidates from unauthorized data scraping.",
    whenToUse: [
      "When a recruiter opens a link provided by an applicant.",
      "To inspect the 6 core evaluation questions: Relevance, Evidence, Contribution, Quality, Consistency, and Uncertainty.",
      "To contact the candidate with targeted, professional technical questions.",
    ],
    whoCanUse: "Anyone possessing the unique cryptographically secure share link.",
    prerequisites: ["An active, unexpired, unrevoked share token."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open the Shared Passport",
        action: "Paste or click the authorized share link provided by the candidate.",
        buttonOrPath: "Browser Address Bar → https://skillpassport.io/p/[token]",
        details: "Loads the customized passport view rendered with the candidate's chosen template.",
      },
      {
        stepNumber: 2,
        title: "Review Candidate Overview",
        action: "Examine headline, professional focus, and core capability highlights.",
        buttonOrPath: "Header & Hero Section → Candidate Profile Summary",
        details: "Treat summaries as an entry point for evaluation, not independent proof of competence.",
      },
      {
        stepNumber: 3,
        title: "Explore Individual Skills & Proficiency",
        action: "Click into individual verified skill chips.",
        buttonOrPath: "Skill Cards → 'Inspect Skill Details & Evidence'",
        details:
          "Review the verified proficiency level (Beginner, Intermediate, Advanced, Expert), supporting evidence count, and rationale.",
      },
      {
        stepNumber: 4,
        title: "Examine Supporting Evidence Artifacts",
        action: "Open linked project repositories, test suites, or documentation.",
        buttonOrPath: "Evidence List → 'View Artifact / Open GitHub Repo'",
        details:
          "Evaluate the candidate's actual contribution and technical depth. A project using a tool does not automatically establish advanced competence.",
      },
      {
        stepNumber: 5,
        title: "Distinguish Evidence States",
        action: "Check status labels on all displayed items.",
        buttonOrPath: "Badge Indicators → Verified vs Self-Declared",
        details:
          "Distinguish clearly between Verified Competencies, Self-Declared Skills, and AI-Inferred attributes.",
      },
      {
        stepNumber: 6,
        title: "Contact Candidate for Follow-Up",
        action: "Click 'Contact Candidate' to ask targeted technical questions.",
        buttonOrPath: "Header / Floating Button → 'Contact Candidate'",
        details:
          "Opens a modal to submit inquiries directly to the candidate's private passport inbox.",
      },
    ],
    practicalExample: {
      title: "Recruiter Evaluating a Full-Stack Engineer for Cloud Infrastructure",
      startingState: "A hiring manager receives a shared passport link for a candidate claiming AWS & Terraform expertise.",
      actionTaken:
        "The manager opens the link, clicks on the 'Terraform & Infrastructure as Code' skill, inspects the attached GitHub repository artifact, and notes that the candidate authored the modular VPC configuration.",
      resultingOutcome:
        "The manager submits an inquiry through the 'Contact Candidate' modal: 'We noticed your multi-region VPC module in Project X. Can you join an initial technical screen this Thursday?'",
      inspectionGuide: "Check the 'Verified Competency' badge and GitHub commit provenance.",
      recoveryNote: "If the link is revoked or expired, the screen displays a clear status notice.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Valid share token string"],
      outputArtifacts: ["Rendered recipient view", "ShareAccessEvent logged to audit database"],
      originAndProcessing: "Served via server-side projection API (GET /api/v1/sharing/public/{token}).",
      generatedVsPersisted: "Dynamically projected from persistent PostgreSQL tables.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "verified", badgeLabel: "Verified Competency", meaning: "Supported by evidence and verified by evaluation criteria.", nextAction: "Inspect attached evidence." },
        { status: "self_declared", badgeLabel: "Self-Declared", meaning: "Claimed by candidate; not independently verified.", nextAction: "Verify during technical interview." },
        { status: "ai_inferred", badgeLabel: "AI-Inferred", meaning: "Suggested by model extraction; requires human review.", nextAction: "Do not treat as proof." },
      ],
      trustPrinciples: [
        "The public recipient view never exposes candidate private extraction notes or system logs.",
        "Role match percentages are structured comparisons, not hiring guarantees.",
      ],
      sharingTrustCaveat:
        "The Recruiter Passport assists professional evaluation; it does not replace interviews, background checks, or technical assessments.",
    },
    troubleshooting: [
      {
        symptom: "Screen displays 'Shared Passport Not Found' (404).",
        probableCause: "The token is incorrect, misspelled, or truncated.",
        verifiedRemedy: "Request the full unaltered link from the candidate.",
      },
      {
        symptom: "Screen displays 'Access to This Passport Has Been Revoked'.",
        probableCause: "The candidate manually terminated public access to this share token.",
        verifiedRemedy: "Contact the candidate to request a fresh share link.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Recruiter Workspace",
      nextStepAction: "For enterprise recruiters, track candidates across pipeline requisitions.",
      targetRoute: "/recruiter/dashboard",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Public projection rendering, evidence inspection, and messaging modal are fully operational.",
    },
    relatedLinks: [
      { label: "Recruiter Portal", href: "/recruiter/dashboard" },
      { label: "Sharing Overview", href: "/app/passport/sharing" },
    ],
  },

  // ── 10. RECRUITER PORTAL & JOB MATCHING ───────────────────────────────────
  "recruiter-portal": {
    id: "recruiter-portal",
    title: "Recruiter Workspace & Job Matching",
    shortTitle: "Recruiter Portal",
    canonicalRoute: "/recruiter/dashboard",
    badgeLabel: "Enterprise Hiring",
    requiredRole: "Recruiter Only",
    iconName: "Users",
    summary:
      "Enterprise recruiter command center for managing job postings, reviewing applicant pipelines, assessing skill match coverage, and communicating with candidates.",
    purpose:
      "Provides verified hiring organizations with a structured platform to evaluate candidate pipelines against objective role requirements, eliminating resume buzzword inflation through verified competency mapping.",
    whenToUse: [
      "When creating job requisitions with required technical competencies.",
      "When evaluating applicant pipelines and moving candidates through review stages.",
      "When interpreting role-match percentages as structured comparisons rather than automated hiring formulas.",
    ],
    whoCanUse: "Authenticated recruiters belonging to verified organizations.",
    prerequisites: ["Recruiter account authenticated via /recruiter/login."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Log into Recruiter Workspace",
        action: "Authenticate with your corporate recruiter credentials.",
        buttonOrPath: "Login Screen → /recruiter/login",
        details: "Loads the Recruiter TopBar and enterprise dashboard.",
      },
      {
        stepNumber: 2,
        title: "Post or Manage Job Requisitions",
        action: "Create a new role with required competencies.",
        buttonOrPath: "RecruiterTopBar → 'Post Job' (/recruiter/jobs/create)",
        details: "Define role title, department, required skills, and proficiency tiers.",
      },
      {
        stepNumber: 3,
        title: "Review Candidate Pipeline",
        action: "Inspect applicants in the Candidates dashboard.",
        buttonOrPath: "RecruiterTopBar → 'Candidates' (/recruiter/candidates)",
        details: "Filter by match score, verified skills, and review stage.",
      },
      {
        stepNumber: 4,
        title: "Inspect Deep Candidate Match Detail",
        action: "Click into an applicant to open their evaluation docket.",
        buttonOrPath: "Candidate Row → /recruiter/candidates/[invitationId]",
        details:
          "Inspect which required skills have verified evidence, which have partial evidence, and where evidence gaps exist.",
      },
      {
        stepNumber: 5,
        title: "Message Candidate Directly",
        action: "Send an inquiry or interview invitation.",
        buttonOrPath: "Candidate Docket → 'Send Message' (/recruiter/inbox)",
        details: "Messages sync directly to the candidate's Skill Passport inbox.",
      },
    ],
    practicalExample: {
      title: "Triaging Candidates for Senior Data Platform Role",
      startingState: "A recruiter needs to evaluate 12 applicants for a Data Engineer position requiring Apache Spark and Kafka.",
      actionTaken:
        "The recruiter opens '/recruiter/jobs/data-eng-101', reviews the match breakdown, and identifies 3 candidates whose Spark and Kafka competencies are backed by verified GitHub pull requests.",
      resultingOutcome:
        "The recruiter moves those 3 candidates to 'Interviewing' and messages them directly through the Recruiter Inbox.",
      inspectionGuide: "Check the match matrix in the job review screen.",
      recoveryNote: "A candidate with an evidence gap is not disqualified; use the gap to prepare targeted interview questions.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Job requisition requirements", "Candidate applications and shared tokens"],
      outputArtifacts: ["Recruiter candidate evaluation notes", "Pipeline stage updates", "Outbound messages"],
      originAndProcessing: "Managed in backend/app/api/recruiter_*.py with organization isolation.",
      generatedVsPersisted: "Persisted in PostgreSQL database with audit timestamps.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "new", badgeLabel: "New Applicant", meaning: "Application submitted, pending review.", nextAction: "Review skills & evidence." },
        { status: "under_review", badgeLabel: "Under Review", meaning: "Hiring team evaluating credentials.", nextAction: "Check evidence depth." },
        { status: "contacted", badgeLabel: "Contacted", meaning: "Outreach message delivered.", nextAction: "Await response." },
        { status: "interviewing", badgeLabel: "Interviewing", meaning: "Candidate invited to interviews.", nextAction: "Prepare technical questions." },
      ],
      trustPrinciples: [
        "A role match score is a structured comparison, never an automated hiring decision.",
        "Candidate private workspaces remain inaccessible to recruiters; only authorized shared data is shown.",
      ],
      sharingTrustCaveat:
        "Never reject a candidate solely because of an evidence gap. An evidence gap means the system lacks data, not that the candidate lacks capability.",
    },
    troubleshooting: [
      {
        symptom: "Job posting not matching candidates.",
        probableCause: "Skill requirements were entered with non-canonical skill titles.",
        verifiedRemedy: "Select canonical skills from the Skill Passport taxonomy when defining job requisitions.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Recruiter Inbox",
      nextStepAction: "Communicate directly with applicants in your candidate pipeline.",
      targetRoute: "/recruiter/inbox",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Full recruiter portal, organization management, candidate pipelines, and messaging are live.",
    },
    relatedLinks: [
      { label: "Recruiter Dashboard", href: "/recruiter/dashboard" },
      { label: "Job Postings", href: "/recruiter/jobs" },
      { label: "Candidates Pipeline", href: "/recruiter/candidates" },
      { label: "Recruiter Inbox", href: "/recruiter/inbox" },
    ],
  },

  // ── 11. PUBLIC EVIDENCE VIEWER & ARTIFACT REDIRECTION ─────────────────────
  "public-evidence": {
    id: "public-evidence",
    title: "Public Evidence Viewer & Artifact Redirection",
    shortTitle: "Evidence Viewer",
    canonicalRoute: "/p/[shareId]/evidence",
    badgeLabel: "Evidence Inspection",
    requiredRole: "All Users (Candidates & Recruiters)",
    iconName: "FileCheck2",
    summary:
      "Inspect underlying project repositories, code artifacts, and documents linked to verified skills, with direct redirection to GitHub, Jira, and live sandboxes.",
    purpose:
      "Eliminates trust friction by allowing recruiters to independently verify the authenticity and depth of supporting work. Provides live artifact previews and direct platform links while respecting candidate evidence access controls.",
    whenToUse: [
      "When a recruiter wants to inspect actual code commits, PRs, or architecture documents.",
      "When verifying candidate authorship and contribution quality.",
      "When confirming that an artifact genuinely supports the claimed competency level.",
    ],
    whoCanUse: "Recipients viewing an active share link that has 'Detail Inspection' enabled.",
    prerequisites: ["Share link created with Evidence Access Level = 'Detail Inspection'."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Click 'View Supporting Evidence'",
        action: "Click into any project or evidence item in the shared passport.",
        buttonOrPath: "Shared Passport (/p/[shareId]) → 'Inspect Evidence' or '/p/[shareId]/evidence'",
        details: "Opens the public evidence drawer or dedicated evidence page.",
      },
      {
        stepNumber: 2,
        title: "Review Evidence Metadata & Provenance",
        action: "Inspect source provider, project name, date, and claimed contribution.",
        buttonOrPath: "Evidence Header → Source Badge (GitHub, Jira, Document, Portfolio)",
        details: "Verifies the origin platform where the work was performed.",
      },
      {
        stepNumber: 3,
        title: "Read Extracted Technical Excerpts",
        action: "Examine key functions, architectural decisions, and evaluation notes.",
        buttonOrPath: "Card Body → 'Extracted Technical Excerpts'",
        details: "Provides curated highlights of the technical implementation.",
      },
      {
        stepNumber: 4,
        title: "Redirect to External Platform",
        action: "Click external link button to view repository or ticket on GitHub / Jira.",
        buttonOrPath: "Action Button → 'Open on GitHub / View Repository'",
        details: "Opens the external platform in a new secure browser tab.",
      },
    ],
    practicalExample: {
      title: "Verifying Open-Source Contribution to React Ecosystem",
      startingState: "A recruiter is evaluating a frontend candidate's claim of building accessible component primitives.",
      actionTaken:
        "The recruiter opens the public evidence drawer, reads the candidate's contribution description, and clicks 'Open on GitHub'.",
      resultingOutcome:
        "The recruiter is redirected to the candidate's merged pull request on GitHub, verifying real-world code quality, test coverage, and code review interaction.",
      inspectionGuide: "Check external URL destination before clicking.",
      recoveryNote: "If evidence is set to 'Summary Only', external links and raw files remain hidden.",
    },
    inputsAndOutputs: {
      requiredInputs: ["Evidence item ID", "Active share token with detail permission"],
      outputArtifacts: ["Rendered evidence detail modal with external redirect links"],
      originAndProcessing: "Filtered and projected by backend public sharing API.",
      generatedVsPersisted: "Derived from candidate's verified evidence records.",
    },
    understandingStatus: {
      statusBadges: [
        { status: "github", badgeLabel: "GitHub Repo", meaning: "Connected to a live GitHub repository.", nextAction: "Inspect commit history." },
        { status: "jira", badgeLabel: "Jira Issue", meaning: "Connected to verified delivery ticket.", nextAction: "Inspect delivery scope." },
        { status: "document", badgeLabel: "Document", meaning: "Technical report or architecture spec.", nextAction: "Read PDF excerpt." },
      ],
      trustPrinciples: [
        "External redirection URLs are strictly validated to prevent open-redirect vulnerabilities.",
        "Private internal documents are never exposed without explicit candidate permission.",
      ],
      sharingTrustCaveat:
        "The presence of a repository does not prove sole authorship; recruiters must inspect the candidate's specific commits and pull requests.",
    },
    troubleshooting: [
      {
        symptom: "External link button is disabled or missing.",
        probableCause: "The candidate set Evidence Access Level to 'Summary Only' for this share.",
        verifiedRemedy: "Ask the candidate for detail inspection access if required for evaluation.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Recruiter Passport Experience",
      nextStepAction: "Return to the main passport view to complete the candidate evaluation.",
      targetRoute: "/p/[shareId]",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Document preview, external GitHub/Jira redirection, and permission gating are fully active.",
    },
    relatedLinks: [
      { label: "Recruiter Passport View", href: "/p/[shareId]" },
      { label: "Sharing Permissions", href: "/app/passport/permissions" },
    ],
  },

  // Dummy keys for tabs
  workflows: {} as any,
  glossary: {} as any,
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED WORKFLOWS ACROSS DOMAIN 6
// ─────────────────────────────────────────────────────────────────────────────

export const SHARING_GUIDED_WORKFLOWS: SharingGuidedWorkflow[] = [
  {
    id: "workflow-candidate-lifecycle",
    title: "Workflow A: Candidate 6-Step End-to-End Sharing Lifecycle",
    summary:
      "The complete sequence for candidates to prepare, curate, preview, permission, distribute, and manage their Skill Passport shares responsibly.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Review Your Stored Passport",
        route: "/app/passport/skills",
        action:
          "Audit your verified competencies and ensure self-declared skills are distinctly understood.",
        outcome:
          "Establishes an accurate, truthful baseline before any external presentation is configured.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Curate Content in Builder",
        route: "/app/passport/builder",
        action:
          "Pick an archetype template (e.g. Technical Portfolio) and pin signature competencies.",
        outcome:
          "Structures the visual presentation to emphasize your strongest relevant capabilities.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Configure Sharing Permissions",
        route: "/app/passport/permissions",
        action:
          "Set evidence access level to 'Summary' or 'Detail' and toggle off sensitive sections.",
        outcome:
          "Applies data minimization: private documents and unrelated records are strictly excluded.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Inspect Live Passport Preview",
        route: "/app/passport/preview",
        action:
          "Review the passport exactly as an external recruiter will see it, testing redactions.",
        outcome:
          "Verifies that no unintended context, internal notes, or private identifiers are visible.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Create Share Link",
        route: "/app/passport/share",
        action:
          "Generate a secure token with an audience label, optional expiry date, and messaging toggle.",
        outcome:
          "Produces an unguessable share link (/p/[token]) with an immutable saved configuration.",
      },
      {
        phaseNumber: 6,
        featureTitle: "Manage Access & Monitor Visits",
        route: "/app/passport/access",
        action:
          "Monitor access counts, view audit logs, and revoke links when the hiring cycle concludes.",
        outcome:
          "Maintains continuous candidate data sovereignty and terminates exposure when no longer needed.",
      },
    ],
    keyTakeaway:
      "Sharing is a controlled view, not a profile dump. Candidate control over permissions and immediate revocation protects privacy throughout the hiring journey.",
  },
  {
    id: "workflow-recruiter-evaluation",
    title: "Workflow B: Recruiter 7-Step Evidence Evaluation Workflow",
    summary:
      "A rigorous, professional methodology for recruiters to evaluate candidate passports objectively using the 6 core skill evaluation questions.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Open Authorized Share",
        route: "/p/[shareId]",
        action:
          "Navigate to the shared passport link provided by the candidate.",
        outcome:
          "Accesses the candidate's permitted capability view without accessing private workspaces.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Review Candidate Overview",
        route: "/p/[shareId]",
        action:
          "Read the headline, executive summary, and verified skill counts as an initial entry point.",
        outcome:
          "Identifies primary areas of alignment with open role requirements.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Explore Individual Skills",
        route: "/p/[shareId]",
        action:
          "Inspect verified proficiency tiers, evidence counts, and evaluation rationale.",
        outcome:
          "Moves beyond simple keyword matching to understand demonstrated depth and context.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Examine Supporting Evidence",
        route: "/p/[shareId]/evidence",
        action:
          "Open linked code repositories, PRs, or architecture documents to verify actual contributions.",
        outcome:
          "Confirms whether the candidate personally performed the work and demonstrated quality.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Apply 6 Evaluation Questions",
        route: "/p/[shareId]",
        action:
          "Evaluate: 1. Relevance, 2. Evidence, 3. Contribution, 4. Quality, 5. Consistency, 6. Uncertainty.",
        outcome:
          "Identifies clear strengths and highlights areas requiring clarification during interviews.",
      },
      {
        phaseNumber: 6,
        featureTitle: "Contact Candidate for Follow-Up",
        route: "/p/[shareId]",
        action:
          "Click 'Contact Candidate' to send targeted, professional technical questions.",
        outcome:
          "Dispatches message directly to candidate inbox with server-confirmed delivery receipt.",
      },
      {
        phaseNumber: 7,
        featureTitle: "Combine with Comprehensive Hiring Process",
        route: "/recruiter/dashboard",
        action:
          "Integrate passport findings with live coding interviews, team evaluations, and reference checks.",
        outcome:
          "Produces well-rounded, objective, and defensible hiring decisions.",
      },
    ],
    keyTakeaway:
      "The Recruiter Passport informs and streamlines human professional judgment; it never automates or replaces it.",
  },
  {
    id: "workflow-selective-disclosure",
    title: "Workflow C: Selective Disclosure & Proprietary Work Gating",
    summary:
      "How candidates protect confidential employer information while still proving competence to prospective hiring teams.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Identify Proprietary Work in Workspace",
        route: "/app/evidence",
        action:
          "Audit evidence items containing enterprise client names or proprietary code.",
        outcome:
          "Classifies which artifacts require redaction vs which can be shared publicly.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Set Evidence Level to Summary Only",
        route: "/app/passport/permissions",
        action:
          "Configure the share permissions to expose project summaries while blocking detail inspection.",
        outcome:
          "Hides raw files, commit diffs, and external repository links from the recipient view.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Select Public Repositories for Detail",
        route: "/app/passport/permissions",
        action:
          "Granularly whitelist public open-source repos to allow detail inspection for those items only.",
        outcome:
          "Achieves the ideal balance: proof of real coding depth without NDA violations.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Audit via Recruiter Preview Simulation",
        route: "/app/passport/preview?view=recruiter",
        action:
          "Click into each project card in preview mode to verify that restricted items cannot be opened.",
        outcome:
          "Guarantees that no confidential intellectual property leaks to external parties.",
      },
    ],
    keyTakeaway:
      "Data minimization builds trust. Disclosing relevant capability summaries without violating past confidentiality demonstrates professional integrity.",
  },
  {
    id: "workflow-revocation-audit",
    title: "Workflow D: Link Revocation & Continuous Access Auditing",
    summary:
      "How candidates track link engagement, verify access events, and immediately terminate distributed shares when hiring cycles finish.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Monitor Active Links in Sharing Hub",
        route: "/app/passport/sharing",
        action:
          "Check view counts, recipient labels, and recent activity sparklines.",
        outcome:
          "Provides complete visibility into which employers have reviewed your credentials.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Inspect Access Audit Event Logs",
        route: "/app/passport/access",
        action:
          "Review detailed access timestamps and section interaction metrics.",
        outcome:
          "Identifies peak engagement moments (e.g. right before an interview).",
      },
      {
        phaseNumber: 3,
        featureTitle: "Execute Immediate Link Revocation",
        route: "/app/passport/access",
        action:
          "Click 'Revoke Access' on links associated with closed or completed opportunities.",
        outcome:
          "Server immutably updates link status to 'revoked' and timestamps the action.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Verify Access Termination",
        route: "/p/[shareId]",
        action:
          "Navigate to the revoked URL in an incognito window.",
        outcome:
          "Displays the formal 'Access Terminated' screen; all skills and data are completely inaccessible.",
      },
    ],
    keyTakeaway:
      "Digital shares should not linger indefinitely. Active link management ensures your professional footprint remains strictly intentional.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY (18 CORE TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const SHARING_CONCEPTUAL_GLOSSARY: SharingGlossaryTerm[] = [
  {
    term: "Skill Passport Sharing",
    definition:
      "The controlled presentation of a selected view of skills, projects, qualifications, and supporting evidence to employers, recruiters, or mentors under explicit candidate permissions.",
    context:
      "Unlike public social profiles, sharing is selective, permission-governed, and auditable.",
    relatedRoute: "/app/passport/sharing",
    relatedRouteLabel: "Sharing Hub",
  },
  {
    term: "Recruiter Passport View",
    definition:
      "A recipient-facing, read-only presentation of candidate capabilities rendered at `/p/[shareId]` according to the specific permissions configured for that token.",
    context:
      "Enables external hiring managers to evaluate demonstrated work without accessing candidate private workspaces.",
    relatedRoute: "/app/passport/preview",
    relatedRouteLabel: "Live Preview",
  },
  {
    term: "Share-Specific Configuration",
    definition:
      "An immutable set of permissions, template selections, and expiry rules saved directly to an individual share token at creation time.",
    context:
      "Guarantees that altering global default preferences never silently changes the permissions of an existing active link.",
    relatedRoute: "/app/passport/share",
    relatedRouteLabel: "Create Share Link",
  },
  {
    term: "Global Sharing Defaults",
    definition:
      "The baseline permission template and identity settings automatically pre-filled when creating new share links.",
    context:
      "Answers: 'What would I normally like to share when creating a new link?' Managed in Sharing Permissions.",
    relatedRoute: "/app/passport/permissions",
    relatedRouteLabel: "Sharing Permissions",
  },
  {
    term: "Evidence Access Levels",
    definition:
      "A three-tier gating model governing evidence exposure: 'None' (skills only), 'Summary Only' (project descriptions visible, raw code hidden), and 'Detail Inspection' (full artifact and file review).",
    context:
      "Allows candidates to prove competency on confidential projects without disclosing sensitive client code.",
    relatedRoute: "/app/passport/permissions",
    relatedRouteLabel: "Permissions",
  },
  {
    term: "Self-Declared Skill",
    definition:
      "A capability claimed by the candidate that has not been independently verified through code evidence, evaluations, or assessments.",
    context:
      "Always displayed with a distinctive badge ('Self-Declared · Not independently verified') and never inflated into verified counts.",
    relatedRoute: "/app/passport/skills",
    relatedRouteLabel: "Verified Skills",
  },
  {
    term: "Evidence-Supported Skill",
    definition:
      "A skill for which one or more tangible work artifacts (repositories, pull requests, documents) exist in the candidate's workspace.",
    context:
      "Strength of support depends on artifact quality, depth, and identifiable candidate attribution.",
    relatedRoute: "/app/evidence",
    relatedRouteLabel: "Evidence Workspace",
  },
  {
    term: "AI-Inferred Skill",
    definition:
      "A potential skill identified through automated natural language processing or AST code analysis from raw artifacts.",
    context:
      "Must undergo human verification or assessment; model confidence alone is never presented as proof of competence.",
    relatedRoute: "/app/ai/skill-extraction",
    relatedRouteLabel: "Skill Extraction",
  },
  {
    term: "Cryptographic Share Token",
    definition:
      "A high-entropy, unguessable random string (prefixed `sp_shr_`) generated on the server to serve as the secure URL identifier for a shared passport.",
    context:
      "Prevents enumeration or unauthorized discovery of candidate profiles by web scrapers.",
    relatedRoute: "/app/passport/share",
    relatedRouteLabel: "Create Share Link",
  },
  {
    term: "Link Revocation",
    definition:
      "The immediate, permanent termination of public access to a specific share token executed by the candidate.",
    context:
      "Immediately scrubs all capability data from the public URL and replaces it with an 'Access Terminated' notification.",
    relatedRoute: "/app/passport/access",
    relatedRouteLabel: "Manage Shared Access",
  },
  {
    term: "Recruiter Message Delivery Status",
    definition:
      "A server-authoritative indicator confirming that an inquiry sent through the 'Contact Candidate' modal was successfully recorded in the database.",
    context:
      "Prevents miscommunication by reporting true delivery rather than assuming a message was sent merely because a button was clicked.",
    relatedRoute: "/app/passport/messages",
    relatedRouteLabel: "Recruiter Inquiries",
  },
  {
    term: "Share Access Event Audit Trail",
    definition:
      "A secure log of all incoming requests to a share link, recording access timestamps, section views, and total visit counters.",
    context:
      "Gives candidates transparency into which employers have reviewed their shared credentials.",
    relatedRoute: "/app/passport/access",
    relatedRouteLabel: "Manage Access",
  },
  {
    term: "Passport Template Archetype",
    definition:
      "One of 8 tailored layout structures (e.g. Technical Portfolio, Executive Summary, AI/ML Specialist) that organizes candidate capability data for specific hiring audiences.",
    context:
      "Selected in the Content Builder to match the expectations of different evaluation contexts.",
    relatedRoute: "/app/passport/builder",
    relatedRouteLabel: "Passport Builder",
  },
  {
    term: "Role Match Percentage",
    definition:
      "A structured mathematical comparison between a candidate's verified skills and published role requirements.",
    context:
      "Must not be treated as an automated hiring decision or probability of success without human review.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match",
  },
  {
    term: "Evidence Gap",
    definition:
      "A condition where the available workspace information does not sufficiently support a required role competency.",
    context:
      "Serves as a prompt for interview follow-up or learning prioritization; does not prove the candidate lacks the skill.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gaps",
  },
  {
    term: "Multidimensional Evidence Quality",
    definition:
      "The evaluation of supporting work across 7 distinct axes: Relevance, Specificity, Attribution, Depth, Consistency, Recency, and Authenticity.",
    context:
      "Prevents simplistic 'more files equals more skill' assumptions in candidate evaluation.",
    relatedRoute: "/p/[shareId]/evidence",
    relatedRouteLabel: "Evidence Viewer",
  },
  {
    term: "Ownership Verification vs Access Consent",
    definition:
      "The critical distinction between granting permission to view an artifact and proving that the candidate is its authentic author.",
    context:
      "Access permission does not verify authorship; recruiters must inspect commit contributions and code rationale.",
    relatedRoute: "/app/passport/sharing",
    relatedRouteLabel: "Sharing Hub",
  },
  {
    term: "Candidate Data Minimization Standard",
    definition:
      "The platform policy ensuring that candidates disclose only the minimum relevant information necessary for an intended professional purpose.",
    context:
      "Protects private internal extractions, credentials, system logs, and unrelated personal documents from external exposure.",
    relatedRoute: "/app/passport/permissions",
    relatedRouteLabel: "Sharing Permissions",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific Domain 6 help topic.
 * Handles both candidate sharing routes (/app/passport/*) and recruiter routes (/recruiter/*, /p/*).
 */
export function getSharingHelpTopicIdFromPathname(pathname: string): SharingHelpTopicId {
  if (!pathname) return "overview";

  const clean = pathname.toLowerCase();

  // Public Share routes
  if (clean.startsWith("/p/")) {
    if (clean.includes("/evidence")) return "public-evidence";
    return "recruiter-passport";
  }

  // Recruiter Portal routes
  if (clean.startsWith("/recruiter")) {
    return "recruiter-portal";
  }

  // Candidate Sharing routes under /app/passport/
  if (clean.startsWith("/app/passport/share")) return "share";
  if (clean.startsWith("/app/passport/permissions")) return "permissions";
  if (clean.startsWith("/app/passport/builder")) return "builder";
  if (clean.startsWith("/app/passport/preview")) return "preview";
  if (clean.startsWith("/app/passport/access")) return "access";
  if (clean.startsWith("/app/passport/messages")) return "messages";
  if (clean.startsWith("/app/passport/export")) return "export";
  if (clean.startsWith("/app/passport/sharing")) return "overview";

  return "overview";
}
