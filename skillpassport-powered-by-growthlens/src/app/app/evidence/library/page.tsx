"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ProcessingStatusBadge,
  ReviewStatusBadge,
  EvidenceStrengthBadge,
} from "@/components/app/StatusBadges";
import {
  Search,
  Filter,
  UploadCloud,
  Trash2,
  ExternalLink,
  GitBranch,
  FileCode,
  Layers,
  Award,
  BookOpen,
  Loader2,
  Sparkles,
  Cpu,
} from "lucide-react";
import { runWorkAnalysis, runSkillExtraction } from "@/lib/evidenceApi";

function EvidenceLibraryContent() {
  const searchParams = useSearchParams();
  const qParam = searchParams.get("q");
  const sourceParam = searchParams.get("source");

  const {
    evidenceItems,
    deleteEvidenceItem,
    initialLoading,
    isLoadingEvidence,
    workAnalyses,
    refreshEvidenceData,
    addNotification,
  } = useEvidence();

  const isDataLoading = initialLoading || (isLoadingEvidence && evidenceItems.length === 0);

  const [searchTerm, setSearchTerm] = useState(qParam || "");
  const [sourceFilter, setSourceFilter] = useState(sourceParam || "all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (qParam !== null) setSearchTerm(qParam);
    if (sourceParam !== null) setSourceFilter(sourceParam);
  }, [qParam, sourceParam]);

  const filteredItems = evidenceItems.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource =
      sourceFilter === "all" ||
      item.sourceType === sourceFilter ||
      (sourceFilter === "jira" && (item.sourceType === "jira" || (item.sourceType as string) === "jira_issue" || (item as any).provider === "jira")) ||
      (sourceFilter === "github" && (item.sourceType === "github" || (item.sourceType as string).startsWith("github") || (item as any).provider === "github"));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && item.reviewStatus === "verified") ||
      (statusFilter === "review_needed" && item.reviewStatus === "needs_confirmation") ||
      (statusFilter === "insufficient" && item.reviewStatus === "insufficient_evidence");

    return matchesSearch && matchesSource && matchesStatus;
  });

  const getSourceIcon = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t === "github" || t.startsWith("github")) {
      return <GitBranch className="w-4 h-4 text-[#1C1C1C]" />;
    }
    if (t === "jira" || t.startsWith("jira")) {
      return <Layers className="w-4 h-4 text-[#1C1C1C]" />;
    }
    if (t === "certificate") {
      return <Award className="w-4 h-4 text-[#1C1C1C]" />;
    }
    if (t === "research") {
      return <BookOpen className="w-4 h-4 text-[#1C1C1C]" />;
    }
    return <FileCode className="w-4 h-4 text-[#1C1C1C]" />;
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Library"
        description="Inspect the work, documents, and source records collected for your SkillPassport."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      >
        <Link
          href="/app/evidence/upload"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>UPLOAD WORK</span>
        </Link>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-6 max-w-[1400px]">
        {/* Search & Filter Controls */}
        <div className="p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col md:flex-row items-center gap-4 justify-between shadow-[2px_2px_0_0_#1C1C1C]">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50" />
            <input
              type="text"
              placeholder="Search by title, project..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-xs font-semibold outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Source Filter */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-3 py-2 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-xs font-bold uppercase tracking-wider outline-none"
            >
              <option value="all">ALL SOURCES</option>
              <option value="github">GITHUB</option>
              <option value="jira">JIRA</option>
              <option value="document">PROJECT DOCS</option>
              <option value="certificate">CERTIFICATES</option>
              <option value="research">RESEARCH</option>
            </select>

            {/* Verification Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] text-xs font-bold uppercase tracking-wider outline-none"
            >
              <option value="all">ALL STATUSES</option>
              <option value="verified">VERIFIED PROOF</option>
              <option value="review_needed">NEEDS REVIEW</option>
              <option value="insufficient">INSUFFICIENT</option>
            </select>

            {(searchTerm || sourceFilter !== "all" || statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setSourceFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs font-black underline text-[#C85A54] ml-2"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="p-3.5 rounded-xl border border-[#1C1C1C] bg-[#F6C8D6] text-xs font-bold text-[#C85A54] flex items-center justify-between">
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              className="text-[10px] font-black underline uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1C]/70 px-1">
          {isDataLoading ? (
            <div className="h-4 w-48 bg-[#1C1C1C]/15 rounded animate-pulse" />
          ) : (
            <span>Showing {filteredItems.length} of {evidenceItems.length} evidence records</span>
          )}
        </div>

        {/* Evidence List Rows */}
        {isDataLoading ? (
          <div className="bg-[#FBF6DF] rounded-[24px] border-[1.5px] border-[#1C1C1C] overflow-hidden shadow-[3px_3px_0_0_#1C1C1C] p-6 space-y-4">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#1C1C1C]/15">
              <div className="w-4 h-4 rounded-full border-2 border-[#1C1C1C] border-t-transparent animate-spin" />
              <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/80">
                Loading Evidence Library...
              </span>
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="p-5 rounded-2xl bg-[#FBF1CF]/50 border border-[#1C1C1C]/15 flex flex-col lg:flex-row lg:items-center justify-between gap-5 animate-pulse"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#1C1C1C]/15" />
                      <div className="h-3 w-16 bg-[#1C1C1C]/15 rounded" />
                      <div className="h-4 w-52 bg-[#1C1C1C]/20 rounded" />
                    </div>
                    <div className="h-3 w-4/5 bg-[#1C1C1C]/10 rounded" />
                    <div className="h-2.5 w-48 bg-[#1C1C1C]/10 rounded" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="h-6 w-20 bg-[#1C1C1C]/15 rounded-full" />
                    <div className="h-6 w-20 bg-[#1C1C1C]/15 rounded-full" />
                    <div className="h-7 w-20 bg-[#1C1C1C]/20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-3">
            <p className="text-base font-black text-[#1C1C1C]">
              {evidenceItems.length === 0 ? "No evidence records yet." : "No evidence records match your criteria."}
            </p>
            <p className="text-xs text-[#1C1C1C]/60">
              {evidenceItems.length === 0
                ? "Upload your resume, certificates, or code to start building your Skill Passport."
                : "Try clearing the search bar or filters."}
            </p>
            {evidenceItems.length === 0 && (
              <div className="pt-2 flex justify-center gap-3">
                <Link
                  href="/app/onboarding"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4"
                >
                  START ONBOARDING
                </Link>
                <Link
                  href="/app/evidence/upload"
                  className="pill-btn pill-btn-secondary text-xs py-2 px-4"
                >
                  UPLOAD WORK
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#FBF6DF] rounded-[24px] border-[1.5px] border-[#1C1C1C] overflow-hidden shadow-[3px_3px_0_0_#1C1C1C]">
            <div className="divide-y divide-[#1C1C1C]/15">
              {filteredItems.map((item) => {
                const analysis = workAnalyses.find((a) => a.source_id === item.id);
                const isOllamaAnalyzed = analysis && analysis.status === "completed" && analysis.analysis_method === "ollama";
                const isRuleBased = analysis && (analysis.analysis_method === "rule_based" || analysis.fallback_used);
                const isAnalyzingThis = analyzingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-[#FBF1CF]/60 transition-colors"
                  >
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white border border-[#1C1C1C] flex items-center justify-center shrink-0">
                          {getSourceIcon(item.sourceType)}
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#1C1C1C]/60">
                          {item.sourceType}
                        </span>
                        <span className="text-xs text-[#1C1C1C]/30">•</span>
                        <h4 className="text-sm font-black text-[#1C1C1C]">{item.title}</h4>
                      </div>

                      <p className="text-xs font-medium text-[#1C1C1C]/75 line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold text-[#1C1C1C]/65 pt-1">
                        <span>Project: {item.project}</span>
                        <span>•</span>
                        <span>Date: {item.date}</span>
                        <span>•</span>
                        <span>Extraction Confidence: {item.extractionConfidence}%</span>
                        {item.candidateSkills && item.candidateSkills.length > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-[#4A7A4E] font-black">{item.candidateSkills.length} candidate {item.candidateSkills.length === 1 ? "skill" : "skills"}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges & Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                      <EvidenceStrengthBadge strength={item.evidenceStrength} />
                      <ReviewStatusBadge status={item.reviewStatus} />

                      {isOllamaAnalyzed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-[#1A1918] bg-[#000000] text-[#FAF8F5]">
                          <Cpu className="w-3 h-3 text-[#FAF8F5]" />
                          {analysis.model_name || "qwen3:8b"}
                        </span>
                      ) : isRuleBased ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#1C1C1C] bg-[#FBF1CF] text-[#1C1C1C]/70">
                          RULE-BASED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-[#1C1C1C]/40 bg-white text-[#1C1C1C]/50">
                          NOT ANALYZED
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isAnalyzingThis}
                          onClick={async () => {
                            try {
                              setAnalyzingId(item.id);
                              setActionError(null);
                              await Promise.allSettled([
                                runWorkAnalysis([item.id]),
                                runSkillExtraction([item.id]),
                              ]);
                              addNotification({
                                title: "Evidence extraction completed",
                                description: `Work analysis and candidate skill extraction completed for '${item.title}'.`,
                                category: "evidence",
                                severity: "success",
                                relatedDomain: "Evidence Workspace",
                                actionRoute: `/app/evidence/${item.id}`,
                                actionLabel: "View Evidence Item",
                                dedupKey: `lib_extract_${item.id}_${Date.now()}`,
                              });
                              await refreshEvidenceData();
                            } catch (err: any) {
                              const errMsg = err?.message || "Failed to analyze evidence with Ollama";
                              setActionError(errMsg);
                              addNotification({
                                title: "Extraction requires attention",
                                description: `Failed to analyze '${item.title}': ${errMsg}`,
                                category: "evidence",
                                severity: "error",
                                relatedDomain: "Evidence Workspace",
                                actionRoute: `/app/evidence/${item.id}`,
                                actionLabel: "Inspect Evidence Item",
                                dedupKey: `lib_extract_fail_${item.id}_${Date.now()}`,
                              });
                            } finally {
                              setAnalyzingId(null);
                            }
                          }}
                          className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
                          title="Analyze or re-analyze evidence with Ollama"
                        >
                          {isAnalyzingThis ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>ANALYZING...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{analysis ? "RE-ANALYZE" : "ANALYZE WITH OLLAMA"}</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/app/evidence/library/${item.id}`}
                          className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3.5"
                        >
                          DETAILS
                        </Link>
                        <button
                          type="button"
                          disabled={deletingId === item.id}
                          onClick={async () => {
                            if (confirm(`Remove evidence record "${item.title}"?`)) {
                              try {
                                setDeletingId(item.id);
                                await deleteEvidenceItem(item.id);
                              } catch (e) {
                                // error toast handled in context
                              } finally {
                                setDeletingId(null);
                              }
                            }
                          }}
                          className="p-2 rounded-full border border-[#1C1C1C] bg-white hover:bg-[#F6C8D6] text-[#C85A54] transition-all disabled:opacity-50"
                          title="Delete item"
                        >
                          {deletingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function EvidenceLibraryPage() {
  return (
    <Suspense fallback={null}>
      <EvidenceLibraryContent />
    </Suspense>
  );
}
