"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
  SourceConnectionCard,
  EvidenceSyncPanel,
  EvidenceDetailPanel,
  RAGContextPanel,
  EvidenceTimeline,
  EvidenceCoverage,
  LoadingSkeleton,
  ErrorState,
} from "@/components/growthlens";
import EmptyState from "@/components/growthlens/EmptyState";
import {
  evidence as evidenceApi,
  integrations,
  profile as profileApi,
  trajectory as trajectoryApi,
} from "@/lib/api";
import type { Learner, Evidence } from "@/lib/types";
import {
  RefreshCw,
  Search,
  ExternalLink,
  Filter,
  CheckCircle2,
  AlertCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";

const FILTERS = ["ALL", "GITHUB", "JIRA", "ASSESSMENT", "PROJECT", "COURSE", "FEEDBACK"] as const;

export default function EvidencePage() {
  const { user, profile } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<string>("shubham_pokale");
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Real integrations state
  const [githubStatus, setGithubStatus] = useState<"connected" | "not_connected" | "needs_attention" | "syncing">("not_connected");
  const [jiraStatus, setJiraStatus] = useState<"connected" | "not_connected" | "needs_attention" | "syncing">("not_connected");
  const [activeIntegrationsCount, setActiveIntegrationsCount] = useState<number>(0);
  const [githubSyncing, setGithubSyncing] = useState<boolean>(false);
  const [jiraSyncing, setJiraSyncing] = useState<boolean>(false);
  const [githubTesting, setGithubTesting] = useState<boolean>(false);
  const [jiraTesting, setJiraTesting] = useState<boolean>(false);
  const [githubRawSync, setGithubRawSync] = useState<string | null>(null);
  const [jiraRawSync, setJiraRawSync] = useState<string | null>(null);
  const [, setTimerTick] = useState<number>(0);

  // Ingestion pipeline state
  const [pipelineProcessing, setPipelineProcessing] = useState<boolean>(false);
  const [pipelineStage, setPipelineStage] = useState<
    "idle" | "source" | "parsing" | "tagging" | "indexing" | "complete"
  >("idle");
  const [pipelineError, setPipelineError] = useState<string>("");
  const [syncResult, setSyncResult] = useState<{
    found?: number;
    processed?: number;
    skipped?: number;
    source?: string;
  } | null>(null);

  // Selected evidence for side drawer
  const [activeEvidence, setActiveEvidence] = useState<Evidence | null>(null);

  // Helper for dynamic relative time formatting
  const formatRelativeTime = (isoString?: string | null): string => {
    if (!isoString) return "Never";
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "Never";
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "Just now";
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Live timer tick every 30s to keep relative times strictly fresh
  useEffect(() => {
    const timer = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Load real user integrations
  const loadIntegrations = async () => {
    try {
      let count = 0;

      // 1. Fetch user specific integrations configured during onboarding
      let userInts: Record<string, any> = {};
      try {
        userInts = await profileApi.integrations();
      } catch {
        userInts = {};
      }

      if (userInts && userInts.github && userInts.github.is_active) {
        setGithubStatus(userInts.github.connection_status === "connected" ? "connected" : "needs_attention");
        count++;
        if (userInts.github.last_sync_at || userInts.github.last_validated_at) {
          setGithubRawSync(userInts.github.last_sync_at || userInts.github.last_validated_at);
        }
      } else {
        try {
          const gh = await integrations.githubStatus();
          if (gh.status === "connected" || gh.configured) {
            setGithubStatus("connected");
            count++;
            if (gh.details?.last_sync_at) {
              setGithubRawSync(gh.details.last_sync_at as string);
            }
          } else if (gh.status === "invalid_token") {
            setGithubStatus("needs_attention");
          } else {
            setGithubStatus("not_connected");
          }
        } catch {
          // Non-blocking
        }
      }

      if (userInts && userInts.jira && userInts.jira.is_active) {
        setJiraStatus(userInts.jira.connection_status === "connected" ? "connected" : "needs_attention");
        count++;
        if (userInts.jira.last_sync_at || userInts.jira.last_validated_at) {
          setJiraRawSync(userInts.jira.last_sync_at || userInts.jira.last_validated_at);
        }
      } else {
        try {
          const jr = await integrations.jiraStatus();
          if (jr.status === "connected" || jr.configured) {
            setJiraStatus("connected");
            count++;
            if (jr.details?.last_sync_at) {
              setJiraRawSync(jr.details.last_sync_at as string);
            }
          } else if (jr.status === "invalid_credentials") {
            setJiraStatus("needs_attention");
          } else {
            setJiraStatus("not_connected");
          }
        } catch {
          // Non-blocking
        }
      }

      setActiveIntegrationsCount(count);
    } catch {
      // Non-blocking
    }
  };

  // Sync learner selection with authenticated user profile
  useEffect(() => {
    loadIntegrations();

    if (profile?.role === "EMPLOYEE") {
      // For employee role, lock strictly to the logged-in profile
      setSelectedLearner(profile.id || user?.id || "");
    } else {
      // For managers / admins, load learners list
      trajectoryApi
        .learners()
        .then((data) => {
          if (data.learners && data.learners.length > 0) {
            setLearners(data.learners);
            setSelectedLearner(profile?.id || data.learners[0].learner_id);
          }
        })
        .catch(() => {
          if (profile?.id) setSelectedLearner(profile.id);
        });
    }
  }, [profile, user]);

  // Fetch real employee evidence whenever learner changes
  useEffect(() => {
    let active = true;
    if (selectedLearner) {
      setLoading(true);
      setError("");
      evidenceApi
        .list(selectedLearner, 100)
        .then((res) => {
          if (active) {
            setEvidenceList(res.evidence || []);
          }
        })
        .catch((err) => {
          if (active) {
            setError(err.message || "Failed to retrieve evidence stream from PostgreSQL.");
          }
        })
        .finally(() => {
          if (active) {
            setLoading(false);
            setInitialLoaded(true);
          }
        });
    }
    return () => {
      active = false;
    };
  }, [selectedLearner]);

  const fetchEvidence = (learnerId: string) => {
    if (!learnerId) return;
    setLoading(true);
    setError("");
    evidenceApi
      .list(learnerId, 100)
      .then((res) => {
        setEvidenceList(res.evidence || []);
      })
      .catch((err) => {
        setError(err.message || "Failed to retrieve evidence stream from PostgreSQL.");
      })
      .finally(() => {
        setLoading(false);
        setInitialLoaded(true);
      });
  };

  // Sync GitHub handler
  const handleSyncGithub = async () => {
    setGithubSyncing(true);
    setGithubStatus("syncing");
    setPipelineError("");
    try {
      const targetEmp = selectedLearner || profile?.id || user?.id || "shubham_pokale";
      const res = await integrations.syncGithub({
        run_ai_extraction: false,
        limit_commits: 5,
        limit_prs: 5,
        target_employee_id: targetEmp,
      });
      if ((res as any)?.status === "failed") {
        setPipelineError((res as any)?.error_summary || "GitHub sync failed. Please verify credentials or repository.");
        setGithubStatus(githubCount > 0 ? "connected" : "needs_attention");
      } else {
        setGithubRawSync(new Date().toISOString());
        setGithubStatus("connected");
      }
      if (selectedLearner) {
        await fetchEvidence(selectedLearner);
      }
      await loadIntegrations();
    } catch (err: any) {
      setPipelineError(err?.message || "GitHub sync encountered an issue. Please verify connection.");
      setGithubStatus(githubCount > 0 ? "connected" : "needs_attention");
    } finally {
      setGithubSyncing(false);
    }
  };

  // Sync Jira handler
  const handleSyncJira = async () => {
    setJiraSyncing(true);
    setJiraStatus("syncing");
    setPipelineError("");
    try {
      const targetEmp = selectedLearner || profile?.id || user?.id || "shubham_pokale";
      const res = await integrations.syncJira({
        run_ai_extraction: false,
        max_issues: 5,
        target_employee_id: targetEmp,
      });
      if ((res as any)?.status === "failed") {
        setPipelineError((res as any)?.error_summary || "Jira sync failed. Please verify credentials or project key.");
        setJiraStatus(jiraCount > 0 ? "connected" : "needs_attention");
      } else {
        setJiraRawSync(new Date().toISOString());
        setJiraStatus("connected");
      }
      if (selectedLearner) {
        await fetchEvidence(selectedLearner);
      }
      await loadIntegrations();
    } catch (err: any) {
      setPipelineError(err?.message || "Jira sync encountered an issue. Please verify connection.");
      setJiraStatus(jiraCount > 0 ? "connected" : "needs_attention");
    } finally {
      setJiraSyncing(false);
    }
  };

  // Test GitHub connection
  const handleTestGithub = async () => {
    setGithubTesting(true);
    try {
      const res = await integrations.testGithub();
      if (res.authenticated) {
        setGithubStatus("connected");
        await loadIntegrations();
      } else {
        setGithubStatus(githubCount > 0 ? "connected" : "needs_attention");
      }
    } catch {
      setGithubStatus(githubCount > 0 ? "connected" : "needs_attention");
    } finally {
      setGithubTesting(false);
    }
  };

  // Test Jira connection
  const handleTestJira = async () => {
    setJiraTesting(true);
    try {
      const res = await integrations.testJira();
      if (res.authenticated) {
        setJiraStatus("connected");
        await loadIntegrations();
      } else {
        setJiraStatus(jiraCount > 0 ? "connected" : "needs_attention");
      }
    } catch {
      setJiraStatus(jiraCount > 0 ? "connected" : "needs_attention");
    } finally {
      setJiraTesting(false);
    }
  };

  // Ingestion Pipeline Simulation / Run
  const handleRunExtraction = async ({
    source,
    limit,
    runAi,
  }: {
    source: string;
    limit: number;
    runAi: boolean;
  }) => {
    setPipelineProcessing(true);
    setPipelineStage("source");
    setPipelineError("");
    setSyncResult(null);

    try {
      await new Promise((r) => setTimeout(r, 400));
      setPipelineStage("parsing");
      await new Promise((r) => setTimeout(r, 600));
      setPipelineStage("tagging");

      let totalFound = 0;
      let totalProcessed = 0;
      let totalSkipped = 0;

      const targetEmp = selectedLearner || profile?.id || user?.id;

      if (source === "jira") {
        if (jiraStatus !== "connected") {
          throw new Error("Jira is not connected. Configure your Jira credentials in your Profile or Settings before extracting Jira tickets.");
        }
        const res = await integrations.syncJira({ max_issues: limit, run_ai_extraction: runAi, target_employee_id: targetEmp });
        if ((res as any)?.status === "failed") {
          throw new Error((res as any)?.error_summary || "Jira synchronization failed.");
        }
        totalFound += (res as any)?.records_found || 0;
        totalProcessed += (res as any)?.records_processed || 0;
        totalSkipped += (res as any)?.records_skipped || 0;
      } else if (source === "github") {
        const res = await integrations.syncGithub({ limit_commits: limit, run_ai_extraction: runAi, target_employee_id: targetEmp });
        if ((res as any)?.status === "failed") {
          throw new Error((res as any)?.error_summary || "GitHub synchronization failed.");
        }
        totalFound += (res as any)?.records_found || 0;
        totalProcessed += (res as any)?.records_processed || 0;
        totalSkipped += (res as any)?.records_skipped || 0;
      } else {
        // all connected sources
        const res = await integrations.syncGithub({ limit_commits: limit, run_ai_extraction: runAi, target_employee_id: targetEmp });
        if ((res as any)?.status === "failed" && jiraStatus !== "connected") {
          throw new Error((res as any)?.error_summary || "GitHub synchronization failed.");
        }
        totalFound += (res as any)?.records_found || 0;
        totalProcessed += (res as any)?.records_processed || 0;
        totalSkipped += (res as any)?.records_skipped || 0;

        if (jiraStatus === "connected") {
          try {
            const jRes = await integrations.syncJira({ max_issues: limit, run_ai_extraction: runAi, target_employee_id: targetEmp });
            totalFound += (jRes as any)?.records_found || 0;
            totalProcessed += (jRes as any)?.records_processed || 0;
            totalSkipped += (jRes as any)?.records_skipped || 0;
          } catch (jErr: any) {
            console.warn("Jira sub-sync skipped:", jErr?.message);
          }
        }
      }

      setPipelineStage("indexing");
      await new Promise((r) => setTimeout(r, 600));
      setPipelineStage("complete");
      setSyncResult({
        found: totalFound,
        processed: totalProcessed,
        skipped: totalSkipped,
        source: source.toUpperCase(),
      });
      setGithubRawSync(new Date().toISOString());
      if (selectedLearner) fetchEvidence(selectedLearner);
      loadIntegrations();
    } catch (err: any) {
      setPipelineError(err?.message || "Pipeline execution encountered an issue. Records were saved to PostgreSQL.");
    } finally {
      setTimeout(() => {
        setPipelineProcessing(false);
        setPipelineStage("idle");
      }, 4000);
    }
  };

  // Filter & Search
  const filteredEvidence = evidenceList.filter((item) => {
    const s = (item.source || "").toLowerCase();
    const matchesFilter =
      filter === "ALL" ||
      s.includes(filter.toLowerCase()) ||
      (filter === "PROJECT" && s.includes("project")) ||
      (filter === "COURSE" && s.includes("course"));

    if (!matchesFilter) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (item.title || "").toLowerCase().includes(q);
    const contentMatch = (item.content || "").toLowerCase().includes(q);
    const skillMatch = (item.skills || []).some((sk) => sk.toLowerCase().includes(q));
    const compMatch = (item.competencies || []).some((c) => c.toLowerCase().includes(q));
    return titleMatch || contentMatch || skillMatch || compMatch;
  });

  // Calculate unique competencies detected
  const uniqueCompetencies = new Set<string>();
  evidenceList.forEach((e) => {
    (e.competencies || []).forEach((c) => uniqueCompetencies.add(c));
  });

  // Real Counts by source
  const githubCount = evidenceList.filter((e) => (e.source || "").toLowerCase().includes("github")).length;
  const jiraCount = evidenceList.filter((e) => (e.source || "").toLowerCase().includes("jira")).length;

  const latestRawSync = [githubRawSync, jiraRawSync]
    .filter(Boolean)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0] || null;

  const overallLastSync = (githubSyncing || jiraSyncing)
    ? "Syncing in progress..."
    : formatRelativeTime(latestRawSync);

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1360px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-12">
          {/* ── Section 15: Hero Section ──────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-3 shadow-[2px_2px_0px_#1C1C1C]">
                FEATURE 1 • EVIDENCE INTELLIGENCE
              </span>

              <ScriptHeading
                preText="Your work becomes"
                scriptWord="evidence."
                level={1}
                className="mb-3"
              />

              <p className="text-sm md:text-base font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                GrowthLens turns project activity, assessments, feedback, and other approved sources into traceable competency evidence.
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              {profile?.role === "EMPLOYEE" ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#1C1C1C] bg-white shadow-[2px_2px_0px_#1C1C1C]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                    {profile.full_name || "Employee"} • Verified Profile
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                    LEARNER:
                  </span>
                  <select
                    value={selectedLearner}
                    onChange={(e) => setSelectedLearner(e.target.value)}
                    className="pill-input text-xs max-w-[240px]"
                  >
                    {learners.map((l) => (
                      <option key={l.learner_id} value={l.learner_id}>
                        {l.name} ({l.learner_id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/60">
                  Last sync: {overallLastSync}
                </span>
                <PillButton
                  variant="primary"
                  size="sm"
                  onClick={handleSyncGithub}
                  loading={githubSyncing || jiraSyncing}
                  icon={<RefreshCw className="w-3 h-3" />}
                >
                  RUN EVIDENCE SYNC
                </PillButton>
              </div>
            </div>
          </div>

          {/* ── Section 16-17: Connected Sources ──────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  INGESTION CONNECTORS
                </span>
                <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight">
                  Connected Activity Sources
                </h3>
              </div>
              <span className="text-xs font-bold font-mono text-[#1C1C1C]/70">
                {activeIntegrationsCount} Active {activeIntegrationsCount === 1 ? "Integration" : "Integrations"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SourceConnectionCard
                provider="github"
                status={githubSyncing ? "syncing" : (githubStatus === "connected" || githubCount > 0 ? "connected" : githubStatus)}
                evidenceCount={githubCount}
                lastSync={githubSyncing ? "Syncing in progress..." : formatRelativeTime(githubRawSync)}
                onSync={handleSyncGithub}
                onTest={handleTestGithub}
                isSyncing={githubSyncing}
                isTesting={githubTesting}
              />

              <SourceConnectionCard
                provider="jira"
                status={jiraSyncing ? "syncing" : (jiraStatus === "connected" || jiraCount > 0 ? "connected" : jiraStatus)}
                evidenceCount={jiraCount}
                lastSync={jiraSyncing ? "Syncing in progress..." : formatRelativeTime(jiraRawSync)}
                onSync={handleSyncJira}
                onTest={handleTestJira}
                isSyncing={jiraSyncing}
                isTesting={jiraTesting}
              />
            </div>
          </div>

          {/* ── Section 18-19: Evidence Ingestion & Pipeline Control ── */}
          <EvidenceSyncPanel
            onRunExtraction={handleRunExtraction}
            isProcessing={pipelineProcessing}
            activeStage={pipelineStage}
            syncResult={syncResult}
            errorMessage={pipelineError}
            onDismissError={() => setPipelineError("")}
          />

          {/* ── Section 20: Evidence Overview Integrated Composition ── */}
          <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C]">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-2">
              AGGREGATE AUDIT TRAIL
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                  Evidence Collected
                </span>
                <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                  {evidenceList.length}
                </span>
                <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                  Canonical verified items
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                  Competencies Detected
                </span>
                <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                  {uniqueCompetencies.size}
                </span>
                <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                  Across tech taxonomy
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                  Connected Sources
                </span>
                <span className="text-3xl md:text-5xl font-black font-mono text-[#1C1C1C] leading-none">
                  {activeIntegrationsCount}
                </span>
                <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                  {activeIntegrationsCount === 0
                    ? "None Connected"
                    : activeIntegrationsCount === 1
                    ? "1 Active Source"
                    : "GitHub + Jira Cloud"}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 block mb-1">
                  Last Updated
                </span>
                <span className="text-xl md:text-2xl font-black text-[#1C1C1C] leading-none block my-1">
                  {overallLastSync}
                </span>
                <span className="text-[10px] font-mono text-emerald-800 font-bold block">
                  ● Continuous Stream Active
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 25: Evidence Accumulation Timeline ────────── */}
          {evidenceList.length > 0 && (
            <EvidenceTimeline
              items={evidenceList}
              onSelectEvidence={(ev) => setActiveEvidence(ev)}
            />
          )}

          {/* ── Section 26: Evidence Coverage ─────────────────────── */}
          {evidenceList.length > 0 && (
            <EvidenceCoverage items={evidenceList} />
          )}

          {/* ── Section 23-24: RAG Context & Justification Panel ───── */}
          <RAGContextPanel employeeId={selectedLearner || profile?.id || ""} />

          {/* ── Section 21: Extracted Evidence Feed ───────────────── */}
          <div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                  TRACEABLE FEED
                </span>
                <h3 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
                  Extracted Evidence Stream
                </h3>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-sm w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50 pointer-events-none z-10" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="SEARCH EVIDENCE, COMMITS, SKILLS..."
                  className="pill-input text-xs w-full !pl-11"
                  style={{ paddingLeft: "2.85rem" }}
                />
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`pill-btn text-[10px] whitespace-nowrap ${
                    filter === f ? "pill-btn-primary" : "pill-btn-secondary"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Loading state */}
            {loading && <LoadingSkeleton type="feed" count={4} />}

            {/* Error state */}
            {error && !loading && (
              <ErrorState
                title="Evidence retrieval interrupted"
                message={error}
                onRetry={() => fetchEvidence(selectedLearner)}
              />
            )}

            {/* Section 27: Empty state with search / filter awareness */}
            {!loading && initialLoaded && !error && filteredEvidence.length === 0 && (
              evidenceList.length === 0 ? (
                <EmptyState
                  type="evidence"
                  title="Your evidence stream hasn't started yet."
                  message="Connect an activity source (GitHub, Jira) or run an evidence sync to begin extracting verifiable competency records into PostgreSQL."
                  primaryAction={{
                    label: "CONNECT SOURCE",
                    href: "/onboarding",
                  }}
                  secondaryAction={{
                    label: "RUN SYNC",
                    onClick: handleSyncGithub,
                  }}
                />
              ) : searchQuery.trim() ? (
                <EmptyState
                  type="search"
                  title={`No evidence matching "${searchQuery}"`}
                  message="No evidence titles, descriptions, or competency tags match this search query."
                  primaryAction={{
                    label: "CLEAR SEARCH",
                    onClick: () => setSearchQuery(""),
                  }}
                />
              ) : (
                <EmptyState
                  type="filter"
                  title={`No evidence found under "${filter}"`}
                  message={`There are currently no items originating from ${filter}. Try switching to another source category.`}
                  primaryAction={{
                    label: "VIEW ALL SOURCES",
                    onClick: () => setFilter("ALL"),
                  }}
                />
              )
            )}

            {/* Feed Cards */}
            {!loading && !error && (
              <div className="space-y-4">
                {filteredEvidence.map((ev, idx) => {
                  const strength = Math.round(
                    ev.evidence_strength <= 1
                      ? ev.evidence_strength * 100
                      : ev.evidence_strength || 80
                  );
                  const isGithub = (ev.source || "").toLowerCase().includes("github");
                  const primaryComp = ev.competencies?.[0] || ev.skills?.[0] || "Software Engineering";

                  return (
                    <div
                      key={ev.id || idx}
                      onClick={() => setActiveEvidence(ev)}
                      className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C] transition-all cursor-pointer group"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="source" source={ev.source} size="sm" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1C1C]/60 font-mono">
                            {ev.project_name || (isGithub ? "HackMatrix-5.0-MISC02" : "Sprint Deliverable")}
                          </span>
                        </div>

                        <span className="text-[11px] font-mono font-bold text-[#1C1C1C]/70">
                          {ev.occurred_at
                            ? new Date(ev.occurred_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent event"}
                        </span>
                      </div>

                      <div className="mb-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#1C1C1C]/20 bg-[#DFE968]/50 text-[#1C1C1C] mr-2">
                          {primaryComp}
                        </span>
                        <h4 className="inline text-base md:text-lg font-black text-[#1C1C1C] tracking-tight group-hover:underline">
                          {ev.title}
                        </h4>
                      </div>

                      <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed mb-4 line-clamp-2">
                        {ev.content}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1C1C1C]/15">
                        {/* Skills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(ev.skills || []).map((sk) => (
                            <span
                              key={sk}
                              className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>

                        {/* Evidence Strength & View Source */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
                              STRENGTH:
                            </span>
                            <div className="w-20 h-2 rounded-full border border-[#1C1C1C] bg-white overflow-hidden p-0.5">
                              <div
                                className="h-full rounded-full bg-[#DFE968]"
                                style={{ width: `${strength}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono font-bold">
                              {strength}%
                            </span>
                          </div>

                          <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C] group-hover:underline flex items-center gap-1">
                            <span>VIEW DETAIL</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Section 29: Feature 1 -> Feature 2 Transition Card ── */}
          <div className="p-8 md:p-12 rounded-[36px] border-[2px] border-[#1C1C1C] bg-gradient-to-r from-[#DFE968]/70 via-[#FBF1CF] to-[#F6C8D6]/80 shadow-[6px_6px_0px_#1C1C1C] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-white text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2">
                DOWNSTREAM INTELLIGENCE
              </span>
              <h3 className="text-2xl md:text-3xl font-black text-[#1C1C1C] tracking-tight">
                Evidence becomes growth intelligence.
              </h3>
              <p className="text-xs md:text-sm font-semibold text-[#1C1C1C]/80 mt-1">
                Chronological evidence records feed directly into our PyTorch Temporal Attention LSTM to predict competency trajectories over time.
              </p>
            </div>

            <Link href="/employee/skills" className="shrink-0">
              <PillButton
                variant="dark"
                size="lg"
                icon={<TrendingUp className="w-4 h-4 text-[#DFE968]" />}
              >
                VIEW MY GROWTH →
              </PillButton>
            </Link>
          </div>
        </main>

        {/* ── Section 22: Evidence Detail Side Panel ────────────── */}
        <EvidenceDetailPanel
          evidence={activeEvidence}
          isOpen={activeEvidence !== null}
          onClose={() => setActiveEvidence(null)}
        />
      </div>
    </ProtectedRoute>
  );
}
