/**
 * Evidence Workspace Product Help & Conceptual Guidance Data Catalog
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 6 Evidence Workspace features, 4 guided workflows, and 13+ glossary terms.
 */

export type HelpTopicId =
  | "overview"
  | "evidence-center"
  | "connected-sources"
  | "upload-work"
  | "evidence-library"
  | "ingestion-runs"
  | "data-permissions"
  | "workflows"
  | "glossary";

export interface StepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface ConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  notes?: string;
}

export interface StatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface TroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface EvidenceHelpTopic {
  id: HelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  iconName: "Layers" | "FolderSync" | "UploadCloud" | "Library" | "Activity" | "Lock" | "BookOpen" | "Workflow";
  summary: string;
  purpose: string; // What is this feature for?
  whenToUse: string[]; // When should I use it?
  prerequisites: string[];
  stepByStep: StepInstruction[]; // How do I use it, step by step?
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    supportedFormatsOrSources?: string[];
  };
  concreteExample: ConcreteExample; // Concrete practical example
  statusDefinitions?: StatusDefinition[];
  troubleshooting: TroubleshootingItem[]; // What to do if something fails
  relatedLinks: Array<{ label: string; href: string }>;
}

export interface GuidedWorkflow {
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

export interface GlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. HELP TOPICS FOR ALL 6 FEATURES + OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const EVIDENCE_HELP_TOPICS: Record<Exclude<HelpTopicId, "workflows" | "glossary">, EvidenceHelpTopic> = {
  overview: {
    id: "overview",
    title: "Evidence Workspace Architecture & Lifecycle",
    shortTitle: "Overview",
    canonicalRoute: "/app/evidence",
    badgeLabel: "Workspace Architecture",
    iconName: "Layers",
    summary:
      "Evidence Workspace is the foundational ingestion and provenance layer of Skill Passport. It transforms raw developer activity—code commits, pull requests, issue worklogs, architectural documents, and certificates—into verifiable, tamper-evident skills without relying on hallucinated claims or self-reported bullet points.",
    purpose:
      "To provide an auditable system of record where engineers aggregate, normalize, and inspect their actual work artifacts before those artifacts are analyzed by AI extraction models and submitted for human verification.",
    whenToUse: [
      "When onboarding a new engineer and establishing their initial baseline skills.",
      "After completing significant project milestones, merged pull requests, or sprint epics.",
      "When preparing a verified skill passport for internal promotions, lateral mobility, or recruiter sharing.",
      "When troubleshooting pipeline ingestion errors, broken tokens, or unindexed documents.",
    ],
    prerequisites: [
      "An authenticated Skill Passport account.",
      "Read access to work sources (GitHub personal access token, Jira API token, or document files under 25MB).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Connect or Upload Work",
        action: "Navigate to Connected Sources or Upload Work & Docs to connect repositories or provide project files.",
        buttonOrPath: "CONNECT SOURCE (/app/evidence/sources) or UPLOAD WORK (/app/evidence/upload)",
        details: "Choose GitHub (PAT token), Jira (API token), or direct file upload (PDF, DOCX, TXT, MD, images up to 25MB).",
      },
      {
        stepNumber: 2,
        title: "Monitor Ingestion & Normalization",
        action: "Watch the pipeline discovery and normalization execution.",
        buttonOrPath: "Ingestion Runs (/app/evidence/runs)",
        details: "The ingestion pipeline processes artifacts through 6 stages: Discovery, Normalization, Extraction, Deduplication, Indexing, and Ready for Review.",
      },
      {
        stepNumber: 3,
        title: "Inspect Evidence Library",
        action: "Browse ingested evidence items, inspect raw excerpts, and review provenance metadata.",
        buttonOrPath: "Evidence Library (/app/evidence/library)",
        details: "Verify evidence strength, tags, and review status. Items marked 'Needs Confirmation' require your sign-off.",
      },
      {
        stepNumber: 4,
        title: "Trigger AI Extraction & Verification",
        action: "Initiate work analysis to identify demonstrated competencies backed by artifact citations.",
        buttonOrPath: "Analyze with AI button (/app/evidence or /app/evidence/library)",
        details: "Extracted candidate skills pass through Hallucination Guards before reaching the human verification queue.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "GitHub repository URLs & PAT (read-only scopes)",
        "Jira Cloud URL, user email & API token",
        "Uploaded design docs, research whitepapers, architecture RFCs, or certificates (PDF, DOCX, TXT, MD up to 25MB)",
      ],
      outputArtifacts: [
        "Immutable Evidence Items stored with SHA-256 provenance hashes",
        "Token-sanitized raw excerpts with secrets stripped",
        "Vector-indexed chunks ready for RAG semantic search",
        "Candidate Skill claims linked to verifiable citations",
      ],
      supportedFormatsOrSources: ["GitHub REST API v3", "Jira Cloud REST v3", "PDF", "DOCX", "TXT", "MD", "PNG/JPG/WEBP"],
    },
    concreteExample: {
      title: "Illustrative Scenario: End-to-End Baseline Ingestion",
      startingState: "A senior backend engineer joins Skill Passport with 0 evidence items and no verified competencies.",
      actionTaken:
        "The engineer connects their GitHub account with a read-only PAT, selects the 'payment-gateway' repository, and clicks 'Sync Selected Repositories'. Simultaneously, they upload an architectural design document 'payment_v2_rfc.pdf'.",
      resultingOutcome:
        "An ingestion run finishes in 4.2 seconds. 12 merged pull requests and 1 RFC document are normalized and indexed into the Evidence Library. Total evidence count rises from 0 to 13. AI work analysis is automatically enqueued, producing 4 candidate skills (Go, Distributed Transactions, Event-Driven Architecture, PostgreSQL).",
      notes: "All secret keys, auth tokens, and employer internal IP were automatically scrubbed during the normalization stage.",
    },
    statusDefinitions: [
      {
        status: "indexed",
        badgeLabel: "Indexed",
        meaning: "The artifact was normalized, stripped of secrets, and embedded in the vector store for retrieval.",
        nextAction: "Ready for AI work analysis and skill extraction.",
      },
      {
        status: "pending_review",
        badgeLabel: "Pending Review",
        meaning: "Artifact is in the human verification queue awaiting reviewer sign-off.",
        nextAction: "Reviewer verifies authorship and skill relevance.",
      },
      {
        status: "verified",
        badgeLabel: "Verified",
        meaning: "Authorship, deliverable integrity, and skill relevance have passed all verification gates.",
        nextAction: "Eligible for inclusion in public and internal Skill Passports.",
      },
    ],
    troubleshooting: [
      {
        symptom: "Total evidence count shows 0 after syncing GitHub repository.",
        probableCause: "The selected repository has no merged PRs authored by your account, or the PAT lacks the 'repo' scope for private repositories.",
        verifiedRemedy: "Check Ingestion Runs (/app/evidence/runs). If the run status is 'completed' with 0 items, verify your GitHub username matches the commit author or generate a fine-grained token with 'Contents: Read-only' and 'Metadata: Read-only' scopes.",
      },
      {
        symptom: "Uploaded PDF displays 'Processing Failed'.",
        probableCause: "File exceeds 25MB or is an encrypted/password-protected PDF.",
        verifiedRemedy: "Export the PDF without password protection, compress images if over 25MB, and re-upload via Upload Work & Docs (/app/evidence/upload).",
      },
    ],
    relatedLinks: [
      { label: "Open Evidence Center", href: "/app/evidence" },
      { label: "Connect Integrations", href: "/app/evidence/sources" },
      { label: "Upload Deliverable", href: "/app/evidence/upload" },
    ],
  },

  "evidence-center": {
    id: "evidence-center",
    title: "Evidence Center Overview & Operations",
    shortTitle: "Evidence Center",
    canonicalRoute: "/app/evidence",
    badgeLabel: "Central Hub",
    iconName: "Layers",
    summary:
      "Evidence Center is the command dashboard of the Evidence Workspace. It provides real-time counts across connected sources, indexed artifacts, items awaiting review, failed runs, and displays the 6-stage evidence lifecycle pipeline.",
    purpose:
      "To give developers and managers an instant executive summary of evidence health, recent imports, processing throughput, and immediate actions to enrich their skill profile.",
    whenToUse: [
      "To check overall evidence aggregation health and verify recently synced repositories.",
      "To view pipeline status across Discovery, Normalization, Extraction, Deduplication, Indexing, and Review.",
      "To trigger quick AI work analysis on recently indexed deliverables.",
      "To jump into either connecting new sources or uploading ad-hoc files.",
    ],
    prerequisites: ["None. Available to all authenticated users."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Aggregate Metric Cards",
        action: "Inspect Total Evidence, Indexed & Processed, Awaiting Review, Connected Sources, and Failed Ingestion Runs.",
        buttonOrPath: "Top Metrics Bar (/app/evidence)",
        details: "Cards highlight evidence accumulation over time and alert you immediately if any ingestion jobs failed.",
      },
      {
        stepNumber: 2,
        title: "Inspect 6-Stage Evidence Lifecycle",
        action: "Scroll to the Evidence Lifecycle pipeline visualization to see how raw data matures.",
        buttonOrPath: "Evidence Lifecycle section (/app/evidence)",
        details: "Follow the stages: Discovery → Normalization → Extraction → Deduplication → Indexing → Ready for Review.",
      },
      {
        stepNumber: 3,
        title: "Trigger AI Work Analysis",
        action: "Click 'Analyze with AI' on any newly indexed item in the Recent Evidence table.",
        buttonOrPath: "Sparkles icon or 'Analyze with AI' button (/app/evidence)",
        details: "Initiates deep prompt-guarded work analysis to extract skill signals and evidence strength scores.",
      },
      {
        stepNumber: 4,
        title: "Take Quick Actions",
        action: "Use top-right header action buttons to upload files or connect new platforms.",
        buttonOrPath: "UPLOAD WORK (/app/evidence/upload) or CONNECT SOURCE (/app/evidence/sources)",
        details: "Directly opens the intake forms for fast evidence ingestion.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: ["None required for viewing. Ingestion data is pulled automatically from local state and database."],
      outputArtifacts: [
        "Real-time aggregation stats across all 6 evidence dimensions",
        "Interactive lifecycle stage progression view",
        "Recent evidence feed with review status and strength ratings",
      ],
      supportedFormatsOrSources: ["GitHub", "Jira", "Uploaded Documents", "Manual Submissions"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Daily Sprint Review Check-in",
      startingState: "Evidence Center shows 18 Total Evidence items, 1 Connected Source, and 0 Failed Runs.",
      actionTaken:
        "The developer merged a critical bugfix in Jira sprint ticket SP-142. They open Evidence Center, notice that Jira is not yet connected, and click 'CONNECT SOURCE' to add their Jira credentials.",
      resultingOutcome:
        "Upon connecting Jira, Total Evidence increments to 24. A new item 'SP-142: Fix Redis cache stampede' appears under Recent Evidence with status 'Indexed'. The developer clicks 'Analyze with AI', and the system identifies high-confidence signals for 'Redis Optimization' and 'Concurrency Management'.",
      notes: "The metric card for Connected Sources updates from 1 to 2 immediately.",
    },
    statusDefinitions: [
      {
        status: "indexed",
        badgeLabel: "Indexed",
        meaning: "Item has been successfully parsed and stored in the vector database.",
        nextAction: "Click 'Analyze with AI' to trigger automated competency discovery.",
      },
      {
        status: "needs_confirmation",
        badgeLabel: "Needs Confirmation",
        meaning: "AI extracted potential skills, but flagged moderate ambiguity requiring engineer confirmation.",
        nextAction: "Open Evidence Library to confirm or adjust extracted skills.",
      },
      {
        status: "failed",
        badgeLabel: "Failed",
        meaning: "An ingestion pipeline run encountered an unrecoverable network or schema parsing error.",
        nextAction: "Navigate to Ingestion Runs (/app/evidence/runs) and click 'Retry Run'.",
      },
    ],
    troubleshooting: [
      {
        symptom: "Metrics cards show '0' across all categories even though GitHub was connected.",
        probableCause: "The repository sync has not yet been triggered, or the ingestion run is still in progress.",
        verifiedRemedy: "Visit Connected Sources → GitHub (/app/evidence/sources/github), verify the repository checkbox is checked, and click 'Sync Selected Repositories'.",
      },
      {
        symptom: "'Analyze with AI' button is disabled or spinning indefinitely.",
        probableCause: "The local LLM backend (Ollama/FastAPI) is busy or unreachable.",
        verifiedRemedy: "Check that the backend service on port 8001 is active. If degraded, wait 10 seconds and re-click.",
      },
    ],
    relatedLinks: [
      { label: "Open Evidence Library", href: "/app/evidence/library" },
      { label: "View Ingestion Runs", href: "/app/evidence/runs" },
      { label: "Connect GitHub / Jira", href: "/app/evidence/sources" },
    ],
  },

  "connected-sources": {
    id: "connected-sources",
    title: "Connected Sources & Platform Integrations",
    shortTitle: "Connected Sources",
    canonicalRoute: "/app/evidence/sources",
    badgeLabel: "Integrations & Sync",
    iconName: "FolderSync",
    summary:
      "Connected Sources manages live integration pipelines to external development platforms (GitHub and Jira Cloud). It handles encrypted token storage, repository selection, commit and worklog discovery, and per-repository sync execution.",
    purpose:
      "To connect engineering platforms where real work happens, enabling automated, verifiable evidence discovery directly from source code and task management systems.",
    whenToUse: [
      "When initially setting up your Skill Passport to import your code history.",
      "When starting work in a new GitHub repository or Jira project.",
      "When rotating expired personal access tokens or updating API permissions.",
      "When triggering an on-demand re-sync before a performance review or job application.",
    ],
    prerequisites: [
      "GitHub: A personal access token (Classic token with 'repo' scope or Fine-grained PAT with 'Contents: Read-only' and 'Metadata: Read-only').",
      "Jira: Atlassian Cloud domain (e.g. 'https://yourcompany.atlassian.net'), user email, and an Atlassian API token.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select an Integration Provider",
        action: "Click 'Configure GitHub' or 'Configure Jira' card on the Connected Sources page.",
        buttonOrPath: "CONFIGURE GITHUB (/app/evidence/sources/github) or CONFIGURE JIRA (/app/evidence/sources/jira)",
        details: "Opens the dedicated connection setup wizard for the chosen platform.",
      },
      {
        stepNumber: 2,
        title: "Supply Credentials & Test Connection",
        action: "Paste your read-only PAT or API token into the token input field and click 'Test Connection'.",
        buttonOrPath: "Test Connection button",
        details: "The system validates connectivity and scopes against the external API before saving.",
      },
      {
        stepNumber: 3,
        title: "Select Repositories or Projects",
        action: "Browse available repositories or Jira projects, review language breakdowns and READMEs, then check desired items.",
        buttonOrPath: "Checkbox selector on repository / project cards",
        details: "Only checked repositories are imported. You can inspect README contents in the live preview modal before syncing.",
      },
      {
        stepNumber: 4,
        title: "Trigger Ingestion Sync",
        action: "Click 'Sync Selected Repositories' or 'Sync Now' to start the extraction pipeline.",
        buttonOrPath: "Sync Selected Repositories button",
        details: "A background Ingestion Run is queued immediately. You can track progress in real time.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "GitHub PAT with read-only repository permissions",
        "Jira Cloud URL, account email, and Atlassian API token",
        "Explicit selection of which repositories or project keys to track",
      ],
      outputArtifacts: [
        "Encrypted local connection profile",
        "Repository language breakdown statistics",
        "Parsed pull request diffs and commit messages",
        "Ingested Jira issue summaries, acceptance criteria, and worklogs",
      ],
      supportedFormatsOrSources: ["GitHub Cloud / Enterprise (REST v3)", "Jira Cloud (REST v3)"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Connecting a Microservices Repository",
      startingState: "GitHub status is 'Not Connected'. No repositories are tracked.",
      actionTaken:
        "The engineer generates a fine-grained GitHub PAT with read-only permissions for repository 'order-fulfillment'. They navigate to /app/evidence/sources/github, paste the token, test connectivity (status: 200 OK), select 'order-fulfillment', and click 'Sync Selected Repositories'.",
      resultingOutcome:
        "The card status switches to 'Connected'. The system discovers 18 merged PRs authored by the engineer, analyzes TypeScript and Docker language distributions, and enqueues Ingestion Run #gh-sync-104. Evidence items appear in the library with source badge 'GitHub'.",
      notes: "The PAT is stored locally and never transmitted to external third-party cloud services.",
    },
    statusDefinitions: [
      {
        status: "connected",
        badgeLabel: "Connected",
        meaning: "Integration is authorized, credentials are valid, and scheduled/manual sync is active.",
        nextAction: "Select repositories and trigger sync.",
      },
      {
        status: "not_connected",
        badgeLabel: "Not Connected",
        meaning: "No credentials have been configured for this integration provider.",
        nextAction: "Click 'Configure' and provide a read-only API token.",
      },
      {
        status: "syncing",
        badgeLabel: "Syncing",
        meaning: "A background pipeline run is actively querying external APIs and importing data.",
        nextAction: "Wait for sync completion or monitor in Ingestion Runs.",
      },
      {
        status: "failed",
        badgeLabel: "Error / Expired",
        meaning: "Token verification failed (HTTP 401 Unauthorized) or API rate limits were exceeded.",
        nextAction: "Generate a new token with valid scopes and click 'Test Connection'.",
      },
    ],
    troubleshooting: [
      {
        symptom: "GitHub 'Test Connection' returns 'Bad credentials' (HTTP 401).",
        probableCause: "The token has expired, contains trailing whitespace, or has been revoked on github.com.",
        verifiedRemedy: "Generate a fresh Personal Access Token on GitHub (Settings → Developer settings → Personal access tokens), ensure no spaces are copied, and re-test.",
      },
      {
        symptom: "Private organization repositories do not appear in the repository selection list.",
        probableCause: "The fine-grained PAT was only granted access to Personal repositories, or Organization SAML SSO was not authorized.",
        verifiedRemedy: "On GitHub, authorize SSO for your organization on the token page, or ensure the repository access dropdown includes 'All repositories' or the specific organization repo.",
      },
    ],
    relatedLinks: [
      { label: "Configure GitHub", href: "/app/evidence/sources/github" },
      { label: "Configure Jira", href: "/app/evidence/sources/jira" },
      { label: "Manage Permissions & Disconnect", href: "/app/evidence/permissions" },
    ],
  },

  "upload-work": {
    id: "upload-work",
    title: "Upload Work & Document Intake",
    shortTitle: "Upload Work & Docs",
    canonicalRoute: "/app/evidence/upload",
    badgeLabel: "Document Intake",
    iconName: "UploadCloud",
    summary:
      "Upload Work & Docs is the direct ingestion channel for engineering artifacts that do not live in Git or Jira. It supports design RFCs, whitepapers, architectural decision records, certifications, resumes, and live portfolio scraping.",
    purpose:
      "To capture non-code engineering accomplishments—such as system designs, customer technical documentation, research papers, and course credentials—so they corroborate high-level architectural competencies.",
    whenToUse: [
      "When you have written a technical architecture proposal (RFC / ADR).",
      "When adding an industry certification (AWS Certified Solutions Architect, CKA, etc.).",
      "When importing an existing resume or academic research publication.",
      "When scraping a live personal portfolio website to index projects and case studies.",
    ],
    prerequisites: [
      "File size must not exceed 25MB.",
      "Supported formats: PDF, DOCX, TXT, Markdown (.md), and images (PNG, JPG, WEBP).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Intake Category",
        action: "Choose an intake category: Document / RFC, Certificate, Resume, Portfolio URL, Research Paper, or Other Deliverable.",
        buttonOrPath: "Category pill selectors at top of form (/app/evidence/upload)",
        details: "Categorization tunes the downstream AI prompt to focus on architecture, domain mastery, or credential validity.",
      },
      {
        stepNumber: 2,
        title: "Attach File or Provide Portfolio URL",
        action: "Drag and drop your file into the upload zone, or enter a portfolio URL to fetch preview content.",
        buttonOrPath: "File dropzone or 'Portfolio URL' input",
        details: "Max file size: 25MB. For portfolio URLs, click 'Preview Portfolio' to verify page titles before submission.",
      },
      {
        stepNumber: 3,
        title: "Fill Artifact Metadata",
        action: "Provide Deliverable Title, Project / Initiative Name, and describe your Specific Individual Contribution.",
        buttonOrPath: "Metadata text fields and 'Collaborative Project' checkbox",
        details: "Accurate contribution notes prevent team accomplishments from being misattributed to a single individual.",
      },
      {
        stepNumber: 4,
        title: "Submit for Ingestion & Vector Indexing",
        action: "Click 'PROCESS & INDEX DELIVERABLE' to execute normalization and storage.",
        buttonOrPath: "PROCESS & INDEX DELIVERABLE button",
        details: "The document is parsed, stripped of sensitive data, chunked, and saved directly to the Evidence Library.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "File upload (PDF, DOCX, TXT, MD, images up to 25MB) OR valid public portfolio URL",
        "Deliverable Title (e.g. 'Event Streaming Migration RFC')",
        "Contribution description highlighting individual responsibilities",
      ],
      outputArtifacts: [
        "Normalized document record in Evidence Library",
        "Semantic vector embeddings for skill retrieval",
        "Extracted keywords, technical entities, and architecture concepts",
        "Direct deep link to Evidence Library item view",
      ],
      supportedFormatsOrSources: ["PDF", "DOCX", "TXT", "MD", "PNG/JPG/WEBP", "Public Web URLs"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Ingesting an Architecture Design RFC",
      startingState: "An engineer drafted 'rfc-004-distributed-rate-limiting.md' on their local laptop.",
      actionTaken:
        "The engineer opens /app/evidence/upload, selects 'Document / RFC', uploads the markdown file (48 KB), sets Project to 'Edge Proxy Modernization', enters 'Authored consensus algorithm and token bucket evaluation', and clicks 'PROCESS & INDEX DELIVERABLE'.",
      resultingOutcome:
        "Processing finishes in 1.8 seconds. A success banner displays 'Evidence added successfully'. Evidence Library now contains the RFC tagged with 'Distributed Systems' and 'Rate Limiting'. The document is immediately ready for AI verification.",
      notes: "The document is marked with provenance 'Manual Upload' and cannot be altered once indexed.",
    },
    statusDefinitions: [
      {
        status: "indexed",
        badgeLabel: "Indexed",
        meaning: "Document text has been parsed, stripped of secrets, and embedded in the vector store.",
        nextAction: "View in Evidence Library or trigger AI work analysis.",
      },
      {
        status: "processing",
        badgeLabel: "Processing",
        meaning: "File is currently being converted, OCR-scanned, or chunked.",
        nextAction: "Wait for upload notification to complete.",
      },
      {
        status: "error",
        badgeLabel: "Error",
        meaning: "File parsing failed due to corruption, unsupported encoding, or exceeding 25MB limit.",
        nextAction: "Check file size and re-export in standard UTF-8 or PDF format.",
      },
    ],
    troubleshooting: [
      {
        symptom: "Upload fails with 'File size exceeds maximum allowed limit (25MB)'.",
        probableCause: "The uploaded presentation or PDF contains uncompressed high-resolution images or videos.",
        verifiedRemedy: "Compress images using PDF compression software or extract the technical text portion and save as Markdown/DOCX before uploading.",
      },
      {
        symptom: "Portfolio scraping returns 'Failed to fetch preview'.",
        probableCause: "The target website uses aggressive Cloudflare bot protection, is behind a VPN, or requires JavaScript client-side rendering.",
        verifiedRemedy: "Print the relevant portfolio case study page to PDF and upload it directly as a Document deliverable.",
      },
    ],
    relatedLinks: [
      { label: "Open Evidence Library", href: "/app/evidence/library" },
      { label: "View Ingestion Runs", href: "/app/evidence/runs" },
    ],
  },

  "evidence-library": {
    id: "evidence-library",
    title: "Evidence Library & Provenance Inspection",
    shortTitle: "Evidence Library",
    canonicalRoute: "/app/evidence/library",
    badgeLabel: "System of Record",
    iconName: "Library",
    summary:
      "Evidence Library is the centralized catalog of all ingested work deliverables. It displays raw excerpts, source provenance metadata, review statuses, and strength ratings, and provides item-level inspection and AI analysis triggers.",
    purpose:
      "To serve as the permanent, auditable ledger of all work evidence. Developers use it to audit what artifacts have been ingested, inspect cryptographic provenance, and verify how evidence corroborates competencies.",
    whenToUse: [
      "To search and filter across all collected GitHub commits, Jira tickets, and uploaded documents.",
      "To inspect the exact code diff or text excerpt that supports an extracted skill.",
      "To run AI work analysis on individual artifacts.",
      "To delete duplicate, deprecated, or erroneously ingested test files.",
    ],
    prerequisites: ["At least one evidence item must be ingested via Connected Sources or Upload Work & Docs."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Search & Filter Artifacts",
        action: "Use the search bar and filter dropdowns to locate specific deliverables.",
        buttonOrPath: "Search input & Source / Status filters (/app/evidence/library)",
        details: "Filter by source (GitHub, Jira, Certificate, Research, Other) and review status (Verified, Review Needed, Insufficient).",
      },
      {
        stepNumber: 2,
        title: "Inspect Evidence Cards",
        action: "Review individual card summaries, associated skill tags, strength meters, and processing statuses.",
        buttonOrPath: "Evidence item cards (/app/evidence/library)",
        details: "Cards display the source platform icon, creation date, sanitized code snippet, and strength rating.",
      },
      {
        stepNumber: 3,
        title: "Open Item Detail View",
        action: "Click on any evidence item card to navigate to its full inspection page (/app/evidence/library/[id]).",
        buttonOrPath: "Card click / 'View Details' link",
        details: "View complete cryptographic provenance, raw text excerpts, author metadata, and linked competency citations.",
      },
      {
        stepNumber: 4,
        title: "Analyze or Delete Items",
        action: "Trigger AI work analysis directly from the card, or delete unneeded test artifacts.",
        buttonOrPath: "'Analyze with AI' button or Trash icon",
        details: "Deleting an item removes it from the vector index and removes its corroboration from candidate skills.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: ["Search keywords or filter criteria."],
      outputArtifacts: [
        "Paginated and filtered evidence records",
        "Deep inspection modal / route with SHA-256 provenance hashes",
        "AI-extracted competency tags and confidence ratings",
      ],
      supportedFormatsOrSources: ["All ingested artifacts across GitHub, Jira, and Uploads"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Verifying Evidence for a Senior Promotion Packet",
      startingState: "An engineer has 34 items in their library and wants to prove their expertise in 'Kubernetes Operator Design'.",
      actionTaken:
        "The engineer navigates to /app/evidence/library, types 'Kubernetes' into the search filter, and locates the item 'k8s-crd-controller: Implement reconcile loop with ExponentialBackOff'. They click into the item to inspect the raw diff and provenance.",
      resultingOutcome:
        "The detail view displays the verified GitHub commit hash, lines added/deleted, author identity, and corroborating citations. The engineer confirms the review status is 'Verified'. This verified artifact directly backs their Level 4 Kubernetes rating in their passport.",
      notes: "The SHA-256 hash guarantees that the commit content has not been tampered with since ingestion.",
    },
    statusDefinitions: [
      {
        status: "verified",
        badgeLabel: "Verified",
        meaning: "Evidence item has been validated by both automated provenance checks and human review.",
        nextAction: "No action required. Actively backs passport skills.",
      },
      {
        status: "review_needed",
        badgeLabel: "Review Needed",
        meaning: "Item has been indexed, but skill relevance or contribution scope requires human confirmation.",
        nextAction: "Reviewer verifies artifact in Human Review Queue (/app/ai/review-queue).",
      },
      {
        status: "insufficient",
        badgeLabel: "Insufficient",
        meaning: "The artifact contains too little technical context (e.g. trivial typo fix or 1-line change) to corroborate a skill.",
        nextAction: "Combine with larger feature deliverables or upload architectural documentation.",
      },
    ],
    troubleshooting: [
      {
        symptom: "An expected deliverable does not appear in the library list.",
        probableCause: "The search query is overly restrictive, or the source filter is set to the wrong provider.",
        verifiedRemedy: "Clear the search input and set the Source filter to 'All Sources'. If still missing, check Ingestion Runs to verify the run completed.",
      },
      {
        symptom: "Deleting an evidence item shows an error banner.",
        probableCause: "Network interruption or the item is currently locked by an active AI work analysis job.",
        verifiedRemedy: "Wait 10 seconds for the analysis to complete, refresh the page, and click the delete button again.",
      },
    ],
    relatedLinks: [
      { label: "Upload Additional Work", href: "/app/evidence/upload" },
      { label: "Inspect Ingestion Runs", href: "/app/evidence/runs" },
      { label: "View Human Review Queue", href: "/app/ai/review-queue" },
    ],
  },

  "ingestion-runs": {
    id: "ingestion-runs",
    title: "Ingestion Runs & Pipeline Monitoring",
    shortTitle: "Ingestion Runs",
    canonicalRoute: "/app/evidence/runs",
    badgeLabel: "Pipeline Monitor",
    iconName: "Activity",
    summary:
      "Ingestion Runs monitors background discovery, extraction, and indexing tasks. It maintains an auditable job history, surfaces runtime error diagnostics, and provides one-click retries for failed ingestion runs.",
    purpose:
      "To provide total transparency into the asynchronous data pipeline, allowing developers to observe processing stages, troubleshoot import failures, and retry failed jobs without losing state.",
    whenToUse: [
      "Immediately after clicking 'Sync Selected Repositories' or 'Sync Now' in Connected Sources.",
      "When evidence items seem delayed or missing from the Evidence Library.",
      "When diagnosing external API rate limiting, expired tokens, or network timeouts.",
      "To re-enqueue and retry a previously failed pipeline execution.",
    ],
    prerequisites: ["At least one sync or upload job must have been executed."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Ingestion Runs Monitor",
        action: "Navigate to Ingestion Runs from the sidebar or click 'View Runs' in Evidence Center.",
        buttonOrPath: "Ingestion Runs link (/app/evidence/runs)",
        details: "The monitor displays total run count, timestamped executions, and processing durations.",
      },
      {
        stepNumber: 2,
        title: "Inspect Pipeline Status & Stage",
        action: "Review the status badge (Completed, Failed, Running, Queued) and stage for each run.",
        buttonOrPath: "Run execution rows (/app/evidence/runs)",
        details: "Stages include: Discovery, Normalization, Extraction, Deduplication, Indexing, and Ready for Review.",
      },
      {
        stepNumber: 3,
        title: "Examine Error Messages on Failed Runs",
        action: "Locate runs marked with a red 'Failed' status badge and read the specific error reason.",
        buttonOrPath: "Error callout box inside failed run card",
        details: "Identifies whether failure was caused by invalid credentials, rate limiting (HTTP 429), or malformed documents.",
      },
      {
        stepNumber: 4,
        title: "Retry Failed Executions",
        action: "Click the 'Retry' button on any failed run to re-enqueue the job.",
        buttonOrPath: "Retry Run button (RotateCcw icon)",
        details: "Re-triggers the pipeline without requiring you to re-enter repository names or credentials.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: ["Run ID or retry trigger."],
      outputArtifacts: [
        "Audit log of all background data synchronization jobs",
        "Item count metrics (items discovered, items indexed, items skipped)",
        "Notification toast alerting user when retried run completes",
      ],
      supportedFormatsOrSources: ["All background sync and upload workers"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Diagnosing a Rate-Limited GitHub Sync",
      startingState: "An engineer triggered a sync for 4 large repositories. After 2 minutes, Ingestion Runs shows Run #gh-998 marked as 'Failed'.",
      actionTaken:
        "The engineer visits /app/evidence/runs, inspects Run #gh-998, and reads the error details: 'GitHub API error: 429 Too Many Requests (Rate limit reset at 14:35 UTC)'. They wait until 14:36 UTC and click 'Retry Run'.",
      resultingOutcome:
        "The run transitions to 'Running', successfully discovers 42 pull requests, and finishes with status 'Completed'. 42 new evidence items appear in the Evidence Library, and a toast notification confirms 'Pipeline run retried and re-enqueued for normalization'.",
      notes: "Retry runs automatically skip already-indexed artifacts to avoid redundant duplicate entries.",
    },
    statusDefinitions: [
      {
        status: "completed",
        badgeLabel: "Completed",
        meaning: "All artifacts were successfully discovered, normalized, stripped, and indexed.",
        nextAction: "View items in Evidence Library (/app/evidence/library).",
      },
      {
        status: "running",
        badgeLabel: "Running",
        meaning: "Pipeline is actively fetching from external APIs or computing vector embeddings.",
        nextAction: "No action needed. Page updates automatically.",
      },
      {
        status: "queued",
        badgeLabel: "Queued",
        meaning: "Job is waiting for an available background worker thread.",
        nextAction: "Will begin execution automatically within a few seconds.",
      },
      {
        status: "failed",
        badgeLabel: "Failed",
        meaning: "Execution terminated prematurely due to an API error, timeout, or parsing failure.",
        nextAction: "Inspect the error reason, fix root cause if necessary, and click 'Retry'.",
      },
    ],
    troubleshooting: [
      {
        symptom: "A run remains in 'Running' state for more than 10 minutes.",
        probableCause: "The background worker encountered a transient network drop or an oversized binary file.",
        verifiedRemedy: "Refresh the page. If the status does not advance, check the backend server logs or re-trigger sync with fewer simultaneous repositories.",
      },
      {
        symptom: "Retry button does not change the run status.",
        probableCause: "The backend server is offline or the database connection pool is exhausted.",
        verifiedRemedy: "Verify that the backend is responding at http://127.0.0.1:8001/api/health. Once healthy, re-click 'Retry'.",
      },
    ],
    relatedLinks: [
      { label: "Inspect Evidence Center", href: "/app/evidence" },
      { label: "Review Evidence Library", href: "/app/evidence/library" },
      { label: "Connected Sources", href: "/app/evidence/sources" },
    ],
  },

  "data-permissions": {
    id: "data-permissions",
    title: "Data & Permissions Governance",
    shortTitle: "Data & Permissions",
    canonicalRoute: "/app/evidence/permissions",
    badgeLabel: "Privacy & Sovereignty",
    iconName: "Lock",
    summary:
      "Data & Permissions enforces local privacy, data sovereignty, and integration revocation. It displays authorized third-party scopes, guarantees that private code never leaks to third parties, and provides one-click disconnection.",
    purpose:
      "To give engineers complete sovereign control over what tools are authorized, how their work data is protected, and how evidence is safely segregated between internal logs and public recruiter passports.",
    whenToUse: [
      "To audit authorized permissions across connected GitHub and Jira accounts.",
      "To disconnect an integration when leaving an employer or rotating machines.",
      "To understand how proprietary company code is sanitized and kept private.",
      "To verify that revoking an integration preserves your verified credentials.",
    ],
    prerequisites: ["None. Accessible at all times."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Local Data Sovereignty Policy",
        action: "Read the Privacy by Design assurance banner at the top of the page.",
        buttonOrPath: "Privacy by Design card (/app/evidence/permissions)",
        details: "Confirms that repository diffs, worklogs, and credentials remain on local infrastructure.",
      },
      {
        stepNumber: 2,
        title: "Inspect Connected Integrations",
        action: "Review the list of connected services, account identities, and granted permission scopes.",
        buttonOrPath: "Connected Integrations list (/app/evidence/permissions)",
        details: "Displays granted scopes (e.g. 'repo:read', 'read:jira-work', 'read:jira-user').",
      },
      {
        stepNumber: 3,
        title: "Disconnect or Revoke Access",
        action: "Click 'Disconnect' on any integration to revoke token storage and stop automated sync.",
        buttonOrPath: "Disconnect button (/app/evidence/permissions)",
        details: "Halts future polling immediately. Does NOT delete previously verified skills or evidence items.",
      },
      {
        stepNumber: 4,
        title: "Configure Evidence Scoping",
        action: "Understand how evidence is scoped between internal development logs and public passports.",
        buttonOrPath: "Passport Sharing settings (/app/passport/sharing)",
        details: "Ensure proprietary commit messages and internal URLs are restricted from external recruiter views.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: ["Confirmation to disconnect or revoke authorization."],
      outputArtifacts: [
        "Updated integration connection status (switches to 'disconnected')",
        "Local credential purge from storage",
        "Audit log event recorded in system trail",
      ],
      supportedFormatsOrSources: ["All external OAuth / PAT integrations"],
    },
    concreteExample: {
      title: "Illustrative Scenario: Departing an Organization Without Losing Skills",
      startingState: "An engineer has connected their corporate GitHub account '@corp-dev' and verified 14 core skills.",
      actionTaken:
        "On their final day at the organization, the engineer visits /app/evidence/permissions and clicks 'Disconnect' next to GitHub (@corp-dev).",
      resultingOutcome:
        "The connection status immediately changes to 'Disconnected'. The PAT is purged from local storage, stopping all future background imports. However, all 14 verified skills and previously normalized evidence artifacts remain safely preserved in their Skill Passport.",
      notes: "The engineer retains permanent, sovereign proof of their accomplishments without violating the former employer's token access policies.",
    },
    statusDefinitions: [
      {
        status: "connected",
        badgeLabel: "Connected & Authorized",
        meaning: "Integration is actively authenticated with read permissions.",
        nextAction: "Manage sync frequency or disconnect when no longer needed.",
      },
      {
        status: "disconnected",
        badgeLabel: "Disconnected / Revoked",
        meaning: "Tokens have been deleted; no automated data polling will occur.",
        nextAction: "Reconnect at any time with a new token if access is restored.",
      },
    ],
    troubleshooting: [
      {
        symptom: "Clicking 'Disconnect' does not remove previously imported evidence items.",
        probableCause: "This is intentional by design. Disconnecting revokes source sync, but does not wipe earned skills.",
        verifiedRemedy: "If you specifically want to remove an imported item, go to the Evidence Library (/app/evidence/library) and click the Trash icon on that specific item.",
      },
      {
        symptom: "Reconnecting GitHub shows an error after previously disconnecting.",
        probableCause: "Browser cache holds an expired session token or the new PAT lacks minimum scopes.",
        verifiedRemedy: "Hard-refresh the page (Ctrl+F5 / Cmd+Shift+R) and paste a freshly created token with read permissions.",
      },
    ],
    relatedLinks: [
      { label: "Configure Connected Sources", href: "/app/evidence/sources" },
      { label: "Review Evidence Library", href: "/app/evidence/library" },
      { label: "Inspect Passport Sharing Allowlist", href: "/app/passport/sharing" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED WORKFLOWS (CROSS-FEATURE PATHWAYS)
// ─────────────────────────────────────────────────────────────────────────────

export const GUIDED_WORKFLOWS: GuidedWorkflow[] = [
  {
    id: "workflow-github-sync",
    title: "Connecting GitHub & Syncing Repositories to Verified Skills",
    summary:
      "A complete walkthrough showing how code commits and pull requests in a GitHub repository are discovered, sanitized of secrets, indexed into the Evidence Library, and verified as competencies.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Connected Sources — GitHub Configuration",
        route: "/app/evidence/sources/github",
        action: "Provide a GitHub Personal Access Token (PAT) with read-only scopes and click 'Test Connection'.",
        outcome: "Connectivity is validated and the list of available repositories is fetched.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Repository Selection & Sync Trigger",
        route: "/app/evidence/sources/github",
        action: "Check the checkbox next to your core project repositories and click 'Sync Selected Repositories'.",
        outcome: "A background Ingestion Run is created and queued for immediate execution.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Ingestion Runs Monitor",
        route: "/app/evidence/runs",
        action: "Observe the pipeline progress through Discovery, Normalization, Extraction, and Indexing.",
        outcome: "Pull request diffs are stripped of secrets and converted into immutable evidence items.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Evidence Library Inspection",
        route: "/app/evidence/library",
        action: "Filter by source 'GitHub' to inspect ingested deliverables and verify code excerpts.",
        outcome: "Items appear with source tags, strength ratings, and 'Indexed' processing status.",
      },
      {
        phaseNumber: 5,
        featureTitle: "AI Work Analysis & Human Review",
        route: "/app/ai/work-analysis",
        action: "Trigger AI work analysis to extract skill signals, which are then verified in the Review Queue.",
        outcome: "Corroborated skills transition from Candidate to Verified status on your Skill Passport.",
      },
    ],
    keyTakeaway:
      "Connecting a repository does NOT immediately verify a skill. Real work undergoes multi-stage normalization, secret scrubbing, AI extraction, and human review before becoming a verified credential.",
  },

  {
    id: "workflow-document-upload",
    title: "Uploading Architecture Deliverables & RFCs",
    summary:
      "How to ingest non-code work artifacts—such as system design proposals, research papers, and technical RFCs—so they corroborate high-level architectural and systems engineering skills.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Upload Work & Docs Category Selection",
        route: "/app/evidence/upload",
        action: "Select the 'Document / RFC' category and drop your PDF, DOCX, or Markdown document (max 25MB).",
        outcome: "File is staged and the document title is automatically populated.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Individual Contribution Scoping",
        route: "/app/evidence/upload",
        action: "Enter the project name, describe your specific individual contributions, and check 'Collaborative Project' if team-authored.",
        outcome: "Provenance metadata is attached to the deliverable to prevent team accomplishment misattribution.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Processing & Semantic Indexing",
        route: "/app/evidence/upload",
        action: "Click 'PROCESS & INDEX DELIVERABLE'.",
        outcome: "The document text is parsed, vector embedded, and added to the Evidence Library in under 3 seconds.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Verification & Skill Corroboration",
        route: "/app/evidence/library",
        action: "Open the newly indexed deliverable in the Evidence Library and click 'Analyze with AI'.",
        outcome: "Architectural competencies (e.g. Distributed Consensus, API Design) are extracted with citation markers.",
      },
    ],
    keyTakeaway:
      "Architecture RFCs provide critical evidence for Level 4 and Level 5 competencies that cannot be captured by code diffs alone.",
  },

  {
    id: "workflow-failed-run-recovery",
    title: "Investigating & Recovering from a Failed Ingestion Run",
    summary:
      "A systematic procedure for diagnosing pipeline errors (token expiry, rate limits, corrupt files) and recovering without re-entering configuration.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Identify Failure in Evidence Center",
        route: "/app/evidence",
        action: "Check the top metric card: 'FAILED INGESTION RUNS'. Click the card or alert banner.",
        outcome: "Navigates directly to Ingestion Runs & Monitor.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Inspect Error Diagnostics",
        route: "/app/evidence/runs",
        action: "Locate the failed execution row and inspect the error message box.",
        outcome: "Identifies whether error was 401 Unauthorized (expired token), 429 (rate limit), or 400 (corrupt file).",
      },
      {
        phaseNumber: 3,
        featureTitle: "Remediate Underlying Cause",
        route: "/app/evidence/sources",
        action: "If expired token: generate a fresh token in GitHub/Jira and re-save credentials. If rate-limited: wait for reset window.",
        outcome: "External credentials or API quotas are restored to healthy status.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Execute One-Click Pipeline Retry",
        route: "/app/evidence/runs",
        action: "Click the 'Retry' button (RotateCcw icon) on the failed run row.",
        outcome: "Job re-enqueues immediately, skips already-processed items, and finishes with status 'Completed'.",
      },
    ],
    keyTakeaway:
      "Pipeline failures never delete existing evidence items. One-click retries resume from the failure point once credentials or rate limits are resolved.",
  },

  {
    id: "workflow-evidence-vs-verified-skills",
    title: "The Boundary: Raw Evidence vs. AI Candidate vs. Verified Skill",
    summary:
      "Understanding the strict architectural boundary between raw collected artifacts, AI-extracted candidate claims, and human-verified credentials.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Raw Ingested Evidence (Evidence Workspace)",
        route: "/app/evidence/library",
        action: "Code commits, pull requests, Jira tickets, and uploaded documents are collected and stored immutably.",
        outcome: "Status: 'Indexed'. Represents tangible work artifacts, but NOT yet a skill or credential.",
      },
      {
        phaseNumber: 2,
        featureTitle: "AI Skill Extraction (AI Intelligence Domain)",
        route: "/app/ai/skill-extraction",
        action: "Large language models analyze artifacts to detect applied competencies, technical depth, and complexity.",
        outcome: "Status: 'Candidate Skill'. Represents a probabilistic hypothesis, NOT verified proof.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Hallucination Guard & Uncertainty Check (Trust Domain)",
        route: "/app/ai/guard",
        action: "Automated verification guards inspect prompt injection risks, evidence groundings, and confidence scores.",
        outcome: "Ungrounded or conflicting claims are rejected or routed to the human review queue.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Human-in-the-Loop Review (Governance)",
        route: "/app/ai/review-queue",
        action: "A peer reviewer, tech lead, or manager verifies authorship and confirms demonstrated competency.",
        outcome: "Status: 'Verified Skill'. Credential is cryptographic, tamper-evident, and passport-ready.",
      },
    ],
    keyTakeaway:
      "No amount of AI confidence can substitute for empirical artifact grounding and human verification. This guarantees that Skill Passport credentials are 100% trustworthy to hiring teams.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY (13+ DOMAIN TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const CONCEPTUAL_GLOSSARY: GlossaryTerm[] = [
  {
    term: "Evidence Item",
    definition:
      "An immutable, normalized representation of an individual work deliverable (e.g. a merged pull request, a completed Jira sprint ticket, or an uploaded technical design document).",
    context:
      "Stored in the Evidence Library with an immutable SHA-256 hash. Evidence items form the empirical foundation upon which all skills are evaluated.",
    relatedRoute: "/app/evidence/library",
    relatedRouteLabel: "Inspect Evidence Library",
  },
  {
    term: "Ingestion Run",
    definition:
      "An asynchronous background pipeline execution responsible for discovering, fetching, normalizing, sanitizing, and indexing work artifacts from an external platform or file upload.",
    context:
      "Monitored in Ingestion Runs & Monitor (/app/evidence/runs) with discrete stage tracking and one-click retry capabilities.",
    relatedRoute: "/app/evidence/runs",
    relatedRouteLabel: "View Ingestion Runs",
  },
  {
    term: "Provenance & Source Metadata",
    definition:
      "The verifiable chain of custody for a work deliverable, including author identity, repository URL, commit hash, timestamp, and signature validation.",
    context:
      "Ensures that work cannot be spoofed, misattributed, or duplicated between team members.",
    relatedRoute: "/app/evidence/library",
    relatedRouteLabel: "Inspect Item Details",
  },
  {
    term: "Normalization & Sanitization",
    definition:
      "The multi-stage pipeline process that cleans raw data into a standardized JSON structure while systematically stripping proprietary API keys, JWT tokens, internal IP, and PII.",
    context:
      "Guarantees that sensitive credentials are never stored in plain text or passed to LLM inference endpoints.",
    relatedRoute: "/app/evidence/permissions",
    relatedRouteLabel: "Review Data Sovereignty",
  },
  {
    term: "Candidate Skill vs. Verified Skill",
    definition:
      "A Candidate Skill is a probabilistic claim generated by AI extraction from an artifact. A Verified Skill is an empirical credential that has passed provenance validation and human-in-the-loop review.",
    context:
      "Candidate skills are never displayed on public recruiter passports until explicitly verified.",
    relatedRoute: "/app/passport/skills",
    relatedRouteLabel: "View Verified Skills",
  },
  {
    term: "Review Status",
    definition:
      "The human review state of an evidence item or extracted skill. Can be 'verified', 'review_needed' / 'needs_confirmation', or 'insufficient'.",
    context:
      "Items marked 'needs_confirmation' alert the engineer to verify that the extracted technical skills accurately reflect their work.",
    relatedRoute: "/app/evidence/library",
    relatedRouteLabel: "Filter by Review Status",
  },
  {
    term: "Confidence Score vs. Verification Status",
    definition:
      "A fundamental architectural distinction: Confidence is a mathematical probability (0-100%) indicating how certain the AI model is about a text span. Verification is an empirical determination that proof exists and was validated by human review.",
    context:
      "A claim with 99% AI confidence remains unverified if it lacks supporting work artifacts.",
    relatedRoute: "/app/ai/confidence",
    relatedRouteLabel: "Inspect AI Confidence Engine",
  },
  {
    term: "6-Stage Ingestion Pipeline",
    definition:
      "The architectural lifecycle through which every artifact passes: 1. Discovery → 2. Normalization → 3. Extraction → 4. Deduplication → 5. Indexing → 6. Ready for Review.",
    context:
      "Visualized in the Evidence Center to give engineers real-time visibility into processing stages.",
    relatedRoute: "/app/evidence",
    relatedRouteLabel: "View Lifecycle Pipeline",
  },
  {
    term: "Work Deliverable Scoping",
    definition:
      "The architectural separation between an engineer's private internal work history (full code diffs, ticket comments) and their public recruiter-facing Skill Passport (high-level summaries and verified capability scores).",
    context:
      "Protects employer intellectual property while granting the developer permanent career portability.",
    relatedRoute: "/app/passport/sharing",
    relatedRouteLabel: "Manage Passport Sharing",
  },
  {
    term: "Personal Access Token (PAT)",
    definition:
      "A user-scoped authentication string generated on GitHub or Jira with granular read-only permissions used by Skill Passport to fetch work data.",
    context:
      "Stored locally with encryption. Requires only 'repo:read' or fine-grained read scopes, ensuring Skill Passport can never modify your code or tickets.",
    relatedRoute: "/app/evidence/sources/github",
    relatedRouteLabel: "Configure GitHub PAT",
  },
  {
    term: "Re-sync vs. Deduplication",
    definition:
      "Re-syncing queries the external platform for new commits or tickets. Deduplication compares content hashes to ensure previously imported items are never duplicated in the library.",
    context:
      "Engineers can trigger re-syncs as often as desired without cluttering their library with repeated records.",
    relatedRoute: "/app/evidence/runs",
    relatedRouteLabel: "Inspect Ingestion Runs",
  },
  {
    term: "Evidence Scarcity & Growth Opportunities",
    definition:
      "When a role requires a skill for which the engineer has no ingested evidence items, the system reports an 'Evidence Gap' rather than an inability.",
    context:
      "Frames missing proof constructively as a targeted learning and project assignment opportunity.",
    relatedRoute: "/app/career",
    relatedRouteLabel: "Inspect Role Alignment",
  },
  {
    term: "Data Sovereignty & Source Revocation",
    definition:
      "The principle that the engineer owns their capability records. Disconnecting a source stops automated future data sync, but preserves previously verified credentials and evidence records.",
    context:
      "Ensures that changing employers, leaving a company, or rotating a laptop never deletes the verified skills you have earned.",
    relatedRoute: "/app/evidence/permissions",
    relatedRouteLabel: "Manage Data & Permissions",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific Evidence Workspace help topic.
 * Falls back to 'overview' for root or non-evidence pages.
 */
export function getHelpTopicIdFromPathname(pathname: string): HelpTopicId {
  if (!pathname) return "overview";

  const clean = pathname.toLowerCase();

  if (clean.startsWith("/app/evidence/sources")) {
    return "connected-sources";
  }
  if (clean.startsWith("/app/evidence/upload")) {
    return "upload-work";
  }
  if (clean.startsWith("/app/evidence/library")) {
    return "evidence-library";
  }
  if (clean.startsWith("/app/evidence/runs")) {
    return "ingestion-runs";
  }
  if (clean.startsWith("/app/evidence/permissions")) {
    return "data-permissions";
  }
  if (clean === "/app/evidence" || clean.startsWith("/app/evidence?")) {
    return "evidence-center";
  }

  // Default fallback for other pages
  return "overview";
}
