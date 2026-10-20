"use client";

import { useState, useEffect, useMemo } from "react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  testGitHubToken,
  connectGitHub,
  listGitHubRepositories,
  updateSelectedRepositories,
  triggerGitHubSync,
  disconnectSource,
  getGitHubLanguagesSummary,
  refreshRepositoryLanguages,
  getRepositoryReadme,
  refreshRepositoryReadme,
  selectSingleGitHubRepository,
  removeSelectedGitHubRepository,
  syncSingleGitHubRepository,
  analyzeGitHubRepository,
  getGitHubDiagnostic,
  LanguageBreakdownItem,
  GitHubLanguagesSummaryResponse,
  RepositoryReadmeResponse,
  GitHubDiagnosticResponse,
} from "@/lib/evidenceApi";
import {
  GitBranch,
  Check,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Key,
  RefreshCw,
  LogOut,
  ExternalLink,
  Lock,
  Code2,
  Search,
  FileText,
  Trash2,
  Plus,
  X,
  BookOpen,
  Info,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Activity,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import RepositoryLanguageBar, { formatBytes } from "@/components/evidence/RepositoryLanguageBar";
import MarkdownViewer from "@/components/evidence/MarkdownViewer";
import Link from "next/link";

interface GitHubRepoItem {
  id?: number | string;
  resource_id?: string | null;
  name: string;
  full_name: string;
  description?: string | null;
  html_url?: string | null;
  stargazers_count?: number;
  language?: string | null;
  is_private?: boolean;
  default_branch?: string;
  selected?: boolean;
  languages_status?: "success" | "empty" | "failed" | "not_synced" | "unselected" | string;
  detected_languages_count?: number;
  total_language_bytes?: number;
  last_language_sync_at?: string | null;
  languages?: LanguageBreakdownItem[];
  readme_status?: "success" | "not_found" | "forbidden" | "rate_limited" | "failed" | "not_synced" | "unselected" | string;
  readme_sha?: string | null;
  readme_path?: string;
  readme_html_url?: string | null;
  has_readme?: boolean;
  readme_sections_count?: number;
  last_readme_sync_at?: string | null;
}

export default function GitHubSourceFlow() {
  const { sources, refreshEvidenceData } = useEvidence();
  const currentSource = sources.find((s) => s.type === "github" && s.status === "connected");

  const [tokenInput, setTokenInput] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [repositories, setRepositories] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Search & Tab Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "selected" | "available">("selected");

  // Multi-Selection to Add
  const [stagedToAdd, setStagedToAdd] = useState<string[]>([]);
  const [confirmAddModalOpen, setConfirmAddModalOpen] = useState(false);

  // Language Analysis State
  const [languagesSummary, setLanguagesSummary] = useState<GitHubLanguagesSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshingRepoLang, setRefreshingRepoLang] = useState<string | null>(null);

  // README Preview & Refresh State
  const [readmeModalRepo, setReadmeModalRepo] = useState<string | null>(null);
  const [readmeData, setReadmeData] = useState<RepositoryReadmeResponse | null>(null);
  const [loadingReadme, setLoadingReadme] = useState(false);
  const [refreshingReadme, setRefreshingReadme] = useState(false);

  // Removal State
  const [repoToRemove, setRepoToRemove] = useState<GitHubRepoItem | null>(null);
  const [removingRepo, setRemovingRepo] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  // Single Repo Sync & Selection State
  const [selectingRepo, setSelectingRepo] = useState<string | null>(null);
  const [syncingSingleRepo, setSyncingSingleRepo] = useState<string | null>(null);
  const [analyzingRepo, setAnalyzingRepo] = useState<string | null>(null);
  const [analysisResultMsg, setAnalysisResultMsg] = useState<{ repo: string; message: string; model?: string } | null>(null);
  const [syncSuccessOutcome, setSyncSuccessOutcome] = useState<{
    repoName: string;
    readmeRetrieved: boolean;
    readmePath?: string;
    readmeChars?: number;
    commitsConsidered: number;
    prsConsidered?: number;
    languagesCount: number;
    topLanguage?: string | null;
    candidateSkills: Array<{
      name: string;
      category?: string;
      proficiency?: string;
      justification?: string;
      confidence?: number;
    }>;
  } | null>(null);

  // Diagnostic State
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [runningDiagnostic, setRunningDiagnostic] = useState(false);
  const [diagnosticData, setDiagnosticData] = useState<GitHubDiagnosticResponse | null>(null);

  const handleSelectSingleRepo = async (repoName: string) => {
    setSelectingRepo(repoName);
    setConnectError(null);
    try {
      await selectSingleGitHubRepository(repoName);
      // Immediately reflect selected status in local state
      setRepositories((prev) =>
        prev.map((r) =>
          r.full_name === repoName
            ? {
                ...r,
                selected: true,
                languages_status: r.languages_status || "not_synced",
                readme_status: r.readme_status || "not_synced",
              }
            : r
        )
      );
      setStatusMessage(`Repository "${repoName}" added to Evidence! You can preview its README or sync it.`);
      refreshEvidenceData().catch((e) => console.warn("Background refresh:", e));
    } catch (err: any) {
      setConnectError(`Failed to add ${repoName}: ${err.message}`);
    } finally {
      setSelectingRepo(null);
    }
  };

  const handleSyncSingleRepo = async (repoName: string) => {
    setSyncingSingleRepo(repoName);
    setStatusMessage(null);
    setConnectError(null);
    try {
      const outcome = await syncSingleGitHubRepository(repoName);
      const isReadmeOk = Boolean(outcome.readme_retrieved ?? outcome.has_readme);
      const commitsCount = outcome.commits_imported ?? outcome.commits_considered ?? 0;
      const skillsCount = outcome.candidate_skills_count ?? outcome.candidate_skills?.length ?? 0;

      setStatusMessage(
        `Synchronized ${repoName}: README ${isReadmeOk ? "indexed" : "not found"}, ${commitsCount} commits consolidated, ${skillsCount} candidate skills extracted.`
      );

      // Open genuine Sync Success Modal with accurate counts
      setSyncSuccessOutcome({
        repoName,
        readmeRetrieved: isReadmeOk,
        readmePath: outcome.readme_path || "README.md",
        readmeChars: outcome.readme_chars || 0,
        commitsConsidered: commitsCount,
        prsConsidered: outcome.prs_imported ?? outcome.prs_considered ?? 0,
        languagesCount: outcome.detected_languages ?? 0,
        topLanguage: outcome.top_language || null,
        candidateSkills: outcome.candidate_skills || [],
      });

      // Immediately reflect active sync status and details in local state
      setRepositories((prev) =>
        prev.map((r) => {
          if (r.full_name === repoName) {
            return {
              ...r,
              selected: true,
              languages_status: outcome.languages_status || "success",
              detected_languages_count: outcome.detected_languages ?? r.detected_languages_count,
              total_language_bytes: outcome.total_bytes ?? r.total_language_bytes,
              readme_status: outcome.readme_status || (outcome.has_readme ? "success" : "not_found"),
              has_readme: Boolean(outcome.has_readme),
              readme_sections_count: outcome.readme_sections_count ?? r.readme_sections_count,
            };
          }
          return r;
        })
      );
      await loadLanguagesSummary();
      await refreshEvidenceData();
    } catch (err: any) {
      setConnectError(`Failed to sync ${repoName}: ${err.message}`);
    } finally {
      setSyncingSingleRepo(null);
    }
  };

  const handleAnalyzeRepo = async (repoName: string) => {
    setAnalyzingRepo(repoName);
    setAnalysisResultMsg(null);
    try {
      const res = await analyzeGitHubRepository(repoName, 3);
      const model = res.analyses?.[0]?.model_name || "qwen3:8b";
      setAnalysisResultMsg({
        repo: repoName,
        message: res.message || `Analysis complete (${res.analyzed_count || 0} items)`,
        model,
      });
      await refreshEvidenceData();
    } catch (err: any) {
      setConnectError(`Analysis failed for ${repoName}: ${err.message}`);
    } finally {
      setAnalyzingRepo(null);
    }
  };

  const handleRunDiagnostic = async () => {
    setRunningDiagnostic(true);
    setDiagnosticOpen(true);
    try {
      const data = await getGitHubDiagnostic();
      setDiagnosticData(data);
    } catch (err: any) {
      setConnectError(`Diagnostic failed: ${err.message}`);
    } finally {
      setRunningDiagnostic(false);
    }
  };

  useEffect(() => {
    if (currentSource) {
      loadRepositories();
      loadLanguagesSummary();
    }
  }, [currentSource?.id]);

  const loadRepositories = async () => {
    setLoadingRepos(true);
    setConnectError(null);
    try {
      // Fetch all accessible repositories authorized by PAT
      const data = await listGitHubRepositories(1, 100, true);
      if (data && Array.isArray(data.repositories)) {
        setRepositories(data.repositories);
        // If no repositories are selected yet, switch tab to "all"
        const hasSelected = data.repositories.some((r: GitHubRepoItem) => r.selected);
        if (!hasSelected && activeTab === "selected") {
          setActiveTab("all");
        }
      }
    } catch (err: any) {
      console.warn("Could not load GitHub repositories:", err);
      setConnectError("Could not retrieve repositories. Check network connectivity or PAT validity.");
    } finally {
      setLoadingRepos(false);
    }
  };

  const loadLanguagesSummary = async () => {
    setLoadingSummary(true);
    try {
      const summary = await getGitHubLanguagesSummary();
      setLanguagesSummary(summary);
    } catch (err: any) {
      console.warn("Could not load GitHub languages summary:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) {
      setConnectError("Please enter your GitHub Personal Access Token.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    setStatusMessage(null);

    try {
      await testGitHubToken(tokenInput.trim());
      await connectGitHub(tokenInput.trim());
      setTokenInput("");
      setStatusMessage("GitHub connected successfully! Discovered repositories loaded below.");
      await refreshEvidenceData();
      await loadRepositories();
      await loadLanguagesSummary();
    } catch (err: any) {
      setConnectError(err.message || "Failed to validate or connect GitHub token.");
    } finally {
      setConnecting(false);
    }
  };

  // Toggle stage for adding
  const toggleStageRepo = (fullName: string) => {
    setStagedToAdd((prev) =>
      prev.includes(fullName) ? prev.filter((r) => r !== fullName) : [...prev, fullName]
    );
  };

  // Confirm and start ingestion for newly selected repositories
  const handleConfirmAddSelected = async () => {
    if (stagedToAdd.length === 0) return;
    setSyncing(true);
    setConfirmAddModalOpen(false);
    setStatusMessage(`Queuing ${stagedToAdd.length} repositories for sequential analysis...`);
    setConnectError(null);

    try {
      // Build full updated payload preserving existing selections plus newly staged
      const updatedList = repositories.map((r) => ({
        full_name: r.full_name,
        name: r.name,
        html_url: r.html_url,
        selected: Boolean(r.selected || stagedToAdd.includes(r.full_name)),
      }));

      await updateSelectedRepositories(updatedList);
      await triggerGitHubSync();

      setStatusMessage(
        `Sequential ingestion completed for ${stagedToAdd.length} added repositories! Real languages and README context indexed.`
      );
      setStagedToAdd([]);
      await refreshEvidenceData();
      await loadRepositories();
      await loadLanguagesSummary();
      setActiveTab("selected");
    } catch (err: any) {
      setConnectError(err.message || "Failed to add repositories and start sync.");
    } finally {
      setSyncing(false);
    }
  };

  // Refresh Languages for a single repository
  const handleRefreshRepoLanguages = async (repoFullName: string) => {
    setRefreshingRepoLang(repoFullName);
    try {
      const updated = await refreshRepositoryLanguages(repoFullName);
      setRepositories((prev) =>
        prev.map((r) => {
          if (r.full_name === repoFullName) {
            return {
              ...r,
              languages_status: updated.sync_status,
              total_language_bytes: updated.total_bytes,
              detected_languages_count: updated.languages.length,
              last_language_sync_at: updated.retrieval_timestamp,
              languages: updated.languages,
            };
          }
          return r;
        })
      );
      await loadLanguagesSummary();
      setStatusMessage(`Fresh language statistics retrieved for ${repoFullName}`);
    } catch (err: any) {
      setConnectError(err.message || `Failed to refresh languages for ${repoFullName}`);
    } finally {
      setRefreshingRepoLang(null);
    }
  };

  // Open README Preview modal
  const handleOpenReadme = async (repoFullName: string) => {
    setReadmeModalRepo(repoFullName);
    setLoadingReadme(true);
    setReadmeData(null);
    try {
      const res = await getRepositoryReadme(repoFullName);
      setReadmeData(res);
    } catch (err: any) {
      console.warn("Could not load README preview:", err);
      setReadmeData({
        repository_id: repoFullName,
        repository_name: repoFullName,
        sync_status: "not_found",
        readme_path: "README.md",
        blob_sha: null,
        html_url: null,
        content_hash: null,
        raw_content: null,
        sections: [],
        retrieval_timestamp: null,
        error_summary: err.message || "README could not be retrieved from GitHub API.",
      });
    } finally {
      setLoadingReadme(false);
    }
  };

  // Refresh README from GitHub API (fast live fetch, no heavy extraction)
  const handleRefreshReadme = async () => {
    if (!readmeModalRepo) return;
    setRefreshingReadme(true);
    try {
      const fresh = await refreshRepositoryReadme(readmeModalRepo);
      setReadmeData(fresh);
      // Also update in repository list
      setRepositories((prev) =>
        prev.map((r) => {
          if (r.full_name === readmeModalRepo) {
            return {
              ...r,
              readme_status: fresh.sync_status,
              readme_sha: fresh.blob_sha,
              readme_path: fresh.readme_path,
              has_readme: Boolean(fresh.sync_status === "success" && fresh.raw_content),
              readme_sections_count: fresh.sections?.length || 0,
              last_readme_sync_at: fresh.retrieval_timestamp,
            };
          }
          return r;
        })
      );
      setStatusMessage(`README retrieved and refreshed from GitHub for ${readmeModalRepo}`);
    } catch (err: any) {
      setConnectError(`Failed to refresh README: ${err.message}`);
    } finally {
      setRefreshingReadme(false);
    }
  };

  // Remove Repository from active evidence sources
  const handleConfirmRemove = async () => {
    if (!repoToRemove) return;
    setRemovingRepo(true);
    setRemoveError(null);
    const targetFullName = repoToRemove.full_name;

    try {
      await removeSelectedGitHubRepository(targetFullName);
      setRepositories((prev) =>
        prev.map((r) => (r.full_name === targetFullName ? { ...r, selected: false } : r))
      );
      setStatusMessage(
        `Repository ${targetFullName} removed from active evidence sources. Previously imported evidence is preserved.`
      );
      setRepoToRemove(null);

      // Run background refreshes without blocking modal close
      refreshEvidenceData().catch((e) => console.warn("Background refresh evidence:", e));
      loadLanguagesSummary().catch((e) => console.warn("Background refresh lang summary:", e));
    } catch (err: any) {
      setRemoveError(err.message || "Failed to remove repository.");
    } finally {
      setRemovingRepo(false);
    }
  };

  // Full Disconnect
  const handleDisconnect = async () => {
    if (!currentSource) return;
    if (
      !confirm(
        "Are you sure you want to disconnect GitHub? Your stored PAT will be securely cleared. All previously imported evidence and candidate competencies will be safely preserved."
      )
    )
      return;

    setDisconnecting(true);
    try {
      await disconnectSource(currentSource.id);
      setRepositories([]);
      setLanguagesSummary(null);
      setStatusMessage("GitHub disconnected successfully. Imported evidence items remain preserved.");
      await refreshEvidenceData();
    } catch (err: any) {
      setConnectError(err.message || "Failed to disconnect GitHub.");
    } finally {
      setDisconnecting(false);
    }
  };

  // Trigger Sync for all currently selected repositories
  const handleSyncAllSelected = async () => {
    setSyncing(true);
    setStatusMessage("Running incremental sync across all selected repositories...");
    setConnectError(null);
    try {
      await triggerGitHubSync();
      setStatusMessage("Incremental synchronization completed. All language and README context updated.");
      await refreshEvidenceData();
      await loadRepositories();
      await loadLanguagesSummary();
    } catch (err: any) {
      setConnectError(err.message || "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  // Filtered repositories based on tab and search
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      // Tab filter
      if (activeTab === "selected" && !repo.selected) return false;
      if (activeTab === "available" && repo.selected) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = repo.full_name.toLowerCase().includes(q) || repo.name.toLowerCase().includes(q);
        const matchesDesc = (repo.description || "").toLowerCase().includes(q);
        const matchesLang = (repo.language || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesLang) return false;
      }

      return true;
    });
  }, [repositories, activeTab, searchQuery]);

  const selectedCount = repositories.filter((r) => r.selected).length;
  const availableCount = repositories.filter((r) => !r.selected).length;
  const selectedRepos = repositories.filter((r) => r.selected);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="GitHub Integration"
        description="Connect real repositories to inspect code language composition, commits, PRs, and README project context."
        backHref="/app/evidence/sources"
        backLabel="Connected Sources"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        {/* Security & Token Banner */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <ShieldCheck className="w-5 h-5 text-[#4A7A4E] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black uppercase tracking-wider block text-[#1C1C1C]">
              SECURE WORK INGESTION • AES-256 ENCRYPTED CREDENTIALS
            </span>
            <p className="font-medium text-[#1C1C1C]/80 leading-relaxed">
              Your Personal Access Token is encrypted at rest using AES-256. GrowthLens retrieves repository language
              breakdowns, official README documentation, commits, and pull requests via the GitHub REST API to ground
              candidate competency signals. Existing evidence is always preserved when repositories are deselected or
              disconnected.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl bg-[#DFE968] border border-[#1C1C1C] text-xs font-black text-[#1C1C1C] flex items-center justify-between shadow-[2px_2px_0_0_#1C1C1C]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4A7A4E]" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-[#1C1C1C]/60 hover:text-[#1C1C1C]">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {connectError && (
          <div className="p-4 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center gap-2 shadow-[2px_2px_0_0_#1C1C1C]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}

        {!currentSource ? (
          /* Connect GitHub Form */
          <div className="gl-card p-6 md:p-8 bg-[#FBF6DF] space-y-6">
            <div className="space-y-1 border-b border-[#1C1C1C]/15 pb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-[#1C1C1C]" />
                <h3 className="text-lg font-black text-[#1C1C1C]">Connect GitHub Account</h3>
              </div>
              <p className="text-xs text-[#1C1C1C]/75">
                Generate a Personal Access Token (classic or fine-grained) with{" "}
                <code className="bg-[#FBF1CF] px-1 py-0.5 rounded border border-[#1C1C1C]/20 font-bold">repo</code> read
                access.
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
                  GitHub Personal Access Token (PAT)
                </label>
                <input
                  type="password"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="pill-input w-full font-mono text-xs"
                  disabled={connecting}
                />
                <p className="text-[11px] text-[#1C1C1C]/60">
                  Need a token? Generate one in{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-[#1C1C1C] inline-flex items-center gap-0.5"
                  >
                    GitHub Settings → Developer Settings → Personal Access Tokens <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={connecting}
                  className="pill-btn pill-btn-primary text-xs py-3 px-6 flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{connecting ? "VALIDATING & CONNECTING ···" : "VALIDATE & CONNECT GITHUB →"}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Connected State: Repositories, Language Breakdown & Multi-Repo Management */
          <div className="space-y-8">
            {/* Account Header */}
            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_0_#1C1C1C]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                  CONNECTED GITHUB ACCOUNT
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <GitBranch className="w-4 h-4 text-[#1C1C1C]" />
                  <h4 className="text-sm font-black text-[#1C1C1C]">{currentSource.accountIdentity}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]">
                    ACTIVE
                  </span>
                </div>
                <span className="text-[11px] text-[#1C1C1C]/65 block mt-1">
                  Last sync: {currentSource.lastSync} • Selected: {selectedCount} active repos • Discovered:{" "}
                  {repositories.length} accessible
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={runningDiagnostic}
                  className="pill-btn bg-white border border-[#1C1C1C] text-[11px] font-black uppercase py-1.5 px-3 flex items-center gap-1.5 hover:bg-[#DFE968] shadow-[1px_1px_0_0_#1C1C1C]"
                  title="Run 20-point comprehensive diagnostic evaluating PAT, ingestion, attribution, and Ollama"
                >
                  <Activity className={`w-3.5 h-3.5 text-[#1C1C1C] ${runningDiagnostic ? "animate-spin" : ""}`} />
                  <span>{runningDiagnostic ? "DIAGNOSING ···" : "RUN DIAGNOSTIC"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadRepositories();
                    loadLanguagesSummary();
                  }}
                  disabled={loadingRepos || loadingSummary}
                  className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
                  title="Discover new repositories authorized by current PAT"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>DISCOVER / REFRESH REPOS</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 text-[#C85A54] flex items-center gap-1.5"
                  title="Disconnect account"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>DISCONNECT</span>
                </button>
              </div>
            </div>

            {/* ── AGGREGATE REPOSITORY LANGUAGE ANALYSIS SECTION ───────────────── */}
            <section className="gl-card p-6 md:p-8 bg-[#FBF6DF] space-y-6">
              <div className="border-b border-[#1C1C1C]/15 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-[#1C1C1C]" />
                    <h3 className="text-lg font-black text-[#1C1C1C]">Repository Language Composition</h3>
                  </div>
                  <p className="text-xs text-[#1C1C1C]/75 mt-0.5">
                    Real byte composition fetched directly from GitHub REST API for your selected repositories.
                  </p>
                </div>

                <div className="text-right text-xs">
                  <span className="font-bold text-[#1C1C1C]/80">
                    {languagesSummary?.repositories_with_languages || 0} of {selectedCount} Repos Analyzed
                  </span>
                  {languagesSummary?.total_bytes ? (
                    <span className="block font-mono text-[11px] text-[#1C1C1C]/60">
                      Total: {formatBytes(languagesSummary.total_bytes)}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Aggregate Language Composition Bar */}
              {languagesSummary && languagesSummary.aggregate_languages.length > 0 ? (
                <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] space-y-3 shadow-[1px_1px_0_0_#1C1C1C]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                      AGGREGATE COMPOSITION • ALL SELECTED REPOSITORIES
                    </span>
                    <span className="text-[10px] font-mono text-[#1C1C1C]/60">
                      Weighted by total code bytes (summed bytes, not averaged %)
                    </span>
                  </div>

                  <RepositoryLanguageBar
                    languages={languagesSummary.aggregate_languages}
                    totalBytes={languagesSummary.total_bytes}
                    showTitle={false}
                  />
                </div>
              ) : selectedCount === 0 ? (
                <div className="p-6 rounded-2xl border border-dashed border-[#1C1C1C]/40 bg-[#FBF1CF]/40 text-center space-y-1">
                  <p className="text-xs font-bold text-[#1C1C1C]/70">No repositories currently selected for evidence.</p>
                  <p className="text-[11px] text-[#1C1C1C]/50">
                    Select repositories from the catalogue below to analyze code languages, README context, and pull requests.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-[#1C1C1C]/30 bg-[#FBF1CF]/50 text-center space-y-2">
                  <p className="text-xs font-bold text-[#1C1C1C]/70">
                    Language statistics have not yet been synchronized for your selected repositories.
                  </p>
                  <button
                    type="button"
                    onClick={handleSyncAllSelected}
                    disabled={syncing}
                    className="pill-btn pill-btn-primary text-xs py-2 px-4"
                  >
                    SYNC NOW TO FETCH LANGUAGES & READMES
                  </button>
                </div>
              )}
            </section>

            {/* ── MULTI-REPOSITORY MANAGEMENT SECTION ──────────────────────── */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-[#1C1C1C]">Repository Catalogue</h3>
                  <p className="text-xs text-[#1C1C1C]/70">
                    Manage active evidence repositories and select additional authorized repositories to add.
                  </p>
                </div>

                {stagedToAdd.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfirmAddModalOpen(true)}
                    className="pill-btn pill-btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 shadow-[2px_2px_0_0_#1C1C1C]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADD SELECTED ({stagedToAdd.length}) →</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs and Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("selected")}
                    className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border border-[#1C1C1C] ${
                      activeTab === "selected"
                        ? "bg-[#DFE968] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : "bg-white text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                    }`}
                  >
                    Selected for Evidence ({selectedCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("available")}
                    className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border border-[#1C1C1C] ${
                      activeTab === "available"
                        ? "bg-[#DFE968] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : "bg-white text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                    }`}
                  >
                    Available to Add ({availableCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-all border border-[#1C1C1C] ${
                      activeTab === "all"
                        ? "bg-[#DFE968] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : "bg-white text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                    }`}
                  >
                    All Accessible ({repositories.length})
                  </button>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 text-[#1C1C1C]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, owner, desc..."
                    className="w-full bg-white border border-[#1C1C1C] rounded-full pl-9 pr-3 py-1.5 text-xs font-bold"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#1C1C1C]/40 hover:text-[#1C1C1C]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Repository Cards List */}
              {loadingRepos ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C]">
                  <LoadingAnimation size="sm" className="mx-auto -my-3" />
                  <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">Discovering authorized repositories...</p>
                </div>
              ) : filteredRepositories.length === 0 ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C] space-y-2">
                  <p className="text-sm font-black text-[#1C1C1C]">No repositories match this filter</p>
                  <p className="text-xs text-[#1C1C1C]/60">
                    {searchQuery
                      ? `No repositories found matching "${searchQuery}".`
                      : activeTab === "selected"
                      ? "No repositories are currently selected for evidence. Switch to Available to Add to select repositories."
                      : "All accessible repositories have already been selected for evidence."}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRepositories.map((repo) => {
                    const isSelected = Boolean(repo.selected);
                    const isStaged = stagedToAdd.includes(repo.full_name);
                    const hasLangs = repo.languages && repo.languages.length > 0;
                    const isRefreshingLang = refreshingRepoLang === repo.full_name;

                    // Real Status Calculation (Never fake ANALYZED)
                    let statusLabel = "AVAILABLE TO ADD";
                    let statusStyle = "bg-[#FBF1CF] border border-[#1C1C1C]/30 text-[#1C1C1C]/70";

                    if (isSelected) {
                      if (repo.languages_status === "failed" || repo.readme_status === "failed") {
                        statusLabel = "SYNC ERROR";
                        statusStyle = "bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]";
                      } else if (
                        repo.languages_status === "success" &&
                        (repo.readme_status === "success" || repo.readme_status === "not_found")
                      ) {
                        statusLabel = "ACTIVE";
                        statusStyle = "bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]";
                      } else if (repo.languages_status === "not_synced" || repo.readme_status === "not_synced") {
                        statusLabel = "PENDING SYNC";
                        statusStyle = "bg-amber-100 border border-amber-400 text-amber-800";
                      } else {
                        statusLabel = "PARTIAL";
                        statusStyle = "bg-yellow-100 border border-yellow-400 text-yellow-800";
                      }
                    } else if (isStaged) {
                      statusLabel = "READY TO ADD";
                      statusStyle = "bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C]";
                    }

                    return (
                      <div
                        key={repo.full_name}
                        className={`p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] transition-all space-y-4 ${
                          isSelected
                            ? "bg-white shadow-[2px_2px_0_0_#1C1C1C]"
                            : isStaged
                            ? "bg-[#DFE968]/30 shadow-[2px_2px_0_0_#1C1C1C]"
                            : "bg-[#FBF6DF]/70 hover:bg-[#FBF6DF]"
                        }`}
                      >
                        {/* Top Card Row: Title, Metadata, Status Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            {!isSelected ? (
                              <button
                                type="button"
                                onClick={() => toggleStageRepo(repo.full_name)}
                                className={`w-5 h-5 rounded-md border-[1.5px] border-[#1C1C1C] flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                  isStaged ? "bg-[#DFE968]" : "bg-white hover:border-[#1C1C1C]"
                                }`}
                                title={isStaged ? "Remove from selection" : "Stage to add for evidence ingestion"}
                              >
                                {isStaged && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-3 h-3 text-[#4A7A4E] stroke-[3]" />
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-sm font-black text-[#1C1C1C]">{repo.full_name}</h4>
                                {repo.html_url && (
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[#1C1C1C]/40 hover:text-[#1C1C1C]"
                                    title="Open on GitHub"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {repo.is_private && (
                                  <span className="text-[9px] font-black uppercase tracking-wider bg-stone-100 px-1.5 py-0.5 rounded border border-[#1C1C1C]/20 text-stone-600">
                                    Private
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-medium text-[#1C1C1C]/70 max-w-xl">
                                {repo.description || "No description provided"}
                              </p>
                            </div>
                          </div>

                          {/* Right Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusStyle}`}>
                              {statusLabel}
                            </span>

                            {isSelected && (
                              <>
                                {/* README Status Badge */}
                                {repo.readme_status === "success" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E] flex items-center gap-1">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    <span>README: INDEXED</span>
                                  </span>
                                )}
                                {repo.readme_status === "not_found" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-stone-100 border border-[#1C1C1C]/20 text-stone-600 flex items-center gap-1">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    <span>NO README</span>
                                  </span>
                                )}
                                {repo.readme_status === "forbidden" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54] flex items-center gap-1">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    <span>README PERMISSION DENIED</span>
                                  </span>
                                )}
                                {(!repo.readme_status || repo.readme_status === "not_synced") && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FBF1CF] border border-[#1C1C1C]/30 text-[#1C1C1C]/60 flex items-center gap-1">
                                    <BookOpen className="w-2.5 h-2.5" />
                                    <span>README: PENDING</span>
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Language Distribution Bar */}
                        {isSelected && hasLangs && (
                          <div className="pt-1">
                            <RepositoryLanguageBar
                              languages={repo.languages!}
                              totalBytes={repo.total_language_bytes}
                              syncStatus={repo.languages_status}
                              repoName={repo.full_name}
                              lastRetrievedAt={repo.last_language_sync_at}
                              showTitle={false}
                            />
                          </div>
                        )}

                        {isSelected && !hasLangs && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/15 text-[11px]">
                            <div className="flex items-center gap-1.5 text-[#1C1C1C]/75">
                              <Code2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
                              <span>Code languages not yet loaded for this repository</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRefreshRepoLanguages(repo.full_name)}
                              disabled={refreshingRepoLang === repo.full_name}
                              className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-bold py-1 px-2.5 hover:bg-[#DFE968]"
                            >
                              {refreshingRepoLang === repo.full_name ? "FETCHING ···" : "FETCH LANGUAGES"}
                            </button>
                          </div>
                        )}

                        {/* Action Toolbar per Repository */}
                        <div className="pt-2 border-t border-[#1C1C1C]/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="text-[11px] text-[#1C1C1C]/60">
                            {isSelected ? (
                              <span>
                                {hasLangs ? `${repo.languages!.length} languages` : "No languages"} •{" "}
                                {repo.readme_status === "success"
                                  ? `${repo.readme_sections_count || 0} README sections indexed`
                                  : repo.readme_status === "not_found"
                                  ? "No README"
                                  : "README unindexed"}
                              </span>
                            ) : (
                              <span>Accessible via PAT • Not selected for evidence</span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {isSelected ? (
                              <>
                                {repo.html_url && (
                                  <a
                                    href={repo.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#FBF1CF]"
                                    title="Open repository in GitHub"
                                  >
                                    <ExternalLink className="w-3 h-3 text-[#1C1C1C]" />
                                    <span>VIEW ON GITHUB</span>
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleOpenReadme(repo.full_name)}
                                  className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#FBF1CF]"
                                  title="Inspect extracted README text and markdown sections"
                                >
                                  <FileText className="w-3 h-3 text-[#1C1C1C]" />
                                  <span>README PREVIEW</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleRefreshRepoLanguages(repo.full_name)}
                                  disabled={refreshingRepoLang === repo.full_name}
                                  className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#FBF1CF]"
                                  title="Fetch latest code language statistics from GitHub"
                                >
                                  <Code2 className={`w-3 h-3 text-[#1C1C1C] ${refreshingRepoLang === repo.full_name ? "animate-spin" : ""}`} />
                                  <span>{refreshingRepoLang === repo.full_name ? "REFRESHING ···" : "LANGUAGES"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSyncSingleRepo(repo.full_name)}
                                  disabled={syncingSingleRepo === repo.full_name}
                                  className="pill-btn bg-[#DFE968]/50 border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#DFE968]"
                                  title="Synchronize languages, README, and consolidated commit history for this repository only"
                                >
                                  <RefreshCw className={`w-3 h-3 ${syncingSingleRepo === repo.full_name ? "animate-spin" : ""}`} />
                                  <span>{syncingSingleRepo === repo.full_name ? "SYNCING ···" : "SYNC REPOSITORY"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleAnalyzeRepo(repo.full_name)}
                                  disabled={analyzingRepo === repo.full_name}
                                  className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#FBF1CF]"
                                  title="Run Ollama AI Work Analysis on this repository's evidence"
                                >
                                  <Sparkles className={`w-3 h-3 text-[#1C1C1C] ${analyzingRepo === repo.full_name ? "animate-pulse" : ""}`} />
                                  <span>{analyzingRepo === repo.full_name ? "ANALYZING ···" : "ANALYZE WITH OLLAMA"}</span>
                                </button>

                                <Link
                                  href={`/app/evidence?source=github`}
                                  className="pill-btn bg-[#DFE968]/30 border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2.5 flex items-center gap-1 hover:bg-[#DFE968]"
                                >
                                  <span>VIEW EVIDENCE</span>
                                  <ChevronRight className="w-3 h-3" />
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => setRepoToRemove(repo)}
                                  className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider py-1 px-2 text-[#C85A54] hover:bg-[#F6C8D6]"
                                  title="Remove from active sources without deleting evidence"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>REMOVE</span>
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectSingleRepo(repo.full_name)}
                                disabled={selectingRepo === repo.full_name}
                                className="pill-btn pill-btn-primary text-[10px] font-black uppercase tracking-wider py-1.5 px-3.5 flex items-center gap-1 shadow-[1px_1px_0_0_#1C1C1C]"
                                title="Add this repository directly to evidence"
                              >
                                <Plus className="w-3 h-3" />
                                <span>{selectingRepo === repo.full_name ? "ADDING ···" : "ADD REPOSITORY"}</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {analysisResultMsg && analysisResultMsg.repo === repo.full_name && (
                          <div className="p-3 bg-[#DFE968]/50 border border-[#1C1C1C] rounded-xl flex items-center justify-between text-xs font-bold text-[#1C1C1C] animate-in fade-in">
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-emerald-800" />
                              <span>{analysisResultMsg.message}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-white border border-[#1C1C1C]/30 text-[#1C1C1C]">
                                {analysisResultMsg.model}
                              </span>
                            </div>
                            <Link
                              href="/app/ai/work-analysis"
                              className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase py-1 px-2.5 flex items-center gap-1 hover:bg-[#DFE968]"
                            >
                              <span>VIEW IN AI WORK ANALYSIS</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          </div>
                        )}

                        {isSelected && !hasLangs && (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/15 text-[11px]">
                            <div className="flex items-center gap-1.5 text-[#1C1C1C]/75">
                              <Code2 className="w-3.5 h-3.5 text-[#1C1C1C]" />
                              <span>Code languages not yet loaded for this repository</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRefreshRepoLanguages(repo.full_name)}
                              disabled={refreshingRepoLang === repo.full_name}
                              className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-bold py-1 px-2.5 hover:bg-[#DFE968]"
                            >
                              {refreshingRepoLang === repo.full_name ? "FETCHING ···" : "FETCH LANGUAGES"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Bottom Multi-Select Action Bar */}
              {stagedToAdd.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] block">
                      {stagedToAdd.length} REPOSITORIES SELECTED FOR ADDITION
                    </span>
                    <span className="text-[11px] font-medium text-[#1C1C1C]/80">
                      Click below to queue and process these repositories sequentially into Domain 1 evidence.
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStagedToAdd([])}
                      className="pill-btn bg-white text-xs py-2 px-3 font-bold"
                    >
                      CANCEL
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAddModalOpen(true)}
                      className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-1.5"
                    >
                      <span>CONFIRM & ADD ({stagedToAdd.length}) →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Done / Return Link */}
              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSyncAllSelected}
                  disabled={syncing || selectedCount === 0}
                  className="pill-btn pill-btn-primary text-xs py-3 px-6 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "SYNCHRONIZING REPOSITORIES ···" : "SYNC ALL SELECTED REPOS →"}</span>
                </button>

                <Link href="/app/evidence" className="pill-btn pill-btn-secondary text-xs py-3 px-6 font-bold">
                  RETURN TO EVIDENCE WORKSPACE
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* ── README PREVIEW MODAL ────────────────────────────────────── */}
        {readmeModalRepo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#FBF6DF] rounded-3xl border-[2px] border-[#1C1C1C] w-full max-w-4xl max-h-[88vh] flex flex-col shadow-[4px_4px_0_0_#1C1C1C] overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-[#1C1C1C]/15 flex items-start justify-between bg-[#FBF1CF]">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#1C1C1C]" />
                    <h3 className="text-sm font-black text-[#1C1C1C]">{readmeModalRepo}</h3>
                    <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#1C1C1C]/20">
                      {readmeData?.readme_path || "README.md"}
                    </span>
                  </div>
                  {readmeData?.blob_sha && (
                    <span className="text-[10px] font-mono text-[#1C1C1C]/60 block">
                      Git Blob SHA: {readmeData.blob_sha.slice(0, 10)}...
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {readmeData?.html_url && (
                    <a
                      href={readmeData.html_url}
                      target="_blank"
                      rel="noreferrer"
                      className="pill-btn bg-white text-[10px] py-1 px-2.5 flex items-center gap-1 font-bold border border-[#1C1C1C]"
                    >
                      <span>VIEW ON GITHUB</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setReadmeModalRepo(null);
                      setReadmeData(null);
                    }}
                    className="w-7 h-7 rounded-full bg-white border border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] hover:bg-[#F6C8D6]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {loadingReadme ? (
                  <div className="p-16 text-center">
                    <LoadingAnimation size="sm" className="mx-auto -my-3" />
                    <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">Fetching README documentation from GitHub...</p>
                  </div>
                ) : readmeData && readmeData.raw_content ? (
                  <MarkdownViewer
                    content={readmeData.raw_content}
                    repoName={readmeModalRepo}
                    fileName={readmeData.readme_path || "README.md"}
                    sections={readmeData.sections || []}
                  />
                ) : !readmeData || readmeData.sync_status === "not_found" ? (
                  <div className="p-8 rounded-2xl bg-stone-100 border border-[#1C1C1C]/20 text-center space-y-3">
                    <BookOpen className="w-10 h-10 text-stone-400 mx-auto" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-stone-700">
                      No README File Found
                    </h4>
                    <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                      GitHub reported that this repository does not have a README file on its default branch. Code language statistics and commits are still analyzed.
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreshReadme}
                      disabled={refreshingReadme}
                      className="pill-btn bg-white border border-[#1C1C1C] text-xs py-1.5 px-4 font-bold inline-flex items-center gap-1.5 hover:bg-[#DFE968]"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingReadme ? "animate-spin" : ""}`} />
                      <span>{refreshingReadme ? "CHECKING GITHUB ···" : "CHECK GITHUB AGAIN"}</span>
                    </button>
                  </div>
                ) : readmeData.sync_status === "forbidden" ? (
                  <div className="p-6 rounded-2xl bg-[#F6C8D6]/40 border border-[#C85A54] text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-[#C85A54] mx-auto" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-[#C85A54]">
                      Permission Denied
                    </h4>
                    <p className="text-[11px] text-[#C85A54]/80 max-w-sm mx-auto">
                      Your GitHub Personal Access Token lacks repository contents read access. Update your token permissions on GitHub to enable README extraction.
                    </p>
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/20 text-center space-y-3">
                    <FileText className="w-10 h-10 text-[#1C1C1C]/40 mx-auto" />
                    <h4 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                      README Snapshot Pending
                    </h4>
                    <p className="text-xs text-[#1C1C1C]/70 max-w-sm mx-auto leading-relaxed">
                      Click below to fetch the README directly from GitHub API and preview it now.
                    </p>
                    <button
                      type="button"
                      onClick={handleRefreshReadme}
                      disabled={refreshingReadme}
                      className="pill-btn pill-btn-primary text-xs py-2 px-5 font-black inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingReadme ? "animate-spin" : ""}`} />
                      <span>{refreshingReadme ? "FETCHING FROM GITHUB ···" : "FETCH README NOW"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-[#1C1C1C]/15 bg-[#FBF1CF] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRefreshReadme}
                  disabled={refreshingReadme || loadingReadme}
                  className="pill-btn bg-white border border-[#1C1C1C] text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 hover:bg-[#DFE968]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshingReadme ? "animate-spin" : ""}`} />
                  <span>{refreshingReadme ? "REFRESHING ···" : "REFRESH README FROM GITHUB"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReadmeModalRepo(null);
                    setReadmeData(null);
                  }}
                  className="pill-btn pill-btn-primary text-xs py-1.5 px-4 font-bold"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SYNC SUCCESS & CANDIDATE SKILLS SUMMARY MODAL ───────────── */}
        {syncSuccessOutcome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#FBF6DF] rounded-3xl border-[2px] border-[#1C1C1C] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[4px_4px_0_0_#1C1C1C] overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-[#1C1C1C]/15 bg-[#DFE968] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white border border-[#1C1C1C] flex items-center justify-center">
                    <Check className="w-4 h-4 text-[#4A7A4E] stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-[#1C1C1C]">
                      Repository Synchronized & Analyzed
                    </h3>
                    <p className="text-xs font-mono text-[#1C1C1C]/80">
                      {syncSuccessOutcome.repoName}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSyncSuccessOutcome(null)}
                  className="w-7 h-7 rounded-full bg-white border border-[#1C1C1C] flex items-center justify-center text-[#1C1C1C] hover:bg-[#F6C8D6]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                      README STATUS
                    </span>
                    <span className="text-xs font-black text-[#1C1C1C] block">
                      {syncSuccessOutcome.readmeRetrieved ? "INDEXED" : "NO README"}
                    </span>
                    <span className="text-[10px] font-mono text-[#1C1C1C]/60 block">
                      {syncSuccessOutcome.readmeRetrieved
                        ? `${syncSuccessOutcome.readmeChars?.toLocaleString()} chars`
                        : "None"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                      COMMITS CONSOLIDATED
                    </span>
                    <span className="text-sm font-black text-[#1C1C1C] block">
                      {syncSuccessOutcome.commitsConsidered}
                    </span>
                    <span className="text-[10px] text-[#1C1C1C]/60 block">
                      Consolidated to 1 evidence
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                      CODE LANGUAGES
                    </span>
                    <span className="text-sm font-black text-[#1C1C1C] block">
                      {syncSuccessOutcome.languagesCount}
                    </span>
                    <span className="text-[10px] text-[#1C1C1C]/60 truncate block" title={syncSuccessOutcome.topLanguage || "None"}>
                      Top: {syncSuccessOutcome.topLanguage || "N/A"}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                      CANDIDATE SKILLS
                    </span>
                    <span className="text-sm font-black text-[#4A7A4E] block">
                      {syncSuccessOutcome.candidateSkills.length}
                    </span>
                    <span className="text-[10px] text-[#1C1C1C]/60 block">
                      Extracted by Qwen3 8B
                    </span>
                  </div>
                </div>

                {/* Candidate Competencies Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                        CANDIDATE COMPETENCIES EXTRACTED ({syncSuccessOutcome.candidateSkills.length})
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-[#1C1C1C]/60">
                      Grounded in README & Git History
                    </span>
                  </div>

                  {syncSuccessOutcome.candidateSkills.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {syncSuccessOutcome.candidateSkills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1.5 shadow-[1px_1px_0_0_#1C1C1C]"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#1C1C1C]">{skill.name}</span>
                            <div className="flex items-center gap-1.5">
                              {skill.category && (
                                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-[#FBF1CF] border border-[#1C1C1C]/20 text-[#1C1C1C]">
                                  {skill.category}
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]">
                                {skill.proficiency || "Intermediate"}
                              </span>
                            </div>
                          </div>
                          {skill.justification && (
                            <p className="text-[11px] text-[#1C1C1C]/75 leading-relaxed italic bg-stone-50 p-2 rounded border border-[#1C1C1C]/10">
                              "{skill.justification}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/20 text-center">
                      <p className="text-xs font-medium text-[#1C1C1C]/70">
                        Evidence record persisted. Candidate skills will populate as Ollama finishes background extraction.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-[#1C1C1C]/15 bg-[#FBF1CF] flex items-center justify-between">
                <Link
                  href={`/app/evidence?source=github`}
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 font-black uppercase flex items-center gap-1.5"
                >
                  <span>VIEW IN EVIDENCE INVENTORY</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={() => setSyncSuccessOutcome(null)}
                  className="pill-btn bg-white border border-[#1C1C1C] text-xs py-2 px-5 font-bold hover:bg-[#DFE968]"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRM ADD REPOSITORIES MODAL ──────────────────────────── */}
        {confirmAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#FBF6DF] rounded-3xl border-[2px] border-[#1C1C1C] w-full max-w-lg p-6 space-y-5 shadow-[4px_4px_0_0_#1C1C1C]">
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#1C1C1C]">Add Selected Repositories</h3>
                <p className="text-xs text-[#1C1C1C]/75">
                  You are about to add <strong>{stagedToAdd.length}</strong> repositories to your active evidence sources:
                </p>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-white border border-[#1C1C1C]/20">
                {stagedToAdd.map((name) => (
                  <div key={name} className="flex items-center justify-between text-xs font-bold py-1 border-b border-stone-100 last:border-none">
                    <span className="text-[#1C1C1C]">{name}</span>
                    <button
                      onClick={() => toggleStageRepo(name)}
                      className="text-[#C85A54] hover:underline text-[10px]"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-[#DFE968]/30 border border-[#1C1C1C] text-[11px] text-[#1C1C1C] flex items-start gap-2">
                <Info className="w-4 h-4 text-[#4A7A4E] shrink-0 mt-0.5" />
                <span>
                  Each selected repository will be queued and processed sequentially. GrowthLens fetches code language
                  statistics, retrieves the README, and proposes candidate competencies grounded directly in extracted excerpts.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAddModalOpen(false)}
                  className="pill-btn bg-white border border-[#1C1C1C] text-xs py-2 px-4 font-bold"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddSelected}
                  disabled={syncing}
                  className="pill-btn pill-btn-primary text-xs py-2 px-6 flex items-center gap-1.5 font-black uppercase tracking-wider"
                >
                  <span>{syncing ? "QUEUING ···" : "CONFIRM & START INGESTION →"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── CONFIRM REMOVE REPOSITORY MODAL ─────────────────────────── */}
        {repoToRemove && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-[#FBF6DF] rounded-3xl border-[2px] border-[#1C1C1C] w-full max-w-md p-6 space-y-4 shadow-[4px_4px_0_0_#1C1C1C]">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#C85A54]" />
                <h3 className="text-base font-black text-[#1C1C1C]">Remove from Active Sources?</h3>
              </div>

              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">
                Are you sure you want to remove <strong>{repoToRemove.full_name}</strong> from active evidence sources?
              </p>

              {removeError && (
                <div className="p-3 rounded-xl bg-[#F6C8D6] border border-[#C85A54] text-[11px] text-[#C85A54] space-y-1">
                  <p className="font-bold">Error removing repository:</p>
                  <p>{removeError}</p>
                </div>
              )}

              <div className="p-3 rounded-xl bg-white border border-[#1C1C1C]/20 text-[11px] text-[#1C1C1C]/70 space-y-1">
                <p className="font-bold text-[#1C1C1C]">What happens next:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Future automatic syncs for this repository will stop.</li>
                  <li>Your GitHub account connection remains active.</li>
                  <li><strong>All previously imported evidence and verified skills are safely preserved.</strong></li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRepoToRemove(null);
                    setRemoveError(null);
                  }}
                  className="pill-btn bg-white border border-[#1C1C1C] text-xs py-2 px-4 font-bold"
                >
                  KEEP REPOSITORY
                </button>
                {removeError ? (
                  <button
                    type="button"
                    onClick={() => {
                      const target = repoToRemove.full_name;
                      setRepositories((prev) =>
                        prev.map((r) => (r.full_name === target ? { ...r, selected: false } : r))
                      );
                      setRepoToRemove(null);
                      setRemoveError(null);
                    }}
                    className="pill-btn bg-stone-700 text-white border border-[#1C1C1C] text-xs py-2 px-4 font-bold"
                  >
                    FORCE DESELECT
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleConfirmRemove}
                    disabled={removingRepo}
                    className="pill-btn bg-[#C85A54] text-white border border-[#1C1C1C] text-xs py-2 px-4 font-black uppercase tracking-wider hover:bg-[#a9443e]"
                  >
                    <span>{removingRepo ? "REMOVING ···" : "CONFIRM REMOVAL"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── 20-POINT GITHUB & AI DIAGNOSTIC MODAL ───────────────────────── */}
        {diagnosticOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#FFFDF5] border-[2px] border-[#1C1C1C] rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-[6px_6px_0_0_#1C1C1C] overflow-hidden">
              <div className="p-5 border-b border-[#1C1C1C]/15 flex items-center justify-between bg-[#FBF1CF]">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#1C1C1C]" />
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-[#1C1C1C]">
                      20-Point GitHub & AI Diagnostic Report
                    </h3>
                    <p className="text-[11px] text-[#1C1C1C]/65">
                      End-to-end verification of GitHub PAT, ingestion, attribution, and Ollama inference.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDiagnosticOpen(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#1C1C1C]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 flex-1">
                {runningDiagnostic ? (
                  <div className="p-12 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 text-[#1C1C1C] animate-spin mx-auto" />
                    <p className="font-black text-sm text-[#1C1C1C]">Executing 20-Point Diagnostic Engine...</p>
                    <p className="text-xs text-[#1C1C1C]/60">
                      Testing PAT validation, repository metadata, commits attribution, and Ollama qwen3:8b inference...
                    </p>
                  </div>
                ) : diagnosticData ? (
                  <div className="space-y-4">
                    {/* Score & Summary Banner */}
                    <div
                      className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-center justify-between ${
                        diagnosticData.overall_status === "pass"
                          ? "bg-[#DFE968]/50"
                          : diagnosticData.overall_status === "warning"
                          ? "bg-amber-100"
                          : "bg-[#F6C8D6]"
                      }`}
                    >
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                          SYSTEM HEALTH VERDICT
                        </span>
                        <span className="font-black text-lg uppercase tracking-tight text-[#1C1C1C]">
                          {diagnosticData.overall_status === "pass"
                            ? "ALL 20 CRITERIA VERIFIED"
                            : diagnosticData.overall_status === "warning"
                            ? "OPERATIONAL WITH WARNINGS"
                            : "CRITICAL FAILURE DETECTED"}
                        </span>
                        <span className="text-xs block text-[#1C1C1C]/70 mt-0.5 font-bold">
                          {diagnosticData.passed} Passed • {diagnosticData.warnings} Warnings • {diagnosticData.failed} Failed
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-3xl font-mono text-[#1C1C1C]">
                          {diagnosticData.diagnostic_score_pct}%
                        </span>
                        <span className="block text-[10px] font-bold text-[#1C1C1C]/60 uppercase">System Score</span>
                      </div>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                      {diagnosticData.checks.map((chk) => (
                        <div
                          key={chk.id}
                          className="p-3 bg-white rounded-xl border border-[#1C1C1C]/20 flex items-start justify-between gap-3 text-xs shadow-[1px_1px_0_0_#1C1C1C]/20"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5">
                              {chk.status === "pass" ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : chk.status === "warning" ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-[#1C1C1C]">
                                  #{chk.id} {chk.name}
                                </span>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-[#FBF1CF] border border-[#1C1C1C]/30 text-[#1C1C1C]/70">
                                  {chk.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#1C1C1C]/75 mt-0.5 leading-snug">{chk.message}</p>
                            </div>
                          </div>
                          <span className="font-mono text-[10px] text-[#1C1C1C]/50 shrink-0 mt-0.5">
                            {chk.duration_ms}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-center text-[#1C1C1C]/60">Click Run Diagnostic to start the evaluation.</p>
                )}
              </div>

              <div className="p-4 border-t border-[#1C1C1C]/15 bg-[#FBF1CF] flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRunDiagnostic}
                  disabled={runningDiagnostic}
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-black uppercase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${runningDiagnostic ? "animate-spin" : ""}`} />
                  <span>RE-RUN DIAGNOSTIC</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiagnosticOpen(false)}
                  className="pill-btn bg-white border border-[#1C1C1C] text-xs py-2 px-4 font-bold"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
