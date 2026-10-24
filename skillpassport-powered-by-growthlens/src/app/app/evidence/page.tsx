"use client";

import { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import {
  SourceStatusBadge,
  ReviewStatusBadge,
  ProcessingStatusBadge,
} from "@/components/app/StatusBadges";
import {
  UploadCloud,
  FolderSync,
  Layers,
  ArrowRight,
  GitBranch,
  FileCode,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  Plus,
  Sparkles,
  Loader2,
  Cpu,
  Code2,
  Terminal,
} from "lucide-react";
import { runWorkAnalysis } from "@/lib/evidenceApi";

export default function EvidenceCenterPage() {
  const { profile } = useAuth();
  const { evidenceItems, sources, ingestionRuns, initialLoading, isLoadingEvidence, workAnalyses, refreshEvidenceData } = useEvidence();
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisStatusMsg, setAnalysisStatusMsg] = useState<{ id: string; text: string; error?: boolean } | null>(null);

  const isDataLoading = initialLoading || (isLoadingEvidence && evidenceItems.length === 0);

  const totalItems = evidenceItems.length;
  const connectedSourcesCount = sources.filter(
    (s) => s.status === "connected" || s.status === "demo_connected"
  ).length;
  const awaitingReview = evidenceItems.filter(
    (e) => e.reviewStatus === "needs_confirmation" || e.reviewStatus === "pending_review"
  ).length;
  const indexedCount = evidenceItems.filter((e) => e.processingStatus === "indexed").length;
  const failedRunsCount = ingestionRuns.filter((r) => r.status === "failed").length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Center"
        description="Bring your work together and see how it becomes evidence for your Skill Passport."
      >
        <Link
          href="/app/evidence/upload"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span>UPLOAD WORK</span>
        </Link>
        <Link
          href="/app/evidence/sources"
          className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <FolderSync className="w-3.5 h-3.5" />
          <span>CONNECT SOURCE</span>
        </Link>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-10 w-full max-w-[1400px] mx-auto">
        {profile?.onboarding_status && profile.onboarding_status !== "completed" && (
          <div className="p-4 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#1C1C1C]">
                <Sparkles className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#1C1C1C]">Onboarding Setup Incomplete</h4>
                <p className="text-xs text-[#1C1C1C]/75">
                  Step {profile.onboarding_current_step || 1} of 5 is pending. Finish your setup to unlock complete talent intelligence and skill tracking.
                </p>
              </div>
            </div>
            <Link
              href="/app/onboarding"
              className="pill-btn pill-btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto inline-flex items-center gap-1.5"
            >
              <span>RESUME ONBOARDING</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
        {/* ── 6.2 EDITORIAL METRICS ROW ─────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block mb-1">
                TOTAL EVIDENCE
              </span>
              {isDataLoading ? (
                <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
              ) : (
                <p className="text-3xl font-black text-[#1C1C1C]">{totalItems}</p>
              )}
              {isDataLoading ? (
                <div className="h-3 w-24 bg-[#1C1C1C]/10 rounded animate-pulse mt-1" />
              ) : (
                <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block">
                  Across {connectedSourcesCount} sources
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/50 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block mb-1">
                INDEXED &amp; PROCESSED
              </span>
              {isDataLoading ? (
                <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
              ) : (
                <p className="text-3xl font-black text-[#1C1C1C]">{indexedCount}</p>
              )}
              {isDataLoading ? (
                <div className="h-3 w-24 bg-[#1C1C1C]/10 rounded animate-pulse mt-1" />
              ) : (
                <span className="text-[10px] font-bold text-[#4A7A4E] mt-1 block">
                  Ready for skill mapping
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#F6BB84]/40 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block mb-1">
                AWAITING REVIEW
              </span>
              {isDataLoading ? (
                <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
              ) : (
                <p className="text-3xl font-black text-[#1C1C1C]">{awaitingReview}</p>
              )}
              {isDataLoading ? (
                <div className="h-3 w-28 bg-[#1C1C1C]/10 rounded animate-pulse mt-1" />
              ) : (
                <span className="text-[10px] font-bold text-[#1C1C1C]/80 mt-1 block">
                  Contribution confirmation
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block mb-1">
                CONNECTED SOURCES
              </span>
              {isDataLoading ? (
                <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
              ) : (
                <p className="text-3xl font-black text-[#1C1C1C]">{connectedSourcesCount}</p>
              )}
              {isDataLoading ? (
                <div className="h-3 w-20 bg-[#1C1C1C]/10 rounded animate-pulse mt-1" />
              ) : (
                <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block">
                  GitHub, Jira, Docs
                </span>
              )}
            </div>

            <div className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block mb-1">
                FAILED RUNS
              </span>
              {isDataLoading ? (
                <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
              ) : (
                <p className="text-3xl font-black text-[#C85A54]">{failedRunsCount}</p>
              )}
              {isDataLoading ? (
                <div className="h-3 w-20 bg-[#1C1C1C]/10 rounded animate-pulse mt-1" />
              ) : (
                <span className="text-[10px] font-bold text-[#C85A54] mt-1 block">
                  Retry available
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── 6.5 PROCESSING PIPELINE (6 STAGES) ────────────────────────── */}
        <section className="p-6 md:p-8 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[3.5px_3.5px_0_0_#1C1C1C] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/15 pb-4">
            <div>
              <span className="text-[9.5px] font-black uppercase tracking-[0.14em] text-[#1C1C1C]/60 block">
                EVIDENCE LIFECYCLE
              </span>
              <h2 className="text-xl font-black text-[#1C1C1C]">Ingestion &amp; Verification Pipeline</h2>
            </div>
            <Link
              href="/app/evidence/runs"
              className="text-xs font-bold underline hover:text-[#4A7A4E] inline-flex items-center gap-1"
            >
              <span>View Processing Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {[
              { num: "01", name: "Discovery", status: "completed", desc: "API / Upload intake" },
              { num: "02", name: "Normalization", status: "completed", desc: "Redact & structure" },
              { num: "03", name: "Extraction", status: "completed", desc: "Skills & excerpt chunks" },
              { num: "04", name: "Deduplication", status: "completed", desc: "Cross-source overlap" },
              { num: "05", name: "Indexing", status: "completed", desc: "ChromaDB vector store" },
              { num: "06", name: "Ready for Review", status: "active", desc: "Human confirmation" },
            ].map((st) => {
              const isActive = st.status === "active";
              return (
                <div
                  key={st.num}
                  className={`p-3.5 rounded-xl border border-[#1A1918] flex flex-col justify-between shadow-[1.5px_1.5px_0_0_#1A1918] h-full min-h-[96px] ${
                    isActive ? "bg-[#000000] text-[#FAF8F5]" : "bg-[#FAF8F5] text-[#1A1918]"
                  }`}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={`text-[9.5px] font-mono font-bold ${isActive ? "text-[#FAF8F5]/70" : "text-[#1A1918]/50"}`}>{st.num}</span>
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-[#DFE968]" : "bg-[#1A1918]"}`} />
                      </div>
                      <h4 className={`text-xs font-black tracking-tight leading-snug ${isActive ? "text-[#FAF8F5]" : "text-[#1A1918]"}`}>{st.name}</h4>
                    </div>
                    <p className={`text-[10px] mt-2 font-medium leading-tight ${isActive ? "text-[#FAF8F5]/80" : "text-[#1A1918]/70"}`}>{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 6.3 CONNECTED SOURCES OVERVIEW ────────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">Connected Sources</h3>
            <Link
              href="/app/evidence/sources"
              className="text-xs font-bold underline hover:text-[#4A7A4E]"
            >
              Manage all sources →
            </Link>
          </div>

          {isDataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="gl-card p-6 flex flex-col justify-between h-48 bg-[#FBF6DF] animate-pulse"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#1C1C1C]/10 border border-[#1C1C1C]/20" />
                      <div className="w-20 h-5 rounded-full bg-[#1C1C1C]/10" />
                    </div>
                    <div className="h-5 w-32 bg-[#1C1C1C]/15 rounded mb-2" />
                    <div className="h-3 w-44 bg-[#1C1C1C]/10 rounded mb-4" />
                    <div className="space-y-1.5 pt-3 border-t border-[#1C1C1C]/10">
                      <div className="h-3 w-28 bg-[#1C1C1C]/10 rounded" />
                      <div className="h-3 w-20 bg-[#1C1C1C]/10 rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-full bg-[#1C1C1C]/10 rounded-full mt-4" />
                </div>
              ))}
            </div>
          ) : sources.length === 0 ? (
            <div className="p-8 rounded-[24px] border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-[#FBF6DF]/60 text-center space-y-2">
              <p className="text-sm font-black text-[#1C1C1C]">No sources connected yet</p>
              <p className="text-xs text-[#1C1C1C]/60">Connect GitHub or Jira to continuously ingest work evidence.</p>
              <div className="pt-2">
                <Link href="/app/evidence/sources" className="pill-btn pill-btn-primary text-xs py-1.5 px-4 inline-flex items-center gap-1">
                  <span>CONNECT SOURCE</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sources.map((src) => (
                <div
                  key={src.id}
                  className="gl-card p-6 flex flex-col justify-between h-full bg-[#FBF6DF] !mt-0"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center shadow-[1px_1px_0_0_#1C1C1C]">
                        {src.type === "github" ? (
                          <GitBranch className="w-5 h-5 text-[#1C1C1C]" />
                        ) : src.type === "jira" ? (
                          <Layers className="w-5 h-5 text-[#1C1C1C]" />
                        ) : src.type === "leetcode" ? (
                          <Code2 className="w-5 h-5 text-[#1C1C1C]" />
                        ) : src.type === "hackerrank" ? (
                          <Terminal className="w-5 h-5 text-[#1C1C1C]" />
                        ) : (
                          <FileCode className="w-5 h-5 text-[#1C1C1C]" />
                        )}
                      </div>
                      <SourceStatusBadge status={src.status} />
                    </div>

                    <h4 className="text-base font-black text-[#1C1C1C] mb-1">{src.name}</h4>
                    <p className="text-xs font-medium text-[#1C1C1C]/75 mb-3">{src.accountIdentity}</p>

                    <div className="space-y-1.5 text-[11px] font-bold text-[#1C1C1C]/80 border-t border-[#1C1C1C]/10 pt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[#1C1C1C]/60">Imported Items:</span>
                        <span className="font-mono font-black">{src.importedRecordsCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#1C1C1C]/60">Last Synced:</span>
                        <span className="font-medium">{src.lastSync}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-[#1C1C1C]/10 flex gap-2">
                    <Link
                      href={`/app/evidence/sources/${src.type === "github" ? "github" : src.type === "jira" ? "jira" : src.type === "leetcode" ? "leetcode" : src.type === "hackerrank" ? "hackerrank" : ""}`}
                      className="flex-1 text-center py-2 text-xs font-black uppercase rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#DFE968] transition-all"
                    >
                      Configure
                    </Link>
                  </div>
                </div>
              ))}

              {sources.length < 3 && (
                <Link
                  href="/app/evidence/sources"
                  className="p-6 rounded-[24px] border-2 border-dashed border-[#1C1C1C]/30 hover:border-[#1C1C1C] bg-[#FBF6DF]/40 hover:bg-[#FBF6DF] flex flex-col items-center justify-center text-center gap-3 transition-all group min-h-[200px]"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#1C1C1C] flex items-center justify-center group-hover:scale-105 transition-transform shadow-[1px_1px_0_0_#1C1C1C]">
                    <Plus className="w-5 h-5 text-[#1C1C1C]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#1C1C1C]">Connect Source</h4>
                    <p className="text-xs text-[#1C1C1C]/60 mt-0.5">Integrate GitHub, Jira, or custom APIs</p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </section>

        {/* ── 6.4 RECENT EVIDENCE ITEMS & ATTENTION QUEUE ────────────────── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">Recently Collected Evidence</h3>
            <Link
              href="/app/evidence/library"
              className="text-xs font-bold underline hover:text-[#4A7A4E]"
            >
              {isDataLoading ? "View full library →" : `View full library (${totalItems}) →`}
            </Link>
          </div>

          <div className="bg-[#FBF6DF] rounded-[24px] border-[1.5px] border-[#1C1C1C] overflow-hidden shadow-[3px_3px_0_0_#1C1C1C]">
            {isDataLoading ? (
              <div className="p-8 space-y-4">
                <div className="flex items-center gap-2.5 pb-4 border-b border-[#1C1C1C]/15">
                  <div className="w-4 h-4 rounded-full border-2 border-[#1C1C1C] border-t-transparent animate-spin" />
                  <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/80">
                    Synchronizing Evidence Records...
                  </span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((n) => (
                    <div
                      key={n}
                      className="p-5 rounded-2xl bg-[#FBF1CF]/50 border border-[#1C1C1C]/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-20 bg-[#1C1C1C]/15 rounded" />
                          <div className="h-4 w-44 bg-[#1C1C1C]/20 rounded" />
                        </div>
                        <div className="h-3 w-5/6 bg-[#1C1C1C]/10 rounded" />
                        <div className="h-2.5 w-36 bg-[#1C1C1C]/10 rounded" />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="h-6 w-20 bg-[#1C1C1C]/15 rounded-full" />
                        <div className="h-6 w-20 bg-[#1C1C1C]/15 rounded-full" />
                        <div className="h-7 w-16 bg-[#1C1C1C]/20 rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : evidenceItems.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                  <UploadCloud className="w-6 h-6 text-[#1C1C1C]" />
                </div>
                <h4 className="text-base font-black text-[#1C1C1C]">No Evidence Uploaded Yet</h4>
                <p className="text-xs text-[#1C1C1C]/70 max-w-md mx-auto">
                  Begin your evidence journey by completing the guided sequential onboarding or uploading your first resume, project, or certificate.
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Link
                    href={profile?.onboarding_status === "completed" ? "/app/onboarding?mode=review" : "/app/onboarding"}
                    className="pill-btn pill-btn-primary text-xs py-2 px-5 inline-flex items-center gap-1.5"
                  >
                    <span>{profile?.onboarding_status === "completed" ? "REVIEW ONBOARDING SETUP" : "START ONBOARDING WIZARD"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/app/evidence/upload"
                    className="pill-btn pill-btn-secondary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>UPLOAD DOCUMENT</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#1C1C1C]/15">
                {evidenceItems.slice(0, 4).map((ev) => {
                  const analysis = workAnalyses.find((a) => a.source_id === ev.id);
                  const isOllamaAnalyzed = analysis && analysis.status === "completed" && analysis.analysis_method === "ollama";
                  const isRuleBased = analysis && (analysis.analysis_method === "rule_based" || analysis.fallback_used);
                  const isAnalyzingThis = analyzingId === ev.id;

                  return (
                    <div
                      key={ev.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#FBF1CF]/60 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-0 lg:pr-6">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold text-[#1C1C1C]/60 uppercase bg-white/70 px-2 py-0.5 rounded border border-[#1C1C1C]/15">
                            {ev.sourceType.toUpperCase()}
                          </span>
                          <h4 className="text-sm font-black text-[#1C1C1C] truncate">{ev.title}</h4>
                        </div>
                        <p className="text-xs font-medium text-[#1C1C1C]/75 line-clamp-1">
                          {ev.description}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-[#1C1C1C]/60 pt-0.5">
                          <span>Project: {ev.project}</span>
                          <span>•</span>
                          <span>Date: {ev.date}</span>
                        </div>
                        {analysisStatusMsg && analysisStatusMsg.id === ev.id && (
                          <div className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block ${
                            analysisStatusMsg.error ? "text-[#C85A54] bg-[#F6C8D6]" : "text-[#4A7A4E] bg-[#DFE968]/60"
                          }`}>
                            {analysisStatusMsg.text}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                        <ProcessingStatusBadge status={ev.processingStatus} />
                        <ReviewStatusBadge status={ev.reviewStatus} />

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

                        <button
                          type="button"
                          disabled={isAnalyzingThis}
                          onClick={async () => {
                            try {
                              setAnalyzingId(ev.id);
                              setAnalysisStatusMsg(null);
                              await runWorkAnalysis([ev.id]);
                              await refreshEvidenceData();
                              setAnalysisStatusMsg({ id: ev.id, text: "Ollama analysis succeeded!" });
                            } catch (err: any) {
                              setAnalysisStatusMsg({ id: ev.id, text: err?.message || "Analysis failed", error: true });
                            } finally {
                              setAnalyzingId(null);
                            }
                          }}
                          className="pill-btn pill-btn-primary text-[10.5px] py-1.5 px-3 flex items-center gap-1 disabled:opacity-50"
                          title="Analyze evidence item using local Ollama (qwen3:8b)"
                        >
                          {isAnalyzingThis ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>ANALYZING...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3" />
                              <span>{analysis ? "RE-ANALYZE" : "ANALYZE WITH OLLAMA"}</span>
                            </>
                          )}
                        </button>

                        <Link
                          href={`/app/evidence/library/${ev.id}`}
                          className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3"
                        >
                          INSPECT
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
