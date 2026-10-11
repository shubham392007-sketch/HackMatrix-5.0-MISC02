"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
}

const EvidenceContext = createContext<EvidenceContextType | undefined>(undefined);

export function EvidenceProvider({ children }: { children: React.ReactNode }) {
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(INITIAL_EVIDENCE_ITEMS);
  const [sources, setSources] = useState<ConnectedSource[]>(INITIAL_CONNECTED_SOURCES);
  const [ingestionRuns, setIngestionRuns] = useState<IngestionRun[]>(INITIAL_INGESTION_RUNS);
  const [skills, setSkills] = useState<SkillItem[]>(INITIAL_SKILLS);
  const [historyEvents, setHistoryEvents] = useState<SkillHistoryEvent[]>(INITIAL_SKILL_HISTORY);
  const [taxonomyCategories] = useState<TaxonomyCategory[]>(INITIAL_TAXONOMY_CATEGORIES);

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
    } catch {
      // Ignore local storage read errors
    }
  }, []);

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
