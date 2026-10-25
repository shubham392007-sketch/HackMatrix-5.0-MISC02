"use client";

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { GoogleGenAI, Modality } from "@google/genai";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import {
  APPLICATION_ROUTES_CATALOG,
  LiveWorkspaceSnapshot,
  VOICE_GUARDRAIL_REFUSAL_MESSAGE,
  buildVoiceAssistantSystemInstruction,
  evaluateProjectScopeGuardrail,
  searchProjectKnowledge,
} from "@/lib/geminiVoiceContext";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneOff,
  Radio,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Send,
  Settings,
  Key,
  Compass,
  Database,
  Brain,
  GraduationCap,
  ShieldCheck,
  Terminal,
  RefreshCw,
  Minimize2,
  Maximize2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
} from "lucide-react";

export type VoiceSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "speaking"
  | "thinking"
  | "error";

export type GeminiLiveVoiceName = "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";
export type GeminiLiveModelId = "gemini-3.8-live" | "gemini-3.8-live-extended-thinking";

export interface TranscriptTurn {
  id: string;
  role: "user" | "model" | "tool" | "system" | "guardrail";
  text: string;
  timestamp: string;
  toolName?: string;
  isFinal?: boolean;
}

interface GeminiVoiceContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;
  status: VoiceSessionStatus;
  isMicMuted: boolean;
  toggleMic: () => void;
  isSpeakerMuted: boolean;
  toggleSpeaker: () => void;
  startSession: () => Promise<void>;
  stopSession: () => void;
  sendTextPrompt: (text: string) => void;
  transcripts: TranscriptTurn[];
  clearTranscripts: () => void;
  selectedVoice: GeminiLiveVoiceName;
  setSelectedVoice: (v: GeminiLiveVoiceName) => void;
  selectedModel: GeminiLiveModelId;
  setSelectedModel: (m: GeminiLiveModelId) => void;
  inputVolume: number;
  outputVolume: number;
}

const GeminiVoiceContext = createContext<GeminiVoiceContextValue | undefined>(undefined);

export function useGeminiVoice() {
  const ctx = useContext(GeminiVoiceContext);
  if (!ctx) {
    throw new Error("useGeminiVoice must be used within GeminiVoiceProvider");
  }
  return ctx;
}

// Non-blocking tool declarations for Gemini 3.8 Live
const VOICE_TOOLS_DECLARATIONS: any[] = [
  {
    name: "get_full_project_context",
    description:
      "Retrieves the complete live snapshot of the user's SkillPassport & GrowthLens workspace, including profile, verified skills, evidence artifacts, target role match, skill gaps, learning roadmap, and AI governance metrics.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        domain: {
          type: "STRING",
          description:
            "Optional focus domain: 'all', 'evidence', 'skills', 'career', 'learning', 'ai_governance', or 'architecture'.",
        },
      },
    },
  },
  {
    name: "search_evidence_and_skills",
    description:
      "Searches the user's ingested evidence items (GitHub repos, Jira issues, uploaded documents, certificates) and skill profile by keyword, source type, or skill name.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Keyword, skill name, project title, or source type (e.g. 'python', 'github', 'lstm').",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_career_and_learning_insights",
    description:
      "Retrieves detailed career readiness analysis, active target role competency matches, prioritized skill gaps, and personalized learning roadmap steps.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        includeCatalogRoles: {
          type: "BOOLEAN",
          description: "Whether to also list available target roles from the role catalogue.",
        },
      },
    },
  },
  {
    name: "get_ai_governance_and_trust_status",
    description:
      "Retrieves AI work analysis findings, Hallucination Guard results, open evidence conflicts, prompt injection security scans, and pending human review queue items.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {},
    },
  },
  {
    name: "search_architecture_and_help",
    description:
      "Searches the GrowthLens & SkillPassport technical architecture, Verifiable Truth Standard rules, developer team bios, and available application screens.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description: "Concept, feature, developer name, or screen topic to look up.",
        },
      },
    },
  },
  {
    name: "navigate_to_page",
    description:
      "Navigates the user's browser directly to any screen in SkillPassport / GrowthLens (e.g., '/app/passport', '/app/evidence', '/app/career/gaps', '/app/learning/roadmaps', '/app/ai/guard', '/developers').",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        route: {
          type: "STRING",
          description:
            "Target path or screen name (e.g., '/app/passport', '/app/evidence/library', '/app/career', '/app/learning', '/app/ai').",
        },
      },
      required: ["route"],
    },
  },
  {
    name: "trigger_workspace_action",
    description:
      "Triggers a live action in the user's workspace, such as refreshing evidence data, switching the active target role, or switching the active learning domain.",
    behavior: "NON_BLOCKING",
    parameters: {
      type: "OBJECT",
      properties: {
        action: {
          type: "STRING",
          description: "Action type: 'refresh_data', 'switch_target_role', or 'switch_learning_domain'.",
        },
        targetId: {
          type: "STRING",
          description: "Optional role ID/title or domain ID when switching target role or learning domain.",
        },
      },
      required: ["action"],
    },
  },
];

// Helper: ArrayBuffer <-> Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize))
    );
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

// Helper: Downsample Float32 audio buffer to 16kHz Int16 PCM
function floatTo16kHzPcm(
  input: Float32Array,
  inputSampleRate: number
): Int16Array {
  if (inputSampleRate === 16000) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(input.length / ratio);
  const result = new Int16Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < input.length; i++) {
      accum += input[i];
      count++;
    }
    const avg = count > 0 ? accum / count : 0;
    const clamped = Math.max(-1, Math.min(1, avg));
    result[offsetResult] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

const API_KEY_STORAGE_KEY = "sp_gemini_voice_api_key";

export function GeminiVoiceProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const evidenceCtx = useEvidence();
  const authCtx = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<VoiceSessionStatus>("disconnected");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<GeminiLiveVoiceName>("Puck");
  const [selectedModel, setSelectedModel] = useState<GeminiLiveModelId>("gemini-3.8-live");
  const [customApiKey, setCustomApiKey] = useState<string>("");
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [serverKeyCount, setServerKeyCount] = useState<number>(0);
  const [textInput, setTextInput] = useState("");
  const [inputVolume, setInputVolume] = useState(0);
  const [outputVolume, setOutputVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptTurn[]>([]);
  const [guardrailBlocksCount, setGuardrailBlocksCount] = useState<number>(0);

  // Refs for real-time callbacks to always read fresh project state without reconnecting WebSocket
  const snapshotRef = useRef<LiveWorkspaceSnapshot | null>(null);
  const evidenceCtxRef = useRef(evidenceCtx);
  const routerRef = useRef(router);
  const sessionRef = useRef<any>(null);
  const isMicMutedRef = useRef(isMicMuted);
  const isSpeakerMutedRef = useRef(isSpeakerMuted);
  const currentSpokenInputRef = useRef<string>("");
  const activeTurnBlockedRef = useRef<boolean>(false);

  // Web Audio API refs
  const captureAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activePlaybackNodesRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    evidenceCtxRef.current = evidenceCtx;
  }, [evidenceCtx]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  // Load saved custom API key & check server key status on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(API_KEY_STORAGE_KEY);
      if (saved) setCustomApiKey(saved);
    }
    fetch("/api/gemini/token")
      .then((r) => r.json())
      .then((data) => {
        if (data?.configured) {
          setHasServerKey(true);
          setServerKeyCount(typeof data.keyCount === "number" ? data.keyCount : 1);
        }
      })
      .catch(() => {});
  }, []);

  // Build live workspace snapshot whenever context changes
  const liveSnapshot: LiveWorkspaceSnapshot = useMemo(() => {
    const {
      userProfile,
      evidenceItems,
      sources,
      skills,
      activeRole,
      activeMatch,
      activeGaps,
      activeReadiness,
      activeBlueprint,
      activeRoadmap,
      workAnalyses,
      conflicts,
      reviewTasks,
      guardResults,
      promptInjectionFlags,
      shareRecords,
      unreadNotificationsCount,
    } = evidenceCtx;

    const authProfile = authCtx.profile;
    const authUser = authCtx.user;

    const bySource: Record<string, number> = {};
    for (const item of evidenceItems) {
      bySource[item.sourceType] = (bySource[item.sourceType] || 0) + 1;
    }

    const verifiedSkills = skills.filter((s) => s.verificationState === "verified");
    const candidateSkills = skills.filter((s) => s.verificationState === "candidate");

    const roadmapSteps = activeRoadmap?.steps || [];
    const completedSteps = roadmapSteps.filter((s) => s.status === "completed");
    const nextSteps = roadmapSteps.filter(
      (s) => s.status === "in_progress" || s.status === "available"
    );

    return {
      currentPath: pathname,
      user: {
        name:
          authProfile?.display_name ||
          userProfile?.displayName ||
          authUser?.email?.split("@")[0] ||
          "Vernit Garg",
        email: authProfile?.email || (userProfile as any)?.email || authUser?.email,
        role: authProfile?.current_role || (userProfile as any)?.role || (userProfile as any)?.currentRole || "Software Engineer",
        headline:
          authProfile?.headline ||
          userProfile?.headline ||
          "Full-Stack & AI Engineer",
        department: authProfile?.department_or_team || (userProfile as any)?.department || (userProfile as any)?.departmentOrTeam,
        experienceLevel: authProfile?.experience_level || undefined,
        goal: authProfile?.professional_goal || undefined,
        onboardingStatus: authProfile?.onboarding_status,
      },
      evidenceSummary: {
        totalEvidence: evidenceItems.length,
        verifiedCount: evidenceItems.filter((e) => e.reviewStatus === "verified").length,
        bySource,
        connectedSources: sources.map((s) => ({
          name: s.name,
          type: s.type,
          status: s.status,
          itemCount: (s as any).itemCount || (s as any).evidenceCount || 0,
        })),
        recentEvidence: evidenceItems.slice(0, 12).map((e) => ({
          id: e.id,
          title: e.title,
          sourceType: e.sourceType,
          evidenceStrength: e.evidenceStrength,
          reviewStatus: e.reviewStatus,
          date: e.date,
          candidateSkills: e.candidateSkills.map((c) => c.name),
          summary: (e.extractedSummary || e.description || "").slice(0, 180),
        })),
      },
      skillsSummary: {
        totalSkills: skills.length,
        verifiedSkillsCount: verifiedSkills.length,
        candidateSkillsCount: candidateSkills.length,
        topVerifiedSkills: verifiedSkills.slice(0, 15).map((s) => ({
          id: s.id,
          name: s.canonicalName,
          category: s.category,
          proficiency: s.verifiedProficiency || s.estimatedProficiency,
          confidence: s.confidence,
          evidenceCount: s.evidenceIds.length,
          coverageState: s.coverageState,
        })),
        candidateSkills: candidateSkills.slice(0, 10).map((s) => ({
          id: s.id,
          name: s.canonicalName,
          category: s.category,
          estimatedProficiency: s.estimatedProficiency,
          confidence: s.confidence,
        })),
      },
      careerSummary: {
        activeTargetRole: activeRole
          ? {
              id: activeRole.role_id,
              title: activeRole.title || activeRole.role_title || "Target Role",
              seniority: activeRole.seniority,
              context: activeRole.context || activeRole.context_domain || "",
            }
          : null,
        overallMatchScore: activeMatch?.overall_match_score,
        readinessLevel: (activeReadiness as any)?.readiness_level,
        readinessSummary: (activeReadiness as any)?.executive_summary,
        topSkillGaps: (activeGaps || []).slice(0, 10).map((g: any) => ({
          skillName: g.canonical_name,
          gapType: g.gap_type,
          importance: g.importance,
          currentLevel: g.current_level || g.current_proficiency,
          expectedLevel: g.expected_level,
          priorityScore: g.priority_score,
        })),
      },
      learningSummary: {
        activeDomainTitle: activeBlueprint?.title,
        roadmapTitle: (activeRoadmap as any)?.title || (activeRoadmap as any)?.domain, 
        completedStepsCount: completedSteps.length,
        totalStepsCount: roadmapSteps.length,
        nextRecommendedSteps: nextSteps.slice(0, 6).map((s) => ({
          stepId: s.step_id,
          title: s.title,
          difficulty: s.difficulty,
          status: s.status,
          estimatedMinutes: s.estimated_minutes,
        })),
      },
      aiGovernanceSummary: {
        totalWorkAnalyses: workAnalyses.length,
        openConflictsCount: conflicts.filter((c) => c.status !== "resolved").length,
        pendingHumanReviewsCount: reviewTasks.filter((t) => t.status === "pending").length,
        guardBlockedCount: guardResults.filter((g: any) => g.decision === "blocked" || g.verdict === "blocked").length,
        promptInjectionFlagsCount: promptInjectionFlags.length,
      },
      sharingSummary: {
        activeShareLinksCount: shareRecords.filter((r) => r.status === "active").length,
        unreadNotificationsCount,
      },
    };
  }, [evidenceCtx, authCtx.profile, authCtx.user, pathname]);

  useEffect(() => {
    snapshotRef.current = liveSnapshot;
  }, [liveSnapshot]);

  // Inject route navigation changes mid-session using sendClientContent without interrupting speech
  const prevPathRef = useRef(pathname);
  useEffect(() => {
    if (prevPathRef.current !== pathname) {
      prevPathRef.current = pathname;
      if (sessionRef.current && status !== "disconnected" && status !== "connecting") {
        const routeInfo = APPLICATION_ROUTES_CATALOG.find((r) => r.href === pathname);
        try {
          sessionRef.current.sendClientContent({
            turns: [
              {
                role: "user",
                parts: [
                  {
                    text: `[System Context Update: User navigated to screen "${routeInfo?.label || pathname}" (${pathname})${routeInfo ? ` — ${routeInfo.description}` : ""}]`,
                  },
                ],
              },
            ],
            turnComplete: false,
          });
        } catch {
          // Ignore if session is closing
        }
      }
    }
  }, [pathname, status]);

  // Auto-scroll transcript panel
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, isOpen]);

  const appendOrUpdateTranscript = useCallback(
    (
      role: "user" | "model" | "tool" | "system" | "guardrail",
      text: string,
      isFinal = false,
      toolName?: string
    ) => {
      if (!text.trim()) return;
      setTranscripts((prev) => {
        const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        if (role === "user" || role === "model") {
          const lastIdx = prev.length - 1;
          if (lastIdx >= 0 && prev[lastIdx].role === role && !prev[lastIdx].isFinal) {
            const updated = [...prev];
            updated[lastIdx] = {
              ...updated[lastIdx],
              text: updated[lastIdx].text + text,
              isFinal,
            };
            return updated;
          }
        }
        return [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            role,
            text,
            timestamp: now,
            toolName,
            isFinal,
          },
        ];
      });
    },
    []
  );

  const triggerSpokenGuardrailRefusal = useCallback((reason?: string) => {
    setGuardrailBlocksCount((c) => c + 1);
    appendOrUpdateTranscript(
      "guardrail",
      `${reason ? `[Blocked: ${reason}] ` : ""}${VOICE_GUARDRAIL_REFUSAL_MESSAGE}`,
      true
    );
    if (
      !isSpeakerMutedRef.current &&
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      try {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(
          "I am restricted exclusively to the Skill Passport and GrowthLens project, so I cannot answer questions outside of this project."
        );
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      } catch {
        // ignore browser speech synthesis errors
      }
    }
  }, [appendOrUpdateTranscript]);

  // Stop all active audio output immediately (used on interruption or disconnect)
  const clearPlaybackQueue = useCallback(() => {
    for (const node of activePlaybackNodesRef.current) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        // already stopped
      }
    }
    activePlaybackNodesRef.current = [];
    if (playbackAudioCtxRef.current) {
      nextPlayTimeRef.current = playbackAudioCtxRef.current.currentTime;
    }
    setOutputVolume(0);
  }, []);

  // Schedule 24kHz 16-bit PCM chunk for gapless playback
  const enqueuePcm24kAudio = useCallback((base64Data: string) => {
    if (isSpeakerMutedRef.current) return;
    try {
      if (!playbackAudioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        playbackAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
      }
      const ctx = playbackAudioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const int16 = base64ToInt16Array(base64Data);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      let sumSq = 0;
      for (let i = 0; i < int16.length; i++) {
        const v = int16[i] / 32768.0;
        float32[i] = v;
        sumSq += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sumSq / int16.length) * 3.5);
      setOutputVolume(rms);

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      if (nextPlayTimeRef.current < currentTime) {
        nextPlayTimeRef.current = currentTime + 0.02;
      }

      sourceNode.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
      activePlaybackNodesRef.current.push(sourceNode);

      sourceNode.onended = () => {
        activePlaybackNodesRef.current = activePlaybackNodesRef.current.filter(
          (n) => n !== sourceNode
        );
        if (activePlaybackNodesRef.current.length === 0) {
          setOutputVolume(0);
          setStatus((prev) => (prev === "speaking" ? "connected" : prev));
        }
      };

      setStatus("speaking");
    } catch (err) {
      console.warn("[Gemini Voice] Audio playback error:", err);
    }
  }, []);

  // Execute tool call requested by Gemini 3.8 Live
  const executeVoiceToolCall = useCallback(
    async (call: { id?: string; name?: string; args?: Record<string, any> }) => {
      const name = call.name || "unknown_tool";
      const args = call.args || {};
      const snap = snapshotRef.current;
      const ctx = evidenceCtxRef.current;

      appendOrUpdateTranscript("tool", `Executing ${name}...`, true, name);

      try {
        if (name === "get_full_project_context") {
          const domain = (args.domain || "all").toLowerCase();
          if (!snap) return { error: "Workspace snapshot not ready" };
          if (domain === "evidence") return snap.evidenceSummary;
          if (domain === "skills") return snap.skillsSummary;
          if (domain === "career") return snap.careerSummary;
          if (domain === "learning") return snap.learningSummary;
          if (domain === "ai_governance") return snap.aiGovernanceSummary;
          if (domain === "architecture") return searchProjectKnowledge("");
          return snap;
        }

        if (name === "search_evidence_and_skills") {
          const q = String(args.query || "").toLowerCase().trim();
          const matchedEvidence = ctx.evidenceItems
            .filter(
              (e) =>
                !q ||
                e.title.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q) ||
                e.sourceType.toLowerCase().includes(q) ||
                e.project.toLowerCase().includes(q) ||
                e.extractedSummary.toLowerCase().includes(q) ||
                e.candidateSkills.some((cs) => cs.name.toLowerCase().includes(q))
            )
            .slice(0, 8)
            .map((e) => ({
              id: e.id,
              title: e.title,
              sourceType: e.sourceType,
              project: e.project,
              date: e.date,
              strength: e.evidenceStrength,
              confidence: e.extractionConfidence,
              reviewStatus: e.reviewStatus,
              summary: e.extractedSummary || e.description,
              candidateSkills: e.candidateSkills.map((c) => ({
                name: c.name,
                proficiency: c.proficiencyLevel,
                status: c.status,
              })),
            }));

          const matchedSkills = ctx.skills
            .filter(
              (s) =>
                !q ||
                s.canonicalName.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q) ||
                s.definition.toLowerCase().includes(q) ||
                s.aliases.some((a) => a.toLowerCase().includes(q))
            )
            .slice(0, 10)
            .map((s) => ({
              id: s.id,
              name: s.canonicalName,
              category: s.category,
              verificationState: s.verificationState,
              proficiency: s.verifiedProficiency || s.estimatedProficiency,
              confidence: s.confidence,
              evidenceStrength: s.evidenceStrength,
              coverageState: s.coverageState,
              rationale: s.assessmentRationale,
              limitations: s.limitations,
            }));

          return {
            query: q,
            matchedEvidenceCount: matchedEvidence.length,
            matchedEvidence,
            matchedSkillsCount: matchedSkills.length,
            matchedSkills,
          };
        }

        if (name === "get_career_and_learning_insights") {
          return {
            activeRole: ctx.activeRole
              ? {
                  id: ctx.activeRole.role_id,
                  title: ctx.activeRole.title,
                  seniority: ctx.activeRole.seniority,
                  context: ctx.activeRole.context,
                  description: ctx.activeRole.description,
                }
              : null,
            matchResult: {
              overallMatchScore: ctx.activeMatch?.overall_match_score,
              verifiedMatchScore: (ctx.activeMatch as any)?.verified_match_score,
              coreCoverage: (ctx.activeMatch as any)?.core_coverage_percent,
              competencyMatches: ((ctx.activeMatch as any)?.competency_results || []).slice(0, 12).map((c: any) => ({
                skill: c.canonical_name,
                expected: c.expected_level,
                current: c.current_proficiency,
                status: c.match_status,
                gapType: c.gap_type,
              })),
            },
            readiness: {
              level: (ctx.activeReadiness as any)?.readiness_level,
              score: (ctx.activeReadiness as any)?.readiness_score,
              summary: (ctx.activeReadiness as any)?.executive_summary,
              strengths: (ctx.activeReadiness as any)?.key_strengths,
              blockers: (ctx.activeReadiness as any)?.critical_blockers,
              recommendedNextSteps: (ctx.activeReadiness as any)?.recommended_next_steps,
            },
            topGaps: (ctx.activeGaps || []).slice(0, 10).map((g: any) => ({
              skill: g.canonical_name,
              gapType: g.gap_type,
              importance: g.importance,
              currentLevel: g.current_level || g.current_proficiency,
              expectedLevel: g.expected_level,
              priorityScore: g.priority_score,
              remediationAction: g.recommended_action,
            })),
            learningRoadmap: {
              domain: ctx.activeBlueprint?.title,
              roadmapTitle: (ctx.activeRoadmap as any)?.title || (ctx.activeRoadmap as any)?.domain,
              steps: (ctx.activeRoadmap?.steps || []).slice(0, 10).map((st) => ({
                id: st.step_id,
                title: st.title,
                status: st.status,
                difficulty: st.difficulty,
                currentMastery: st.current_mastery,
                targetMastery: st.target_mastery,
                reason: st.recommendation_reason,
              })),
            },
            availableTargetRoles: args.includeCatalogRoles
              ? ctx.targetRoles.map((r) => ({
                  id: r.role_id,
                  title: r.title,
                  seniority: r.seniority,
                  context: r.context,
                }))
              : undefined,
          };
        }

        if (name === "get_ai_governance_and_trust_status") {
          return {
            workAnalyses: ctx.workAnalyses.slice(0, 5).map((w) => ({
              id: w.analysis_id,
              title: w.source_title,
              sourceType: w.source_type,
              status: w.status,
              keyFindings: w.key_findings,
              uncertaintyFlags: w.uncertainty_flags,
            })),
            hallucinationGuardResults: ctx.guardResults.slice(0, 6),
            openConflicts: ctx.conflicts.filter((c) => c.status !== "resolved").slice(0, 6),
            pendingReviewTasks: ctx.reviewTasks.filter((t) => t.status === "pending").slice(0, 6),
            promptInjectionFlags: ctx.promptInjectionFlags.slice(0, 5),
          };
        }

        if (name === "search_architecture_and_help") {
          return searchProjectKnowledge(String(args.query || ""));
        }

        if (name === "navigate_to_page") {
          const rawRoute = String(args.route || "").trim();
          let resolved = APPLICATION_ROUTES_CATALOG.find(
            (r) =>
              r.href.toLowerCase() === rawRoute.toLowerCase() ||
              r.label.toLowerCase() === rawRoute.toLowerCase()
          );
          if (!resolved) {
            resolved = APPLICATION_ROUTES_CATALOG.find(
              (r) =>
                r.label.toLowerCase().includes(rawRoute.toLowerCase()) ||
                r.href.toLowerCase().includes(rawRoute.toLowerCase()) ||
                r.description.toLowerCase().includes(rawRoute.toLowerCase())
            );
          }
          const targetHref = resolved ? resolved.href : rawRoute.startsWith("/") ? rawRoute : `/app/passport`;
          routerRef.current.push(targetHref);
          return {
            status: "navigated",
            targetHref,
            pageLabel: resolved?.label || targetHref,
            description: resolved?.description || "Navigated to requested screen.",
          };
        }

        if (name === "trigger_workspace_action") {
          const action = String(args.action || "").toLowerCase();
          const targetId = String(args.targetId || "").trim();

          if (action === "refresh_data") {
            await ctx.refreshEvidenceData(true);
            return { status: "success", message: "Refreshed live evidence and skill passport data from backend." };
          }

          if (action === "switch_target_role" && targetId) {
            const matchedRole = ctx.targetRoles.find(
              (r) =>
                r.role_id.toLowerCase() === targetId.toLowerCase() ||
                r.title.toLowerCase().includes(targetId.toLowerCase())
            );
            if (matchedRole) {
              ctx.setSelectedRoleId(matchedRole.role_id);
              return {
                status: "success",
                message: `Switched active target role to ${matchedRole.title} (${matchedRole.seniority}).`,
              };
            }
            return { status: "not_found", message: `Could not find target role matching '${targetId}'.` };
          }

          if (action === "switch_learning_domain" && targetId) {
            const matchedDomain = ctx.blueprints.find(
              (b) =>
                b.domain_id.toLowerCase() === targetId.toLowerCase() ||
                b.title.toLowerCase().includes(targetId.toLowerCase())
            );
            if (matchedDomain) {
              ctx.setActiveDomainId(matchedDomain.domain_id);
              return {
                status: "success",
                message: `Switched active learning blueprint to ${matchedDomain.title}.`,
              };
            }
            return { status: "not_found", message: `Could not find learning domain matching '${targetId}'.` };
          }

          return { status: "unknown_action", message: `Unsupported action: ${action}` };
        }

        return { error: `Unknown tool ${name}` };
      } catch (err: any) {
        return { error: err?.message || "Tool execution failed" };
      }
    },
    [appendOrUpdateTranscript]
  );

  // Stop microphone capture and close Live WebSocket session
  const stopSession = useCallback(() => {
    clearPlaybackQueue();

    if (processorNodeRef.current) {
      try {
        processorNodeRef.current.disconnect();
      } catch {}
      processorNodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        try {
          track.stop();
        } catch {}
      }
      mediaStreamRef.current = null;
    }

    if (captureAudioCtxRef.current) {
      try {
        captureAudioCtxRef.current.close();
      } catch {}
      captureAudioCtxRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {}
      sessionRef.current = null;
    }

    setInputVolume(0);
    setOutputVolume(0);
    setStatus("disconnected");
  }, [clearPlaybackQueue]);

  // Start real-time Gemini 3.8 Live session
  const startSession = useCallback(async () => {
    if (status === "connecting" || status === "connected" || status === "speaking") {
      return;
    }

    setErrorMessage(null);
    setStatus("connecting");
    setIsOpen(true);

    try {
      // 1. Obtain ephemeral token or API key from server route
      const tokenResp = await fetch("/api/gemini/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: customApiKey.trim() || undefined }),
      });

      const tokenData = await tokenResp.json();
      if (!tokenResp.ok || !tokenData?.token) {
        setShowSettings(true);
        throw new Error(
          tokenData?.message ||
            "Gemini API Key required. Add GEMINI_API_KEY to .env.local or paste your key in the Voice Copilot settings."
        );
      }

      // 2. Request microphone access before opening session
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;

      // 3. Initialize GoogleGenAI client with automatic multi-key failover across the 3 configured keys
      const currentSnap = snapshotRef.current || liveSnapshot;
      const systemInstructionText = buildVoiceAssistantSystemInstruction(currentSnap);

      const connectConfig: any = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice,
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemInstructionText }],
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        tools: [{ functionDeclarations: VOICE_TOOLS_DECLARATIONS }],
      };

      // Extended thinking model requires thinkingConfig
      if (selectedModel === "gemini-3.8-live-extended-thinking") {
        connectConfig.thinkingConfig = {
          thinkingLevel: "low",
        };
      }

      const tokenPool: string[] = [
        tokenData.token,
        ...(Array.isArray(tokenData.backupTokens) ? tokenData.backupTokens : []),
      ].filter(Boolean);

      let connectedSession: any = null;
      let lastConnectError: any = null;

      for (let keyIdx = 0; keyIdx < tokenPool.length; keyIdx++) {
        const candidateToken = tokenPool[keyIdx];
        try {
          const ai = new GoogleGenAI({
            apiKey: candidateToken,
            ...(tokenData.isEphemeral && keyIdx === 0
              ? { httpOptions: { apiVersion: "v1alpha" } }
              : {}),
          });

          connectedSession = await ai.live.connect({
            model: selectedModel,
            config: connectConfig,
            callbacks: {
              onopen: () => {
                setStatus("connected");
                appendOrUpdateTranscript(
                  "system",
                  `Connected to ${selectedModel} (${selectedVoice} voice, Key #${keyIdx + 1}) with full SkillPassport & GrowthLens context.`,
                  true
                );
              },
              onmessage: async (message: any) => {
                // Monitor interactionStatus for gemini-3.8-live-extended-thinking
                if (message.interactionStatus === "IN_PROGRESS") {
                  setStatus((prev) => (prev === "speaking" ? "speaking" : "thinking"));
                } else if (message.interactionStatus === "IDLE") {
                  setStatus((prev) => (prev === "speaking" ? "speaking" : "connected"));
                }

                const content = message.serverContent;
                if (content) {
                  // Handle interruption: immediately stop speaker playback
                  if (content.interrupted) {
                    clearPlaybackQueue();
                    activeTurnBlockedRef.current = false;
                    currentSpokenInputRef.current = "";
                    setStatus("connected");
                  }

                  // Input Audio Transcriptions & Real-Time Guardrail Check
                  if (content.inputTranscription?.text) {
                    currentSpokenInputRef.current += content.inputTranscription.text;
                    appendOrUpdateTranscript("user", content.inputTranscription.text, false);

                    // Immediately block explicit prompt-injections or out-of-scope topics mid-utterance
                    if (!activeTurnBlockedRef.current) {
                      const streamingCheck = evaluateProjectScopeGuardrail(
                        currentSpokenInputRef.current,
                        snapshotRef.current
                      );
                      if (
                        !streamingCheck.allowed &&
                        (streamingCheck.category === "blocked_prompt_injection" ||
                          streamingCheck.category === "blocked_out_of_scope_topic")
                      ) {
                        activeTurnBlockedRef.current = true;
                        clearPlaybackQueue();
                        triggerSpokenGuardrailRefusal(streamingCheck.reason);
                      }
                    }
                  }

                  // Before playing any model audio or showing model output, verify full user utterance against project guardrail
                  if (
                    (content.modelTurn?.parts || content.outputTranscription?.text) &&
                    !activeTurnBlockedRef.current &&
                    currentSpokenInputRef.current.trim().split(/\s+/).length >= 3
                  ) {
                    const fullTurnCheck = evaluateProjectScopeGuardrail(
                      currentSpokenInputRef.current,
                      snapshotRef.current
                    );
                    if (!fullTurnCheck.allowed) {
                      activeTurnBlockedRef.current = true;
                      clearPlaybackQueue();
                      triggerSpokenGuardrailRefusal(fullTurnCheck.reason);
                    }
                  }

                  // Process all parts in modelTurn (only if turn is NOT blocked by guardrail)
                  if (content.modelTurn?.parts && !activeTurnBlockedRef.current) {
                    for (const part of content.modelTurn.parts) {
                      if (part.inlineData?.data) {
                        enqueuePcm24kAudio(part.inlineData.data);
                      }
                    }
                  }

                  // Output Audio Transcriptions (only if turn is NOT blocked by guardrail)
                  if (content.outputTranscription?.text && !activeTurnBlockedRef.current) {
                    appendOrUpdateTranscript("model", content.outputTranscription.text, false);
                  }

                  if (content.turnComplete) {
                    activeTurnBlockedRef.current = false;
                    currentSpokenInputRef.current = "";
                    setTranscripts((prev) =>
                      prev.map((t, i) => (i >= prev.length - 2 ? { ...t, isFinal: true } : t))
                    );
                  }
                }

                // Asynchronous NON_BLOCKING tool calls
                if (message.toolCall?.functionCalls) {
                  const functionResponses: any[] = [];
                  for (const call of message.toolCall.functionCalls) {
                    const result = await executeVoiceToolCall(call);
                    functionResponses.push({
                      id: call.id,
                      name: call.name,
                      response: { result },
                    });
                  }
                  if (functionResponses.length > 0 && sessionRef.current) {
                    try {
                      sessionRef.current.sendToolResponse({ functionResponses });
                    } catch (err) {
                      console.warn("[Gemini Voice] Error sending tool response:", err);
                    }
                  }
                }
              },
              onerror: (err: any) => {
                console.error("[Gemini Voice] Live session error:", err);
                setErrorMessage(err?.message || "Connection error with Gemini Live API.");
                setStatus("error");
              },
              onclose: () => {
                setStatus("disconnected");
              },
            },
          });

          if (connectedSession) break;
        } catch (connErr: any) {
          lastConnectError = connErr;
          console.warn(
            `[Gemini Voice] Key #${keyIdx + 1} failed to connect, rotating to next key...`,
            connErr
          );
        }
      }

      if (!connectedSession) {
        throw lastConnectError || new Error("All configured Gemini API keys failed to connect.");
      }

      sessionRef.current = connectedSession;

      // 4. Start streaming 16kHz PCM microphone audio via sendRealtimeInput
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const captureCtx = new AudioCtx();
      captureAudioCtxRef.current = captureCtx;

      const source = captureCtx.createMediaStreamSource(stream);
      const processor = captureCtx.createScriptProcessor(4096, 1, 1);
      processorNodeRef.current = processor;

      processor.onaudioprocess = (event) => {
        if (!sessionRef.current || isMicMutedRef.current) {
          setInputVolume(0);
          return;
        }
        const inputData = event.inputBuffer.getChannelData(0);
        let sumSq = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSq += inputData[i] * inputData[i];
        }
        const rms = Math.min(1, Math.sqrt(sumSq / inputData.length) * 4);
        setInputVolume(rms);

        const pcm16 = floatTo16kHzPcm(inputData, captureCtx.sampleRate);
        const base64Audio = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

        try {
          sessionRef.current.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // Ignore transient send errors when closing
        }
      };

      source.connect(processor);
      processor.connect(captureCtx.destination);
    } catch (err: any) {
      console.error("[Gemini Voice] Failed to start session:", err);
      stopSession();
      setErrorMessage(err?.message || "Could not start Gemini Live voice session.");
      setStatus("error");
    }
  }, [
    status,
    customApiKey,
    liveSnapshot,
    selectedVoice,
    selectedModel,
    appendOrUpdateTranscript,
    clearPlaybackQueue,
    enqueuePcm24kAudio,
    executeVoiceToolCall,
    stopSession,
    triggerSpokenGuardrailRefusal,
  ]);

  // Toggle mic mute and send Hybrid VAD audioStreamEnd when muting
  const toggleMic = useCallback(() => {
    setIsMicMuted((prev) => {
      const nextMuted = !prev;
      if (nextMuted && sessionRef.current) {
        try {
          sessionRef.current.sendRealtimeInput({ audioStreamEnd: true });
        } catch {}
      }
      return nextMuted;
    });
  }, []);

  const toggleSpeaker = useCallback(() => {
    setIsSpeakerMuted((prev) => {
      const next = !prev;
      if (next) clearPlaybackQueue();
      return next;
    });
  }, [clearPlaybackQueue]);

  // Send text message in the active Live session (or start session and send), enforcing strict project-only guardrails
  const sendTextPrompt = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      appendOrUpdateTranscript("user", trimmed, true);
      setTextInput("");

      // Pre-flight guardrail evaluation: block any out-of-project or prompt-injection queries before calling Gemini
      const guardCheck = evaluateProjectScopeGuardrail(
        trimmed,
        snapshotRef.current || liveSnapshot
      );
      if (!guardCheck.allowed) {
        clearPlaybackQueue();
        triggerSpokenGuardrailRefusal(guardCheck.reason);
        return;
      }

      if (sessionRef.current && status !== "disconnected" && status !== "error") {
        try {
          sessionRef.current.sendRealtimeInput({ text: trimmed });
        } catch (err) {
          console.warn("[Gemini Voice] Failed to send text:", err);
        }
      } else {
        await startSession();
        setTimeout(() => {
          if (sessionRef.current) {
            try {
              sessionRef.current.sendRealtimeInput({ text: trimmed });
            } catch {}
          }
        }, 800);
      }
    },
    [
      appendOrUpdateTranscript,
      clearPlaybackQueue,
      liveSnapshot,
      startSession,
      status,
      triggerSpokenGuardrailRefusal,
    ]
  );

  // Save custom API key to localStorage
  const handleSaveApiKey = (val: string) => {
    setCustomApiKey(val);
    if (typeof window !== "undefined") {
      if (val.trim()) {
        localStorage.setItem(API_KEY_STORAGE_KEY, val.trim());
      } else {
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, [stopSession]);

  const contextValue = useMemo<GeminiVoiceContextValue>(
    () => ({
      isOpen,
      setIsOpen,
      toggleOpen: () => setIsOpen((p) => !p),
      status,
      isMicMuted,
      toggleMic,
      isSpeakerMuted,
      toggleSpeaker,
      startSession,
      stopSession,
      sendTextPrompt,
      transcripts,
      clearTranscripts: () => setTranscripts([]),
      selectedVoice,
      setSelectedVoice,
      selectedModel,
      setSelectedModel,
      inputVolume,
      outputVolume,
    }),
    [
      isOpen,
      status,
      isMicMuted,
      toggleMic,
      isSpeakerMuted,
      toggleSpeaker,
      startSession,
      stopSession,
      sendTextPrompt,
      transcripts,
      selectedVoice,
      selectedModel,
      inputVolume,
      outputVolume,
    ]
  );

  const isSessionActive =
    status === "connected" || status === "speaking" || status === "thinking";

  const quickPrompts = [
    {
      label: "Summarize my Skill Passport",
      prompt:
        "Give me a concise summary of my verified skills, evidence strength, and overall readiness for my active target role.",
      icon: ShieldCheck,
    },
    {
      label: "Analyze my Career Skill Gaps",
      prompt:
        "What are my top priority skill gaps for my active target role, and what roadmap steps should I take next?",
      icon: Compass,
    },
    {
      label: "Explain Project Architecture",
      prompt:
        "Explain how GrowthLens and SkillPassport work together across the 6 domains and the Verifiable Truth Standard.",
      icon: Brain,
    },
    {
      label: "Audit AI Trust & Governance",
      prompt:
        "Check my AI Governance status: are there any open conflicts, hallucination guard blocks, or pending review tasks?",
      icon: Database,
    },
  ];

  return (
    <GeminiVoiceContext.Provider value={contextValue}>
      {children}

      {/* Floating Gemini Voice Copilot Launcher & Console */}
      <div className="fixed bottom-5 right-5 z-[90] print:hidden font-[var(--font-primary)]">
        {/* Collapsed Floating Pill Launcher */}
        {!isOpen && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border-[1.5px] border-[#171717] transition-all duration-200 cursor-pointer select-none ${
                isSessionActive
                  ? "bg-[#DFE968] text-[#171717] shadow-[3px_3px_0_0_#171717]"
                  : "bg-[#171717] text-[#FAF8F5] hover:bg-[#2A2A2A] shadow-[3px_3px_0_0_#E6AC70]"
              }`}
              title="Open GrowthLens Gemini Live Voice Copilot"
              aria-label="Open GrowthLens Gemini Live Voice Copilot"
            >
              <span className="relative flex items-center justify-center w-6 h-6 rounded-full bg-[#FAF8F5]/15 border border-current/20">
                {isSessionActive ? (
                  <>
                    <span className="absolute inset-0 rounded-full bg-[#171717]/20 animate-ping" />
                    <Radio className="w-3.5 h-3.5 text-[#171717]" />
                  </>
                ) : (
                  <Mic className="w-3.5 h-3.5 text-[#DFE968]" />
                )}
              </span>

              <div className="flex flex-col items-start text-left">
                <span className="text-[11px] font-black tracking-wider uppercase leading-none">
                  {status === "speaking"
                    ? "Gemini Speaking…"
                    : status === "thinking"
                      ? "Gemini Reasoning…"
                      : status === "connected"
                        ? "Voice Copilot Live"
                        : "Gemini Voice"}
                </span>
                <span
                  className={`text-[9px] font-semibold leading-tight mt-0.5 ${
                    isSessionActive ? "text-[#171717]/75" : "text-[#FAF8F5]/70"
                  }`}
                >
                  {isSessionActive ? "Full Project Context Active" : "Live 3.8 Audio + Context"}
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Expanded Gemini Voice Copilot Drawer / Panel */}
        {isOpen && (
          <div
            className={`bg-[#FAF8F5] border-2 border-[#171717] rounded-[28px] shadow-[6px_6px_0_0_#171717] flex flex-col overflow-hidden transition-all duration-200 ${
              isExpanded
                ? "w-[92vw] sm:w-[540px] h-[80vh] max-h-[720px]"
                : "w-[92vw] sm:w-[400px] h-[560px] max-h-[82vh]"
            }`}
          >
            {/* Header Bar */}
            <div className="bg-[#171717] text-[#FAF8F5] px-4 py-3 flex items-center justify-between border-b border-[#171717]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border border-[#FAF8F5]/20 shrink-0 ${
                    status === "speaking"
                      ? "bg-[#DFE968] text-[#171717]"
                      : isSessionActive
                        ? "bg-emerald-400 text-[#171717]"
                        : "bg-[#2A2A2A] text-[#DFE968]"
                  }`}
                >
                  {status === "connecting" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-black tracking-wider uppercase truncate">
                      Gemini Live Copilot
                    </h3>
                    <span className="px-1.5 py-0.5 rounded-full bg-[#DFE968] text-[#171717] text-[8px] font-black uppercase tracking-wider">
                      3.8 LIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-[#FAF8F5]/70 truncate">
                    {liveSnapshot.user.name} • {liveSnapshot.skillsSummary.verifiedSkillsCount} Verified Skills •{" "}
                    {liveSnapshot.evidenceSummary.totalEvidence} Artifacts
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowSettings((s) => !s)}
                  className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                    showSettings
                      ? "bg-[#DFE968] text-[#171717]"
                      : "hover:bg-white/10 text-[#FAF8F5]/80"
                  }`}
                  title="Voice & Model Settings"
                  aria-label="Voice & Model Settings"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((e) => !e)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-[#FAF8F5]/80 transition-colors cursor-pointer"
                  title={isExpanded ? "Compact view" : "Expand view"}
                  aria-label={isExpanded ? "Compact view" : "Expand view"}
                >
                  {isExpanded ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-[#FAF8F5]/80 transition-colors cursor-pointer"
                  title="Minimize Voice Copilot"
                  aria-label="Minimize Voice Copilot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Context & Project-Only Guardrail Pill Strip */}
            <div className="px-3.5 py-2 bg-[#FBF1CF] border-b border-[#171717]/15 flex items-center justify-between gap-2 text-[10px]">
              <div className="flex items-center gap-1.5 truncate font-semibold text-[#171717]/85">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    status === "speaking"
                      ? "bg-emerald-600 animate-ping"
                      : isSessionActive
                        ? "bg-emerald-600"
                        : status === "connecting"
                          ? "bg-amber-500 animate-pulse"
                          : status === "error"
                            ? "bg-rose-600"
                            : "bg-[#171717]/40"
                  }`}
                />
                <span className="truncate">
                  Context:{" "}
                  <strong>
                    {APPLICATION_ROUTES_CATALOG.find((r) => r.href === pathname)?.label ||
                      pathname}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-700/35 bg-emerald-50 font-mono font-bold text-[9px] text-emerald-900"
                  title="Strict Project-Only Guardrail Active: Only answers questions about SkillPassport, GrowthLens, and your workspace."
                >
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" />
                  Project Guardrail{guardrailBlocksCount > 0 ? ` (${guardrailBlocksCount} blocked)` : ""}
                </span>
              </div>
            </div>

            {/* Settings Drawer (API Key, Model, Voice Selector) */}
            {showSettings && (
              <div className="p-3.5 bg-white border-b border-[#171717]/15 space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-black text-[10px] uppercase tracking-wider text-[#171717]">
                    Gemini Live Configuration
                  </span>
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      hasServerKey || customApiKey.trim()
                        ? "bg-emerald-50 border-emerald-600/30 text-emerald-800"
                        : "bg-amber-50 border-amber-600/30 text-amber-800"
                    }`}
                  >
                    {hasServerKey
                      ? `${serverKeyCount || 8} Server Keys Active (Auto-Rotate)`
                      : customApiKey.trim()
                        ? "Custom Key Saved"
                        : "API Key Needed"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-[#171717]/70 mb-1">
                      Live Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value as GeminiLiveModelId)}
                      disabled={isSessionActive}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#171717]/25 bg-[#FAF8F5] text-[11px] font-bold text-[#171717] focus:outline-none focus:border-[#171717] disabled:opacity-50"
                    >
                      <option value="gemini-3.8-live">gemini-3.8-live (Fast)</option>
                      <option value="gemini-3.8-live-extended-thinking">
                        gemini-3.8-live-extended-thinking
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#171717]/70 mb-1">
                      Voice Persona
                    </label>
                    <select
                      value={selectedVoice}
                      onChange={(e) => setSelectedVoice(e.target.value as GeminiLiveVoiceName)}
                      disabled={isSessionActive}
                      className="w-full px-2.5 py-1.5 rounded-xl border border-[#171717]/25 bg-[#FAF8F5] text-[11px] font-bold text-[#171717] focus:outline-none focus:border-[#171717] disabled:opacity-50"
                    >
                      <option value="Puck">Puck (Conversational)</option>
                      <option value="Kore">Kore (Clear & Calm)</option>
                      <option value="Aoede">Aoede (Warm & Expressive)</option>
                      <option value="Charon">Charon (Deep & Analytical)</option>
                      <option value="Fenrir">Fenrir (Energetic)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#171717]/70 mb-1">
                    Gemini API Key {hasServerKey ? "(Optional Override)" : "(Required if not in .env.local)"}
                  </label>
                  <div className="relative">
                    <Key className="w-3.5 h-3.5 text-[#171717]/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => handleSaveApiKey(e.target.value)}
                      placeholder={
                        hasServerKey
                          ? "Using server GEMINI_API_KEY..."
                          : "Paste AI Studio GEMINI_API_KEY..."
                      }
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#171717]/25 bg-[#FAF8F5] text-[11px] font-mono text-[#171717] focus:outline-none focus:border-[#171717]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="px-3.5 py-2.5 bg-rose-50 border-b border-rose-500/30 flex items-start gap-2 text-[11px] text-rose-900">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 leading-snug">{errorMessage}</div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-rose-700 hover:text-rose-950 font-bold"
                >
                  ×
                </button>
              </div>
            )}

            {/* Main Visualizer + Transcript Scroll Area */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar">
              {/* Interactive Voice Orb & Waveform Visualizer */}
              <div className="p-4 rounded-2xl bg-white border-[1.5px] border-[#171717] shadow-[2px_2px_0_0_#171717] flex flex-col items-center text-center">
                <div className="relative flex items-center justify-center w-16 h-16 mb-2">
                  {/* Dynamic volume rings */}
                  {isSessionActive && (
                    <>
                      <div
                        className="absolute inset-0 rounded-full bg-[#DFE968]/60 transition-transform duration-75"
                        style={{
                          transform: `scale(${1 + Math.max(inputVolume, outputVolume) * 0.65})`,
                        }}
                      />
                      <div
                        className="absolute inset-1.5 rounded-full bg-[#F6BB84]/50 transition-transform duration-75"
                        style={{
                          transform: `scale(${1 + Math.max(inputVolume, outputVolume) * 0.35})`,
                        }}
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => (isSessionActive ? stopSession() : startSession())}
                    disabled={status === "connecting"}
                    className={`relative z-10 w-14 h-14 rounded-full border-2 border-[#171717] flex items-center justify-center transition-all cursor-pointer shadow-[2px_2px_0_0_#171717] ${
                      status === "connecting"
                        ? "bg-[#FBF1CF] text-[#171717]"
                        : isSessionActive
                          ? "bg-[#DFE968] text-[#171717] hover:bg-rose-200"
                          : "bg-[#171717] text-[#FAF8F5] hover:bg-[#2A2A2A]"
                    }`}
                    title={isSessionActive ? "End Live Voice Session" : "Start Live Voice Session"}
                  >
                    {status === "connecting" ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isSessionActive ? (
                      <Radio className="w-6 h-6" />
                    ) : (
                      <Mic className="w-6 h-6 text-[#DFE968]" />
                    )}
                  </button>
                </div>

                <span className="text-xs font-black text-[#171717] uppercase tracking-wider">
                  {status === "connecting"
                    ? "Connecting to Gemini 3.8 Live…"
                    : status === "speaking"
                      ? "Gemini is Speaking (Interrupt anytime)"
                      : status === "thinking"
                        ? "Reasoning over Project Context…"
                        : status === "connected"
                          ? isMicMuted
                            ? "Microphone Muted — Click Mic to Resume"
                            : "Listening Live — Speak Naturally"
                          : "Tap Microphone to Start Live Conversation"}
                </span>
                <p className="text-[10px] font-medium text-[#171717]/65 mt-0.5 max-w-xs">
                  Has full context of your verified skills, evidence vault, career gaps, learning roadmaps, and GrowthLens architecture.
                </p>

                {/* Live Audio Controls when connected */}
                {isSessionActive && (
                  <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-[#171717]/10 w-full justify-center">
                    <button
                      type="button"
                      onClick={toggleMic}
                      className={`px-3 py-1.5 rounded-full border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                        isMicMuted
                          ? "bg-rose-100 text-rose-900"
                          : "bg-[#FAF8F5] hover:bg-[#DFE968] text-[#171717]"
                      }`}
                    >
                      {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                      {isMicMuted ? "Unmute Mic" : "Mic On"}
                    </button>

                    <button
                      type="button"
                      onClick={toggleSpeaker}
                      className={`px-3 py-1.5 rounded-full border border-[#171717] text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all ${
                        isSpeakerMuted
                          ? "bg-amber-100 text-amber-900"
                          : "bg-[#FAF8F5] hover:bg-[#DFE968] text-[#171717]"
                      }`}
                    >
                      {isSpeakerMuted ? (
                        <VolumeX className="w-3.5 h-3.5" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" />
                      )}
                      {isSpeakerMuted ? "Speaker Muted" : "Speaker On"}
                    </button>

                    <button
                      type="button"
                      onClick={stopSession}
                      className="px-3 py-1.5 rounded-full border border-[#171717] bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
                    >
                      <PhoneOff className="w-3.5 h-3.5" />
                      End
                    </button>
                  </div>
                )}
              </div>

              {/* Starter Quick Prompts when transcript is empty */}
              {transcripts.length === 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#171717]/60 px-1">
                    Ask by Voice or Click a Prompt
                  </span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {quickPrompts.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => sendTextPrompt(item.prompt)}
                          className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-[#FBF1CF] border border-[#171717]/20 hover:border-[#171717] transition-all flex items-center gap-2.5 group cursor-pointer shadow-[1px_1px_0_0_#171717]"
                        >
                          <div className="w-7 h-7 rounded-lg bg-[#FAF8F5] border border-[#171717]/20 flex items-center justify-center shrink-0 group-hover:bg-[#DFE968]">
                            <Icon className="w-3.5 h-3.5 text-[#171717]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-[#171717] truncate">
                              {item.label}
                            </div>
                            <div className="text-[10px] text-[#171717]/65 truncate">
                              {item.prompt}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Live Transcript & Tool Execution Feed */}
              {transcripts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#171717]/60">
                      Live Session Transcript
                    </span>
                    <button
                      type="button"
                      onClick={() => setTranscripts([])}
                      className="text-[10px] font-bold text-[#171717]/60 hover:text-[#171717] underline cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  {transcripts.map((t) => {
                    if (t.role === "system") {
                      return (
                        <div
                          key={t.id}
                          className="px-3 py-1.5 rounded-xl bg-[#EAE5D9]/60 border border-[#171717]/15 text-[10px] font-medium text-[#171717]/75 text-center"
                        >
                          {t.text}
                        </div>
                      );
                    }
                    if (t.role === "tool") {
                      return (
                        <div
                          key={t.id}
                          className="px-3 py-1.5 rounded-xl bg-[#FBF1CF] border border-[#171717]/25 text-[10px] font-mono font-bold text-[#171717] flex items-center gap-1.5"
                        >
                          <Terminal className="w-3 h-3 text-[#171717] shrink-0" />
                          <span className="truncate">{t.text}</span>
                        </div>
                      );
                    }
                    if (t.role === "guardrail") {
                      return (
                        <div
                          key={t.id}
                          className="p-2.5 rounded-xl bg-amber-50 border-[1.5px] border-[#171717] shadow-[1.5px_1.5px_0_0_#171717] text-[11px] font-medium text-[#171717] flex items-start gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="flex-1 leading-snug">
                            <div className="text-[9px] font-black uppercase tracking-wider text-amber-900 mb-0.5">
                              Project-Scope Guardrail Enforced • {t.timestamp}
                            </div>
                            <div>{t.text}</div>
                          </div>
                        </div>
                      );
                    }
                    const isUser = t.role === "user";
                    return (
                      <div
                        key={t.id}
                        className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[86%] px-3 py-2 rounded-2xl text-xs leading-relaxed border ${
                            isUser
                              ? "bg-[#171717] text-[#FAF8F5] border-[#171717] rounded-br-xs"
                              : "bg-white text-[#171717] border-[#171717] shadow-[1.5px_1.5px_0_0_#171717] rounded-bl-xs"
                          }`}
                        >
                          {t.text}
                        </div>
                        <span className="text-[9px] text-[#171717]/45 mt-0.5 px-1">
                          {isUser ? "You" : "Gemini Live"} • {t.timestamp}
                        </span>
                      </div>
                    );
                  })}
                  <div ref={transcriptEndRef} />
                </div>
              )}
            </div>

            {/* Hybrid Text Input Bar (send text into the live voice session anytime) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendTextPrompt(textInput);
              }}
              className="p-2.5 bg-white border-t border-[#171717]/15 flex items-center gap-2"
            >
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Or type a question / navigation command…"
                className="flex-1 px-3 py-2 rounded-xl border border-[#171717]/25 bg-[#FAF8F5] text-xs text-[#171717] placeholder:text-[#171717]/45 focus:outline-none focus:border-[#171717]"
              />
              <button
                type="submit"
                disabled={!textInput.trim()}
                className="w-9 h-9 rounded-xl bg-[#171717] text-[#FAF8F5] hover:bg-[#2A2A2A] disabled:opacity-40 flex items-center justify-center border border-[#171717] cursor-pointer transition-all shrink-0"
                title="Send message to Gemini Live"
                aria-label="Send message to Gemini Live"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>
    </GeminiVoiceContext.Provider>
  );
}
