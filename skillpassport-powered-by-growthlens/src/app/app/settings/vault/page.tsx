"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import ArtifactViewerModal from "@/components/vault/ArtifactViewerModal";
import {
  Archive,
  FileText,
  Globe,
  GitBranch,
  Layers,
  Search,
  Filter,
  Download,
  ExternalLink,
  Eye,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  UploadCloud,
  FolderGit2,
  ShieldCheck,
  Cpu,
  FileCode,
  HardDrive,
  FileSpreadsheet,
  Award,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  VaultSummary,
  VaultArtifact,
  VaultArtifactType,
  getVaultSummary,
  listVaultArtifacts,
  triggerVaultDownload,
} from "@/lib/vaultApi";

export default function EvidenceVaultPage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [artifacts, setArtifacts] = useState<VaultArtifact[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [hasOriginalFilter, setHasOriginalFilter] = useState<boolean | undefined>(undefined);
  const [hasSnapshotFilter, setHasSnapshotFilter] = useState<boolean | undefined>(undefined);

  const [isLoading, setIsLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active modal artifact
  const [selectedArtifact, setSelectedArtifact] = useState<{
    type: VaultArtifactType;
    id: string;
  } | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load summary stats
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const data = await getVaultSummary();
      setSummary(data);
    } catch (err: any) {
      console.warn("Could not load vault summary:", err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load artifacts
  const fetchArtifacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await listVaultArtifacts({
        category: categoryFilter,
        search: searchQuery.trim() || undefined,
        has_original: hasOriginalFilter,
        has_snapshot: hasSnapshotFilter,
        page,
        page_size: pageSize,
      });
      setArtifacts(res.items);
      setTotalItems(res.total);
      setTotalPages(res.total_pages);
    } catch (err: any) {
      setError(err.message || "Failed to load archived evidence artifacts");
      setArtifacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, searchQuery, hasOriginalFilter, hasSnapshotFilter, page]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchArtifacts();
  }, [fetchArtifacts]);

  const handleDownload = async (artifact: VaultArtifact) => {
    try {
      setDownloadingId(artifact.id);
      await triggerVaultDownload(
        artifact.artifact_type,
        artifact.id,
        artifact.filename || `${artifact.title}.bin`
      );
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getArtifactIcon = (type: VaultArtifactType, category: string) => {
    if (type === "web_snapshot") return <Globe className="w-5 h-5 text-amber-700" />;
    if (type === "repository_readme") return <GitBranch className="w-5 h-5 text-blue-700" />;
    if (type === "connected_source_record") return <Layers className="w-5 h-5 text-purple-700" />;
    if (category === "certificate") return <Award className="w-5 h-5 text-emerald-700" />;
    if (category === "resume") return <FileText className="w-5 h-5 text-blue-800" />;
    return <FileCode className="w-5 h-5 text-slate-800" />;
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Evidence Vault"
        description="Your private archive of uploaded documents, captured web content, and connected-source evidence."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Evidence Vault" },
        ]}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/app/evidence/upload"
            className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>UPLOAD WORK</span>
          </Link>
          <Link
            href="/app/evidence/library"
            className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <FolderGit2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">EVIDENCE LIBRARY</span>
          </Link>
        </div>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-7xl">
        {/* Section 4.1: Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#1C1C1C]/60 text-xs font-bold">
              <span>Total Artifacts</span>
              <Archive className="w-4 h-4 text-[#1C1C1C]" />
            </div>
            <div className="text-2xl font-black text-[#1C1C1C]">
              {summaryLoading ? "..." : summary?.total_artifacts ?? 0}
            </div>
            <p className="text-[10.5px] text-[#1C1C1C]/60">Accessible in personal vault</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#1C1C1C]/60 text-xs font-bold">
              <span>Original Files</span>
              <HardDrive className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="text-2xl font-black text-emerald-800">
              {summaryLoading ? "..." : summary?.uploaded_documents ?? 0}
            </div>
            <p className="text-[10.5px] text-[#1C1C1C]/60">
              {summary ? formatBytes(summary.storage_used_bytes) : "0 Bytes"} stored
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#1C1C1C]/60 text-xs font-bold">
              <span>Web Snapshots</span>
              <Globe className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-2xl font-black text-amber-800">
              {summaryLoading ? "..." : summary?.web_snapshots ?? 0}
            </div>
            <p className="text-[10.5px] text-[#1C1C1C]/60">Captured crawl pages</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-[#1C1C1C]/60 text-xs font-bold">
              <span>Repository Artifacts</span>
              <GitBranch className="w-4 h-4 text-blue-700" />
            </div>
            <div className="text-2xl font-black text-blue-800">
              {summaryLoading ? "..." : summary?.repository_artifacts ?? 0}
            </div>
            <p className="text-[10.5px] text-[#1C1C1C]/60">README & documentation</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-[#1C1C1C]/60 text-xs font-bold">
              <span>Processing Issues</span>
              <AlertTriangle className="w-4 h-4 text-[#C85A54]" />
            </div>
            <div className="text-2xl font-black text-[#C85A54]">
              {summaryLoading ? "..." : summary?.processing_issues ?? 0}
            </div>
            <p className="text-[10.5px] text-[#1C1C1C]/60">Incomplete or flagged</p>
          </div>
        </div>

        {/* Section 4.2: Filters & Search */}
        <div className="p-5 rounded-2xl bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50" />
              <input
                type="text"
                placeholder="Search archived artifacts, files, URLs..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#1C1C1C] bg-white text-xs font-semibold outline-none focus:ring-2 focus:ring-[#1C1C1C]/20"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  setCategoryFilter("all");
                  setSearchQuery("");
                  setHasOriginalFilter(undefined);
                  setHasSnapshotFilter(undefined);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded-xl border border-[#1C1C1C]/30 text-xs font-bold hover:bg-white text-[#1C1C1C]/70 transition"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => {
                  fetchSummary();
                  fetchArtifacts();
                }}
                className="p-2 rounded-xl border border-[#1C1C1C] bg-white hover:bg-[#FBF1CF] transition"
                title="Refresh Vault Records"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#1C1C1C]/15">
            {[
              { id: "all", label: "All Items" },
              { id: "documents", label: "Uploaded Documents" },
              { id: "certificates", label: "Certificates" },
              { id: "resumes", label: "Resumes" },
              { id: "web_snapshots", label: "Web Snapshots" },
              { id: "github", label: "GitHub" },
              { id: "jira", label: "Jira" },
              { id: "issues", label: "Processing Issues" },
            ].map((cat) => {
              const isSelected = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setCategoryFilter(cat.id);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-black border transition-all ${
                    isSelected
                      ? "bg-[#1C1C1C] text-[#FBF1CF] border-[#1C1C1C] shadow-sm"
                      : "bg-white text-[#1C1C1C]/70 border-[#1C1C1C]/20 hover:border-[#1C1C1C] hover:text-[#1C1C1C]"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4.3: Artifact Cards Grid */}
        {isLoading ? (
          <div className="p-16 rounded-2xl bg-white border border-[#1C1C1C]/15 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1C1C1C]" />
            <p className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60">
              Loading Verified Artifacts from Private Vault...
            </p>
          </div>
        ) : error ? (
          <div className="p-8 rounded-2xl border-[1.5px] border-[#C85A54] bg-[#F6C8D6] text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-[#C85A54] mx-auto" />
            <h3 className="text-sm font-black text-[#1C1C1C]">Vault Synchronization Error</h3>
            <p className="text-xs font-medium text-[#1C1C1C]/80 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={fetchArtifacts}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : artifacts.length === 0 ? (
          /* Honest Empty States */
          <div className="p-12 sm:p-16 rounded-[28px] border-[2px] border-dashed border-[#1C1C1C]/30 bg-white text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#000000] border border-[#1A1918] mx-auto flex items-center justify-center text-[#FAF8F5]">
              <Archive className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-[#1C1C1C]">
                {searchQuery || categoryFilter !== "all"
                  ? "No Matching Artifacts in Vault"
                  : "No Documents or Content Archived Yet"}
              </h3>
              <p className="text-xs text-[#1C1C1C]/60 max-w-md mx-auto leading-relaxed">
                {searchQuery || categoryFilter !== "all"
                  ? "None of your stored files or captured snapshots matched this filter. Try clearing the search query or selecting 'All Items'."
                  : "Uploaded certificates, resumes, captured website snapshots, and connected repository records will appear here after SkillPassport has securely stored them."}
              </p>
            </div>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              {searchQuery || categoryFilter !== "all" ? (
                <button
                  type="button"
                  onClick={() => {
                    setCategoryFilter("all");
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="pill-btn pill-btn-primary text-xs py-2 px-5"
                >
                  Clear All Filters
                </button>
              ) : (
                <>
                  <Link href="/app/evidence/upload" className="pill-btn pill-btn-primary text-xs py-2 px-5">
                    Upload First Document
                  </Link>
                  <Link href="/app/evidence/sources" className="pill-btn pill-btn-secondary text-xs py-2 px-5">
                    Connect GitHub or Jira
                  </Link>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {artifacts.map((art) => {
                const Icon = getArtifactIcon(art.artifact_type, art.category);
                return (
                  <div
                    key={`${art.artifact_type}-${art.id}`}
                    className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] flex flex-col justify-between hover:shadow-[4px_4px_0_0_#1C1C1C] transition-all space-y-4"
                  >
                    <div className="space-y-3">
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-[#FBF1CF] border border-[#1C1C1C]/15">
                            {Icon}
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                              {art.source_provider}
                            </span>
                            <span className="text-[11px] font-bold text-[#1C1C1C] capitalize">
                              {art.category.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>

                        {art.has_original_file && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300"
                            title="Original file bytes preserved in private storage vault"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Original</span>
                          </span>
                        )}
                        {art.has_snapshot && (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300"
                            title="Immutable web crawl content snapshot preserved"
                          >
                            <Globe className="w-3 h-3" />
                            <span>Snapshot</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4
                          onClick={() => setSelectedArtifact({ type: art.artifact_type, id: art.id })}
                          className="font-black text-sm text-[#1C1C1C] hover:underline cursor-pointer line-clamp-2 leading-snug"
                        >
                          {art.title}
                        </h4>
                        {art.filename && (
                          <p className="text-[11px] font-mono text-[#1C1C1C]/60 truncate">
                            {art.filename} {art.file_size_bytes > 0 && `(${formatBytes(art.file_size_bytes)})`}
                          </p>
                        )}
                        {art.extracted_summary && (
                          <p className="text-xs text-[#1C1C1C]/75 line-clamp-2 leading-relaxed pt-0.5">
                            {art.extracted_summary}
                          </p>
                        )}
                      </div>

                      {/* Date & State */}
                      <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-2 border-t border-[#1C1C1C]/10 font-medium">
                        <span>
                          {art.created_at
                            ? new Date(art.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "Recently"}
                        </span>
                        <span
                          className={`capitalize font-bold ${
                            art.processing_state === "completed" || art.processing_state === "extracted"
                              ? "text-emerald-700"
                              : art.processing_state === "insufficient_content"
                              ? "text-amber-700"
                              : "text-[#C85A54]"
                          }`}
                        >
                          {art.processing_state.replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-[#1C1C1C]/10 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedArtifact({ type: art.artifact_type, id: art.id })}
                        className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 flex-1 justify-center"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect &amp; Preview</span>
                      </button>

                      {(art.has_original_file || art.has_snapshot) && (
                        <button
                          type="button"
                          onClick={() => handleDownload(art)}
                          disabled={downloadingId === art.id}
                          className="p-1.5 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#1C1C1C] hover:text-white transition"
                          title="Download file"
                        >
                          <Download className={`w-3.5 h-3.5 ${downloadingId === art.id ? "animate-bounce" : ""}`} />
                        </button>
                      )}

                      {art.source_url && (
                        <a
                          href={art.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#1C1C1C] hover:text-white transition"
                          title="Open external source"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
                <span className="text-[#1C1C1C]/60 font-semibold">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalItems)} of {totalItems} artifacts
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#1C1C1C]/20 disabled:opacity-40 hover:bg-[#FBF1CF]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-[#1C1C1C]">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#1C1C1C]/20 disabled:opacity-40 hover:bg-[#FBF1CF]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Artifact Viewer Modal */}
      {selectedArtifact && (
        <ArtifactViewerModal
          artifactType={selectedArtifact.type}
          artifactId={selectedArtifact.id}
          onClose={() => setSelectedArtifact(null)}
        />
      )}
    </div>
  );
}
