import React from "react";
import {
  ConnectionStatus,
  ProcessingStatus,
  ReviewStatus,
  EvidenceStrength,
} from "@/types/evidence";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Activity,
  Layers,
} from "lucide-react";

export function SourceStatusBadge({ status }: { status: ConnectionStatus }) {
  switch (status) {
    case "connected":
    case "demo_connected":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DFE968] border border-[#1C1C1C]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4A7A4E]" />
          {status === "connected" ? "CONNECTED" : "DEMO CONNECTED"}
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6BB84] border border-[#1C1C1C]">
          <Activity className="w-3 h-3 animate-spin text-[#1C1C1C]" />
          SYNCING ···
        </span>
      );
    case "needs_attention":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6C8D6] border border-[#1C1C1C]">
          <AlertTriangle className="w-3 h-3 text-[#C85A54]" />
          ATTENTION
        </span>
      );
    case "not_connected":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/70 border border-[#1C1C1C]/50 text-[#1C1C1C]/60">
          NOT CONNECTED
        </span>
      );
  }
}

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case "indexed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#DFE968] border border-[#1C1C1C]">
          <CheckCircle2 className="w-3 h-3 text-[#4A7A4E]" />
          INDEXED
        </span>
      );
    case "ready_for_review":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#F6BB84] border border-[#1C1C1C]">
          <Clock className="w-3 h-3 text-[#1C1C1C]" />
          READY FOR REVIEW
        </span>
      );
    case "extracted":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#FBF6DF] border border-[#1C1C1C]">
          <Layers className="w-3 h-3 text-[#1C1C1C]" />
          EXTRACTED
        </span>
      );
    case "insufficient_content":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
          <AlertTriangle className="w-3 h-3 text-[#C85A54]" />
          INSUFFICIENT CONTENT
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
          <XCircle className="w-3 h-3 text-[#C85A54]" />
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase bg-white border border-[#1C1C1C]/40 text-[#1C1C1C]/70">
          {status}
        </span>
      );
  }
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DFE968] border border-[#1C1C1C]">
          <ShieldCheck className="w-3 h-3 text-[#4A7A4E]" />
          VERIFIED
        </span>
      );
    case "needs_confirmation":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6BB84] border border-[#1C1C1C]">
          <AlertTriangle className="w-3 h-3 text-[#1C1C1C]" />
          CONFIRM CONTRIBUTION
        </span>
      );
    case "insufficient_evidence":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
          <HelpCircle className="w-3 h-3 text-[#C85A54]" />
          INSUFFICIENT EVIDENCE
        </span>
      );
    case "pending_review":
    case "unreviewed":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 border border-[#1C1C1C]/50 text-[#1C1C1C]/70">
          UNREVIEWED
        </span>
      );
  }
}

export function EvidenceStrengthBadge({ strength }: { strength: EvidenceStrength }) {
  const color =
    strength === "high"
      ? "bg-[#DFE968] text-[#1C1C1C]"
      : strength === "medium"
      ? "bg-[#F6BB84] text-[#1C1C1C]"
      : strength === "insufficient"
      ? "bg-[#F6C8D6] text-[#C85A54]"
      : "bg-[#FBF6DF] text-[#1C1C1C]/70";

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border border-[#1C1C1C] text-[9px] font-black uppercase tracking-wider ${color}`}
    >
      STRENGTH: {strength.toUpperCase()}
    </span>
  );
}
