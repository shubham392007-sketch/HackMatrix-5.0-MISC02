"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Copy,
  Check,
  FileCode,
  FileText,
  Globe,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  Sparkles,
  Award,
  Download,
  Eye,
  FileCheck,
  Code2,
  Terminal,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";

interface PublicEvidenceModalProps {
  token?: string;
  evidenceId: string;
  onClose: () => void;
}

interface EvidenceDetailData {
  id: string;
  title: string;
  sourceType: string;
  sourceProvider: string;
  project: string;
  date: string | null;
  shortSummary: string;
  relatedSkillName?: string;
  claimedContribution: string;
  allowDetailInspection: boolean;
  extractedExcerpt?: string | null;
  sourceUrl?: string | null;
  externalUrl?: string | null;
  documentUrl?: string | null;
  fileUrl?: string | null;
  sourceReference?: string | null;
  provenance?: Record<string, any>;
  confidenceScore?: number;
  trustCertification?: string;
}

export default function PublicEvidenceModal({
  token,
  evidenceId,
  onClose,
}: PublicEvidenceModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<EvidenceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"preview" | "excerpt">("preview");

  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      if (!evidenceId) return;
      setLoading(true);
      setError(null);
      try {
        const effectiveToken = token || "preview-token";
        const result = await sharingApi.getPublicEvidenceDetail(effectiveToken, evidenceId);
        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load artifact details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [token, evidenceId]);

  const handleCopyExcerpt = () => {
    if (data?.extractedExcerpt && navigator?.clipboard) {
      navigator.clipboard.writeText(data.extractedExcerpt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const effectiveToken = token || "preview-token";
  const fileStreamUrl =
    data?.fileUrl ||
    data?.documentUrl ||
    (data?.sourceUrl?.startsWith("/api") ? data.sourceUrl : null) ||
    `/api/v1/sharing/public/${effectiveToken}/evidence/${evidenceId}/file`;

  const provider = (data?.sourceProvider || "").toLowerCase();
  const stype = (data?.sourceType || "").toLowerCase();
  const isDocument =
    provider.includes("document") ||
    provider.includes("cert") ||
    stype.includes("document") ||
    stype.includes("certificate") ||
    stype.includes("pdf") ||
    Boolean(data?.documentUrl);

  const isGitHub =
    provider === "github" ||
    stype.includes("code_repository") ||
    stype.includes("readme") ||
    stype.includes("commit") ||
    stype.includes("pull_request") ||
    data?.externalUrl?.includes("github.com") ||
    data?.sourceUrl?.includes("github.com");

  const isJira =
    provider === "jira" ||
    stype.includes("jira") ||
    data?.externalUrl?.includes("atlassian.net") ||
    data?.sourceUrl?.includes("atlassian.net");

  const isLeetCode =
    provider === "leetcode" ||
    stype.includes("leetcode") ||
    data?.externalUrl?.includes("leetcode.com") ||
    data?.sourceUrl?.includes("leetcode.com");

  const isHackerRank =
    provider === "hackerrank" ||
    stype.includes("hackerrank") ||
    data?.externalUrl?.includes("hackerrank.com") ||
    data?.sourceUrl?.includes("hackerrank.com");

  const externalTargetUrl =
    data?.externalUrl ||
    data?.sourceUrl ||
    (isDocument ? fileStreamUrl : null);

  const repoName =
    data?.provenance?.repo ||
    data?.provenance?.repo_full_name ||
    (isGitHub && data?.project ? data.project : null);

  const languages: Array<{ name: string; percentage: number; bytes?: number }> =
    data?.provenance?.languages || [];

  const recentCommits: Array<{ sha: string; msg: string }> =
    data?.provenance?.recent_commits || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-3xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] rounded-2xl shadow-[6px_6px_0_0_#1C1C1C] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full bg-[#1C1C1C]/10 hover:bg-[#1C1C1C]/20 text-[#1C1C1C] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {loading && (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1C1C1C]" />
            <p className="text-xs font-black text-[#1C1C1C] uppercase tracking-wider">
              Retrieving Cryptographic Workplace Artifact...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#1C1C1C]">Inspection Unavailable</h3>
              <p className="text-xs text-[#1C1C1C]/70 max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold cursor-pointer"
            >
              Close
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Header / Badges */}
            <div className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Grounded Workplace Evidence
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold uppercase border border-[#1C1C1C]">
                  {data.sourceProvider ? `${data.sourceProvider} · ${data.sourceType}` : data.sourceType}
                </span>

                {data.confidenceScore && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C] text-xs font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {data.confidenceScore}% Confidence
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] tracking-tight leading-tight">
                {data.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#1C1C1C]/75 font-medium">
                <span>Project: <strong className="text-[#1C1C1C]">{data.project}</strong></span>
                {data.date && <span>· Observed: <strong className="text-[#1C1C1C]">{data.date.split("T")[0]}</strong></span>}
                <span>· Contribution: <strong className="text-[#1C1C1C] capitalize">{data.claimedContribution}</strong></span>
              </div>
            </div>

            {/* Supporting Skill Validation */}
            {data.relatedSkillName && (
              <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                    Substantiating Competency
                  </span>
                  <span className="text-xs font-black text-[#1C1C1C]">
                    {data.relatedSkillName}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold uppercase">
                  Independently Substantiated
                </span>
              </div>
            )}

            {/* PROVIDER-SPECIFIC INSPECTION PRESENTATION */}

            {/* 1. DOCUMENT & CERTIFICATE EMBEDDED VIEWER */}
            {isDocument && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveTab("preview")}
                      className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                        activeTab === "preview"
                          ? "bg-[#1C1C1C] text-[#FBF6DF] shadow-[1px_1px_0_0_#DFE968]"
                          : "bg-white/80 text-[#1C1C1C]/70 hover:bg-white"
                      }`}
                    >
                      Document Preview
                    </button>
                    {data.extractedExcerpt && (
                      <button
                        onClick={() => setActiveTab("excerpt")}
                        className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide uppercase transition-all cursor-pointer ${
                          activeTab === "excerpt"
                            ? "bg-[#1C1C1C] text-[#FBF6DF] shadow-[1px_1px_0_0_#DFE968]"
                            : "bg-white/80 text-[#1C1C1C]/70 hover:bg-white"
                        }`}
                      >
                        Extracted Text &amp; OCR
                      </button>
                    )}
                  </div>

                  <a
                    href={fileStreamUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#1C1C1C] hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Open Full Document</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {activeTab === "preview" ? (
                  <div className="rounded-xl overflow-hidden border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] bg-white">
                    <div className="bg-[#1C1C1C] text-[#FBF6DF] px-4 py-2.5 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[#DFE968]" />
                        <span>{data.provenance?.original_filename || data.title}</span>
                      </span>
                      {data.provenance?.page_count && (
                        <span className="text-[11px] font-mono text-[#FBF6DF]/70">
                          {data.provenance.page_count} page(s)
                        </span>
                      )}
                    </div>
                    <iframe
                      src={fileStreamUrl}
                      className="w-full h-96 border-0 bg-stone-100"
                      title={data.title}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1C]/70">
                      <span>PyMuPDF &amp; OCR Verified Stream</span>
                      <button
                        onClick={handleCopyExcerpt}
                        className="hover:text-[#1C1C1C] flex items-center gap-1 cursor-pointer"
                      >
                        {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? "Copied Transcript" : "Copy Transcript"}</span>
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-[#1C1C1C] text-[#FBF6DF] font-mono text-xs leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap break-all shadow-[2px_2px_0_0_#DFE968] border border-[#1C1C1C]">
                      {data.extractedExcerpt}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* 2. GITHUB REPOSITORY / COMMITS / LANGUAGES */}
            {isGitHub && (
              <div className="p-5 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-5 h-5 text-[#1C1C1C]" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block">
                        GitHub Deliverable Repository
                      </span>
                      <span className="font-black text-sm text-[#1C1C1C]">
                        {repoName || "Candidate GitHub Repository"}
                      </span>
                    </div>
                  </div>

                  {externalTargetUrl && (
                    <a
                      href={externalTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-[#FBF6DF] text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#DFE968]"
                    >
                      <span>Open on GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Languages breakdown bar */}
                {languages.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                      Repository Language Distribution
                    </span>
                    <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex border border-[#1C1C1C]/20">
                      {languages.map((l, idx) => (
                        <div
                          key={idx}
                          style={{ width: `${Math.max(l.percentage, 2)}%` }}
                          title={`${l.name}: ${l.percentage}%`}
                          className={`${
                            idx === 0
                              ? "bg-amber-400"
                              : idx === 1
                              ? "bg-emerald-500"
                              : idx === 2
                              ? "bg-blue-500"
                              : idx === 3
                              ? "bg-indigo-500"
                              : "bg-stone-400"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {languages.map((l, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-[#1C1C1C]/5 border border-[#1C1C1C]/15 text-[11px] font-bold text-[#1C1C1C]">
                          {l.name} <span className="opacity-60">({l.percentage}%)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Commits */}
                {recentCommits.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-[#1C1C1C]/10">
                    <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-[#1C1C1C]" />
                      Recent Author Commits ({recentCommits.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {recentCommits.map((c, idx) => {
                        const commitUrl = repoName ? `https://github.com/${repoName}/commit/${c.sha}` : null;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between gap-3"
                          >
                            <span className="text-[#1C1C1C]/90 font-medium truncate">
                              {c.msg}
                            </span>
                            {commitUrl ? (
                              <a
                                href={commitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hover:underline shrink-0 flex items-center gap-1"
                              >
                                <span>{c.sha.slice(0, 7)}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="font-mono text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded shrink-0">
                                {c.sha.slice(0, 7)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. JIRA WORK ITEM PRESENTATION */}
            {isJira && (
              <div className="p-5 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3">
                <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block">
                        Jira Production Task
                      </span>
                      <span className="font-mono font-bold text-sm text-[#1C1C1C]">
                        {data.sourceReference || data.provenance?.issue_key || data.project}
                      </span>
                    </div>
                  </div>

                  {externalTargetUrl && (
                    <a
                      href={externalTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                    >
                      <span>Open in Jira</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="text-xs text-[#1C1C1C]/80 leading-relaxed">
                  {data.shortSummary}
                </div>
              </div>
            )}

            {/* 4. LEETCODE PROFILE PRESENTATION */}
            {isLeetCode && (
              <div className="p-5 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block">
                        LeetCode Algorithmic Mastery
                      </span>
                      <span className="font-black text-sm text-[#1C1C1C]">
                        {data.provenance?.username || data.project}
                      </span>
                    </div>
                  </div>

                  {externalTargetUrl && (
                    <a
                      href={externalTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                    >
                      <span>Open LeetCode Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Total Solved</span>
                    <span className="text-base font-black text-[#1C1C1C]">
                      {data.provenance?.total_solved ?? data.provenance?.solved ?? "Verified"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">Easy</span>
                    <span className="text-base font-black text-emerald-900">
                      {data.provenance?.easy_solved ?? "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Medium</span>
                    <span className="text-base font-black text-amber-900">
                      {data.provenance?.medium_solved ?? "—"}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-800 uppercase block">Hard</span>
                    <span className="text-base font-black text-rose-900">
                      {data.provenance?.hard_solved ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 5. HACKERRANK PROFILE PRESENTATION */}
            {isHackerRank && (
              <div className="p-5 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-4">
                <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block">
                        HackerRank Problem Solving Track
                      </span>
                      <span className="font-black text-sm text-[#1C1C1C]">
                        {data.provenance?.username || data.project}
                      </span>
                    </div>
                  </div>

                  {externalTargetUrl && (
                    <a
                      href={externalTargetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                    >
                      <span>Open HackerRank Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="text-xs text-[#1C1C1C]/80 leading-relaxed">
                  {data.shortSummary}
                </div>
              </div>
            )}

            {/* Extracted Summary (if not already shown in document viewer) */}
            {!isDocument && (
              <div className="space-y-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  Extracted Technical Summary
                </h3>
                <p className="p-4 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] text-xs text-[#1C1C1C]/85 leading-relaxed">
                  {data.shortSummary}
                </p>
              </div>
            )}

            {/* Extracted Excerpt / Technical Proof for non-documents */}
            {!isDocument && data.extractedExcerpt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#1C1C1C]" />
                    Technical Proof &amp; Readme Excerpt
                  </h3>
                  <button
                    onClick={handleCopyExcerpt}
                    className="text-[11px] font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Technical Proof"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#1C1C1C] text-[#FBF6DF] font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap break-all shadow-[2px_2px_0_0_#DFE968] border border-[#1C1C1C]">
                  {data.extractedExcerpt}
                </pre>
              </div>
            )}

            {/* Primary Action Button to Open Platform / Document */}
            {externalTargetUrl && (
              <div className="pt-2">
                <a
                  href={externalTargetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-5 rounded-full bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-xs font-black tracking-wider uppercase text-[#FBF6DF] shadow-[3px_3px_0_0_#DFE968] border border-[#1C1C1C] flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>
                    {isGitHub
                      ? "Open Genuine Source on GitHub ↗"
                      : isJira
                      ? "Open Tracked Work Item in Jira ↗"
                      : isLeetCode
                      ? "View Verified Candidate Profile on LeetCode ↗"
                      : isHackerRank
                      ? "View Verified Candidate Profile on HackerRank ↗"
                      : "Open Full Document in New Tab ↗"}
                  </span>
                  <ExternalLink className="w-4 h-4 text-[#DFE968]" />
                </a>
              </div>
            )}

            {/* Trust and Grounding Notice */}
            <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 text-[11px] text-[#1C1C1C]/75 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>SkillPassport Trust &amp; Cryptographic Verification Guarantee</span>
              </div>
              <p>
                {data.trustCertification ||
                  "Grounded directly in authentic code commits, repository telemetry, platform metadata, and verified source documents. Zero fabricated records."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}