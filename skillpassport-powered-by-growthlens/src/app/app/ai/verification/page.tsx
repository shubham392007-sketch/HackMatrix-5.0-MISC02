"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { DemoDataNotice } from "@/components/app/AIBadges";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
} from "@/components/app/SkillBadges";
import {
  Scale,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  GitCompare,
} from "lucide-react";

export default function SkillVerificationReviewPage() {
  const {
    verifications,
    evidenceItems,
    updateVerification,
    addAIAuditEvent,
  } = useEvidence();

  const [selectedVerificationId, setSelectedVerificationId] = useState<string>(
    verifications[0]?.verification_id || "ver-01"
  );
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [simulatedActionMessage, setSimulatedActionMessage] = useState<string | null>(null);

  const activeVerification = verifications.find(
    (v) => v.verification_id === selectedVerificationId
  );

  const filteredList = verifications.filter((v) => {
    const q = search.toLowerCase();
    const matchesSearch =
      v.skill_name.toLowerCase().includes(q) ||
      v.decision_rationale.toLowerCase().includes(q);
    const matchesStatus =
      filterStatus === "all" || v.verification_status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const verifiedCount = verifications.filter((v) => v.verification_status === "verified").length;
  const pendingCount = verifications.filter((v) => v.verification_status === "pending_review").length;
  const insufficientCount = verifications.filter((v) => v.verification_status === "insufficient_evidence").length;

  const handleSimulateDecision = (action: "approve" | "reject" | "insufficient") => {
    if (!activeVerification) return;

    const newStatus =
      action === "approve"
        ? "verified"
        : action === "reject"
        ? "not_verified"
        : "insufficient_evidence";

    updateVerification(activeVerification.verification_id, {
      verification_status: newStatus,
      last_reviewed: "Just now",
    });

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "review_decision",
      affected_entity_type: "verification",
      affected_entity_id: activeVerification.verification_id,
      previous_state: activeVerification.verification_status,
      new_state: newStatus,
      reason: `Simulated reviewer action: ${action.toUpperCase()}`,
      actor: "Reviewer (Alex Rivera)",
      model_or_policy_version: activeVerification.verification_policy_version,
    });

    setSimulatedActionMessage(`Simulated action recorded: ${newStatus.toUpperCase()}`);
    setTimeout(() => setSimulatedActionMessage(null), 4000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/ai" className="hover:text-[#1F1E1D]">
              AI Intelligence
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Verification Review</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Skill Verification Review
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Audit the current verification state of competencies against organizational rubrics and corroborating artifacts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/ai/confidence"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            Confidence & Uncertainty
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <DemoDataNotice />

      {simulatedActionMessage && (
        <div className="p-3.5 rounded-2xl bg-[#EBF3ED] border border-[#B8D7C2] text-xs text-[#234D31] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
          <span>{simulatedActionMessage}</span>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Verified
          </span>
          <div className="text-2xl font-extrabold text-[#2E6941] mt-1">{verifiedCount}</div>
          <p className="text-[11px] text-[#8C827A]">Meets policy thresholds</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Pending Review
          </span>
          <div className="text-2xl font-extrabold text-[#B07219] mt-1">{pendingCount}</div>
          <p className="text-[11px] text-[#8C827A]">Awaiting technical review</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Insufficient Evidence
          </span>
          <div className="text-2xl font-extrabold text-[#BA1A1A] mt-1">{insufficientCount}</div>
          <p className="text-[11px] text-[#8C827A]">Theory/self-claim only</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Total Monitored
          </span>
          <div className="text-2xl font-extrabold text-[#1F1E1D] mt-1">{verifications.length}</div>
          <p className="text-[11px] text-[#8C827A]">Claims evaluated</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="gl-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search competencies or rationales..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-10 text-xs w-full"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer font-medium"
          >
            <option value="all">All Verification States</option>
            <option value="verified">Verified</option>
            <option value="pending_review">Pending Review</option>
            <option value="insufficient_evidence">Insufficient Evidence</option>
            <option value="not_verified">Not Verified</option>
          </select>
        </div>
      </div>

      {/* Two Column Workspace: Table on left (7 cols), Detail on right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Table (7 cols) */}
        <div className="lg:col-span-7 gl-card overflow-hidden border-[#E4DDD3]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#EBE5DC] text-[11px] uppercase tracking-wider text-[#8C827A]">
                <tr>
                  <th className="py-3 px-4 font-bold">Skill Claim</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Evidence</th>
                  <th className="py-3 px-4 font-bold">Confidence</th>
                  <th className="py-3 px-4 font-bold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {filteredList.map((ver) => {
                  const isSelected = ver.verification_id === selectedVerificationId;

                  return (
                    <tr
                      key={ver.verification_id}
                      onClick={() => setSelectedVerificationId(ver.verification_id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#F7F4EC]" : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-[#1F1E1D]">
                        <div>{ver.skill_name}</div>
                        <div className="text-[10px] text-[#8C827A] font-normal">
                          Claimed: {ver.claimed_proficiency}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <SkillVerificationBadge state={ver.verification_status as any} />
                      </td>
                      <td className="py-3.5 px-4 text-[#5A5550]">
                        <span className="font-bold text-[#1F1E1D]">
                          {ver.supporting_evidence_ids.length}
                        </span>{" "}
                        artifacts ({ver.evidence_strength})
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1F1E1D]">
                        {ver.extraction_confidence}%
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedVerificationId(ver.verification_id)}
                          className="font-bold text-[#1F1E1D] hover:text-[#2E6941] inline-flex items-center gap-1"
                        >
                          View
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel (5 cols) */}
        <div className="lg:col-span-5 gl-card p-6 space-y-5 border-[#E4DDD3]">
          {!activeVerification ? (
            <div className="text-center py-12 text-xs text-[#8C827A]">
              Select a verification record to review.
            </div>
          ) : (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Verification Case Detail
                </span>
                <div className="flex items-center justify-between gap-2 mt-1">
                  <h3 className="text-lg font-bold text-[#1F1E1D]">
                    {activeVerification.skill_name}
                  </h3>
                  <SkillVerificationBadge state={activeVerification.verification_status as any} />
                </div>
              </div>

              {/* Strict Measurement Separation Card */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                  Calibrated Measurement Breakdown
                </span>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-white border border-[#E0D9CD]">
                    <span className="text-[#8C827A] block text-[9px] uppercase font-bold">
                      Extraction Confidence
                    </span>
                    <span className="text-base font-black text-[#1F1E1D]">
                      {activeVerification.extraction_confidence}%
                    </span>
                    <span className="text-[9px] text-[#8C827A] block">NLP recognition</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-[#E0D9CD]">
                    <span className="text-[#8C827A] block text-[9px] uppercase font-bold">
                      Evidence Strength
                    </span>
                    <span className="text-base font-black uppercase text-[#2E6941]">
                      {activeVerification.evidence_strength}
                    </span>
                    <span className="text-[9px] text-[#8C827A] block">Artifact weight</span>
                  </div>
                </div>
              </div>

              {/* Rationale & Decisions */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Decision Rationale
                </span>
                <p className="p-3 rounded-xl bg-white border border-[#EBE5DC] text-[#5A5550] leading-relaxed">
                  {activeVerification.decision_rationale}
                </p>
              </div>

              {/* Proficiency Rationale */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Proficiency Assessment Rubric
                </span>
                <p className="text-[11px] text-[#5A5550]">
                  {activeVerification.proficiency_rationale}
                </p>
              </div>

              {/* Missing Evidence Indicators */}
              {activeVerification.missing_evidence_needed && (
                <div className="p-3 rounded-xl bg-[#FFF6E9] border border-[#F0D5B5] text-[11px] text-[#B07219] space-y-1">
                  <strong>Required to advance verification:</strong>
                  {activeVerification.missing_evidence_needed.map((m, i) => (
                    <div key={i}>• {m}</div>
                  ))}
                </div>
              )}

              {/* Policy Version & Metadata */}
              <div className="pt-2 border-t border-[#F0EBE1] text-[11px] text-[#8C827A] flex justify-between">
                <span>Policy: <strong className="text-[#1F1E1D]">{activeVerification.verification_policy_version}</strong></span>
                <span>Reviewed: {activeVerification.last_reviewed}</span>
              </div>

              {/* Simulated Reviewer Actions */}
              <div className="pt-3 border-t border-[#F0EBE1] space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                  Simulated Review Actions (Prototype)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleSimulateDecision("approve")}
                    className="pill-btn pill-btn-primary text-[11px] justify-center py-1.5"
                  >
                    Promote
                  </button>
                  <button
                    onClick={() => handleSimulateDecision("insufficient")}
                    className="pill-btn pill-btn-secondary text-[11px] justify-center py-1.5 text-[#B07219]"
                  >
                    Insufficient
                  </button>
                  <button
                    onClick={() => handleSimulateDecision("reject")}
                    className="pill-btn pill-btn-secondary text-[11px] justify-center py-1.5 text-[#BA1A1A]"
                  >
                    Reject
                  </button>
                </div>

                <div className="pt-2 flex justify-between text-xs">
                  <Link
                    href={`/app/passport/skills/${activeVerification.skill_id}`}
                    className="font-bold text-[#1F1E1D] hover:underline"
                  >
                    Open Skill Profile →
                  </Link>
                  <Link
                    href="/app/ai/audit"
                    className="text-[#8C827A] hover:underline"
                  >
                    View Audit Events
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
