/**
 * Career Intelligence Product Help & Conceptual Guidance Data Catalog
 * Domain 4: Role Intelligence & Career Readiness
 *
 * Grounded strictly in the implemented codebase of Skill Passport.
 * Covers all 10 Career Intelligence features, 4 guided cross-domain workflows,
 * exact mathematical scoring models, and core career trust distinctions.
 */

export type CareerHelpTopicId =
  | "overview"
  | "discover"
  | "roles"
  | "match"
  | "gaps"
  | "priorities"
  | "readiness"
  | "compare"
  | "job-parser"
  | "mapping"
  | "explanations"
  | "workflows"
  | "glossary";

export interface CareerStepInstruction {
  stepNumber: number;
  title: string;
  action: string;
  buttonOrPath: string;
  details: string;
}

export interface CareerConcreteExample {
  title: string;
  startingState: string;
  actionTaken: string;
  resultingOutcome: string;
  inspectionGuide: string;
  recoveryNote?: string;
}

export interface CareerStatusDefinition {
  status: string;
  badgeLabel: string;
  meaning: string;
  nextAction?: string;
}

export interface CareerTroubleshootingItem {
  symptom: string;
  probableCause: string;
  verifiedRemedy: string;
}

export interface CareerHelpTopic {
  id: CareerHelpTopicId;
  title: string;
  shortTitle: string;
  canonicalRoute: string;
  badgeLabel: string;
  requiredRole: "All Roles (Employee, Reviewer, Admin)" | "Reviewer or Admin" | "Administrator Only";
  iconName:
    | "Compass"
    | "Globe"
    | "Briefcase"
    | "Scale"
    | "AlertTriangle"
    | "Award"
    | "Target"
    | "GitCompare"
    | "FileSearch"
    | "Network"
    | "Sparkles"
    | "BookOpen";
  summary: string;
  purpose: string; // What this feature does
  whenToUse: string[]; // When should I use it?
  whoCanUse: string; // Who can use it?
  prerequisites: string[]; // What must be available before starting?
  stepByStep: CareerStepInstruction[]; // Numbered instructions using actual UI controls
  practicalExample: CareerConcreteExample; // Realistic illustrative scenario
  inputsAndOutputs: {
    requiredInputs: string[];
    outputArtifacts: string[];
    originAndProcessing: string;
    generatedVsPersisted: string;
  };
  understandingStatus: {
    statusBadges: CareerStatusDefinition[];
    trustPrinciples: string[];
    careerTrustCaveat: string;
  };
  troubleshooting: CareerTroubleshootingItem[]; // What can go wrong and how to recover
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

export interface CareerGuidedWorkflow {
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

export interface CareerGlossaryTerm {
  term: string;
  definition: string;
  context: string;
  relatedRoute?: string;
  relatedRouteLabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. TOPIC GUIDES FOR ALL CAREER INTELLIGENCE FEATURES + OVERVIEW
// ─────────────────────────────────────────────────────────────────────────────

export const CAREER_HELP_TOPICS: Record<Exclude<CareerHelpTopicId, "workflows" | "glossary">, CareerHelpTopic> = {
  overview: {
    id: "overview",
    title: "Role Intelligence & Career Readiness Architecture Overview",
    shortTitle: "Overview",
    canonicalRoute: "/app/career",
    badgeLabel: "Domain 4 · Overview",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Compass",
    summary:
      "Domain 4 acts as the analytical bridge between your evidence-backed Skill Passport (Domains 1 & 2) and real-world employment demand. It compares your verified capability state against versioned, explicit role demand models without arbitrary keyword percentages or unexplainable black-box scores.",
    purpose:
      "Provide an objective, evidence-grounded capability diagnostic against real industry engineering standards. Domain 4 evaluates your current verified proficiencies on a 5-point maturity scale, applies cryptographic trust discounting, categorizes 7 distinct gap classifications, prioritizes remediation ROI, and computes an actionable Career Readiness Index.",
    whenToUse: [
      "When assessing your fit for a target engineering role (e.g. Senior Backend Engineer, Lead ML Ops).",
      "When evaluating whether you are ready for a promotion, internal role mobility, or external transition.",
      "When determining whether a missing requirement is a genuine skill deficiency or merely an evidence gap waiting for repository ingestion.",
      "When planning your high-leverage learning roadmap before investing hours in certifications.",
    ],
    whoCanUse:
      "All authenticated users. Employees explore target roles and diagnose skill gaps. Engineering managers and recruiters inspect objective alignment without resume inflation.",
    prerequisites: [
      "An active Skill Passport profile with at least one connected evidence source or verified competency.",
      "At least one target role selected in the Target Role Selector Bar (defaults to 'Senior Backend Engineer' or your saved target).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select or Confirm Your Active Target Role",
        action: "Use the Target Role Selector Bar at the top of any career page.",
        buttonOrPath: "Click the role dropdown or 'Change Target Role' (/app/career/roles)",
        details:
          "Selecting a target role sets the global evaluation benchmark across all career analytics. Your selection is persisted to the database and re-computes all match, gap, priority, and readiness metrics.",
      },
      {
        stepNumber: 2,
        title: "Inspect High-Level Match & Readiness Dial",
        action: "Review the primary dashboard metrics in the Overview page.",
        buttonOrPath: "Navigate to /app/career",
        details:
          "Examine the Overall Role Match percentage, Core Requirements vs Supporting Coverage split, and Career Readiness Tier (Early Stage, Developing Foundations, Moderate Alignment, High Readiness).",
      },
      {
        stepNumber: 3,
        title: "Review Competency Alignment Breakdown",
        action: "Inspect the competency table categorized by match status.",
        buttonOrPath: "Scroll to Competency Breakdown or click 'View Full Match Breakdown' (/app/career/match)",
        details:
          "Filter by Strong Match, Partial Match (Depth Gap), Evidence Gap, or Missing Capability. Click any row to view its exact mathematical derivation and supporting artifacts.",
      },
      {
        stepNumber: 4,
        title: "Analyze & Prioritize Gaps",
        action: "Identify the critical blockers impeding your readiness.",
        buttonOrPath: "Sidebar → Gap Priorities (/app/career/priorities)",
        details:
          "Use interactive sliders to tune Effort Sensitivity and Project Leverage, surfacing quick wins that can be solved with existing repository artifacts versus deep learning projects.",
      },
      {
        stepNumber: 5,
        title: "Transition to Remediation in Learn & Grow",
        action: "Click 'Remediate This Gap' on any prioritized gap record.",
        buttonOrPath: "Action button: 'Generate Roadmap →' (/app/learning/roadmaps)",
        details:
          "Domain 4 seamlessly hands off the prioritized gap definition to Domain 5 (Learn & Grow), generating an adaptive, milestone-based learning roadmap.",
      },
    ],
    practicalExample: {
      title: "Full Diagnostic Lifecycle: Staff Platform Engineer Alignment",
      startingState:
        "A Senior Backend Engineer has 8 verified skills in Python, PostgreSQL, and REST APIs, but aspires to become a Staff Platform Engineer requiring Kubernetes at Practitioner level and Distributed Systems at Advanced level.",
      actionTaken:
        "The engineer selects 'Staff Platform Engineer' in the Target Role Selector. Domain 4 runs `evaluateRoleMatch` and `extractGapRecords`, revealing a 64% overall match: Python and PostgreSQL provide strong matches, Kubernetes is flagged as a 'depth gap' (Working vs Practitioner), and Distributed Systems is an 'evidence gap' (demonstrated in PRs but in candidate review state).",
      resultingOutcome:
        "The engineer avoids wasting weeks relearning basic Python. Instead, Gap Priorities ranks resolving the Distributed Systems candidate review as a #1 Quick Win, followed by a targeted Kubernetes deployment project in Learn & Grow.",
      inspectionGuide:
        "Open /app/career to verify the updated scores, then visit /app/career/gaps to inspect the exact gap classifications.",
      recoveryNote:
        "If the match score appears unexpectedly low, check /app/passport/candidates—unreviewed candidate skills receive a 50% discount in effective coverage until promoted.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "User Skill Passport records (verified skills, candidate claims, proficiency levels, evidence IDs).",
        "Active Target Role Demand Model (role_id, competencies, required levels, importance weights).",
        "Trust & Governance verification states (verified, candidate, insufficient_evidence, conflicting).",
      ],
      outputArtifacts: [
        "Overall Role Match score (0–100% weighted).",
        "Core Required vs Supporting Coverage sub-scores.",
        "Categorized Gap Records (skill, depth, evidence, application, dependency, differentiation, freshness).",
        "Normalized Gap Priority Rankings (1.0–100.0).",
        "Career Readiness Assessment & Critical Blockers audit.",
      ],
      originAndProcessing:
        "Calculated deterministically via `src/lib/careerCalculations.ts` on the frontend and `/api/v1/career/match/{role_id}` on the FastAPI backend using SQLAlchemy and PostgreSQL persistence.",
      generatedVsPersisted:
        "Target role specifications and user role preferences are persisted in PostgreSQL (`roles`, `role_competencies`, `user_target_roles`). Match snapshots and priority rankings are computed deterministically on-demand to guarantee real-time reflection of new evidence.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "strong_match",
          badgeLabel: "Strong Match",
          meaning: "Verified skill demonstrated at or above expected target proficiency level with authoritative evidence.",
          nextAction: "No action needed; this requirement is fully satisfied.",
        },
        {
          status: "partial_match",
          badgeLabel: "Partial Match (Depth Gap)",
          meaning: "Demonstrated and verified capability exists, but at a lower proficiency tier than the target role requires.",
          nextAction: "Undertake advanced production challenges or Domain 5 roadmaps to elevate proficiency.",
        },
        {
          status: "evidence_gap",
          badgeLabel: "Evidence Gap",
          meaning: "Capability claimed or extracted, but marked as candidate, unreviewed, or lacking corroborating repository artifacts.",
          nextAction: "Promote candidate skill in Domain 2 or connect additional commits in Evidence Workspace.",
        },
        {
          status: "missing_weak",
          badgeLabel: "Missing Capability",
          meaning: "No attributable code commits, tickets, or documents currently demonstrate this competency in connected sources.",
          nextAction: "Generate a foundational learning roadmap in Learn & Grow or ingest relevant external work.",
        },
      ],
      trustPrinciples: [
        "Grounded Evidence, Never Keyword Guesses: Match scores reflect verifiable execution, not semantic resume keyword stuffing.",
        "Honest Distinction: An evidence gap means proof has not yet been connected; it is NOT a statement that the candidate cannot perform the skill.",
        "Target Role is a Goal, Not a Qualification: Selecting a target role expresses an engineering direction, not an assertion of current competence.",
        "Deterministic Math: All percentages derive from published, transparent formulas without hidden LLM score drift.",
      ],
      careerTrustCaveat:
        "Career Readiness assessments are internal capability diagnostics for career development and self-directed growth. They do not constitute an employment decision, hiring guarantee, or automated recruitment rejection.",
    },
    troubleshooting: [
      {
        symptom: "Overall match score is 0% or all competencies show 'Missing Capability'.",
        probableCause: "No skills have been verified or extracted in Domain 2 (Skill Passport).",
        verifiedRemedy: "Navigate to /app/evidence to ingest a repository or document, then run AI Work Analysis to extract initial skills.",
      },
      {
        symptom: "A skill I definitely know is showing an 'Evidence Gap'.",
        probableCause: "The skill exists as a 'candidate' in Candidate Review or was flagged for conflicting attribution in Trust Center.",
        verifiedRemedy: "Visit /app/passport/candidates and promote the skill to 'Verified', or check /app/ai/conflicts to resolve attribution flags.",
      },
      {
        symptom: "Changing the active role doesn't update the metrics on the page.",
        probableCause: "Network failure while syncing active role to backend database.",
        verifiedRemedy: "Refresh the page; the fallback local state will re-align with the database target role record.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Target Roles Catalog & Discover Jobs",
      nextStepAction: "Explore predefined industry role benchmarks or ingest custom job specifications.",
      targetRoute: "/app/career/roles",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with bidirectional frontend-backend calculation parity and PostgreSQL target persistence.",
    },
    relatedLinks: [
      { label: "Target Roles Catalog", href: "/app/career/roles" },
      { label: "Role Match Breakdown", href: "/app/career/match" },
      { label: "Skill Gap Analysis", href: "/app/career/gaps" },
      { label: "Gap Priorities", href: "/app/career/priorities" },
      { label: "Career Readiness", href: "/app/career/readiness" },
    ],
  },

  discover: {
    id: "discover",
    title: "Discover Jobs & Live Market Demand Explorer",
    shortTitle: "Discover Jobs",
    canonicalRoute: "/app/career/discover",
    badgeLabel: "Feature · Job Market",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Globe",
    summary:
      "Search and explore live industry job openings mapped directly to your verified Skill Passport capabilities, or search by specific target role titles and geographic locations.",
    purpose:
      "Connect internal evidence-backed capability profiles with live external hiring markets. Discover Jobs supports skill-driven matching (Mode A: finding jobs requiring skills you already possess) and role-driven discovery (Mode B: finding openings for aspirational job titles), allowing one-click requirement extraction into custom target models.",
    whenToUse: [
      "When exploring what real companies are hiring for right now based on your verified skills.",
      "When evaluating whether market demand for your core stack is concentrated locally or remotely.",
      "When you find an enticing job opening and want to convert its requirements into a custom benchmark role.",
    ],
    whoCanUse: "All authenticated users looking to evaluate market demand or import external vacancies.",
    prerequisites: [
      "For Mode A (Skill-Driven): At least one verified or candidate skill in your Skill Passport.",
      "For Mode B (Role-Driven): A search query describing an engineering role (e.g. 'Senior Full-Stack Engineer').",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Search Mode",
        action: "Toggle between Mode A (My Skills) and Mode B (Role Query).",
        buttonOrPath: "Top mode toggle buttons: 'Match My Verified Skills' vs 'Search by Role Title'",
        details:
          "Mode A automatically builds a boolean skill query from your top verified competencies. Mode B allows freeform title input.",
      },
      {
        stepNumber: 2,
        title: "Configure Location & Remote Preferences",
        action: "Select your target country or toggle Remote Only.",
        buttonOrPath: "Country Selector dropdown & 'Remote Only' checkbox",
        details:
          "Filter by 50+ supported countries (US, UK, Germany, Canada, India, etc.) or restrict results strictly to distributed/remote postings.",
      },
      {
        stepNumber: 3,
        title: "Execute Live Job Discovery",
        action: "Click 'Find Matching Openings'.",
        buttonOrPath: "Button: 'Find Matching Openings' with search spinner",
        details:
          "Queries live job aggregation providers (TheirStack, JSearch, Fantastic Jobs) with automatic fallback to verified mock market data if external API quotas are exhausted.",
      },
      {
        stepNumber: 4,
        title: "Inspect Job Card & Capability Alignment",
        action: "Review compensation, tech stack tags, and company details.",
        buttonOrPath: "Individual Job Cards in results list",
        details:
          "Examine extracted skill chips color-coded by your current possession (green for verified, purple for candidate, red for unestablished).",
      },
      {
        stepNumber: 5,
        title: "Extract Requirements & Save as Target",
        action: "Convert the job posting into an active target demand model.",
        buttonOrPath: "Button on card: 'Extract Requirements & Map to Profile'",
        details:
          "Calls the Job Description Parser to extract granular competencies and sets this exact vacancy as your active target role.",
      },
    ],
    practicalExample: {
      title: "Discovering European Remote Roles for Python + PostgreSQL",
      startingState:
        "A developer with verified Python and PostgreSQL skills wants to find high-paying remote roles across Europe.",
      actionTaken:
        "The developer switches to Mode A, verifies Python and PostgreSQL are selected, selects 'Germany' as the country filter, checks 'Remote Only', and clicks 'Find Matching Openings'.",
      resultingOutcome:
        "12 live openings from companies like Delivery Hero, Celonis, and Personio are returned. The developer clicks 'Extract Requirements' on a 'Senior Data Platform Engineer' opening at Celonis.",
      inspectionGuide:
        "The posting is parsed and converted into a custom role model, automatically routing the developer to /app/career/match to inspect their 72% alignment.",
      recoveryNote:
        "If external providers fail with a 429 rate-limit error, Discover Jobs automatically switches to cached fallback mode with an explanatory status pill.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Mode A: Selected skill IDs from user's Skill Passport.",
        "Mode B: Freeform role title query string.",
        "Optional: Country code and remote boolean flag.",
      ],
      outputArtifacts: [
        "List of normalized job listings (title, company, location, salary, description, direct application URL).",
        "Provider status telemetry (provider name, quota state, latency).",
        "Extracted custom role models ready for target persistence.",
      ],
      originAndProcessing:
        "POST /api/v1/career/jobs/discover routes requests to configured job aggregators with deduplication and normalization in `backend/app/career/providers/`.",
      generatedVsPersisted:
        "Discovered job listings are ephemeral search results. Once a user clicks 'Extract Requirements' or 'Save as Target', the posting is permanently persisted as a custom `RoleDemandModel` in the database.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "live_provider",
          badgeLabel: "Live Market API",
          meaning: "Results fetched directly from upstream job aggregator APIs in real time.",
          nextAction: "Click job links to apply directly on employer portals.",
        },
        {
          status: "fallback_cache",
          badgeLabel: "Curated Market Benchmarks",
          meaning: "Upstream provider rate limit reached or offline; displaying validated industry job snapshots.",
          nextAction: "All parsing and target extraction features remain 100% operational.",
        },
      ],
      trustPrinciples: [
        "No Phantom Job Openings: Postings contain real employer URLs and verifiable company identities.",
        "Clear Extraction Provenance: Requirements extracted from job postings preserve exact verbatim text quotes.",
      ],
      careerTrustCaveat:
        "GrowthLens does not endorse third-party employers or guarantee the accuracy of external compensation estimates.",
    },
    troubleshooting: [
      {
        symptom: "Search returns 0 results in Mode A.",
        probableCause: "The combination of selected skills, country, and remote filter is too restrictive.",
        verifiedRemedy: "Uncheck 1-2 niche skills or broaden the country filter to 'All Locations'.",
      },
      {
        symptom: "Job card 'Apply Externally' link opens a 404 page.",
        probableCause: "The employer has filled or unlisted the vacancy since the aggregator index updated.",
        verifiedRemedy: "Use 'Extract Requirements' to analyze the tech stack even if the specific vacancy has closed.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Job Description Parser & Role Match",
      nextStepAction: "Extract structured competencies from the job description and evaluate your match score.",
      targetRoute: "/app/career/job-parser",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Includes multi-provider fallbacks (TheirStack, JSearch, Fantastic Jobs) and country-level filtering.",
    },
    relatedLinks: [
      { label: "Target Roles Catalog", href: "/app/career/roles" },
      { label: "Job Description Parser", href: "/app/career/job-parser" },
      { label: "Role Match Overview", href: "/app/career/match" },
    ],
  },

  roles: {
    id: "roles",
    title: "Target Role Catalog & Benchmark Selection",
    shortTitle: "Target Roles",
    canonicalRoute: "/app/career/roles",
    badgeLabel: "Feature · Role Models",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Briefcase",
    summary:
      "Browse standardized, versioned engineering role demand models, configure your active target benchmark, or create custom role models for specialized company positions.",
    purpose:
      "Manage the demand models that define engineering excellence. Rather than matching against generic job titles, Skill Passport uses explicit `RoleDemandModel` structures specifying required competencies, seniority expectations (Foundation to Expert), and importance weightings (Core, Supporting, Preferred, Differentiating).",
    whenToUse: [
      "When establishing or changing your primary career direction in the application.",
      "When reviewing the exact technical rubrics expected for standard levels (Entry, Mid, Senior, Staff/Lead).",
      "When saving multiple target aspirations (e.g. keeping both 'Backend Engineer' and 'Cloud Architect' on file).",
    ],
    whoCanUse: "All authenticated users. Reviewers and admins can inspect organization-wide role definitions.",
    prerequisites: ["None. A catalog of pre-configured industry benchmark roles is provided out of the box."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Toggle Between Saved Targets and Role Catalogue",
        action: "Select the 'My Saved Targets' or 'Industry Catalogue' tab.",
        buttonOrPath: "Tabs: 'Saved Targets' vs 'Catalogue Roles'",
        details:
          "'Saved Targets' contains roles you have actively pinned or created. 'Catalogue Roles' contains curated industry benchmarks.",
      },
      {
        stepNumber: 2,
        title: "Filter by Seniority or Search by Title",
        action: "Filter roles by level or search keywords.",
        buttonOrPath: "Dropdown: 'All Levels', 'Entry', 'Mid', 'Senior', 'Staff / Lead' + Search Input",
        details:
          "Quickly narrow down roles matching your current or target seniority level.",
      },
      {
        stepNumber: 3,
        title: "Set Active Target Role",
        action: "Click 'Set as Active Target' on any role card.",
        buttonOrPath: "Button: 'Set as Active Target' or Radio Pill",
        details:
          "Instantly updates your global active target role, persisting the choice to PostgreSQL and recalculating match scores across the entire platform.",
      },
      {
        stepNumber: 4,
        title: "Inspect Role Competency Rubric",
        action: "Click 'Inspect Role Details & Rubric'.",
        buttonOrPath: "Link on card: 'View Role Details →' (/app/career/roles/[roleId])",
        details:
          "Drill into the role's version history, governance provenance, and complete list of core vs supporting requirements.",
      },
      {
        stepNumber: 5,
        title: "Create a Custom Target Role",
        action: "Open the Custom Role modal to define unique specifications.",
        buttonOrPath: "Button: '+ Create Custom Target Role'",
        details:
          "Input custom title, seniority, and organizational context to tailor benchmarks to your specific employer's leveling guide.",
      },
    ],
    practicalExample: {
      title: "Setting Up Aspirational Target: Senior Full-Stack Engineer",
      startingState:
        "A Mid-Level Frontend Engineer wants to transition into Full-Stack. The current active target role is 'Frontend Engineer (Mid Level)'.",
      actionTaken:
        "The engineer navigates to /app/career/roles, opens the 'Industry Catalogue' tab, filters by 'Senior Level', finds 'Senior Full-Stack Engineer (v2026.2)', and clicks 'Set as Active Target'.",
      resultingOutcome:
        "The global header immediately displays 'Active Target: Senior Full-Stack Engineer'. When the engineer visits /app/career/match, the match score updates from 88% (for Mid Frontend) to 58% (for Senior Full-Stack), accurately exposing backend and database depth gaps.",
      inspectionGuide:
        "Check the top banner on any career page; it will display the green pill badge for 'Senior Full-Stack Engineer'.",
      recoveryNote:
        "You can switch back to your previous role at any time with one click under the 'Saved Targets' tab.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Catalogue role catalog definitions (`catalogueRoles`).",
        "User target role selection preference (`user_target_roles` record).",
      ],
      outputArtifacts: [
        "Updated active role context (`activeRole`).",
        "Persisted user target role record in PostgreSQL (`PUT /api/v1/career/target`).",
        "Role demand models available for side-by-side comparison.",
      ],
      originAndProcessing:
        "GET /api/v1/career/roles loads all available catalogue and user custom roles. PUT /api/v1/career/target records the user's active selection.",
      generatedVsPersisted:
        "Role models and target associations are stored permanently in the PostgreSQL database. Version tags ensure historical evaluations remain reproducible.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "active_target",
          badgeLabel: "Active Target Role",
          meaning: "The primary benchmark currently driving all match scores, gap rankings, and readiness dials.",
          nextAction: "Used as baseline across all Career Intelligence and Learn & Grow views.",
        },
        {
          status: "saved_target",
          badgeLabel: "Saved Aspiration",
          meaning: "A role you have saved for future reference or comparison, but is not currently active.",
          nextAction: "Click 'Set Active' to swap benchmarks, or compare side-by-side in Compare Roles.",
        },
        {
          status: "custom_role",
          badgeLabel: "Custom Specification",
          meaning: "Role demand model created by the user or imported via the Job Description Parser.",
          nextAction: "Can be edited, updated, or removed under Saved Targets.",
        },
      ],
      trustPrinciples: [
        "Explicit Rubrics Over Secret Models: Every role lists its required competencies, levels, and weightings transparently.",
        "Versioned Permanence: Role models are tagged (e.g. `v2026.2`) so evolving industry criteria never silently alter past assessments.",
      ],
      careerTrustCaveat:
        "Setting a role as your active target is an engineering self-development choice. It does not certify that you qualify for that role, nor does it guarantee an interview.",
    },
    troubleshooting: [
      {
        symptom: "Cannot delete a custom role.",
        probableCause: "The role is currently set as your active target.",
        verifiedRemedy: "Set a different role as active first, then click the trash icon to delete the custom role.",
      },
      {
        symptom: "Custom role has 0 competencies.",
        probableCause: "The role was created manually without adding competencies or running the JD Parser.",
        verifiedRemedy: "Use the Job Description Parser (/app/career/job-parser) to extract competencies automatically, or map them manually in Role-Skill Mapping.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Role Match Overview",
      nextStepAction: "Inspect how your verified skills align with the newly selected target role.",
      targetRoute: "/app/career/match",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Supports single active role persistence with unlimited saved targets and custom role definitions.",
    },
    relatedLinks: [
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Compare Roles", href: "/app/career/compare" },
      { label: "Job Description Parser", href: "/app/career/job-parser" },
    ],
  },

  match: {
    id: "match",
    title: "Role Match Overview & Capability Alignment",
    shortTitle: "Role Match",
    canonicalRoute: "/app/career/match",
    badgeLabel: "Feature · Match Engine",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Scale",
    summary:
      "Inspect your exact mathematical alignment against the active target role, separating core requirements from supporting capabilities and understanding how verification status impacts coverage.",
    purpose:
      "Provide an auditable, transparent calculation of fit. Skill Passport evaluates requirement coverage ($P = \\min(1.0, L_u / L_r)$) and adjusts for evidence verification standing ($E = P \\times V$) before applying requirement weights ($W_{core} = 1.0, W_{supp} = 0.60, W_{pref} = 0.35, W_{diff} = 0.20$) to produce an overall weighted match score.",
    whenToUse: [
      "When you need to know exactly how well your verified portfolio matches your target position.",
      "When determining whether you meet the essential core baseline or only supporting nice-to-haves.",
      "When auditing why a specific skill isn't awarding full credit toward your overall score.",
    ],
    whoCanUse: "All authenticated users looking to inspect their granular requirement alignment.",
    prerequisites: [
      "An active target role selected.",
      "Demonstrated competencies in Skill Passport (or provisional candidate extractions).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Review the Hero Match Score",
        action: "Examine the weighted Overall Role Match ring and core vs supporting split.",
        buttonOrPath: "Top hero card at /app/career/match",
        details:
          "The circular dial shows your overall score (0–100%). Adjacent metric blocks display your Core Requirements score (baseline gate) and Supporting Skills score.",
      },
      {
        stepNumber: 2,
        title: "Filter by Match Status",
        action: "Switch between status filter tabs to inspect specific groups.",
        buttonOrPath: "Tabs: 'All (N)', 'Strong Matches', 'Partial Matches', 'Evidence Gaps', 'Missing / Weak'",
        details:
          "Isolate areas of strength from depth shortfalls and uncorroborated claims.",
      },
      {
        stepNumber: 3,
        title: "Inspect Competency Match Cards",
        action: "Expand any requirement row to review its details.",
        buttonOrPath: "Competency Match list items",
        details:
          "Review the requirement type badge (Core, Supporting, Preferred, Differentiating), expected vs demonstrated proficiency, and effective coverage percentage.",
      },
      {
        stepNumber: 4,
        title: "Open Calculation Formula Modal",
        action: "Click 'How is this calculated?' to view the mathematical breakdown.",
        buttonOrPath: "Button: 'How is this calculated?' or 'Formula'",
        details:
          "Opens a modal explaining the exact formula, weight parameters, and verification multipliers used in the evaluation.",
      },
      {
        stepNumber: 5,
        title: "Navigate to Skill Gap Analysis",
        action: "Proceed to diagnose root causes for unmet requirements.",
        buttonOrPath: "Link: 'Inspect Skill Gaps →' (/app/career/gaps)",
        details:
          "Move directly to Domain 4's gap analysis engine to begin resolving shortfalls.",
      },
    ],
    practicalExample: {
      title: "Auditing a 74% Role Match for Senior DevOps Engineer",
      startingState:
        "A cloud engineer evaluates their match against Senior DevOps Engineer. The overall score is 74%, but Core Requirements is 65% while Supporting is 90%.",
      actionTaken:
        "The engineer filters by 'Partial Matches' and 'Evidence Gaps'. They find that 'Terraform' is demonstrated at Practitioner level (meets expected level), but is discounted to 50% effective coverage because it remains in 'candidate' verification state.",
      resultingOutcome:
        "The engineer realizes their low core score is an evidence issue, not a skill deficiency. By navigating to Candidate Review (/app/passport/candidates) and confirming Terraform with 2 linked GitHub repositories, the core score jumps from 65% to 85%, lifting the overall match to 86%.",
      inspectionGuide:
        "Review the 'Effective Coverage' bar on the Terraform card before and after verification promotion.",
      recoveryNote:
        "If a skill is listed as 'conflicting' in Trust Center, its verification factor is capped at 0.35 until the attribution dispute is resolved.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Active Role Competency requirements (expected level, requirement type, importance).",
        "User Skill items (verified level, candidate level, verification state, evidence count, confidence).",
      ],
      outputArtifacts: [
        "Competency Match Results with effective coverage, match status, and confidence rationale.",
        "Weighted Overall Match score (0–100%).",
        "Core Required coverage score (0–100%).",
        "Supporting skills coverage score (0–100%).",
        "Categorical counts (strong, partial, evidence gap, missing).",
      ],
      originAndProcessing:
        "Evaluated via `evaluateRoleMatch(role, skills)` in `src/lib/careerCalculations.ts` on the client and mirrored by `backend/app/career/matching_engine.py`.",
      generatedVsPersisted:
        "Computed on demand when loading the page or changing the target role, ensuring instantaneous updates whenever evidence is approved or rejected.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "core_required",
          badgeLabel: "Core Required",
          meaning: "Non-negotiable foundational competency. Carries the maximum weight (1.0) in match scoring.",
          nextAction: "Deficits in core requirements represent critical blockers to career readiness.",
        },
        {
          status: "supporting",
          badgeLabel: "Supporting",
          meaning: "Important complementary engineering skill. Carries secondary weight (0.60).",
          nextAction: "Strengthens overall performance and team versatility.",
        },
        {
          status: "preferred",
          badgeLabel: "Preferred",
          meaning: "Desirable skill that provides an advantage over peers. Weight: 0.35.",
          nextAction: "Serves as a secondary differentiator in hiring reviews.",
        },
        {
          status: "differentiating",
          badgeLabel: "Differentiating",
          meaning: "High-leverage specialization (e.g. distributed consensus, eBPF) that elevates senior candidacy. Weight: 0.20.",
          nextAction: "Converts directly into a Differentiation Opportunity gap record.",
        },
      ],
      trustPrinciples: [
        "Verification Dampening: An unverified claim cannot receive full mathematical credit.",
        "Transparent Weighting: Core requirements are explicitly separated from nice-to-have supporting skills.",
      ],
      careerTrustCaveat:
        "A 100% role match indicates complete coverage of the stated demand rubric; it does not guarantee hiring selection by an external company.",
    },
    troubleshooting: [
      {
        symptom: "My verified skill matches the name but shows 0% coverage.",
        probableCause: "The skill's verified proficiency level is recorded as 'Not Established'.",
        verifiedRemedy: "Review the skill in /app/passport/skills; update or calibrate the proficiency level based on evidence rubrics.",
      },
      {
        symptom: "The core coverage score is much lower than the overall match.",
        probableCause: "You have strong secondary supporting skills, but key core competencies are missing or only at foundational tiers.",
        verifiedRemedy: "Focus on the 'Core Required' requirements filtered under Partial Matches and Missing Capability.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Skill Gap Analysis",
      nextStepAction: "Examine detailed diagnoses and root causes for each identified gap.",
      targetRoute: "/app/career/gaps",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with 5-tier proficiency mapping, verification adjustment factors, and core/supporting split.",
    },
    relatedLinks: [
      { label: "Skill Gap Analysis", href: "/app/career/gaps" },
      { label: "Gap Priorities", href: "/app/career/priorities" },
      { label: "Role Explanations", href: "/app/career/explanations" },
    ],
  },

  gaps: {
    id: "gaps",
    title: "Skill Gap Analysis & Diagnostic Taxonomy",
    shortTitle: "Skill Gaps",
    canonicalRoute: "/app/career/gaps",
    badgeLabel: "Feature · Gap Taxonomy",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "AlertTriangle",
    summary:
      "A gap is not simply an absent skill. GrowthLens categorizes 7 distinct gap types to distinguish missing capability from missing proof, depth shortfalls, application deficits, and unverified claims.",
    purpose:
      "Prevent wasted learning effort by diagnosing the exact root cause of every unmet requirement. Rather than sending every user to beginner tutorials, Domain 4 classifies requirements into actionable categories: skill gaps, depth gaps, evidence gaps, application gaps, dependency gaps, differentiation opportunities, and freshness gaps.",
    whenToUse: [
      "When you have requirements below 100% coverage and need to know *why* they failed.",
      "When deciding whether you need to take a course (Skill Gap), build a production project (Application Gap), or simply connect existing code (Evidence Gap).",
      "When preparing to generate a targeted remediation roadmap in Learn & Grow.",
    ],
    whoCanUse: "All authenticated users seeking actionable diagnostic clarity on capability deficits.",
    prerequisites: ["An active target role evaluated against your Skill Passport."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Filter by Gap Classification",
        action: "Click gap classification filter pills to isolate specific deficit types.",
        buttonOrPath: "Filter Pills: 'All Gaps', 'Skill Gaps', 'Depth Gaps', 'Evidence Gaps', 'Application Gaps'",
        details:
          "Filter pills show real-time counts for each classification (e.g. Evidence Gaps: 3, Depth Gaps: 2).",
      },
      {
        stepNumber: 2,
        title: "Search by Competency Name",
        action: "Use the search bar to locate specific technologies.",
        buttonOrPath: "Search input: 'Search gaps by skill name or diagnosis...'",
        details:
          "Quickly find gaps related to 'Docker', 'System Architecture', 'Kafka', etc.",
      },
      {
        stepNumber: 3,
        title: "Inspect Gap Diagnosis Card",
        action: "Review the diagnostic summary and evidence status.",
        buttonOrPath: "Individual Gap Cards in the list",
        details:
          "Read the plain-English diagnosis explaining the distance between your supported tier and the expected level.",
      },
      {
        stepNumber: 4,
        title: "Open Deep Dive Gap Page",
        action: "Click 'Inspect Diagnosis & Provenance' on any gap card.",
        buttonOrPath: "Link on card: 'Why this gap? →' (/app/career/gaps/[gapId])",
        details:
          "Drill into linked source artifacts, rubric expectations, confidence rationales, and project leverage examples.",
      },
      {
        stepNumber: 5,
        title: "Trigger Direct Roadmap Remediation",
        action: "Click 'Remediate This Gap' to generate a learning path.",
        buttonOrPath: "Action button: 'Remediate This Gap' (/app/learning/roadmaps/[pathId])",
        details:
          "Directly contacts Domain 5 to scaffold a customized learning roadmap targeting the exact missing proficiency tier.",
      },
    ],
    practicalExample: {
      title: "Distinguishing an Evidence Gap from a Skill Gap in Docker",
      startingState:
        "A senior developer matches against a Cloud Architect role requiring Docker at Advanced level. The developer has used Docker in production for 3 years, but never uploaded DevOps configurations to Skill Passport.",
      actionTaken:
        "The developer visits /app/career/gaps and sees Docker classified as an 'Evidence Gap' (Demonstrated at Practitioner in candidate state, lacking corroborating deployment manifests).",
      resultingOutcome:
        "Instead of enrolling in a 40-hour introductory Docker course, the developer opens Evidence Workspace (/app/evidence), connects a GitHub repo containing Docker Compose and Kubernetes Helm charts, and clears the gap in 5 minutes.",
      inspectionGuide:
        "Observe how the gap classification changes from 'Evidence Gap' to 'Strong Match' once the repository is verified.",
      recoveryNote:
        "If a gap is classified as a 'Depth Gap', beginner materials are bypassed in favor of advanced architecture exercises.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "RoleMatchResult evaluated against active role.",
        "User skill verification states and linked evidence deliverables.",
      ],
      outputArtifacts: [
        "Classified GapRecord array with 7-type taxonomy, diagnosis strings, and next-step directions.",
        "Individual gap detail routes (/app/career/gaps/[gapId]).",
        "Direct handoff payloads for Domain 5 roadmap generation.",
      ],
      originAndProcessing:
        "Generated via `extractGapRecords(matchResult, role)` in `src/lib/careerCalculations.ts` and mirrored by `backend/app/career/gap_explanation_service.py`.",
      generatedVsPersisted:
        "Computed deterministically from the current match result; individual gap records can trigger persistent learning roadmap creation in Domain 5.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "skill_gap",
          badgeLabel: "Skill Gap (Missing Capability)",
          meaning: "No attributable code, commits, or technical artifacts demonstrate this competency in your profile.",
          nextAction: "Requires foundational study or project development in Learn & Grow.",
        },
        {
          status: "depth_gap",
          badgeLabel: "Depth Gap (Proficiency Shortfall)",
          meaning: "Demonstrated capability exists, but below the target role's expected seniority tier (e.g. Working vs Advanced).",
          nextAction: "Focus on advanced production patterns, high-scale architecture, and edge cases.",
        },
        {
          status: "evidence_gap",
          badgeLabel: "Evidence Gap (Unverified Claim)",
          meaning: "Capability claimed or extracted, but marked candidate, unreviewed, or lacking sufficient corroborating artifacts.",
          nextAction: "Connect repository commits or promote candidate in Candidate Review.",
        },
        {
          status: "application_gap",
          badgeLabel: "Application Gap",
          meaning: "Knowledge demonstrated theoretically or via assessment, but lacking real-world code implementation in a repository.",
          nextAction: "Undertake an applied open-source or workplace repository deliverable.",
        },
        {
          status: "dependency_gap",
          badgeLabel: "Dependency Gap",
          meaning: "An advanced requirement cannot be efficiently learned because prerequisite foundations are missing.",
          nextAction: "Remediate prerequisite competencies before tackling this requirement.",
        },
        {
          status: "differentiation_opportunity",
          badgeLabel: "Differentiation Opportunity",
          meaning: "A preferred or differentiating skill that meets or exceeds expectations, providing a competitive edge.",
          nextAction: "Highlight this skill on your Skill Passport when sharing with recruiters.",
        },
      ],
      trustPrinciples: [
        "No Presumption of Inability: An evidence gap means proof is absent; it does not judge the candidate incapable.",
        "Actionable Precision: Diagnoses must state the exact numerical level shortfall (-1 level, -2 levels) and what artifact would satisfy it.",
      ],
      careerTrustCaveat:
        "Skill gaps reflect alignment against this specific target role rubric. Having gaps in a Senior ML Engineer role does not mean you are deficient as a Software Engineer.",
    },
    troubleshooting: [
      {
        symptom: "A gap detail page shows 'Skill Gap Not Found'.",
        probableCause: "The gapId in the URL does not exist in the active role's evaluation.",
        verifiedRemedy: "Return to /app/career/gaps and click an existing gap card, or ensure your active role matches the gap's role.",
      },
      {
        symptom: "Clicking 'Remediate This Gap' shows an error.",
        probableCause: "The Learn & Grow API service encountered a transient generation error.",
        verifiedRemedy: "Retry clicking the button; the system will fallback to pre-scaffolded domain learning paths.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Gap Priorities & Strategic Roadmap",
      nextStepAction: "Rank and prioritize your gaps using strategic effort and leverage parameters.",
      targetRoute: "/app/career/priorities",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Supports all 7 gap classifications with individual detail pages (`[gapId]`) and direct handoff to Domain 5.",
    },
    relatedLinks: [
      { label: "Gap Priorities", href: "/app/career/priorities" },
      { label: "Role Explanations", href: "/app/career/explanations" },
      { label: "Learning Roadmaps", href: "/app/learning/roadmaps" },
    ],
  },

  priorities: {
    id: "priorities",
    title: "Strategic Gap Prioritization Engine",
    shortTitle: "Gap Priorities",
    canonicalRoute: "/app/career/priorities",
    badgeLabel: "Feature · Priority Engine",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Award",
    summary:
      "Triage and rank your skill gaps using an explainable, normalized 0–100 priority score that balances requirement criticality, effort estimates, and existing project leverage.",
    purpose:
      "Solve the 'where do I begin?' problem. Rather than presenting an overwhelming list of 15 gaps, the Prioritization Engine computes a bounded, deterministic score ($base = 100 \\times G_i \\times I_i \\times U_i$), applies effort discounts, and boosts skills that have existing project artifacts ready to build upon.",
    whenToUse: [
      "When planning your quarter or month and needing to select the top 2-3 skills to develop.",
      "When deciding whether to go after 'Quick Wins' (high return, minimal effort) or 'Critical Blockers'.",
      "When tuning how heavily you want effort to penalize gap rankings via interactive sliders.",
    ],
    whoCanUse: "All authenticated users planning strategic capability growth.",
    prerequisites: ["Evaluated gap records from Skill Gap Analysis."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select a Strategic Filter Preset",
        action: "Click preset buttons to filter the ranked gap list.",
        buttonOrPath: "Filter Buttons: 'All Gaps', 'Top 3 Strategic Focus', 'Quick Wins', 'Critical Blockers'",
        details:
          "'Quick Wins' filters for gaps with existing evidence and low effort. 'Critical Blockers' highlights core requirements with major level shortfalls.",
      },
      {
        stepNumber: 2,
        title: "Adjust Effort Sensitivity Slider",
        action: "Slide from 0.5x to 2.0x to tune effort penalties.",
        buttonOrPath: "Slider: 'Effort Sensitivity (0.5x – 2.0x)'",
        details:
          "Higher sensitivity heavily deprioritizes multi-month masteries in favor of fast capabilities. Lower sensitivity treats all efforts equally.",
      },
      {
        stepNumber: 3,
        title: "Adjust Project Leverage Slider",
        action: "Slide from 1.0x to 2.0x to reward skills with existing artifacts.",
        buttonOrPath: "Slider: 'Project Leverage Boost (1.0x – 2.0x)'",
        details:
          "Rewarding leverage prioritizes skills where you already have connected repository files that can be easily extended.",
      },
      {
        stepNumber: 4,
        title: "Inspect Gap Priority Rationale",
        action: "Expand any ranked card to read why it received its score.",
        buttonOrPath: "Click card header or 'Why Prioritized?' toggle",
        details:
          "Review the formula inputs: Criticality factor, Urgency factor, Remaining gap percentage, and Project Leverage example.",
      },
      {
        stepNumber: 5,
        title: "Launch One-Click Remediation",
        action: "Click 'Remediate in Learn & Grow' on your #1 priority gap.",
        buttonOrPath: "Button: 'Remediate in Learn & Grow →' (/app/learning/roadmaps)",
        details:
          "Initiates direct roadmap generation and routes you to the active learning journey in Domain 5.",
      },
    ],
    practicalExample: {
      title: "Optimizing Strategic Focus: Kubernetes vs Redis for Backend Lead",
      startingState:
        "A developer has 6 gaps for Backend Lead. 'Distributed Caching (Redis)' is a supporting skill with 1 existing project artifact. 'Kubernetes Cluster Administration' is a core requirement requiring a 3-tier jump from zero.",
      actionTaken:
        "Under the default strategy, Kubernetes ranks #1 due to critical urgency. The developer switches to 'Quick Wins' and slides Project Leverage to 1.5x.",
      resultingOutcome:
        "Redis jumps to the #1 position (score 84/100) because adding a caching layer to their existing repository can be achieved in 3 days, immediately boosting their supporting coverage before tackling the 6-week Kubernetes project.",
      inspectionGuide:
        "Watch the dynamic re-ranking animate instantly as sliders are dragged.",
      recoveryNote:
        "Clicking 'All Gaps' and resetting sliders to 1.0x restores default canonical ranking.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "GapRecord objects with criticality, level gap, requirement type, and evidence count.",
        "User interactive slider states (effortSensitivity, leverageWeight).",
      ],
      outputArtifacts: [
        "Normalized Priority Scores strictly bounded between 1.0 and 100.0.",
        "Sorted priority ranking (Rank 1, Rank 2, Rank 3...).",
        "Project leverage suggestions (current contribution vs extension idea).",
      ],
      originAndProcessing:
        "Computed in real time via `extractGapRecords` options in `src/lib/careerCalculations.ts` and mirrored by `backend/app/career/prioritization_service.py`.",
      generatedVsPersisted:
        "Dynamic rankings update client-side instantaneously. Handoffs to Learn & Grow create persistent database roadmaps.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "rank_1",
          badgeLabel: "Top Priority (#1 Focus)",
          meaning: "The highest-yield capability to develop based on criticality, manageable effort, and project leverage.",
          nextAction: "Recommended for immediate learning sprint.",
        },
        {
          status: "quick_win",
          badgeLabel: "Quick Win",
          meaning: "High marginal gain achievable with minimal effort or by extending an existing repository.",
          nextAction: "Execute first to build momentum and elevate match scores quickly.",
        },
        {
          status: "critical_blocker",
          badgeLabel: "Critical Blocker",
          meaning: "Core required competency with a major shortfall that prevents reaching Moderate or High Readiness.",
          nextAction: "Must be addressed to qualify for target role benchmarks.",
        },
      ],
      trustPrinciples: [
        "Bounded Mathematical Scale: Priority scores are strictly normalized within [1.0, 100.0], preventing unbounded integer runaways.",
        "Transparent Leverage: Explanations explicitly cite which connected project repository makes the skill high leverage.",
      ],
      careerTrustCaveat:
        "Prioritization rankings recommend optimal return on learning investment; they do not dictate the order in which an external hiring manager conducts interviews.",
    },
    troubleshooting: [
      {
        symptom: "All gaps have the same priority score.",
        probableCause: "All requirements share identical importance levels and zero evidence has been connected.",
        verifiedRemedy: "Connect at least one repository or select a role with varied core vs supporting requirements.",
      },
      {
        symptom: "Moving sliders does not change rankings.",
        probableCause: "The gaps differ so drastically in criticality that effort adjustments cannot bridge the score gap.",
        verifiedRemedy: "Switch to 'Quick Wins' filter mode to isolate low-effort items.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Career Readiness Assessment & Radar",
      nextStepAction: "Review overall readiness index and critical blocker diagnosis.",
      targetRoute: "/app/career/readiness",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with real-time slider re-ranking, strategy presets, and provenance modal inspection.",
    },
    relatedLinks: [
      { label: "Career Readiness", href: "/app/career/readiness" },
      { label: "Skill Gap Analysis", href: "/app/career/gaps" },
      { label: "Learning Roadmaps", href: "/app/learning/roadmaps" },
    ],
  },

  readiness: {
    id: "readiness",
    title: "Career Readiness Assessment & Blocker Diagnosis",
    shortTitle: "Career Readiness",
    canonicalRoute: "/app/career/readiness",
    badgeLabel: "Feature · Readiness Audit",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Target",
    summary:
      "A comprehensive audit of your readiness for the active target role, synthesizing core required coverage, overall proficiency alignment, and verification certainty into a holistic Readiness Index and Tier.",
    purpose:
      "Synthesize multiple disparate metrics into a single, honest readiness evaluation. The Career Readiness Index balances core baseline coverage (50%), overall proficiency alignment (35%), and evidence corroboration quality (15%), placing candidates into 4 explainable readiness tiers.",
    whenToUse: [
      "When assessing whether you are genuinely prepared to apply for or step into your target role.",
      "When conducting an audit of critical blockers and verification uncertainties before an engineering review.",
      "When comparing your overall alignment against team mobility benchmarks.",
    ],
    whoCanUse: "All authenticated users evaluating engineering readiness.",
    prerequisites: ["An active target role evaluated against your portfolio."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Inspect Readiness Tier & Index",
        action: "Review the Hero Readiness Card and Radial Readiness Dial.",
        buttonOrPath: "Top card at /app/career/readiness",
        details:
          "Check your assigned Tier (Early Stage, Developing Foundations, Moderate Alignment, High Readiness) and the unified Readiness Index (0–100%).",
      },
      {
        stepNumber: 2,
        title: "Review Tripartite Score Balance",
        action: "Examine the 3 component metric cards.",
        buttonOrPath: "Component cards: Required Supported %, Proficiency Alignment %, Evidence Quality %",
        details:
          "50% of your index derives from Core Required Coverage, 35% from Overall Alignment, and 15% from Evidence Completeness.",
      },
      {
        stepNumber: 3,
        title: "Audit Critical Blockers",
        action: "Review the Critical Blockers list.",
        buttonOrPath: "Section: 'Critical Blockers to Target Readiness'",
        details:
          "Identifies core requirements with >=2 level proficiency gap or priority score >=60 that represent immediate gatekeepers.",
      },
      {
        stepNumber: 4,
        title: "Inspect Major Uncertainties",
        action: "Review unverified, candidate, or conflicting items.",
        buttonOrPath: "Section: 'Major Verification Uncertainties'",
        details:
          "Lists skills where claims exist but lack definitive verification clearance in Trust Center.",
      },
      {
        stepNumber: 5,
        title: "Read the Trust & Governance Disclaimer",
        action: "Review the formal readiness disclaimer.",
        buttonOrPath: "Callout at bottom of readiness page",
        details:
          "Reinforces that the index is an internal development diagnostic, not an automated hiring rejection or employment guarantee.",
      },
    ],
    practicalExample: {
      title: "Evaluating Readiness for Staff Infrastructure Engineer",
      startingState:
        "A candidate has a 78% Overall Match for Staff Infrastructure Engineer, but wonders why their Readiness Index is only 58% ('Developing Foundations').",
      actionTaken:
        "The candidate inspects /app/career/readiness and reviews the tripartite score: Overall Match is 78%, but Core Required Coverage is only 52% (due to missing Site Reliability Engineering at Expert level) and Evidence Quality is 45%.",
      resultingOutcome:
        "The candidate realizes that having great supporting skills cannot mask a deficit in core SRE responsibilities. The Critical Blockers list clearly flags SRE as the primary obstacle preventing a tier promotion to 'Moderate Alignment'.",
      inspectionGuide:
        "Check the 'Audit Rules' modal to view the exact thresholds separating each tier.",
      recoveryNote:
        "Elevating the core SRE requirement by 1 level lifts the index past 60%, unlocking 'Moderate Alignment'.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "RoleMatchResult and GapRecord list for the active role.",
      ],
      outputArtifacts: [
        "CareerReadinessAssessment object (readiness_index, readiness_tier, required_supported_pct, proficiency_alignment_pct, evidence_quality_pct).",
        "Critical Blockers array with skill names, gap IDs, and reasons.",
        "Major Uncertainties list.",
      ],
      originAndProcessing:
        "Calculated by `evaluateCareerReadiness(match, gaps)` in `src/lib/careerCalculations.ts` and mirrored by `backend/app/career/matching_engine.py`.",
      generatedVsPersisted:
        "Evaluated dynamically on load to reflect the latest evidence state across Domains 1, 2, and 3.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "high_readiness",
          badgeLabel: "High Readiness (80–100%)",
          meaning: "Exceptional alignment across core requirements, supporting skills, and verified evidence. Ready for role execution.",
          nextAction: "Export Skill Passport for recruiter sharing or internal promotion review.",
        },
        {
          status: "moderate_alignment",
          badgeLabel: "Moderate Alignment (60–79%)",
          meaning: "Strong foundations with viable capability; minor depth gaps or evidence gaps remain in secondary areas.",
          nextAction: "Execute targeted remediation sprints on top 2 prioritized gaps.",
        },
        {
          status: "developing_foundations",
          badgeLabel: "Developing Foundations (40–59%)",
          meaning: "Demonstrates relevant skills, but key core requirements are either missing or at foundational proficiency tiers.",
          nextAction: "Focus exclusively on Critical Blockers before exploring differentiating electives.",
        },
        {
          status: "early_stage",
          badgeLabel: "Early Stage (0–39%)",
          meaning: "Substantial capability development required across both core and supporting competencies.",
          nextAction: "Scaffold comprehensive foundational roadmaps in Learn & Grow.",
        },
      ],
      trustPrinciples: [
        "Core Heavily Weighted: You cannot achieve High Readiness on nice-to-have electives alone; core requirements comprise 50% of the index.",
        "Non-Punitive Transparency: Uncertainties and blockers are surfaced explicitly to provide a clear roadmap to promotion.",
      ],
      careerTrustCaveat:
        "This readiness assessment is an internal capability diagnostic and not an employment decision or hiring guarantee. It reflects verified evidence alignment for capability development.",
    },
    troubleshooting: [
      {
        symptom: "Readiness index is stuck at Early Stage despite many verified skills.",
        probableCause: "The active target role requires different competencies than those present in your passport.",
        verifiedRemedy: "Check Role Match (/app/career/match) to verify if your skills overlap with the active role, or select a role closer to your stack.",
      },
      {
        symptom: "Radial Dial does not animate.",
        probableCause: "CSS animation reduced-motion preference enabled in browser.",
        verifiedRemedy: "The numerical percentage displays accurately regardless of motion preferences.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Compare Roles Side-by-Side",
      nextStepAction: "Compare your readiness across multiple alternative career trajectories.",
      targetRoute: "/app/career/compare",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with the RadialReadinessDial, tripartite score breakdown, and critical blockers audit.",
    },
    relatedLinks: [
      { label: "Compare Roles", href: "/app/career/compare" },
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Gap Priorities", href: "/app/career/priorities" },
    ],
  },

  compare: {
    id: "compare",
    title: "Multi-Role Side-by-Side Comparison Matrix",
    shortTitle: "Compare Roles",
    canonicalRoute: "/app/career/compare",
    badgeLabel: "Feature · Comparison Matrix",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "GitCompare",
    summary:
      "Evaluate trade-offs between 2 to 3 target roles simultaneously, comparing match scores, core coverage, readiness tiers, depth gaps, and blocker counts side-by-side.",
    purpose:
      "Support strategic career path decisions. Rather than evaluating roles in isolation, Compare Roles places candidate models in adjacent columns, allowing you to instantly determine whether your existing portfolio aligns better with Backend Engineering vs Cloud/DevOps vs Full-Stack.",
    whenToUse: [
      "When deciding between two career specializations (e.g. Data Engineer vs Machine Learning Engineer).",
      "When evaluating whether to aim for a specialized individual contributor role vs a lead generalist role.",
      "When identifying which shared competencies transfer between roles to maximize learning leverage.",
    ],
    whoCanUse: "All authenticated users evaluating multiple career directions.",
    prerequisites: ["At least two roles available in the catalog or saved targets."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Roles for Comparison",
        action: "Use the role selector pills to toggle roles in/out of the comparison matrix.",
        buttonOrPath: "Role selection buttons at top of /app/career/compare",
        details:
          "Select up to 3 roles simultaneously. Selected roles appear highlighted with black borders.",
      },
      {
        stepNumber: 2,
        title: "Review High-Level Comparison Cards",
        action: "Compare the hero summary cards for each selected role.",
        buttonOrPath: "Top comparison columns",
        details:
          "Compare Overall Match %, Core Requirement Coverage, Readiness Index, Readiness Tier, and Strong Match counts side-by-side.",
      },
      {
        stepNumber: 3,
        title: "Switch Comparison View Filter",
        action: "Filter the detailed competency matrix.",
        buttonOrPath: "Filter buttons: 'All Competencies', 'Gaps Only', 'Differences Between Roles'",
        details:
          "'Differences Between Roles' isolates requirements where one role expects a higher proficiency than another.",
      },
      {
        stepNumber: 4,
        title: "Inspect Cross-Role Competency Rows",
        action: "Review how each competency is treated by each role.",
        buttonOrPath: "Matrix table rows",
        details:
          "Notice how Python might be 'Core Required (Advanced)' for Role A, but only 'Supporting (Working)' for Role B.",
      },
      {
        stepNumber: 5,
        title: "Set Optimal Role as Active Target",
        action: "Click 'Set as Active Target' on the winning role column.",
        buttonOrPath: "Button in column header: 'Set as Active Target'",
        details:
          "Immediately switches your global active target to that role, updating all platform analytics.",
      },
    ],
    practicalExample: {
      title: "Comparing Backend Engineer vs Platform Engineer",
      startingState:
        "A developer with 4 years of Go, PostgreSQL, and Docker experience wants to decide whether to pursue Senior Backend Engineer or Senior Platform Engineer.",
      actionTaken:
        "The developer visits /app/career/compare, selects both roles, and switches to 'Gaps Only' view.",
      resultingOutcome:
        "The comparison matrix reveals: Backend Engineer match is 82% with 2 minor depth gaps. Platform Engineer match is 54% with 5 critical blockers in Kubernetes, Terraform, and Observability. The developer decides to target Backend Engineer for their immediate promotion while setting Platform Engineer as a 2-year goal.",
      inspectionGuide:
        "Inspect the side-by-side 'Critical Blockers' count in the top comparison cards.",
      recoveryNote:
        "You can swap any role out of the comparison by clicking its selector pill again.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Selected role IDs from user (`selectedRoleIds`).",
        "Catalog roles, target roles, and custom roles from context.",
        "User verified and candidate skills.",
      ],
      outputArtifacts: [
        "Side-by-side comparison matrix with unified competency crosswalk.",
        "Differential match and readiness metrics.",
        "Ability to set any compared role as the global active target.",
      ],
      originAndProcessing:
        "Evaluates each selected role in parallel using `evaluateRoleMatch` and `evaluateCareerReadiness` in `src/lib/careerCalculations.ts`.",
      generatedVsPersisted:
        "Comparison views are calculated client-side in real time without creating redundant database records.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "matrix_difference",
          badgeLabel: "Requirement Difference",
          meaning: "Competency where the expected proficiency or requirement type differs substantially across the compared roles.",
          nextAction: "Key decision factor when choosing between career paths.",
        },
        {
          status: "shared_strength",
          badgeLabel: "Shared Strong Match",
          meaning: "A capability where you meet or exceed expectations across all compared roles.",
          nextAction: "Anchor competency that will transfer seamlessly to either position.",
        },
      ],
      trustPrinciples: [
        "Objective Parity: Both roles are evaluated using the identical underlying user skill portfolio without bias.",
        "Transparent Trade-offs: Exposes not just match percentage differences, but exact requirement level discrepancies.",
      ],
      careerTrustCaveat:
        "A higher match score in one role indicates greater immediate alignment; it does not imply that role is inherently superior or better suited to your long-term interests.",
    },
    troubleshooting: [
      {
        symptom: "Cannot select more than 3 roles.",
        probableCause: "The comparison matrix enforces a 3-role maximum to preserve readability and layout integrity.",
        verifiedRemedy: "Deselect one of the active roles by clicking its pill before selecting a new one.",
      },
      {
        symptom: "Comparison columns appear misaligned on mobile.",
        probableCause: "Screen width is insufficient for multi-column horizontal display.",
        verifiedRemedy: "Rotate device to landscape or scroll horizontally within the matrix table container.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Target Role Selection & Role Match",
      nextStepAction: "Commit to your chosen direction by setting it as active target.",
      targetRoute: "/app/career/match",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Supports up to 3 roles side-by-side with Gaps Only and Differences filtering modes.",
    },
    relatedLinks: [
      { label: "Target Roles Catalog", href: "/app/career/roles" },
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Career Readiness", href: "/app/career/readiness" },
    ],
  },

  "job-parser": {
    id: "job-parser",
    title: "Job Description Parser & Ingestion Engine",
    shortTitle: "JD Parser",
    canonicalRoute: "/app/career/job-parser",
    badgeLabel: "Feature · Ingestion Engine",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "FileSearch",
    summary:
      "Paste any raw job posting text or URL to extract structured competencies, importance tiers, and proficiency expectations with exact verbatim source spans, saving the result as a custom target demand model.",
    purpose:
      "Transform messy, unstructured hiring listings into precise, machine-evaluable demand models. The parser extracts canonical skill identifiers, categories, requirement types (Core, Supporting, Preferred), importance levels, and the exact sentence from the JD where the requirement was stated.",
    whenToUse: [
      "When you find a specific dream job vacancy online and want to benchmark your profile against it.",
      "When your employer publishes an internal job requisition or promotion criteria document.",
      "When you want to evaluate an unconventional or hybrid role not present in standard catalogs.",
    ],
    whoCanUse: "All authenticated users importing external hiring specifications.",
    prerequisites: [
      "At least 40 characters of raw job description text (or a valid external job posting URL).",
    ],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Input Job Details",
        action: "Enter Job Title, Company Name, and Seniority.",
        buttonOrPath: "Input fields: 'Job Title', 'Company Name', 'Seniority Level'",
        details:
          "Optional overrides; if omitted, the parser attempts to infer the title and company automatically from the text.",
      },
      {
        stepNumber: 2,
        title: "Paste Raw Job Description Text",
        action: "Paste the full text of the job posting into the text area.",
        buttonOrPath: "Textarea: 'Job Description Text (min. 40 characters)'",
        details:
          "Include requirements, responsibilities, tech stack, and nice-to-haves for comprehensive extraction.",
      },
      {
        stepNumber: 3,
        title: "Execute Parser Analysis",
        action: "Click 'Parse Job Description' button.",
        buttonOrPath: "Button: 'Parse Job Description' with sparkle icon",
        details:
          "Calls the AI parser service (`/api/v1/career/parse-jd`), extracting competencies with exact verbatim source quotes.",
      },
      {
        stepNumber: 4,
        title: "Review & Refine Extracted Competencies",
        action: "Inspect and edit extracted requirement rows.",
        buttonOrPath: "Extracted Competencies list items",
        details:
          "Adjust requirement types (Core vs Supporting), edit expected proficiency tiers, or delete irrelevant keywords.",
      },
      {
        stepNumber: 5,
        title: "Save as Custom Role & Run Match",
        action: "Click 'Save as Custom Role & Compare'.",
        buttonOrPath: "Button: 'Save as Custom Role & Compare →'",
        details:
          "Persists the customized role demand model to PostgreSQL, sets it as your active target role, and routes you directly to /app/career/match.",
      },
    ],
    practicalExample: {
      title: "Parsing an Anthropic Staff Systems Engineer Listing",
      startingState:
        "An engineer finds a posting for 'Staff Systems Engineer, AI Infrastructure' on Anthropic's careers page.",
      actionTaken:
        "The engineer pastes the 500-word job description into /app/career/job-parser and clicks 'Parse Job Description'.",
      resultingOutcome:
        "The parser extracts 11 structured competencies, including 'Rust Programming' (Core, Advanced), 'GPU Cluster Networking' (Core, Practitioner), and 'Distributed Systems Architecture' (Core, Advanced), each displaying the exact sentence from the posting.",
      inspectionGuide:
        "Click 'Save as Custom Role & Compare'; observe the new role immediately active in /app/career/match.",
      recoveryNote:
        "If a requirement was miscategorized as 'Preferred' instead of 'Core Required', use the dropdown in the extracted table to correct it before saving.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Raw job description text string (min 40 characters).",
        "Optional job title, company name, and seniority level.",
      ],
      outputArtifacts: [
        "Extracted competencies array (canonical_name, category, requirement_type, importance, expected_level, source_span).",
        "Persisted custom `RoleDemandModel` in PostgreSQL.",
        "Automatic active target role assignment.",
      ],
      originAndProcessing:
        "POST /api/v1/career/parse-jd processes the text via `backend/app/career/parser_service.py` using structured JSON schema extraction.",
      generatedVsPersisted:
        "Parsed competencies are held in frontend review state until the user clicks 'Save as Custom Role', at which point they are permanently saved to PostgreSQL.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "verbatim_span",
          badgeLabel: "Verbatim Source Span",
          meaning: "Exact sentence or clause from the raw job description proving where the AI extracted this requirement.",
          nextAction: "Inspect to verify extraction accuracy and context.",
        },
        {
          status: "mapped",
          badgeLabel: "Taxonomy Mapped",
          meaning: "Requirement successfully linked to an existing canonical skill in the Skill Passport ontology.",
          nextAction: "Eligible for immediate automated matching against user evidence.",
        },
        {
          status: "ambiguous",
          badgeLabel: "Ambiguous / Needs Review",
          meaning: "Requirement could map to multiple taxonomy skills (e.g. 'Cloud' could mean AWS, GCP, or Azure).",
          nextAction: "Review and select the appropriate canonical skill in Role-Skill Mapping.",
        },
      ],
      trustPrinciples: [
        "Zero Hallucinated Requirements: Every extracted competency must be grounded in an attributable source span from the original job text.",
        "User Adjudication Authority: The user has full power to edit, reclassify, or remove any extracted requirement before it affects their match score.",
      ],
      careerTrustCaveat:
        "The parser reflects the text provided. If an external job posting is poorly written or contains unrealistic requirements, the resulting demand model will mirror those flaws.",
    },
    troubleshooting: [
      {
        symptom: "Parser alerts: 'Please paste at least 40 characters'.",
        probableCause: "The pasted text is too short for reliable semantic extraction.",
        verifiedRemedy: "Paste the complete job description including responsibilities and requirements.",
      },
      {
        symptom: "A proprietary internal framework name wasn't recognized.",
        probableCause: "The technology is proprietary or non-standard and does not exist in public ontologies.",
        verifiedRemedy: "The parser assigns it as a custom skill; you can edit its canonical label in the extracted table.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Role-Skill Mapping & Role Match",
      nextStepAction: "Review taxonomy mappings or immediately evaluate your match score.",
      targetRoute: "/app/career/match",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with verbatim source span extraction, inline editing, and PostgreSQL persistence.",
    },
    relatedLinks: [
      { label: "Role-Skill Mapping", href: "/app/career/mapping" },
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Target Roles Catalog", href: "/app/career/roles" },
    ],
  },

  mapping: {
    id: "mapping",
    title: "Role–Skill Mapping & Canonical Crosswalk",
    shortTitle: "Role-Skill Mapping",
    canonicalRoute: "/app/career/mapping",
    badgeLabel: "Feature · Taxonomy Crosswalk",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Network",
    summary:
      "Inspect and manage how unstructured job requirements map onto canonical Skill Passport competencies, resolving aliases, correcting ambiguities, and establishing transparent equivalence.",
    purpose:
      "Eliminate keyword mismatches between how job postings describe work and how code evidence demonstrates it. Role-Skill Mapping connects phrasing like 'FastAPI Web Development' or 'Python REST Services' to the canonical skill `Python Programming`, ensuring you receive credit for demonstrated work regardless of phrasing differences.",
    whenToUse: [
      "When a parsed custom job posting has ambiguous requirements that need manual linking.",
      "When verifying that a target role's competencies match your canonical Skill Passport taxonomy.",
      "When reviewing mapping statuses (Mapped, Alias Resolved, Ambiguous, Needs Review).",
    ],
    whoCanUse: "All authenticated users. Reviewers can approve organizational canonical mappings.",
    prerequisites: ["An active target role with mapped or ambiguous competencies."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Filter by Mapping Status",
        action: "Select filter pills: 'All', 'Mapped', 'Alias Resolved', 'Ambiguous'.",
        buttonOrPath: "Filter buttons at /app/career/mapping",
        details:
          "Isolate ambiguous requirements that need manual crosswalk assignment.",
      },
      {
        stepNumber: 2,
        title: "Inspect Canonical Mapping Row",
        action: "Review original posting label vs canonical taxonomy target.",
        buttonOrPath: "Competency Mapping list items",
        details:
          "Examine the mapping badge (e.g. 'Alias Resolved' or 'Mapped') and the linked canonical skill name.",
      },
      {
        stepNumber: 3,
        title: "Edit Mapping Assignment",
        action: "Click 'Edit Mapping' on any row.",
        buttonOrPath: "Button: 'Edit Mapping' with pencil icon",
        details:
          "Opens an inline selector allowing you to choose any recognized canonical skill from your taxonomy.",
      },
      {
        stepNumber: 4,
        title: "Save Crosswalk Correction",
        action: "Select the correct canonical skill and click 'Save'.",
        buttonOrPath: "Button: 'Save' with disk icon",
        details:
          "Updates the role competency definition in the database, immediately linking user evidence associated with that canonical skill.",
      },
      {
        stepNumber: 5,
        title: "Verify Impact on Role Match",
        action: "Navigate to Role Match to observe the updated score.",
        buttonOrPath: "Link: 'View in Role Match →' (/app/career/match)",
        details:
          "The previously unmatched requirement now connects to your verified evidence, raising your match score.",
      },
    ],
    practicalExample: {
      title: "Resolving 'Postgres DB Tuning' to Canonical PostgreSQL",
      startingState:
        "A parsed job description contains the requirement 'Postgres DB Tuning & Query Optimization', flagged as 'Ambiguous'. The user's passport contains verified `PostgreSQL` at Practitioner level, but currently receives 0% match credit.",
      actionTaken:
        "The user visits /app/career/mapping, filters by 'Ambiguous', clicks 'Edit Mapping' on the requirement, and selects `PostgreSQL (skill-postgresql)` from the canonical taxonomy dropdown.",
      resultingOutcome:
        "The mapping status updates to 'Mapped (Manual Override)'. The user's verified PostgreSQL evidence is instantly linked, turning a 0% missing requirement into a 100% Strong Match.",
      inspectionGuide:
        "Open /app/career/match to see the requirement turn green.",
      recoveryNote:
        "You can revert manual overrides at any time by selecting 'Reset to Automatic Mapping'.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "Active Role competencies with mapping_status metadata.",
        "Canonical Skill Passport taxonomy definitions.",
      ],
      outputArtifacts: [
        "Updated role competency mappings in PostgreSQL.",
        "Resolved alias linkages reflecting immediately in match calculations.",
      ],
      originAndProcessing:
        "Managed via `updateRoleCompetency` in `src/context/EvidenceContext.tsx` and persisted via `/api/v1/career/roles/{role_id}`.",
      generatedVsPersisted:
        "Mappings are permanently stored in the role competency database records, maintaining consistency across sessions.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "mapped",
          badgeLabel: "Directly Mapped",
          meaning: "Exact 1-to-1 canonical match between job requirement and Skill Passport taxonomy standard.",
          nextAction: "Fully verified; no manual action needed.",
        },
        {
          status: "alias_resolved",
          badgeLabel: "Alias Resolved",
          meaning: "Mapped automatically through taxonomy alias tables (e.g. 'Postgres' → 'PostgreSQL').",
          nextAction: "Reliable automated mapping; review only if context requires specialized distinction.",
        },
        {
          status: "ambiguous",
          badgeLabel: "Ambiguous Phrasing",
          meaning: "Phrasing maps to multiple potential skills or represents an umbrella term (e.g. 'Cloud Architecture').",
          nextAction: "Click 'Edit Mapping' to pin the exact canonical technology.",
        },
        {
          status: "unrecognized",
          badgeLabel: "Unrecognized Term",
          meaning: "Requirement not found in standard taxonomies; treated as a standalone custom competency.",
          nextAction: "Link to a broad parent category or define a new taxonomy entry in Domain 2.",
        },
      ],
      trustPrinciples: [
        "Standardized Ontology: Prevents resume inflation caused by synonym fragmentation.",
        "Audit Trail for Overrides: Manual mapping modifications are logged to preserve integrity.",
      ],
      careerTrustCaveat:
        "Mapping a requirement to a canonical skill links existing evidence for that skill; it does not fabricate new evidence if the underlying competency is not demonstrated.",
    },
    troubleshooting: [
      {
        symptom: "Canonical skill does not appear in the dropdown.",
        probableCause: "The skill has not yet been registered in the Skill Passport Taxonomy.",
        verifiedRemedy: "Visit /app/passport/taxonomy to add the canonical competency, then return to mapping.",
      },
      {
        symptom: "Mapping change did not update the match score.",
        probableCause: "Browser tab has stale cache of the active role.",
        verifiedRemedy: "Perform a hard refresh (Ctrl+F5) to reload the updated role demand model.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Role Match Overview",
      nextStepAction: "Review your newly connected capabilities in the match breakdown.",
      targetRoute: "/app/career/match",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with inline editing, alias resolution, and instant match re-calculation.",
    },
    relatedLinks: [
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Taxonomy & Ontology", href: "/app/passport/taxonomy" },
      { label: "Job Description Parser", href: "/app/career/job-parser" },
    ],
  },

  explanations: {
    id: "explanations",
    title: "Match Explanations & Confidence Rationale",
    shortTitle: "Confidence Rationale",
    canonicalRoute: "/app/career/explanations",
    badgeLabel: "Feature · Confidence AI",
    requiredRole: "All Roles (Employee, Reviewer, Admin)",
    iconName: "Sparkles",
    summary:
      "Inspect explainable, Ollama-backed confidence scores and rationale breakdowns for every competency match, reviewing supporting factors, evidence limitations, and uncertainty notes.",
    purpose:
      "Demystify AI confidence scores. Rather than displaying an arbitrary '92% confidence' badge without context, Domain 4 generates an explainable rationale detailing exactly which attributable code artifacts support the claim, where evidence falls short of the target level, and what verification uncertainties exist.",
    whenToUse: [
      "When you want to understand why a specific competency received its assigned confidence score.",
      "When auditing whether an AI extraction was based on substantive code commits vs a fleeting comment.",
      "When presenting your capability claims to an engineering manager or external auditor.",
    ],
    whoCanUse: "All authenticated users inspecting match justification and auditability.",
    prerequisites: ["An active target role evaluated against your portfolio."],
    stepByStep: [
      {
        stepNumber: 1,
        title: "Select Competency to Explain",
        action: "Click any competency chip in the selector bar.",
        buttonOrPath: "Competency selector bar at top of /app/career/explanations",
        details:
          "Choose the requirement you wish to inspect (e.g. 'Python Programming', 'Docker', 'PostgreSQL').",
      },
      {
        stepNumber: 2,
        title: "Review Confidence Score & Summary",
        action: "Examine the hero confidence card and natural language summary.",
        buttonOrPath: "Hero card: Confidence Percentage (e.g. 85%) & Summary paragraph",
        details:
          "Read the plain-English summary explaining the certainty level based on verified work artifacts.",
      },
      {
        stepNumber: 3,
        title: "Inspect Supporting Factors",
        action: "Review green checkmark items in the left column.",
        buttonOrPath: "Section: 'Supporting Factors & Attributable Deliverables'",
        details:
          "Lists specific code repositories, merged pull requests, and verified governance clearances backing the claim.",
      },
      {
        stepNumber: 4,
        title: "Inspect Evidence Limitations",
        action: "Review amber warning items in the middle column.",
        buttonOrPath: "Section: 'Evidence Limitations & Shortfalls'",
        details:
          "Highlights proficiency level gaps, single-source dependencies, or candidate review flags.",
      },
      {
        stepNumber: 5,
        title: "Review Uncertainty Notes & Trust Principles",
        action: "Read purple informational items in the right column.",
        buttonOrPath: "Section: 'Uncertainty Notes & Evaluation Policy'",
        details:
          "Reiterates that skill gaps represent absent proof under the current policy, not candidate inability.",
      },
    ],
    practicalExample: {
      title: "Inspecting an 85% Confidence Score on Python Programming",
      startingState:
        "A candidate wonders why Python Programming received 85% confidence instead of 100%.",
      actionTaken:
        "The candidate visits /app/career/explanations and selects 'Python Programming'.",
      resultingOutcome:
        "The rationale explains: 85% is assigned because the skill is backed by 4 verified GitHub PRs with confirmed code authorship (Supporting Factor). However, all evidence originates from a single repository without cross-source corroboration (Evidence Limitation), preventing an automatic 100% ceiling.",
      inspectionGuide:
        "Check the 'Single-source evidence' bullet in the Evidence Limitations card.",
      recoveryNote:
        "Connecting a second repository or Jira ticket containing Python work will clear the single-source limitation.",
    },
    inputsAndOutputs: {
      requiredInputs: [
        "CompetencyMatchResult with `confidence_rationale` object.",
        "Underlying evidence item IDs and verification states.",
      ],
      outputArtifacts: [
        "Full ConfidenceRationale breakdown (score_percent, score_meaning, summary, supporting_factors, evidence_limitations, uncertainty_notes).",
        "Direct clickable links to substantiating Evidence Workspace artifacts.",
      ],
      originAndProcessing:
        "Generated via `buildConfidenceRationale` in `src/lib/careerCalculations.ts` and mirrored by Ollama LLM pipelines in `backend/app/career/confidence_explainer.py`.",
      generatedVsPersisted:
        "Computed deterministically on demand, maintaining zero hallucination risk while referencing real database evidence IDs.",
    },
    understandingStatus: {
      statusBadges: [
        {
          status: "high_confidence",
          badgeLabel: "High Confidence (80–100%)",
          meaning: "Backed by multiple verified deliverables passing 7-point Trust Center integrity checks with confirmed code authorship.",
          nextAction: "Definitive evidence; ready for high-stakes recruiter inspection.",
        },
        {
          status: "moderate_confidence",
          badgeLabel: "Moderate Confidence (50–79%)",
          meaning: "Extracted from legitimate code deliverables, but relies on a single source or remains in candidate review status.",
          nextAction: "Promote candidate skill or connect a second corroborating repository.",
        },
        {
          status: "discounted_confidence",
          badgeLabel: "Discounted Confidence (<50%)",
          meaning: "Flagged for open attribution conflicts or insufficient code implementation examples.",
          nextAction: "Resolve conflicts in Trust Center (/app/ai/conflicts).",
        },
      ],
      trustPrinciples: [
        "Attributable Grounding: Confidence reflects real cryptographic authorship, not model eloquence.",
        "Limitations Disclosed: The system proactively tells you why a score is not higher, avoiding false certainty.",
      ],
      careerTrustCaveat:
        "Confidence measures evidence certainty under the current data collection policy; it does not measure human intelligence or potential.",
    },
    troubleshooting: [
      {
        symptom: "Confidence score shows 0%.",
        probableCause: "No evidence artifacts have been connected for this competency.",
        verifiedRemedy: "Connect a repository in Evidence Workspace to establish an attributable baseline.",
      },
      {
        symptom: "Supporting factors cite 0 deliverables.",
        probableCause: "The skill was manually added without linking evidence items.",
        verifiedRemedy: "Link evidence items in /app/passport/skills by clicking 'Manage Evidence'.",
      },
    ],
    whatHappensNext: {
      downstreamFeature: "Evidence Workspace & Trust Center",
      nextStepAction: "Inspect original code artifacts or resolve attribution flags.",
      targetRoute: "/app/evidence",
    },
    knownLimitations: {
      status: "fully_implemented",
      notes: "Fully implemented with tri-column rationale cards, single-source detection, and verification discounting.",
    },
    relatedLinks: [
      { label: "Role Match Overview", href: "/app/career/match" },
      { label: "Evidence Workspace", href: "/app/evidence" },
      { label: "Trust & Governance", href: "/app/ai/guard" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GUIDED CROSS-DOMAIN WORKFLOWS
// ─────────────────────────────────────────────────────────────────────────────

export const CAREER_GUIDED_WORKFLOWS: CareerGuidedWorkflow[] = [
  {
    id: "workflow-external-jd-to-target",
    title: "Workflow A: From External Job Description to Active Target Role & Baseline Evaluation",
    summary:
      "Ingest an external job vacancy, extract structured competencies with verbatim quotes, save as an active target demand model, and immediately evaluate your match score.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Discover or Copy Job Description",
        route: "/app/career/discover",
        action: "Find an opening in Discover Jobs or copy text from an employer's website.",
        outcome: "You obtain at least 40 characters of raw job description text.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Parse Job Description",
        route: "/app/career/job-parser",
        action: "Paste text into Job Description Parser and click 'Parse Job Description'.",
        outcome: "Structured competencies are extracted with exact verbatim source spans.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Refine & Crosswalk Mappings",
        route: "/app/career/job-parser",
        action: "Adjust requirement types (Core vs Supporting), check expected proficiencies, and edit any ambiguous mappings.",
        outcome: "A clean, tailored role demand model is prepared.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Save as Custom Target Role",
        route: "/app/career/roles",
        action: "Click 'Save as Custom Role & Compare' to persist in PostgreSQL.",
        outcome: "The custom role is set as your global active target benchmark.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Inspect Immediate Match Alignment",
        route: "/app/career/match",
        action: "Review your Overall Match percentage, Core coverage, and strong matches.",
        outcome: "You obtain an objective, evidence-grounded baseline against the specific vacancy.",
      },
    ],
    keyTakeaway:
      "Job postings become living, versioned engineering benchmarks rather than static bookmarked URLs, automatically grounding your self-development in real market criteria.",
  },

  {
    id: "workflow-triaging-skill-gaps",
    title: "Workflow B: Triaging Skill Gaps: Distinguishing Evidence Gaps from Real Depth Shortfalls",
    summary:
      "Analyze unmet requirements, differentiate missing proof from genuine learning needs, and execute fast resolution in Evidence Workspace or Learn & Grow.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Review Role Match Deficits",
        route: "/app/career/match",
        action: "Identify competencies showing Partial Match or Evidence Gap badges.",
        outcome: "A list of requirements where you currently lack full credit.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Classify in Skill Gap Analysis",
        route: "/app/career/gaps",
        action: "Filter by 'Evidence Gaps' versus 'Depth Gaps' and 'Skill Gaps'.",
        outcome: "Clearly separate unverified claims from real capability shortfalls.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Resolve Evidence Gaps Instantly",
        route: "/app/passport/candidates",
        action: "For Evidence Gaps: navigate to Candidate Review or Evidence Workspace to promote unreviewed claims or connect existing repository commits.",
        outcome: "Verification dampening is lifted, immediately raising effective coverage without studying.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Inspect Depth Gaps on Detail Page",
        route: "/app/career/gaps",
        action: "For genuine Depth Gaps: click 'Why this gap?' to inspect the numerical shortfall (-1 or -2 tiers).",
        outcome: "You understand exactly what production complexity separates your current level from the expected level.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Hand Off to Learn & Grow Roadmap",
        route: "/app/learning/roadmaps",
        action: "Click 'Remediate This Gap' to scaffold a personalized learning journey.",
        outcome: "Domain 5 creates a milestone roadmap targeting the exact deficit.",
      },
    ],
    keyTakeaway:
      "Never spend weeks relearning skills you already know. Always clear Evidence Gaps first before investing time in courses for genuine Skill or Depth Gaps.",
  },

  {
    id: "workflow-strategic-prioritization",
    title: "Workflow C: Strategic Gap Prioritization: Balancing Quick Wins Against Foundational Capabilities",
    summary:
      "Use interactive sliders to tune effort sensitivity and project leverage, identifying high-yield quick wins versus long-term engineering investments.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Open Gap Priorities Engine",
        route: "/app/career/priorities",
        action: "Navigate to Gap Priorities with your active target role loaded.",
        outcome: "All gaps are ranked on a normalized 0–100 priority scale.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Filter for Quick Wins",
        route: "/app/career/priorities",
        action: "Click the 'Quick Wins' filter preset.",
        outcome: "Surfaces skills where you already have existing repository artifacts and low estimated effort.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Tune Project Leverage",
        route: "/app/career/priorities",
        action: "Slide 'Project Leverage Boost' to 1.5x.",
        outcome: "Skills with existing work deliverables to build upon gain higher ranking over cold-start technologies.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Audit Critical Blockers",
        route: "/app/career/priorities",
        action: "Switch to 'Critical Blockers' to identify must-have gatekeepers for readiness.",
        outcome: "Isolates core requirements that prevent stepping into the role.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Execute #1 Ranked Remediation",
        route: "/app/learning/roadmaps",
        action: "Click 'Remediate in Learn & Grow' on the top-ranked gap card.",
        outcome: "Launches focused execution with the highest possible return on learning investment.",
      },
    ],
    keyTakeaway:
      "Strategic prioritization transforms an overwhelming list of 10+ gaps into an ordered, high-conviction sprint plan.",
  },

  {
    id: "workflow-cross-role-career-comparison",
    title: "Workflow D: Cross-Role Career Path Comparison & Transition Planning",
    summary:
      "Evaluate trade-offs across 2–3 alternative engineering trajectories side-by-side, assessing transferable strengths, blocker counts, and optimal transition sequencing.",
    phases: [
      {
        phaseNumber: 1,
        featureTitle: "Select Candidate Roles",
        route: "/app/career/compare",
        action: "Select 2 or 3 aspirational roles (e.g. Senior Backend vs Senior Platform vs Full-Stack).",
        outcome: "The side-by-side comparison matrix renders all roles in parallel columns.",
      },
      {
        phaseNumber: 2,
        featureTitle: "Compare High-Level Readiness Tiers",
        route: "/app/career/compare",
        action: "Evaluate Overall Match %, Core Coverage, and Readiness Tiers across columns.",
        outcome: "Quickly determine which role has the shortest distance to 'High Readiness'.",
      },
      {
        phaseNumber: 3,
        featureTitle: "Filter by Differences Between Roles",
        route: "/app/career/compare",
        action: "Click 'Differences Between Roles' filter view.",
        outcome: "The table isolates the key branching competencies that separate the career paths.",
      },
      {
        phaseNumber: 4,
        featureTitle: "Identify Anchor Transferable Strengths",
        route: "/app/career/compare",
        action: "Look for green rows where both roles share a Strong Match.",
        outcome: "You identify core technical assets that provide stability regardless of path.",
      },
      {
        phaseNumber: 5,
        featureTitle: "Commit Active Target & Execute",
        route: "/app/career/roles",
        action: "Click 'Set as Active Target' on the chosen direction.",
        outcome: "Your portfolio benchmarks, gap rankings, and learning recommendations re-align to that path.",
      },
    ],
    keyTakeaway:
      "Career choices become grounded in objective evidence overlap rather than guesswork, giving you confidence in your engineering trajectory.",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. CONCEPTUAL GLOSSARY (18+ TERMS)
// ─────────────────────────────────────────────────────────────────────────────

export const CAREER_CONCEPTUAL_GLOSSARY: CareerGlossaryTerm[] = [
  {
    term: "Role Demand Model",
    definition:
      "An explicit, structured specification defining the competency requirements, proficiency levels, and importance weightings for a professional engineering position.",
    context:
      "Contrasts with vague prose job descriptions; stored as versioned records (e.g. `v2026.2`) to guarantee reproducible evaluation.",
    relatedRoute: "/app/career/roles",
    relatedRouteLabel: "Target Roles Catalog",
  },
  {
    term: "Active Target Role",
    definition:
      "The single primary role demand model currently designated as the benchmark for all Career Intelligence and Learn & Grow calculations.",
    context:
      "Persisted in PostgreSQL (`user_target_roles`). Setting an active target role updates match scores and gap rankings across the entire platform.",
    relatedRoute: "/app/career/roles",
    relatedRouteLabel: "Target Roles Catalog",
  },
  {
    term: "Proficiency Level (5-Tier Maturity Scale)",
    definition:
      "Standardized 5-point maturity rubric measuring capability execution: Not Established (0), Foundation (1), Working (2), Practitioner (3), Advanced (4), and Expert (5).",
    context:
      "Used across all requirement expectations and user evidence assessments to calculate mathematical coverage.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Raw Coverage (P)",
    definition:
      "The unadjusted ratio of user demonstrated proficiency level ($L_u$) to the role's expected proficiency level ($L_r$): $P = \\min(1.0, L_u / L_r)$.",
    context:
      "Measures pure skill depth before verification discounts are applied.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Verification Adjustment Factor (V)",
    definition:
      "A dampening multiplier reflecting evidence trustworthiness: Verified (1.0), Candidate (0.50–0.80 based on confidence), Insufficient Evidence (0.50), Conflicting (0.35), Not Established (0.0).",
    context:
      "Ensures that unverified claims or disputed authorship cannot receive full credit in high-stakes matching.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Effective Coverage (E)",
    definition:
      "The product of raw proficiency coverage ($P$) and the verification adjustment factor ($V$): $E = P \\times V$.",
    context:
      "The actual numerical value used when calculating weighted overall role match scores.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Overall Role Match Score",
    definition:
      "The weighted average of effective coverage across all role competencies: $\\frac{\\sum E_i \\times w_i}{\\sum w_i} \\times 100$.",
    context:
      "Weights reflect requirement importance: Core Required (1.0), Supporting (0.60), Preferred (0.35), Differentiating (0.20).",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Core Required Coverage Score",
    definition:
      "The weighted coverage score calculated exclusively across competencies marked as 'Core Required'.",
    context:
      "Acts as a foundational hiring gate; a candidate cannot achieve high career readiness without high core coverage.",
    relatedRoute: "/app/career/match",
    relatedRouteLabel: "Role Match Overview",
  },
  {
    term: "Skill Gap",
    definition:
      "A deficit where a required competency has zero attributable evidence or demonstrated execution in the user's profile ($L_u = 0$).",
    context:
      "Represents a genuine capability absence requiring foundational study or practical implementation.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gap Analysis",
  },
  {
    term: "Depth Gap",
    definition:
      "A deficit where a competency is verified and demonstrated, but at a lower proficiency tier than the target role requires ($L_u < L_r$).",
    context:
      "Indicates that basic tutorials are unnecessary; the user requires advanced production challenges and architecture patterns.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gap Analysis",
  },
  {
    term: "Evidence Gap",
    definition:
      "A deficit where a capability is demonstrated at or above expected level, but remains in candidate review, has insufficient evidence, or has conflicting attribution.",
    context:
      "Crucial distinction: an evidence gap means *proof* is missing or unreviewed; it does NOT mean the candidate cannot perform the work.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gap Analysis",
  },
  {
    term: "Application Gap",
    definition:
      "A deficit where theoretical or assessment knowledge exists, but the user lacks attributable production code in an active repository.",
    context:
      "Remediated by delivering an applied open-source repository or workplace production deliverable.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gap Analysis",
  },
  {
    term: "Differentiation Opportunity",
    definition:
      "A preferred or differentiating skill that the candidate satisfies or exceeds, elevating their candidacy above standard baselines.",
    context:
      "Highlights high-value specializations to feature prominently when sharing profiles with recruiters.",
    relatedRoute: "/app/career/gaps",
    relatedRouteLabel: "Skill Gap Analysis",
  },
  {
    term: "Strategic Priority Score",
    definition:
      "A bounded 0–100 ranking score combining remaining gap factor, requirement importance, urgency, effort discount, and project leverage.",
    context:
      "Normalizes gap triage so users know exactly which 1-2 skills will deliver the highest return on learning investment.",
    relatedRoute: "/app/career/priorities",
    relatedRouteLabel: "Gap Priorities",
  },
  {
    term: "Project Leverage Boost",
    definition:
      "A multiplier (up to 1.25x) that elevates the priority of gaps where the user already has connected repository artifacts ready to build upon.",
    context:
      "Encourages extending existing code deliverables rather than starting cold new projects from scratch.",
    relatedRoute: "/app/career/priorities",
    relatedRouteLabel: "Gap Priorities",
  },
  {
    term: "Career Readiness Index",
    definition:
      "A holistic readiness diagnostic combining Core Required Coverage (50%), Overall Alignment (35%), and Evidence Quality (15%).",
    context:
      "Maps candidates into 4 tiers: Early Stage (<40), Developing Foundations (40–59), Moderate Alignment (60–79), High Readiness (80–100).",
    relatedRoute: "/app/career/readiness",
    relatedRouteLabel: "Career Readiness",
  },
  {
    term: "Critical Blocker",
    definition:
      "A core required competency exhibiting a significant proficiency deficit (>=2 levels) or priority score >=60 that impedes readiness tier advancement.",
    context:
      "Must be resolved before a candidate can realistically execute at target role standards.",
    relatedRoute: "/app/career/readiness",
    relatedRouteLabel: "Career Readiness",
  },
  {
    term: "Verbatim Source Span",
    definition:
      "The exact sentence or clause from a raw job description proving where the AI extracted a requirement, preventing hallucinated criteria.",
    context:
      "Displayed on parsed competency cards in the Job Description Parser to ensure complete auditability.",
    relatedRoute: "/app/career/job-parser",
    relatedRouteLabel: "Job Description Parser",
  },
  {
    term: "Ambiguous Mapping",
    definition:
      "A parsed requirement whose phrasing could match multiple canonical taxonomy skills, requiring user confirmation.",
    context:
      "Reviewed and resolved in Role-Skill Mapping to link requirements to standard canonical ontology records.",
    relatedRoute: "/app/career/mapping",
    relatedRouteLabel: "Role-Skill Mapping",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// 4. ROUTE DETECTION UTILITY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps the current Next.js pathname to the most specific Career Intelligence help topic.
 * Falls back to 'overview' for root or non-specific routes.
 */
export function getCareerHelpTopicIdFromPathname(pathname: string): CareerHelpTopicId {
  if (!pathname) return "overview";

  const clean = pathname.toLowerCase();

  if (clean.startsWith("/app/career/discover")) return "discover";
  if (clean.startsWith("/app/career/roles")) return "roles";
  if (clean.startsWith("/app/career/match")) return "match";
  if (clean.startsWith("/app/career/gaps")) return "gaps";
  if (clean.startsWith("/app/career/priorities")) return "priorities";
  if (clean.startsWith("/app/career/readiness")) return "readiness";
  if (clean.startsWith("/app/career/compare")) return "compare";
  if (clean.startsWith("/app/career/job-parser") || clean.startsWith("/app/career/custom-job")) return "job-parser";
  if (clean.startsWith("/app/career/mapping")) return "mapping";
  if (clean.startsWith("/app/career/explanations")) return "explanations";

  return "overview";
}
