import React from "react";
import { SkillVerificationState, ProficiencyLevel, CoverageState } from "@/types/passport";
import { ShieldCheck, HelpCircle, AlertTriangle, XCircle, CheckCircle2 } from "lucide-react";

export function SkillVerificationBadge({ state }: { state: SkillVerificationState }) {
  switch (state) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#000000] border border-[#1A1918] text-[#FAF8F5] shadow-[1px_1px_0_0_#1A1918]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#FAF8F5]" />
          VERIFIED SKILL
        </span>
      );
    case "candidate":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0A96D] text-[#1A1918] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          <HelpCircle className="w-3.5 h-3.5 text-[#1A1918]" />
          CANDIDATE CLAIM
        </span>
      );
    case "insufficient_evidence":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C85A54]/15 border border-[#C85A54] text-[#C85A54]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#C85A54]" />
          INSUFFICIENT EVIDENCE
        </span>
      );
    case "conflicting":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#EAE5D9] border border-[#C85A54] text-[#C85A54]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#C85A54]" />
          CONFLICTING PROOF
        </span>
      );
    case "rejected":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] border border-[#1A1918]/30 text-[#1A1918]/60">
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
      className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${
        isEstablished ? "bg-[#000000] text-[#FAF8F5] border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]" : "bg-[#FAF8F5] text-[#1A1918]/60 border-[#1A1918]/30"
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
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-[#000000] text-[#FAF8F5] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          SUFFICIENT COVERAGE
        </span>
      );
    case "incomplete":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-[#E0A96D] text-[#1A1918] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          INCOMPLETE
        </span>
      );
    case "conflicting":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase bg-[#EAE5D9] text-[#C85A54] border border-[#C85A54]">
          CONFLICTING
        </span>
      );
    case "insufficient":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase bg-[#FAF8F5] border border-[#1A1918]/30 text-[#1A1918]/70">
          INSUFFICIENT
        </span>
      );
  }
}
