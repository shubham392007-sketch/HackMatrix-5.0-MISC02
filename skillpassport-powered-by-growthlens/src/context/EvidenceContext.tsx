"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  EvidenceItem,
  ConnectedSource,
  IngestionRun,
  ReviewStatus,
  SourceType,
  ConnectionStatus,
  ProcessingStatus,
  EvidenceStrength,
} from "@/types/evidence";
import {
  INITIAL_CONNECTED_SOURCES,
  INITIAL_EVIDENCE_ITEMS,
  INITIAL_INGESTION_RUNS,
} from "@/data/evidenceMock";
import { supabase } from "@/lib/supabase/client";
import {
  listEvidenceItems,
  deleteEvidenceItem as apiDeleteEvidence,
  listConnectedSources,
  listIngestionRuns,
  reviewEvidenceItem,
  getMyProfile,
  listWorkAnalyses,
  listCandidateSkills,
  listEvidenceMappings,
  listGuardResults,
  listOutputValidations,
  getConfidenceBreakdown,
  listConflicts,
  listReviewTasks,
  listPromptInjectionFindings,
  listAIAuditEvents,
  runWorkAnalysis,
  runSkillExtraction,
  reviewCandidateVerification,
  resolveConflict,
  actionReviewTask,
  listPassportSkills,
  listPassportTaxonomy,
  listPassportHistory,
  reviewPassportCandidate,
  DatabaseUnavailableError,
} from "@/lib/evidenceApi";
import {
  SkillItem,
  SkillHistoryEvent,
  TaxonomyCategory,
} from "@/types/passport";
import {
  DemoRole,

  WorkAnalysisResult,
  ExtractionCandidateItem,
  EvidenceMappingItem,
  SkillVerificationRecord,
  ConfidenceClaim,
  ConflictRecord,
  GuardClaimResult,
  OutputValidationRecord,
  PromptInjectionFlag,
  HumanReviewTask,
  AIEvalCase,
  AIAuditEvent,
} from "@/types/ai";
import {
  RoleDemandModel,
  RoleMatchResult,
  GapRecord,
  CareerReadinessAssessment,
  RoleCompetency,
} from "@/types/career";
import { INITIAL_CURATED_ROLES } from "@/data/careerMock";
import {
  evaluateRoleMatch,
  extractGapRecords,
  evaluateCareerReadiness,
} from "@/lib/careerCalculations";
import {
  DomainBlueprint,
  DiagnosticResult,
  LearningRoadmap,
  LearningResource,
  PracticeExercise,
  KnowledgeAssessment,
  AssessmentAttempt,
  MiniProject,
  MiniProjectAttempt,
  RemediationSession,
  LearningHistoryEvent,
  CandidateLearningEvidence,
} from "@/types/learning";
import {
  INITIAL_BLUEPRINTS,
  INITIAL_RESOURCES,
  INITIAL_PRACTICE_EXERCISES,
  INITIAL_KNOWLEDGE_ASSESSMENT,
  INITIAL_MINI_PROJECT,
  INITIAL_REMEDIATION_SESSION,
  INITIAL_LEARNING_HISTORY,
  INITIAL_CANDIDATE_EVIDENCES,
} from "@/data/learningMock";
import {
  generatePersonalizedRoadmap,
  createCandidateEvidenceFromProject,
  calculateTopicMastery,
} from "@/lib/learningCalculations";
import {
  ShareRecord,
  SharePermissionsConfig,
  ShareProjection,
  ShareActivityEvent,
} from "@/types/sharing";
import {
  INITIAL_SHARE_RECORDS,
  INITIAL_SHARE_ACTIVITIES,
} from "@/data/sharingMock";
import {
  DEFAULT_SHARE_PERMISSIONS,
  buildShareProjection,
} from "@/lib/sharingCalculations";
import {
  UserProfile,
  ConnectedSourceDetails,
  PrivacyPreferences,
  AppNotification,
  AppSettings,
  UnifiedActivityEvent,
} from "@/types/account";
import {
  INITIAL_USER_PROFILE,
  INITIAL_APP_NOTIFICATIONS,
  INITIAL_APP_SETTINGS,
  INITIAL_PRIVACY_PREFERENCES,
  INITIAL_CONNECTED_SOURCE_DETAILS,
  INITIAL_UNIFIED_ACTIVITIES,
} from "@/data/accountMock";

interface EvidenceContextType {
  evidenceItems: EvidenceItem[];
  sources: ConnectedSource[];
  ingestionRuns: IngestionRun[];
  initialLoading: boolean;
  isLoadingEvidence: boolean;
  skills: SkillItem[];
  historyEvents: SkillHistoryEvent[];
  taxonomyCategories: TaxonomyCategory[];
  passportMetrics?: {
    total_skills: number;
    verified_count: number;
    candidate_count: number;
    coverage_rate: number;
    top_proficiency: string;
    avg_confidence: number;
  } | null;
  
  // Domain 3 AI State
  currentRole: DemoRole;
  setDemoRole: (role: DemoRole) => void;
  workAnalyses: WorkAnalysisResult[];
  extractionCandidates: ExtractionCandidateItem[];
  evidenceMappings: EvidenceMappingItem[];
  verifications: SkillVerificationRecord[];
  confidenceClaims: ConfidenceClaim[];
  conflicts: ConflictRecord[];
  guardResults: GuardClaimResult[];
  validationRecords: OutputValidationRecord[];
  promptInjectionFlags: PromptInjectionFlag[];
  reviewTasks: HumanReviewTask[];
  evalCases: AIEvalCase[];
  aiAuditEvents: AIAuditEvent[];

  // Mutators
  addEvidenceItem: (item: Omit<EvidenceItem, "id">) => void;
  deleteEvidenceItem: (id: string) => Promise<void>;
  updateEvidenceItem: (id: string, updates: Partial<EvidenceItem>) => void;
  confirmContribution: (evidenceId: string) => void;
  updateCandidateSkillStatus: (
    evidenceId: string,
    skillId: string,
    status: "candidate" | "reviewed" | "flagged" | "insufficient"
  ) => void;
  connectSource: (sourceType: string, selectedEntities: string[]) => void;
  disconnectSource: (sourceId: string) => void;
  retryIngestionRun: (runId: string) => void;
  updateSkill: (id: string, updates: Partial<SkillItem>) => void;
  addHistoryEvent: (event: Omit<SkillHistoryEvent, "id">) => void;
  reviewCandidateSkill: (
    mappingId: string,
    action: "verify" | "reject" | "flag_insufficient",
    rationale: string
  ) => Promise<any>;

  // Domain 3 Mutators
  addAIAuditEvent: (event: Omit<AIAuditEvent, "id">) => void;
  updateConflict: (id: string, updates: Partial<ConflictRecord>) => void;
  updateReviewTask: (id: string, updates: Partial<HumanReviewTask>) => void;
  updateValidationRecord: (id: string, updates: Partial<OutputValidationRecord>) => void;
  updateWorkAnalysis: (id: string, updates: Partial<WorkAnalysisResult>) => void;
  updateExtractionCandidate: (id: string, updates: Partial<ExtractionCandidateItem>) => void;
  updateVerification: (id: string, updates: Partial<SkillVerificationRecord>) => void;
  updateGuardResult: (id: string, updates: Partial<GuardClaimResult>) => void;
  updatePromptInjectionFlag: (id: string, updates: Partial<PromptInjectionFlag>) => void;

  // Domain 4 Career Intelligence State & Mutators
  targetRoles: RoleDemandModel[];
  selectedRoleId: string;
  setSelectedRoleId: (roleId: string) => void;
  customRoles: RoleDemandModel[];
  saveCustomRole: (role: RoleDemandModel) => void;
  updateRoleCompetency: (
    roleId: string,
    skillId: string,
    updates: Partial<RoleCompetency>
  ) => void;
  activeRole: RoleDemandModel;
  activeMatch: RoleMatchResult;
  activeGaps: GapRecord[];
  activeReadiness: CareerReadinessAssessment;

  // Domain 5 Learning Intelligence State & Mutators
  blueprints: DomainBlueprint[];
  activeDomainId: string;
  setActiveDomainId: (id: string) => void;
  activeBlueprint: DomainBlueprint;
  roadmaps: Record<string, LearningRoadmap>;
  activeRoadmap: LearningRoadmap;
  diagnosticResults: Record<string, DiagnosticResult>;
  activeDiagnosticResult?: DiagnosticResult;
  miniProjects: MiniProject[];
  activeMiniProject: MiniProject;
  assessment: KnowledgeAssessment;
  assessmentAttempts: AssessmentAttempt[];
  remediationSession: RemediationSession;
  learningHistory: LearningHistoryEvent[];
  candidateEvidences: CandidateLearningEvidence[];
  resources: LearningResource[];
  practiceExercises: PracticeExercise[];

  updateRoadmapPreferences: (
    domainId: string,
    hours: number,
    preference: "text-first" | "video-first" | "practice-first",
    pace: "standard" | "fast_track"
  ) => void;
  recordDiagnosticResult: (result: DiagnosticResult) => void;
  completeStep: (stepId: string) => void;
  completePracticeExercise: (exerciseId: string, score: number) => void;
  recordAssessmentAttempt: (attempt: AssessmentAttempt) => void;
  submitMiniProject: (
    projectId: string,
    repoUrl: string,
    notes: string
  ) => void;
  completeRemediation: (sessionId: string) => void;
  addLearningHistoryEvent: (event: Omit<LearningHistoryEvent, "id">) => void;

  // Domain 6 Sharing State & Mutators
  shareRecords: ShareRecord[];
  shareActivities: ShareActivityEvent[];
  draftPermissions: SharePermissionsConfig;
  setDraftPermissions: React.Dispatch<React.SetStateAction<SharePermissionsConfig>>;
  createShareRecord: (label: string, config: SharePermissionsConfig) => ShareRecord;
  updateSharePermissions: (shareId: string, config: SharePermissionsConfig) => void;
  revokeShareRecord: (shareId: string, reason?: string) => void;
  getShareProjection: (shareId: string) => ShareProjection | null;
  recordShareAccess: (shareId: string) => void;

  // Global Application & Account Layer
  userProfile: UserProfile;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  connectedSourceDetails: ConnectedSourceDetails[];
  syncSourceSimulated: (sourceId: string) => Promise<{ success: boolean; message: string }>;
  disconnectSourceSafe: (sourceId: string, deleteImportedEvidence: boolean) => void;
  reconnectSourceSimulated: (sourceId: string) => void;
  privacyPreferences: PrivacyPreferences;
  updatePrivacyPreferences: (updates: Partial<PrivacyPreferences>) => void;
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  addNotification: (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  appSettings: AppSettings;
  updateAppSettings: (updates: Partial<AppSettings>) => void;
  unifiedActivities: UnifiedActivityEvent[];
  addUnifiedActivity: (act: Omit<UnifiedActivityEvent, "id">) => void;
  toasts: { id: string; title: string; message: string; type: "success" | "error" | "info" }[];
  addToast: (title: string, message: string, type?: "success" | "error" | "info") => void;
  removeToast: (id: string) => void;

  // Mobile Navigation Drawer State
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleMobileSidebar: () => void;

  // Live Evidence Synchronization & Database Resilience
  refreshEvidenceData: (force?: boolean) => Promise<void>;
  isDatabaseUnavailable: boolean;
  dbRetryAfterSeconds: number;

  // Authentication State
  isAuthenticated: boolean;
  authChecked: boolean;
  loginDemo: (role?: DemoRole, userOverrides?: Partial<UserProfile>) => void;
  logoutDemo: () => void;
}

const EvidenceContext = createContext<EvidenceContextType | undefined>(undefined);

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sp_live_evidence_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [sources, setSources] = useState<ConnectedSource[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sp_live_sources_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRun[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sp_live_runs_cache");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [historyEvents, setHistoryEvents] = useState<SkillHistoryEvent[]>([]);
  const [taxonomyCategories, setTaxonomyCategories] = useState<TaxonomyCategory[]>([]);
  const [passportMetrics, setPassportMetrics] = useState<{
    total_skills: number;
    verified_count: number;
    candidate_count: number;
    coverage_rate: number;
    top_proficiency: string;
    avg_confidence: number;
  } | null>(null);


  const [initialLoading, setInitialLoading] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = sessionStorage.getItem("sp_live_evidence_cache");
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [isLoadingEvidence, setIsLoadingEvidence] = useState<boolean>(false);

  const isFetchingRef = React.useRef<boolean>(false);
  const lastFetchTimeRef = React.useRef<number>(0);

  // Mobile Navigation Drawer State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);

  // Domain 3 AI State - Zero Demo Data, live database-driven
  const [currentRole, setDemoRole] = useState<DemoRole>("employee");
  const [workAnalyses, setWorkAnalyses] = useState<WorkAnalysisResult[]>([]);
  const [extractionCandidates, setExtractionCandidates] = useState<ExtractionCandidateItem[]>([]);
  const [evidenceMappings, setEvidenceMappings] = useState<EvidenceMappingItem[]>([]);
  const [verifications, setVerifications] = useState<SkillVerificationRecord[]>([]);
  const [confidenceClaims, setConfidenceClaims] = useState<ConfidenceClaim[]>([]);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [guardResults, setGuardResults] = useState<GuardClaimResult[]>([]);
  const [validationRecords, setValidationRecords] = useState<OutputValidationRecord[]>([]);
  const [promptInjectionFlags, setPromptInjectionFlags] = useState<PromptInjectionFlag[]>([]);
  const [reviewTasks, setReviewTasks] = useState<HumanReviewTask[]>([]);
  const [evalCases, setEvalCases] = useState<AIEvalCase[]>([]);
  const [aiAuditEvents, setAiAuditEvents] = useState<AIAuditEvent[]>([]);

  // Domain 4 Career Intelligence State
  const [selectedRoleId, setSelectedRoleIdState] = useState<string>("role-ai-engineer-entry");
  const [customRoles, setCustomRoles] = useState<RoleDemandModel[]>([]);

  // Global Application Layer State
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [connectedSourceDetails, setConnectedSourceDetails] = useState<ConnectedSourceDetails[]>(INITIAL_CONNECTED_SOURCE_DETAILS);
  const [privacyPreferences, setPrivacyPreferences] = useState<PrivacyPreferences>(INITIAL_PRIVACY_PREFERENCES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_APP_NOTIFICATIONS);
  const [appSettings, setAppSettings] = useState<AppSettings>(INITIAL_APP_SETTINGS);
  const [unifiedActivities, setUnifiedActivities] = useState<UnifiedActivityEvent[]>(INITIAL_UNIFIED_ACTIVITIES);
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: "success" | "error" | "info" }[]>([]);

  // Demo Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // Database Resilience State
  const [isDatabaseUnavailable, setIsDatabaseUnavailable] = useState<boolean>(false);
  const [dbRetryAfterSeconds, setDbRetryAfterSeconds] = useState<number>(0);

  const refreshEvidenceData = useCallback(async (force: boolean = false) => {
    if (isFetchingRef.current) return;
    const now = Date.now();
    if (!force && now - lastFetchTimeRef.current < 4000) {
      return;
    }
    isFetchingRef.current = true;
    setIsLoadingEvidence(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session?.access_token) {
        setInitialLoading(false);
        setIsLoadingEvidence(false);
        return;
      }

      // Stage 1: Fast Core Domain 1 Ingestion Data (Evidence, Sources, Runs, Profile)
      const [evRes, srcRes, runsRes, profileRes] = await Promise.allSettled([
        listEvidenceItems({ pageSize: 500 }),
        listConnectedSources(),
        listIngestionRuns(),
        getMyProfile(),
      ]);

      const dbDownError = [evRes, srcRes, runsRes, profileRes].find(
        (r) =>
          r.status === "rejected" &&
          (r.reason instanceof DatabaseUnavailableError ||
            r.reason?.status === 503 ||
            r.reason?.name === "DatabaseUnavailableError")
      );

      if (dbDownError && dbDownError.status === "rejected") {
        setIsDatabaseUnavailable(true);
        const retrySec = dbDownError.reason?.retryAfter || 15;
        setDbRetryAfterSeconds(retrySec);
        console.warn(`[EvidenceContext] Database temporarily unavailable (503). Retrying in ${retrySec}s. Using cached state.`);
      } else if (evRes.status === "fulfilled") {
        setIsDatabaseUnavailable(false);
        setDbRetryAfterSeconds(0);
      }

      if (evRes.status === "fulfilled" && evRes.value?.items && Array.isArray(evRes.value.items)) {
        const mappedItems: EvidenceItem[] = evRes.value.items.map((raw: any) => ({
          id: raw.id,
          externalRecordId: raw.externalRecordId || raw.external_record_id,
          title: raw.title || "Untitled Evidence",
          description: raw.description || "",
          sourceType: (raw.sourceType || raw.provider || "document") as SourceType,
          sourceReference: raw.sourceName || raw.sourceUrl || "Uploaded Document",
          sourceUrl: raw.sourceUrl,
          project: raw.projectName || raw.project_name || raw.sourceName || "General",
          evidenceType: raw.category || "General Evidence",
          date: raw.observedAt ? new Date(raw.observedAt).toLocaleDateString() : "Recently",
          claimedContribution: raw.attributionStatus === "author" ? "Author" : "Contributor",
          author: raw.contributorIdentity || "User",
          isCollaborative: Boolean(raw.isCollaborative),
          evidenceStrength: (raw.strength || "medium") as EvidenceStrength,
          extractionConfidence: typeof raw.confidence === "number" ? Math.round(raw.confidence <= 1 ? raw.confidence * 100 : raw.confidence) : 85,
          processingStatus: (raw.processingStatus || "ready_for_review") as ProcessingStatus,
          reviewStatus: (raw.verificationStatus || "unreviewed") as ReviewStatus,
          normalizedMetadata: {
            format: raw.metadata?.format || "Standard",
            authorIdentified: raw.metadata?.author || raw.contributorIdentity || "User",
            repositoryLanguages: raw.metadata?.repository_languages || raw.metadata?.repositoryLanguages || [],
            primaryLanguage: raw.metadata?.primary_language || raw.metadata?.primaryLanguage,
            ...raw.metadata,
          },
          extractedSummary: raw.extractedSummary || raw.description || "",
          candidateSkills: Array.isArray(raw.candidateSkills) ? raw.candidateSkills : [],
          processingHistory: [
            { stage: "Ingestion", status: "completed", timestamp: raw.observedAt || "Recently", detail: "Processed & normalized" },
            { stage: "Skill Mapping", status: "completed", timestamp: raw.observedAt || "Recently", detail: `${(raw.candidateSkills || []).length} candidate skills detected` },
          ],
        }));
        setEvidenceItems(mappedItems);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sp_live_evidence_cache", JSON.stringify(mappedItems));
        }
      }

      if (srcRes.status === "fulfilled" && srcRes.value?.sources && Array.isArray(srcRes.value.sources)) {
        const mappedSources: ConnectedSource[] = srcRes.value.sources.map((s: any) => ({
          id: s.id,
          name: s.name,
          type: (s.type || s.provider || "github") as SourceType,
          status: s.status as ConnectionStatus,
          lastSync: s.lastSync || "Never",
          importedRecordsCount: s.importedRecordsCount || 0,
          accountIdentity: s.accountIdentity || "",
          permissions: s.permissions || [],
          selectedEntities: s.selectedEntities || [],
          languageSummary: s.languageSummary,
        }));
        setSources(mappedSources);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sp_live_sources_cache", JSON.stringify(mappedSources));
        }
      }

      if (runsRes.status === "fulfilled" && runsRes.value?.runs && Array.isArray(runsRes.value.runs)) {
        const mappedRuns: IngestionRun[] = runsRes.value.runs.map((r: any) => ({
          runId: r.id,
          source: r.jobType || "Ingestion Job",
          sourceType: (r.jobType?.includes("github") ? "github" : r.jobType?.includes("jira") ? "jira" : "document") as SourceType,
          startTime: r.startedAt ? new Date(r.startedAt).toLocaleTimeString() : "Recently",
          completionTime: r.completedAt ? new Date(r.completedAt).toLocaleTimeString() : undefined,
          recordsDiscovered: r.metadata?.records_discovered || 1,
          recordsNormalized: r.metadata?.records_normalized || 1,
          recordsExtracted: r.metadata?.skills_extracted || 0,
          recordsIndexed: r.status === "SUCCEEDED" || r.status === "COMPLETED" ? 1 : 0,
          itemsReviewNeeded: r.metadata?.skills_extracted ? 1 : 0,
          failedCount: r.status === "FAILED" ? 1 : 0,
          status: r.status === "SUCCEEDED" || r.status === "COMPLETED" ? "completed" : r.status === "FAILED" ? "failed" : "processing",
          errorMessage: r.errorMessage,
          stages: [
            { stage: "Queued", status: "completed", timestamp: r.createdAt || "Recently", detail: "Enqueued in pipeline" },
            { stage: r.currentStage || "Processing", status: r.status === "SUCCEEDED" ? "completed" : r.status === "FAILED" ? "failed" : "processing", timestamp: r.completedAt || "Recently", detail: `Progress: ${r.progressPercentage}%` },
          ],
        }));
        setIngestionRuns(mappedRuns);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("sp_live_runs_cache", JSON.stringify(mappedRuns));
        }
      }

      if (profileRes.status === "fulfilled" && profileRes.value) {
        const prof = profileRes.value;
        const authUser = sessionData.session?.user;
        const realName =
          prof.display_name ||
          authUser?.user_metadata?.full_name ||
          authUser?.user_metadata?.name ||
          authUser?.email?.split("@")[0] ||
          "User";
        const parts = realName.trim().split(/\s+/);
        const initials =
          parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : realName.slice(0, 2).toUpperCase();

        setUserProfile((prev) => ({
          ...prev,
          displayName: realName,
          avatarInitials: initials,
          contactEmail: prof.email || authUser?.email || prev.contactEmail,
          headline: prof.headline || prof.job_title || prev.headline,
          currentRole: prof.current_role || prof.job_title || prev.currentRole,
        }));
      }

      // Unblock UI rendering immediately: Core Domain 1 data is loaded
      setInitialLoading(false);
      setIsLoadingEvidence(false);

      // Stage 2: Background AI, Governance & Domain 2 Skill Passport Hydration
      const [
        workRes, candRes, guardRes, valRes, confRes, conflictRes, taskRes, injRes, auditRes,
        passportSkillsRes, passportTaxonomyRes, passportHistoryRes
      ] = await Promise.allSettled([
        listWorkAnalyses(),
        listCandidateSkills(),
        listGuardResults(),
        listOutputValidations(),
        getConfidenceBreakdown(),
        listConflicts(),
        listReviewTasks(),
        listPromptInjectionFindings(),
        listAIAuditEvents(),
        listPassportSkills(),
        listPassportTaxonomy(),
        listPassportHistory(),
      ]);


      const candMapByEvidence: Record<string, any[]> = {};
      if (candRes.status === "fulfilled" && Array.isArray(candRes.value?.candidates)) {
        for (const c of candRes.value.candidates) {
          if (c.evidence_id) {
            if (!candMapByEvidence[c.evidence_id]) candMapByEvidence[c.evidence_id] = [];
            candMapByEvidence[c.evidence_id].push(c);
          }
        }
      }

      if (workRes.status === "fulfilled" && Array.isArray(workRes.value?.items)) {
        const mappedWork: WorkAnalysisResult[] = workRes.value.items.map((w: any) => {
          const rawSkills = Array.isArray(w.demonstrated_skills) && w.demonstrated_skills.length > 0
            ? w.demonstrated_skills
            : (candMapByEvidence[w.evidence_id] || []).map((c: any) => ({
                name: c.name || c.canonical_name,
                proficiency: c.proficiency || "Intermediate",
                category: c.category || "Extracted Competency",
                corroborated_with_evidence: true,
                justification: c.supporting_excerpt || c.rationale || "Extracted from evidence artifact",
              }));

          const demonstrated_skills = rawSkills.map((s: any) => ({
            name: s.name || s.skill || "",
            proficiency: s.proficiency || "Intermediate",
            category: s.category || "Competency",
            corroborated_with_evidence: s.corroborated_with_evidence !== undefined ? !!s.corroborated_with_evidence : true,
            justification: s.justification || "",
          })).filter((s: any) => Boolean(s.name));

          const techList = Array.isArray(w.technologies) && w.technologies.length > 0
            ? w.technologies
            : demonstrated_skills.map((s: any) => `${s.name} (${s.proficiency})`);

          return {
            analysis_id: w.analysis_id,
            source_id: w.evidence_id,
            source_title: w.title,
            source_type: w.source_type,
            observed_facts: (w.observed_facts || []).map((f: any, idx: number) => ({
              id: `fact-${idx}`,
              fact: typeof f === "string" ? f : f.fact || "",
              excerpt: typeof f === "object" ? f.excerpt || f.fact || "" : f,
              evidence_id: w.evidence_id,
            })),
            inferred_attributes: (w.inferred_attributes || []).map((inf: any, idx: number) => {
              const wConf = w.confidence_score !== undefined && w.confidence_score !== null ? (w.confidence_score <= 1.0 ? w.confidence_score * 100 : w.confidence_score) : 80;
              return {
                id: `inf-${idx}`,
                attribute: typeof inf === "string" ? inf : inf.attribute || "",
                interpretation: typeof inf === "object" ? inf.supported_by || "" : "",
                confidence: Math.round(wConf),
                is_tentative: true,
              };
            }),
            detected_activities: (w.technical_tasks || []).map((t: string) => ({
              task: t,
              contribution_level: w.role?.toLowerCase().includes("author") ? "author" : "collaborator",
              attribution_state: "confirmed",
            })),
            key_findings: techList,
            demonstrated_skills,
            uncertainty_flags: (w.uncertainty_flags || []).map((u: any) => typeof u === "string" ? u : `${u.area}: ${u.reason}`),
            status: (w.analysis_status || "completed") as any,
            model_name: w.analysis_method === "rule_based" || w.fallback_used ? "Rule-based Engine" : (w.model_name || "qwen3:8b"),
            model_version: w.model_version || (w.analysis_method === "rule_based" ? "deterministic-v1.0" : "qwen3:8b"),
            prompt_version: "v1.0",
            analysis_method: w.analysis_method || "ollama",
            fallback_used: !!w.fallback_used,
            fallback_reason: w.fallback_reason || null,
            analysis_status: w.analysis_status || "completed",
            validation_status: w.validation_status || "valid",
            created_at: w.created_at || "Recently",
          };
        });
        setWorkAnalyses(mappedWork);
      }

      if (candRes.status === "fulfilled" && Array.isArray(candRes.value?.candidates)) {
        const mappedCandidates: ExtractionCandidateItem[] = candRes.value.candidates.map((c: any) => {
          const rawScore = c.confidence_score !== undefined && c.confidence_score !== null ? c.confidence_score : c.relevance_score;
          const dynamicScore = typeof rawScore === "number" ? Math.round(rawScore <= 1.0 ? rawScore * 100 : rawScore) : 82;
          return {
            id: c.candidate_id,
            original_label: c.name,
            canonical_skill_id: c.competency_id,
            canonical_name: c.name,
            category: c.category,
            skill_type: "technical",
            confidence: dynamicScore,
            evidence_ids: [c.evidence_id],
            supporting_excerpt: c.supporting_excerpt,
            extraction_rationale: c.rationale,
            taxonomy_status: "resolved",
            review_state: c.status === "verified" ? "reviewed" : c.status === "insufficient" ? "insufficient" : "pending_review",
            ambiguity_flags: [],
            created_at: c.created_at || "Recently",
          };
        });
        setExtractionCandidates(mappedCandidates);

        const mappedMappings: EvidenceMappingItem[] = candRes.value.candidates.map((c: any) => {
          const rawScore = c.confidence_score !== undefined && c.confidence_score !== null ? c.confidence_score : c.relevance_score;
          const dynamicScore = typeof rawScore === "number" ? Math.round(rawScore <= 1.0 ? rawScore * 100 : rawScore) : 82;
          return {
            id: c.mapping_id,
            candidate_skill_id: c.candidate_id,
            candidate_label: c.name,
            canonical_skill_id: c.competency_id,
            evidence_id: c.evidence_id,
            evidence_title: c.evidence_title,
            source_type: c.source_type,
            occurred_date: "Recently",
            relationship_type: "direct_implementation",
            supporting_excerpt: c.supporting_excerpt,
            relevance_score: dynamicScore,
            attribution_state: "confirmed",
            mapping_status: c.status === "insufficient" ? "needs_evidence" : "active",
            review_history: [
              { action: "AI Extraction", actor: "SkillPassport Engine", timestamp: c.created_at || "Recently" }
            ],
          };
        });
        setEvidenceMappings(mappedMappings);
      }

      if (guardRes.status === "fulfilled" && Array.isArray(guardRes.value?.results)) {
        const mappedGuard: GuardClaimResult[] = guardRes.value.results.map((g: any) => {
          let skillName = g.claimed_skill_name || "Extracted Skill Claim";
          let skillLevel = g.claimed_level || "Practitioner";
          const reasons: string[] = g.reason_codes || [];
          reasons.forEach((r: string) => {
            if (typeof r === "string") {
              if (r.startsWith("SKILL:")) skillName = r.substring(6);
              if (r.startsWith("LEVEL:")) skillLevel = r.substring(6);
            }
          });
          const cleanReasons = reasons.filter(
            (r: string) => typeof r === "string" && !r.startsWith("SKILL:") && !r.startsWith("LEVEL:")
          );

          return {
            id: g.guard_run_id,
            claim_title: g.claim_text,
            associated_skill: skillName,
            claimed_level: skillLevel,
            evidence_id: g.evidence_id,
            guard_outcome: g.guard_outcome,
            reason_code: cleanReasons[0] || (g.guard_outcome === "PASS" ? "OK" : g.guard_outcome),
            explanation: g.explanation || (g.guard_outcome === "PASS"
              ? "Citation is present verbatim in authorized source text."
              : `Blocked: ${cleanReasons.join(", ")}`),
            checks: g.checks || {
              evidence_exists: true,
              user_owns_evidence: g.ownership_check === "pass",
              semantic_support_valid: g.citation_validation === "pass",
              attribution_valid: g.ownership_check === "pass",
              no_conflict: g.contradiction_check === "none",
              level_supported: true,
              not_revoked: true,
            },
          };
        });

        setGuardResults((prev) => {
          const map = new Map<string, GuardClaimResult>();
          mappedGuard.forEach((item) => map.set(item.id, item));
          prev.forEach((item) => {
            if (!map.has(item.id)) {
              map.set(item.id, item);
            }
          });
          return Array.from(map.values());
        });
      }

      if (valRes.status === "fulfilled" && Array.isArray(valRes.value?.validations)) {
        const mappedVals: OutputValidationRecord[] = valRes.value.validations.map((v: any) => ({
          run_id: v.run_id,
          output_type: v.target_type === "skill_extraction" ? "skill_extraction" : "work_analysis",
          status: v.final_status === "valid" ? "valid" : "validation_failed",
          schema_version: "v1.0",
          model_version: "qwen3:8b",
          prompt_version: "v1.0",
          timestamp: v.created_at || "Recently",
          issues: (v.error_messages || []).map((err: string) => ({
            field: "output",
            severity: "error",
            message: err,
          })),
          retryable: true,
          received_payload_summary: {
            schema_valid: v.schema_valid,
            missing_fields: (v.missing_fields || []).length,
          },
        }));
        setValidationRecords(mappedVals);
      }

      if (confRes.status === "fulfilled" && Array.isArray(confRes.value?.claims)) {
        const mappedConf: ConfidenceClaim[] = confRes.value.claims.map((c: any, idx: number) => ({
          id: c.candidate_id || `conf-${idx}`,
          skill_id: c.candidate_id,
          skill_name: c.competency_name,
          extraction_confidence: c.extraction_confidence,
          evidence_strength: c.evidence_strength,
          verification_state: c.verification_status,
          proficiency_estimate: "Practitioner",
          evidence_volume: 1,
          evidence_recency: "Fresh",
          coverage_score: c.extraction_confidence,
          uncertainty_reasons: c.uncertainty_reasons || [],
          needed_to_improve: [c.suggested_additional_evidence || "Corroborate with additional evidence."],
        }));
        setConfidenceClaims(mappedConf);
      }

      if (conflictRes.status === "fulfilled" && Array.isArray(conflictRes.value?.conflicts)) {
        const mappedConflicts: ConflictRecord[] = conflictRes.value.conflicts.map((c: any) => ({
          id: c.id,
          title: `Conflict on ${c.conflict_field.replace('_', ' ')}`,
          conflict_type: "attribution_dispute",
          description: c.explanation,
          status: c.status as "open" | "resolved",
          source_a: {
            id: c.evidence_a_id,
            name: "Primary Evidence Record",
            type: "Evidence Item",
            date: "Recorded Date",
            claim: c.evidence_a_assertion,
            excerpt: c.evidence_a_assertion,
            author: "User",
          },
          source_b: {
            id: c.evidence_b_id,
            name: "Corroborating Evidence Record",
            type: "Evidence Item",
            date: "Recorded Date",
            claim: c.evidence_b_assertion,
            excerpt: c.evidence_b_assertion,
            author: "User",
          },
          suggested_resolution: c.suggested_resolution,
          resolution_outcome: c.resolution_decision ? {
            decision: c.resolution_decision,
            rationale: c.resolution_notes || "",
            actor: "Reviewer",
            timestamp: "Recently",
          } : undefined,
        }));
        setConflicts(mappedConflicts);
      }

      if (taskRes.status === "fulfilled" && Array.isArray(taskRes.value?.tasks)) {
        const mappedTasks: HumanReviewTask[] = taskRes.value.tasks.map((t: any) => ({
          id: t.id,
          claim_id: t.candidate_mapping_id || t.evidence_id || t.id,
          title: t.title,
          category: t.task_type === "conflict" ? "conflict" : t.task_type === "prompt_injection" ? "suspicious_injection" : "insufficient_evidence",
          priority: t.priority as "high" | "medium" | "low",
          assigned_role: "Authorized Reviewer",
          status: t.status as "pending" | "reviewed" | "rejected" | "escalated",
          created_at: t.created_at || "Recently",
          context_summary: t.description,
        }));
        setReviewTasks(mappedTasks);
      }

      if (injRes.status === "fulfilled" && Array.isArray(injRes.value?.findings)) {
        const mappedInj: PromptInjectionFlag[] = injRes.value.findings.map((f: any) => ({
          id: f.id,
          source_id: f.evidence_id,
          source_title: "Quarantined Artifact",
          source_type: f.source_type,
          flagged_excerpt: f.quarantined_excerpt,
          detection_rule: f.detected_pattern,
          threat_category: "instruction_override",
          disposition: f.handling_outcome === "quarantined" ? "quarantined_and_ignored" : "sanitized",
          status: "flagged",
          timestamp: f.created_at || "Recently",
        }));
        setPromptInjectionFlags(mappedInj);
      }

      if (auditRes.status === "fulfilled" && Array.isArray(auditRes.value?.events)) {
        const mappedAudits: AIAuditEvent[] = auditRes.value.events.map((a: any) => {
          let entityType: AIAuditEvent["affected_entity_type"] = "candidate_skill";
          const rawTargetType = (a.target_type || a.affected_entity_type || "").toLowerCase();
          if (rawTargetType.includes("evidence") || rawTargetType.includes("source")) {
            entityType = "source";
          } else if (rawTargetType.includes("conflict")) {
            entityType = "conflict";
          } else if (rawTargetType.includes("validation")) {
            entityType = "validation_run";
          } else if (rawTargetType.includes("verification")) {
            entityType = "verification";
          }

          let eventType: AIAuditEvent["event_type"] = "review_decision";
          const rawEventType = (a.event_type || a.action || "").toLowerCase();
          if (rawEventType.includes("guard") || rawEventType.includes("block")) {
            eventType = "guard_blocked";
          } else if (rawEventType.includes("candidate") || rawEventType.includes("extraction")) {
            eventType = "candidate_extracted";
          } else if (rawEventType.includes("conflict")) {
            eventType = "conflict_recorded";
          } else if (rawEventType.includes("injection") || rawEventType.includes("quarantine")) {
            eventType = "injection_quarantined";
          } else if (rawEventType.includes("validation") || rawEventType.includes("retry")) {
            eventType = "validation_retried";
          } else if (rawEventType.includes("analysis")) {
            eventType = "analysis_completed";
          }

          return {
            id: a.id || `audit-${Math.random().toString(36).substring(2, 9)}`,
            actor: a.actor || "SkillPassport Policy Engine",
            timestamp: a.timestamp || "Recently",
            event_type: eventType,
            affected_entity_type: entityType,
            affected_entity_id: a.target_id || a.affected_entity_id || (a.id ? a.id.slice(0, 8) : "entity-ref"),
            previous_state: a.previous_state || undefined,
            new_state: a.new_state || "Recorded",
            reason: a.reason || "Audited system or human action",
            model_or_policy_version: a.metadata?.policy_version || a.model_or_policy_version || "audit-v2026.1",
            run_id: a.metadata?.run_id || a.run_id || undefined,
          };
        });

        setAiAuditEvents((prev) => {
          const map = new Map<string, AIAuditEvent>();
          mappedAudits.forEach((item) => map.set(item.id, item));
          prev.forEach((item) => {
            if (!map.has(item.id)) map.set(item.id, item);
          });
          return Array.from(map.values());
        });
      }

      // Domain 2: Skill Intelligence & Passport Hydration
      if (passportSkillsRes.status === "fulfilled" && passportSkillsRes.value) {
        if (Array.isArray(passportSkillsRes.value.skills)) {
          setSkills(passportSkillsRes.value.skills);
        }
        if (passportSkillsRes.value.metrics) {
          setPassportMetrics(passportSkillsRes.value.metrics);
        }
      }

      if (passportTaxonomyRes.status === "fulfilled" && passportTaxonomyRes.value) {
        if (Array.isArray(passportTaxonomyRes.value.categories)) {
          setTaxonomyCategories(passportTaxonomyRes.value.categories);
        }
      }

      if (passportHistoryRes.status === "fulfilled" && passportHistoryRes.value) {
        if (Array.isArray(passportHistoryRes.value.events)) {
          setHistoryEvents(passportHistoryRes.value.events);
        }
      }
    } catch (e) {
      console.warn("Could not load evidence data from backend:", e);
    } finally {
      isFetchingRef.current = false;
      lastFetchTimeRef.current = Date.now();
      setIsLoadingEvidence(false);
      setInitialLoading(false);
    }
  }, []);


  // Sync with Supabase Auth & sessionStorage
  useEffect(() => {
    try {
      // Clear legacy permanent localStorage flag and any demo items
      localStorage.removeItem("sp_demo_auth");
      localStorage.removeItem("sp_evidence_items");
      localStorage.removeItem("sp_sources");
      localStorage.removeItem("sp_runs");
      localStorage.removeItem("sp_conflicts");
      localStorage.removeItem("sp_skills");
      localStorage.removeItem("sp_history");

      localStorage.removeItem("sp_review_tasks");
      localStorage.removeItem("sp_validation");
      localStorage.removeItem("sp_ai_audit");

      const sessionAuth = sessionStorage.getItem("sp_session_auth");
      if (sessionAuth === "true") {
        setIsAuthenticated(true);
      }

      const savedSkills = localStorage.getItem("sp_skills");
      if (savedSkills) setSkills(JSON.parse(savedSkills));
      const savedHist = localStorage.getItem("sp_history");
      if (savedHist) setHistoryEvents(JSON.parse(savedHist));
      const savedRole = localStorage.getItem("sp_demo_role");
      if (savedRole) setDemoRole(savedRole as DemoRole);
      const savedCustomRoles = localStorage.getItem("sp_custom_roles");
      if (savedCustomRoles) setCustomRoles(JSON.parse(savedCustomRoles));
      const savedRoleId = localStorage.getItem("sp_selected_role_id");
      if (savedRoleId) setSelectedRoleIdState(savedRoleId);
    } catch {
      // Ignore local storage read errors
    }

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setIsAuthenticated(true);
        refreshEvidenceData();
      } else {
        setInitialLoading(false);
      }
      setAuthChecked(true);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          refreshEvidenceData(true);
        } else {
          refreshEvidenceData();
        }
      } else if (sessionStorage.getItem("sp_session_auth") !== "true") {
        setIsAuthenticated(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [refreshEvidenceData]);

  const handleSelectRole = (roleId: string) => {
    setSelectedRoleIdState(roleId);
    try {
      localStorage.setItem("sp_selected_role_id", roleId);
    } catch {}
  };

  const handleSaveCustomRole = (newRole: RoleDemandModel) => {
    const existingIndex = customRoles.findIndex((r) => r.role_id === newRole.role_id);
    let updated: RoleDemandModel[];
    if (existingIndex >= 0) {
      updated = customRoles.map((r) => (r.role_id === newRole.role_id ? newRole : r));
    } else {
      updated = [newRole, ...customRoles];
    }
    setCustomRoles(updated);
    setSelectedRoleIdState(newRole.role_id);
    try {
      localStorage.setItem("sp_custom_roles", JSON.stringify(updated));
      localStorage.setItem("sp_selected_role_id", newRole.role_id);
    } catch {}
  };

  const handleUpdateRoleCompetency = (
    roleId: string,
    skillId: string,
    updates: Partial<RoleCompetency>
  ) => {
    const isCustom = customRoles.some((r) => r.role_id === roleId);
    if (isCustom) {
      const updated = customRoles.map((r) => {
        if (r.role_id === roleId) {
          return {
            ...r,
            competencies: r.competencies.map((c) =>
              c.skill_id === skillId ? { ...c, ...updates } : c
            ),
          };
        }
        return r;
      });
      setCustomRoles(updated);
      try {
        localStorage.setItem("sp_custom_roles", JSON.stringify(updated));
      } catch {}
    }
  };

  const targetRoles = useMemo(() => {
    return [...customRoles, ...INITIAL_CURATED_ROLES];
  }, [customRoles]);

  const activeRole = useMemo(() => {
    return (
      targetRoles.find((r) => r.role_id === selectedRoleId) ||
      INITIAL_CURATED_ROLES[0]
    );
  }, [targetRoles, selectedRoleId]);

  const activeMatch = useMemo(() => {
    return evaluateRoleMatch(activeRole, skills);
  }, [activeRole, skills]);

  const activeGaps = useMemo(() => {
    return extractGapRecords(activeMatch, activeRole);
  }, [activeMatch, activeRole]);

  const activeReadiness = useMemo(() => {
    return evaluateCareerReadiness(activeMatch, activeGaps);
  }, [activeMatch, activeGaps]);

  const saveState = (
    _items: EvidenceItem[],
    _srcs: ConnectedSource[],
    _runs: IngestionRun[],
    sks: SkillItem[],
    hist: SkillHistoryEvent[]
  ) => {
    try {
      localStorage.setItem("sp_skills", JSON.stringify(sks));
      localStorage.setItem("sp_history", JSON.stringify(hist));
    } catch {
      // Ignore write errors
    }
  };

  const handleSetRole = (role: DemoRole) => {
    setDemoRole(role);
    try {
      localStorage.setItem("sp_demo_role", role);
    } catch {}
  };

  const addEvidenceItem = (itemData: Omit<EvidenceItem, "id">) => {
    const newItem: EvidenceItem = {
      ...itemData,
      id: `ev-${Date.now()}`,
    };
    const updated = [newItem, ...evidenceItems];
    setEvidenceItems(updated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sp_live_evidence_cache", JSON.stringify(updated));
    }

    const newRun: IngestionRun = {
      runId: `run-${Date.now()}`,
      source: `Upload: ${newItem.title}`,
      sourceType: newItem.sourceType,
      startTime: "Just now",
      completionTime: "Just now",
      recordsDiscovered: 1,
      recordsNormalized: 1,
      recordsExtracted: newItem.candidateSkills.length,
      recordsIndexed: 1,
      itemsReviewNeeded: newItem.candidateSkills.length > 0 ? 1 : 0,
      failedCount: 0,
      status: "completed",
      stages: [
        { stage: "Ingestion", status: "completed", timestamp: "Just now", detail: "Artifact processed & normalized" },
        { stage: "Skill Mapping", status: "completed", timestamp: "Just now", detail: `${newItem.candidateSkills.length} candidate skills detected` },
      ],
    };
    const updatedRuns = [newRun, ...ingestionRuns];
    setIngestionRuns(updatedRuns);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sp_live_runs_cache", JSON.stringify(updatedRuns));
    }
    saveState(updated, sources, updatedRuns, skills, historyEvents);
  };

  const deleteEvidenceItem = async (id: string) => {
    const previousItems = evidenceItems;
    const updated = evidenceItems.filter((i) => i.id !== id);
    setEvidenceItems(updated);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("sp_live_evidence_cache", JSON.stringify(updated));
    }
    saveState(updated, sources, ingestionRuns, skills, historyEvents);

    try {
      await apiDeleteEvidence(id);
      addToast("Evidence Removed", "Evidence record and associated vector indexes removed.", "info");
      refreshEvidenceData(true).catch((err) => console.warn("Background refresh after delete:", err));
    } catch (err: any) {
      console.error("Backend delete failed, rolling back local state:", err);
      setEvidenceItems(previousItems);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sp_live_evidence_cache", JSON.stringify(previousItems));
      }
      saveState(previousItems, sources, ingestionRuns, skills, historyEvents);
      addToast("Delete Failed", err.message || "Failed to remove evidence from database.", "error");
      throw err;
    }
  };

  const updateEvidenceItem = (id: string, updates: Partial<EvidenceItem>) => {
    const updated = evidenceItems.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setEvidenceItems(updated);
    saveState(updated, sources, ingestionRuns, skills, historyEvents);
  };

  const confirmContribution = async (evidenceId: string) => {
    try {
      await reviewEvidenceItem(evidenceId, "verified", "Confirmed sole author and contribution");
      runWorkAnalysis([evidenceId]).catch((e) => console.warn("Work analysis trigger:", e));
      runSkillExtraction([evidenceId]).catch((e) => console.warn("Skill extraction trigger:", e));
    } catch (e) {
      console.warn("Backend review call failed, updating local state:", e);
    }
    const updated = evidenceItems.map((i) => {
      if (i.id === evidenceId) {
        return {
          ...i,
          reviewStatus: "verified" as ReviewStatus,
          claimedContribution: "Confirmed Sole Author",
        };
      }
      return i;
    });
    setEvidenceItems(updated);
    saveState(updated, sources, ingestionRuns, skills, historyEvents);
    addToast("Contribution Verified", "Evidence item verified and recorded in audit log.", "success");
  };

  const updateCandidateSkillStatus = async (
    evidenceId: string,
    skillId: string,
    status: "candidate" | "reviewed" | "flagged" | "insufficient"
  ) => {
    try {
      if (status === "reviewed") {
        await reviewCandidateVerification(skillId, "verify", "Verified via Candidate Review UI");
      } else if (status === "insufficient") {
        await reviewCandidateVerification(skillId, "flag_insufficient", "Flagged as insufficient evidence");
      }
    } catch (e) {
      console.warn("Backend verification call failed:", e);
    }
    const updated = evidenceItems.map((item) => {
      if (item.id === evidenceId) {
        return {
          ...item,
          candidateSkills: item.candidateSkills.map((sk) => {
            if (sk.id === skillId) {
              return { ...sk, status };
            }
            return sk;
          }),
        };
      }
      return item;
    });
    setEvidenceItems(updated);
    saveState(updated, sources, ingestionRuns, skills, historyEvents);
  };

  const connectSource = (sourceType: string, selectedEntities: string[]) => {
    const newSource: ConnectedSource = {
      id: `src-${Date.now()}`,
      name: `${sourceType.toUpperCase()} — ${selectedEntities[0] || "Default"}`,
      type: sourceType as any,
      status: "connected",
      lastSync: "Just now",
      importedRecordsCount: 1,
      accountIdentity: "alex-rivera-connected",
      permissions: ["read_commits", "read_pull_requests"],
      selectedEntities: selectedEntities,
    };
    const updated = [newSource, ...sources];
    setSources(updated);
    saveState(evidenceItems, updated, ingestionRuns, skills, historyEvents);
  };

  const disconnectSource = (sourceId: string) => {
    const updated = sources.map((s) =>
      s.id === sourceId
        ? { ...s, status: "not_connected" as const }
        : s
    );
    setSources(updated);
    saveState(evidenceItems, updated, ingestionRuns, skills, historyEvents);
  };

  const retryIngestionRun = (runId: string) => {
    const updatedRuns = ingestionRuns.map((r) => {
      if (r.runId === runId) {
        return {
          ...r,
          status: "completed" as const,
          failedCount: 0,
          errorMessage: undefined,
          stages: [
            ...r.stages,
            { stage: "Retry Execution", status: "completed" as const, timestamp: "Just now", detail: "Retried and resolved" },
          ],
        };
      }
      return r;
    });
    setIngestionRuns(updatedRuns);
    saveState(evidenceItems, sources, updatedRuns, skills, historyEvents);
  };

  const updateSkill = (id: string, updates: Partial<SkillItem>) => {
    const updated = skills.map((s) => (s.id === id ? { ...s, ...updates } : s));
    setSkills(updated);
    saveState(evidenceItems, sources, ingestionRuns, updated, historyEvents);
  };

  const addHistoryEvent = (eventData: Omit<SkillHistoryEvent, "id">) => {
    const newEvent: SkillHistoryEvent = {
      ...eventData,
      id: `hist-${Date.now()}`,
    };
    const updated = [newEvent, ...historyEvents];
    setHistoryEvents(updated);
    saveState(evidenceItems, sources, ingestionRuns, skills, updated);
  };

  const reviewCandidateSkill = async (
    mappingId: string,
    action: "verify" | "reject" | "flag_insufficient",
    rationale: string
  ) => {
    const res = await reviewPassportCandidate(mappingId, action, rationale);
    await refreshEvidenceData(true);
    return res;
  };

  // Domain 3 Mutators
  const addAIAuditEvent = (eventData: Omit<AIAuditEvent, "id">) => {
    const newEvent: AIAuditEvent = {
      ...eventData,
      id: `ai-audit-${Date.now()}`,
    };
    const updated = [newEvent, ...aiAuditEvents];
    setAiAuditEvents(updated);
  };

  const updateConflict = async (id: string, updates: Partial<ConflictRecord>) => {
    if (updates.status === "resolved" && updates.resolution_outcome) {
      try {
        await resolveConflict(
          id,
          (updates.resolution_outcome.decision as any) || "merge",
          updates.resolution_outcome.rationale || "Resolved in UI"
        );
      } catch (e) {
        console.warn("Backend resolve conflict failed:", e);
      }
    }
    const updated = conflicts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setConflicts(updated);
  };

  const updateReviewTask = async (id: string, updates: Partial<HumanReviewTask>) => {
    if (updates.status && updates.status !== "pending") {
      try {
        const action = updates.status === "reviewed" ? "approve" : updates.status === "rejected" ? "reject" : "escalate";
        await actionReviewTask(id, action as any, "Resolved in review queue");
      } catch (e) {
        console.warn("Backend action review task failed:", e);
      }
    }
    setReviewTasks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      }
      return [updates as HumanReviewTask, ...prev];
    });
  };


  const updateValidationRecord = (id: string, updates: Partial<OutputValidationRecord>) => {
    setValidationRecords((prev) => {
      const idx = prev.findIndex((v) => v.run_id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      }
      return [updates as OutputValidationRecord, ...prev];
    });
  };

  const updateWorkAnalysis = (id: string, updates: Partial<WorkAnalysisResult>) => {
    const updated = workAnalyses.map((a) => (a.analysis_id === id ? { ...a, ...updates } : a));
    setWorkAnalyses(updated);
  };

  const updateExtractionCandidate = (id: string, updates: Partial<ExtractionCandidateItem>) => {
    const updated = extractionCandidates.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setExtractionCandidates(updated);
  };

  const updateVerification = async (id: string, updates: Partial<SkillVerificationRecord>) => {
    if (updates.verification_status) {
      try {
        const action =
          updates.verification_status === "verified"
            ? "verify"
            : updates.verification_status === "not_verified"
            ? "reject"
            : updates.verification_status === "insufficient_evidence"
            ? "flag_insufficient"
            : "partially_support";
        await reviewCandidateVerification(id, action, updates.decision_rationale || "Reviewer verification decision");
      } catch (e) {
        console.warn("Backend review candidate verification call failed:", e);
      }
    }
    const updated = verifications.map((v) => (v.verification_id === id ? { ...v, ...updates } : v));
    setVerifications(updated);
  };

  const updateGuardResult = (id: string, updates: Partial<GuardClaimResult>) => {
    setGuardResults((prev) => {
      const idx = prev.findIndex((g) => g.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      }
      return [updates as GuardClaimResult, ...prev];
    });
  };

  const updatePromptInjectionFlag = (id: string, updates: Partial<PromptInjectionFlag>) => {
    setPromptInjectionFlags((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...updates };
        return next;
      }
      return [updates as PromptInjectionFlag, ...prev];
    });
  };

  // Domain 5 Learning Intelligence State
  const [blueprints] = useState<DomainBlueprint[]>(INITIAL_BLUEPRINTS);
  const [activeDomainId, setActiveDomainId] = useState<string>("domain-data-preprocessing");
  
  const [roadmaps, setRoadmaps] = useState<Record<string, LearningRoadmap>>(() => {
    const initialMap: Record<string, LearningRoadmap> = {};
    INITIAL_BLUEPRINTS.forEach((bp) => {
      initialMap[bp.domain_id] = generatePersonalizedRoadmap(bp);
    });
    return initialMap;
  });

  const [diagnosticResults, setDiagnosticResults] = useState<Record<string, DiagnosticResult>>({});
  const [miniProjects, setMiniProjects] = useState<MiniProject[]>([INITIAL_MINI_PROJECT]);
  const [assessment] = useState<KnowledgeAssessment>(INITIAL_KNOWLEDGE_ASSESSMENT);
  const [assessmentAttempts, setAssessmentAttempts] = useState<AssessmentAttempt[]>([]);
  const [remediationSession, setRemediationSession] = useState<RemediationSession>(INITIAL_REMEDIATION_SESSION);
  const [learningHistory, setLearningHistory] = useState<LearningHistoryEvent[]>(INITIAL_LEARNING_HISTORY);
  const [candidateEvidences, setCandidateEvidences] = useState<CandidateLearningEvidence[]>(INITIAL_CANDIDATE_EVIDENCES);
  const [resources] = useState<LearningResource[]>(INITIAL_RESOURCES);
  const [practiceExercises, setPracticeExercises] = useState<PracticeExercise[]>(INITIAL_PRACTICE_EXERCISES);

  // Domain 6 Sharing & Recruiter Experience State
  const [shareRecords, setShareRecords] = useState<ShareRecord[]>(INITIAL_SHARE_RECORDS);
  const [shareActivities, setShareActivities] = useState<ShareActivityEvent[]>(INITIAL_SHARE_ACTIVITIES);
  const [draftPermissions, setDraftPermissions] = useState<SharePermissionsConfig>(DEFAULT_SHARE_PERMISSIONS);

  const activeBlueprint = useMemo(() => {
    return blueprints.find((b) => b.domain_id === activeDomainId) || blueprints[0];
  }, [blueprints, activeDomainId]);

  const activeRoadmap = useMemo(() => {
    return roadmaps[activeDomainId] || roadmaps["domain-data-preprocessing"] || generatePersonalizedRoadmap(activeBlueprint);
  }, [roadmaps, activeDomainId, activeBlueprint]);

  const activeDiagnosticResult = diagnosticResults[activeDomainId];

  const activeMiniProject = useMemo(() => {
    return miniProjects.find((p) => p.domain_id === activeDomainId) || miniProjects[0];
  }, [miniProjects, activeDomainId]);

  const addLearningHistoryEvent = (event: Omit<LearningHistoryEvent, "id">) => {
    const newEv: LearningHistoryEvent = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...event,
    };
    setLearningHistory((prev) => [newEv, ...prev]);
  };

  const updateRoadmapPreferences = (
    domainId: string,
    hours: number,
    preference: "text-first" | "video-first" | "practice-first",
    pace: "standard" | "fast_track"
  ) => {
    const bp = blueprints.find((b) => b.domain_id === domainId) || activeBlueprint;
    const diag = diagnosticResults[domainId];
    const newRoadmap = generatePersonalizedRoadmap(bp, diag, {
      studyHours: hours,
      preference,
      pace,
    });
    setRoadmaps((prev) => ({ ...prev, [domainId]: newRoadmap }));
  };

  const recordDiagnosticResult = (result: DiagnosticResult) => {
    setDiagnosticResults((prev) => ({ ...prev, [result.domain_id]: result }));
    const bp = blueprints.find((b) => b.domain_id === result.domain_id) || activeBlueprint;
    const newRoadmap = generatePersonalizedRoadmap(bp, result);
    setRoadmaps((prev) => ({ ...prev, [result.domain_id]: newRoadmap }));
    addLearningHistoryEvent({
      timestamp: "Just now",
      type: "diagnostic",
      title: `Completed ${bp.title} Diagnostic Assessment`,
      domain_id: result.domain_id,
      detail: `Diagnostic score: ${result.overall_score}%. Top focus: ${result.recommended_focus[0] || "Foundations"}.`,
      link_route: `/app/learning/domains/${result.domain_id}/diagnostic`,
      score: result.overall_score,
    });
  };

  const completeStep = (stepId: string) => {
    const roadmap = roadmaps[activeDomainId];
    if (!roadmap) return;
    const updatedSteps = roadmap.steps.map((s) => {
      if (s.step_id === stepId) {
        return { ...s, status: "completed" as const, current_mastery: s.target_mastery };
      }
      return s;
    });
    const currentCompletedIds = updatedSteps.filter((s) => s.status === "completed").map((s) => s.topic_id);
    const fullyUpdated = updatedSteps.map((s) => {
      if (s.status === "locked" && s.prerequisite_ids.every((pid) => currentCompletedIds.includes(pid))) {
        return { ...s, status: "available" as const, prerequisites_met: true };
      }
      return s;
    });

    const stepObj = roadmap.steps.find((s) => s.step_id === stepId);
    setRoadmaps((prev) => ({
      ...prev,
      [activeDomainId]: { ...roadmap, steps: fullyUpdated },
    }));

    if (stepObj) {
      addLearningHistoryEvent({
        timestamp: "Just now",
        type: "step_completed",
        title: `Completed Objective: ${stepObj.title}`,
        domain_id: activeDomainId,
        topic_id: stepObj.topic_id,
        detail: `Demonstrated objective: ${stepObj.learning_objective}`,
        link_route: `/app/learning/steps/${stepId}`,
      });
    }
  };

  const completePracticeExercise = (exerciseId: string, score: number) => {
    setPracticeExercises((prev) =>
      prev.map((ex) => (ex.id === exerciseId ? { ...ex, completed: true, score } : ex))
    );
    const ex = practiceExercises.find((e) => e.id === exerciseId);
    if (ex) {
      addLearningHistoryEvent({
        timestamp: "Just now",
        type: "practice_completed",
        title: `Practice Exercise Completed: ${ex.title}`,
        domain_id: ex.domain_id,
        topic_id: ex.topic_id,
        detail: `Completed with score: ${score}%. Objective: ${ex.learning_objective}`,
        link_route: "/app/learning/practice",
        score,
      });
    }
  };

  const recordAssessmentAttempt = (attempt: AssessmentAttempt) => {
    setAssessmentAttempts((prev) => [attempt, ...prev]);
    addLearningHistoryEvent({
      timestamp: "Just now",
      type: "assessment_attempt",
      title: `${assessment.title} Attempt (${attempt.passed ? "PASSED" : "REMEDIATION REQUIRED"})`,
      domain_id: assessment.domain_id,
      detail: `Score: ${attempt.total_score}%. ${attempt.feedback}`,
      link_route: `/app/learning/assessments/${assessment.id}`,
      score: attempt.total_score,
    });
  };

  const submitMiniProject = (
    projectId: string,
    repoUrl: string,
    notes: string
  ) => {
    const proj = miniProjects.find((p) => p.id === projectId) || INITIAL_MINI_PROJECT;
    const attempt: MiniProjectAttempt = {
      attempt_id: `proj-att-${Date.now()}`,
      project_id: projectId,
      submitted_at: "Today, Just now",
      github_repo_url: repoUrl,
      summary_notes: notes,
      status: "evaluated",
      total_score: 88,
      rubric_scores: [
        { criterion: "Dataset Handling & EDA", score: 90, feedback: "Clean pandas ingestion and null verification." },
        { criterion: "Correct Technique Application", score: 85, feedback: "Vectorized Series.clip() quantile bounding properly applied." },
        { criterion: "Reasoning & Explanation", score: 90, feedback: "Detailed justification for Winsorization over row deletion." },
        { criterion: "Implementation Quality & Architecture", score: 85, feedback: "Custom Scikit-Learn transformer with fit/transform separation." },
        { criterion: "Result Interpretation & Test Coverage", score: 90, feedback: "Pytest unit tests verifying shape preservation." },
      ],
      feedback: "High quality applied deliverable. Pipeline encapsulates quantile bounds with zero training leakage. Candidate evidence record created.",
      generated_artifact_id: `art-proj-${Date.now()}`,
      candidate_evidence_id: `ev-proj-${Date.now()}`,
    };

    setMiniProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, status: "evaluated" as const, submitted_attempt: attempt }
          : p
      )
    );

    const { candidateEvidence, evidenceItem } = createCandidateEvidenceFromProject(proj, attempt);
    setCandidateEvidences((prev) => [candidateEvidence, ...prev]);
    setEvidenceItems((prev) => [evidenceItem, ...prev]);

    const newReviewTask: HumanReviewTask = {
      id: `task-rev-${Date.now()}`,
      claim_id: attempt.candidate_evidence_id,
      title: `Verify Learning Mini-Project Evidence: ${proj.title}`,
      category: "insufficient_evidence",
      priority: "high",
      assigned_role: "Authorized Reviewer",
      status: "pending",
      created_at: "Just now",
      context_summary: `Candidate evidence submitted from mini-project. Repo: ${attempt.github_repo_url}. Notes: ${notes}`,
    };
    setReviewTasks((prev) => [newReviewTask, ...prev]);

    addLearningHistoryEvent({
      timestamp: "Just now",
      type: "project_submitted",
      title: `Submitted Mini-Project: ${proj.title}`,
      domain_id: proj.domain_id,
      detail: `Evaluated score: 88%. Generated Candidate Evidence ID: ${candidateEvidence.evidence_id}. Added to Human Review Queue.`,
      link_route: `/app/learning/projects/${projectId}`,
      score: 88,
    });
  };

  const completeRemediation = (sessionId: string) => {
    setRemediationSession((prev) => ({ ...prev, status: "completed" }));
    addLearningHistoryEvent({
      timestamp: "Just now",
      type: "remediation_completed",
      title: "Completed Targeted Remediation Session",
      domain_id: remediationSession.domain_id,
      detail: "Completed threshold review and guided exercises. Ready to retry assessment.",
      link_route: `/app/learning/remediation/${sessionId}`,
    });
  };

  // Domain 6 Sharing & Recruiter Handlers
  const createShareRecord = (label: string, config: SharePermissionsConfig): ShareRecord => {
    const randomHex = Math.random().toString(36).substring(2, 8);
    const newShareId = `sh-${randomHex}`;

    let expiresAt: string | null = null;
    if (config.expiryDays && config.expiryDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + config.expiryDays);
      expiresAt = expDate.toISOString().split("T")[0];
    }

    const todayStr = new Date().toISOString().split("T")[0];

    const newRecord: ShareRecord = {
      shareId: newShareId,
      label: label || config.customLinkLabel || "Selective Recruiter Share",
      status: "active",
      createdAt: todayStr,
      expiresAt,
      lastAccessedAt: "Never",
      accessCount: 0,
      permissions: {
        ...config,
        shareVerifiedSkillsOnly: true, // Non-negotiable: strictly verified skills only
      },
    };

    setShareRecords((prev) => [newRecord, ...prev]);

    const newActivity: ShareActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: "Just now",
      shareId: newShareId,
      shareLabel: newRecord.label,
      action: "created",
      details: `Created link with ${config.selectedSkillIds.length} verified skills. Expiry: ${expiresAt || "Never"}.`,
    };
    setShareActivities((prev) => [newActivity, ...prev]);

    return newRecord;
  };

  const updateSharePermissions = (shareId: string, config: SharePermissionsConfig) => {
    let expiresAt: string | null = null;
    if (config.expiryDays && config.expiryDays > 0) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + config.expiryDays);
      expiresAt = expDate.toISOString().split("T")[0];
    }

    setShareRecords((prev) =>
      prev.map((r) => {
        if (r.shareId === shareId) {
          return {
            ...r,
            permissions: { ...config, shareVerifiedSkillsOnly: true },
            expiresAt: config.expiryDays ? expiresAt : r.expiresAt,
          };
        }
        return r;
      })
    );

    const target = shareRecords.find((r) => r.shareId === shareId);
    const newActivity: ShareActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: "Just now",
      shareId,
      shareLabel: target?.label || shareId,
      action: "permissions_updated",
      details: "Updated permission scope and evidence disclosure rules.",
    };
    setShareActivities((prev) => [newActivity, ...prev]);
  };

  const revokeShareRecord = (shareId: string, reason?: string) => {
    setShareRecords((prev) =>
      prev.map((r) => {
        if (r.shareId === shareId) {
          return {
            ...r,
            status: "revoked" as const,
            revokedAt: "Today, Just now",
            revocationReason: reason || "Revoked by candidate.",
          };
        }
        return r;
      })
    );

    const target = shareRecords.find((r) => r.shareId === shareId);
    const newActivity: ShareActivityEvent = {
      id: `act-${Date.now()}`,
      timestamp: "Just now",
      shareId,
      shareLabel: target?.label || shareId,
      action: "revoked",
      details: `Candidate revoked link. Public URL immediately disabled. Reason: ${reason || "User action"}.`,
    };
    setShareActivities((prev) => [newActivity, ...prev]);
  };

  const getShareProjection = (shareId: string): ShareProjection | null => {
    const record = shareRecords.find((r) => r.shareId === shareId);
    if (!record) return null;
    return buildShareProjection(record, skills, evidenceItems, targetRoles, {
      displayName: userProfile.displayName,
      headline: userProfile.headline,
      summary: userProfile.summary,
      contactEmail: userProfile.contactEmail,
      contactLinkedIn: userProfile.contactLinkedIn,
    });
  };

  const recordShareAccess = useCallback((shareId: string) => {
    setShareRecords((prev) => {
      const target = prev.find((r) => r.shareId === shareId);
      if (target && target.status === "active") {
        setTimeout(() => {
          setShareActivities((actPrev) => [
            {
              id: `act-${Date.now()}`,
              timestamp: "Just now",
              shareId,
              shareLabel: target.label,
              action: "viewed",
              details: "Recruiter loaded shared passport page.",
            },
            ...actPrev,
          ]);
        }, 0);
      }

      return prev.map((r) => {
        if (r.shareId === shareId) {
          return {
            ...r,
            accessCount: r.accessCount + 1,
            lastAccessedAt: "Just now",
          };
        }
        return r;
      });
    });
  }, []);

  // Toast handlers
  const addToast = (title: string, message: string, type: "success" | "error" | "info" = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Demo Authentication Handlers
  const loginDemo = (role: DemoRole = "employee", userOverrides?: Partial<UserProfile>) => {
    setIsAuthenticated(true);
    setDemoRole(role);
    try {
      sessionStorage.setItem("sp_session_auth", "true");
      sessionStorage.setItem("sp_demo_role", role);
      localStorage.removeItem("sp_demo_auth");
    } catch {}

    if (role === "employee") {
      setUserProfile((prev) => ({
        ...prev,
        displayName: "Alex Rivera",
        headline: "Senior Software Engineer & Data Intelligence Specialist",
        currentRole: "Senior Software Engineer",
        contactEmail: "alex.rivera@growthlens.io",
        avatarInitials: "AR",
        ...userOverrides,
      }));
    } else if (role === "manager") {
      setUserProfile((prev) => ({
        ...prev,
        displayName: "Elena Rostova",
        headline: "Engineering Director · Talent Strategy & Performance",
        currentRole: "Engineering Director",
        contactEmail: "elena.rostova@growthlens.io",
        avatarInitials: "ER",
        ...userOverrides,
      }));
    } else if (role === "recruiter") {
      setUserProfile((prev) => ({
        ...prev,
        displayName: "Marcus Vance",
        headline: "Principal Talent Partner & Technical Recruiter",
        currentRole: "Technical Recruiter",
        contactEmail: "marcus.vance@growthlens.io",
        avatarInitials: "MV",
        ...userOverrides,
      }));
    } else if (role === "auditor") {
      setUserProfile((prev) => ({
        ...prev,
        displayName: "Dr. Sarah Chen",
        headline: "Chief AI Ethics & Verification Auditor",
        currentRole: "AI Governance Officer",
        contactEmail: "sarah.chen@growthlens.io",
        avatarInitials: "SC",
        ...userOverrides,
      }));
    }

    addToast(
      "Access Granted",
      `Signed in as ${userOverrides?.displayName || (role === "employee" ? "Employee" : role === "manager" ? "Manager" : role === "recruiter" ? "Recruiter" : "Auditor")}. SkillPassport unlocked!`,
      "success"
    );
  };

  const logoutDemo = async () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem("sp_session_auth");
      sessionStorage.removeItem("sp_demo_role");
      localStorage.removeItem("sp_demo_auth");
      localStorage.removeItem("sp_evidence_items");
      localStorage.removeItem("sp_sources");
      localStorage.removeItem("sp_runs");
      await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    } catch {}
    setEvidenceItems([]);
    setSources(INITIAL_CONNECTED_SOURCES);
    setIngestionRuns([]);
    addToast("Signed Out", "Session ended. Sign in anytime to regain access.", "info");
  };

  // Activity handler
  const addUnifiedActivity = (act: Omit<UnifiedActivityEvent, "id">) => {
    const newAct: UnifiedActivityEvent = {
      id: `act-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...act,
    };
    setUnifiedActivities((prev) => [newAct, ...prev]);
  };

  // Profile handler
  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setUserProfile((prev) => ({
      ...prev,
      ...updates,
      lastUpdated: "Just now",
    }));

    addUnifiedActivity({
      title: "Profile Information Updated",
      description: "Updated professional identity details in Account Settings.",
      category: "profile",
      sourceDomain: "Account Settings",
      timestamp: "Just now",
      status: "completed",
      actor: updates.displayName || userProfile.displayName,
      route: "/app/settings/profile",
    });

    addToast("Profile Updated", "Your profile changes were saved and reflected across the passport.", "success");
  };

  // Privacy preferences handler
  const updatePrivacyPreferences = (updates: Partial<PrivacyPreferences>) => {
    setPrivacyPreferences((prev) => ({
      ...prev,
      ...updates,
      lastUpdated: new Date().toISOString().split("T")[0],
    }));

    addUnifiedActivity({
      title: "Privacy Preferences Updated",
      description: "Updated global data visibility and passport sharing defaults.",
      category: "privacy",
      sourceDomain: "Privacy & Consent",
      timestamp: "Just now",
      status: "completed",
      route: "/app/settings/privacy",
    });

    addToast("Privacy Saved", "Global privacy preferences updated successfully.", "success");
  };

  // App settings handler
  const updateAppSettings = (updates: Partial<AppSettings>) => {
    setAppSettings((prev) => ({
      ...prev,
      ...updates,
      lastSaved: "Just now",
    }));

    addToast("Settings Saved", "Application preferences saved successfully.", "success");
  };

  // Notifications handlers
  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    addToast("Notifications Cleared", "All notifications marked as read.", "info");
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addNotification = (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => {
    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      timestamp: "Just now",
      read: false,
      ...notif,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    addToast(
      notif.title,
      notif.description,
      notif.severity === "error" ? "error" : notif.severity === "warning" ? "error" : "info"
    );
  };

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Connected Sources handlers
  const syncSourceSimulated = async (sourceId: string): Promise<{ success: boolean; message: string }> => {
    setConnectedSourceDetails((prev) =>
      prev.map((s) => (s.id === sourceId ? { ...s, status: "syncing" } : s))
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const target = connectedSourceDetails.find((s) => s.id === sourceId);
    const sourceName = target?.name || "Connected Source";

    setConnectedSourceDetails((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? {
              ...s,
              status: "connected",
              lastSuccessfulSync: "Just now",
              lastSyncAttempt: "Just now",
              importedRecordsCount: s.importedRecordsCount + 2,
              syncWarning: undefined,
            }
          : s
      )
    );

    addUnifiedActivity({
      title: `Synchronized ${sourceName}`,
      description: "Simulated sync completed. Fetched 2 new work items for evidence normalization.",
      category: "connection",
      sourceDomain: "Connected Accounts",
      timestamp: "Just now",
      status: "completed",
      relatedRecordId: sourceId,
      route: "/app/settings/connections",
    });

    addNotification({
      title: "Source Sync Completed",
      description: `Successfully synchronized ${sourceName}. Imported 2 new records.`,
      category: "evidence",
      severity: "success",
      relatedDomain: "Connected Accounts",
      actionRoute: "/app/evidence/runs",
      actionLabel: "View Ingestion Runs",
    });

    addToast("Sync Completed", `${sourceName} successfully synchronized.`, "success");
    return { success: true, message: `${sourceName} synced successfully.` };
  };

  const disconnectSourceSafe = (sourceId: string, deleteImportedEvidence: boolean) => {
    const target = connectedSourceDetails.find((s) => s.id === sourceId);
    const sourceName = target?.name || "Connected Source";

    setConnectedSourceDetails((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? {
              ...s,
              status: "disconnected",
              syncWarning: "Source disconnected. Automated polling and new work import stopped.",
            }
          : s
      )
    );

    setSources((prev) =>
      prev.map((s) => (s.id === sourceId || s.type === target?.type ? { ...s, status: "not_connected" } : s))
    );

    if (deleteImportedEvidence && target) {
      setEvidenceItems((prev) => prev.filter((e) => e.sourceType !== target.type));
    }

    addUnifiedActivity({
      title: `Disconnected ${sourceName}`,
      description: deleteImportedEvidence
        ? "Disconnected source and removed associated unverified evidence items."
        : "Disconnected source. All previously imported & verified evidence items preserved.",
      category: "connection",
      sourceDomain: "Connected Accounts",
      timestamp: "Just now",
      status: "completed",
      relatedRecordId: sourceId,
      route: "/app/settings/connections",
    });

    addToast("Source Disconnected", `${sourceName} disconnected. Previously verified evidence is preserved.`, "info");
  };

  const reconnectSourceSimulated = (sourceId: string) => {
    const target = connectedSourceDetails.find((s) => s.id === sourceId);
    const sourceName = target?.name || "Connected Source";

    setConnectedSourceDetails((prev) =>
      prev.map((s) =>
        s.id === sourceId
          ? {
              ...s,
              status: "connected",
              lastSuccessfulSync: "Just now",
              syncWarning: undefined,
              errorMessage: undefined,
            }
          : s
      )
    );

    setSources((prev) =>
      prev.map((s) => (s.id === sourceId || s.type === target?.type ? { ...s, status: "connected" } : s))
    );

    addUnifiedActivity({
      title: `Reconnected ${sourceName}`,
      description: `Reauthorized read-only token permissions for ${sourceName}.`,
      category: "connection",
      sourceDomain: "Connected Accounts",
      timestamp: "Just now",
      status: "completed",
      relatedRecordId: sourceId,
      route: "/app/settings/connections",
    });

    addToast("Source Connected", `${sourceName} is now connected.`, "success");
  };

  return (
    <EvidenceContext.Provider
      value={{
        evidenceItems,
        sources,
        ingestionRuns,
        skills,
        historyEvents,
        taxonomyCategories,
        passportMetrics,
        reviewCandidateSkill,
        currentRole,

        setDemoRole: handleSetRole,
        workAnalyses,
        extractionCandidates,
        evidenceMappings,
        verifications,
        confidenceClaims,
        conflicts,
        guardResults,
        validationRecords,
        promptInjectionFlags,
        reviewTasks,
        evalCases,
        aiAuditEvents,
        addEvidenceItem,
        deleteEvidenceItem,
        updateEvidenceItem,
        confirmContribution,
        updateCandidateSkillStatus,
        connectSource,
        disconnectSource,
        retryIngestionRun,
        updateSkill,
        addHistoryEvent,
        addAIAuditEvent,
        updateConflict,
        updateReviewTask,
        updateValidationRecord,
        updateWorkAnalysis,
        updateExtractionCandidate,
        updateVerification,
        updateGuardResult,
        updatePromptInjectionFlag,
        targetRoles,
        selectedRoleId,
        setSelectedRoleId: handleSelectRole,
        customRoles,
        saveCustomRole: handleSaveCustomRole,
        updateRoleCompetency: handleUpdateRoleCompetency,
        activeRole,
        activeMatch,
        activeGaps,
        activeReadiness,

        // Domain 5 Learning Intelligence
        blueprints,
        activeDomainId,
        setActiveDomainId,
        activeBlueprint,
        roadmaps,
        activeRoadmap,
        diagnosticResults,
        activeDiagnosticResult,
        miniProjects,
        activeMiniProject,
        assessment,
        assessmentAttempts,
        remediationSession,
        learningHistory,
        candidateEvidences,
        resources,
        practiceExercises,
        updateRoadmapPreferences,
        recordDiagnosticResult,
        completeStep,
        completePracticeExercise,
        recordAssessmentAttempt,
        submitMiniProject,
        completeRemediation,
        addLearningHistoryEvent,

        // Domain 6 Sharing & Recruiter Experience
        shareRecords,
        shareActivities,
        draftPermissions,
        setDraftPermissions,
        createShareRecord,
        updateSharePermissions,
        revokeShareRecord,
        getShareProjection,
        recordShareAccess,

        // Global Application & Account Layer
        userProfile,
        updateUserProfile,
        connectedSourceDetails,
        syncSourceSimulated,
        disconnectSourceSafe,
        reconnectSourceSimulated,
        privacyPreferences,
        updatePrivacyPreferences,
        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,
        dismissNotification,
        addNotification,
        appSettings,
        updateAppSettings,
        unifiedActivities,
        addUnifiedActivity,
        toasts,
        addToast,
        removeToast,

        // Mobile Navigation Drawer
        mobileSidebarOpen,
        setMobileSidebarOpen,
        toggleMobileSidebar,

        // Live Evidence Synchronization
        refreshEvidenceData,
        initialLoading,
        isLoadingEvidence,
        isDatabaseUnavailable,
        dbRetryAfterSeconds,

        // Authentication State
        isAuthenticated,
        authChecked,
        loginDemo,
        logoutDemo,
      }}
    >
      {children}
    </EvidenceContext.Provider>
  );
}

export function useEvidence() {
  const ctx = useContext(EvidenceContext);
  if (!ctx) {
    throw new Error("useEvidence must be used within an EvidenceProvider");
  }
  return ctx;
}
