"use client";

import { useState, useEffect } from "react";
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
  LanguageBreakdownItem,
  GitHubLanguagesSummaryResponse,
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
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import RepositoryLanguageBar, { formatBytes } from "@/components/evidence/RepositoryLanguageBar";
import Link from "next/link";

interface GitHubRepoItem {
  id?: number;
  resource_id?: string;
  name: string;
  full_name: string;
  description?: string;
  html_url?: string;
  stargazers_count?: number;
  language?: string;
  selected?: boolean;
  languages_status?: "success" | "empty" | "failed" | "not_synced" | string;
  detected_languages_count?: number;
  total_language_bytes?: number;
  last_language_sync_at?: string | null;
  languages?: LanguageBreakdownItem[];
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

  // Language Analysis State
  const [languagesSummary, setLanguagesSummary] = useState<GitHubLanguagesSummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshingRepo, setRefreshingRepo] = useState<string | null>(null);
  const [expandedRepoLanguages, setExpandedRepoLanguages] = useState<Record<string, boolean>>({});

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
      const data = await listGitHubRepositories();
      if (data && Array.isArray(data.repositories)) {
        setRepositories(data.repositories);
      }
    } catch (err: any) {
      console.warn("Could not load GitHub repositories:", err);
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
      // 1. Validate token with GitHub API
      await testGitHubToken(tokenInput.trim());

      // 2. Connect and store encrypted credentials
      await connectGitHub(tokenInput.trim());

      setTokenInput("");
      setStatusMessage("GitHub connected successfully! Loading your repositories and language stats...");
      await refreshEvidenceData();
      await loadRepositories();
      await loadLanguagesSummary();
    } catch (err: any) {
      setConnectError(err.message || "Failed to validate or connect GitHub token.");
    } finally {
      setConnecting(false);
    }
  };

  const toggleRepo = (fullName: string) => {
    setRepositories((prev) =>
      prev.map((r) => (r.full_name === fullName ? { ...r, selected: !r.selected } : r))
    );
  };

  const handleSaveAndSync = async () => {
    setSyncing(true);
    setStatusMessage(null);
    setConnectError(null);

    try {
      const payload = repositories.map((r) => ({
        full_name: r.full_name,
        name: r.name,
        html_url: r.html_url,
        selected: Boolean(r.selected),
      }));

      await updateSelectedRepositories(payload);
      const syncResult = await triggerGitHubSync();

      const selectedCount = repositories.filter((r) => r.selected).length;
      setStatusMessage(
        `Sync completed for ${selectedCount} repositories! Language analysis and candidate skills extracted.`
      );
      await refreshEvidenceData();
      await loadRepositories();
      await loadLanguagesSummary();
    } catch (err: any) {
      setConnectError(err.message || "Failed to update repositories or start sync.");
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshRepoLanguages = async (repoFullName: string) => {
    setRefreshingRepo(repoFullName);
    try {
      const updated = await refreshRepositoryLanguages(repoFullName);
      // Update repository in local list
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
      setStatusMessage(`Languages refreshed for ${repoFullName}`);
    } catch (err: any) {
      setConnectError(err.message || `Failed to refresh languages for ${repoFullName}`);
    } finally {
      setRefreshingRepo(null);
    }
  };

  const toggleRepoExpanded = (fullName: string) => {
    setExpandedRepoLanguages((prev) => ({
      ...prev,
      [fullName]: !prev[fullName],
    }));
  };

  const handleDisconnect = async () => {
    if (!currentSource) return;
    if (!confirm("Are you sure you want to disconnect GitHub? Existing imported evidence items will be preserved.")) return;

    setDisconnecting(true);
    try {
      await disconnectSource(currentSource.id);
      setRepositories([]);
      setLanguagesSummary(null);
      setStatusMessage("GitHub disconnected successfully.");
      await refreshEvidenceData();
    } catch (err: any) {
      setConnectError(err.message || "Failed to disconnect GitHub.");
    } finally {
      setDisconnecting(false);
    }
  };

  const selectedCount = repositories.filter((r) => r.selected).length;
  const selectedRepos = repositories.filter((r) => r.selected);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="GitHub Integration"
        description="Connect real repositories to inspect code language composition, commits, and pull requests."
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
              Your Personal Access Token is encrypted at rest using AES-256. GrowthLens retrieves repository language statistics via the GitHub REST API and analyzes contributions to ground candidate competency signals.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl bg-[#DFE968] border border-[#1C1C1C] text-xs font-black text-[#1C1C1C] flex items-center justify-between">
            <span>{statusMessage}</span>
          </div>
        )}

        {connectError && (
          <div className="p-4 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center gap-2">
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
                Generate a Personal Access Token (classic or fine-grained) with <code className="bg-[#FBF1CF] px-1 py-0.5 rounded border border-[#1C1C1C]/20 font-bold">repo</code> read access.
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
          /* Connected State: Repositories & Language Breakdown */
          <div className="space-y-8">
            {/* Account Header */}
            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_0_#1C1C1C]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                  CONNECTED ACCOUNT
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <GitBranch className="w-4 h-4 text-[#1C1C1C]" />
                  <h4 className="text-sm font-black text-[#1C1C1C]">{currentSource.accountIdentity}</h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]">
                    ACTIVE
                  </span>
                </div>
                <span className="text-[11px] text-[#1C1C1C]/65 block mt-1">
                  Last sync: {currentSource.lastSync} • Selected: {selectedCount} repos
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadRepositories();
                    loadLanguagesSummary();
                  }}
                  disabled={loadingRepos || loadingSummary}
                  className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
                  title="Reload repositories and language statistics"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
                  <span>REFRESH REPOS</span>
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

            {/* ── 7.B REPOSITORY LANGUAGE ANALYSIS SECTION ───────────────── */}
            <section className="gl-card p-6 md:p-8 bg-[#FBF6DF] space-y-6">
              <div className="border-b border-[#1C1C1C]/15 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-[#1C1C1C]" />
                    <h3 className="text-lg font-black text-[#1C1C1C]">Repository Language Analysis</h3>
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
                <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] space-y-3">
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
                  <p className="text-xs font-bold text-[#1C1C1C]/70">No repositories currently selected.</p>
                  <p className="text-[11px] text-[#1C1C1C]/50">
                    Select repositories below to view language distributions and trigger ingestion.
                  </p>
                </div>
              ) : (
                <div className="p-6 rounded-2xl border border-[#1C1C1C]/30 bg-[#FBF1CF]/50 text-center space-y-2">
                  <p className="text-xs font-bold text-[#1C1C1C]/70">
                    Language statistics have not yet been synchronized for your selected repositories.
                  </p>
                  <button
                    type="button"
                    onClick={handleSaveAndSync}
                    disabled={syncing}
                    className="pill-btn pill-btn-primary text-xs py-2 px-4"
                  >
                    SYNC NOW TO FETCH LANGUAGES
                  </button>
                </div>
              )}

              {/* Per-Repository Language Details */}
              {selectedRepos.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                    PER-REPOSITORY LANGUAGE BREAKDOWN ({selectedRepos.length})
                  </span>

                  <div className="space-y-3">
                    {selectedRepos.map((repo) => {
                      const isExpanded = Boolean(expandedRepoLanguages[repo.full_name]);
                      const hasLangs = repo.languages && repo.languages.length > 0;
                      const isRefreshingThis = refreshingRepo === repo.full_name;

                      return (
                        <div
                          key={repo.full_name}
                          className="p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-black text-[#1C1C1C]">{repo.full_name}</h4>
                                {repo.languages_status === "success" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]">
                                    ANALYZED
                                  </span>
                                )}
                                {repo.languages_status === "empty" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-stone-100 border border-[#1C1C1C]/30 text-stone-600">
                                    NO LANGUAGES
                                  </span>
                                )}
                                {repo.languages_status === "failed" && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
                                    SYNC ERROR
                                  </span>
                                )}
                                {(!repo.languages_status || repo.languages_status === "not_synced") && (
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#FBF1CF] border border-[#1C1C1C]/40 text-[#1C1C1C]/70">
                                    PENDING SYNC
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#1C1C1C]/60 block mt-0.5">
                                {hasLangs
                                  ? `${repo.languages!.length} detected languages • ${formatBytes(repo.total_language_bytes || 0)} total code`
                                  : "No language statistics cached yet"}
                                {repo.last_language_sync_at && (
                                  <> • Last retrieved: {new Date(repo.last_language_sync_at).toLocaleDateString()}</>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleRefreshRepoLanguages(repo.full_name)}
                                disabled={isRefreshingThis}
                                className="pill-btn pill-btn-secondary text-[10px] py-1 px-2.5 flex items-center gap-1"
                                title="Fetch fresh language statistics directly from GitHub"
                              >
                                <RefreshCw className={`w-3 h-3 ${isRefreshingThis ? "animate-spin" : ""}`} />
                                <span>{isRefreshingThis ? "FETCHING ···" : "REFRESH"}</span>
                              </button>
                            </div>
                          </div>

                          {/* Language Bar for this repo */}
                          {hasLangs && (
                            <RepositoryLanguageBar
                              languages={repo.languages!}
                              totalBytes={repo.total_language_bytes}
                              syncStatus={repo.languages_status}
                              repoName={repo.full_name}
                              lastRetrievedAt={repo.last_language_sync_at}
                              showTitle={false}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* ── 7.A REPOSITORY SELECTION SECTION ──────────────────────── */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#1C1C1C]">Select Repositories for Ingestion</h3>
                  <p className="text-xs text-[#1C1C1C]/70">
                    Check the repositories you want analyzed for code languages and candidate competencies.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#1C1C1C]/60 shrink-0">
                  {selectedCount} of {repositories.length} Selected
                </span>
              </div>

              {loadingRepos ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C]">
                  <LoadingAnimation size="sm" className="mx-auto -my-3" />
                  <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">Loading repositories from GitHub API...</p>
                </div>
              ) : repositories.length === 0 ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C] space-y-2">
                  <p className="text-sm font-black text-[#1C1C1C]">No repositories found</p>
                  <p className="text-xs text-[#1C1C1C]/60">
                    Ensure your GitHub PAT has access to repositories under your account.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {repositories.map((repo) => {
                    const isChecked = Boolean(repo.selected);
                    return (
                      <div
                        key={repo.full_name}
                        onClick={() => toggleRepo(repo.full_name)}
                        className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                          isChecked
                            ? "bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C]"
                            : "bg-[#FBF1CF]/50 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg border border-[#1C1C1C] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 ${
                              isChecked ? "bg-[#DFE968]" : "bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4 text-[#1C1C1C]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-[#1C1C1C]">{repo.full_name}</h4>
                              {repo.html_url && (
                                <a
                                  href={repo.html_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[#1C1C1C]/40 hover:text-[#1C1C1C]"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <p className="text-xs font-medium text-[#1C1C1C]/70 line-clamp-1">
                              {repo.description || "No description provided"}
                            </p>
                          </div>
                        </div>

                        {/* Status & Language pill */}
                        <div className="flex items-center gap-2 sm:self-center self-end">
                          {repo.languages_status === "success" && (
                            <span className="text-[10px] font-mono font-bold bg-[#DFE968] px-2 py-0.5 rounded-full border border-[#1C1C1C] text-[#4A7A4E]">
                              {repo.detected_languages_count || 0} langs
                            </span>
                          )}
                          {repo.language && (
                            <div className="text-xs font-mono font-bold text-[#1C1C1C]/60 bg-[#FBF1CF] px-2 py-0.5 rounded border border-[#1C1C1C]/20">
                              {repo.language}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-4 flex flex-wrap gap-4">
                <button
                  type="button"
                  onClick={handleSaveAndSync}
                  disabled={syncing || selectedCount === 0}
                  className="pill-btn pill-btn-primary text-xs py-3 px-6 flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "TRIGGERING INGESTION RUN ···" : "SAVE SELECTION & TRIGGER SYNC →"}</span>
                </button>
                <Link
                  href="/app/evidence"
                  className="pill-btn pill-btn-secondary text-xs py-3 px-6"
                >
                  DONE / RETURN TO EVIDENCE
                </Link>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
