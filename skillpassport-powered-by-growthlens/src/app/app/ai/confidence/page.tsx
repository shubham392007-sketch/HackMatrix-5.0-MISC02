"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { DemoDataNotice } from "@/components/app/AIBadges";
import {
  Percent,
  Search,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Info,
  Calendar,
  Layers,
  HelpCircle,
  FileText,
} from "lucide-react";

export default function ConfidenceUncertaintyPage() {
  const { confidenceClaims } = useEvidence();
  const [selectedClaimId, setSelectedClaimId] = useState<string>(
    confidenceClaims[0]?.id || "conf-claim-01"
  );
  const [search, setSearch] = useState("");

  const activeClaim = confidenceClaims.find((c) => c.id === selectedClaimId);

  const filteredClaims = confidenceClaims.filter((c) => {
    const q = search.toLowerCase();
    return c.skill_name.toLowerCase().includes(q);
  });

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
            <span className="text-[#1F1E1D]">Confidence & Uncertainty</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Confidence & Uncertainty
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Calibrated trust metrics communicating how information was extracted, what assumptions were made, and where coverage gaps remain.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/ai/conflicts"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            Conflict Resolution
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <DemoDataNotice />

      {/* Philosophy Card: Separate Measurement Types */}
      <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5] space-y-3">
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-[#4361EE]" />
          <h2 className="text-base font-bold text-[#1F1E1D]">
            Deconstructed Trust: Four Distinct Measurements
          </h2>
        </div>
        <p className="text-xs text-[#5A5550] leading-relaxed max-w-3xl">
          SkillPassport never conflates statistical extraction certainty with verified workplace capability. A 99% NLP confidence score on an online certificate still equals insufficient evidence for an enterprise practitioner claim.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4361EE] block">
              Extraction Confidence
            </span>
            <p className="text-xs font-bold text-[#1F1E1D] mt-1">NLP Recognition</p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              How accurately the language model read the text or OCR tokens.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#B07219] block">
              Evidence Strength
            </span>
            <p className="text-xs font-bold text-[#1F1E1D] mt-1">Artifact Rigor</p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Production commits &gt; Capstone specs &gt; Certificates &gt; Self-claims.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A38F5] block">
              Proficiency Estimate
            </span>
            <p className="text-xs font-bold text-[#1F1E1D] mt-1">Rubric Suggestion</p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              The theoretical level suggested by code complexity and depth.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white border border-[#E0D9CD]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E6941] block">
              Verification State
            </span>
            <p className="text-xs font-bold text-[#1F1E1D] mt-1">Policy Outcome</p>
            <p className="text-[11px] text-[#8C827A] mt-1">
              Authoritative stamp awarded only when rigorous thresholds are met.
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Workspace: Claims Selector on Left (4 cols), Detail on Right (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Claims List (4 cols) */}
        <div className="lg:col-span-4 gl-card p-4 space-y-3 border-[#E4DDD3]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] px-2 block">
            Monitored Competency Claims ({confidenceClaims.length})
          </span>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search claims..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-9 text-xs w-full py-1.5"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto">
            {filteredClaims.map((claim) => {
              const isSelected = claim.id === selectedClaimId;

              return (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaimId(claim.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? "bg-[#F7F4EC] border-[#1C1C1C] shadow-sm font-bold"
                      : "bg-[#FAF8F5] border-[#EBE5DC] hover:border-[#D5CDBD]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#1F1E1D]">{claim.skill_name}</span>
                    <span className="text-[11px] font-mono font-bold text-[#1F1E1D]">
                      {claim.extraction_confidence}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#8C827A] mt-1.5 font-normal">
                    <span>Strength: <strong className="uppercase">{claim.evidence_strength}</strong></span>
                    <span>Coverage: {claim.coverage_score}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Confidence & Uncertainty Inspector (8 cols) */}
        <div className="lg:col-span-8 gl-card p-6 space-y-6 border-[#E4DDD3]">
          {!activeClaim ? (
            <div className="text-center py-12 text-xs text-[#8C827A]">
              Select a competency claim to inspect confidence and uncertainty metrics.
            </div>
          ) : (
            <>
              {/* Header Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EBE1]">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                    Competency Calibration Detail
                  </span>
                  <h3 className="text-2xl font-extrabold text-[#1F1E1D] mt-0.5">
                    {activeClaim.skill_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#5A5550]">
                    <span>Status: <strong className="text-[#1F1E1D]">{activeClaim.verification_state}</strong></span>
                    <span>•</span>
                    <span>Rubric Estimate: <strong>{activeClaim.proficiency_estimate}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DC]">
                    <div className="text-2xl font-black text-[#4361EE]">
                      {activeClaim.extraction_confidence}%
                    </div>
                    <span className="text-[9px] uppercase font-bold text-[#8C827A]">
                      Model Conf.
                    </span>
                  </div>
                  <div className="text-center p-3 rounded-2xl bg-[#FAF8F5] border border-[#EBE5DC]">
                    <div className="text-2xl font-black text-[#2E6941]">
                      {activeClaim.coverage_score}%
                    </div>
                    <span className="text-[9px] uppercase font-bold text-[#8C827A]">
                      Coverage Depth
                    </span>
                  </div>
                </div>
              </div>

              {/* Insufficient Evidence Warning Banner if applicable */}
              {activeClaim.evidence_volume === 0 || activeClaim.evidence_strength === "low" ? (
                <div className="p-4 rounded-2xl bg-[#FFF6E9] border border-[#F0D5B5] space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#6B4710]">
                    <AlertTriangle className="w-4 h-4 text-[#B07219]" />
                    <span>INSUFFICIENT EVIDENCE FOR PRACTICAL CONCLUSION</span>
                  </div>
                  <p className="text-[11px] text-[#6B4710] leading-relaxed">
                    Available evidence does not support a reliable conclusion for this claim or claimed proficiency tier. High text recognition confidence does not substitute for empirical codebase artifacts.
                  </p>
                </div>
              ) : null}

              {/* Artifact Health & Recency Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                    Evidence Volume
                  </span>
                  <div className="text-lg font-bold text-[#1F1E1D] mt-1">
                    {activeClaim.evidence_volume} Artifacts
                  </div>
                  <span className="text-[10px] text-[#8C827A]">Corroborating items</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                    Latest Activity
                  </span>
                  <div className="text-lg font-bold text-[#1F1E1D] mt-1">
                    {activeClaim.evidence_recency}
                  </div>
                  <span className="text-[10px] text-[#8C827A]">Freshness indicator</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                    Artifact Quality
                  </span>
                  <div className="text-lg font-bold text-[#2E6941] uppercase mt-1">
                    {activeClaim.evidence_strength}
                  </div>
                  <span className="text-[10px] text-[#8C827A]">Direct code attribution</span>
                </div>
              </div>

              {/* Uncertainty Reasons */}
              <div className="gl-card p-5 space-y-2 border-[#E4DDD3]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#B07219] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Identified Uncertainty Boundaries
                </span>
                <ul className="space-y-1.5 text-xs text-[#5A5550]">
                  {activeClaim.uncertainty_reasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B07219] mt-1.5 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What Additional Evidence is Needed */}
              <div className="gl-card p-5 space-y-2 border-[#E4DDD3]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#2E6941] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Remediation: What Would Elevate This Claim?
                </span>
                <ul className="space-y-1.5 text-xs text-[#5A5550]">
                  {activeClaim.needed_to_improve.map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#2E6941] mt-1.5 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Footer Links */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <Link
                  href={`/app/passport/skills/${activeClaim.skill_id}`}
                  className="font-bold text-[#1F1E1D] hover:underline"
                >
                  View Full Competency Profile →
                </Link>
                <Link
                  href="/app/ai/guard"
                  className="font-semibold text-[#8C827A] hover:text-[#1F1E1D]"
                >
                  Inspect Hallucination Guard Rule
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
