/**
 * AI Intelligence Product Help & Conceptual Guidance Data Catalog
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 7 AI Intelligence features, 4 guided workflows, and core conceptual distinctions.
 */

export type AIHelpTopicId =
  | "ai-overview"
  | "ai-work-analysis"
  | "skill-extraction"
  | "evidence-mapping"
  | "verification-review"
  | "confidence-uncertainty"
  | "conflict-resolution"
  | "workflows"
  | "glossary";

export interface AIStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface AIConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface AIStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface AITroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface AIHelpTopic {
  id: AIHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  iconName: "Cpu" | "Sparkles" | "Fingerprint" | "Layers" | "Scale" | "Percent" | "GitCompare" | "ShieldCheck" | "BookOpen";
  summary: string;
  purpose: string; // What this feature does
  whenToUse: string[]; // When should I use it?
  prerequisites: string[]; // What must be available before starting?
  stepByStep: AIStepInstruction[]; // Numbered instructions using actual UI controls
  practicalExample: AIConcreteExample; // Realistic illustrative scenario
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  interpretationAndTrust: {
    statusBadges: AIStatusDefinition[];
    trustPrinciples: string[];
    confidenceCaveat: string;
  };
  troubleshooting: AITroubleshootingItem[]; // What can go wrong and how to recover
  whatHappensNext: {
    downstreamFeature: string;
    nextStepAction: string;
    targetRoute: string;
  };
  implementationStatus: {
    state: "fully_implemented" | "partially_implemented" | "fallback_active";
    notes: string;
  };
  relatedLinks: Array<{ label: string; href: string }>;
}

export interface AIGuidedWorkflow {
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

export interface AIGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOPIC GUIDES FOR ALL 7 AI INTELLIGENCE FEATURES
// ─────────────────────────────────────────────────────────────────────────────

export const AI_HELP_TOPICS: Record<Exclude<AIHelpTopicId, "workflows" | "glossary">, AIHelpTopic> = {
  "ai-overview": {
    id: "ai-overview",
    title: "AI Work Analysis & Hallucination Protection Overview",
    shortTitle: "AI Overview",
    canonicalRoute: "/app/ai",
    badgeLabel: "Domain Overview",
    iconName: "Cpu",
    summary:
      "AI Overview is the central executive dashboard for the AI Intelligence and Trust Governance domains. It aggregates real-time metrics across work analyses, extracted candidate skills, blocked hallucinated claims, open conflicts, and schema validations.",
    purpose:
      "To provide an instant, transparent audit of the AI inference lifecycle. It reveals how many work items have undergone LLM analysis, how many candidate skills are proposed, how many overclaims were blocked by Hallucination Guards, and where human review is required.",
    whenToUse: [
      "When checking whether recently ingested repositories or documents have been analyzed by AI.",
      "To view executive counts of Candidate Skills vs Verified Skills.",
      "To see if any claims were blocked by the Hallucination Guard or flagged for prompt injection.",
      "To navigate directly to detailed AI analysis, extraction, verification, or conflict workspaces.",
    ],
    prerequisites: [
      "At least one evidence item ingested in Evidence Workspace (or preloaded demo data).",
      "Read access to AI Intelligence domain.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Inspect Top Metric Cards",
        action: "Review Work Analyses, Candidate Skills, Claims Blocked, and Open Conflicts.",
        buttonOrPath: "Top Metric Cards Row (/app/ai)",
        details: "Values are queried live from the backend (/api/v1/ai/overview). If 0, click 'Evidence Workspace →' to ingest initial work.",
      },
      {
        stepNumber: 2,
        title: "Explore Feature Directory Cards",
        action: "Review the 12 AI Intelligence & Trust Governance feature cards.",
        buttonOrPath: "Feature grid cards (/app/ai)",
        details: "Cards link directly to AI Work Analysis, Skill Extraction, Evidence Mapping, Verification Review, Confidence, Conflicts, and Trust Guards.",
      },
      {
        stepNumber: 3,
        title: "Check Hallucination Guard Status",
        action: "Click 'Inspect Guard' button in the top bar to inspect blocked claims.",
        buttonOrPath: "Inspect Guard button (/app/ai/guard)",
        details: "Shows which self-claims or LLM proposals were quarantined due to missing citations or invalid evidence IDs.",
      },
      {
        stepNumber: 4,
        title: "Review Recent AI Audit Trail",
        action: "Scroll to the bottom to inspect recent timestamped AI events.",
        buttonOrPath: "Recent Activity log (/app/ai)",
        details: "Displays actor identities, models used, state transitions, and specific justification notes.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Database records from work_analysis_results, evidence_competency_mappings, hallucination_guard_results, and conflict_records tables.",
      ],
      outputArtifacts: [
        "Executive metric summaries across 8 dimensions",
        "Direct navigation deep links to all 7 AI Intelligence features",
        "Recent AI audit log entries with timestamped state changes",
      ],
      originAndProcessing:
        "Aggregated by FastAPI backend (/api/v1/ai/overview) using SQL group-by queries on SQLite/PostgreSQL.",
      generatedVsPersisted:
        "All numbers on this dashboard reflect successfully persisted database records, not uncommitted in-memory states.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Verifying Ingestion Readiness",
      startingState: "An engineer just connected a GitHub repository and synced 12 pull requests in Evidence Workspace.",
      actionTaken:
        "The engineer navigates to /app/ai to check AI status. They observe 'Work Analyses: 0' and 'Candidate Skills: 0', with an informational banner: 'No AI Analyses Executed Yet'.",
      resultingOutcome:
        "The engineer clicks the banner link 'Evidence Workspace →' (or clicks 'AI Work Analysis' card), selects their repository, and clicks 'RUN WORK ANALYSIS'. Upon returning to AI Overview, 'Work Analyses' increments to 1 and 'Candidate Skills' displays the newly proposed competencies.",
      inspectionGuide: "Check that 'Work Analyses' shows at least 1 and that 'Recent Activity' logs the analysis run event.",
      recoveryNote: "If metrics show 0 after running analysis, hard-refresh or check if the backend service is healthy at /api/v1/health/ready.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "work_analyses",
          badgeLabel: "Sources Analyzed",
          meaning: "Total number of work deliverables decomposed into structured facts.",
          nextAction: "Click to view detailed fact breakdowns in AI Work Analysis.",
        },
        {
          status: "candidate_skills",
          badgeLabel: "Candidate Skills",
          meaning: "Proposed skills extracted by LLM; NOT yet verified credentials.",
          nextAction: "Review in Skill Extraction and Verification Review.",
        },
        {
          status: "claims_blocked",
          badgeLabel: "Claims Blocked",
          meaning: "Claims quarantined by Hallucination Guard for missing or falsified citations.",
          nextAction: "Inspect in Hallucination Guard (/app/ai/guard).",
        },
      ],
      trustPrinciples: [
        "AI Overview counts reflect candidate hypotheses and guard checks, not finalized endorsements.",
        "A high candidate skill count does not equate to high proficiency.",
        "Blocked claims demonstrate that safety boundaries are actively preventing ungrounded skills from leaking into the passport.",
      ],
      confidenceCaveat:
        "Metrics on this dashboard summarize system throughput. They do not represent an evaluation of candidate quality or employment eligibility.",
    },
    troubleshooting: [
      {
        symptom: "Dashboard displays loading skeleton indefinitely.",
        probableCause: "Backend service on port 8001 is offline or database connection pool is unresponsive.",
        verifiedRemedy: "Verify that FastAPI backend is running. Check /api/v1/health/ready in your browser.",
      },
      {
        symptom: "Metrics show 0 across all cards despite previous analyses.",
        probableCause: "Logged in under a different user identity or the local database session was reset.",
        verifiedRemedy: "Check role selector in top bar (Employee/Reviewer/Admin) and verify active account identity in Settings.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "AI Work Analysis",
      nextStepAction: "Select an ingested source and trigger deep fact decomposition.",
      targetRoute: "/app/ai/work-analysis",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Directly wired to FastAPI backend (/api/v1/ai/overview and /api/v1/ai/bootstrap).",
    },
    relatedLinks: [
      { label: "Open AI Work Analysis", href: "/app/ai/work-analysis" },
      { label: "Inspect Hallucination Guard", href: "/app/ai/guard" },
      { label: "Open Review Queue", href: "/app/ai/review-queue" },
    ],
  },

  "ai-work-analysis": {
    id: "ai-work-analysis",
    title: "AI Work Analysis & Fact Decomposition",
    shortTitle: "AI Work Analysis",
    canonicalRoute: "/app/ai/work-analysis",
    badgeLabel: "Inference Engine",
    iconName: "Sparkles",
    summary:
      "AI Work Analysis decomposes raw deliverables (commits, pull requests, READMEs, uploaded RFCs) into structured facts, claimed attributes, inferred competencies, and uncertainty flags using local LLM inference (Qwen-3 8B via Ollama) with an automatic rule-based fallback.",
    purpose:
      "To transform unorganized text and code diffs into auditable technical evidence before skill mapping. It rigorously separates observed facts (what actually exists in code) from self-reported claims (what author wrote in descriptions) and flags genuine technical uncertainties.",
    whenToUse: [
      "After connecting a new code repository or uploading an engineering deliverable.",
      "To inspect the concrete technical tasks and technologies extracted from a specific commit or design document.",
      "To re-run analysis after updating repository code or commit messages.",
      "To inspect whether Ollama model inference or deterministic rule-based fallback was used.",
    ],
    prerequisites: [
      "At least one evidence item in Evidence Workspace.",
      "Local Ollama instance with 'qwen3:8b' model installed (or system will automatically use the built-in deterministic rule-based engine).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Source Deliverable",
        action: "Use the filter tabs (ALL, GITHUB, DOCUMENTS, PORTFOLIO) and source dropdown to choose an artifact.",
        buttonOrPath: "Source selector dropdown or 'Browse All Sources' drawer (/app/ai/work-analysis)",
        details: "Displays repository name, commit SHA, document title, and artifact date.",
      },
      {
        stepNumber: 2,
        title: "Trigger Work Analysis",
        action: "Click 'RUN WORK ANALYSIS' (or 'RE-RUN ANALYSIS').",
        buttonOrPath: "RUN WORK ANALYSIS button (Sparkles icon)",
        details: "Submits request to POST /api/v1/ai/work-analysis. The backend validates prompt injection risks, sends prompt to Ollama, validates JSON schema, and persists results.",
      },
      {
        stepNumber: 3,
        title: "Inspect Observed Facts vs Claims",
        action: "Review the 'Observed Facts' panel and compare with 'Claimed Information'.",
        buttonOrPath: "Observed Facts & Claimed Information tabs",
        details: "Observed facts cite exact code modifications or file paths. Claimed information notes unconfirmed author statements.",
      },
      {
        stepNumber: 4,
        title: "Review Demonstrated Skills & Uncertainties",
        action: "Inspect extracted skills with suggested proficiencies and read all 'Uncertainty Flags'.",
        buttonOrPath: "Demonstrated Skills and Uncertainty Flags cards",
        details: "Uncertainties flag collaborative ambiguity, missing tests, or unverified author contribution ratios.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Evidence Item ID (pointing to raw content, commit diff, README, or document text up to token limit)",
      ],
      outputArtifacts: [
        "Structured WorkAnalysisResult record stored in database",
        "Observed facts with artifact locus citations",
        "Inferred attributes with supporting fact references",
        "Detected technical tasks and technology list",
        "Demonstrated skills with suggested proficiency and justifications",
        "Uncertainty flags (e.g. attribution ambiguity)",
        "Dynamic confidence score (0.10 - 0.99)",
      ],
      originAndProcessing:
        "Pipeline: Evidence Item → Prompt Injection Check → Ollama Qwen-3 8B → JSON Schema Output Validation → SQLite/PostgreSQL DB Persistence. If Ollama is unavailable or times out, the system automatically runs the deterministic rule-based extractor.",
      generatedVsPersisted:
        "The completed analysis is permanently saved to the database. Re-running overwrites the previous analysis run and logs a new audit event.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Decomposing a Distributed Payment Gateway PR",
      startingState: "An engineer selects pull request #42 'Add idempotent stripe webhook handler with redis lock'.",
      actionTaken:
        "The engineer clicks 'RUN WORK ANALYSIS'. The system dispatches the PR diff and commit message to the backend.",
      resultingOutcome:
        "Analysis finishes in 2.1s (Model: qwen3:8b, Confidence: 91%). Observed Facts include: 'Added Redis SETNX lock with 30s TTL in payments/webhook.py'. Demonstrated Skills include: 'Redis Distributed Locking (Advanced)' and 'Idempotency Design (Intermediate)'. Uncertainty Flag noted: 'No mock webhook failure tests detected in diff'.",
      inspectionGuide: "Inspect the Observed Facts section to confirm the file path and lock mechanism are correctly recognized.",
      recoveryNote: "If Ollama is offline, a warning badge 'Rule-based Engine' indicates the deterministic fallback parsed the diff without AI inference.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "completed",
          badgeLabel: "Analysis Completed",
          meaning: "Artifact was successfully parsed and validated into structured facts.",
          nextAction: "Review demonstrated skills and proceed to Skill Extraction.",
        },
        {
          status: "fallback_used",
          badgeLabel: "Rule-Based Fallback",
          meaning: "Ollama was unreachable or timed out. Deterministic heuristic extraction was used safely.",
          nextAction: "Results are valid, but starting Ollama locally will provide deeper semantic reasoning.",
        },
        {
          status: "analyzing",
          badgeLabel: "Analyzing...",
          meaning: "Inference is actively executing.",
          nextAction: "Wait 2-4 seconds for completion.",
        },
      ],
      trustPrinciples: [
        "AI Work Analysis proposes facts and inferences; it does NOT grant skill verification.",
        "A README describing an architecture does NOT prove the developer personally built or authored the entire system.",
        "Uncertainty flags are safety assets that protect developers from inaccurate skill overclaims.",
      ],
      confidenceCaveat:
        "The confidence score (e.g. 91%) measures model recognition certainty and artifact detail depth. It does NOT calibrate hiring readiness.",
    },
    troubleshooting: [
      {
        symptom: "Analysis returns 'Rule-based Engine' fallback instead of Qwen-3 8B.",
        probableCause: "Ollama service is not running on http://localhost:11434 or model 'qwen3:8b' is not installed.",
        verifiedRemedy: "Run 'ollama serve' in your terminal and verify 'ollama list' includes qwen3:8b. Re-click 'RE-RUN ANALYSIS'.",
      },
      {
        symptom: "Analysis request fails with 404 or empty source.",
        probableCause: "Selected evidence item has no text content or was deleted from the library.",
        verifiedRemedy: "Go to Evidence Library (/app/evidence/library) and ensure the deliverable contains valid text or diffs.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Skill Extraction",
      nextStepAction: "Map demonstrated skills to the canonical taxonomy without double counting.",
      targetRoute: "/app/ai/skill-extraction",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Backed by backend/app/ai/work_analyzer.py, Ollama client, Pydantic schemas, and fallback heuristic engine.",
    },
    relatedLinks: [
      { label: "Inspect Evidence Library", href: "/app/evidence/library" },
      { label: "Proceed to Skill Extraction", href: "/app/ai/skill-extraction" },
      { label: "Review Hallucination Guard", href: "/app/ai/guard" },
    ],
  },

  "skill-extraction": {
    id: "skill-extraction",
    title: "Skill Extraction & Taxonomy Mapping",
    shortTitle: "Skill Extraction",
    canonicalRoute: "/app/ai/skill-extraction",
    badgeLabel: "Taxonomy & Synonyms",
    iconName: "Fingerprint",
    summary:
      "Skill Extraction identifies competency claims from analyzed work deliverables, normalizes synonyms, resolves technology aliases (e.g. 'React.js' → 'React', 'k8s' → 'Kubernetes'), and flags duplicates to prevent resume skill-stuffing.",
    purpose:
      "To map raw technical keywords into canonical, structured competencies aligned with industry job taxonomies, ensuring consistent evaluation across different source representations.",
    whenToUse: [
      "After completing AI Work Analysis across your evidence items.",
      "To inspect which candidate skills were extracted and how aliases were resolved.",
      "To identify duplicate or overlapping skills before submitting for review.",
      "To trigger a batch extraction pass across all connected repositories.",
    ],
    prerequisites: [
      "At least one completed AI Work Analysis or ingested evidence item.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Candidate List",
        action: "Browse extracted candidates, original labels, canonical names, and categories.",
        buttonOrPath: "Candidate Skills table (/app/ai/skill-extraction)",
        details: "Displays taxonomy status: 'canonical', 'alias', 'duplicate', or 'flagged'.",
      },
      {
        stepNumber: 2,
        title: "Filter by Taxonomy Status",
        action: "Use status tabs to isolate duplicates, aliases, or flagged items.",
        buttonOrPath: "Status filter pills (ALL, CANONICAL, ALIAS, DUPLICATE, FLAGGED)",
        details: "Duplicates indicate skills that map to an already-credited canonical competency.",
      },
      {
        stepNumber: 3,
        title: "Inspect Skill Provenance & Citations",
        action: "Click on any candidate card to view detailed extraction reasoning.",
        buttonOrPath: "Candidate row click / Inspection Panel",
        details: "Displays verbatim source excerpts, model confidence, and linked evidence items.",
      },
      {
        stepNumber: 4,
        title: "Trigger Batch Extraction Pass",
        action: "Click 'RUN EXTRACTION PASS' to re-scan all connected evidence items.",
        buttonOrPath: "RUN EXTRACTION PASS button (Fingerprint icon)",
        details: "Dispatches POST /api/v1/ai/skill-extraction, extracts candidate skills, and logs an audit event.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Analyzed evidence items or WorkAnalysisResult records.",
      ],
      outputArtifacts: [
        "Candidate Skill records linked to user identity",
        "Canonical taxonomy mappings with synonym resolution",
        "Alias associations (e.g. k8s → Kubernetes)",
        "Audit trail record of extraction pass",
      ],
      originAndProcessing:
        "Processed by backend/app/ai/skill_extractor.py using fuzzy taxonomy matching and Qwen-3 8B semantic extraction.",
      generatedVsPersisted:
        "Candidates are stored in the database as 'candidate' state. They remain candidate until verified by an authorized human reviewer.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Resolving Framework Aliases",
      startingState: "A work deliverable mentions 'FastAPI', 'fast-api', and 'Python async web framework'.",
      actionTaken:
        "The user triggers 'RUN EXTRACTION PASS'. The extractor normalizes all three variations.",
      resultingOutcome:
        "A single canonical candidate 'FastAPI' is produced. 'fast-api' is tagged as 'alias', and the redundant mention is tagged as 'duplicate' to prevent triple-counting. Candidate confidence is calculated as 94%.",
      inspectionGuide: "Click 'FastAPI' in the list; the right-hand panel displays the alias list and the exact supporting excerpt.",
      recoveryNote: "If a valid skill is flagged as duplicate incorrectly, open Evidence Mapping to review source linkages.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "canonical",
          badgeLabel: "Canonical",
          meaning: "Primary recognized taxonomy term for this competency.",
          nextAction: "Proceed to Evidence Mapping.",
        },
        {
          status: "alias",
          badgeLabel: "Alias",
          meaning: "Synonym mapped to a primary canonical skill.",
          nextAction: "Aggregated automatically under parent canonical skill.",
        },
        {
          status: "duplicate",
          badgeLabel: "Duplicate",
          meaning: "Redundant mention of a skill already extracted from this deliverable.",
          nextAction: "Suppressed from passport scoring to prevent inflation.",
        },
      ],
      trustPrinciples: [
        "An extracted candidate skill is a hypothesis, NOT a verified accomplishment.",
        "Mention of a technology in documentation does not prove competence in operating it in production.",
        "Taxonomy normalization protects employers from resume buzzword stuffing.",
      ],
      confidenceCaveat:
        "Candidate extraction confidence measures keyword and semantic match strength, not verified workplace capability.",
    },
    troubleshooting: [
      {
        symptom: "A niche or proprietary internal framework is not recognized.",
        probableCause: "The framework name is not in the public taxonomy vocabulary.",
        verifiedRemedy: "The extractor will categorize it under 'Custom / Domain Specific'. You can corroborate it with an uploaded architecture RFC.",
      },
      {
        symptom: "Extraction pass completes but returns 0 candidate skills.",
        probableCause: "Source deliverables contain too little technical text (e.g. one-line commit message).",
        verifiedRemedy: "Upload the project's README or design RFC via Evidence Workspace (/app/evidence/upload).",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Evidence Mapping",
      nextStepAction: "Inspect the exact source loci and code snippets substantiating each candidate.",
      targetRoute: "/app/ai/evidence-mapping",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Integrated with backend/app/ai/skill_extractor.py and database taxonomy tables.",
    },
    relatedLinks: [
      { label: "Inspect Evidence Mapping", href: "/app/ai/evidence-mapping" },
      { label: "Review Verification Queue", href: "/app/ai/verification" },
    ],
  },

  "evidence-mapping": {
    id: "evidence-mapping",
    title: "Evidence Mapping Review & Provenance Citations",
    shortTitle: "Evidence Mapping",
    canonicalRoute: "/app/ai/evidence-mapping",
    badgeLabel: "Locus & Provenance",
    iconName: "Layers",
    summary:
      "Evidence Mapping connects candidate skills to exact source loci—verbatim code excerpts, file paths, pull requests, and Jira tickets. It allows engineers and reviewers to audit whether a skill claim is genuinely substantiated by authentic deliverables.",
    purpose:
      "To maintain an unbreakable, auditable link between claims and proof. It prevents ungrounded skills by requiring every competency to point to inspectable source material.",
    whenToUse: [
      "To inspect the exact code snippet or document excerpt supporting a candidate skill.",
      "To report an incorrect or overclaimed mapping.",
      "To check whether an evidence mapping is direct implementation or merely course certification.",
      "To verify that code loci and file paths match expected project deliverables.",
    ],
    prerequisites: [
      "Candidate skills extracted from evidence items.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Mapping Record",
        action: "Use search bar to filter by skill name or evidence title, then click a mapping row.",
        buttonOrPath: "Evidence Mapping table (/app/ai/evidence-mapping)",
        details: "Displays candidate label, evidence title, relationship type, and confidence.",
      },
      {
        stepNumber: 2,
        title: "Inspect Source Relationship Type",
        action: "Review the relationship badge: Direct Implementation, Project Documentation, Course Certificate, or Self-Reported Claim.",
        buttonOrPath: "Relationship badge in mapping detail",
        details: "Direct Implementation indicates code authorship; Course Certificate represents educational completion.",
      },
      {
        stepNumber: 3,
        title: "Audit Verbatim Excerpt & Source Locus",
        action: "Examine the code snippet, commit hash, and file path in the Excerpt panel.",
        buttonOrPath: "Substantiating Source Locus card",
        details: "Shows verbatim text cited by the AI extractor. Confirm that it genuinely supports the skill.",
      },
      {
        stepNumber: 4,
        title: "Report or Confirm Mapping",
        action: "If the excerpt does not support the skill, click 'Report Incorrect Mapping'.",
        buttonOrPath: "Report Incorrect Mapping button (Flag icon)",
        details: "Opens feedback modal. Submitting records an audit event and flags the candidate for review.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Candidate Skill ID and Evidence Item ID.",
      ],
      outputArtifacts: [
        "EvidenceCompetencyMapping records stored in database",
        "Exact locus metadata (commit SHA, file path, line numbers)",
        "Audit events logging flagged or recalibrated mappings",
      ],
      originAndProcessing:
        "Constructed during AI work analysis and skill extraction passes, persisted in evidence_competency_mappings table.",
      generatedVsPersisted:
        "All mappings shown are persisted in the database with timestamps and foreign keys.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Auditing a 'Kafka' Skill Mapping",
      startingState: "A candidate skill 'Apache Kafka' is mapped to evidence item 'payment-stream-v2'.",
      actionTaken:
        "The reviewer opens /app/ai/evidence-mapping and selects the 'Apache Kafka' mapping row. They inspect the Substantiating Source Locus.",
      resultingOutcome:
        "The locus shows file 'workers/consumer.py', lines 45-88, and relationship 'Direct Implementation'. The verbatim excerpt demonstrates consumer group rebalancing and offset commits. The reviewer confirms the mapping is genuine.",
      inspectionGuide: "Verify that the relationship badge reads 'Direct Implementation' and that the code excerpt contains real Kafka consumer logic.",
      recoveryNote: "If the excerpt only shows a docker-compose line with Kafka, click 'Report Incorrect Mapping' and explain that environment setup does not prove Kafka development.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "direct_implementation",
          badgeLabel: "Direct Implementation",
          meaning: "Direct code authorship in repository commits or pull requests.",
          nextAction: "Highest evidentiary weight for verification.",
        },
        {
          status: "project_documentation",
          badgeLabel: "Project Documentation",
          meaning: "Architectural RFC, design specification, or technical whitepaper.",
          nextAction: "Substantiates high-level system design competencies.",
        },
        {
          status: "course_certificate",
          badgeLabel: "Course Certificate",
          meaning: "Educational completion credential; does NOT prove production delivery.",
          nextAction: "Candidate learning evidence only; requires practical deliverables.",
        },
        {
          status: "self_claim",
          badgeLabel: "Self-Reported Claim",
          meaning: "Resume statement without supporting code artifact.",
          nextAction: "Blocked by Hallucination Guard until corroborated.",
        },
      ],
      trustPrinciples: [
        "A mapping shows where the AI found a keyword; it does not replace human evaluation of that work.",
        "Multiple skills mapping to the same 2-line typo fix indicates overextraction and should be flagged.",
        "Direct Implementation carries significantly higher verification weight than Course Certificates.",
      ],
      confidenceCaveat:
        "Mapping confidence indicates citation relevance certainty, not candidate mastery.",
    },
    troubleshooting: [
      {
        symptom: "The supporting excerpt is truncated or shows '[REDACTED]'.",
        probableCause: "The secret scrubber sanitized proprietary API keys or credentials during normalization.",
        verifiedRemedy: "This is expected behavior. Secrets are intentionally masked to preserve security.",
      },
      {
        symptom: "Clicking 'Inspect Evidence' returns a 404.",
        probableCause: "The underlying evidence deliverable was deleted from the Evidence Library.",
        verifiedRemedy: "Re-run the extraction pass on active evidence items.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Verification Review",
      nextStepAction: "Evaluate corroborated claims against formal verification policies.",
      targetRoute: "/app/ai/verification",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Backed by EvidenceCompetencyMapping database models and audit logging.",
    },
    relatedLinks: [
      { label: "Inspect Evidence Library Item", href: "/app/evidence/library" },
      { label: "Open Verification Review", href: "/app/ai/verification" },
    ],
  },

  "verification-review": {
    id: "verification-review",
    title: "Skill Verification Review & Policy Gates",
    shortTitle: "Verification Review",
    canonicalRoute: "/app/ai/verification",
    badgeLabel: "Policy v2026.1",
    iconName: "Scale",
    summary:
      "Verification Review is the authoritative procedural checkpoint where candidate skills are evaluated against formal verification standards (Policy v2026.1). Authorized reviewers examine evidence gates, corroborate deliverables, and approve or reject claims.",
    purpose:
      "To ensure that no AI proposal, extraction score, or confidence metric automatically becomes a verified credential. Verification is an empirical human-in-the-loop determination requiring authentic deliverables and author attribution.",
    whenToUse: [
      "When evaluating an engineer's candidate skills for inclusion in their official Skill Passport.",
      "When reviewing evidence gates (minimum artifact count, author attribution, code impact).",
      "To flag claims that lack sufficient corroboration before an internal promotion or client placement.",
      "To inspect the formal rationale recorded for previously verified or rejected skills.",
    ],
    prerequisites: [
      "Candidate skills with associated evidence mappings.",
      "Reviewer or Administrator role to authorize binding decisions (Employees can review and simulate decisions in preview mode).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Skill Verification Record",
        action: "Use search and status filter tabs (ALL, VERIFIED, PENDING REVIEW, INSUFFICIENT EVIDENCE) to select a skill.",
        buttonOrPath: "Verification list (/app/ai/verification)",
        details: "Displays candidate skill, claimed proficiency, policy version, and evidence count.",
      },
      {
        stepNumber: 2,
        title: "Audit Evidence Gate Checklist",
        action: "Inspect the Verification Checklist in the right panel.",
        buttonOrPath: "Evidence Gate checklist items",
        details: "Checks: 1. Minimum 1 direct work deliverable; 2. Verified author identity; 3. Validated technical complexity.",
      },
      {
        stepNumber: 3,
        title: "Inspect Supporting Deliverables",
        action: "Click linked evidence titles to review raw code diffs and commit hashes.",
        buttonOrPath: "Corroborating Evidence items with external links",
        details: "Confirms that the work artifact actually demonstrates the claimed proficiency level.",
      },
      {
        stepNumber: 4,
        title: "Submit Authorized Decision",
        action: "Click 'APPROVE (VERIFY)', 'FLAG INSUFFICIENT EVIDENCE', or 'REJECT CLAIM'.",
        buttonOrPath: "Reviewer action buttons at bottom of inspection card",
        details: "Updates verification status in database, logs an immutable audit event, and notifies the candidate.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Verification ID, Reviewer Action ('approve', 'insufficient', 'reject'), and decision rationale.",
      ],
      outputArtifacts: [
        "Updated VerificationDecision record in database",
        "Skill status updated to 'verified', 'insufficient_evidence', or 'not_verified'",
        "Immutable ReviewAuditEvent record logging reviewer identity and timestamp",
        "Notification dispatched to user",
      ],
      originAndProcessing:
        "Managed by backend/app/ai/verification_service.py and persisted in verification_decisions table.",
      generatedVsPersisted:
        "Decisions are immediately committed to the database and reflect in passport skill tallies.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Verifying a 'Distributed Systems' Competency",
      startingState: "A candidate skill 'Distributed Systems' (Proficiency: Advanced) is in 'Pending Review' state with 2 linked deliverables.",
      actionTaken:
        "The reviewer examines the two deliverables: a merged consensus engine PR and an architectural RFC. All three evidence gates pass. The reviewer clicks 'APPROVE (VERIFY)'.",
      resultingOutcome:
        "The status updates to 'Verified Advanced'. A ReviewAuditEvent is recorded: 'Decision: APPROVE, Actor: Authorized Reviewer, Policy: v2026.1'. The skill immediately becomes active on the candidate's Skill Passport.",
      inspectionGuide: "Check that the status badge changes to 'Verified' and that the audit log displays the approval.",
      recoveryNote: "If evidence is weak, clicking 'FLAG INSUFFICIENT EVIDENCE' moves the item to Insufficient without penalizing the candidate.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "verified",
          badgeLabel: "Verified",
          meaning: "Empirically validated by human reviewer against Policy v2026.1.",
          nextAction: "Appears on official Skill Passport.",
        },
        {
          status: "pending_review",
          badgeLabel: "Pending Review",
          meaning: "Candidate evidence is staged but awaits reviewer authorization.",
          nextAction: "Reviewer must examine deliverables and submit decision.",
        },
        {
          status: "insufficient_evidence",
          badgeLabel: "Insufficient Evidence",
          meaning: "Artifacts are authentic but lack the technical depth required for the claimed level.",
          nextAction: "Candidate must upload larger project deliverables.",
        },
        {
          status: "not_verified",
          badgeLabel: "Rejected / Not Verified",
          meaning: "Claim was rejected due to lack of authorship proof or policy violation.",
          nextAction: "Excluded from passport.",
        },
      ],
      trustPrinciples: [
        "Statistical AI confidence cannot substitute for procedural verification.",
        "A claim with 99% AI confidence remains unverified until it satisfies all empirical gates.",
        "Verification decisions are permanently attributed to the human reviewer in the audit log.",
      ],
      confidenceCaveat:
        "Verification status is deterministic and policy-governed. It represents human sign-off, not an automated model score.",
    },
    troubleshooting: [
      {
        symptom: "Action buttons are disabled or display 'Read-Only'.",
        probableCause: "Active user account has the Employee role and lacks reviewer authorization.",
        verifiedRemedy: "Use the role selector in the top bar to switch to 'Reviewer' or 'Admin' for demo review tasks.",
      },
      {
        symptom: "Submitting decision shows an error banner.",
        probableCause: "The candidate skill record was modified or deleted in another session.",
        verifiedRemedy: "Refresh the page to reload the current verification queue.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Skill Passport Overview",
      nextStepAction: "View verified competencies reflected in the official capability profile.",
      targetRoute: "/app/passport",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Directly wired to VerificationDecision database models, role guards, and audit trail.",
    },
    relatedLinks: [
      { label: "Inspect Skill Passport", href: "/app/passport" },
      { label: "Open Human Review Queue", href: "/app/ai/review-queue" },
      { label: "Inspect Confidence & Uncertainty", href: "/app/ai/confidence" },
    ],
  },

  "confidence-uncertainty": {
    id: "confidence-uncertainty",
    title: "Confidence & Uncertainty Deconstruction",
    shortTitle: "Confidence & Uncertainty",
    canonicalRoute: "/app/ai/confidence",
    badgeLabel: "Calibrated Trust",
    iconName: "Percent",
    summary:
      "Confidence & Uncertainty breaks down trust into four distinct measurements: Extraction Confidence (NLP certainty), Evidence Strength (artifact rigor), Proficiency Estimate (rubric depth), and Verification State (policy authorization).",
    purpose:
      "To prevent the dangerous conflation of model statistical certainty with true workplace competence. It visualizes temporal freshness, evidence gaps, and uncertainty flags to show where claims remain tentative.",
    whenToUse: [
      "When evaluating why an AI model assigned a specific score to a candidate skill.",
      "To understand why a high-confidence claim still requires empirical verification.",
      "To check temporal decay (e.g. skills practiced 30 days ago vs stale 180+ days ago).",
      "To diagnose uncertainty flags such as collaborative attribution or single-source dependency.",
    ],
    prerequisites: [
      "Extracted candidate skills with confidence metrics.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review Deconstructed Trust Metrics",
        action: "Read the philosophy card distinguishing Extraction Confidence, Evidence Strength, Proficiency Estimate, and Verification State.",
        buttonOrPath: "Four Distinct Measurements card (/app/ai/confidence)",
        details: "Highlights why an online certificate with 99% NLP confidence is still low evidence strength.",
      },
      {
        stepNumber: 2,
        title: "Select Competency Claim",
        action: "Use search to locate a skill, then click to open its Confidence Breakdown.",
        buttonOrPath: "Claims list on left side",
        details: "Displays overall confidence score, verification status, and evidence item count.",
      },
      {
        stepNumber: 3,
        title: "Inspect Evidence Strength & Temporal Freshness",
        action: "Examine the Evidence Strength meter (Production > Capstone > Certificate > Self-claim) and freshness indicator.",
        buttonOrPath: "Evidence Strength & Recency panels",
        details: "Freshness monitors decay based on days elapsed since the latest corroborated deliverable.",
      },
      {
        stepNumber: 4,
        title: "Analyze Uncertainty Flags",
        action: "Read specific uncertainty reasons in the Uncertainty Analysis section.",
        buttonOrPath: "Uncertainty Flags list",
        details: "Flags alert users to attribution ambiguities, missing test coverage, or unverified pull request descriptions.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Candidate skill record with confidence and evidence link metadata.",
      ],
      outputArtifacts: [
        "Four-part calibrated trust breakdown",
        "Evidence strength rating (High, Moderate, Low)",
        "Temporal decay calculation",
        "Itemized uncertainty flags",
      ],
      originAndProcessing:
        "Computed from model output confidence combined with deterministic artifact weightings (git commits = high, documents = moderate, self-claims = low).",
      generatedVsPersisted:
        "Displays persisted confidence claim records from the backend.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Deconstructing a High-Confidence Certificate Claim",
      startingState: "A candidate uploads a course certificate for 'Machine Learning' and receives a 98% NLP extraction confidence.",
      actionTaken:
        "The reviewer opens /app/ai/confidence to inspect the claim. They look beyond the 98% number to examine the four measurements.",
      resultingOutcome:
        "Extraction Confidence is 98% (the OCR accurately read the text). However, Evidence Strength is rated 'Low' (Certificate only, no production commits). Proficiency Estimate is 'Foundational'. Verification State is 'Pending Review'. The reviewer concludes that the candidate has theoretical awareness but lacks demonstrated production competence.",
      inspectionGuide: "Look at the Evidence Strength card: it will display 'Low Rigor (Certificate)' alongside the 98% Extraction Confidence.",
      recoveryNote: "To raise Evidence Strength, upload a model training script or repository containing actual pipeline code.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "high_strength",
          badgeLabel: "High Evidence Strength",
          meaning: "Backed by merged production commits, pull requests, or deployed code.",
          nextAction: "Eligible for Practitioner or Advanced verification.",
        },
        {
          status: "moderate_strength",
          badgeLabel: "Moderate Evidence Strength",
          meaning: "Backed by architecture design documents, RFCs, or project specifications.",
          nextAction: "Substantiates conceptual and system design competencies.",
        },
        {
          status: "low_strength",
          badgeLabel: "Low Evidence Strength",
          meaning: "Backed only by course completion certificates or uncorroborated descriptions.",
          nextAction: "Requires practical work deliverables before verification.",
        },
      ],
      trustPrinciples: [
        "Confidence is an NLP recognition metric, NOT an evaluation of developer competence.",
        "Evidence strength is determined by artifact rigor, not model certainty.",
        "Uncertainty flags protect developers from being assigned responsibilities beyond their demonstrated scope.",
      ],
      confidenceCaveat:
        "SkillPassport never claims a confidence score is a calibrated probability of hiring success.",
    },
    troubleshooting: [
      {
        symptom: "Confidence score shows 0% or NaN.",
        probableCause: "The extraction model returned invalid numeric formatting for confidence.",
        verifiedRemedy: "Re-run AI Work Analysis. The system will apply the dynamic fallback score.",
      },
      {
        symptom: "Temporal freshness indicates 'Stale' for a recently completed skill.",
        probableCause: "The deliverable's date metadata was misparsed or reflects an old repository commit date.",
        verifiedRemedy: "Check the artifact date in Evidence Library. Update or upload a recent sprint deliverable.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Conflict Resolution",
      nextStepAction: "Reconcile competing claims between different artifacts or reviewers.",
      targetRoute: "/app/ai/conflicts",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Wired to backend/app/ai/verification_service.py and calibrated confidence models.",
    },
    relatedLinks: [
      { label: "Proceed to Conflict Resolution", href: "/app/ai/conflicts" },
      { label: "Inspect Verification Review", href: "/app/ai/verification" },
    ],
  },

  "conflict-resolution": {
    id: "conflict-resolution",
    title: "Evidence Conflict Resolution & Reconciliation",
    shortTitle: "Conflict Resolution",
    canonicalRoute: "/app/ai/conflicts",
    badgeLabel: "Side-by-Side Reconciliation",
    iconName: "GitCompare",
    summary:
      "Conflict Resolution reconciles contradictory claims, timeline discrepancies, and attribution disputes across work deliverables. It presents conflicting records side by side and provides an auditable workflow for authorized reviewers to establish authoritative truth.",
    purpose:
      "To eliminate contradictory evidence without silently discarding authentic work records. It ensures that when two deliverables disagree—such as conflicting commit authorships or disparate proficiency claims—a clear, auditable resolution is recorded.",
    whenToUse: [
      "When two deliverables claim conflicting roles on the same project (e.g. Lead Author vs Code Reviewer).",
      "When an older certificate contradicts a more recent production deliverable's proficiency level.",
      "To resolve timeline discrepancies across sprint deliverables.",
      "To review suggested resolutions proposed by the AI reconciliation engine.",
    ],
    prerequisites: [
      "At least one detected conflict record in the system (preloaded demo conflicts available).",
      "Reviewer or Admin authorization for binding resolutions (Employees can review and self-resolve where permitted).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Filter & Select Conflict Record",
        action: "Use status filters (ALL, OPEN, RESOLVED) and type filters (Attribution, Proficiency, Timeline) to pick a conflict.",
        buttonOrPath: "Conflict list on left panel (/app/ai/conflicts)",
        details: "Displays conflict title, severity (Critical, Moderate, Low), and affected skill.",
      },
      {
        stepNumber: 2,
        title: "Examine Side-by-Side Artifacts",
        action: "Inspect Artifact A on the left and Artifact B on the right.",
        buttonOrPath: "Side-by-side comparison cards",
        details: "Shows source title, external record SHA, timestamp, author attribution, and verbatim excerpt.",
      },
      {
        stepNumber: 3,
        title: "Review Suggested Resolution & Confidence",
        action: "Read the AI Suggested Resolution box and note the reconciliation confidence.",
        buttonOrPath: "Suggested Resolution callout card",
        details: "The system proposes a compromise or identifies the chronologically authoritative deliverable.",
      },
      {
        stepNumber: 4,
        title: "Select Resolution Outcome & Submit",
        action: "Choose an outcome (Accept A, Accept B, Split Attribution, Flag for Human Review), enter rationale, and click 'SUBMIT RESOLUTION'.",
        buttonOrPath: "Resolution radio options & SUBMIT RESOLUTION button",
        details: "Updates conflict status to 'resolved', logs a ReviewAuditEvent, and sends a governance notification.",
      },
    ],
    inputsAndOutputs: {
      requiredInputs: [
        "Conflict ID, chosen resolution decision ('accept_a', 'accept_b', 'split', 'escalate'), and resolution rationale.",
      ],
      outputArtifacts: [
        "Updated EvidenceConflictRecord with resolution_outcome in database",
        "Immutable ReviewAuditEvent logging actor, previous state, and rationale",
        "Governance notification dispatched",
      ],
      originAndProcessing:
        "Detected by conflict detection rules during evidence mapping, persisted in evidence_conflict_records table.",
      generatedVsPersisted:
        "The resolution outcome is permanently saved in the database with actor attribution.",
    },
    practicalExample: {
      title: "Illustrative Scenario: Resolving an Attribution Overlap on a Core Microservice",
      startingState: "Conflict #C-102: Artifact A claims 'Lead Author' for Auth Service, but Artifact B (Jira sprint log) lists the engineer as 'Code Reviewer'.",
      actionTaken:
        "The reviewer opens /app/ai/conflicts, inspects git commit history in Artifact A (showing 45 commits by candidate), and reviews Jira in Artifact B (showing reviewer on sprint ticket). The reviewer selects 'Split / Joint Attribution' and writes: 'Candidate authored code; sprint ticket designated dual lead/reviewer role'.",
      resultingOutcome:
        "The conflict transitions to 'Resolved'. The candidate retains author credit for the implementation while the ticket is noted as collaborative review. The audit log records the decision permanently.",
      inspectionGuide: "Filter conflicts by 'Resolved'; conflict #C-102 displays the resolution badge and rationale.",
      recoveryNote: "If new evidence surfaces later, an administrator can reopen the conflict from the audit log.",
    },
    interpretationAndTrust: {
      statusBadges: [
        {
          status: "open",
          badgeLabel: "Open Conflict",
          meaning: "Contradiction is unresolved; associated candidate skills are held in pending review.",
          nextAction: "Reviewer must inspect side-by-side evidence and submit resolution.",
        },
        {
          status: "resolved",
          badgeLabel: "Resolved",
          meaning: "Conflict has been reconciled with an auditable decision recorded.",
          nextAction: "Candidate skills proceed to Verification Review.",
        },
        {
          status: "critical",
          badgeLabel: "Critical Severity",
          meaning: "Direct authorship contradiction affecting core verified passport competency.",
          nextAction: "Prioritize immediate human triage.",
        },
      ],
      trustPrinciples: [
        "AI models must NEVER silently overwrite contradictory evidence; conflicts must be surfaced explicitly.",
        "Resolving a conflict records the rationale and actor identity; history is never erased.",
        "When in doubt, human reviewers split attribution or request corroborating deliverables.",
      ],
      confidenceCaveat:
        "The suggested resolution is an AI recommendation. It requires human reviewer confirmation before taking effect.",
    },
    troubleshooting: [
      {
        symptom: "Cannot click 'SUBMIT RESOLUTION' button.",
        probableCause: "No resolution decision option was selected or the rationale textarea is empty.",
        verifiedRemedy: "Select one of the resolution options (Accept A, Accept B, Split, Escalate) and provide a short note.",
      },
      {
        symptom: "Conflict was resolved but candidate skill remains 'Pending Review'.",
        probableCause: "Resolving a conflict clears the obstacle; the skill still requires formal Verification Review.",
        verifiedRemedy: "Navigate to Verification Review (/app/ai/verification) and submit the final approval decision.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Verification Review",
      nextStepAction: "Approve the reconciled skill in the official verification queue.",
      targetRoute: "/app/ai/verification",
    },
    implementationStatus: {
      state: "fully_implemented",
      notes: "Backed by EvidenceConflictRecord models, audit trails, and role-based resolution actions.",
    },
    relatedLinks: [
      { label: "Open Verification Review", href: "/app/ai/verification" },
      { label: "Inspect AI Overview", href: "/app/ai" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED WORKFLOWS (CROSS-FEATURE PATHWAYS A, B, C, D)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_GUIDED_WORKFLOWS: AIGuidedWorkflow[] = [
  {
    id: "workflow-work-to-candidate-skill",
    title: "Workflow A — From Raw Work Deliverable to Candidate Skill",
    summary:
      "A complete walkthrough showing how source code or an engineering document traverses AI Work Analysis, Fact Decomposition, Skill Extraction, and Evidence Mapping before reaching the Verification Queue.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Evidence Ingestion (Evidence Workspace)",
        route: "/app/evidence/upload",
        action: "Confirm that raw source code, repository commits, or design RFCs are indexed in the Evidence Library.",
        outcome: "Source artifact has a verifiable SHA-256 provenance hash and clean text excerpt.",
      },
      {
        phaseNumber: 2,
        featureTitle: "AI Work Analysis & Fact Decomposition",
        route: "/app/ai/work-analysis",
        action: "Select the deliverable and click 'RUN WORK ANALYSIS'.",
        outcome: "The model decomposes the work into Observed Facts, Inferred Attributes, Technical Tasks, and Demonstrated Skills.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Skill Extraction & Taxonomy Normalization",
        route: "/app/ai/skill-extraction",
        action: "Run an extraction pass to map extracted skills to canonical taxonomy terms and eliminate duplicate aliases.",
        outcome: "Candidate Skill records are created with taxonomy statuses ('canonical' or 'alias').",
      },
      {
        phaseNumber: 4,
        featureTitle: "Evidence Mapping Inspection",
        route: "/app/ai/evidence-mapping",
        action: "Inspect the exact source locus (file path, line range) and verbatim code snippet connecting the candidate to the artifact.",
        outcome: "Confirm the relationship is 'Direct Implementation' rather than an unverified self-claim.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Verification Review Authorization",
        route: "/app/ai/verification",
        action: "An authorized reviewer checks evidence gates (deliverable count, author attribution) and approves the skill.",
        outcome: "The candidate skill transitions to 'Verified' and appears on the official Skill Passport.",
      },
    ],
    keyTakeaway:
      "Connecting a repository or uploading a document does NOT automatically verify a skill. Every competency must pass through structured analysis, taxonomy mapping, citation auditing, and human verification review.",
  },

  {
    id: "workflow-understand-uncertain-claim",
    title: "Workflow B — Understanding and Resolving an Uncertain Claim",
    summary:
      "How to inspect an uncertain candidate skill, interpret uncertainty flags, deconstruct model confidence vs evidence strength, and take safe corrective action.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Identify Uncertainty Flag in Work Analysis",
        route: "/app/ai/work-analysis",
        action: "In AI Work Analysis, locate the 'Uncertainty Flags' card on the active artifact.",
        outcome: "Identifies specific uncertainty (e.g. 'Collaborative commit: author contribution percentage unconfirmed').",
      },
      {
        phaseNumber: 2,
        featureTitle: "Deconstruct Trust in Confidence & Uncertainty",
        route: "/app/ai/confidence",
        action: "Open the skill claim in Confidence & Uncertainty to inspect the four distinct measurements.",
        outcome: "Recognize that high Extraction Confidence (e.g. 95%) does not offset 'Moderate Evidence Strength' and 'Single Source Dependency'.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Inspect Original Locus in Evidence Library",
        route: "/app/evidence/library",
        action: "Navigate to the underlying evidence deliverable to inspect raw author attribution and commit logs.",
        outcome: "Confirm whether the user was the primary author or one of several collaborative contributors.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Corroborate with Secondary Deliverable",
        route: "/app/evidence/upload",
        action: "Upload an architectural design RFC or sprint ticket explicitly detailing individual contribution scope.",
        outcome: "Secondary evidence item corroborates the claim, resolving the uncertainty flag.",
      },
    ],
    keyTakeaway:
      "Never treat an AI confidence score as a substitute for source inspection. Uncertainty flags highlight genuine evidentiary ambiguities that require corroborating deliverables.",
  },

  {
    id: "workflow-review-unsupported-claim",
    title: "Workflow C — Reviewing and Quarantining an Unsupported Claim",
    summary:
      "How ungrounded claims, resume overclaims, or fabricated citation IDs are detected, blocked by Hallucination Guards, and handled through authorized review.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Detection by Hallucination Guard",
        route: "/app/ai/guard",
        action: "The system inspects candidate claims against underlying evidence items. Claims without valid citations are flagged.",
        outcome: "Status set to 'BLOCK' with reason 'No corroborating evidence ID found in library'.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Audit in Evidence Mapping Review",
        route: "/app/ai/evidence-mapping",
        action: "Open Evidence Mapping to inspect the flagged claim.",
        outcome: "The relationship displays 'Self-Reported Claim' with a red border and missing source locus.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Report Incorrect Mapping or Flag Insufficient",
        route: "/app/ai/evidence-mapping",
        action: "Click 'Report Incorrect Mapping' and explain that the deliverable contains no technical evidence for this claim.",
        outcome: "Audit event recorded: 'Mapping Flagged by Reviewer: Unsupported claim'.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Verification Review Decision",
        route: "/app/ai/verification",
        action: "In Verification Review, the reviewer marks the claim as 'Insufficient Evidence' or 'Reject Claim'.",
        outcome: "The ungrounded claim is excluded from the candidate's Skill Passport without contaminating verified ratings.",
      },
    ],
    keyTakeaway:
      "SkillPassport's multi-layered defense guarantees that ungrounded resume claims and hallucinated AI predictions are caught before they can ever become verified credentials.",
  },

  {
    id: "workflow-resolve-genuine-conflict",
    title: "Workflow D — Reconciling Genuine Evidence Conflicts",
    summary:
      "A systematic procedure for locating conflicting evidence records, inspecting side-by-side sources, executing an authorized resolution, and confirming the persisted audit trail.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Locate Open Conflict in AI Overview",
        route: "/app/ai",
        action: "Check the 'Open Conflicts' metric card and click through to Conflict Resolution.",
        outcome: "Navigates directly to the Conflict Resolution workspace.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Side-by-Side Artifact Audit",
        route: "/app/ai/conflicts",
        action: "Select the conflict and examine Artifact A on the left against Artifact B on the right.",
        outcome: "Identify the root cause: attribution dispute, proficiency contradiction, or timeline discrepancy.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Evaluate AI Suggested Resolution",
        action: "Read the system's suggested resolution and consider whether chronological or source authority applies.",
        route: "/app/ai/conflicts",
        outcome: "Suggested compromise evaluated by human reviewer.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Submit Authorized Resolution",
        route: "/app/ai/conflicts",
        action: "Select an outcome (Accept A, Accept B, Split Attribution, Escalate), provide a rationale note, and click 'SUBMIT RESOLUTION'.",
        outcome: "Conflict status transitions to 'Resolved'. An immutable ReviewAuditEvent is recorded.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Verify Downstream Queue Clearance",
        route: "/app/ai/verification",
        action: "Return to Verification Review to confirm the reconciled candidate skill is now unblocked for final approval.",
        outcome: "The skill can now be verified cleanly without ambiguity.",
      },
    ],
    keyTakeaway:
      "Conflicts must never be silently resolved by an AI model. They require explicit human deliberation, recorded rationale, and an immutable audit trail.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY & TRUST DISTINCTIONS (14 TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const AI_CONCEPTUAL_GLOSSARY: AIGlossaryTerm[] = [
  {
    term: "Source Content",
    definition:
      "The raw, unmodified text, code diff, commit message, or document content extracted directly from a connected provider (GitHub, Jira) or user-uploaded file.",
    context:
      "Source content represents the empirical foundation. An AI model can only analyze what exists in source content.",
    relatedRoute: "/app/evidence/library",
    relatedRouteLabel: "Inspect Evidence Library",
  },
  {
    term: "Observed Fact",
    definition:
      "A direct, verifiable fact extracted from source content without interpretation (e.g. 'Modified 14 files in backend/auth.py', 'Added PostgreSQL connection pooler').",
    context:
      "Decomposed in AI Work Analysis to separate ground truth from author claims and model deductions.",
    relatedRoute: "/app/ai/work-analysis",
    relatedRouteLabel: "View Observed Facts",
  },
  {
    term: "Claimed Information",
    definition:
      "Self-reported statements made by a user in pull request summaries, ticket comments, or resumes that cannot be independently confirmed from code alone.",
    context:
      "Treated as tentative claims that require corroboration by code artifacts before they can substantiate a competency.",
    relatedRoute: "/app/ai/work-analysis",
    relatedRouteLabel: "Inspect Claimed Information",
  },
  {
    term: "Inferred Attribute",
    definition:
      "A technical deduction made by the AI model based on observed facts (e.g. 'System complexity: High', 'Follows Twelve-Factor App methodology').",
    context:
      "Every inferred attribute must cite supporting observed facts to prevent hallucinated deductions.",
    relatedRoute: "/app/ai/work-analysis",
    relatedRouteLabel: "Inspect Inferred Attributes",
  },
  {
    term: "Candidate Skill",
    definition:
      "A proposed competency inferred by the AI extractor from work deliverables. A candidate skill is a hypothesis awaiting verification, NOT a verified accomplishment.",
    context:
      "Stored in 'candidate' review state. Candidate skills are never displayed on public recruiter passports.",
    relatedRoute: "/app/ai/skill-extraction",
    relatedRouteLabel: "Inspect Candidate Skills",
  },
  {
    term: "Evidence-Supported Skill Signal",
    definition:
      "A candidate skill that has been linked to at least one authentic, verified source locus (file path, commit SHA, or design document excerpt) via Evidence Mapping.",
    context:
      "Elevates a raw candidate skill into a verifiable signal ready for human verification review.",
    relatedRoute: "/app/ai/evidence-mapping",
    relatedRouteLabel: "Inspect Evidence Mappings",
  },
  {
    term: "Verified Skill",
    definition:
      "An authoritative competency credential that has satisfied all empirical evidence gates under Policy v2026.1 and received sign-off from an authorized human reviewer.",
    context:
      "The only competency status that contributes to official Skill Passport scores and recruiter-facing capability profiles.",
    relatedRoute: "/app/passport",
    relatedRouteLabel: "View Verified Skills",
  },
  {
    term: "Extraction Confidence",
    definition:
      "A statistical metric (0-100%) indicating how certain the NLP model is that it correctly identified and categorized tokens in the text.",
    context:
      "Measures NLP reading certainty, NOT candidate workplace competence. A 99% extraction confidence on an unverified resume is still 0% verified proof.",
    relatedRoute: "/app/ai/confidence",
    relatedRouteLabel: "Inspect Confidence Engine",
  },
  {
    term: "Evidence Strength",
    definition:
      "The evidentiary rigor of the underlying artifact: Production Commits > Capstone Specs > Industry Certifications > Self-Reported Claims.",
    context:
      "Determines the maximum allowable proficiency level a deliverable can substantiate.",
    relatedRoute: "/app/ai/confidence",
    relatedRouteLabel: "View Evidence Strength",
  },
  {
    term: "Uncertainty Flag",
    definition:
      "An explicit warning generated during analysis highlighting gaps such as collaborative attribution ambiguity, missing test files, or indirect documentation.",
    context:
      "Serves as a safety guard protecting candidates and employers from ungrounded overclaims.",
    relatedRoute: "/app/ai/work-analysis",
    relatedRouteLabel: "View Uncertainty Flags",
  },
  {
    term: "Taxonomy Normalization & Alias Resolution",
    definition:
      "The process of mapping diverse technology keywords (e.g. 'k8s', 'kube', 'kubernetes-cluster') into a single canonical competency ('Kubernetes') while eliminating duplicates.",
    context:
      "Prevents resume buzzword inflation and ensures fair talent evaluation.",
    relatedRoute: "/app/ai/skill-extraction",
    relatedRouteLabel: "Inspect Taxonomy Statuses",
  },
  {
    term: "Hallucination Guard",
    definition:
      "A specialized Trust & Governance validation layer that scans candidate claims and blocks any that lack verified evidence IDs or cite nonexistent source loci.",
    context:
      "Quarantines fabricated claims before they can reach the human review queue.",
    relatedRoute: "/app/ai/guard",
    relatedRouteLabel: "Open Hallucination Guard",
  },
  {
    term: "Deterministic Rule-Based Fallback",
    definition:
      "A built-in heuristic parsing engine that automatically executes if the local Ollama LLM service is offline or times out.",
    context:
      "Ensures the Skill Passport pipeline never breaks when local model resources are constrained, labeling results transparently as 'Rule-based Engine'.",
    relatedRoute: "/app/ai/work-analysis",
    relatedRouteLabel: "Inspect Fallback Behavior",
  },
  {
    term: "Evidence Conflict",
    definition:
      "A detected contradiction between two deliverables, such as conflicting role attributions, timeline overlaps, or opposing proficiency levels.",
    context:
      "Surfaced in Conflict Resolution for side-by-side reconciliation by an authorized human reviewer.",
    relatedRoute: "/app/ai/conflicts",
    relatedRouteLabel: "Open Conflict Resolution",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific AI Intelligence help topic.
 * Falls back to 'ai-overview' for non-specific AI routes.
 */
export function getAIHelpTopicIdFromPathname(pathname: string): AIHelpTopicId {
  if (!pathname) return "ai-overview";

  const clean = pathname.toLowerCase();

  if (clean.startsWith("/app/ai/work-analysis")) {
    return "ai-work-analysis";
  }
  if (clean.startsWith("/app/ai/skill-extraction")) {
    return "skill-extraction";
  }
  if (clean.startsWith("/app/ai/evidence-mapping")) {
    return "evidence-mapping";
  }
  if (clean.startsWith("/app/ai/verification")) {
    return "verification-review";
  }
  if (clean.startsWith("/app/ai/confidence")) {
    return "confidence-uncertainty";
  }
  if (clean.startsWith("/app/ai/conflicts")) {
    return "conflict-resolution";
  }
  if (clean === "/app/ai" || clean.startsWith("/app/ai?")) {
    return "ai-overview";
  }

  // Default fallback
  return "ai-overview";
}
