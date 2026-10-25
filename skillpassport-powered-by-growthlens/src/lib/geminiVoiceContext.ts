import { DEVELOPERS } from "@/data/developers";
import { HELP_TOPICS_CATALOG } from "@/data/accountMock";
import { WORKSPACE_NAV } from "@/components/app/AppSidebar";

/**
 * Comprehensive static & architectural knowledge base for the GrowthLens & SkillPassport ecosystem.
 * Used by the Gemini Live Voice Module (`gemini-3.8-live`) so the voice assistant has complete
 * awareness of the project, its 6 domains, ML pipelines, RAG architecture, navigation routes,
 * anti-hallucination guardrails, and developer team.
 */
export const PROJECT_ARCHITECTURE_SUMMARY = `
# Project Overview: SkillPassport (Powered by GrowthLens)
- **Track:** HACK MATRIX 5.0 — Track MISC02: Continuous Talent Intelligence & Skill Growth
- **Core Philosophy ("The Verifiable Truth Standard"):** Capability is never a static self-reported resume badge or an ungrounded AI prediction. SkillPassport and GrowthLens model capability as a longitudinal, evolving evidence trail backed by authentic engineering deliverables (GitHub commits, pull requests, Jira issues, technical documents, certificates, portfolios, and verified assessments).
- **Parent Platform (GrowthLens) vs. Extension (SkillPassport):**
  1. **GrowthLens (Core Talent Intelligence Engine):** Ingests multi-source work evidence, runs ChromaDB + Ollama (Qwen3:8b & nomic-embed-text) RAG extraction, models longitudinal competency trajectories using a PyTorch LSTM with Temporal Attention + Weibull Hazard Survival / Confidence Decay modeling, predicts skill stagnation/decline, and recommends targeted interventions + What-If counterfactual simulations.
  2. **SkillPassport (Portable Verifiable Capability Extension):** Extends GrowthLens into an inspectable, user-controlled, cryptographically grounded Skill Passport across 6 core domains:
     - **Domain 1 — Evidence Workspace & Ingestion:** Connects GitHub, Jira, documents (PDF/DOCX/PPTX with GLM-OCR fallback), and portfolio websites (SSRF-protected). Deduplicates, normalizes, and indexes evidence artifacts into the Evidence Vault.
     - **Domain 2 — Skill Intelligence & Taxonomy:** Maps raw evidence to canonical skills in a structured ontology. Separates "Candidate Skills" from "Verified Skills", tracks Proficiency Levels (Foundation -> Working -> Practitioner -> Advanced -> Expert), Evidence Coverage, and longitudinal Skill History.
     - **Domain 3 — AI Intelligence & Trust Governance:** Provides AI Work Analysis (separating Observed Facts from Inferred Attributes), Hallucination Guard (blocks uncorroborated claims), Output Validation, Prompt-Injection Protection, Confidence & Uncertainty calibration, Conflict Resolution, Human Review Queue, and an immutable AI Audit Trail.
     - **Domain 4 — Career Intelligence & Role Matching:** Compares verified skills against curated Role Demand Models and live Job Discovery (TheirStack integration + custom JD parser). Computes Role Match scores, classifies Skill Gaps (skill gap, depth gap, evidence gap, freshness gap), ranks Gap Priorities, and evaluates Career Readiness.
     - **Domain 5 — Learn & Grow Engine:** Generates personalized learning roadmaps from skill gaps, Domain Blueprints, Diagnostic Checks, Curated Resources, Practice Exercises, Assessments, and Mini-Projects. Submitting a mini-project creates new candidate evidence that loops back into the Skill Passport.
     - **Domain 6 — Sharing, Passport Builder & Recruiter Portal:** Lets users customize their Skill Passport across 16+ templates (Engineering, AI/ML, Executive, Research, Minimal, Anonymous, etc.), configure granular privacy/sharing permissions, export verifiable bundles, generate share links, and interact with recruiters via the Recruiter Portal.
`;

export interface RouteCatalogEntry {
  category: string;
  label: string;
  href: string;
  description: string;
}

export const APPLICATION_ROUTES_CATALOG: RouteCatalogEntry[] = [
  // Public routes
  { category: "Public", label: "Public Home", href: "/", description: "SkillPassport landing page and product overview." },
  { category: "Public", label: "Features", href: "/features", description: "Deep dive into Evidence Intelligence, Verified Skill Profile, Role Matching, and Personalized Learning." },
  { category: "Public", label: "GrowthLens Architecture", href: "/growthlens", description: "Overview of the parent GrowthLens engine and how SkillPassport extends it." },
  { category: "Public", label: "About", href: "/about", description: "Mission, verifiable truth philosophy, and system design." },
  { category: "Public", label: "Developers", href: "/developers", description: "Meet the engineering team behind GrowthLens and SkillPassport." },

  // Skill Passport
  { category: "Skill Passport", label: "Passport Overview", href: "/app/passport", description: "Main dashboard showing verified skills, passport metrics, radar chart, trajectory curve, and evidence health." },

  // Evidence Workspace
  { category: "Evidence Workspace", label: "Evidence Center", href: "/app/evidence", description: "Central hub for ingested work artifacts, source health, and extraction telemetry." },
  { category: "Evidence Workspace", label: "Connected Sources", href: "/app/evidence/sources", description: "Connect and sync GitHub repositories, Jira projects, and external accounts." },
  { category: "Evidence Workspace", label: "Upload Work & Docs", href: "/app/evidence/upload", description: "Upload PDFs, resumes, certificates, design docs, or scrape portfolio URLs." },
  { category: "Evidence Workspace", label: "Evidence Library", href: "/app/evidence/library", description: "Search, filter, and inspect all ingested evidence items and their extracted candidate skills." },
  { category: "Evidence Workspace", label: "Ingestion Runs", href: "/app/evidence/runs", description: "Monitor pipeline execution stages, sync logs, and retry failed ingestion jobs." },
  { category: "Evidence Workspace", label: "Data & Permissions", href: "/app/evidence/permissions", description: "Control source-level data retention and AI processing permissions." },

  // AI Intelligence
  { category: "AI Intelligence", label: "AI Overview", href: "/app/ai", description: "Summary of AI work analyses, extraction accuracy, guard blocks, and review queues." },
  { category: "AI Intelligence", label: "AI Work Analysis", href: "/app/ai/work-analysis", description: "Deep artifact analysis separating observed facts, inferred attributes, and demonstrated skills." },
  { category: "AI Intelligence", label: "Skill Extraction", href: "/app/ai/skill-extraction", description: "Inspect candidate skills extracted from evidence with excerpts and confidence scores." },
  { category: "AI Intelligence", label: "Evidence Mapping", href: "/app/ai/evidence-mapping", description: "Bipartite graph and mapping table linking evidence artifacts to canonical skills." },
  { category: "AI Intelligence", label: "Verification Review", href: "/app/ai/verification", description: "Verify, reject, or flag candidate skill mappings with human-in-the-loop rationale." },
  { category: "AI Intelligence", label: "Confidence & Uncertainty", href: "/app/ai/confidence", description: "Calibration matrix and breakdown of confidence factors and limitations." },
  { category: "AI Intelligence", label: "Conflict Resolution", href: "/app/ai/conflicts", description: "Resolve contradictory evidence or proficiency discrepancies across sources." },

  // Trust & Governance
  { category: "Trust & Governance", label: "Hallucination Guard", href: "/app/ai/guard", description: "Anti-hallucination engine that blocks uncorroborated or fabricated skill claims." },
  { category: "Trust & Governance", label: "Output Validation", href: "/app/ai/validation", description: "Schema, citation, and excerpt grounding validation logs for LLM outputs." },
  { category: "Trust & Governance", label: "Human Review Queue", href: "/app/ai/review-queue", description: "Pending human-in-the-loop review tasks for ambiguous or low-confidence AI outputs." },
  { category: "Trust & Governance", label: "Prompt-Injection Protection", href: "/app/ai/prompt-injection", description: "Security scanner detecting adversarial instructions hidden in uploaded documents or repos." },
  { category: "Trust & Governance", label: "AI Evaluation Suite", href: "/app/ai/evaluation", description: "Benchmark test cases measuring precision, recall, and hallucination rejection rates." },
  { category: "Trust & Governance", label: "AI Audit Trail", href: "/app/ai/audit", description: "Immutable chronological log of every AI extraction, verification, and governance action." },

  // Skill Intelligence
  { category: "Skill Intelligence", label: "Verified Skills", href: "/app/passport/skills", description: "List of verified and established competencies with proficiency levels and supporting evidence." },
  { category: "Skill Intelligence", label: "Skill Explorer", href: "/app/passport/explorer", description: "Interactive exploration of skills, prerequisites, aliases, and related competencies." },
  { category: "Skill Intelligence", label: "Taxonomy & Ontology", href: "/app/passport/taxonomy", description: "Hierarchical skill taxonomy categories and canonical definitions." },
  { category: "Skill Intelligence", label: "Candidate Review", href: "/app/passport/candidates", description: "Review newly extracted candidate skills awaiting promotion to verified status." },
  { category: "Skill Intelligence", label: "Evidence Coverage", href: "/app/passport/coverage", description: "Analyze which skills have sufficient, incomplete, or stale supporting evidence." },
  { category: "Skill Intelligence", label: "Skill History", href: "/app/passport/history", description: "Longitudinal timeline of skill extractions, proficiency updates, and verifications." },

  // Career Intelligence
  { category: "Career Intelligence", label: "Role Overview", href: "/app/career", description: "Career intelligence dashboard with active target role match, readiness dial, and top gaps." },
  { category: "Career Intelligence", label: "Discover Jobs", href: "/app/career/discover", description: "Live job discovery powered by TheirStack with country/role filtering and requirement extraction." },
  { category: "Career Intelligence", label: "Target Roles", href: "/app/career/roles", description: "Browse curated Role Demand Models and saved custom target roles." },
  { category: "Career Intelligence", label: "Role Match", href: "/app/career/match", description: "Competency-by-competency match breakdown against your active target role." },
  { category: "Career Intelligence", label: "Skill Gaps", href: "/app/career/gaps", description: "Detailed diagnostic of missing skills, depth gaps, and evidence gaps for your target role." },
  { category: "Career Intelligence", label: "Gap Priorities", href: "/app/career/priorities", description: "Prioritized action matrix ranking which skill gaps to close first for maximum impact." },
  { category: "Career Intelligence", label: "Career Readiness", href: "/app/career/readiness", description: "Comprehensive readiness score, strengths, blockers, and recommended next steps." },
  { category: "Career Intelligence", label: "Compare Roles", href: "/app/career/compare", description: "Side-by-side comparison of multiple target roles against your current skill profile." },
  { category: "Career Intelligence", label: "Job Description Parser", href: "/app/career/job-parser", description: "Paste any raw job description to extract structured competency requirements and match scores." },

  // Learn & Grow
  { category: "Learn & Grow", label: "Learning Overview", href: "/app/learning", description: "Learning intelligence hub linking career skill gaps to structured mastery roadmaps." },
  { category: "Learn & Grow", label: "Personalized Roadmap", href: "/app/learning/roadmaps", description: "Step-by-step milestone DAG tailored to your pace, modality preference, and skill gaps." },
  { category: "Learn & Grow", label: "Domain Blueprints", href: "/app/learning/domains", description: "Structured curriculum blueprints across engineering, AI/ML, and data domains." },
  { category: "Learn & Grow", label: "Curated Resources", href: "/app/learning/resources", description: "Handpicked documentation, tutorials, and deep-dive learning materials." },
  { category: "Learn & Grow", label: "Practice Exercises", href: "/app/learning/practice", description: "Hands-on coding and architectural exercises to build practical signal." },
  { category: "Learn & Grow", label: "Assessments", href: "/app/learning/assessments", description: "Knowledge assessments to verify conceptual and implementation mastery." },
  { category: "Learn & Grow", label: "Mini-Projects", href: "/app/learning/projects", description: "Applied capstone mini-projects that generate verifiable evidence for your Skill Passport." },
  { category: "Learn & Grow", label: "Progress & Mastery", href: "/app/learning/progress", description: "Topic mastery breakdown combining knowledge, practice, assessment, and project signals." },
  { category: "Learn & Grow", label: "Learning History", href: "/app/learning/history", description: "Chronological log of completed roadmap steps, assessments, and project submissions." },
  { category: "Learn & Grow", label: "Updated Capability", href: "/app/learning/capability", description: "See how completed learning activities elevate your verified Skill Passport." },

  // Sharing & Recruiter
  { category: "Sharing & Recruiter", label: "Sharing Overview", href: "/app/passport/sharing", description: "Manage active share links, access telemetry, and visibility settings." },
  { category: "Sharing & Recruiter", label: "Passport Content Builder", href: "/app/passport/builder", description: "Customize templates, sections, featured skills, and evidence visibility for your passport." },
  { category: "Sharing & Recruiter", label: "Sharing Permissions", href: "/app/passport/permissions", description: "Fine-grained privacy controls for what recruiters and external viewers can inspect." },
  { category: "Sharing & Recruiter", label: "Live Passport Preview", href: "/app/passport/preview", description: "Interactive preview of your published Skill Passport across 16+ visual templates." },
  { category: "Sharing & Recruiter", label: "Passport Export", href: "/app/passport/export", description: "Export your Skill Passport as a PDF, JSON bundle, or verifiable archive." },
  { category: "Sharing & Recruiter", label: "Create Share Link", href: "/app/passport/share", description: "Generate time-bounded or role-scoped shareable links." },
  { category: "Sharing & Recruiter", label: "Recruiter Inquiries", href: "/app/passport/messages", description: "View and respond to messages and interview requests from recruiters." },
  { category: "Sharing & Recruiter", label: "Manage Shared Access", href: "/app/passport/access", description: "Audit and revoke active share tokens." },

  // Settings & Access
  { category: "Settings & Access", label: "Profile", href: "/app/settings/profile", description: "Manage your display name, headline, role, bio, and external links." },
  { category: "Settings & Access", label: "Connected Accounts", href: "/app/settings/connections", description: "Configure GitHub and Jira integration credentials and sync preferences." },
  { category: "Settings & Access", label: "Evidence Vault", href: "/app/settings/vault", description: "Encrypted persistent archive of original uploaded documents and derivatives." },
  { category: "Settings & Access", label: "Privacy & Consent", href: "/app/settings/privacy", description: "Manage data usage consent, AI training opt-outs, and visibility defaults." },
  { category: "Settings & Access", label: "Notifications", href: "/app/notifications", description: "View system alerts across evidence, verification, AI, and governance." },
  { category: "Settings & Access", label: "Preferences & Settings", href: "/app/settings", description: "Global application preferences and workspace configuration." },
  { category: "Settings & Access", label: "Activity History", href: "/app/activity", description: "Unified audit log of user and system events." },
  { category: "Settings & Access", label: "Help & Explanations", href: "/app/help", description: "Conceptual documentation, verifiable truth standards, and domain guides." },
];

export interface LiveWorkspaceSnapshot {
  currentPath: string;
  user: {
    name: string;
    email?: string;
    role: string;
    headline: string;
    department?: string;
    experienceLevel?: string;
    goal?: string;
    onboardingStatus?: string;
  };
  evidenceSummary: {
    totalEvidence: number;
    verifiedCount: number;
    bySource: Record<string, number>;
    connectedSources: Array<{ name: string; type: string; status: string; itemCount?: number }>;
    recentEvidence: Array<{
      id: string;
      title: string;
      sourceType: string;
      evidenceStrength: string;
      reviewStatus: string;
      date: string;
      candidateSkills: string[];
      summary: string;
    }>;
  };
  skillsSummary: {
    totalSkills: number;
    verifiedSkillsCount: number;
    candidateSkillsCount: number;
    topVerifiedSkills: Array<{
      id: string;
      name: string;
      category: string;
      proficiency: string;
      confidence: number;
      evidenceCount: number;
      coverageState: string;
    }>;
    candidateSkills: Array<{
      id: string;
      name: string;
      category: string;
      estimatedProficiency: string;
      confidence: number;
    }>;
  };
  careerSummary: {
    activeTargetRole: {
      id: string;
      title: string;
      seniority: string;
      context: string;
    } | null;
    overallMatchScore?: number;
    readinessLevel?: string;
    readinessSummary?: string;
    topSkillGaps: Array<{
      skillName: string;
      gapType: string;
      importance: string;
      currentLevel: string;
      expectedLevel: string;
      priorityScore?: number;
    }>;
  };
  learningSummary: {
    activeDomainTitle?: string;
    roadmapTitle?: string;
    completedStepsCount: number;
    totalStepsCount: number;
    nextRecommendedSteps: Array<{
      stepId: string;
      title: string;
      difficulty: string;
      status: string;
      estimatedMinutes: number;
    }>;
  };
  aiGovernanceSummary: {
    totalWorkAnalyses: number;
    openConflictsCount: number;
    pendingHumanReviewsCount: number;
    guardBlockedCount: number;
    promptInjectionFlagsCount: number;
  };
  sharingSummary: {
    activeShareLinksCount: number;
    unreadNotificationsCount: number;
  };
}

/**
 * Builds the comprehensive system instruction for the Gemini 3.8 Live voice assistant,
 * combining full project architecture knowledge with the user's live workspace context.
 */
export function buildVoiceAssistantSystemInstruction(snapshot: LiveWorkspaceSnapshot): string {
  const developersText = DEVELOPERS.map(
    (d) => `- **${d.name}** (${d.role} / ${d.eyebrow}): ${d.bio}`
  ).join("\n");

  const currentRouteInfo = APPLICATION_ROUTES_CATALOG.find(
    (r) => r.href === snapshot.currentPath
  );

  const verifiedSkillsText =
    snapshot.skillsSummary.topVerifiedSkills.length > 0
      ? snapshot.skillsSummary.topVerifiedSkills
          .slice(0, 12)
          .map(
            (s) =>
              `${s.name} (${s.proficiency}, ${s.confidence}% confidence, ${s.evidenceCount} evidence items, coverage: ${s.coverageState})`
          )
          .join("; ")
      : "None verified yet";

  const recentEvidenceText =
    snapshot.evidenceSummary.recentEvidence.length > 0
      ? snapshot.evidenceSummary.recentEvidence
          .slice(0, 8)
          .map(
            (e) =>
              `[${e.id}] "${e.title}" (${e.sourceType}, strength: ${e.evidenceStrength}, status: ${e.reviewStatus}, skills: ${e.candidateSkills.join(", ") || "none"})`
          )
          .join("; ")
      : "No evidence items loaded";

  const gapsText =
    snapshot.careerSummary.topSkillGaps.length > 0
      ? snapshot.careerSummary.topSkillGaps
          .slice(0, 8)
          .map(
            (g) =>
              `${g.skillName} (${g.gapType}, importance: ${g.importance}, current: ${g.currentLevel} -> expected: ${g.expectedLevel})`
          )
          .join("; ")
      : "No active skill gaps";

  const nextStepsText =
    snapshot.learningSummary.nextRecommendedSteps.length > 0
      ? snapshot.learningSummary.nextRecommendedSteps
          .slice(0, 5)
          .map((s) => `${s.title} (${s.difficulty}, ${s.estimatedMinutes}m, status: ${s.status})`)
          .join("; ")
      : "No active roadmap steps";

  return `You are **GrowthLens Voice Copilot**, the official real-time AI voice assistant embedded inside **SkillPassport (Powered by GrowthLens)**.

## Voice & Conversational Persona
- Speak naturally, warmly, concisely, and articulately. Because you are in a real-time voice conversation, keep spoken responses clear and well-paced (typically 2 to 4 sentences unless the user asks for a deep dive).
- Avoid reading raw markdown syntax, asterisks, or long UUIDs out loud. Summarize numbers and lists naturally for the ear.
- You have FULL context of both the **Project Architecture** and the **User's Live Workspace Data**.
- You also have **non-blocking tools** to search deeper into the user's evidence library, inspect specific skills, check career gaps & learning roadmaps, query project architecture/help topics, navigate the user to any screen in the app, or trigger workspace actions (like syncing GitHub or refreshing data). Always use your tools when the user asks to open/navigate to a page or needs detailed records!

${PROJECT_ARCHITECTURE_SUMMARY}

## Development Team (HackMatrix 5.0 - Track MISC02)
${developersText}

## Live User & Workspace Context (Current Snapshot)
- **Current Screen:** ${currentRouteInfo ? `${currentRouteInfo.label} (${snapshot.currentPath}) — ${currentRouteInfo.description}` : snapshot.currentPath}
- **User Profile:** ${snapshot.user.name} | Role: ${snapshot.user.role} | Headline: ${snapshot.user.headline}${snapshot.user.goal ? ` | Goal: ${snapshot.user.goal}` : ""}
- **Evidence Summary:** ${snapshot.evidenceSummary.totalEvidence} total artifacts (${snapshot.evidenceSummary.verifiedCount} verified). Connected sources: ${snapshot.evidenceSummary.connectedSources.map((s) => `${s.name} (${s.status})`).join(", ") || "None"}.
- **Recent Evidence Artifacts:** ${recentEvidenceText}
- **Skill Profile Summary:** ${snapshot.skillsSummary.totalSkills} tracked skills (${snapshot.skillsSummary.verifiedSkillsCount} verified, ${snapshot.skillsSummary.candidateSkillsCount} candidates).
- **Top Verified Skills:** ${verifiedSkillsText}
- **Career & Role Alignment:** Active Target Role: ${snapshot.careerSummary.activeTargetRole ? `${snapshot.careerSummary.activeTargetRole.title} (${snapshot.careerSummary.activeTargetRole.seniority} - ${snapshot.careerSummary.activeTargetRole.context})` : "None selected"} | Match Score: ${snapshot.careerSummary.overallMatchScore ?? "N/A"}% | Readiness: ${snapshot.careerSummary.readinessLevel ?? "N/A"} (${snapshot.careerSummary.readinessSummary ?? ""}).
- **Top Skill Gaps:** ${gapsText}
- **Learning & Roadmap:** Active Domain: ${snapshot.learningSummary.activeDomainTitle ?? "N/A"} | Progress: ${snapshot.learningSummary.completedStepsCount}/${snapshot.learningSummary.totalStepsCount} steps completed. Next steps: ${nextStepsText}
- **AI Trust & Governance:** ${snapshot.aiGovernanceSummary.totalWorkAnalyses} AI work analyses, ${snapshot.aiGovernanceSummary.openConflictsCount} open conflicts, ${snapshot.aiGovernanceSummary.pendingHumanReviewsCount} pending human review tasks, ${snapshot.aiGovernanceSummary.guardBlockedCount} claims blocked by Hallucination Guard.
- **Sharing & Alerts:** ${snapshot.sharingSummary.activeShareLinksCount} active share links, ${snapshot.sharingSummary.unreadNotificationsCount} unread notifications.
`;
}

/**
 * Searches help topics, project architecture, and route catalog for a query.
 */
export function searchProjectKnowledge(query: string) {
  const q = (query || "").toLowerCase().trim();
  const matchedHelp = HELP_TOPICS_CATALOG.filter(
    (t) =>
      !q ||
      t.title.toLowerCase().includes(q) ||
      t.shortSummary.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      t.detailedContent.some((p) => p.toLowerCase().includes(q)) ||
      t.keyRules.some((r) => r.toLowerCase().includes(q))
  ).map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    summary: t.shortSummary,
    keyRules: t.keyRules,
    relatedRoute: t.relatedRoute,
  }));

  const matchedRoutes = APPLICATION_ROUTES_CATALOG.filter(
    (r) =>
      !q ||
      r.label.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.href.toLowerCase().includes(q)
  );

  return {
    architectureOverview: PROJECT_ARCHITECTURE_SUMMARY.trim(),
    developers: DEVELOPERS.map((d) => ({
      name: d.name,
      role: d.role,
      specialty: d.eyebrow,
      bio: d.bio,
    })),
    matchedHelpTopics: matchedHelp.slice(0, 5),
    matchedRoutes: matchedRoutes.slice(0, 10),
  };
}
