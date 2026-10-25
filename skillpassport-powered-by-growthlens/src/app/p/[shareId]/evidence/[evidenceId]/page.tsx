"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { validateEvidenceAccess } from "@/lib/sharingCalculations";
import { sharingApi } from "@/lib/sharingApi";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Lock,
  ExternalLink,
  GitPullRequest,
  GitCommit,
  GitBranch,
  FileText,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Award,
  Terminal,
  Code2,
  Loader2,
  Download,
} from "lucide-react";

interface PageProps {
  params: Promise<{
    shareId: string;
    evidenceId: string;
  }>;
}

export default function RecruiterEvidenceDetailPage({ params }: PageProps) {
  const { shareId, evidenceId } = use(params);
  const { getShareProjection } = useEvidence();

  const [loading, setLoading] = useState<boolean>(true);
  const [detailData, setDetailData] = useState<any | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Authoritatively fetch genuine evidence artifact detail from backend API
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      setLoading(true);
      setFetchError(null);
      try {
        const result = await sharingApi.getPublicEvidenceDetail(shareId, evidenceId);
        if (isMounted) setDetailData(result);
      } catch (err: any) {
        if (isMounted) setFetchError(err.message || "Failed to inspect evidence artifact");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [shareId, evidenceId]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-4 font-sans">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1C1C1C]" />
        <p className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
          Retrieving Authenticated Evidence Deliverable...
        </p>
      </div>
    );
  }

  if (fetchError || !detailData) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-6 font-sans">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-black text-[#1C1C1C]">
            Evidence Inspection Unavailable
          </h1>
          <p className="text-xs text-[#1C1C1C]/70">
            {fetchError || "This specific evidence item is not authorized or the shared link has expired."}
          </p>
        </div>
        <Link
          href={`/p/${shareId}`}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold uppercase tracking-wider hover:bg-[#1C1C1C]/90 shadow-[2px_2px_0_0_#DFE968]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
        </Link>
      </div>
    );
  }

  const ev = detailData;
  const provider = (ev.sourceProvider || "").toLowerCase();
  const stype = (ev.sourceType || "").toLowerCase();

  const isDocument =
    provider.includes("document") ||
    provider.includes("cert") ||
    stype.includes("document") ||
    stype.includes("certificate") ||
    stype.includes("pdf") ||
    Boolean(ev.documentUrl);

  const isGitHub =
    provider === "github" ||
    stype.includes("code_repository") ||
    stype.includes("readme") ||
    stype.includes("commit") ||
    stype.includes("pull_request") ||
    ev.externalUrl?.includes("github.com") ||
    ev.sourceUrl?.includes("github.com");

  const isJira =
    provider === "jira" ||
    stype.includes("jira") ||
    ev.externalUrl?.includes("atlassian.net") ||
    ev.sourceUrl?.includes("atlassian.net");

  const isLeetCode =
    provider === "leetcode" ||
    stype.includes("leetcode") ||
    ev.externalUrl?.includes("leetcode.com") ||
    ev.sourceUrl?.includes("leetcode.com");

  const isHackerRank =
    provider === "hackerrank" ||
    stype.includes("hackerrank") ||
    ev.externalUrl?.includes("hackerrank.com") ||
    ev.sourceUrl?.includes("hackerrank.com");

  const fileStreamUrl =
    ev.fileUrl ||
    ev.documentUrl ||
    (ev.sourceUrl?.startsWith("/api") ? ev.sourceUrl : null) ||
    `/api/v1/sharing/public/${shareId}/evidence/${evidenceId}/file`;

  const externalTargetUrl =
    ev.externalUrl ||
    ev.sourceUrl ||
    (isDocument ? fileStreamUrl : null);

  const repoName =
    ev.provenance?.repo ||
    ev.provenance?.repo_full_name ||
    (isGitHub && ev.project ? ev.project : null);

  const languages: Array<{ name: string; percentage: number }> =
    ev.provenance?.languages || [];

  const recentCommits: Array<{ sha: string; msg: string }> =
    ev.provenance?.recent_commits || [];

  return (
    <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6 font-sans">
      {/* Back to Shared Passport */}
      <Link
        href={`/p/${shareId}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Return to Shared Passport
      </Link>

      {/* Main Evidence Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-6">
        {/* Header */}
        <div className="space-y-3 pb-6 border-b border-[#1C1C1C]/10">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                isGitHub
                  ? "bg-slate-900 text-white border-slate-900"
                  : isJira
                  ? "bg-blue-600 text-white border-blue-600"
                  : isLeetCode
                  ? "bg-amber-600 text-white border-amber-600"
                  : isHackerRank
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-[#DFE968] text-[#1C1C1C] border-[#1C1C1C]"
              }`}
            >
              {ev.sourceType || "Deliverable"}
            </span>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Grounded Workplace Proof
            </span>

            {ev.confidenceScore && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-900 text-xs font-bold">
                <Sparkles className="w-3 h-3 text-amber-600" />
                {ev.confidenceScore}% Confidence
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#1C1C1C] tracking-tight leading-tight">
            {ev.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[#1C1C1C]/70 font-medium">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#1C1C1C]/50" />
              Project: <span className="font-bold text-[#1C1C1C]">{ev.project}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#1C1C1C]/50" />
              Observed: <span className="font-bold text-[#1C1C1C]">{ev.date ? ev.date.split("T")[0] : "Verified"}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              Attribution: <span className="font-bold text-[#1C1C1C] capitalize">{ev.claimedContribution}</span>
            </span>
          </div>
        </div>

        {/* Technical Summary */}
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
            Technical Deliverable Summary
          </h2>
          <div className="p-4 rounded-xl bg-stone-50 border border-[#1C1C1C]/15 text-xs sm:text-sm text-[#1C1C1C]/85 leading-relaxed">
            {ev.shortSummary}
          </div>
        </div>

        {/* Supporting Competency */}
        {ev.relatedSkillName && (
          <div className="p-4 rounded-xl bg-[#DFE968]/20 border border-[#1C1C1C] flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60">
                Substantiates Candidate Competency
              </span>
              <h3 className="text-base font-black text-[#1C1C1C]">
                {ev.relatedSkillName}
              </h3>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold shrink-0">
              Independently Corroborated
            </span>
          </div>
        )}

        {/* Embedded Document Viewer (if Document/Certificate) */}
        {isDocument && (
          <div className="space-y-2 pt-2 border-t border-[#1C1C1C]/10">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
                Original Document &amp; Certificate Viewer
              </h3>
              <a
                href={fileStreamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold text-[#1C1C1C] hover:underline flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open Full PDF / Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="rounded-xl overflow-hidden border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] bg-white">
              <iframe
                src={fileStreamUrl}
                className="w-full h-96 border-0 bg-stone-100"
                title={ev.title}
              />
            </div>
          </div>
        )}

        {/* GitHub Languages & Commits (if GitHub) */}
        {isGitHub && (
          <div className="space-y-4 pt-2 border-t border-[#1C1C1C]/10">
            {languages.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                  Language Distribution
                </span>
                <div className="h-3 w-full bg-stone-100 rounded-full overflow-hidden flex border border-[#1C1C1C]/20">
                  {languages.map((l, idx) => (
                    <div
                      key={idx}
                      style={{ width: `${Math.max(l.percentage, 2)}%` }}
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
                      title={`${l.name}: ${l.percentage}%`}
                    />
                  ))}
                </div>
              </div>
            )}

            {recentCommits.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  Author Commits ({recentCommits.length})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {recentCommits.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs flex items-center justify-between gap-3"
                    >
                      <span className="text-[#1C1C1C]/90 font-medium truncate">{c.msg}</span>
                      {repoName ? (
                        <a
                          href={`https://github.com/${repoName}/commit/${c.sha}`}
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
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Technical Readme Excerpt / OCR transcript */}
        {ev.extractedExcerpt && (
          <div className="space-y-2 pt-2 border-t border-[#1C1C1C]/10">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> Technical Excerpt &amp; Verified Provenance
            </h2>
            <pre className="p-4 rounded-xl bg-[#1C1C1C] text-[#FBF6DF] font-mono text-xs leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap break-all shadow-[2px_2px_0_0_#DFE968] border border-[#1C1C1C]">
              {ev.extractedExcerpt}
            </pre>
          </div>
        )}

        {/* External Platform Redirection Link */}
        {externalTargetUrl && (
          <div className="pt-3">
            <a
              href={externalTargetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-6 rounded-full bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-xs font-black tracking-wider uppercase text-[#FBF6DF] shadow-[3px_3px_0_0_#DFE968] border border-[#1C1C1C] flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              <span>
                {isGitHub
                  ? "Open Source Repository on GitHub ↗"
                  : isJira
                  ? "Open Tracked Work Item in Jira ↗"
                  : isLeetCode
                  ? "Open Candidate Profile on LeetCode ↗"
                  : isHackerRank
                  ? "Open Candidate Profile on HackerRank ↗"
                  : "Open Full Document File in New Tab ↗"}
              </span>
              <ExternalLink className="w-4 h-4 text-[#DFE968]" />
            </a>
          </div>
        )}

        {/* Recruiter Guarantee Banner */}
        <div className="p-4 rounded-xl bg-[#FBF6DF] border border-[#1C1C1C]/15 text-xs text-[#1C1C1C]/80 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            This artifact view has been authorized by the candidate under SkillPassport's selective disclosure protocol. It proves hands-on production engineering execution without exposing internal proprietary secrets.
          </p>
        </div>
      </div>
    </div>
  );
}