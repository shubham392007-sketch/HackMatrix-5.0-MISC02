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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#000000] border border-[#1A1918] text-[#FAF8F5] shadow-[1px_1px_0_0_#1A1918]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          {status === "connected" ? "CONNECTED" : "DEMO CONNECTED"}
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0A96D] text-[#1A1918] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          <Activity className="w-3 h-3 animate-spin text-[#1A1918]" />
          SYNCING ···
        </span>
      );
    case "needs_attention":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C85A54]/15 border border-[#C85A54] text-[#C85A54]">
          <AlertTriangle className="w-3 h-3 text-[#C85A54]" />
          ATTENTION
        </span>
      );
    case "not_connected":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] border border-[#1A1918]/30 text-[#1A1918]/70">
          NOT CONNECTED
        </span>
      );
  }
}

export function ProcessingStatusBadge({ status }: { status: ProcessingStatus }) {
  switch (status) {
    case "indexed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#000000] text-[#FAF8F5] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          <CheckCircle2 className="w-3 h-3 text-[#10B981]" />
          INDEXED
        </span>
      );
    case "ready_for_review":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#E0A96D] text-[#1A1918] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          <Clock className="w-3 h-3 text-[#1A1918]" />
          READY FOR REVIEW
        </span>
      );
    case "extracted":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#FAF8F5] text-[#1A1918] border border-[#1A1918]">
          <Layers className="w-3 h-3 text-[#1A1918]" />
          EXTRACTED
        </span>
      );
    case "insufficient_content":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#C85A54]/15 border border-[#C85A54] text-[#C85A54]">
          <AlertTriangle className="w-3 h-3 text-[#C85A54]" />
          INSUFFICIENT CONTENT
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase bg-[#C85A54]/15 border border-[#C85A54] text-[#C85A54]">
          <XCircle className="w-3 h-3 text-[#C85A54]" />
          FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase bg-[#FAF8F5] border border-[#1A1918]/30 text-[#1A1918]/70">
          {status}
        </span>
      );
  }
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  switch (status) {
    case "verified":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#000000] border border-[#1A1918] text-[#FAF8F5] shadow-[1px_1px_0_0_#1A1918]">
          <ShieldCheck className="w-3 h-3 text-[#FAF8F5]" />
          VERIFIED
        </span>
      );
    case "needs_confirmation":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#E0A96D] text-[#1A1918] border border-[#1A1918] shadow-[1px_1px_0_0_#1A1918]">
          <AlertTriangle className="w-3 h-3 text-[#1A1918]" />
          CONFIRM CONTRIBUTION
        </span>
      );
    case "insufficient_evidence":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C85A54]/15 border border-[#C85A54] text-[#C85A54]">
          <HelpCircle className="w-3 h-3 text-[#C85A54]" />
          INSUFFICIENT EVIDENCE
        </span>
      );
    case "pending_review":
    case "unreviewed":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FAF8F5] border border-[#1A1918]/30 text-[#1A1918]/70">
          UNREVIEWED
        </span>
      );
  }
}

export function EvidenceStrengthBadge({ strength }: { strength: EvidenceStrength }) {
  const color =
    strength === "high"
      ? "bg-[#000000] text-[#FAF8F5] border-[#1A1918]"
      : strength === "medium"
      ? "bg-[#E0A96D] text-[#1A1918] border-[#1A1918]"
      : strength === "insufficient"
      ? "bg-[#EAE5D9] text-[#C85A54] border-[#1A1918]"
      : "bg-[#FAF8F5] text-[#1A1918]/80 border-[#1A1918]/40";

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-[9px] font-black uppercase tracking-wider ${color}`}
    >
      STRENGTH: {strength.toUpperCase()}
    </span>
  );
}
