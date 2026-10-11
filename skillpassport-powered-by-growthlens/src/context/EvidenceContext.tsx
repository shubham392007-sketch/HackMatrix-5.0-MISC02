"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  EvidenceItem,
  ConnectedSource,
  IngestionRun,
  ReviewStatus,
} from "@/types/evidence";
import {
  INITIAL_CONNECTED_SOURCES,
  INITIAL_EVIDENCE_ITEMS,
  INITIAL_INGESTION_RUNS,
} from "@/data/evidenceMock";
import {
  SkillItem,
  SkillHistoryEvent,
  TaxonomyCategory,
} from "@/types/passport";
import {
  INITIAL_SKILLS,
  INITIAL_SKILL_HISTORY,
  INITIAL_TAXONOMY_CATEGORIES,
} from "@/data/passportMock";
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
  INITIAL_WORK_ANALYSES,
  INITIAL_EXTRACTION_CANDIDATES,
  INITIAL_EVIDENCE_MAPPINGS,
  INITIAL_VERIFICATIONS,
  INITIAL_CONFIDENCE_CLAIMS,
  INITIAL_CONFLICTS,
  INITIAL_GUARD_RESULTS,
  INITIAL_VALIDATION_RECORDS,
  INITIAL_PROMPT_INJECTION_FLAGS,
  INITIAL_REVIEW_TASKS,
  INITIAL_EVAL_CASES,
  INITIAL_AI_AUDIT_EVENTS,
} from "@/data/aiMock";
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
  skills: SkillItem[];
  historyEvents: SkillHistoryEvent[];
  taxonomyCategories: TaxonomyCategory[];
  
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
  deleteEvidenceItem: (id: string) => void;
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
}

const EvidenceContext = createContext<EvidenceContextType | undefined>(undefined);

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(INITIAL_EVIDENCE_ITEMS);
  const [sources, setSources] = useState<ConnectedSource[]>(INITIAL_CONNECTED_SOURCES);
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRun[]>(INITIAL_INGESTION_RUNS);
  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [historyEvents, setHistoryEvents] = useState<SkillHistoryEvent[]>(INITIAL_SKILL_HISTORY);
  const [taxonomyCategories] = useState<TaxonomyCategory[]>(INITIAL_TAXONOMY_CATEGORIES);

  // Mobile Navigation Drawer State
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const toggleMobileSidebar = () => setMobileSidebarOpen((prev) => !prev);

  // Domain 3 AI State
  const [currentRole, setDemoRole] = useState<DemoRole>("employee");
  const [workAnalyses, setWorkAnalyses] = useState<WorkAnalysisResult[]>(INITIAL_WORK_ANALYSES);
  const [extractionCandidates, setExtractionCandidates] = useState<ExtractionCandidateItem[]>(INITIAL_EXTRACTION_CANDIDATES);
  const [evidenceMappings, setEvidenceMappings] = useState<EvidenceMappingItem[]>(INITIAL_EVIDENCE_MAPPINGS);
  const [verifications, setVerifications] = useState<SkillVerificationRecord[]>(INITIAL_VERIFICATIONS);
  const [confidenceClaims, setConfidenceClaims] = useState<ConfidenceClaim[]>(INITIAL_CONFIDENCE_CLAIMS);
  const [conflicts, setConflicts] = useState<ConflictRecord[]>(INITIAL_CONFLICTS);
  const [guardResults, setGuardResults] = useState<GuardClaimResult[]>(INITIAL_GUARD_RESULTS);
  const [validationRecords, setValidationRecords] = useState<OutputValidationRecord[]>(INITIAL_VALIDATION_RECORDS);
  const [promptInjectionFlags, setPromptInjectionFlags] = useState<PromptInjectionFlag[]>(INITIAL_PROMPT_INJECTION_FLAGS);
  const [reviewTasks, setReviewTasks] = useState<HumanReviewTask[]>(INITIAL_REVIEW_TASKS);
  const [evalCases, setEvalCases] = useState<AIEvalCase[]>(INITIAL_EVAL_CASES);
  const [aiAuditEvents, setAiAuditEvents] = useState<AIAuditEvent[]>(INITIAL_AI_AUDIT_EVENTS);

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

  // Sync with localStorage for seamless developer testing across page refreshes
  useEffect(() => {
    try {
      const savedEv = localStorage.getItem("sp_evidence_items");
      if (savedEv) setEvidenceItems(JSON.parse(savedEv));
      const savedSrc = localStorage.getItem("sp_sources");
      if (savedSrc) setSources(JSON.parse(savedSrc));
      const savedRuns = localStorage.getItem("sp_runs");
      if (savedRuns) setIngestionRuns(JSON.parse(savedRuns));
      const savedSkills = localStorage.getItem("sp_skills");
      if (savedSkills) setSkills(JSON.parse(savedSkills));
      const savedHist = localStorage.getItem("sp_history");
      if (savedHist) setHistoryEvents(JSON.parse(savedHist));
      const savedRole = localStorage.getItem("sp_demo_role");
      if (savedRole) setDemoRole(savedRole as DemoRole);
      const savedConflicts = localStorage.getItem("sp_conflicts");
      if (savedConflicts) setConflicts(JSON.parse(savedConflicts));
      const savedTasks = localStorage.getItem("sp_review_tasks");
      if (savedTasks) setReviewTasks(JSON.parse(savedTasks));
      const savedVal = localStorage.getItem("sp_validation");
      if (savedVal) setValidationRecords(JSON.parse(savedVal));
      const savedAudit = localStorage.getItem("sp_ai_audit");
      if (savedAudit) setAiAuditEvents(JSON.parse(savedAudit));
      const savedCustomRoles = localStorage.getItem("sp_custom_roles");
      if (savedCustomRoles) setCustomRoles(JSON.parse(savedCustomRoles));
      const savedRoleId = localStorage.getItem("sp_selected_role_id");
      if (savedRoleId) setSelectedRoleIdState(savedRoleId);
    } catch {
      // Ignore local storage read errors
    }
  }, []);

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
    items: EvidenceItem[],
    srcs: ConnectedSource[],
    runs: IngestionRun[],
    sks: SkillItem[],
    hist: SkillHistoryEvent[]
  ) => {
    try {
      localStorage.setItem("sp_evidence_items", JSON.stringify(items));
      localStorage.setItem("sp_sources", JSON.stringify(srcs));
      localStorage.setItem("sp_runs", JSON.stringify(runs));
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
    saveState(updated, sources, updatedRuns, skills, historyEvents);
  };

  const deleteEvidenceItem = (id: string) => {
    const updated = evidenceItems.filter((i) => i.id !== id);
    setEvidenceItems(updated);
    saveState(updated, sources, ingestionRuns, skills, historyEvents);
  };

  const updateEvidenceItem = (id: string, updates: Partial<EvidenceItem>) => {
    const updated = evidenceItems.map((i) => (i.id === id ? { ...i, ...updates } : i));
    setEvidenceItems(updated);
    saveState(updated, sources, ingestionRuns, skills, historyEvents);
  };

  const confirmContribution = (evidenceId: string) => {
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
  };

  const updateCandidateSkillStatus = (
    evidenceId: string,
    skillId: string,
    status: "candidate" | "reviewed" | "flagged" | "insufficient"
  ) => {
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

  // Domain 3 Mutators
  const addAIAuditEvent = (eventData: Omit<AIAuditEvent, "id">) => {
    const newEvent: AIAuditEvent = {
      ...eventData,
      id: `ai-audit-${Date.now()}`,
    };
    const updated = [newEvent, ...aiAuditEvents];
    setAiAuditEvents(updated);
    try {
      localStorage.setItem("sp_ai_audit", JSON.stringify(updated));
    } catch {}
  };

  const updateConflict = (id: string, updates: Partial<ConflictRecord>) => {
    const updated = conflicts.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setConflicts(updated);
    try {
      localStorage.setItem("sp_conflicts", JSON.stringify(updated));
    } catch {}
  };

  const updateReviewTask = (id: string, updates: Partial<HumanReviewTask>) => {
    const updated = reviewTasks.map((t) => (t.id === id ? { ...t, ...updates } : t));
    setReviewTasks(updated);
    try {
      localStorage.setItem("sp_review_tasks", JSON.stringify(updated));
    } catch {}
  };

  const updateValidationRecord = (id: string, updates: Partial<OutputValidationRecord>) => {
    const updated = validationRecords.map((v) => (v.run_id === id ? { ...v, ...updates } : v));
    setValidationRecords(updated);
    try {
      localStorage.setItem("sp_validation", JSON.stringify(updated));
    } catch {}
  };

  const updateWorkAnalysis = (id: string, updates: Partial<WorkAnalysisResult>) => {
    const updated = workAnalyses.map((a) => (a.analysis_id === id ? { ...a, ...updates } : a));
    setWorkAnalyses(updated);
  };

  const updateExtractionCandidate = (id: string, updates: Partial<ExtractionCandidateItem>) => {
    const updated = extractionCandidates.map((c) => (c.id === id ? { ...c, ...updates } : c));
    setExtractionCandidates(updated);
  };

  const updateVerification = (id: string, updates: Partial<SkillVerificationRecord>) => {
    const updated = verifications.map((v) => (v.verification_id === id ? { ...v, ...updates } : v));
    setVerifications(updated);
  };

  const updateGuardResult = (id: string, updates: Partial<GuardClaimResult>) => {
    const updated = guardResults.map((g) => (g.id === id ? { ...g, ...updates } : g));
    setGuardResults(updated);
  };

  const updatePromptInjectionFlag = (id: string, updates: Partial<PromptInjectionFlag>) => {
    const updated = promptInjectionFlags.map((p) => (p.id === id ? { ...p, ...updates } : p));
    setPromptInjectionFlags(updated);
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
        const newActivity: ShareActivityEvent = {
          id: `act-${Date.now()}`,
          timestamp: "Just now",
          shareId,
          shareLabel: target.label,
          action: "viewed",
          details: "Recruiter loaded shared passport page.",
        };
        setShareActivities((actPrev) => [newActivity, ...actPrev]);
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
