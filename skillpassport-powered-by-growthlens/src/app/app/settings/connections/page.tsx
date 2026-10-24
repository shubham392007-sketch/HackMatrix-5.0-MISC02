"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { ConnectedSourceDetails } from "@/types/account";
import { ConfirmationModal, EmptyState } from "@/components/app/AppStates";
import {
  FolderGit2,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Key,
  Clock,
  Database,
  Unplug,
  Plus,
  ArrowRight,
  Info,
  GitBranch,
} from "lucide-react";

export default function ConnectedAccountsPage() {
  const {
    connectedSourceDetails,
    syncSourceSimulated,
    disconnectSourceSafe,
  } = useEvidence();

  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<ConnectedSourceDetails | null>(null);

  const handleSync = async (sourceId: string) => {
    setSyncingId(sourceId);
    try {
      await syncSourceSimulated(sourceId);
    } finally {
      setSyncingId(null);
    }
  };

  const confirmDisconnect = async () => {
    if (!disconnectTarget) return;
    await disconnectSourceSafe(disconnectTarget.id, false);
    setDisconnectTarget(null);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Connected Accounts & Sources"
        description="Manage professional repositories, issue trackers, and work integrations powering your SkillPassport."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Connected Accounts" },
        ]}
      />

      <div className="p-6 lg:p-10 max-w-5xl space-y-8">
        {/* Source Governance & Least-Privilege Notice */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/20 border-2 border-[#DFE968] flex items-start gap-3.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-ink">
              Least-Privilege Ingestion & Provenance Architecture
            </span>
            <p className="text-ink/80 leading-relaxed">
              Connected sources require read-only access to verify work deliverables. All access tokens are cryptographically encrypted and securely stored. Ingested pull requests and commit hashes are normalized into verifiable evidence, while proprietary codebase contents, API secrets, and internal environment configurations are stripped by the ingestion sanitizer.
            </p>
          </div>
        </div>

        {/* Sources List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-ink/70" />
              <span>Configured Professional Sources ({connectedSourceDetails.length})</span>
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/app/evidence/sources"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Source</span>
              </Link>
            </div>
          </div>

          {connectedSourceDetails.length === 0 ? (
            <div className="p-8 sm:p-12 rounded-2xl bg-white border border-ink/15 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-ink/5 border border-ink/10 mx-auto flex items-center justify-center text-ink/50">
                <FolderGit2 className="w-6 h-6" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base font-bold text-ink">
                  No External Sources Connected Yet
                </h3>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Connect your GitHub organization or Jira workspace to import code deliverables, commits, and resolved tickets into your verifiable evidence library.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/app/evidence/sources"
                  className="px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Configure GitHub Source</span>
                </Link>
                <Link
                  href="/app/evidence/upload"
                  className="px-4 py-2 rounded-xl border border-ink/20 bg-white hover:bg-ink/5 text-ink text-xs font-semibold transition-all"
                >
                  <span>Upload Documents Directly</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedSourceDetails.map((source) => {
                const isSyncing = syncingId === source.id;
                const isConnected = source.status === "connected";
                const isNeedsAttention = source.status === "needs_attention";
                const isDisconnected = source.status === "disconnected";

                return (
                  <div
                    key={source.id}
                    className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-4 hover:border-ink/30 transition-all"
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-ink/10">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm ${
                            source.type === "github"
                              ? "bg-slate-900 text-white border-slate-900"
                              : source.type === "jira"
                              ? "bg-blue-600 text-white border-blue-600"
                              : source.type === "gitlab"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-[#DFE968] text-ink border-ink/20"
                          }`}
                        >
                          {source.type === "github"
                            ? "GH"
                            : source.type === "jira"
                            ? "JR"
                            : source.type === "gitlab"
                            ? "GL"
                            : "UP"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-ink">
                              {source.name}
                            </h3>
                            {source.organization && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink/5 border border-ink/10 text-ink/70">
                                {source.organization}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink/60 font-mono mt-0.5">
                            Identity: {source.accountIdentity}
                          </p>
                        </div>
                      </div>

                      {/* Real Status Badge */}
                      <div className="flex items-center gap-2">
                        {isConnected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Connected & Active
                          </span>
                        )}
                        {isNeedsAttention && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            Needs Attention
                          </span>
                        )}
                        {isDisconnected && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-slate-500" />
                            Disconnected
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-ink/5 border border-ink/10 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-ink/50 flex items-center gap-1">
                          <Key className="w-3 h-3" /> Granted Permissions
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {source.authorizedPermissions.map((perm, i) => (
                            <span
                              key={i}
                              className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-ink/10 text-ink/80"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-ink/5 border border-ink/10 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-ink/50 flex items-center gap-1">
                          <Database className="w-3 h-3" /> Ingested Artifacts
                        </div>
                        <div className="text-xs font-bold text-ink pt-0.5">
                          {source.importedRecordsCount} deliverables in library
                        </div>
                        <div className="text-[10px] text-ink/60 truncate">
                          {source.importedDataCategories.join(", ")}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-ink/5 border border-ink/10 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-ink/50 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Last Successful Sync
                        </div>
                        <div className="text-xs text-ink/80 pt-0.5">
                          <span className="font-semibold">{source.lastSuccessfulSync}</span>
                        </div>
                        <div className="text-[10px] text-ink/60">
                          On-demand and scheduled background polling
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href="/app/evidence/library"
                          className="text-xs font-semibold text-ink/70 hover:text-ink underline flex items-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5 text-ink/50" />
                          <span>View Evidence Library</span>
                        </Link>
                        <Link
                          href="/app/evidence/runs"
                          className="text-xs font-semibold text-ink/70 hover:text-ink underline flex items-center gap-1"
                        >
                          <GitBranch className="w-3.5 h-3.5 text-ink/50" />
                          <span>Ingestion Runs</span>
                        </Link>
                      </div>

                      <div className="flex items-center gap-2">
                        {isDisconnected ? (
                          <Link
                            href="/app/evidence/sources"
                            className="px-3.5 py-1.5 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold transition-all shadow-sm"
                          >
                            Reconnect Source
                          </Link>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isSyncing}
                              onClick={() => handleSync(source.id)}
                              className="px-3.5 py-1.5 rounded-xl bg-white border border-ink/20 hover:bg-ink/5 text-ink text-xs font-semibold disabled:opacity-50 transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <RefreshCw
                                className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-ink" : "text-ink/60"}`}
                              />
                              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDisconnectTarget(source)}
                              className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-all flex items-center gap-1"
                            >
                              <Unplug className="w-3 h-3" />
                              <span>Disconnect</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Integration Architecture Details */}
        <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Info className="w-4 h-4 text-ink/70" />
            <span>Connection Integrity & Data Retention Invariants</span>
          </h3>
          <p className="text-xs text-ink/70 leading-relaxed">
            Disconnecting an external source stops future background polling and new deliverable ingestion. Crucially, previously ingested commits, pull requests, and verified skills remain protected in your passport library. Your verified credentials will never be lost if access tokens change or employer contracts end.
          </p>
        </div>
      </div>

      {/* Disconnect Confirmation Modal */}
      {disconnectTarget && (
        <ConfirmationModal
          isOpen={Boolean(disconnectTarget)}
          title={`Disconnect ${disconnectTarget.name}?`}
          message={`Disconnecting will stop automated scheduled synchronization and future work item polling for ${disconnectTarget.accountIdentity}.`}
          consequenceWarning="Previously imported and verified evidence will remain intact in your SkillPassport library. Disconnection does not delete earned credentials."
          confirmLabel="Disconnect Source"
          cancelLabel="Keep Connected"
          isDestructive={true}
          onConfirm={confirmDisconnect}
          onCancel={() => setDisconnectTarget(null)}
        />
      )}
    </div>
  );
}
