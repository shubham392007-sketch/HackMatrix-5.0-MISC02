"use client";

import { useState, useEffect } from "react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  testJiraCredentials,
  connectJira,
  listJiraProjects,
  updateSelectedJiraProjects,
  triggerJiraSync,
  disconnectSource,
} from "@/lib/evidenceApi";
import {
  Layers,
  Check,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  Key,
  RefreshCw,
  LogOut,
  ExternalLink,
  Lock,
  Globe,
  Mail,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";
import Link from "next/link";

interface JiraProjectItem {
  id?: string;
  key: string;
  name: string;
  projectTypeKey?: string;
  url?: string;
  selected?: boolean;
}

export default function JiraSourceFlow() {
  const { sources, refreshEvidenceData, addNotification } = useEvidence();
  const currentSource = sources.find((s) => s.type === "jira" && s.status === "connected");
  const [optimisticConnected, setOptimisticConnected] = useState<boolean>(false);

  const [siteUrl, setSiteUrl] = useState("");
  const [email, setEmail] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const [projects, setProjects] = useState<JiraProjectItem[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const isJiraConnected = Boolean(currentSource || optimisticConnected || projects.length > 0);

  useEffect(() => {
    if (currentSource?.id || optimisticConnected) {
      loadProjects(false);
    }
  }, [currentSource?.id, optimisticConnected]);

  const loadProjects = async (showNotification = false) => {
    setLoadingProjects(true);
    setConnectError(null);
    try {
      const data = await listJiraProjects();
      if (data && Array.isArray(data.projects)) {
        setProjects(data.projects);
        if (data.projects.length > 0) {
          setOptimisticConnected(true);
        }
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.toLowerCase().includes("no active jira connection")) {
        // Jira not connected yet, normal initial state
        return;
      }
      console.warn("Could not load Jira projects:", err);
      const isAuthError = err?.status === 401 || err?.message?.toLowerCase().includes("unauthorized") || err?.message?.toLowerCase().includes("forbidden");
      if (isAuthError && showNotification) {
        addNotification({
          title: "Source connection needs attention",
          description: "Jira authorization has expired or is invalid. Please reconnect your account.",
          category: "evidence",
          severity: "error",
          relatedDomain: "Evidence Workspace",
          actionRoute: "/app/evidence/sources/jira",
          actionLabel: "Reconnect Jira",
          dedupKey: "jira_auth_needs_attention",
        });
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteUrl.trim() || !email.trim() || !apiToken.trim()) {
      setConnectError("Please fill in your Atlassian Site URL, Email, and API Token.");
      return;
    }
    setConnecting(true);
    setConnectError(null);
    setStatusMessage(null);

    try {
      // 1. Validate credentials with Jira Cloud API
      await testJiraCredentials(siteUrl.trim(), email.trim(), apiToken.trim());

      // 2. Connect and store encrypted credentials
      await connectJira(siteUrl.trim(), email.trim(), apiToken.trim());

      setOptimisticConnected(true);
      setApiToken("");
      setStatusMessage("Jira connected successfully! Loading accessible projects...");
      addNotification({
        title: "Evidence added successfully",
        description: "Jira Cloud connected successfully. Projects loaded and ready for sync.",
        category: "evidence",
        severity: "success",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/sources/jira",
        actionLabel: "View Projects",
        dedupKey: `jira_connect_${Date.now()}`,
      });
      await loadProjects(true);
      await refreshEvidenceData(true);
    } catch (err: any) {
      const errMsg = err.message || "Failed to validate or connect Jira Cloud credentials.";
      setConnectError(errMsg);
      addNotification({
        title: "Source connection needs attention",
        description: `Jira connection failed: ${errMsg}.`,
        category: "evidence",
        severity: "error",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/sources/jira",
        actionLabel: "Retry Jira Connection",
        dedupKey: `jira_auth_fail_${Date.now()}`,
      });
    } finally {
      setConnecting(false);
    }
  };

  const toggleProject = (key: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.key === key ? { ...p, selected: !p.selected } : p))
    );
  };

  const [syncingProjectKey, setSyncingProjectKey] = useState<string | null>(null);

  const handleSyncSingleProject = async (e: React.MouseEvent, projectKey: string) => {
    e.stopPropagation();
    setSyncingProjectKey(projectKey);
    setStatusMessage(null);
    setConnectError(null);

    try {
      await triggerJiraSync(projectKey);
      setStatusMessage(`Sync triggered for Jira project ${projectKey}! Ingestion job queued.`);
      addNotification({
        title: "Project sync triggered",
        description: `Synchronization triggered specifically for Jira project ${projectKey}. Pipeline ingestion enqueued.`,
        category: "evidence",
        severity: "success",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/runs",
        actionLabel: "View Ingestion Runs",
        dedupKey: `jira_sync_${projectKey}_${Date.now()}`,
      });
      await refreshEvidenceData(true);
    } catch (err: any) {
      const errMsg = err.message || `Failed to sync project ${projectKey}.`;
      setConnectError(errMsg);
      addNotification({
        title: "Synchronization failed",
        description: `Jira synchronization for ${projectKey} failed: ${errMsg}`,
        category: "evidence",
        severity: "error",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/sources/jira",
        actionLabel: "Retry Sync",
        dedupKey: `jira_sync_fail_${projectKey}_${Date.now()}`,
      });
    } finally {
      setSyncingProjectKey(null);
    }
  };

  const handleSaveAndSync = async () => {
    setSyncing(true);
    setStatusMessage(null);
    setConnectError(null);

    try {
      const payload = projects.map((p) => ({
        key: p.key,
        name: p.name,
        url: p.url,
        selected: Boolean(p.selected),
      }));

      await updateSelectedJiraProjects(payload);
      await triggerJiraSync();

      const count = projects.filter((p) => p.selected).length;
      setStatusMessage(`Sync triggered for ${count} selected Jira projects! Ingestion jobs queued.`);
      addNotification({
        title: "Repository sync completed",
        description: `Synchronization triggered for ${count} Jira project${count === 1 ? "" : "s"}. Pipeline ingestion enqueued.`,
        category: "evidence",
        severity: "success",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/runs",
        actionLabel: "View Ingestion Runs",
        dedupKey: `jira_sync_${Date.now()}`,
      });
      await refreshEvidenceData(true);
    } catch (err: any) {
      const errMsg = err.message || "Failed to update Jira projects or start sync.";
      setConnectError(errMsg);
      addNotification({
        title: "Synchronization failed",
        description: `Jira synchronization failed: ${errMsg}`,
        category: "evidence",
        severity: "error",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/sources/jira",
        actionLabel: "Retry Sync",
        dedupKey: `jira_sync_fail_${Date.now()}`,
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    const targetSource = currentSource || sources.find((s) => s.type === "jira");
    if (!targetSource?.id) {
      setOptimisticConnected(false);
      setProjects([]);
      setStatusMessage("Jira disconnected.");
      await refreshEvidenceData(true);
      return;
    }
    if (!confirm("Are you sure you want to disconnect Jira? Existing imported evidence items will be preserved.")) return;

    setDisconnecting(true);
    try {
      await disconnectSource(targetSource.id);
      setOptimisticConnected(false);
      setProjects([]);
      setStatusMessage("Jira disconnected successfully.");
      await refreshEvidenceData(true);
    } catch (err: any) {
      setConnectError(err.message || "Failed to disconnect Jira.");
    } finally {
      setDisconnecting(false);
    }
  };

  const selectedCount = projects.filter((p) => p.selected).length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Jira Software Integration"
        description="Connect Jira Cloud to import work items, user stories, and resolution worklogs."
        backHref="/app/evidence/sources"
        backLabel="Connected Sources"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
        {/* Security & Credentials Banner */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <ShieldCheck className="w-5 h-5 text-[#4A7A4E] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black uppercase tracking-wider block text-[#1C1C1C]">
              JIRA CLOUD CONNECTOR • AES-256 ENCRYPTED CREDENTIALS
            </span>
            <p className="font-medium text-[#1C1C1C]/80 leading-relaxed">
              Your Jira API token is encrypted at rest using AES-256. GrowthLens only imports issues where you are author, assignee, or reviewer to ground competency records.
            </p>
          </div>
        </div>

        {statusMessage && (
          <div className="p-4 rounded-xl bg-[#000000] border border-[#1A1918] text-xs font-black text-[#FAF8F5] flex items-center justify-between">
            <span>{statusMessage}</span>
          </div>
        )}

        {connectError && (
          <div className="p-4 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{connectError}</span>
          </div>
        )}

        {!isJiraConnected ? (
          /* Connect Jira Form */
          <div className="gl-card p-6 md:p-8 bg-[#FBF6DF] space-y-6">
            <div className="space-y-1 border-b border-[#1C1C1C]/15 pb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#1C1C1C]" />
                <h3 className="text-lg font-black text-[#1C1C1C]">Connect Jira Cloud</h3>
              </div>
              <p className="text-xs text-[#1C1C1C]/75">
                Provide your Atlassian site domain, account email, and an API token.
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
                  Atlassian Site URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-company.atlassian.net"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  className="pill-input w-full text-xs"
                  disabled={connecting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
                  Account Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pill-input w-full text-xs"
                  disabled={connecting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#1C1C1C]/60" />
                  Atlassian API Token
                </label>
                <input
                  type="password"
                  placeholder="ATATT3xFfGF0..."
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  className="pill-input w-full font-mono text-xs"
                  disabled={connecting}
                />
                <p className="text-[11px] text-[#1C1C1C]/60">
                  Generate an API token in{" "}
                  <a
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-[#1C1C1C] inline-flex items-center gap-0.5"
                  >
                    Atlassian Account Security → API tokens <ExternalLink className="w-3 h-3" />
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
                  <span>{connecting ? "VALIDATING & CONNECTING ···" : "VALIDATE & CONNECT JIRA →"}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Connected State: Project Selection */
          <div className="space-y-6">
            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[2px_2px_0_0_#1C1C1C]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                  CONNECTED JIRA INSTANCE
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <Layers className="w-4 h-4 text-[#1C1C1C]" />
                  <h4 className="text-sm font-black text-[#1C1C1C]">
                    {currentSource?.accountIdentity || email || siteUrl || "Connected Jira Cloud"}
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#4A7A4E]">
                    ACTIVE
                  </span>
                </div>
                <span className="text-[11px] text-[#1C1C1C]/65 block mt-1">
                  Last sync: {currentSource?.lastSync || "Just now"} • Imported items: {currentSource?.importedRecordsCount ?? "0"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadProjects(true)}
                  disabled={loadingProjects}
                  className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5"
                  title="Reload Jira projects"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingProjects ? "animate-spin" : ""}`} />
                  <span>REFRESH PROJECTS</span>
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

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#1C1C1C]">Select Jira Projects for Ingestion</h3>
                  <p className="text-xs text-[#1C1C1C]/70">
                    Check the projects you want analyzed for evidence and competency mapping.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#1C1C1C]/60 shrink-0">
                  {selectedCount} of {projects.length} Selected
                </span>
              </div>

              {loadingProjects ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C]">
                  <LoadingAnimation size="sm" className="mx-auto -my-3" />
                  <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">Loading projects from Jira Cloud API...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="p-8 text-center bg-[#FBF6DF] rounded-2xl border border-[#1C1C1C] space-y-2">
                  <p className="text-sm font-black text-[#1C1C1C]">No Jira projects found</p>
                  <p className="text-xs text-[#1C1C1C]/60">
                    Ensure your account has read permissions for projects on this Jira site.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {projects.map((proj) => {
                    const isChecked = Boolean(proj.selected);
                    return (
                      <div
                        key={proj.key}
                        onClick={() => toggleProject(proj.key)}
                        className={`p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? "bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C]"
                            : "bg-[#FBF1CF]/50 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-6 h-6 rounded-lg border border-[#1C1C1C] flex items-center justify-center shrink-0 ${
                              isChecked ? "bg-[#DFE968]" : "bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-4 h-4 text-[#1C1C1C]" />}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase bg-[#FBF1CF] px-1.5 py-0.5 rounded border border-[#1C1C1C]/20">
                                {proj.key}
                              </span>
                              <h4 className="text-sm font-black text-[#1C1C1C]">{proj.name}</h4>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {proj.url && (
                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold text-[#1C1C1C]/60 hover:text-[#1C1C1C] flex items-center gap-0.5 p-1"
                              title="Open in Jira"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleSyncSingleProject(e, proj.key)}
                            disabled={syncing || syncingProjectKey === proj.key}
                            className="pill-btn pill-btn-secondary text-[10px] py-1 px-2.5 flex items-center gap-1 font-bold"
                            title={`Sync ${proj.key} only`}
                          >
                            <RefreshCw className={`w-3 h-3 ${syncingProjectKey === proj.key ? "animate-spin" : ""}`} />
                            <span>{syncingProjectKey === proj.key ? "SYNCING..." : "SYNC PROJECT"}</span>
                          </button>
                          {proj.projectTypeKey && (
                            <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/50 uppercase hidden sm:inline">
                              {proj.projectTypeKey}
                            </span>
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
