/**
 * Skill Intelligence Product Help & Conceptual Guidance Data Catalog
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 6 Skill Intelligence features, 4 guided workflows, and core skill trust distinctions.
 */

export type SkillHelpTopicId =
  | "overview"
  | "verified-skills"
  | "skill-explorer"
  | "taxonomy-ontology"
  | "candidate-review"
  | "evidence-coverage"
  | "skill-history"
  | "workflows"
  | "glossary";

export interface SkillStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface SkillConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface SkillStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface SkillTroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface SkillHelpTopic {
  id: SkillHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  requiredRole: "All Roles (Employee, Reviewer, Admin)" | "Reviewer or Admin" | "Administrator Only";
  iconName: "ShieldCheck" | "Search" | "Network" | "CheckCircle2" | "FileCheck2" | "History" | "Award" | "BookOpen";
  summary: string;
  purpose: string; // What this feature does
  whenToUse: string[]; // When should I use it?
  whoCanUse: string; // Who can use it?
  prerequisites: string[]; // What must be available before starting?
  stepByStep: SkillStepInstruction[]; // Numbered instructions using actual UI controls
  practicalExample: SkillConcreteExample; // Realistic illustrative scenario
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  understandingStatus: {
    statusBadges: SkillStatusDefinition[];
    trustPrinciples: string[];
    skillTrustCaveat: string;
  };
  troubleshooting: SkillTroubleshootingItem[]; // What can go wrong and how to recover
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

export interface SkillGuidedWorkflow {
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

export interface SkillGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOPIC GUIDES FOR ALL 6 SKILL INTELLIGENCE FEATURES + OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_HELP_TOPICS: Record<Exclude<SkillHelpTopicId, "workflows" | "glossary">, SkillHelpTopic> = {
  overview: {
    id: "overview",
    title: "Skill Intelligence & Passport Architecture Overview",
    shortTitle: "Overview",
    canonicalRoute: "/app/passport",
    badgeLabel: "Domain 2 · Overview",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Award",
    summary:
      "Skill Intelligence represents the authoritative competency core of Skill Passport. It transforms raw workplace artifacts into canonical, verified skills backed by attributable evidence, structured taxonomies, and immutable audit logs.",
    purpose:
      "Skill Intelligence provides a tamper-evident, evidence-grounded record of an engineer's demonstrable capabilities. Rather than relying on self-reported resume bullets or unverified AI keyword extracts, Skill Intelligence enforces strict separation between provisional candidates and verified competencies, connects skills to original source code and commits, calibrates proficiency against 5-tier rubrics, and records every status change in an audit history.",
    whenToUse: [
      "When reviewing your verified competency portfolio for performance evaluations, promotion packets, or external sharing.",
      "When browsing the standardized organizational taxonomy to identify prerequisite skills and growth pathways.",
      "When reviewing provisional candidate skills extracted by the AI analysis pipeline to promote or reject them.",
      "When analyzing evidence coverage health to identify skills lacking multi-source corroboration.",
      "When auditing historical competency changes, reviewer approvals, or proficiency upgrades over time.",
    ],
    whoCanUse:
      "Available to all users. Employees can view their own verified skills, browse the taxonomy, and track evidence coverage. Reviewers and Admins can additionally adjudicate candidate reviews and approve verification decisions.",
    prerequisites: [
      "An active Skill Passport account with an authenticated session.",
      "Connected workplace work sources (e.g. GitHub repositories, Jira issues, technical documents) ingested via Evidence Workspace.",
      "Active competency taxonomy catalog loaded in the backend database.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Passport Overview",
        action: "Navigate to the main Skill Passport dashboard.",
        buttonOrPath: "Sidebar → Passport Overview (/app/passport)",
        details:
          "Inspect your high-level Individual Capability Record, total verified count, candidate queue tally, and recent capability highlights.",
      },
      {
        stepNumber: 2,
        title: "Explore the Skill Catalog",
        action: "Browse recognized competencies and taxonomy domains.",
        buttonOrPath: "Click 'EXPLORE SKILLS' or Sidebar → Skill Explorer (/app/passport/explorer)",
        details:
          "Search across canonical terms, switch between Grid and Table views, and filter by category, verification state, or evidence coverage health.",
      },
      {
        stepNumber: 3,
        title: "Review Provisional Candidates",
        action: "Adjudicate AI-extracted skill suggestions.",
        buttonOrPath: "Click 'REVIEW CANDIDATES' or Sidebar → Candidate Review (/app/passport/candidates)",
        details:
          "Inspect model extraction rationale and linked deliverables. Confirm promotion to verified status, flag as incorrect, or mark as having insufficient evidence.",
      },
      {
        stepNumber: 4,
        title: "Inspect Evidence Coverage",
        action: "Analyze artifact corroboration and health percentages.",
        buttonOrPath: "Click 'VIEW EVIDENCE COVERAGE' or Sidebar → Evidence Coverage (/app/passport/coverage)",
        details:
          "Review the multi-segment progress bar (Sufficient, Incomplete, Insufficient, Conflicting) and follow recommended actions to resolve deficits.",
      },
      {
        stepNumber: 5,
        title: "Audit Skill Evolution",
        action: "Inspect chronological audit events and state transitions.",
        buttonOrPath: "Sidebar → Skill History (/app/passport/history)",
        details:
          "Review timeline cards displaying actor attribution, previous states, new values, substantiating rationales, and linked deliverables.",
      },
    ],
    practicalExample: {
      title: "Illustrative Talent Intelligence Flow: From Git Ingestion to Verified Passport",
      startingState:
        "An engineer connects a GitHub repository with 14 merged pull requests containing FastAPI backend microservices and Docker configurations.",
      actionTaken:
        "The engineer runs AI Work Analysis in Domain 3, which extracts provisional candidates 'FastAPI' and 'Docker'. The engineer navigates to Candidate Review (/app/passport/candidates) and reviews the corroborating commit artifacts.",
      resultingOutcome:
        "The reviewer clicks 'Confirm & Promote to Verified' with rationale 'Demonstrated production REST endpoints with schema validation'. The skill moves to Verified Skills (/app/passport/skills), and an audit record is logged in Skill History (/app/passport/history).",
      inspectionGuide:
        "Visit /app/passport/skills to see the green 'Verified' badge, then open /app/passport/history to inspect the transition event showing 'Candidate -> Verified (Level: Practitioner)'.",
      recoveryNote:
        "If a candidate lacks sufficient commits, clicking 'Insufficient Evidence' keeps the candidate in quarantine until additional repositories are connected.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Authenticated user profile (id, email, display name).",
        "Persisted evidence deliverables in evidence_items table.",
        "Canonical taxonomy records in competency_taxonomies table.",
        "Candidate mappings in evidence_competency_mappings table.",
      ],
      outputArtifacts: [
        "Aggregated capability profile with verified competency list.",
        "Coverage health metrics (percentage, counts by state).",
        "Candidate review queue with adjudication actions.",
        "Chronological audit trail of skill state transitions.",
      ],
      originAndProcessing:
        "GET /api/passport/skills, GET /api/passport/candidates, GET /api/passport/coverage, and GET /api/passport/history query PostgreSQL via SQLAlchemy, aggregating persisted mappings and verification decisions with zero mock data.",
      generatedVsPersisted:
        "Taxonomy competencies, evidence items, candidate mappings, verification decisions, and audit events are permanently persisted in PostgreSQL. Coverage percentages and health scores are deterministically calculated on fetch.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verified",
          badgeLabel: "Verified Competency",
          meaning: "Fully backed by attributable workplace artifacts, validated against taxonomy rubrics, and authoritatively approved.",
          nextAction: "Eligible for passport export, recruiter sharing, and career role matching.",
        },
        {
          status: "candidate",
          badgeLabel: "Candidate In Review",
          meaning: "Provisional skill extracted by AI pipeline models awaiting human inspection and adjudication.",
          nextAction: "Navigate to Candidate Review (/app/passport/candidates) to promote, reject, or request more evidence.",
        },
        {
          status: "insufficient_evidence",
          badgeLabel: "Insufficient Evidence",
          meaning: "Competency was flagged during review as lacking sufficient corroborating code deliverables.",
          nextAction: "Connect additional repositories or upload technical reports in Evidence Center.",
        },
        {
          status: "conflicting",
          badgeLabel: "Conflicting Attributions",
          meaning: "Contradictory author attributions or conflicting proficiency claims detected across evidence sources.",
          nextAction: "Open Conflict Resolution (/app/ai/conflicts) to resolve discrepancies.",
        },
      ],
      trustPrinciples: [
        "Zero Presumption: A skill is never verified solely because an LLM extracted it with high confidence.",
        "Attributable Provenance: Every verified skill must trace directly to original code, documents, or commits.",
        "Standardized Taxonomy: Competencies map to normalized canonical standards to prevent keyword proliferation.",
        "Immutable Audit: All promotions, rejections, and proficiency changes are logged with actor attribution.",
      ],
      skillTrustCaveat:
        "Skill Intelligence does not evaluate hypothetical knowledge. It measures demonstrable execution captured in auditable work deliverables.",
    },
    troubleshooting: [
      {
        symptom: "Passport Overview displays 0 verified skills despite connecting repositories.",
        probableCause: "AI extraction produces candidate skills first; they do not automatically become verified without review.",
        verifiedRemedy: "Navigate to Candidate Review (/app/passport/candidates) and click 'Confirm & Promote to Verified' on qualified items.",
      },
      {
        symptom: "A competency appears with a 'Conflicting' badge.",
        probableCause: "An open record exists in evidence_conflict_records where multiple sources assert contradictory claims.",
        verifiedRemedy: "Navigate to Conflict Resolution (/app/ai/conflicts) to adjudicate the conflict before proceeding.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Verified Skills Profile",
      nextStepAction: "Inspect your verified competencies and linked evidence artifacts.",
      targetRoute: "/app/passport/skills",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "The Skill Intelligence domain is fully backed by live PostgreSQL tables and REST endpoints in backend/app/api/passport.py.",
    },
    relatedLinks: [
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Evidence Coverage", href: "/app/passport/coverage" },
      { label: "Evidence Center", href: "/app/evidence" },
    ],
  },

  "verified-skills": {
    id: "verified-skills",
    title: "Verified Competencies & Capability Profile",
    shortTitle: "Verified Skills",
    canonicalRoute: "/app/passport/skills",
    badgeLabel: "Domain 2 · Verified Skills",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "ShieldCheck",
    summary:
      "Displays only competencies grounded in auditable, attributable workplace artifacts that have met formal verification thresholds. Unverified AI extracts remain strictly quarantined in Candidate Review.",
    purpose:
      "Verified Skills is the authoritative credential presentation layer of Skill Passport. It provides an unpolluted, trustworthy view of an engineer's validated capabilities. Each entry shows canonical name, category, verified proficiency level, extraction confidence, definition, linked evidence items, assessment rationale, and scope boundaries.",
    whenToUse: [
      "When compiling verified capability summaries for engineering lead reviews, performance evaluations, or promotions.",
      "When generating a verified skill passport export for recruiters or hiring managers.",
      "When inspecting the specific source deliverables (PRs, commits, architecture docs) substantiating a competency.",
      "When checking the proficiency level (Working, Practitioner, Advanced, Expert) assigned to your verified skills.",
    ],
    whoCanUse:
      "Available to all users. Employees can view their own verified competencies. Reviewers and Admins can inspect verified skills across their teams.",
    prerequisites: [
      "At least one candidate skill must have been promoted via Candidate Review (/app/passport/candidates) or verified by an authorized reviewer.",
      "Persisted supporting deliverables in evidence_items linked via evidence_competency_mappings.",
      "Zero unresolved conflicts locking the competency.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Verified Skills",
        action: "Navigate to the Verified Skills screen.",
        buttonOrPath: "Sidebar → Verified Skills (/app/passport/skills)",
        details:
          "Review the top stat ribbon displaying Verified Skills count, Linked Artifacts, Top Proficiency, and Average Extraction Confidence.",
      },
      {
        stepNumber: 2,
        title: "Filter by Keyword, Category, or Level",
        action: "Locate specific technical competencies.",
        buttonOrPath: "Search input, 'Category:' dropdown, or 'Proficiency:' dropdown",
        details:
          "Type in search terms (e.g. 'PostgreSQL', 'FastAPI') or filter by level (Working, Practitioner, Advanced, Expert) to narrow the list.",
      },
      {
        stepNumber: 3,
        title: "Inspect Linked Evidence Artifacts",
        action: "Audit the source material proving the skill.",
        buttonOrPath: "Click any linked deliverable item in the 'Linked Evidence' section",
        details:
          "Opens the Evidence Detail view (/app/evidence/[id]) showing raw commit text, author attribution, PR metadata, and observed timestamp.",
      },
      {
        stepNumber: 4,
        title: "View Evidence Map & Rubric",
        action: "Explore detailed corroboration or evaluation rubrics.",
        buttonOrPath: "Click 'Evidence Map' or 'Rubric' button on any skill card",
        details:
          "'Evidence Map' opens /app/passport/skills/[id]/evidence. 'Rubric' opens /app/passport/skills/[id]/proficiency to review 5-tier qualification criteria.",
      },
      {
        stepNumber: 5,
        title: "Inspect Full Skill Profile",
        action: "Open the deep-dive competency profile.",
        buttonOrPath: "Click 'Inspect Profile →' (/app/passport/skills/[id])",
        details:
          "Review comprehensive assessment rationale, prerequisite competencies, related skills, and full corroboration timeline.",
      },
    ],
    practicalExample: {
      title: "Illustrative Verified Competency: Python & FastAPI Backend Engineering",
      startingState:
        "The engineer previously authored pull request #42 in repository 'growthlens-core', implementing async JWT authentication and Pydantic request models. The candidate review was approved with Practitioner rating.",
      actionTaken:
        "The user navigates to /app/passport/skills and selects 'Python Engineering'. They inspect the 'Linked Evidence (2)' section and click the commit artifact link.",
      resultingOutcome:
        "The user sees the green 'Verified' badge, 'Practitioner' proficiency badge, '92% Extraction Confidence', and read-only rationale: 'Engineered production async API endpoints with SQLAlchemy session pool management'.",
      inspectionGuide:
        "Notice the 'Evidence Map' link at the bottom of the card. Clicking it navigates to /app/passport/skills/skill-python/evidence to visualize every artifact supporting the competency.",
      recoveryNote:
        "If a verified skill appears missing from this page, check Candidate Review (/app/passport/candidates); unreviewed skills never appear here.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Authenticated user UUID.",
        "EvidenceCompetencyMapping records with status == 'verified'.",
        "Linked EvidenceItem records (is_deleted == False).",
        "CompetencyTaxonomy canonical definitions.",
      ],
      outputArtifacts: [
        "Verified skill cards with badges (Verification, Proficiency, Coverage, Confidence).",
        "Summary metrics: verified count, total linked artifacts, highest verified tier, average confidence.",
        "Interactive navigation to Evidence Detail, Evidence Map, Rubric, and Skill Profile.",
      ],
      originAndProcessing:
        "GET /api/passport/skills performs a multi-table join across evidence_competency_mappings, competency_taxonomies, and evidence_items, cross-referencing verification_decisions and evidence_conflict_records.",
      generatedVsPersisted:
        "All verified statuses, proficiency levels, and rationales are persisted in PostgreSQL. The list excludes candidate or rejected mappings.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verified",
          badgeLabel: "VERIFIED",
          meaning: "Accredited competency grounded in verified deliverables and authorized review.",
          nextAction: "Ready for inclusion in exportable skill credentials.",
        },
        {
          status: "practitioner",
          badgeLabel: "PRACTITIONER",
          meaning: "Designs, implements, and debugs independent production features, microservices, or data pipelines.",
          nextAction: "Advance to Advanced tier by leading peer reviews and distributed architecture.",
        },
        {
          status: "working",
          badgeLabel: "WORKING",
          meaning: "Applies standard syntax, library patterns, and configurations under supervised engineering review.",
          nextAction: "Contribute independent feature pull requests to progress to Practitioner.",
        },
      ],
      trustPrinciples: [
        "Human Authorization Invariant: Model extractions remain provisional until an authorized human or deterministic gate affirms them.",
        "Evidence Anchoring: Every verified skill displays direct links to original deliverables with observed timestamps.",
        "Scope Boundaries: Cards explicitly document technical boundaries (e.g. 'Focuses on backend async services; excludes frontend React state').",
      ],
      skillTrustCaveat:
        "A verified skill badge does not certify that the engineer knows every aspect of a technology; it certifies demonstrable execution within the scope of the attached artifacts.",
    },
    troubleshooting: [
      {
        symptom: "A skill was approved in Candidate Review but is not appearing in Verified Skills.",
        probableCause: "Active search or category filter is hiding the item, or an open conflict was subsequently logged.",
        verifiedRemedy: "Clear the search input, reset Category and Proficiency dropdowns to 'All', and check /app/ai/conflicts.",
      },
      {
        symptom: "Clicking a linked evidence item returns 'Evidence Not Found'.",
        probableCause: "The underlying repository was disconnected or the artifact was soft-deleted.",
        verifiedRemedy: "Verify connected sources in /app/evidence/sources and run ingestion to refresh artifact links.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Evidence Coverage Analysis",
      nextStepAction: "Evaluate whether your verified skills have sufficient multi-source corroboration.",
      targetRoute: "/app/passport/coverage",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully operational. Filters and metric aggregations operate in real-time on persisted backend records.",
    },
    relatedLinks: [
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Skill Explorer", href: "/app/passport/explorer" },
      { label: "Evidence Coverage", href: "/app/passport/coverage" },
      { label: "Skill History", href: "/app/passport/history" },
    ],
  },

  "skill-explorer": {
    id: "skill-explorer",
    title: "Skill Explorer & Universal Catalog",
    shortTitle: "Skill Explorer",
    canonicalRoute: "/app/passport/explorer",
    badgeLabel: "Domain 2 · Competency Catalog",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Search",
    summary:
      "Universal catalog search across all competencies recognized in the canonical taxonomy. Inspect verification status, evidence backing, and coverage health across your personal portfolio.",
    purpose:
      "Skill Explorer provides a unified browsing experience that bridges the standardized taxonomy catalog with an individual's personal skill records. Users can toggle between Grid and Table views, search across canonical names and synonyms, filter by category and verification status, and quickly spot coverage deficits.",
    whenToUse: [
      "When searching for a specific competency to see if you have evidence or candidate claims recorded.",
      "When exploring the broader organizational catalog to understand required skills in adjacent disciplines.",
      "When identifying skills in your portfolio that have coverage deficits requiring additional artifacts.",
      "When preferring a tabular overview (Table View) for high-density portfolio scanning.",
    ],
    whoCanUse:
      "Available to all users. Employees explore their own competency portfolio against the catalog. Reviewers and Admins can explore organizational standards.",
    prerequisites: [
      "Active taxonomy catalog in the backend database.",
      "Authenticated user session.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Skill Explorer",
        action: "Navigate to the universal catalog.",
        buttonOrPath: "Sidebar → Skill Explorer (/app/passport/explorer)",
        details:
          "Inspect the Overview Stat Ribbon: Total Cataloged, Verified In Passport, Candidates In Review, and Coverage Deficits.",
      },
      {
        stepNumber: 2,
        title: "Toggle Layout Mode",
        action: "Switch between visual cards and compact table.",
        buttonOrPath: "Click Grid Icon or List/Table Icon in the top header",
        details:
          "Grid View shows detailed cards with badges and definition excerpts; Table View provides a compact, sortable matrix.",
      },
      {
        stepNumber: 3,
        title: "Search Across Names and Aliases",
        action: "Enter a search term in the filter bar.",
        buttonOrPath: "Search input ('Search by skill name, alias, or discipline...')",
        details:
          "Search matches canonical names (e.g. 'Python Engineering'), definitions, and normalized aliases (e.g. 'AsyncIO', 'FastAPI').",
      },
      {
        stepNumber: 4,
        title: "Filter by Verification & Coverage Health",
        action: "Filter by specific portfolio lifecycle states.",
        buttonOrPath: "Category, Verification, and Coverage dropdowns",
        details:
          "Filter by Verification ('All', 'verified', 'candidate') or Coverage ('All', 'sufficient', 'incomplete', 'insufficient').",
      },
      {
        stepNumber: 5,
        title: "Drill Into Skill Detail",
        action: "Navigate to specific competency views.",
        buttonOrPath: "Click 'View Profile →' on any card or table row",
        details:
          "Opens the competency detail page (/app/passport/skills/[id]) with prerequisite graphs and corroboration evidence.",
      },
    ],
    practicalExample: {
      title: "Illustrative Search: Locating 'Docker' Competency in the Catalog",
      startingState:
        "An engineer wants to know if their Docker work is cataloged and what verification state it currently holds.",
      actionTaken:
        "The user opens /app/passport/explorer, types 'Docker' in the search bar, and switches to Table View.",
      resultingOutcome:
        "The catalog filters to 'Docker & Containerization' showing status 'Candidate', coverage state 'Incomplete', and '1 Linked Artifact'.",
      inspectionGuide:
        "The user clicks 'View Taxonomy' in the header (/app/passport/taxonomy) to see how Docker relates to Kubernetes and Cloud Infrastructure.",
      recoveryNote:
        "If a search yields 'No matching competencies found', check spelling or navigate to Taxonomy & Ontology to browse all category trees.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Search query string (optional).",
        "Category, VerificationState, and CoverageState filter selections.",
        "User's tracked skills from EvidenceContext.",
      ],
      outputArtifacts: [
        "Filtered list of SkillItems in Grid or Table format.",
        "Stat ribbon: total cataloged, verified count, candidate count, deficit count.",
        "Direct navigation links to Taxonomy (/app/passport/taxonomy) and Skill Details.",
      ],
      originAndProcessing:
        "Renders client-side from the skills state in EvidenceContext, which is populated by GET /api/passport/skills from the backend database.",
      generatedVsPersisted:
        "Skill catalog entries and user mappings are persisted in PostgreSQL. Filter states and view modes are managed locally in React state.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verified",
          badgeLabel: "Verified",
          meaning: "Competency is formally verified with attributable workplace deliverables.",
          nextAction: "View in Verified Skills (/app/passport/skills).",
        },
        {
          status: "candidate",
          badgeLabel: "Candidate",
          meaning: "Provisional skill extracted by AI awaiting human review.",
          nextAction: "Adjudicate in Candidate Review (/app/passport/candidates).",
        },
        {
          status: "insufficient",
          badgeLabel: "Coverage Deficit",
          meaning: "Competency has weak or incomplete evidence backing.",
          nextAction: "Inspect Evidence Coverage (/app/passport/coverage).",
        },
      ],
      trustPrinciples: [
        "Catalog vs Possession: Viewing a skill in Explorer does not grant or imply verified ownership.",
        "Dual Lifecycle Visibility: Clearly separates catalog metadata (canonical definitions) from individual portfolio states.",
      ],
      skillTrustCaveat:
        "Skill Explorer is a discovery and inventory tool. It does not perform verification or mutate skill records.",
    },
    troubleshooting: [
      {
        symptom: "Search returns no results for a common technology (e.g. 'NumPy').",
        probableCause: "The technology is an alias rather than a top-level canonical competency.",
        verifiedRemedy: "Search for the parent competency (e.g. 'Data Analysis') or check Taxonomy & Ontology to inspect alias mappings.",
      },
      {
        symptom: "Table View appears cramped on small screens.",
        probableCause: "High-density table format requires sufficient viewport width.",
        verifiedRemedy: "Click the Grid Icon in the header to switch to responsive card layout.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Taxonomy & Ontology",
      nextStepAction: "Inspect domain categorization, prerequisite graphs, and alias normalization.",
      targetRoute: "/app/passport/taxonomy",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with seamless Grid/Table switching and live multi-attribute filtering.",
    },
    relatedLinks: [
      { label: "Taxonomy & Ontology", href: "/app/passport/taxonomy" },
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Evidence Coverage", href: "/app/passport/coverage" },
    ],
  },

  "taxonomy-ontology": {
    id: "taxonomy-ontology",
    title: "Skill Taxonomy & Graph Ontology",
    shortTitle: "Taxonomy & Ontology",
    canonicalRoute: "/app/passport/taxonomy",
    badgeLabel: "Domain 2 · Graph Ontology",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Network",
    summary:
      "The canonical schema and graph ontology ensuring uniform skill definitions, alias normalization, prerequisite dependency mapping, and deterministic calibration rubrics.",
    purpose:
      "Taxonomy & Ontology establishes the single source of truth for all skills recognized across Skill Passport. It prevents taxonomy fragmentation by automatically normalizing raw keyword variations (e.g. 'Python3', 'AsyncIO') to canonical standards (e.g. 'Python Engineering'), defining prerequisite dependency graphs, and binding each skill to an objective 5-tier proficiency rubric.",
    whenToUse: [
      "When you need to understand how an extracted technical term maps to a canonical skill concept.",
      "When reviewing prerequisite skill requirements for advanced competencies (e.g. Machine Learning requiring Python foundations).",
      "When inspecting the objective 5-tier evaluation rubric (Foundation, Working, Practitioner, Advanced, Expert) for a skill.",
      "When browsing the standardized domain taxonomy by engineering discipline.",
    ],
    whoCanUse:
      "Available to all users for browsing and inspection. Only Administrators can modify canonical taxonomy records or create new ontology categories.",
    prerequisites: [
      "CompetencyTaxonomy table populated in the database (loaded with active version taxonomy).",
      "Authenticated session.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Taxonomy & Ontology",
        action: "Navigate to the taxonomy browser.",
        buttonOrPath: "Sidebar → Taxonomy & Ontology (/app/passport/taxonomy)",
        details:
          "Review the Ontology Principles Card: Alias Normalization, Prerequisite Graphs, and Deterministic Calibration.",
      },
      {
        stepNumber: 2,
        title: "Select a Taxonomy Domain",
        action: "Choose an engineering category from the left sidebar.",
        buttonOrPath: "Left Column: Category buttons (e.g. 'Software Engineering', 'Data & AI', 'Cloud & DevOps')",
        details:
          "Clicking a category filters the right pane to display the Domain Specification and all member competencies.",
      },
      {
        stepNumber: 3,
        title: "Search Canonical Terms and Aliases",
        action: "Search across all domains simultaneously.",
        buttonOrPath: "Search input ('Search taxonomy by canonical term, synonym, alias, or discipline...')",
        details:
          "Typing in the search input bypasses category selection and displays matching competencies across all domains.",
      },
      {
        stepNumber: 4,
        title: "Inspect Normalized Aliases",
        action: "Review keyword variations resolved by the ontology.",
        buttonOrPath: "Inspect the 'Normalized Aliases' section on any skill card",
        details:
          "Displays keyword variations that automatically resolve to this canonical entry (e.g. 'FastAPI', 'AsyncIO', 'CPython' -> Python Engineering).",
      },
      {
        stepNumber: 5,
        title: "Review Prerequisites & Related Competencies",
        action: "Analyze graph dependency relationships.",
        buttonOrPath: "Inspect 'Prerequisites' and 'Related Competencies' tags",
        details:
          "Identifies foundational skills required before this competency can be qualified at Practitioner or Advanced tiers.",
      },
    ],
    practicalExample: {
      title: "Illustrative Alias Resolution: 'AsyncIO' and 'FastAPI' Mapping to 'Python Engineering'",
      startingState:
        "An AI work analysis job extracts 'AsyncIO' and 'FastAPI' from a backend pull request. The user wonders if these create two separate, fragmented skill records.",
      actionTaken:
        "The user navigates to /app/passport/taxonomy and searches for 'AsyncIO'.",
      resultingOutcome:
        "The search locates 'Python Engineering' and highlights 'AsyncIO' under its 'Normalized Aliases' pill tags. The description explains that async patterns are evaluated under Python Engineering Practitioner rubric.",
      inspectionGuide:
        "Notice the 'Prerequisite Graphs' principle card. Python Engineering is listed as a prerequisite for 'Machine Learning' and 'Distributed Systems'.",
      recoveryNote:
        "If an emerging library or framework has no canonical alias yet, administrators can register the new alias in the taxonomy version registry.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "CompetencyTaxonomy database records (canonical_name, normalized_name, category, description, aliases, parent_competency_id).",
        "Selected category ID or search query string.",
      ],
      outputArtifacts: [
        "Domain specifications with competency counts.",
        "Canonical competency cards showing definition, normalized aliases, prerequisites, and related skills.",
        "Navigation link to detailed competency profile (/app/passport/skills/[id]).",
      ],
      originAndProcessing:
        "GET /api/passport/taxonomy queries CompetencyTaxonomy table filtered by status == 'active', grouped by category, returning canonical entries and aliases.",
      generatedVsPersisted:
        "All taxonomy categories, canonical definitions, aliases, and prerequisites are persisted in PostgreSQL. No synthetic graph nodes are created dynamically.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "canonical",
          badgeLabel: "Canonical Standard",
          meaning: "The authoritative, normalized representation of a competency across the organization.",
          nextAction: "Used as the benchmark target for all candidate extractions.",
        },
        {
          status: "alias",
          badgeLabel: "Normalized Alias",
          meaning: "A syntax keyword, library name, or tool synonym that resolves to the parent canonical competency.",
          nextAction: "Mapped automatically during AI extraction.",
        },
      ],
      trustPrinciples: [
        "Normalization Invariant: Skills are never duplicated under different spelling or library names (e.g. 'NodeJS', 'Node.js', 'Node' all resolve to Node.js).",
        "Graph Dependency: Advanced competencies require demonstrable proof of prerequisite foundations.",
        "Calibrated Rubrics: Every canonical competency defines explicit criteria for all 5 proficiency tiers.",
      ],
      skillTrustCaveat:
        "Taxonomy entries define organizational standards, not personal achievements. Possessing an alias in code does not automatically verify the canonical competency.",
    },
    troubleshooting: [
      {
        symptom: "A newly adopted tool or library is not found in the taxonomy.",
        probableCause: "The current taxonomy version does not yet include an alias for that emerging library.",
        verifiedRemedy: "The candidate will be quarantined in Candidate Review; an Administrator can update taxonomy aliases via backend schema migration.",
      },
      {
        symptom: "Category counts in the left sidebar do not match the number of displayed skills.",
        probableCause: "An active search query is filtering skills across multiple categories.",
        verifiedRemedy: "Clear the search input to restore category-scoped browsing.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Candidate Review",
      nextStepAction: "Review provisional candidate skills mapped to these canonical taxonomy standards.",
      targetRoute: "/app/passport/candidates",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully operational. Backed by CompetencyTaxonomy table and GET /api/passport/taxonomy endpoint.",
    },
    relatedLinks: [
      { label: "Skill Explorer", href: "/app/passport/explorer" },
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Evidence Coverage", href: "/app/passport/coverage" },
    ],
  },

  "candidate-review": {
    id: "candidate-review",
    title: "Candidate Skill Review & Human Adjudication",
    shortTitle: "Candidate Review",
    canonicalRoute: "/app/passport/candidates",
    badgeLabel: "Domain 2 · Candidate Queue",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "CheckCircle2",
    summary:
      "Provisional competencies extracted by pipeline models awaiting human inspection and adjudication. Review extraction rationale and corroborating deliverables before promoting to your verified passport.",
    purpose:
      "Candidate Review acts as the essential human-in-the-loop governance firewall of Skill Passport. It ensures that AI extractions remain strictly provisional until an authorized reviewer examines the supporting evidence. Reviewers have three explicit actions: confirm promotion to verified status, reject incorrect superficial extractions, or mark as having insufficient evidence.",
    whenToUse: [
      "After connecting a new repository or running an AI work analysis job that generates provisional competency claims.",
      "When reviewing extracted candidate skills to ensure attribution and depth match workplace reality.",
      "When rejecting false-positive keyword matches (e.g. a tutorial snippet erroneously labeled as expert architecture).",
      "When flagging skills that require additional production codebase deliverables before accreditation.",
    ],
    whoCanUse:
      "All users can view candidate skills. Reviewers and Admins can authoritatively submit review decisions. In demo mode, employees can test adjudication actions.",
    prerequisites: [
      "At least one candidate mapping in evidence_competency_mappings with status in ('candidate', 'insufficient', 'flagged').",
      "Linked deliverables in evidence_items table.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Candidate Review Queue",
        action: "Navigate to the candidate review interface.",
        buttonOrPath: "Sidebar → Candidate Review (/app/passport/candidates)",
        details:
          "Review the stat ribbon showing Candidates In Review, High-Confidence Extracts, and Pending Adjudication count.",
      },
      {
        stepNumber: 2,
        title: "Inspect AI Pipeline Extraction Rationale",
        action: "Review why the model proposed this competency.",
        buttonOrPath: "Read the 'AI Pipeline Extraction Rationale' card on any candidate item",
        details:
          "Examines the model's justification, extracted keywords, proposed proficiency tier, and extraction confidence score.",
      },
      {
        stepNumber: 3,
        title: "Audit Corroborating Work Deliverables",
        action: "Verify the attached source code or document.",
        buttonOrPath: "Click any deliverable in 'Corroborating Work Artifacts' (/app/evidence/[id])",
        details:
          "Inspect the actual commit, pull request diff, or document excerpt to confirm author attribution and technical depth.",
      },
      {
        stepNumber: 4,
        title: "Perform Authorized Adjudication",
        action: "Select one of three review decisions.",
        buttonOrPath: "Click 'Confirm & Promote', 'Reject / Flag Incorrect', or 'Insufficient Evidence'",
        details:
          "- 'Confirm & Promote to Verified': Promotes skill to Verified status and appends to Skill History.\n- 'Reject / Flag Incorrect': Rejects false positive and logs rejection.\n- 'Insufficient Evidence': Flags candidate as needing additional corroborating artifacts.",
      },
      {
        stepNumber: 5,
        title: "Verify Outcome in Passport & History",
        action: "Confirm the persisted state change.",
        buttonOrPath: "Navigate to /app/passport/skills or /app/passport/history",
        details:
          "Promoted skills immediately appear in Verified Skills. The transition event is permanently recorded in Skill History.",
      },
    ],
    practicalExample: {
      title: "Illustrative Review: Adjudicating 'PostgreSQL Optimization' Candidate",
      startingState:
        "The AI pipeline analyzed a commit containing 'EXPLAIN ANALYZE' query tuning and created a candidate for 'PostgreSQL Optimization' with Practitioner rating and 88% confidence.",
      actionTaken:
        "The reviewer inspects the candidate at /app/passport/candidates, clicks the deliverable link to review the SQL migration, and clicks 'Confirm & Promote to Verified' with note 'Demonstrated index optimization reducing query time by 60%'.",
      resultingOutcome:
        "A success banner appears: 'Promoted \"PostgreSQL Optimization\" to Verified Competencies'. The candidate is removed from the review queue and appears in /app/passport/skills.",
      inspectionGuide:
        "Visit /app/passport/history to see the new event: 'Verification Updated | New State: Verified (Level: Practitioner) | Actor: Authorized Reviewer'.",
      recoveryNote:
        "If a candidate was promoted erroneously, an Admin can update the mapping status via Trust & Governance review queue.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Candidate mapping ID (UUID).",
        "Adjudication action: 'verify', 'reject', or 'flag_insufficient'.",
        "Review rationale string (minimum 3 characters).",
        "Authenticated reviewer UUID.",
      ],
      outputArtifacts: [
        "Updated EvidenceCompetencyMapping record with new status.",
        "New VerificationDecision record in PostgreSQL.",
        "New ReviewAuditEvent logged in audit history.",
        "Instant UI feedback toast with updated candidate list.",
      ],
      originAndProcessing:
        "POST /api/passport/candidates/{mapping_id}/review calls verification_service.review_candidate_skill(), executing atomic database transactions across mappings, decisions, and audit events.",
      generatedVsPersisted:
        "Decisions are permanently committed to the database. The candidate queue is re-queried dynamically upon review submission.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "candidate",
          badgeLabel: "CANDIDATE",
          meaning: "Provisional skill proposed by automated pipeline models.",
          nextAction: "Requires review decision (promote, reject, or flag insufficient).",
        },
        {
          status: "insufficient_evidence",
          badgeLabel: "INSUFFICIENT",
          meaning: "Candidate was reviewed and determined to need stronger codebase deliverables.",
          nextAction: "Ingest additional pull requests in Evidence Workspace.",
        },
        {
          status: "rejected",
          badgeLabel: "REJECTED",
          meaning: "Flagged as a superficial keyword match or false positive.",
          nextAction: "Removed from active candidate queue and logged in audit history.",
        },
      ],
      trustPrinciples: [
        "Separation of Extraction and Accreditation: Model extraction creates a candidate, not a credential.",
        "Deterministic State Mutation: Decisions write directly to PostgreSQL with atomic audit logging.",
        "Human Oversight Invariant: No skill reaches verified status without explicit corroboration.",
      ],
      skillTrustCaveat:
        "High extraction confidence (e.g. 95%) does not mean the claim is verified. It only means the LLM is confident about its text parsing.",
    },
    troubleshooting: [
      {
        symptom: "Clicking 'Confirm & Promote' displays 'Candidate skill claim not found'.",
        probableCause: "The candidate mapping was already adjudicated in another session or deleted.",
        verifiedRemedy: "Refresh the page to sync with the latest database state.",
      },
      {
        symptom: "A candidate has no corroborating work deliverables attached.",
        probableCause: "The extraction was generated from a high-level summary document without direct commit linkages.",
        verifiedRemedy: "Click 'Insufficient Evidence' to quarantine the claim until concrete repository deliverables are connected.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Verified Skills",
      nextStepAction: "Inspect newly promoted competencies in your verified capability profile.",
      targetRoute: "/app/passport/skills",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully operational with real backend mutation via POST /api/passport/candidates/{id}/review.",
    },
    relatedLinks: [
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Skill History", href: "/app/passport/history" },
      { label: "Evidence Workspace", href: "/app/evidence" },
      { label: "AI Work Analysis", href: "/app/ai/work-analysis" },
    ],
  },

  "evidence-coverage": {
    id: "evidence-coverage",
    title: "Evidence Coverage Analysis & Health Scorecard",
    shortTitle: "Evidence Coverage",
    canonicalRoute: "/app/passport/coverage",
    badgeLabel: "Domain 2 · Evidence Health",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "FileCheck2",
    summary:
      "Deterministic evaluation of whether your technical competencies are supported by robust, varied, and fresh evidence artifacts, or if coverage deficits exist.",
    purpose:
      "Evidence Coverage evaluates the depth, variety, and health of the artifacts corroborating each competency. It prevents credential decay and single-source vulnerability by analyzing artifact count, freshness, and conflict state. Each skill is categorized as Sufficient, Incomplete, Insufficient, or Conflicting, accompanied by tailored actionable guidance.",
    whenToUse: [
      "When assessing your overall passport evidence health percentage before performance reviews or client sharing.",
      "When identifying competencies that rely on only a single artifact and need cross-source corroboration.",
      "When diagnosing why a skill has not met the threshold for verified accreditation.",
      "When planning your next technical contributions to systematically resolve evidence deficits.",
    ],
    whoCanUse:
      "Available to all users. Employees analyze their own evidence coverage. Engineering Managers and Reviewers inspect team coverage health.",
    prerequisites: [
      "Tracked skills in the user's portfolio.",
      "Persisted deliverables in evidence_items table.",
      "Evidence-to-competency mappings.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Evidence Coverage Scorecard",
        action: "Navigate to the coverage analysis screen.",
        buttonOrPath: "Sidebar → Evidence Coverage (/app/passport/coverage)",
        details:
          "Inspect the Passport Evidence Health percentage (e.g. '75% Sufficiently Corroborated') and segmented counts (Sufficient, Incomplete, Insufficient, Conflicting).",
      },
      {
        stepNumber: 2,
        title: "Inspect the Multi-Segment Progress Bar",
        action: "Visualize coverage distribution.",
        buttonOrPath: "Review the color-coded bar below the scorecard",
        details:
          "Green = Sufficient, Amber = Incomplete, Red = Insufficient, Purple = Conflicting.",
      },
      {
        stepNumber: 3,
        title: "Filter Inventory by Coverage State",
        action: "Isolate competencies needing attention.",
        buttonOrPath: "Click filter pills: 'All', 'Sufficient', 'Incomplete', or 'Insufficient'",
        details:
          "Filter to 'Incomplete' or 'Insufficient' to view skills with actionable coverage deficits.",
      },
      {
        stepNumber: 4,
        title: "Review Recommended Actions",
        action: "Read tailored next steps for each competency.",
        buttonOrPath: "Inspect the 'Recommended Action' column in the inventory table",
        details:
          "Provides concrete advice (e.g. 'Connect an additional repository or PR to provide independent cross-source corroboration').",
      },
      {
        stepNumber: 5,
        title: "Inspect Supporting Evidence",
        action: "Drill into the underlying deliverables.",
        buttonOrPath: "Click 'Evidence →' in the rightmost column of any table row",
        details:
          "Navigates to /app/passport/skills/[id]/evidence to see all linked artifacts and their observed timestamps.",
      },
    ],
    practicalExample: {
      title: "Illustrative Health Evaluation: Resolving an Incomplete Coverage Deficit",
      startingState:
        "The engineer's 'Kubernetes Deployment' skill has only 1 linked deliverable (a Helm values file). The coverage scorecard reports it as 'Incomplete'.",
      actionTaken:
        "The user reviews the table in /app/passport/coverage. The Recommended Action states: 'Connect an additional repository or PR to provide independent cross-source corroboration.' The user connects a production deployment repo and ingests a GitHub Actions deployment workflow.",
      resultingOutcome:
        "With 2 distinct deliverables attached, the backend evaluation recalculates coverage state to 'Sufficient'. The overall passport health score increases from 70% to 80%.",
      inspectionGuide:
        "The inventory table now displays a green 'Sufficient' badge and notes: 'Meets verification criteria. Ready for verified passport export.'",
      recoveryNote:
        "If a skill displays 'Conflicting', open /app/ai/conflicts to resolve attribution disputes before coverage can become Sufficient.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Authenticated user UUID.",
        "EvidenceCompetencyMapping records linked to user.",
        "EvidenceItem records with evidence_strength and observed_timestamp.",
        "EvidenceConflictRecord table for open conflict detection.",
      ],
      outputArtifacts: [
        "Overall health score percentage: round((sufficient_count / total_skills) * 100).",
        "Segmented counts: sufficient, incomplete, insufficient, conflicting.",
        "Inventory table with skill names, categories, artifact counts, dates, and recommended actions.",
      ],
      originAndProcessing:
        "GET /api/passport/coverage executes deterministic business logic: has_conflict -> 'conflicting'; distinct_artifacts >= 2 or strength == 'high' -> 'sufficient'; distinct_artifacts == 1 -> 'incomplete'; else -> 'insufficient'.",
      generatedVsPersisted:
        "Artifacts and mappings are persisted in PostgreSQL. Coverage states and the health score are deterministically computed on request.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "sufficient",
          badgeLabel: "SUFFICIENT",
          meaning: "Backed by 2+ distinct deliverables or at least 1 high-strength production deliverable.",
          nextAction: "Meets criteria for verified accreditation and external passport export.",
        },
        {
          status: "incomplete",
          badgeLabel: "INCOMPLETE",
          meaning: "Backed by only 1 artifact of medium/low strength; single-source vulnerability.",
          nextAction: "Connect an additional repository or deliverable for corroboration.",
        },
        {
          status: "insufficient",
          badgeLabel: "INSUFFICIENT",
          meaning: "No concrete deliverables attached to this competency claim.",
          nextAction: "Upload project technical report or connect commit activity in Evidence Center.",
        },
        {
          status: "conflicting",
          badgeLabel: "CONFLICTING",
          meaning: "Open evidence conflict detected across multiple sources.",
          nextAction: "Resolve contradictions in Conflict Resolution (/app/ai/conflicts).",
        },
      ],
      trustPrinciples: [
        "Deterministic Coverage Thresholds: Defined by exact code rules (distinct artifact count and strength), not arbitrary scores.",
        "Multi-Source Corroboration: Resilient credentials require evidence across multiple deliverables.",
        "Conflict Awareness: Conflicted evidence immediately overrides coverage to prevent false accreditation.",
      ],
      skillTrustCaveat:
        "Evidence coverage measures artifact quantity and corroboration robustness. It is distinct from proficiency level (competency depth) and model confidence (parsing likelihood).",
    },
    troubleshooting: [
      {
        symptom: "A skill shows 'Incomplete' even though multiple commits were pushed.",
        probableCause: "All commits belong to the same single repository deliverable, representing a single source.",
        verifiedRemedy: "Connect a second distinct source (e.g. Jira issue, architecture doc, or peer repository) for cross-source corroboration.",
      },
      {
        symptom: "Coverage Health score is 0%.",
        probableCause: "No competencies have yet reached the Sufficient threshold (2+ artifacts or high strength).",
        verifiedRemedy: "Connect workplace sources in Evidence Workspace (/app/evidence/connect) and run extraction.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Connected Sources & Ingestion",
      nextStepAction: "Connect additional sources to resolve incomplete coverage deficits.",
      targetRoute: "/app/evidence/sources",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully operational. Deterministic logic in backend/app/api/passport.py calculates health scores with zero mock data.",
    },
    relatedLinks: [
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Evidence Center", href: "/app/evidence" },
      { label: "Connected Sources", href: "/app/evidence/sources" },
    ],
  },

  "skill-history": {
    id: "skill-history",
    title: "Skill Evolution & Audit Timeline",
    shortTitle: "Skill History",
    canonicalRoute: "/app/passport/history",
    badgeLabel: "Domain 2 · Evolution Log",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "History",
    summary:
      "Audit trail capturing model extractions, reviewer approvals, evidence linkages, and calibration adjustments with full actor attribution and cryptographic tamper evidence.",
    purpose:
      "Skill History provides complete chronological transparency into how an engineer's competency portfolio has evolved over time. Every candidate extraction, reviewer adjudication, evidence link, mapping correction, and conflict flag is recorded with an immutable timestamp, preceding value, new state, substantiating rationale, and actor identification.",
    whenToUse: [
      "When auditing the chronological progression of a specific skill from initial extraction to verified accreditation.",
      "When verifying who approved a candidate review decision and what justification was provided.",
      "When investigating when and why a competency's proficiency level or verification state changed.",
      "When providing tamper-evident governance records for internal compliance or external certification audits.",
    ],
    whoCanUse:
      "Available to all users. Employees can inspect their personal skill evolution timeline. Reviewers and Admins can audit decisions across the organization.",
    prerequisites: [
      "Audit events logged in review_audit_events table.",
      "Historical verification decisions in verification_decisions table.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Skill History Timeline",
        action: "Navigate to the audit history screen.",
        buttonOrPath: "Sidebar → Skill History (/app/passport/history)",
        details:
          "Review the Trust & Audit Standards banner and the total count of recorded audit events.",
      },
      {
        stepNumber: 2,
        title: "Search Audit Records",
        action: "Filter by competency name, reason, or change.",
        buttonOrPath: "Search input ('Search audit trail by competency name, reason, or change...')",
        details:
          "Type in a competency name (e.g. 'FastAPI') or keyword (e.g. 'promotion', 'Practitioner') to isolate relevant events.",
      },
      {
        stepNumber: 3,
        title: "Filter by Event Type",
        action: "Focus on specific lifecycle events.",
        buttonOrPath: "Event Type dropdown",
        details:
          "Filter by 'Verification Updated', 'Evidence Linked', 'Candidate Extracted', 'Mapping Corrected', or 'Conflict Flagged'.",
      },
      {
        stepNumber: 4,
        title: "Filter by Actor",
        action: "Isolate system vs human actions.",
        buttonOrPath: "Actor dropdown ('All Actors', 'System Pipeline', 'SkillPassport Guard', or specific reviewer)",
        details:
          "Separates automated pipeline extractions from authoritative human reviewer decisions.",
      },
      {
        stepNumber: 5,
        title: "Inspect Event Details and Evidence",
        action: "Audit transition rationale and linked deliverables.",
        buttonOrPath: "Review the transition box and click the deliverable ID link",
        details:
          "Inspect the Previous Value (crossed out) vs New State, read the quoted rationale, and click the deliverable link (/app/evidence/[id]).",
      },
    ],
    practicalExample: {
      title: "Illustrative Audit Trail: Tracing the Lifecycle of 'Python Engineering'",
      startingState:
        "The user wants to inspect when 'Python Engineering' was verified and who authorized the decision.",
      actionTaken:
        "The user navigates to /app/passport/history and selects 'Verification Updated' from the Event Type dropdown.",
      resultingOutcome:
        "The timeline displays the event: 'Verification Updated | Python Engineering | Timestamp: 2026-10-18 14:32 | Previous: Candidate -> New State: Verified (Level: Practitioner) | Actor: Authorized Reviewer | Rationale: \"Demonstrated production async API endpoints with SQLAlchemy pool management\"'.",
      inspectionGuide:
        "The card includes a deliverable link 'ev-01'. Clicking it opens the original pull request deliverable in Evidence Center.",
      recoveryNote:
        "Skill History is an append-only timeline. Past events cannot be edited or deleted, ensuring audit integrity.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Authenticated user UUID.",
        "Limit parameter (default: 50, max: 200).",
        "Optional filter parameters (search, eventType, actor).",
      ],
      outputArtifacts: [
        "Chronological timeline cards with actor icons, event type badges, timestamps, state transitions, rationales, and evidence links.",
        "Total audit record count.",
      ],
      originAndProcessing:
        "GET /api/passport/history queries review_audit_events joined with evidence_competency_mappings and competency_taxonomies, ordered by event_timestamp desc.",
      generatedVsPersisted:
        "All audit events are permanently persisted in the review_audit_events table. The timeline is an immutable projection of these records.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verified_state_changed",
          badgeLabel: "Verification Updated",
          meaning: "An authorized reviewer or deterministic gate updated the verification state or proficiency level.",
          nextAction: "Inspect the quoted rationale and new state.",
        },
        {
          status: "candidate_extracted",
          badgeLabel: "Candidate Extracted",
          meaning: "The AI analysis pipeline identified a new provisional competency claim from an ingested deliverable.",
          nextAction: "Check Candidate Review (/app/passport/candidates) if still pending.",
        },
        {
          status: "evidence_linked",
          badgeLabel: "Evidence Linked",
          meaning: "A new workplace deliverable was linked to support this competency.",
          nextAction: "View linked deliverable in Evidence Center.",
        },
        {
          status: "conflict_flagged",
          badgeLabel: "Conflict Flagged",
          meaning: "A contradictory claim or attribution mismatch was detected and logged.",
          nextAction: "Resolve in Conflict Resolution (/app/ai/conflicts).",
        },
      ],
      trustPrinciples: [
        "Append-Only Immutability: History events are never overwritten or deleted; corrections appear as subsequent events.",
        "Explicit Actor Attribution: Every event identifies whether it was triggered by 'System Pipeline', 'SkillPassport Guard', or an authenticated human user.",
        "Rationale Requirement: State transitions mandate a justification note explaining the decision.",
      ],
      skillTrustCaveat:
        "Skill History records portfolio transitions. It is distinct from the broader Trust & Governance AI Audit Trail (/app/ai/audit), which logs low-level model inference and guard checks.",
    },
    troubleshooting: [
      {
        symptom: "Timeline displays 'No Audit Events Yet'.",
        probableCause: "No candidates have been reviewed and no automated events have occurred for this account.",
        verifiedRemedy: "Run an AI analysis job in /app/ai/work-analysis or adjudicate a candidate in /app/passport/candidates to generate audit records.",
      },
      {
        symptom: "An expected event does not appear in the timeline.",
        probableCause: "The active search input or event type filter is excluding the record, or query limit was reached.",
        verifiedRemedy: "Clear search query and reset dropdowns to 'All Event Types' and 'All Actors'.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Verified Skills",
      nextStepAction: "Review your active verified competencies reflecting the latest historical transitions.",
      targetRoute: "/app/passport/skills",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully operational. Backed by review_audit_events table and GET /api/passport/history endpoint.",
    },
    relatedLinks: [
      { label: "Verified Skills", href: "/app/passport/skills" },
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "AI Audit Trail", href: "/app/ai/audit" },
      { label: "Evidence Coverage", href: "/app/passport/coverage" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED WORKFLOWS FOR SKILL INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_GUIDED_WORKFLOWS: SkillGuidedWorkflow[] = [
  {
    id: "workflow-a",
    title: "Workflow A: From Candidate Skill to Verified Competency",
    summary:
      "The complete end-to-end journey of an AI-extracted technical claim moving through human adjudication, taxonomy qualification, and permanent passport verification.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Locate Provisional Claim in Candidate Review",
        route: "/app/passport/candidates",
        action:
          "Open Candidate Review (/app/passport/candidates) and locate a provisional competency (e.g. 'FastAPI Development').",
        outcome:
          "Candidate card displays proposed proficiency (e.g. Practitioner), extraction confidence (e.g. 91%), and AI pipeline extraction rationale.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Audit Supporting Work Deliverables",
        route: "/app/evidence",
        action:
          "Click the linked deliverable item in 'Corroborating Work Artifacts' to open the raw deliverable in Evidence Center.",
        outcome:
          "Confirms author attribution, observed commit timestamps, and actual code implementation rather than superficial keyword mentions.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Validate Against Taxonomy Rubric",
        route: "/app/passport/taxonomy",
        action:
          "Open Taxonomy & Ontology (/app/passport/taxonomy) to review the 5-tier evaluation rubric for the canonical competency.",
        outcome:
          "Confirms the deliverable demonstrates independent production microservice implementation matching Practitioner tier.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Submit Authorized Review Decision",
        route: "/app/passport/candidates",
        action:
          "Return to Candidate Review and click 'Confirm & Promote to Verified' with justification note.",
        outcome:
          "Backend POST /api/passport/candidates/{id}/review sets status to 'verified', commits a VerificationDecision, and logs an audit event.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Inspect in Verified Skills & Audit History",
        route: "/app/passport/skills",
        action:
          "Navigate to Verified Skills (/app/passport/skills) and check Skill History (/app/passport/history).",
        outcome:
          "Skill displays green 'Verified' badge in your passport. Skill History records 'Candidate -> Verified (Level: Practitioner)' with actor attribution.",
      },
    ],
    keyTakeaway:
      "AI extractions never become verified credentials automatically. Human review and attributable deliverables are required to grant formal verification.",
  },

  {
    id: "workflow-b",
    title: "Workflow B: Investigating and Resolving Insufficient Evidence Coverage",
    summary:
      "How to identify single-source vulnerabilities or coverage deficits and systematically corroborate competencies with independent workplace artifacts.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Inspect Evidence Coverage Scorecard",
        route: "/app/passport/coverage",
        action:
          "Open Evidence Coverage (/app/passport/coverage) and review the multi-segment health bar.",
        outcome:
          "Identifies competencies categorized as 'Incomplete' (only 1 artifact) or 'Insufficient' (0 artifacts).",
      },
      {
        phaseNumber: 2,
        featureTitle: "Review Tailored Action Guidance",
        route: "/app/passport/coverage",
        action:
          "Locate the affected skill in the inventory table and read the 'Recommended Action' column.",
        outcome:
          "System advises: 'Connect an additional repository or PR to provide independent cross-source corroboration.'",
      },
      {
        phaseNumber: 3,
        featureTitle: "Inspect Existing Evidence Map",
        route: "/app/passport/skills",
        action:
          "Click 'Evidence' in the table row to view the current deliverable linkages in the Evidence Map.",
        outcome:
          "Reveals that the existing artifact is an isolated configuration file lacking corroborating implementation code.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Connect Source and Ingest New Deliverables",
        route: "/app/evidence/sources",
        action:
          "Navigate to Connected Sources (/app/evidence/sources) or Upload Work & Docs (/app/evidence/upload) to add a secondary repository.",
        outcome:
          "New pull requests and architecture documentation are ingested into the user's Evidence Library.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Run AI Analysis and Recheck Coverage",
        route: "/app/ai/work-analysis",
        action:
          "Run AI Work Analysis to map the new deliverable, then return to Evidence Coverage (/app/passport/coverage).",
        outcome:
          "With 2+ distinct deliverables attached, the competency transitions to 'Sufficient', increasing overall passport health score.",
      },
    ],
    keyTakeaway:
      "A resilient passport requires cross-source corroboration. Multi-source coverage protects skills from single-point evidentiary failure.",
  },

  {
    id: "workflow-c",
    title: "Workflow C: Finding and Exploring a Canonical Skill in the Taxonomy",
    summary:
      "How to search for tools, libraries, or concepts in the universal catalog, resolve aliases, and inspect prerequisite graphs.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Search for a Tool or Library in Skill Explorer",
        route: "/app/passport/explorer",
        action:
          "Open Skill Explorer (/app/passport/explorer) and search for a specific term (e.g. 'FastAPI' or 'Docker').",
        outcome:
          "Catalog filters to matching entries, displaying whether the skill is currently tracked in your personal portfolio.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Open Domain Specification in Taxonomy",
        route: "/app/passport/taxonomy",
        action:
          "Click 'View Taxonomy' in the header to navigate to the canonical schema browser (/app/passport/taxonomy).",
        outcome:
          "Selects the parent domain (e.g. 'Software Engineering') and displays the formal domain specification.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Inspect Normalized Aliases",
        route: "/app/passport/taxonomy",
        action:
          "Review the 'Normalized Aliases' tags on the canonical competency card.",
        outcome:
          "Confirms that related syntax variations, tool names, and library synonyms map to this single standardized competency.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Analyze Prerequisite Dependency Graphs",
        route: "/app/passport/taxonomy",
        action:
          "Examine 'Prerequisites' and 'Related Competencies' on the competency card.",
        outcome:
          "Understands the foundational skills required before this competency can be qualified at higher proficiency tiers.",
      },
    ],
    keyTakeaway:
      "Skill Explorer and Taxonomy establish organizational standards. Finding a skill in the catalog helps clarify requirements without implying personal possession.",
  },

  {
    id: "workflow-d",
    title: "Workflow D: Investigating a Skill Status Change or Calibration Event",
    summary:
      "How to audit why a skill transitioned between states, who authorized the decision, and which deliverables substantiate the change.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Notice Updated Badge or State",
        route: "/app/passport/skills",
        action:
          "Notice a change in a competency card in Verified Skills (/app/passport/skills) or Candidate Review.",
        outcome:
          "A competency's badge changed from 'Candidate' to 'Verified' or 'Insufficient Evidence'.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Navigate to Skill History",
        route: "/app/passport/history",
        action:
          "Open Skill History (/app/passport/history) to inspect chronological lifecycle events.",
        outcome:
          "The audit timeline displays all recorded state transitions with timestamps and actor badges.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Filter by Competency Name",
        route: "/app/passport/history",
        action:
          "Type the skill name into the search bar to isolate its event stream.",
        outcome:
          "Displays the complete sequence: Candidate Extracted -> Evidence Linked -> Verification Updated.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Inspect Transition Details & Actor Attribution",
        route: "/app/passport/history",
        action:
          "Review the Previous Value (crossed out) vs New State and read the justification note.",
        outcome:
          "Identifies the exact reviewer or system process, the date/time of the decision, and the attached deliverable reference.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Audit the Substantiating Deliverable",
        route: "/app/evidence",
        action:
          "Click the linked deliverable ID to inspect the original work in Evidence Center.",
        outcome:
          "Verifies that the historical decision is backed by legitimate, immutable workplace artifacts.",
      },
    ],
    keyTakeaway:
      "Every state change in Skill Passport is tamper-evident and attributable. Nothing is silently modified or deleted without an audit trail.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY (14 CORE TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const SKILL_CONCEPTUAL_GLOSSARY: SkillGlossaryTerm[] = [
  {
    term: "Canonical Skill",
    definition:
      "A standardized, unique competency concept defined within the organizational taxonomy (e.g. 'Python Engineering') that serves as the single anchor for related tools, libraries, and aliases.",
    context:
      "Prevents keyword fragmentation so that 'Python3', 'CPython', and 'AsyncIO' all resolve to the same canonical competency in /app/passport/taxonomy.",
    relatedRoute: "/app/passport/taxonomy",
    relatedRouteLabel: "Taxonomy & Ontology",
  },
  {
    term: "Candidate Skill",
    definition:
      "A provisional competency claim extracted by automated AI models from ingested deliverables that remains quarantined until evaluated by an authorized reviewer.",
    context:
      "Visible in Candidate Review (/app/passport/candidates); candidates are explicitly not verified credentials.",
    relatedRoute: "/app/passport/candidates",
    relatedRouteLabel: "Candidate Review",
  },
  {
    term: "Verified Competency",
    definition:
      "A formal skill credential backed by auditable workplace deliverables, calibrated against a standardized rubric, and approved through authorized human adjudication.",
    context:
      "Displayed exclusively in Verified Skills (/app/passport/skills) and eligible for recruiter export.",
    relatedRoute: "/app/passport/skills",
    relatedRouteLabel: "Verified Skills",
  },
  {
    term: "Alias Normalization",
    definition:
      "The process of mapping diverse natural-language terms, tool names, or framework variations to their singular canonical parent competency.",
    context:
      "Ensures that 'FastAPI' or 'Flask' contributions are properly credited under 'Python Engineering' in /app/passport/taxonomy.",
    relatedRoute: "/app/passport/taxonomy",
    relatedRouteLabel: "Taxonomy & Ontology",
  },
  {
    term: "Prerequisite Dependency Graph",
    definition:
      "A directed relationship structure defining foundational competencies required before an advanced skill can be qualified at higher tiers.",
    context:
      "For example, 'Machine Learning' requires demonstrable prerequisites in 'Python Engineering' and 'Data Preprocessing'.",
    relatedRoute: "/app/passport/taxonomy",
    relatedRouteLabel: "Taxonomy & Ontology",
  },
  {
    term: "Deterministic Calibration Rubric",
    definition:
      "An objective 5-tier qualification standard (Foundation, Working, Practitioner, Advanced, Expert) defining concrete performance criteria for each level.",
    context:
      "Eliminates subjective self-ratings by binding levels to demonstrable engineering behaviors in /app/passport/skills/[id]/proficiency.",
    relatedRoute: "/app/passport/skills",
    relatedRouteLabel: "Verified Skills",
  },
  {
    term: "Evidence Coverage State",
    definition:
      "A deterministic health classification (Sufficient, Incomplete, Insufficient, Conflicting) measuring the robustness and variety of deliverables supporting a skill.",
    context:
      "Calculated in /app/passport/coverage; requires 2+ distinct deliverables or 1 high-strength deliverable for 'Sufficient' status.",
    relatedRoute: "/app/passport/coverage",
    relatedRouteLabel: "Evidence Coverage",
  },
  {
    term: "Multi-Source Corroboration",
    definition:
      "The evidentiary requirement that robust credentials be backed by multiple independent deliverables across different repositories or work sources.",
    context:
      "Protects against single-source failure; an isolated commit produces 'Incomplete' coverage until corroborated.",
    relatedRoute: "/app/passport/coverage",
    relatedRouteLabel: "Evidence Coverage",
  },
  {
    term: "Coverage Deficit",
    definition:
      "A condition where a recognized competency has insufficient or incomplete evidence backing, triggering actionable guidance in the coverage scorecard.",
    context:
      "Highlighted in red or amber in /app/passport/coverage with recommended remediation actions.",
    relatedRoute: "/app/passport/coverage",
    relatedRouteLabel: "Evidence Coverage",
  },
  {
    term: "Model Extraction Confidence",
    definition:
      "A statistical percentage score (0-100%) indicating how confident an LLM or NLP extractor is about its text parsing and keyword identification.",
    context:
      "Displayed on candidate cards; high confidence indicates parsing certainty, NOT verified competence.",
    relatedRoute: "/app/passport/candidates",
    relatedRouteLabel: "Candidate Review",
  },
  {
    term: "Provenance Attribution",
    definition:
      "The direct, auditable linkage connecting a competency claim to its original author, repository, commit SHA, PR number, or document timestamp.",
    context:
      "Verified in Gate 2 and Gate 4 of the Hallucination Guard to prevent cross-user evidence theft.",
    relatedRoute: "/app/evidence",
    relatedRouteLabel: "Evidence Center",
  },
  {
    term: "Skill Evolution Event",
    definition:
      "An immutable chronological record documenting a specific state transition, rationale, timestamp, and actor in a skill's lifecycle.",
    context:
      "Logged in review_audit_events and rendered chronologically in Skill History (/app/passport/history).",
    relatedRoute: "/app/passport/history",
    relatedRouteLabel: "Skill History",
  },
  {
    term: "Human Adjudication",
    definition:
      "The formal review process wherein an authorized human reviewer inspects candidate claims and commits an explicit decision (verify, reject, or flag insufficient).",
    context:
      "Executed via POST /api/passport/candidates/{id}/review in /app/passport/candidates.",
    relatedRoute: "/app/passport/candidates",
    relatedRouteLabel: "Candidate Review",
  },
  {
    term: "Cryptographic Audit Immutability",
    definition:
      "The architectural guarantee that historical audit events and verification decisions cannot be modified or deleted, preserving verifiable integrity.",
    context:
      "Guarantees that all promotions, rejections, and calibration adjustments in /app/passport/history are tamper-evident.",
    relatedRoute: "/app/passport/history",
    relatedRouteLabel: "Skill History",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific Skill Intelligence help topic.
 * Falls back to 'overview' for root or non-specific routes.
 */
export function getSkillHelpTopicIdFromPathname(pathname: string): SkillHelpTopicId {
  if (!pathname) return "overview";

  const clean = pathname.toLowerCase();

  if (clean === "/app/passport/skills" || clean.startsWith("/app/passport/skills/")) {
    return "verified-skills";
  }
  if (clean.startsWith("/app/passport/explorer")) {
    return "skill-explorer";
  }
  if (clean.startsWith("/app/passport/taxonomy")) {
    return "taxonomy-ontology";
  }
  if (clean.startsWith("/app/passport/candidates")) {
    return "candidate-review";
  }
  if (clean.startsWith("/app/passport/coverage")) {
    return "evidence-coverage";
  }
  if (clean.startsWith("/app/passport/history")) {
    return "skill-history";
  }

  // Fallback to overview for /app/passport or unrecognized subroutes
  return "overview";
}
