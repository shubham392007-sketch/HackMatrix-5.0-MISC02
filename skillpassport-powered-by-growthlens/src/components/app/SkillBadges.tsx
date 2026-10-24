import React from "react";
import { SkillVerificationState, ProficiencyLevel, CoverageState } from "@/types/passport";
import { ShieldCheck, HelpCircle, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

export function SkillVerificationBadge({ state }: { state: SkillVerificationState }) {
  switch (state) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#1E3A5F] border border-[#1A1918] text-[#FAF8F5]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FAF8F5]" />
          VERIFIED SKILL
        </span>
      );
    case "candidate":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#FBF6DF] border border-[#1C1C1C]">
          <HelpCircle className="w-3.5 h-3.5 text-[#1C1C1C]" />
          CANDIDATE CLAIM
        </span>
      );
    case "insufficient_evidence":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#C85A54]" />
          INSUFFICIENT EVIDENCE
        </span>
      );
    case "conflicting":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6BB84] border border-[#1C1C1C] text-[#1C1C1C]">
          <AlertTriangle className="w-3.5 h-3.5" />
          CONFLICTING PROOF
        </span>
      );
    case "rejected":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white border border-[#1C1C1C] text-[#1C1C1C]/60">
          <XCircle className="w-3.5 h-3.5" />
          REJECTED
        </span>
      );
  }
}

export function ProficiencyBadge({ level }: { level: ProficiencyLevel }) {
  const isEstablished = level !== "Not Established";
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider ${
        isEstablished ? "bg-[#DFE968]/70 text-[#1C1C1C]" : "bg-[#FBF1CF] text-[#1C1C1C]/60"
      }`}
    >
      {level.toUpperCase()}
    </span>
  );
}

export function CoverageBadge({ state }: { state: CoverageState }) {
  switch (state) {
    case "sufficient":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C]">
          SUFFICIENT COVERAGE
        </span>
      );
    case "incomplete":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#F6BB84] border border-[#1C1C1C] text-[#1C1C1C]">
          INCOMPLETE
        </span>
      );
    case "conflicting":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-black uppercase bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
          CONFLICTING
        </span>
      );
    case "insufficient":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9.5px] font-bold uppercase bg-white border border-[#1C1C1C]/50 text-[#1C1C1C]/70">
          INSUFFICIENT
        </span>
      );
  }
}
