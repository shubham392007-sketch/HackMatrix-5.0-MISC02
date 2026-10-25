"use client";

import React from "react";
import {
  X,
  ShieldCheck,
  Award,
  ExternalLink,
  FileText,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  GitBranch,
  Terminal,
  Code2,
  FileCheck,
} from "lucide-react";
import {
  AuthorizedVerifiedSkill,
  AuthorizedCustomSkill,
  AuthorizedEvidenceItem,
} from "@/types/sharing";

interface SkillInspectionModalProps {
  skill: AuthorizedVerifiedSkill | AuthorizedCustomSkill | null;
  allEvidence: AuthorizedEvidenceItem[];
  onClose: () => void;
  onInspectEvidence?: (evidenceId: string) => void;
}

export function getEvidencePlatform(ev: AuthorizedEvidenceItem) {
  const provider = (ev.sourceProvider || "").toLowerCase();
  const stype = (ev.sourceType || "").toLowerCase();
  const sUrl = (ev.sourceUrl || "").toLowerCase();
  const eUrl = (ev.externalUrl || "").toLowerCase();

  if (
    provider === "github" ||
    stype.includes("code_repository") ||
    stype.includes("readme") ||
    stype.includes("commit") ||
    stype.includes("pull_request") ||
    sUrl.includes("github.com") ||
    eUrl.includes("github.com")
  ) {
    return {
      type: "github",
      label: "GitHub",
      badgeText: stype === "readme" ? "GitHub Readme" : stype === "pull_request" ? "GitHub PR" : stype === "commit" ? "GitHub Commit" : "GitHub Repo",
      badgeColor: "bg-slate-900 text-white border-slate-900",
      actionText: "Open in GitHub",
      targetUrl: ev.externalUrl || ev.sourceUrl || (ev.provenance?.repo ? `https://github.com/${ev.provenance.repo}` : null),
    };
  }

  if (
    provider === "jira" ||
    stype.includes("jira") ||
    sUrl.includes("atlassian.net") ||
    eUrl.includes("atlassian.net")
  ) {
    return {
      type: "jira",
      label: "Jira",
      badgeText: "Jira Work Item",
      badgeColor: "bg-blue-600 text-white border-blue-600",
      actionText: "Open in Jira",
      targetUrl: ev.externalUrl || ev.sourceUrl,
    };
  }

  if (
    provider === "leetcode" ||
    stype.includes("leetcode") ||
    sUrl.includes("leetcode.com") ||
    eUrl.includes("leetcode.com")
  ) {
    return {
      type: "leetcode",
      label: "LeetCode",
      badgeText: "LeetCode Profile",
      badgeColor: "bg-amber-600 text-white border-amber-600",
      actionText: "Open LeetCode",
      targetUrl: ev.externalUrl || ev.sourceUrl || (ev.provenance?.username ? `https://leetcode.com/u/${ev.provenance.username}` : null),
    };
  }

  if (
    provider === "hackerrank" ||
    stype.includes("hackerrank") ||
    sUrl.includes("hackerrank.com") ||
    eUrl.includes("hackerrank.com")
  ) {
    return {
      type: "hackerrank",
      label: "HackerRank",
      badgeText: "HackerRank Profile",
      badgeColor: "bg-emerald-700 text-white border-emerald-700",
      actionText: "Open HackerRank",
      targetUrl: ev.externalUrl || ev.sourceUrl || (ev.provenance?.username ? `https://hackerrank.com/profile/${ev.provenance.username}` : null),
    };
  }

  // Default to Document / Certificate
  const docUrl = ev.documentUrl || (ev.sourceUrl?.startsWith("/api") ? ev.sourceUrl : null) || ev.externalUrl;
  return {
    type: "document",
    label: "Document",
    badgeText: stype.includes("cert") ? "Verified Certificate" : "Document Artifact",
    badgeColor: "bg-[#DFE968] text-[#1C1C1C] border-[#1C1C1C]",
    actionText: "View Document",
    targetUrl: docUrl,
  };
}

export default function SkillInspectionModal({
  skill,
  allEvidence,
  onClose,
  onInspectEvidence,
}: SkillInspectionModalProps) {
  if (!skill) return null;

  const isVerified = (skill as AuthorizedVerifiedSkill).verifiedProficiency !== undefined;
  const verifiedSkill = isVerified ? (skill as AuthorizedVerifiedSkill) : null;
  const customSkill = !isVerified ? (skill as AuthorizedCustomSkill) : null;

  // Find supporting evidence
  const evidenceIds = isVerified
    ? verifiedSkill?.authorizedEvidenceIds || []
    : customSkill?.attachedEvidenceIds || [];

  const supportingEvidence = allEvidence.filter((e) => evidenceIds.includes(e.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] rounded-2xl shadow-[6px_6px_0_0_#1C1C1C] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
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

        {/* Modal Header */}
        <div className="space-y-3 pr-8">
          <div className="flex flex-wrap items-center gap-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                Verified Competency
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-400 text-amber-900 text-xs font-black uppercase tracking-wider">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
                User-Declared · Not Independently Verified
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C] text-xs font-bold">
              <Award className="w-3.5 h-3.5" />
              {isVerified
                ? `Proficiency: ${verifiedSkill?.verifiedProficiency}`
                : `Self-Assessed: ${customSkill?.selfAssessedLevel}`}
            </span>
          </div>

          <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
            {isVerified ? verifiedSkill?.canonicalName : customSkill?.title}
          </h2>

          <p className="text-sm text-[#1C1C1C]/80 leading-relaxed">
            {isVerified ? verifiedSkill?.description : customSkill?.description}
          </p>

          {customSkill?.context && (
            <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 space-y-1">
              <span className="font-extrabold uppercase tracking-wider text-[10px] text-amber-800 block">
                Candidate Usage Context:
              </span>
              <p className="leading-relaxed">{customSkill.context}</p>
            </div>
          )}

          {customSkill?.tags && customSkill.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {customSkill.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-[#1C1C1C]/5 border border-[#1C1C1C]/20 text-[11px] font-bold text-[#1C1C1C]"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Supporting Authorized Evidence */}
        <div className="space-y-3 pt-3 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#1C1C1C]" />
              Authorized Supporting Evidence ({supportingEvidence.length})
            </h3>
            <span className="text-[11px] text-[#1C1C1C]/60 font-semibold">
              {isVerified ? "Audited Evidence Records" : "Candidate-Provided Evidence"}
            </span>
          </div>

          {supportingEvidence.length === 0 ? (
            <div className="p-4 rounded-xl bg-[#FFFFFF] border border-[#1C1C1C]/15 text-center text-xs text-[#1C1C1C]/60">
              No detailed artifact inspection is authorized for this skill in this shared link.
            </div>
          ) : (
            <div className="space-y-3">
              {supportingEvidence.map((ev) => {
                const plat = getEvidencePlatform(ev);
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 max-w-md">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-black text-[#1C1C1C]">{ev.title}</span>
                          <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${plat.badgeColor}`}>
                            {plat.badgeText}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1C1C1C]/60 font-medium flex items-center gap-1">
                          <span>Project: <strong className="text-[#1C1C1C]">{ev.project}</strong></span>
                          {ev.date && <span>· {ev.date.split("T")[0]}</span>}
                        </p>
                      </div>

                      {/* Action buttons: Inspect Artifact & Open Platform Link */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {onInspectEvidence && (
                          <button
                            onClick={() => onInspectEvidence(ev.id)}
                            className="px-3 py-1.5 rounded-full bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-[#FBF6DF] text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#DFE968] transition-all"
                            title="View deep cryptographic extraction, AST proof, and document preview"
                          >
                            <Eye className="w-3 h-3 text-[#DFE968]" />
                            <span>Inspect Artifact</span>
                          </button>
                        )}

                        {plat.targetUrl && (
                          <a
                            href={plat.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-full bg-[#DFE968] hover:bg-[#d4df55] text-[#1C1C1C] border border-[#1C1C1C] text-[11px] font-bold tracking-wider uppercase inline-flex items-center gap-1.5 cursor-pointer shadow-[1.5px_1.5px_0_0_#1C1C1C] transition-all"
                            title={`Open genuine source on ${plat.label}`}
                          >
                            <span>{plat.actionText}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">
                      {ev.shortSummary}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#1C1C1C]/60 pt-2 border-t border-[#1C1C1C]/10 font-medium">
                      <span>
                        Contribution: <strong className="text-[#1C1C1C] capitalize">{ev.claimedContribution}</strong>
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Verified Workplace Proof · Ready for Inspection</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Verification Guarantee Notice */}
        <div className="p-3.5 rounded-xl bg-[#1C1C1C]/5 border border-[#1C1C1C]/10 text-[11px] text-[#1C1C1C]/75 leading-relaxed">
          <strong className="text-[#1C1C1C] block mb-0.5">Trust & Grounding Guarantee:</strong>
          {isVerified
            ? "This skill was verified via multi-modal evidence parsing, AST commit history, and automated provenance check. Candidate claims cannot independently promote unverified skills into this category."
            : "Self-declared skills are authored directly by the candidate to highlight relevant expertise. They remain clearly distinct from independently verified competencies."}
        </div>
      </div>
    </div>
  );
}