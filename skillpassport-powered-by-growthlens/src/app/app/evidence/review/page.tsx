"use client";

import { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ShieldAlert,
  AlertTriangle,
  HelpCircle,
  Copy,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function EvidenceReviewPage() {
  const { evidenceItems, confirmContribution, updateCandidateSkillStatus } = useEvidence();

  const [activeTab, setActiveTab] = useState<
    "unreviewed" | "duplicates" | "insufficient"
  >("unreviewed");

  const unconfirmedItems = evidenceItems.filter(
    (e) => e.reviewStatus === "needs_confirmation" || e.reviewStatus === "pending_review"
  );
  const duplicateItems = evidenceItems.filter((e) => e.duplicateWarning?.isDuplicate);
  const insufficientItems = evidenceItems.filter(
    (e) => e.reviewStatus === "insufficient_evidence"
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Review &amp; Verification"
        description="Verify human attribution, review duplicate warnings, and evaluate candidate skills requiring attention."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        {/* Verification Guard Reminder */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] flex items-start gap-3 shadow-[2px_2px_0_0_#1C1C1C]">
          <ShieldAlert className="w-5 h-5 text-[#1C1C1C] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black uppercase tracking-wider block text-[#1C1C1C]">
              VERIFICATION GUARD PRINCIPLE
            </span>
            <p className="font-medium text-[#1C1C1C]/80">
              A skill without sufficient, validated evidence must never be displayed as verified. Unconfirmed team artifacts and theoretical certificates remain in this review queue until corroborated.
            </p>
          </div>
        </div>

        {/* Queue Category Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#1C1C1C]/15 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab("unreviewed")}
            className={`px-4 py-2 rounded-full border border-[#1C1C1C] text-xs font-black uppercase tracking-wider cursor-pointer ${
              activeTab === "unreviewed"
                ? "bg-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
                : "bg-[#FBF6DF] opacity-75"
            }`}
          >
            Needs Confirmation ({unconfirmedItems.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("duplicates")}
            className={`px-4 py-2 rounded-full border border-[#1C1C1C] text-xs font-black uppercase tracking-wider cursor-pointer ${
              activeTab === "duplicates"
                ? "bg-[#F6BB84] shadow-[2px_2px_0_0_#1C1C1C]"
                : "bg-[#FBF6DF] opacity-75"
            }`}
          >
            Duplicate Warnings ({duplicateItems.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("insufficient")}
            className={`px-4 py-2 rounded-full border border-[#1C1C1C] text-xs font-black uppercase tracking-wider cursor-pointer ${
              activeTab === "insufficient"
                ? "bg-[#F6C8D6] shadow-[2px_2px_0_0_#1C1C1C]"
                : "bg-[#FBF6DF] opacity-75"
            }`}
          >
            Insufficient Evidence ({insufficientItems.length})
          </button>
        </div>

        {/* Tab 1: Unreviewed Attribution */}
        {activeTab === "unreviewed" && (
          <div className="space-y-4">
            {unconfirmedItems.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C] font-bold text-xs">
                All uploaded and imported artifacts have been reviewed!
              </div>
            ) : (
              unconfirmedItems.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#C85A54] block">
                        ATTRIBUTION CONFIRMATION REQUIRED
                      </span>
                      <h4 className="text-base font-black text-[#1C1C1C]">{item.title}</h4>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#1C1C1C]/60">
                      {item.sourceReference}
                    </span>
                  </div>

                  <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed bg-[#FBF1CF] p-3 rounded-xl border border-[#1C1C1C]">
                    Claimed Contribution: &ldquo;{item.claimedContribution}&rdquo;
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => confirmContribution(item.id)}
                      className="pill-btn pill-btn-primary text-xs py-2 px-4"
                    >
                      CONFIRM &amp; VERIFY ATTRIBUTION →
                    </button>
                    <Link
                      href={`/app/evidence/library/${item.id}`}
                      className="text-xs font-bold underline hover:text-[#4A7A4E]"
                    >
                      Inspect Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Duplicate Evidence */}
        {activeTab === "duplicates" && (
          <div className="space-y-4">
            {duplicateItems.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-white space-y-4 shadow-[2.5px_2.5px_0_0_#1C1C1C]"
              >
                <div className="flex items-center gap-2 text-[#C85A54] font-black text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Cross-Source Overlap Detected</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                  <div className="p-4 rounded-xl border border-[#1C1C1C] bg-[#FBF6DF]">
                    <span className="font-black block mb-1">THIS ARTIFACT:</span>
                    <p className="font-bold">{item.title}</p>
                    <span className="text-[10px] text-[#1C1C1C]/60 font-mono">{item.sourceReference}</span>
                  </div>
                  <div className="p-4 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF]">
                    <span className="font-black block mb-1">OVERLAPPING RECORD:</span>
                    <p className="font-bold">Smart Irrigation Prediction Model (GitHub)</p>
                    <span className="text-[10px] text-[#1C1C1C]/60 font-mono">ID: ev-01</span>
                  </div>
                </div>

                <p className="text-xs text-[#1C1C1C]/80 italic">
                  Rationale: {item.duplicateWarning?.reason}
                </p>

                <div className="pt-2 flex gap-3">
                  <Link
                    href={`/app/evidence/analysis/${item.id}`}
                    className="pill-btn pill-btn-secondary text-xs py-2 px-4"
                  >
                    INSPECT WORK ANALYSIS
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Insufficient Evidence */}
        {activeTab === "insufficient" && (
          <div className="space-y-4">
            {insufficientItems.map((item) => (
              <div
                key={item.id}
                className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/30 space-y-3 shadow-[2.5px_2.5px_0_0_#1C1C1C]"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-black text-[#1C1C1C]">{item.title}</h4>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-[#F6C8D6] border border-[#1C1C1C] text-[#C85A54]">
                    INSUFFICIENT WORKPLACE PROOF
                  </span>
                </div>
                <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
                  While the credential was validated with high confidence, course completion alone does not demonstrate practical mastery. Provide a repository or project artifact to verify this competency.
                </p>
                <div className="pt-2">
                  <Link
                    href="/app/evidence/upload"
                    className="pill-btn pill-btn-primary text-xs py-2 px-4"
                  >
                    UPLOAD PRACTICAL PROJECT ARTIFACT →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
