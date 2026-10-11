"use client";

import React from "react";
import {
  GuardOutcome,
  AnalysisStatus,
  DemoRole,
} from "@/types/ai";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Lock,
  User,
  Shield,
  SlidersHorizontal,
} from "lucide-react";

export function GuardOutcomeBadge({ outcome }: { outcome: GuardOutcome }) {
  switch (outcome) {
    case "PASS":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EBF3ED] text-[#234D31] border border-[#B8D7C2]">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#2E6941]" />
          PASS
        </span>
      );
    case "FLAGGED":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF6E9] text-[#6B4710] border border-[#F0D5B5]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#B07219]" />
          FLAGGED
        </span>
      );
    case "BLOCK":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FBE8E8] text-[#801414] border border-[#E8B8B8]">
          <XCircle className="w-3.5 h-3.5 text-[#BA1A1A]" />
          BLOCK
        </span>
      );
    case "INSUFFICIENT_EVIDENCE":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F5F2ED] text-[#5A5550] border border-[#DDD6CC]">
          <HelpCircle className="w-3.5 h-3.5 text-[#8C827A]" />
          INSUFFICIENT EVIDENCE
        </span>
      );
    case "CONFLICT":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F3ECFB] text-[#471E7D] border border-[#D5C2ED]">
          <AlertTriangle className="w-3.5 h-3.5 text-[#8A38F5]" />
          CONFLICT
        </span>
      );
  }
}

export function AnalysisStatusBadge({ status }: { status: AnalysisStatus }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EBF3ED] text-[#2E6941] border border-[#B8D7C2]">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    case "partial":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF6E9] text-[#B07219] border border-[#F0D5B5]">
          <Clock className="w-3 h-3" />
          Partial
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FBE8E8] text-[#BA1A1A] border border-[#E8B8B8]">
          <XCircle className="w-3 h-3" />
          Failed
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EFEAE1] text-[#1F1E1D] border border-[#E0D9CD]">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
  }
}

export function ValidationStatusBadge({
  status,
}: {
  status: "valid" | "invalid" | "validation_failed" | "retry_pending";
}) {
  switch (status) {
    case "valid":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#EBF3ED] text-[#2E6941] border border-[#B8D7C2]">
          <CheckCircle2 className="w-3 h-3" />
          Valid Schema
        </span>
      );
    case "invalid":
    case "validation_failed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FBE8E8] text-[#BA1A1A] border border-[#E8B8B8]">
          <XCircle className="w-3 h-3" />
          Validation Failed
        </span>
      );
    case "retry_pending":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#FFF6E9] text-[#B07219] border border-[#F0D5B5]">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Retry Pending
        </span>
      );
  }
}

import { useEvidence } from "@/context/EvidenceContext";

export function DemoRoleSelector({
  currentRole: propRole,
  onRoleChange: propOnChange,
}: {
  currentRole?: DemoRole;
  onRoleChange?: (role: DemoRole) => void;
} = {}) {
  const context = useEvidence();
  const currentRole = propRole ?? context.currentRole;
  const onRoleChange = propOnChange ?? context.setDemoRole;

  return (
    <div className="flex items-center gap-1.5 p-1 bg-[#EFEAE1] rounded-2xl border border-[#E0D9CD] text-xs">
      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] px-2 flex items-center gap-1">
        <SlidersHorizontal className="w-3 h-3" />
        Demo Role:
      </span>
      <button
        type="button"
        onClick={() => onRoleChange("employee")}
        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
          currentRole === "employee"
            ? "bg-white text-[#1F1E1D] shadow-sm border border-[#D5CDBD]"
            : "text-[#8C827A] hover:text-[#1F1E1D]"
        }`}
      >
        Employee
      </button>
      <button
        type="button"
        onClick={() => onRoleChange("reviewer")}
        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
          currentRole === "reviewer"
            ? "bg-[#DFE968] text-[#1F1E1D] shadow-sm border border-[#1C1C1C]"
            : "text-[#8C827A] hover:text-[#1F1E1D]"
        }`}
      >
        Reviewer
      </button>
      <button
        type="button"
        onClick={() => onRoleChange("admin")}
        className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
          currentRole === "admin"
            ? "bg-[#1C1C1C] text-white shadow-sm"
            : "text-[#8C827A] hover:text-[#1F1E1D]"
        }`}
      >
        Admin
      </button>
    </div>
  );
}

export function RestrictedAccessCard({
  requiredRole,
  onSwitchRole: propOnSwitch,
  screenName,
  reason,
}: {
  requiredRole: "Reviewer" | "Admin" | string;
  onSwitchRole?: (role: DemoRole) => void;
  screenName?: string;
  reason?: string;
}) {
  const { setDemoRole } = useEvidence();
  const onSwitchRole = propOnSwitch ?? setDemoRole;

  const targetRole: DemoRole = requiredRole.toLowerCase().includes("admin")
    ? "admin"
    : "reviewer";

  return (
    <div className="gl-card p-12 text-center space-y-4 my-8 max-w-lg mx-auto border-[#E0D9CD]">
      <div className="w-12 h-12 rounded-full bg-[#FFF6E9] border border-[#F0D5B5] flex items-center justify-center text-[#B07219] mx-auto">
        <Lock className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#1F1E1D]">
          {screenName ? `Restricted: ${screenName}` : "Restricted Demo Screen"}
        </h2>
        <p className="text-xs text-[#8C827A] mt-1.5 leading-relaxed">
          {reason || (
            <>
              This governance workspace is restricted to simulated{" "}
              <strong>{requiredRole}</strong> roles. Ordinary employee profiles cannot modify review queues or inspect injection logs.
            </>
          )}
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <button
          onClick={() => onSwitchRole(targetRole)}
          className="pill-btn pill-btn-primary text-xs"
        >
          Switch to {targetRole === "admin" ? "Admin" : "Reviewer"} Mode
        </button>
      </div>

      <p className="text-[10px] text-[#8C827A] italic">
        * Prototype notice: Role switching is provided for local demonstration. Real production authorization must be enforced by the backend API.
      </p>
    </div>
  );
}

export function DemoDataNotice({ message }: { message?: string }) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#FFF6E9] border border-[#F0D5B5] flex items-start gap-3">
      <ShieldAlert className="w-4 h-4 text-[#B07219] flex-shrink-0 mt-0.5" />
      <div className="text-[11px] text-[#6B4710] leading-relaxed">
        <strong>DEMO SIMULATION:</strong>{" "}
        {message ||
          "All work-analysis outputs, candidate extractions, guard outcomes, and review actions are client-side prototypes operating on hardcoded demo data."}
      </div>
    </div>
  );
}
