/**
 * Learning Intelligence Product Help & Conceptual Guidance Data Catalog
 * Domain 5: Learn & Grow in Skill Passport
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 11 Learn & Grow features, 4 guided cross-domain workflows,
 * exact mathematical mastery formulas, diagnostic assessments, and trust principles.
 */

export type LearningHelpTopicId =
  | "overview"
  | "roadmaps"
  | "domains"
  | "diagnostic"
  | "progress"
  | "practice"
  | "assessments"
  | "projects"
  | "resources"
  | "history"
  | "capability"
  | "steps"
  | "workflows"
  | "glossary";

export interface LearningStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface LearningConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface LearningStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface LearningTroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface LearningHelpTopic {
  id: LearningHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  requiredRole: "All Roles (Learner, Reviewer, Admin)" | "Reviewer or Admin" | "Administrator Only";
  iconName:
    | "GraduationCap"
    | "Map"
    | "BookOpen"
    | "CheckSquare"
    | "LineChart"
    | "Code2"
    | "CheckCircle2"
    | "FileCode"
    | "Layers"
    | "History"
    | "Award"
    | "Sparkles";
  summary: string;
  purpose: string; // What this feature does
  whenToUse: string[]; // When should I use it?
  whoCanUse: string; // Who can use it?
  prerequisites: string[]; // What must be available before starting?
  stepByStep: LearningStepInstruction[]; // Numbered instructions using actual UI controls
  practicalExample: LearningConcreteExample; // Realistic illustrative scenario
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  understandingStatus: {
    statusBadges: LearningStatusDefinition[];
    trustPrinciples: string[];
    learningTrustCaveat: string;
  };
  troubleshooting: LearningTroubleshootingItem[]; // What can go wrong and how to recover
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

export interface LearningGuidedWorkflow {
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

export interface LearningGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOPIC GUIDES FOR ALL 11 LEARN & GROW FEATURES + OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const LEARNING_HELP_TOPICS: Record<Exclude<LearningHelpTopicId, "workflows" | "glossary">, LearningHelpTopic> = {
  overview: {
    id: "overview",
    title: "Learning Intelligence & Growth Architecture Overview",
    shortTitle: "Overview",
    canonicalRoute: "/app/learning",
    badgeLabel: "Domain 5 · Overview",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "GraduationCap",
    summary:
      "Domain 5 translates your skill gaps and career aspirations into structured, milestone-based learning execution. It connects upstream role intelligence with personalized roadmaps, objective diagnostic tests, interactive practice sandboxes, and tangible mini-projects.",
    purpose:
      "Provide an actionable, evidence-producing development engine for professional engineers. Rather than offering endless video playlists, Learn & Grow grounds learning in actual Career Intelligence skill gaps, enforces topological prerequisite mastery (>=60%), and bridges learning completions back into candidate evidence for Skill Passport verification.",
    whenToUse: [
      "When beginning a learning cycle after evaluating your skill gaps in Career Intelligence (Domain 4).",
      "When reviewing your active roadmap progress, completed milestones, and estimated remaining study time.",
      "When checking prioritized skill gaps for your active target career role.",
      "When navigating to domain blueprints, diagnostic assessments, practice exercises, or mini-projects.",
    ],
    whoCanUse:
      "All authenticated users. Learners track their curriculum progress. Reviewers inspect completed deliverables and candidate evidence.",
    prerequisites: [
      "An active user profile in Skill Passport.",
      "Recommended: An active target role selected in Career Intelligence to generate targeted priorities.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Verify Your Target Role Context",
        action: "Check the Target Role dropdown at the top of the Learning Overview.",
        buttonOrPath: "Dropdown: 'Role Context: [Role Title]'",
        details:
          "The overview automatically synchronizes with your active target role from Domain 4. You can switch target roles directly from the dropdown to reload role-specific learning priorities.",
      },
      {
        stepNumber: 2,
        title: "Review Upstream Learning Priorities",
        action: "Inspect the 'Prioritized Skill Gaps for Your Role' section.",
        buttonOrPath: "Section: 'Prioritized Skill Gaps for Your Role'",
        details:
          "Displays high-yield gaps identified by Career Intelligence, sorted by urgency and importance. Each card shows the canonical skill name, importance tier, and priority score.",
      },
      {
        stepNumber: 3,
        title: "Remediate a Gap into a Personalized Roadmap",
        action: "Click 'Remediate Gap' on any prioritized skill gap card.",
        buttonOrPath: "Button: 'Remediate Gap' with sparkle icon",
        details:
          "Calls `generatePersonalizedRoadmap`, dynamically scaffolding a step-by-step curriculum path and redirecting to the Full Roadmap view (/app/learning/roadmaps/[pathId]).",
      },
      {
        stepNumber: 4,
        title: "Resume Active Learning Roadmap",
        action: "Inspect the 'Active Learning Roadmap' hero card.",
        buttonOrPath: "Button: 'Open Full Roadmap →' (/app/learning/roadmaps/[pathId])",
        details:
          "Shows current completion percentage, overall mastery score, the next up step, and estimated study minutes.",
      },
      {
        stepNumber: 5,
        title: "Inspect Explainable Mastery Formula",
        action: "Click 'Inspect Formula' to review the 4-signal calculation.",
        buttonOrPath: "Button: 'Inspect Formula' or 'Formula Modal'",
        details:
          "Opens the explainable mastery formula modal showing the exact deterministic weights: 30% Knowledge, 25% Practice, 20% Assessment, and 25% Project.",
      },
    ],
    practicalExample: {
      title: "Transitioning from Backend Developer to Cloud Platform Engineer",
      startingState:
        "A developer selects 'Cloud Platform Engineer' as their target role. Career Intelligence identifies a critical depth gap in 'Kubernetes Cluster Administration'.",
      actionTaken:
        "The developer opens /app/learning. The 'Prioritized Skill Gaps' section displays Kubernetes as Priority #1 (Score: 88/100). The developer clicks 'Remediate Gap'.",
      resultingOutcome:
        "The system scaffolds a 6-step personalized roadmap starting with Container Networking foundations, locking advanced Pod Autoscaling until foundational steps reach 60% mastery.",
      inspectionGuide:
        "Navigate to /app/learning/roadmaps to inspect the generated path, milestones, and status badges.",
      recoveryNote:
        "If no priorities appear, click 'Sync Career Gaps' to fetch the latest evaluation from Domain 4.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Active target role ID (`activeTargetRole.target_role_id`).",
        "Upstream skill gap records from Career Intelligence (`getLearningPriorities`).",
        "User roadmap records from PostgreSQL (`listUserRoadmaps`).",
      ],
      outputArtifacts: [
        "Personalized learning roadmaps (`LearningRoadmap` records in database).",
        "Aggregated learning statistics (completed steps, overall mastery, study hours).",
        "Candidate evidence deliverables generated upon mini-project submission.",
      ],
      originAndProcessing:
        "GET /api/v1/learning/overview and GET /api/v1/learning/priorities query the backend database and upstream adapters, aggregating progress with zero external inference calls on view.",
      generatedVsPersisted:
        "Roadmaps, steps, diagnostic attempts, and mini-project submissions are persisted in PostgreSQL. Overview summaries and cache states are managed by `learningCache.ts`.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "in_progress",
          badgeLabel: "In Progress",
          meaning: "Active roadmap currently being studied with partially completed steps.",
          nextAction: "Click 'Open Full Roadmap' to resume the next available step.",
        },
        {
          status: "completed",
          badgeLabel: "Mastery Reached",
          meaning: "All curriculum steps completed with overall mastery meeting or exceeding the target threshold (e.g. 85%).",
          nextAction: "Submit mini-project deliverable to convert mastery into candidate evidence.",
        },
        {
          status: "needs_diagnostic",
          badgeLabel: "Baseline Needed",
          meaning: "Domain blueprint selected but diagnostic check has not yet been completed.",
          nextAction: "Launch Diagnostic Assessment to calibrate your learning path.",
        },
      ],
      trustPrinciples: [
        "No Passive Credit: Simply opening a link or reading an article does not award verified skill credit.",
        "Deterministic Formula: Progress derives from an exact published formula (30% K + 25% P + 20% A + 25% Prj), not opaque AI estimations.",
        "Targeted ROI: Learning paths focus on actual verified skill gaps rather than generic full-length courses.",
      ],
      learningTrustCaveat:
        "Learning progress measures curriculum mastery. It does NOT automatically verify your professional Skill Passport without submitting verifiable deliverables for review.",
    },
    troubleshooting: [
      {
        symptom: "The overview shows 'No Learning Priorities Found'.",
        probableCause: "No active target role is selected or Career Intelligence has not identified skill gaps.",
        verifiedRemedy: "Select a target role in Career Intelligence (/app/career/roles) or click 'Sync Career Gaps'.",
      },
      {
        symptom: "Generated roadmap disappeared after page refresh.",
        probableCause: "Local client cache was invalidated before backend database write completed.",
        verifiedRemedy: "Click 'Refresh Roadmaps' or check /app/learning/roadmaps; all persisted paths are retrieved from PostgreSQL.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Personalized Learning Roadmap",
      nextStepAction: "Drill into step-by-step curriculum milestones and execute hands-on exercises.",
      targetRoute: "/app/learning/roadmaps",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with backend persistence, upstream Career Intelligence sync, and multi-roadmap switching.",
    },
    relatedLinks: [
      { label: "Personalized Roadmaps", href: "/app/learning/roadmaps" },
      { label: "Domain Blueprints", href: "/app/learning/domains" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
      { label: "Career Gaps", href: "/app/career/gaps" },
    ],
  },

  roadmaps: {
    id: "roadmaps",
    title: "Personalized Learning Roadmap Engine",
    shortTitle: "Learning Roadmap",
    canonicalRoute: "/app/learning/roadmaps",
    badgeLabel: "Feature · Curriculum Engine",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "Map",
    summary:
      "Follow an adaptive, sequenced learning journey generated specifically for your verified skill gaps, complete with prerequisite gating, estimated study durations, and milestone tracking.",
    purpose:
      "Deliver a concrete, step-by-step learning path tailored to your specific proficiency distance. The engine sequences topics in topological order, locks advanced steps until foundational concepts reach 60% mastery, and provides direct links to interactive study packets, practice sandboxes, and project rubrics.",
    whenToUse: [
      "When executing your day-to-day study sessions.",
      "When checking which steps are unlocked and ready for practice.",
      "When adjusting your study pace (Standard vs Fast-Track) or weekly study hour commitments.",
      "When managing multiple learning paths across different skill specializations.",
    ],
    whoCanUse: "All authenticated users pursuing structured capability growth.",
    prerequisites: [
      "A generated roadmap from Learning Overview or Domain Blueprint.",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Active Roadmap",
        action: "Choose a roadmap from the roadmaps catalogue or load your active path.",
        buttonOrPath: "List at /app/learning/roadmaps or direct path /app/learning/roadmaps/[pathId]",
        details:
          "Browse all saved roadmaps. The active path displays overall mastery, completed steps count, and domain title.",
      },
      {
        stepNumber: 2,
        title: "Review Step Sequence & Prerequisites",
        action: "Inspect the vertical timeline of roadmap steps.",
        buttonOrPath: "Roadmap Steps timeline cards",
        details:
          "Steps are color-coded: Green (Completed), Blue (In Progress), Sand (Available), Gray (Locked pending prerequisites).",
      },
      {
        stepNumber: 3,
        title: "Launch Step Study Packet",
        action: "Click 'Start Learning' or 'Continue' on any available step.",
        buttonOrPath: "Button: 'Open Study Packet' (/app/learning/steps/[stepId])",
        details:
          "Opens the interactive study packet with core concepts, validated reading/videos, and code exercises.",
      },
      {
        stepNumber: 4,
        title: "Complete Interactive Exercises & Assessments",
        action: "Work through the attached practice problems.",
        buttonOrPath: "Links: 'Practice Exercise' and 'Take Assessment'",
        details:
          "Passing practice problems and knowledge checks increases your topic mastery score in real time.",
      },
      {
        stepNumber: 5,
        title: "Mark Step Complete & Unlock Downstream Steps",
        action: "Click 'Mark as Complete' once objectives are satisfied.",
        buttonOrPath: "Button: 'Mark Step Complete' in study packet or roadmap",
        details:
          "Updates step status to 'completed', recalculates overall roadmap mastery, and unlocks downstream steps that depended on it.",
      },
    ],
    practicalExample: {
      title: "Executing Data Preprocessing Step: Outlier Treatment",
      startingState:
        "A learner is on step 2 of 'Data Preprocessing & Cleaning'. Step 1 (Missing Data Imputation) is completed at 75% mastery. Step 2 (Outlier Winsorization) is Available.",
      actionTaken:
        "The learner clicks 'Open Study Packet', reads the IQR threshold guide, runs the Python Winsorization sandbox exercise, and scores 100% on the code test.",
      resultingOutcome:
        "Topic mastery increases to 82%. The learner clicks 'Mark as Complete'. Step 2 turns green, overall roadmap mastery increases from 48% to 62%, and Step 3 (Feature Scaling) unlocks.",
      inspectionGuide:
        "Visit /app/learning/roadmaps to see the progress bar advance and Step 3 transition from 'Locked' to 'Available'.",
      recoveryNote:
        "If a step remains locked, hover over the lock icon to inspect which prerequisite topic fell below the 60% mastery threshold.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Domain blueprint structure (modules, topics, prerequisites, target mastery).",
        "Diagnostic test results (optional, enables fast-track acceleration).",
        "User preferences (study hours/week, preference: practice-first vs text-first).",
      ],
      outputArtifacts: [
        "Personalized `LearningRoadmap` object with ordered `RoadmapStep` array.",
        "Step completion events logged in `LearningHistory`.",
        "Recalculated domain mastery percentages.",
      ],
      originAndProcessing:
        "POST /api/v1/learning/roadmaps/generate builds the topological curriculum path via `backend/app/learning/logic.py` and stores it in PostgreSQL.",
      generatedVsPersisted:
        "The complete roadmap structure, individual step statuses, and attempt histories are persisted in PostgreSQL (`learning_roadmaps`, `roadmap_steps`).",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "available",
          badgeLabel: "Available",
          meaning: "Prerequisites are satisfied (>=60% mastery). Ready for immediate study.",
          nextAction: "Click 'Open Study Packet' to begin.",
        },
        {
          status: "in_progress",
          badgeLabel: "In Progress",
          meaning: "Currently being studied; practice exercises or concept checks partially completed.",
          nextAction: "Resume practice problems in the step sandbox.",
        },
        {
          status: "completed",
          badgeLabel: "Completed",
          meaning: "Learning objectives met and step marked complete.",
          nextAction: "Unlocks dependent downstream steps.",
        },
        {
          status: "locked",
          badgeLabel: "Locked",
          meaning: "Prerequisite topics have not yet achieved the required 60% mastery threshold.",
          nextAction: "Complete earlier prerequisite steps in the sequence.",
        },
        {
          status: "skipped",
          badgeLabel: "Fast-Track Skipped",
          meaning: "Learner demonstrated high baseline mastery (>=85%) on diagnostic check; step bypassed.",
          nextAction: "Can be reopened at any time if a refresher is needed.",
        },
      ],
      trustPrinciples: [
        "Prerequisite Integrity: Advanced topics cannot be brute-forced without establishing foundations.",
        "Personalized Gating: Diagnostic strengths allow accelerating past review steps without penalizing mastery.",
      ],
      learningTrustCaveat:
        "Completing all roadmap steps establishes strong curriculum mastery; it does NOT automatically award verified credentials in Skill Passport without submitting verifiable project artifacts.",
    },
    troubleshooting: [
      {
        symptom: "A step is locked even though I finished the previous step.",
        probableCause: "The previous step was marked complete, but its mastery score is below the 60% prerequisite threshold.",
        verifiedRemedy: "Open the previous step, complete additional practice exercises or quizzes to raise its mastery above 60%.",
      },
      {
        symptom: "Roadmap says 'Generation Failed'.",
        probableCause: "Selected domain blueprint has cyclic dependencies or missing topic data.",
        verifiedRemedy: "Return to /app/learning/domains and select a verified domain blueprint.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Step Study Packet & Sandbox",
      nextStepAction: "Dive into specific lessons, resources, and live coding exercises.",
      targetRoute: "/app/learning/steps",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with topological sequencing, prerequisite enforcement, fast-track skipping, and delete/regeneration capabilities.",
    },
    relatedLinks: [
      { label: "Learning Overview", href: "/app/learning" },
      { label: "Step Study Packet", href: "/app/learning/steps" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },

  domains: {
    id: "domains",
    title: "Domain Blueprints Curriculum Catalog",
    shortTitle: "Domain Blueprints",
    canonicalRoute: "/app/learning/domains",
    badgeLabel: "Feature · Curriculum Catalog",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "BookOpen",
    summary:
      "Explore structured, verified engineering domain curriculum architectures, reviewing modules, learning objectives, estimated durations, and prerequisite topic graphs.",
    purpose:
      "Provide transparent, standardized curriculum blueprints for engineering disciplines (e.g. Data Preprocessing, Distributed Systems, ML Engineering). Each blueprint defines what comprehensive mastery requires before any individual personalization is applied.",
    whenToUse: [
      "When reviewing the complete syllabus of an engineering domain.",
      "When deciding which engineering discipline to focus on next.",
      "When preparing to take a diagnostic assessment to calibrate your baseline.",
    ],
    whoCanUse: "All authenticated users exploring technical domains.",
    prerequisites: ["None. The domain blueprint catalog is accessible to all learners."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Browse Domain Catalog",
        action: "Explore available domain blueprint cards.",
        buttonOrPath: "Grid of Domain Cards at /app/learning/domains",
        details:
          "Each card shows the domain title, version (e.g. v2026.1), total modules, estimated hours, and target mastery goal (typically 85%).",
      },
      {
        stepNumber: 2,
        title: "Open Specific Domain Blueprint",
        action: "Click 'Inspect Blueprint' on any domain card.",
        buttonOrPath: "Button: 'Inspect Blueprint →' (/app/learning/domains/[domainId])",
        details:
          "Drill into the complete module breakdown, reviewing individual topics, learning objectives, difficulties, and prerequisites.",
      },
      {
        stepNumber: 3,
        title: "Inspect Module Topics & Prerequisite Chains",
        action: "Expand modules to review granular competencies.",
        buttonOrPath: "Module accordion headers",
        details:
          "Examine topic difficulty badges (Foundational, Intermediate, Advanced) and prerequisite linkages.",
      },
      {
        stepNumber: 4,
        title: "Launch Diagnostic Assessment",
        action: "Click 'Take Diagnostic Check' to establish baseline.",
        buttonOrPath: "Button: 'Take Diagnostic Check' (/app/learning/domains/[domainId]/diagnostic)",
        details:
          "Evaluates your current knowledge across the domain's topics to calibrate your personalized roadmap.",
      },
      {
        stepNumber: 5,
        title: "Generate Personalized Roadmap",
        action: "Click 'Generate Roadmap from Blueprint'.",
        buttonOrPath: "Button: 'Generate Roadmap →' (/app/learning/roadmaps)",
        details:
          "Instantiates a personalized learning journey based on this blueprint's curriculum standards.",
      },
    ],
    practicalExample: {
      title: "Exploring the Distributed Systems Architecture Blueprint",
      startingState:
        "A senior engineer wants to understand what topics are included in the 'Distributed Systems & Concurrency' domain.",
      actionTaken:
        "The engineer visits /app/learning/domains, selects 'Distributed Systems', and reviews the 3 modules: Consensus Protocols, Distributed Caching, and Message Queues.",
      resultingOutcome:
        "The engineer notes that 'Raft Consensus' lists 'TCP/IP Socket Basics' and 'Thread Synchronization' as prerequisites. They click 'Take Diagnostic Check' to test their existing baseline.",
      inspectionGuide:
        "Check the module list at /app/learning/domains/[domainId] to review all required topics.",
      recoveryNote:
        "If a domain appears empty, refresh the catalog to reload curated blueprint standards from PostgreSQL.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Curated DomainBlueprint records (`domain_id`, `modules`, `topics`, `version`).",
      ],
      outputArtifacts: [
        "Standardized curriculum specifications available for roadmap instantiation.",
        "Diagnostic test prompts associated with domain topics.",
      ],
      originAndProcessing:
        "GET /api/v1/learning/blueprints queries the PostgreSQL database via `backend/app/learning/blueprints.py`.",
      generatedVsPersisted:
        "Blueprints are versioned, permanent curriculum standards maintained by engineering domain specialists.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "blueprint_version",
          badgeLabel: "Standard v2026.1",
          meaning: "Curriculum aligned with current industry engineering standards and modern toolchains.",
          nextAction: "Guarantees relevant, non-obsolete learning objectives.",
        },
        {
          status: "target_mastery",
          badgeLabel: "Target: 85% Mastery",
          meaning: "The rigorous threshold required across Knowledge, Practice, Assessment, and Projects to graduate the domain.",
          nextAction: "Aim for 85%+ across all modules.",
        },
      ],
      trustPrinciples: [
        "Curated Industry Rubrics: Blueprints reflect production realities, not academic toy examples.",
        "Standardized Taxonomy: Domain topics map 1-to-1 with Skill Passport canonical competencies.",
      ],
      learningTrustCaveat:
        "A domain blueprint is a curriculum specification, not a personalized plan. Personalization happens when you generate a roadmap tailored to your specific gaps.",
    },
    troubleshooting: [
      {
        symptom: "Cannot generate roadmap from blueprint.",
        probableCause: "A roadmap for this domain already exists in your active list.",
        verifiedRemedy: "Open your existing roadmap in /app/learning/roadmaps or delete it before generating a new one.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Diagnostic Assessment",
      nextStepAction: "Test your existing knowledge baseline across domain topics.",
      targetRoute: "/app/learning/domains/[domainId]/diagnostic",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with module/topic hierarchies, prerequisite graphs, and direct diagnostic launch.",
    },
    relatedLinks: [
      { label: "Diagnostic Check", href: "/app/learning/domains/domain-data-preprocessing/diagnostic" },
      { label: "Personalized Roadmaps", href: "/app/learning/roadmaps" },
      { label: "Learning Overview", href: "/app/learning" },
    ],
  },

  diagnostic: {
    id: "diagnostic",
    title: "Diagnostic Assessment & Baseline Check",
    shortTitle: "Diagnostic Check",
    canonicalRoute: "/app/learning/domains/domain-data-preprocessing/diagnostic",
    badgeLabel: "Feature · Diagnostic Engine",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "CheckSquare",
    summary:
      "Establish an objective, data-backed knowledge baseline across a domain's topics before starting to study, enabling fast-track acceleration past topics you have already mastered.",
    purpose:
      "Eliminate redundant study. The diagnostic assessment tests 4 cognitive categories—Concept, Reasoning, Implementation, and Application—identifying specific strengths (>=75%) and prerequisite weaknesses (<75%) to calibrate your personalized roadmap.",
    whenToUse: [
      "Before starting a new domain blueprint to calibrate your starting mastery.",
      "When you already have practical experience and want to qualify for 'Fast-Track' step skipping.",
      "When diagnosing why advanced roadmap steps feel difficult by uncovering prerequisite concept gaps.",
    ],
    whoCanUse: "All authenticated users looking to assess their entry baseline.",
    prerequisites: ["An active domain blueprint selected."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Launch Diagnostic Assessment",
        action: "Navigate to the diagnostic page for your target domain.",
        buttonOrPath: "Button: 'Start Diagnostic Assessment' (/app/learning/domains/[domainId]/diagnostic)",
        details:
          "The diagnostic presents a series of targeted multi-choice questions covering all core topics in the domain.",
      },
      {
        stepNumber: 2,
        title: "Answer Questions Across 4 Cognitive Categories",
        action: "Select your answers for each question.",
        buttonOrPath: "Radio buttons for question options",
        details:
          "Questions evaluate conceptual definitions, trade-off reasoning, code implementation syntax, and real-world system architecture.",
      },
      {
        stepNumber: 3,
        title: "Submit Assessment for Instant Evaluation",
        action: "Click 'Submit Diagnostic Check'.",
        buttonOrPath: "Button: 'Submit Diagnostic Check' with checkmark icon",
        details:
          "Evaluated instantly using deterministic answer keys (`evaluateDiagnostic` in `learningCalculations.ts`).",
      },
      {
        stepNumber: 4,
        title: "Review Category & Topic Diagnostic Report",
        action: "Examine your overall score and categorical breakdowns.",
        buttonOrPath: "Diagnostic Results Summary Card",
        details:
          "Review your Concept Score, Reasoning Score, Implementation Score, and Application Score, plus specific Strong vs Weak topics.",
      },
      {
        stepNumber: 5,
        title: "Generate Calibrated Roadmap",
        action: "Click 'Generate Calibrated Roadmap'.",
        buttonOrPath: "Button: 'Generate Calibrated Roadmap →' (/app/learning/roadmaps)",
        details:
          "Instantiates a roadmap where topics scored >=85% are automatically fast-tracked, and weak topics are prioritized.",
      },
    ],
    practicalExample: {
      title: "Taking the Data Preprocessing Diagnostic Check",
      startingState:
        "A developer has written Python scripts for data cleaning, but never formally studied pipeline leakage.",
      actionTaken:
        "The developer takes the 8-question Data Preprocessing Diagnostic. They answer Missing Data questions correctly (100%), but miss questions on Pipeline Leakage and Robust Scaling (50%).",
      resultingOutcome:
        "Overall score: 68%. Strong topics: Missing Value Imputation (85%). Weak topics: Pipeline Leakage (50%), Robust Scaling (40%). When the calibrated roadmap is generated, Missing Value Imputation is marked fast-track completed, while Pipeline Leakage is positioned as Step 1.",
      inspectionGuide:
        "Inspect the 'Topic Breakdown' in the diagnostic results card to verify individual percentage scores.",
      recoveryNote:
        "Diagnostics can be retaken at any time to establish an updated baseline as your knowledge grows.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Diagnostic question bank (`DiagnosticQuestion[]` with category, topic_id, correct_index).",
        "User answer submissions (`Record<string, number>`).",
      ],
      outputArtifacts: [
        "`DiagnosticResult` record with overall score, 4-category scores, and topic-level scores.",
        "Strong topics list (>=75%) and weak topics list (<75%).",
        "Recommended focus topics for roadmap generation.",
      ],
      originAndProcessing:
        "POST /api/v1/learning/blueprints/{domain_id}/diagnostic/submit processes submissions deterministically on the backend.",
      generatedVsPersisted:
        "Diagnostic results are saved to PostgreSQL with timestamps, allowing historical comparison across attempts.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "strong_topic",
          badgeLabel: "Strong Baseline (>=75%)",
          meaning: "Demonstrated reliable knowledge on diagnostic check. Qualifies for fast-track acceleration.",
          nextAction: "Review step can be skipped or bypassed in roadmap.",
        },
        {
          status: "weak_topic",
          badgeLabel: "Focus Area (<75%)",
          meaning: "Concept or implementation gaps detected. Essential to study before tackling advanced topics.",
          nextAction: "Given high priority and prerequisite placement in generated roadmap.",
        },
      ],
      trustPrinciples: [
        "Objective Knowledge Gating: Fast-track skipping is awarded only upon passing objective diagnostic checks.",
        "Diagnostic Not Professional Verification: A diagnostic test measures learning baseline; it does not certify professional competence.",
      ],
      learningTrustCaveat:
        "Scoring 100% on a diagnostic check proves strong academic understanding of the questions; it does NOT constitute verified workplace competency in Skill Passport.",
    },
    troubleshooting: [
      {
        symptom: "Diagnostic questions fail to load.",
        probableCause: "Network interruption or invalid domain identifier in URL.",
        verifiedRemedy: "Return to /app/learning/domains and re-launch the diagnostic from an active domain card.",
      },
      {
        symptom: "Score calculation appears incorrect.",
        probableCause: "Unanswered questions are scored as incorrect (0 points).",
        verifiedRemedy: "Ensure all questions have an option selected before clicking submit.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Personalized Learning Roadmap",
      nextStepAction: "Generate a calibrated roadmap reflecting your diagnostic strengths and weaknesses.",
      targetRoute: "/app/learning/roadmaps",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with 4-category scoring, topic breakdowns, and instant roadmap calibration.",
    },
    relatedLinks: [
      { label: "Domain Blueprints", href: "/app/learning/domains" },
      { label: "Personalized Roadmaps", href: "/app/learning/roadmaps" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },

  progress: {
    id: "progress",
    title: "Progress & 4-Signal Mastery Engine",
    shortTitle: "Mastery Formula",
    canonicalRoute: "/app/learning/progress",
    badgeLabel: "Feature · Mastery Analytics",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "LineChart",
    summary:
      "Inspect your verified progress across domain topics using an exact, deterministic 4-signal mastery formula (30% Knowledge + 25% Practice + 20% Assessment + 25% Project), or simulate mastery outcomes using interactive signal sliders.",
    purpose:
      "Replace subjective 'completion percentages' with rigorous, explainable capability measurement. Unlike platforms that award 100% completion simply for letting a video play in the background, Skill Passport's Mastery Engine requires balanced demonstration across four concrete signals.",
    whenToUse: [
      "When auditing why a specific topic hasn't reached the 85% target mastery threshold.",
      "When using the interactive simulator to plan what activity (practice, assessment, or mini-project) will yield the biggest mastery increase.",
      "When reviewing growth deltas from your initial diagnostic baseline to current achievement.",
    ],
    whoCanUse: "All authenticated users tracking topic-level mastery.",
    prerequisites: ["An active domain blueprint and roadmap with progress data."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review High-Level Mastery Summary",
        action: "Examine overall mastery, baseline, target, and growth delta.",
        buttonOrPath: "Top hero cards at /app/learning/progress",
        details:
          "Shows your average mastery across all domain topics, baseline starting score from diagnostic, and net capability growth.",
      },
      {
        stepNumber: 2,
        title: "Select Topic for Granular Breakdown",
        action: "Click a topic from the topic selection list.",
        buttonOrPath: "Topic selector buttons or table rows",
        details:
          "Loads the 4 component signal bars: Knowledge Signal (K), Practice Signal (P), Assessment Signal (A), and Project Signal (Prj).",
      },
      {
        stepNumber: 3,
        title: "Open Mastery Formula Explanation",
        action: "Click 'Inspect Formula' button.",
        buttonOrPath: "Button: 'Inspect Formula' (opens MasteryFormulaModal)",
        details:
          "Reviews the mathematical weights: 0.30 K + 0.25 P + 0.20 A + 0.25 Prj and explains each signal's evaluation criteria.",
      },
      {
        stepNumber: 4,
        title: "Simulate Mastery with Interactive Sliders",
        action: "Drag K, P, A, and Prj sliders in the simulation panel.",
        buttonOrPath: "Sliders: Knowledge (30%), Practice (25%), Assessment (20%), Project (25%)",
        details:
          "Observe how improving specific signals (e.g. submitting a mini-project) dynamically impacts your simulated mastery score.",
      },
      {
        stepNumber: 5,
        title: "Switch View Modes",
        action: "Toggle between Visual Cards and Detail Table view.",
        buttonOrPath: "Toggle buttons: 'Visual' vs 'Table'",
        details:
          "Table view displays all topics simultaneously with numerical signal columns and tier badges (Novice, Developing, Proficient, Advanced).",
      },
    ],
    practicalExample: {
      title: "Diagnosing Why Outlier Winsorization is at 56% Mastery",
      startingState:
        "A learner's topic mastery for Outlier Winsorization is 56% (Developing tier). They need 85% to reach Advanced mastery.",
      actionTaken:
        "The learner opens /app/learning/progress and inspects the 4 signals: Knowledge is 90% (diagnostic passed), Practice is 80% (code exercise solved), but Assessment is 0% and Project is 0%.",
      resultingOutcome:
        "Using the simulator, the learner sees that completing the topic assessment (scoring 80%) would lift mastery to 72% (Proficient), and submitting the mini-project deliverable (scoring 85%) would push mastery to 93% (Advanced).",
      inspectionGuide:
        "Move the Assessment slider to 80 and Project slider to 85; watch the simulated dial reach 93%.",
      recoveryNote:
        "Click 'Reset Simulation' to revert sliders to your actual recorded database values.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Topic signals: `knowledge_signal`, `practice_signal`, `assessment_signal`, `project_signal`.",
        "Diagnostic baseline score and target mastery threshold.",
      ],
      outputArtifacts: [
        "Deterministic Topic Mastery score (0–100%).",
        "Mastery Tier classification (Novice <40, Developing 40–69, Proficient 70–84, Advanced >=85).",
        "Growth delta analytics.",
      ],
      originAndProcessing:
        "Calculated via `calculateTopicMastery(k, p, a, prj)` in `src/lib/learningCalculations.ts` on the client and mirrored by `/api/v1/learning/mastery` on the backend.",
      generatedVsPersisted:
        "Individual signal scores are updated by practice, assessment, and project events and persisted in PostgreSQL. Overall mastery is computed deterministically.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "advanced",
          badgeLabel: "Advanced Mastery (>=85%)",
          meaning: "Balanced excellence across knowledge, practical code execution, formal assessment, and applied project deliverable.",
          nextAction: "Eligible for conversion to Candidate Evidence for Skill Passport verification.",
        },
        {
          status: "proficient",
          badgeLabel: "Proficient (70–84%)",
          meaning: "Solid operational capability; minor deficits in formal assessment or project scope remain.",
          nextAction: "Complete remaining project rubric requirements.",
        },
        {
          status: "developing",
          badgeLabel: "Developing (40–69%)",
          meaning: "Foundations established through reading or practice, but lacks independent project demonstration.",
          nextAction: "Undertake applied mini-project challenge.",
        },
        {
          status: "novice",
          badgeLabel: "Novice (<40%)",
          meaning: "Early stage; concepts not yet demonstrated in code exercises.",
          nextAction: "Begin step study packet and practice sandbox.",
        },
      ],
      trustPrinciples: [
        "Multi-Signal Requirement: You cannot achieve Advanced mastery through multiple-choice quizzes alone; code projects comprise 25% of the score.",
        "Mathematical Parity: All scores round strictly to integer percentages with zero hidden curve adjustments.",
      ],
      learningTrustCaveat:
        "100% learning mastery proves curriculum completion; it does NOT automatically verify your professional Skill Passport. Project deliverables must be submitted to the Verification Center for authoritative review.",
    },
    troubleshooting: [
      {
        symptom: "Mastery score didn't change after reading an article.",
        probableCause: "Content reading does not contribute to mastery signals without completing practice or knowledge checks.",
        verifiedRemedy: "Solve the attached practice problem or complete the topic assessment to increase your score.",
      },
      {
        symptom: "Simulation values overwrote my real scores.",
        probableCause: "Simulation is temporary client state only; it never writes to the database.",
        verifiedRemedy: "Switch topics or refresh the page to reload your genuine recorded scores.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Updated Capability Ledger",
      nextStepAction: "Review newly demonstrated capabilities ready for verification.",
      targetRoute: "/app/learning/capability",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with interactive 4-signal sliders, dual visual/table views, and formula modal.",
    },
    relatedLinks: [
      { label: "Updated Capability", href: "/app/learning/capability" },
      { label: "Personalized Roadmaps", href: "/app/learning/roadmaps" },
      { label: "Mini-Projects", href: "/app/learning/projects" },
    ],
  },

  practice: {
    id: "practice",
    title: "Practice Exercises & Live Code Sandbox",
    shortTitle: "Practice Exercises",
    canonicalRoute: "/app/learning/practice",
    badgeLabel: "Feature · Code Sandbox",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "Code2",
    summary:
      "Execute hands-on coding challenges and syntax completion exercises in an interactive sandbox with real-time validation against objective-specific test suites.",
    purpose:
      "Bridge the gap between theoretical reading and working code. The Practice Exercise engine presents concrete implementation tasks (e.g. implementing IQR outlier clipping in Python), tests code against unit assertions, and directly feeds the Practice Signal (25%) in your mastery calculation.",
    whenToUse: [
      "When completing hands-on exercises assigned to an active roadmap step.",
      "When testing code implementations before submitting a full mini-project repository.",
      "When refreshing syntax and library usage for specific engineering techniques.",
    ],
    whoCanUse: "All authenticated users completing code exercises.",
    prerequisites: ["An active roadmap step or practice exercise selected."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Practice Challenge",
        action: "Choose an exercise from the practice list.",
        buttonOrPath: "Exercise cards at /app/learning/practice",
        details:
          "Exercises specify programming language (Python, TypeScript, SQL), difficulty tier, and estimated completion time.",
      },
      {
        stepNumber: 2,
        title: "Read Problem Statement & Constraints",
        action: "Review expected inputs, outputs, and edge cases.",
        buttonOrPath: "Problem Description panel",
        details:
          "Includes sample input/output fixtures and explicit algorithmic constraints.",
      },
      {
        stepNumber: 3,
        title: "Write Implementation Code",
        action: "Edit your solution in the embedded code editor.",
        buttonOrPath: "Code Editor text area",
        details:
          "Pre-populated with function stubs and type hints to guide your solution.",
      },
      {
        stepNumber: 4,
        title: "Run Code Validation Suite",
        action: "Click 'Run Code Validation'.",
        buttonOrPath: "Button: 'Run Code Validation' with play icon",
        details:
          "Validates syntax and executes test cases via `POST /api/v1/learning/practice/validate`.",
      },
      {
        stepNumber: 5,
        title: "Inspect Test Output & Pass Criteria",
        action: "Review console logs and test case status.",
        buttonOrPath: "Test Output panel",
        details:
          "Passing all test cases records a successful practice attempt, advancing your Practice Signal toward 100%.",
      },
    ],
    practicalExample: {
      title: "Solving the Winsorization Clipping Function in Python",
      startingState:
        "A learner opens the practice exercise 'Implement Winsorization (Percentile Capping)'.",
      actionTaken:
        "The learner implements `np.clip(data, lower_percentile, upper_percentile)` and clicks 'Run Code Validation'.",
      resultingOutcome:
        "All 4 test cases pass (Normal array, Skewed array, Empty array exception, NaN handling). The Practice Signal for Outlier Treatment increases from 0% to 100%.",
      inspectionGuide:
        "Check the green 'All Tests Passed' banner in the sandbox.",
      recoveryNote:
        "If an assertion fails, error tracebacks display the input argument and expected vs actual return values.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Exercise prompt, starter code, and test assertions.",
        "Learner code submission string.",
      ],
      outputArtifacts: [
        "`CodeValidationResponse` with pass/fail boolean, execution output, and execution time.",
        "Updated practice signal in topic progress record.",
      ],
      originAndProcessing:
        "Validated securely on backend execution sandboxes or client-side deterministic runners.",
      generatedVsPersisted:
        "Successful practice attempts are logged in `LearningHistory` and update the topic's `practice_signal` in PostgreSQL.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "passed",
          badgeLabel: "Tests Passed",
          meaning: "Implementation satisfies all unit test assertions and edge case fixtures.",
          nextAction: "Advances topic Practice Signal (25% of mastery).",
        },
        {
          status: "failed",
          badgeLabel: "Assertion Failed",
          meaning: "Code executed but returned incorrect output for one or more test cases.",
          nextAction: "Inspect failure logs and refine implementation.",
        },
      ],
      trustPrinciples: [
        "Verifiable Code Execution: Practice credit requires running code that passes unit tests, not checkbox self-attestation.",
      ],
      learningTrustCaveat:
        "Solving a practice exercise demonstrates syntax familiarity; it does not constitute full professional production experience on your Skill Passport.",
    },
    troubleshooting: [
      {
        symptom: "Code editor displays a syntax error immediately.",
        probableCause: "Missing indentation, unclosed brackets, or syntax error in submission.",
        verifiedRemedy: "Check line numbers cited in the error banner and correct syntax.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Knowledge Assessments",
      nextStepAction: "Test your theoretical and applied understanding with a formal assessment.",
      targetRoute: "/app/learning/assessments",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with interactive code editor, test assertions, and instant mastery signal updates.",
    },
    relatedLinks: [
      { label: "Knowledge Assessments", href: "/app/learning/assessments" },
      { label: "Step Study Packet", href: "/app/learning/steps" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },

  assessments: {
    id: "assessments",
    title: "Knowledge Assessments & Formative Evaluations",
    shortTitle: "Assessments",
    canonicalRoute: "/app/learning/assessments",
    badgeLabel: "Feature · Formative Testing",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "CheckCircle2",
    summary:
      "Undertake formal, rubric-evaluated assessments measuring conceptual clarity and applied problem-solving, with automated remediation routing if scores fall below passing thresholds.",
    purpose:
      "Ensure robust understanding before advancing to complex projects. Assessments evaluate topic objectives with passing thresholds (typically 70%), providing detailed feedback on missed concepts and automatically generating targeted remediation sessions if needed.",
    whenToUse: [
      "Upon completing study packet lessons and practice exercises for a topic.",
      "When validating comprehension of complex architectural patterns.",
      "When required by an active roadmap step to unlock downstream modules.",
    ],
    whoCanUse: "All authenticated users completing formative assessments.",
    prerequisites: ["Completion of prerequisite practice exercises recommended."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Assessment",
        action: "Choose an assessment from the catalogue or launch from roadmap.",
        buttonOrPath: "Assessment cards at /app/learning/assessments",
        details:
          "Displays assessment title, question count (e.g. 10 questions), time limit, and passing threshold (e.g. 70%).",
      },
      {
        stepNumber: 2,
        title: "Answer Concept & Application Questions",
        action: "Work through questions within the session window.",
        buttonOrPath: "Option selection buttons and navigation pills",
        details:
          "Includes conceptual questions and applied scenario evaluations (e.g. identifying data leakage in a pipeline diagram).",
      },
      {
        stepNumber: 3,
        title: "Submit for Automated Evaluation",
        action: "Click 'Submit Assessment'.",
        buttonOrPath: "Button: 'Submit Assessment' with checkmark",
        details:
          "Evaluates total score, concept score, application score, and objective-level pass/fail states via `evaluateAssessmentAttempt`.",
      },
      {
        stepNumber: 4,
        title: "Review Objective Breakdown & Feedback",
        action: "Inspect your attempt results card.",
        buttonOrPath: "Assessment Results page",
        details:
          "Passed assessments update your Assessment Signal (20% of mastery) to 100%. Scores below 70% generate a remediation plan.",
      },
      {
        stepNumber: 5,
        title: "Access Remediation if Threshold Not Met",
        action: "Click 'Launch Remediation Session' if failed.",
        buttonOrPath: "Button: 'Review Remediation Packet' (/app/learning/remediation/[attemptId])",
        details:
          "Presents focused review notes on the exact questions missed, preparing you for a retake.",
      },
    ],
    practicalExample: {
      title: "Taking the Data Preprocessing Knowledge Assessment",
      startingState:
        "A learner finishes studying Imputation and Scaling and takes the 10-question formative assessment.",
      actionTaken:
        "The learner submits the assessment, answering 8 of 10 questions correctly (Score: 80%).",
      resultingOutcome:
        "The assessment passes (Threshold: 70%). Concept Score is 85%, Application Score is 75%. The topic Assessment Signal jumps to 80%, advancing overall roadmap mastery.",
      inspectionGuide:
        "Review the 'Objective Results' table on the assessment attempt screen to see green checks across covered topics.",
      recoveryNote:
        "If score is 60%, the system displays 'Remediation Recommended' and keeps the assessment signal discounted until retaken.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "`KnowledgeAssessment` model with question items and passing threshold.",
        "Learner answer selections (`Record<string, number>`).",
      ],
      outputArtifacts: [
        "`AssessmentAttempt` record with total score, passed boolean, and objective results.",
        "Remediation packet if failed (`/app/learning/remediation/[attemptId]`).",
      ],
      originAndProcessing:
        "POST /api/v1/learning/assessments/{id}/submit evaluates answers and logs attempt records in PostgreSQL.",
      generatedVsPersisted:
        "All attempts, scores, and timestamps are permanently persisted in PostgreSQL (`assessment_attempts`).",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "passed",
          badgeLabel: "Passed (>=70%)",
          meaning: "Satisfied formative evaluation standard. Updates Assessment Signal.",
          nextAction: "Proceed to Mini-Project challenge.",
        },
        {
          status: "needs_remediation",
          badgeLabel: "Remediation Needed (<70%)",
          meaning: "Score fell below passing threshold; key concept deficits detected.",
          nextAction: "Review targeted remediation packet before retaking.",
        },
      ],
      trustPrinciples: [
        "Objective Rubric Scoring: Questions have deterministic answer keys with clear rationale explanations.",
        "Formative Not Summative: Assessments guide learning growth rather than penalizing historical records.",
      ],
      learningTrustCaveat:
        "Passing a multiple-choice assessment confirms conceptual understanding; it does not replace original code deliverables required for Skill Passport verification.",
    },
    troubleshooting: [
      {
        symptom: "Cannot submit assessment.",
        probableCause: "One or more required questions have not been answered.",
        verifiedRemedy: "Use the question navigation pills to locate unanswered items, select answers, then submit.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Mini-Projects",
      nextStepAction: "Synthesize your knowledge by building a real-world repository deliverable.",
      targetRoute: "/app/learning/projects",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with timed sessions, objective breakdowns, automated remediation, and PostgreSQL persistence.",
    },
    relatedLinks: [
      { label: "Mini-Projects", href: "/app/learning/projects" },
      { label: "Practice Exercises", href: "/app/learning/practice" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },

  projects: {
    id: "projects",
    title: "Mini-Projects & Applied Deliverables Engine",
    shortTitle: "Mini-Projects",
    canonicalRoute: "/app/learning/projects",
    badgeLabel: "Feature · Applied Deliverables",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "FileCode",
    summary:
      "Build tangible, production-grade code repositories evaluated against explicit rubrics, converting learning milestones into candidate evidence deliverables for Skill Passport verification.",
    purpose:
      "Act as the authoritative bridge between Domain 5 (Learning) and Domain 1/2 (Evidence & Verification). Submitting a completed GitHub repository deliverable for a mini-project fulfills the Project Signal (25% of mastery) and automatically creates a `CandidateLearningEvidence` artifact ready for review.",
    whenToUse: [
      "When concluding study on an engineering domain to prove applied execution.",
      "When converting learning progress into verifiable portfolio assets.",
      "When fulfilling the mini-project prerequisite to unlock Advanced (85%+) mastery.",
    ],
    whoCanUse: "All authenticated users submitting applied project repositories.",
    prerequisites: ["Topic practice exercises and assessments completed."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Mini-Project Brief",
        action: "Choose an applied project challenge.",
        buttonOrPath: "Project cards at /app/learning/projects",
        details:
          "Projects detail realistic business scenarios (e.g. building an End-to-End Data Cleaning Pipeline with Automated Testing).",
      },
      {
        stepNumber: 2,
        title: "Inspect Project Rubric & Requirements",
        action: "Review rubric criteria and required deliverables.",
        buttonOrPath: "Section: 'Evaluation Rubric & Acceptance Criteria'",
        details:
          "Rubrics specify requirements: modular code structure, unit test coverage, documentation, and error handling.",
      },
      {
        stepNumber: 3,
        title: "Build Repository Deliverable",
        action: "Develop the project in your personal GitHub or Git repository.",
        buttonOrPath: "External Git development",
        details:
          "Write clean, production-ready code with clear commit history.",
      },
      {
        stepNumber: 4,
        title: "Submit Repository URL & Summary Notes",
        action: "Submit your project in the submission form.",
        buttonOrPath: "Form: 'Submit Project Deliverable' with URL input",
        details:
          "Provide the public GitHub repository URL and summary notes detailing your architectural choices.",
      },
      {
        stepNumber: 5,
        title: "Generate Candidate Evidence Artifact",
        action: "Confirm submission to generate evidence.",
        buttonOrPath: "Button: 'Submit for Evaluation & Evidence Creation'",
        details:
          "Calls `createCandidateEvidenceFromProject`, creating a `CandidateLearningEvidence` item in Domain 1 (Evidence Workspace) and setting your Project Signal to 100%.",
      },
    ],
    practicalExample: {
      title: "Submitting the Robust Outlier Pipeline Deliverable",
      startingState:
        "A learner completes practice exercises and builds a GitHub repo: `github.com/learner/robust-data-pipeline` containing modular Python classes and pytest tests.",
      actionTaken:
        "The learner visits /app/learning/projects/proj-outlier-pipeline, enters the repository URL, adds architecture notes, and clicks 'Submit'.",
      resultingOutcome:
        "The submission succeeds. Project Signal reaches 100%, lifting topic mastery past 85% ('Advanced'). Simultaneously, an evidence artifact is registered in Evidence Workspace (/app/evidence) with provenance 'Submitted via SkillPassport Mini-Project'.",
      inspectionGuide:
        "Visit /app/evidence to see the new deliverable card, then check /app/passport/candidates to verify it appears in Candidate Review.",
      recoveryNote:
        "If the repository URL is invalid or inaccessible, an error banner prompts you to verify public visibility before submitting.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Mini-project specification with rubric criteria.",
        "Learner submission: GitHub repository URL and summary notes.",
      ],
      outputArtifacts: [
        "`MiniProjectAttempt` record in PostgreSQL.",
        "`CandidateLearningEvidence` artifact registered in Evidence Workspace.",
        "Updated Project Signal (25%) in topic mastery calculation.",
      ],
      originAndProcessing:
        "POST /api/v1/learning/projects/submit processes submissions and triggers candidate evidence creation via `backend/app/learning/router.py`.",
      generatedVsPersisted:
        "Submissions and linked evidence records are permanently stored in PostgreSQL (`mini_project_attempts`, `evidence_items`).",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "candidate_created",
          badgeLabel: "Candidate Evidence Created",
          meaning: "Repository deliverable recorded and registered as candidate proof awaiting human review in Verification Center.",
          nextAction: "Reviewers inspect code authorship in Candidate Review (/app/passport/candidates).",
        },
        {
          status: "submitted",
          badgeLabel: "Deliverable Submitted",
          meaning: "Submission received; satisfies the 25% Project Signal in learning mastery.",
          nextAction: "Mastery increases immediately; verification follows review.",
        },
      ],
      trustPrinciples: [
        "Artifact Grounded: Evidence derives from attributable code repositories, not self-declarations.",
        "Clear Separation: Submitting a project updates learning progress immediately, but requires human verification clearance to become a verified credential.",
      ],
      learningTrustCaveat:
        "Submitting a mini-project creates *candidate* evidence; it does NOT automatically confer a *verified* skill until reviewed in Trust Center.",
    },
    troubleshooting: [
      {
        symptom: "Submission rejected: 'Invalid Repository URL'.",
        probableCause: "The provided URL is not a valid HTTPS Git repository link or is a private repo without access.",
        verifiedRemedy: "Ensure the repository is public and format the URL as `https://github.com/username/repository`.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Candidate Review & Verification Center",
      nextStepAction: "Reviewers inspect candidate evidence to promote skills to verified status.",
      targetRoute: "/app/passport/candidates",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with rubric displays, repository submission forms, and automated candidate evidence generation.",
    },
    relatedLinks: [
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Evidence Workspace", href: "/app/evidence" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },

  resources: {
    id: "resources",
    title: "Curated Multi-Source Learning Resources",
    shortTitle: "Curated Resources",
    canonicalRoute: "/app/learning/resources",
    badgeLabel: "Feature · Resource Catalog",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "Layers",
    summary:
      "Explore vetted, multi-format learning resources (YouTube videos, GitHub repositories, Dev.to articles, FreeCodeCamp guides) validated for availability and relevance.",
    purpose:
      "Eliminate search fatigue by aggregating high-quality, verified technical references directly mapped to specific domain competencies. Every resource is categorized by format, difficulty, and estimated study time, with automated health checks that filter out broken or dead links.",
    whenToUse: [
      "When researching a specific topic before attempting practice problems.",
      "When seeking comprehensive video tutorials or in-depth technical documentation.",
      "When browsing open-source code repositories demonstrating production implementations.",
    ],
    whoCanUse: "All authenticated users accessing technical resources.",
    prerequisites: ["None. The curated resources catalog is open to all learners."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Search & Filter Resources",
        action: "Filter by resource type or search keywords.",
        buttonOrPath: "Filter pills: 'All Types', 'Video', 'Article', 'Repository', 'Documentation'",
        details:
          "Narrow down by format, topic tag, or difficulty level.",
      },
      {
        stepNumber: 2,
        title: "Inspect Resource Card Details",
        action: "Review resource metadata.",
        buttonOrPath: "Individual Resource Cards at /app/learning/resources",
        details:
          "Cards show author attribution, publication platform, estimated study time, and verified availability badge.",
      },
      {
        stepNumber: 3,
        title: "Launch Resource Viewer",
        action: "Click 'View Resource' to open the details view.",
        buttonOrPath: "Button: 'View Resource →' (/app/learning/resources/[resourceId])",
        details:
          "Includes key takeaways, concept highlights, and direct external links to the original publisher.",
      },
      {
        stepNumber: 4,
        title: "Revalidate Resource Cache",
        action: "Admins or reviewers can trigger live health checks.",
        buttonOrPath: "Button: 'Revalidate Links' (calls /api/v1/learning/resources/revalidate-cache)",
        details:
          "Checks upstream provider availability to ensure zero dead links.",
      },
    ],
    practicalExample: {
      title: "Locating a Guide on Data Leakage in Preprocessing Pipelines",
      startingState:
        "A learner wants to understand how Scikit-Learn pipelines prevent train/test leakage.",
      actionTaken:
        "The learner filters resources by 'Article' and searches 'Leakage'.",
      resultingOutcome:
        "A curated Dev.to technical guide 'Preventing Data Leakage with Pipeline and ColumnTransformer' is returned with key takeaways and verified availability.",
      inspectionGuide:
        "Click the card to read key takeaways before opening the external link.",
      recoveryNote:
        "If a video is geo-restricted, alternative article and repository resources for the same objective are provided.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Curated resource catalog records (`resource_id`, `url`, `type`, `domain_id`, `topic_id`).",
      ],
      outputArtifacts: [
        "Aggregated multi-provider resource recommendations.",
        "Availability validation telemetry.",
      ],
      originAndProcessing:
        "GET /api/v1/learning/resources/search queries `backend/app/learning/providers/aggregator.py` across YouTube, GitHub, Dev.to, and FreeCodeCamp.",
      generatedVsPersisted:
        "Curated metadata is persisted in PostgreSQL; live availability states are cached and revalidated periodically.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verified_available",
          badgeLabel: "Link Verified",
          meaning: "Upstream URL verified as active and accessible by provider health checks.",
          nextAction: "Safe for immediate study.",
        },
        {
          status: "cached_snapshot",
          badgeLabel: "Curated Benchmark",
          meaning: "Metadata cached locally to ensure fast access even during third-party API downtime.",
          nextAction: "Open resource directly.",
        },
      ],
      trustPrinciples: [
        "No Broken Links: Periodic upstream health validation prevents dead bookmarks.",
        "Attribution Integrity: Resources credit original content authors and platforms accurately.",
      ],
      learningTrustCaveat:
        "Opening or reading a curated resource does NOT award verified skill credit. Proof requires completing practice exercises and code deliverables.",
    },
    troubleshooting: [
      {
        symptom: "External link fails to open in new tab.",
        probableCause: "Browser pop-up blocker blocked the external window.",
        verifiedRemedy: "Allow pop-ups for this site or copy the direct URL shown in the resource details card.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Practice Exercises",
      nextStepAction: "Apply concepts learned from resources into live code exercises.",
      targetRoute: "/app/learning/practice",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with multi-source aggregation (YouTube, GitHub, Dev.to, FreeCodeCamp) and automated link validation.",
    },
    relatedLinks: [
      { label: "Practice Exercises", href: "/app/learning/practice" },
      { label: "Step Study Packet", href: "/app/learning/steps" },
      { label: "Domain Blueprints", href: "/app/learning/domains" },
    ],
  },

  history: {
    id: "history",
    title: "Learning History & Audit Trail",
    shortTitle: "Learning History",
    canonicalRoute: "/app/learning/history",
    badgeLabel: "Feature · Audit Trail",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "History",
    summary:
      "Review a chronological, immutable audit log of all completed roadmap steps, diagnostic runs, assessment attempts, and mini-project submissions.",
    purpose:
      "Ensure complete transparency and auditability for capability development. The Learning History records actor attribution, timestamps, score deltas, and linked deliverable URLs, providing clear proof of effort for performance reviews and career coaching.",
    whenToUse: [
      "When verifying when a specific roadmap step or assessment was completed.",
      "When auditing learning engagement over the past quarter or month.",
      "When presenting learning milestones during an engineering leveling review.",
    ],
    whoCanUse: "All authenticated users inspecting chronological activity records.",
    prerequisites: ["At least one completed learning action (step, assessment, or project)."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Learning History",
        action: "Navigate to the history page.",
        buttonOrPath: "Sidebar → Learning History (/app/learning/history)",
        details:
          "Renders a vertical timeline of all learning activity events.",
      },
      {
        stepNumber: 2,
        title: "Filter by Activity Type",
        action: "Filter timeline events.",
        buttonOrPath: "Filter buttons: 'All Events', 'Steps Completed', 'Assessments', 'Projects', 'Diagnostics'",
        details:
          "Isolate specific milestone categories.",
      },
      {
        stepNumber: 3,
        title: "Inspect Event Details",
        action: "Expand any event card.",
        buttonOrPath: "Timeline event cards",
        details:
          "Review event metadata: timestamp, score achieved, domain ID, step title, and linked deliverable repository URL.",
      },
    ],
    practicalExample: {
      title: "Auditing Completed Milestones for Quarterly Review",
      startingState:
        "An engineer needs to document learning contributions made during Q1.",
      actionTaken:
        "The engineer visits /app/learning/history, filters by 'Projects' and 'Steps Completed'.",
      resultingOutcome:
        "The timeline exports 6 completed steps and 1 mini-project submission with timestamps, repository links, and 85% mastery scores.",
      inspectionGuide:
        "Review chronological timestamps to trace learning progression over time.",
      recoveryNote:
        "History events are append-only and cannot be manually modified or deleted.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Logged `LearningHistory` records in PostgreSQL.",
      ],
      outputArtifacts: [
        "Chronological audit timeline with filtering capabilities.",
      ],
      originAndProcessing:
        "GET /api/v1/learning/history queries the backend database, returning immutable event logs.",
      generatedVsPersisted:
        "Events are permanently stored in PostgreSQL (`learning_history_events`).",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "logged_event",
          badgeLabel: "Audit Verified",
          meaning: "Event permanently recorded with cryptographic user attribution and server timestamp.",
          nextAction: "Provides verifiable proof of learning engagement.",
        },
      ],
      trustPrinciples: [
        "Append-Only Immutability: Historical completion records cannot be retroactively edited.",
        "Complete Attribution: Every event records the user ID, timestamp, and substantiating artifacts.",
      ],
      learningTrustCaveat:
        "Learning history documents past study activity; it does not replace current competency evaluations in Skill Passport.",
    },
    troubleshooting: [
      {
        symptom: "Recent step completion does not appear in history.",
        probableCause: "Page is displaying cached timeline state.",
        verifiedRemedy: "Refresh the page to fetch the latest audit events from PostgreSQL.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Updated Capability Ledger",
      nextStepAction: "Inspect aggregated newly acquired competencies.",
      targetRoute: "/app/learning/capability",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with event filtering, timestamps, and deliverable links.",
    },
    relatedLinks: [
      { label: "Updated Capability", href: "/app/learning/capability" },
      { label: "Learning Overview", href: "/app/learning" },
      { label: "Skill History", href: "/app/passport/history" },
    ],
  },

  capability: {
    id: "capability",
    title: "Updated Capability Ledger & Growth Synthesis",
    shortTitle: "Capability Ledger",
    canonicalRoute: "/app/learning/capability",
    badgeLabel: "Feature · Capability Ledger",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "Award",
    summary:
      "Synthesize newly acquired capabilities, review candidate evidence created during learning, and trace readiness improvements across your target career roles.",
    purpose:
      "Close the loop on learning by demonstrating tangible capability growth. The Capability Ledger records which skills advanced in mastery, highlights candidate evidence deliverables ready for verification, and projects how recent learning impacts career role match scores.",
    whenToUse: [
      "After completing a roadmap or mini-project to review your net capability gains.",
      "When preparing to submit candidate evidence to the Verification Center.",
      "When evaluating how your Career Readiness Index has improved from learning efforts.",
    ],
    whoCanUse: "All authenticated users reviewing capability growth.",
    prerequisites: ["At least one completed roadmap step or mini-project."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Open Capability Ledger",
        action: "Navigate to the capability ledger.",
        buttonOrPath: "Sidebar → Updated Capability (/app/learning/capability)",
        details:
          "Renders the ledger of newly demonstrated skills and candidate evidence.",
      },
      {
        stepNumber: 2,
        title: "Review Newly Demonstrated Competencies",
        action: "Inspect competency growth cards.",
        buttonOrPath: "Competency cards in ledger",
        details:
          "Shows starting proficiency vs updated mastery, delta increase, and attached evidence items.",
      },
      {
        stepNumber: 3,
        title: "Inspect Candidate Evidence Status",
        action: "Review deliverables created from mini-projects.",
        buttonOrPath: "Section: 'Candidate Learning Evidence Generated'",
        details:
          "Displays repository URLs, submission notes, and review status in Candidate Review.",
      },
      {
        stepNumber: 4,
        title: "Check Impact on Career Role Match",
        action: "Click 'Evaluate Career Impact'.",
        buttonOrPath: "Button: 'View Updated Role Match →' (/app/career/match)",
        details:
          "Transitions to Domain 4 to inspect how learning achievements lifted your overall role match percentage.",
      },
    ],
    practicalExample: {
      title: "Synthesizing Growth After Completing Data Preprocessing",
      startingState:
        "A developer completed all steps and submitted the mini-project for Data Preprocessing.",
      actionTaken:
        "The developer opens /app/learning/capability.",
      resultingOutcome:
        "The ledger displays: `Data Preprocessing & Cleaning` advanced from 48% to 92% mastery (+44% delta). A candidate evidence deliverable is listed with review status 'Candidate Evidence Created'. When opening Role Match, the developer's Backend Engineer score increased by 8%.",
      inspectionGuide:
        "Check the 'Candidate Evidence' card to confirm the repository link is registered.",
      recoveryNote:
        "To promote the candidate evidence to a verified skill, visit Candidate Review (/app/passport/candidates).",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Completed roadmap records and mini-project attempts.",
        "Candidate learning evidence items from Evidence Workspace.",
      ],
      outputArtifacts: [
        "Synthesized capability ledger with net mastery deltas.",
        "Seamless transition links to Career Intelligence and Candidate Review.",
      ],
      originAndProcessing:
        "Aggregates data from `backend/app/learning/router.py` and `backend/app/api/career.py`.",
      generatedVsPersisted:
        "Synthesized dynamically from persisted progress and evidence tables.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "candidate_evidence",
          badgeLabel: "Candidate Evidence Active",
          meaning: "Deliverable registered in Domain 1; awaiting verification clearance in Domain 2.",
          nextAction: "Adjudicate in Candidate Review.",
        },
        {
          status: "verified_promotion",
          badgeLabel: "Verified Skill",
          meaning: "Candidate evidence approved; skill officially updated on Skill Passport.",
          nextAction: "Eligible for recruiter sharing and credential export.",
        },
      ],
      trustPrinciples: [
        "Transparent Transition: Clear visibility into how learning artifacts become professional credentials.",
      ],
      learningTrustCaveat:
        "Capabilities listed in the ledger reflect learning mastery; full professional verification requires clearance through the 7-point Trust Center workflow.",
    },
    troubleshooting: [
      {
        symptom: "Career match score didn't increase after learning completion.",
        probableCause: "The candidate evidence created by the project has not yet been promoted to 'Verified' in Candidate Review.",
        verifiedRemedy: "Visit /app/passport/candidates, review the candidate deliverable, and confirm promotion to Verified.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Candidate Review & Skill Passport",
      nextStepAction: "Promote candidate skills to verified status in Domain 2.",
      targetRoute: "/app/passport/candidates",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with capability deltas, candidate evidence tracking, and career match impact links.",
    },
    relatedLinks: [
      { label: "Candidate Review", href: "/app/passport/candidates" },
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Evidence Workspace", href: "/app/evidence" },
    ],
  },

  steps: {
    id: "steps",
    title: "Interactive Step Study Packet & Sandbox",
    shortTitle: "Study Packet",
    canonicalRoute: "/app/learning/steps",
    badgeLabel: "Feature · Study Packet",
    requiredRole: "All Roles (Learner, Reviewer, Admin)",
    iconName: "Sparkles",
    summary:
      "A focused, single-objective study environment containing core concept breakdowns, curated readings, embedded videos, interactive practice exercises, and completion controls.",
    purpose:
      "Provide a distraction-free, structured learning space for each individual roadmap step. The study packet organizes everything needed to master one technical competency into an actionable workflow without jumping across fragmented web links.",
    whenToUse: [
      "When clicking 'Start Learning' or 'Continue' on any available roadmap step.",
      "When studying core concepts, reviewing visual diagrams, or reading curated technical articles.",
      "When executing step-specific code exercises in the embedded sandbox.",
    ],
    whoCanUse: "All authenticated users studying an active roadmap step.",
    prerequisites: ["An active roadmap with at least one unlocked step."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Access Study Packet",
        action: "Click on any available step card in your roadmap.",
        buttonOrPath: "Link: 'Open Study Packet' (/app/learning/steps/[stepId])",
        details:
          "Loads the complete study packet for the selected topic.",
      },
      {
        stepNumber: 2,
        title: "Review Core Concepts & Objectives",
        action: "Read the concept briefing and architectural diagrams.",
        buttonOrPath: "Section: 'Core Concepts & Key Insights'",
        details:
          "Explains the 'why', 'how', and trade-offs of the engineering pattern.",
      },
      {
        stepNumber: 3,
        title: "Study Curated Media & Documentation",
        action: "Watch embedded video clips or read linked documentation.",
        buttonOrPath: "Section: 'Curated Readings & Media'",
        details:
          "Validated technical resources selected specifically for this competency.",
      },
      {
        stepNumber: 4,
        title: "Complete Interactive Sandbox Exercise",
        action: "Solve the embedded coding exercise.",
        buttonOrPath: "Embedded code editor and 'Run Code' button",
        details:
          "Execute code against unit tests to satisfy the Practice Signal.",
      },
      {
        stepNumber: 5,
        title: "Mark Step Complete",
        action: "Click 'Mark Step Complete'.",
        buttonOrPath: "Button: 'Mark Step Complete' with checkmark",
        details:
          "Updates step status to 'completed' via `POST /api/v1/learning/steps/{id}/complete`, logs history, and unlocks dependent steps.",
      },
    ],
    practicalExample: {
      title: "Mastering Outlier Treatment in the Study Packet",
      startingState:
        "A learner opens step `step-topic-outlier-winsorization`.",
      actionTaken:
        "The learner reads the concept summary on IQR vs Z-Score thresholds, watches a 4-minute video snippet, solves the Python clipping exercise in the sandbox, and clicks 'Mark Step Complete'.",
      resultingOutcome:
        "The step is recorded as completed. The learner receives a success notification and is automatically offered a button to advance to Step 3 (Feature Scaling).",
      inspectionGuide:
        "Return to /app/learning/roadmaps to verify the step displays a green checkmark badge.",
      recoveryNote:
        "If you accidentally mark a step complete, you can click 'Resume Step' to reopen it.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Step identifier (`step_id`).",
        "Topic content packet (`StepPacket` model with concepts, resources, exercises).",
      ],
      outputArtifacts: [
        "Updated step status in database (`completed` or `in_progress`).",
        "Practice attempt logs and mastery signal increments.",
      ],
      originAndProcessing:
        "GET /api/v1/learning/steps/{step_id}/packet loads packet data via `backend/app/learning/router.py`.",
      generatedVsPersisted:
        "Step progress and completion timestamps are persisted in PostgreSQL.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "step_completed",
          badgeLabel: "Step Completed",
          meaning: "Learning objectives achieved; unlocks dependent downstream steps.",
          nextAction: "Advance to next available step.",
        },
      ],
      trustPrinciples: [
        "Distraction-Free Focus: Consolidates concept, practice, and assessment into a single view.",
      ],
      learningTrustCaveat:
        "Completing an individual study packet step is a milestone toward topic mastery; it does not constitute full professional skill verification.",
    },
    troubleshooting: [
      {
        symptom: "Study packet shows 'Step Not Found'.",
        probableCause: "The stepId in the URL does not exist in the active roadmap.",
        verifiedRemedy: "Return to /app/learning/roadmaps and click an available step card.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Personalized Learning Roadmap",
      nextStepAction: "Return to roadmap to view unlocked steps and overall progress.",
      targetRoute: "/app/learning/roadmaps",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with embedded sandboxes, video players, and complete/skip/resume actions.",
    },
    relatedLinks: [
      { label: "Personalized Roadmaps", href: "/app/learning/roadmaps" },
      { label: "Practice Exercises", href: "/app/learning/practice" },
      { label: "Progress & Mastery", href: "/app/learning/progress" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED CROSS-DOMAIN WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

export const LEARNING_GUIDED_WORKFLOWS: LearningGuidedWorkflow[] = [
  {
    id: "workflow-career-gap-to-learning-plan",
    title: "Workflow A: From Career Gap to Actionable Learning Plan",
    summary:
      "Seamlessly transition from an identified skill gap in Career Intelligence to a personalized, sequenced learning roadmap in Learn & Grow.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Identify Critical Skill Gap",
        route: "/app/career/gaps",
        action: "In Career Intelligence, review your evaluated skill gaps and identify a critical Depth Gap or Skill Gap.",
        outcome: "You select a high-priority competency requirement (e.g. Kubernetes at Practitioner level).",
      },
      {
        phaseNumber: 2,
        featureTitle: "Triage Priority Ranking",
        route: "/app/career/priorities",
        action: "Check Gap Priorities to confirm the gap's strategic ranking and leverage score.",
        outcome: "You verify that remediating this skill provides maximum career readiness ROI.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Trigger Roadmap Remediation",
        route: "/app/learning",
        action: "In Learning Overview or Gap Detail, click 'Remediate Gap'.",
        outcome: "The system calls `generatePersonalizedRoadmap`, scaffolding an adaptive curriculum path.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Review Sequenced Steps",
        route: "/app/learning/roadmaps",
        action: "Inspect the newly generated roadmap, reviewing prerequisite chains and study hour commitments.",
        outcome: "You receive an ordered, milestone-based curriculum targeting the exact missing proficiency tier.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Execute First Unlocked Step",
        route: "/app/learning/steps",
        action: "Click 'Start Learning' on Step 1 to enter the interactive study packet.",
        outcome: "You begin purposeful, evidence-producing development.",
      },
    ],
    keyTakeaway:
      "Learning is never undertaken aimlessly. Every roadmap directly addresses an explicit, versioned requirement gap identified by Career Intelligence.",
  },

  {
    id: "workflow-diagnostic-to-calibrated-priority",
    title: "Workflow B: From Diagnostic Assessment to a Calibrated Learning Priority",
    summary:
      "Take an objective domain diagnostic test to uncover hidden prerequisite gaps and calibrate roadmap difficulty with fast-track acceleration.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Select Domain Blueprint",
        route: "/app/learning/domains",
        action: "Explore Domain Blueprints and select the technical discipline matching your target skill.",
        outcome: "You review the full curriculum standard and module breakdown.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Launch Diagnostic Assessment",
        route: "/app/learning/domains/domain-data-preprocessing/diagnostic",
        action: "Complete the diagnostic check across Concept, Reasoning, Implementation, and Application categories.",
        outcome: "You answer targeted questions testing foundational and advanced competencies.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Review Diagnostic Baseline Report",
        route: "/app/learning/domains/domain-data-preprocessing/diagnostic",
        action: "Inspect your overall score, category scores, and strong vs weak topic classifications.",
        outcome: "You identify specific prerequisite weaknesses before starting advanced study.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Generate Calibrated Roadmap",
        route: "/app/learning/roadmaps",
        action: "Click 'Generate Calibrated Roadmap' to build an adaptive path.",
        outcome: "Strong topics (>=85%) are fast-tracked, while weak areas are prioritized as foundational steps.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Execute Targeted Study",
        route: "/app/learning/steps",
        action: "Focus exclusively on diagnosed deficit areas without wasting time on concepts you already know.",
        outcome: "Maximizes learning velocity and efficiency.",
      },
    ],
    keyTakeaway:
      "Diagnostic checks ensure you never waste time studying what you already know, while protecting you from failing advanced topics due to missing foundations.",
  },

  {
    id: "workflow-learning-progress-to-verified-skill",
    title: "Workflow C: From Learning Progress to Verified Professional Skill",
    summary:
      "Convert completed roadmap milestones and mini-project code deliverables into candidate evidence, bridging learning mastery into verified Skill Passport credentials.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Achieve Topic Mastery",
        route: "/app/learning/progress",
        action: "Complete study packet lessons, solve practice problems, and pass formative assessments to reach 75%+ mastery.",
        outcome: "Knowledge, Practice, and Assessment signals reach high marks.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Build Mini-Project Deliverable",
        route: "/app/learning/projects",
        action: "Develop an applied, production-grade code repository satisfying the mini-project rubric.",
        outcome: "You create a tangible, working code deliverable in your GitHub account.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Submit Repository URL",
        route: "/app/learning/projects",
        action: "Submit the GitHub URL and architecture notes in the mini-project submission form.",
        outcome: "Project Signal reaches 100%, lifting topic mastery to Advanced (>=85%).",
      },
      {
        phaseNumber: 4,
        featureTitle: "Candidate Evidence Generation",
        route: "/app/evidence",
        action: "The system automatically registers a `CandidateLearningEvidence` artifact in Evidence Workspace.",
        outcome: "Your learning deliverable becomes an auditable work artifact ready for verification.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Adjudication & Skill Promotion",
        route: "/app/passport/candidates",
        action: "Navigate to Candidate Review to inspect and promote the candidate claim to 'Verified' status.",
        outcome: "The skill officially updates in your Skill Passport, permanently clearing the career gap.",
      },
    ],
    keyTakeaway:
      "Learning completion is not the end of the journey. Submitting authentic project deliverables bridges learning into authoritative Skill Passport verification.",
  },

  {
    id: "workflow-update-roadmap-after-skill-change",
    title: "Workflow D: Update a Roadmap After a Genuine Skill-State Change",
    summary:
      "Synchronize your learning plans when new skills are verified in Skill Passport or when switching target career roles in Career Intelligence.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Verify New Evidence or Switch Target Role",
        route: "/app/career/roles",
        action: "In Domain 4, select a new target role, or in Domain 2, promote newly verified skills.",
        outcome: "Your underlying capability state or career target changes.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Sync Upstream Career Gaps",
        route: "/app/learning",
        action: "In Learning Overview, click 'Sync Career Gaps' or select the new target role from the dropdown.",
        outcome: "Domain 5 re-queries Career Intelligence to fetch updated, re-ranked skill gaps.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Review Changed Priorities",
        route: "/app/learning",
        action: "Inspect the updated priorities list; previously cleared gaps disappear, and new deficits emerge.",
        outcome: "You see the exact new capability targets required for your new goal.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Regenerate or Adapt Active Roadmap",
        route: "/app/learning/roadmaps",
        action: "Click 'Remediate Gap' to generate a fresh roadmap for newly emerged priority gaps.",
        outcome: "A new curriculum path is created without overwriting completed historical milestones.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Audit Learning History",
        route: "/app/learning/history",
        action: "Review Learning History to confirm previous completions remain permanently preserved.",
        outcome: "Full auditability and continuity across evolving career goals.",
      },
    ],
    keyTakeaway:
      "Skill Passport ensures learning plans evolve with you. Switching roles or clearing skills dynamically re-aligns your curriculum without manual spreadsheet tracking.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY (16+ TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const LEARNING_CONCEPTUAL_GLOSSARY: LearningGlossaryTerm[] = [
  {
    term: "Learning Intelligence (Domain 5)",
    definition:
      "The specialized platform domain that translates verified skill gaps into structured, milestone-based learning plans, diagnostic evaluations, sandboxed practice, and applied mini-projects.",
    context:
      "Bridges Career Intelligence (Domain 4) with Evidence Workspace (Domain 1) and Skill Passport (Domain 2).",
    relatedRoute: "/app/learning",
    relatedRouteLabel: "Learning Overview",
  },
  {
    term: "Domain Blueprint",
    definition:
      "A standardized, versioned engineering curriculum specification defining modules, granular topics, learning objectives, difficulty tiers, and prerequisite graphs for a technical discipline.",
    context:
      "Curriculum standard created by engineering domain specialists; acts as the blueprint from which personalized roadmaps are instantiated.",
    relatedRoute: "/app/learning/domains",
    relatedRouteLabel: "Domain Blueprints",
  },
  {
    term: "Personalized Learning Roadmap",
    definition:
      "An adaptive, topologically sequenced learning journey generated specifically for an individual user's verified skill gaps, diagnostic test baseline, study hours, and learning style preferences.",
    context:
      "Stored in PostgreSQL with unique `path_id`. Sequences steps and enforces prerequisite gating.",
    relatedRoute: "/app/learning/roadmaps",
    relatedRouteLabel: "Personalized Roadmaps",
  },
  {
    term: "Roadmap Step",
    definition:
      "A single curriculum milestone within a learning roadmap targeting one technical topic, containing study packet resources, practice exercises, assessments, and project assignments.",
    context:
      "Can exist in 5 explicit states: locked, available, in_progress, completed, or skipped.",
    relatedRoute: "/app/learning/steps",
    relatedRouteLabel: "Step Study Packet",
  },
  {
    term: "Prerequisite Dependency Rule",
    definition:
      "The architectural invariant requiring all prerequisite topics to achieve at least 60% mastery before downstream dependent steps can transition from 'locked' to 'available'.",
    context:
      "Enforced by `arePrerequisitesMet()` in `learningCalculations.ts` to prevent learners from struggling on advanced patterns without foundational knowledge.",
    relatedRoute: "/app/learning/roadmaps",
    relatedRouteLabel: "Personalized Roadmaps",
  },
  {
    term: "Diagnostic Assessment",
    definition:
      "An objective pre-study evaluation testing 4 cognitive categories (Concept, Reasoning, Implementation, Application) across a domain's topics to establish a baseline and qualify for fast-track acceleration.",
    context:
      "Submitting a diagnostic check calculates topic scores and identifies weak areas needing prerequisite focus.",
    relatedRoute: "/app/learning/domains/domain-data-preprocessing/diagnostic",
    relatedRouteLabel: "Diagnostic Check",
  },
  {
    term: "4-Signal Mastery Engine",
    definition:
      "The deterministic mathematical formula calculating topic capability: $\\text{Mastery} = 0.30 \\times \\text{Knowledge} + 0.25 \\times \\text{Practice} + 0.20 \\times \\text{Assessment} + 0.25 \\times \\text{Project}$.",
    context:
      "Guarantees that passive content viewing cannot award mastery; learners must solve code exercises, pass evaluations, and build project repositories.",
    relatedRoute: "/app/learning/progress",
    relatedRouteLabel: "Progress & Mastery",
  },
  {
    term: "Knowledge Signal (30%)",
    definition:
      "Mastery component measuring theoretical understanding, evaluated via diagnostic checks and in-packet concept questions.",
    context:
      "Comprises 30% of overall topic mastery in the 4-signal formula.",
    relatedRoute: "/app/learning/progress",
    relatedRouteLabel: "Progress & Mastery",
  },
  {
    term: "Practice Signal (25%)",
    definition:
      "Mastery component measuring syntax and algorithm execution, evaluated through sandboxed coding challenges and unit test validation.",
    context:
      "Comprises 25% of overall topic mastery in the 4-signal formula.",
    relatedRoute: "/app/learning/practice",
    relatedRouteLabel: "Practice Exercises",
  },
  {
    term: "Assessment Signal (20%)",
    definition:
      "Mastery component measuring formal evaluation performance, evaluated via formative assessments with passing thresholds (typically 70%).",
    context:
      "Comprises 20% of overall topic mastery in the 4-signal formula.",
    relatedRoute: "/app/learning/assessments",
    relatedRouteLabel: "Knowledge Assessments",
  },
  {
    term: "Mini-Project Signal (25%)",
    definition:
      "Mastery component measuring applied engineering capability, evaluated via authentic code repository deliverables built against explicit rubrics.",
    context:
      "Comprises 25% of overall topic mastery; required to achieve Advanced (>=85%) mastery.",
    relatedRoute: "/app/learning/projects",
    relatedRouteLabel: "Mini-Projects",
  },
  {
    term: "Candidate Learning Evidence",
    definition:
      "An auditable evidence artifact automatically generated in Evidence Workspace upon submitting a mini-project repository, awaiting review in Candidate Review.",
    context:
      "Bridges Domain 5 learning accomplishments into Domain 1 & 2 for authoritative verification clearance.",
    relatedRoute: "/app/evidence",
    relatedRouteLabel: "Evidence Workspace",
  },
  {
    term: "Formative Knowledge Assessment",
    definition:
      "A rubric-based knowledge check administered during learning to provide feedback on concept clarity and trigger automated remediation if needed.",
    context:
      "Contrasts with high-stakes certification exams; designed to support learning and calibrate progression.",
    relatedRoute: "/app/learning/assessments",
    relatedRouteLabel: "Knowledge Assessments",
  },
  {
    term: "Curated Learning Resource",
    definition:
      "A vetted external technical article, video tutorial, or repository reference mapped to a specific competency and periodically validated for live link availability.",
    context:
      "Aggregated from YouTube, GitHub, Dev.to, and FreeCodeCamp with automated health checking.",
    relatedRoute: "/app/learning/resources",
    relatedRouteLabel: "Curated Resources",
  },
  {
    term: "Capability Ledger",
    definition:
      "The synthesized growth log recording newly demonstrated competencies, mastery deltas, and candidate evidence generated across learning cycles.",
    context:
      "Provides a clear summary of development ROI ready for engineering leveling and recruiter reviews.",
    relatedRoute: "/app/learning/capability",
    relatedRouteLabel: "Capability Ledger",
  },
  {
    term: "Remediation Session",
    definition:
      "A focused review packet automatically generated when an assessment score falls below passing threshold, detailing missed concepts to prepare for retakes.",
    context:
      "Accessible at `/app/learning/remediation/[attemptId]` to turn assessment failures into learning moments.",
    relatedRoute: "/app/learning/assessments",
    relatedRouteLabel: "Knowledge Assessments",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific Learn & Grow help topic.
 * Falls back to 'overview' for root or non-specific routes.
 */
export function getLearningHelpTopicIdFromPathname(pathname: string): LearningHelpTopicId {
  if (!pathname) return "overview";

  const clean = pathname.toLowerCase();

  // Diagnostic check is a subroute of domains, check first
  if (clean.includes("/diagnostic")) return "diagnostic";
  if (clean.startsWith("/app/learning/roadmaps")) return "roadmaps";
  if (clean.startsWith("/app/learning/domains")) return "domains";
  if (clean.startsWith("/app/learning/progress")) return "progress";
  if (clean.startsWith("/app/learning/practice")) return "practice";
  if (clean.startsWith("/app/learning/assessments") || clean.startsWith("/app/learning/remediation")) return "assessments";
  if (clean.startsWith("/app/learning/projects")) return "projects";
  if (clean.startsWith("/app/learning/resources")) return "resources";
  if (clean.startsWith("/app/learning/history")) return "history";
  if (clean.startsWith("/app/learning/capability")) return "capability";
  if (clean.startsWith("/app/learning/steps")) return "steps";

  return "overview";
}
