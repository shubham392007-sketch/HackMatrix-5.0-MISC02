"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { buildShareProjection } from "@/lib/sharingCalculations";
import {
  Download,
  Printer,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowLeft,
  Check,
  Info,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function PassportExportPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    skills,
    evidenceItems,
    targetRoles,
    draftPermissions,
  } = useEvidence();

  // Create temporary share record based on current draft permissions
  const tempShareRecord = useMemo(() => {
    return {
      shareId: "export-temp",
      label: draftPermissions.customLinkLabel || "Export Snapshot",
      status: "active" as const,
      createdAt: new Date().toISOString().split("T")[0],
      expiresAt: null,
      permissions: draftPermissions,
      accessCount: 0,
    };
  }, [draftPermissions]);

  const projection = useMemo(() => {
    return buildShareProjection(tempShareRecord, skills, evidenceItems, targetRoles);
  }, [tempShareRecord, skills, evidenceItems, targetRoles]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const exportDateDisplay = mounted
    ? new Date().toLocaleDateString()
    : "10/11/2026";

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Print & Export Skill Passport"
        description="Clean, high-fidelity PDF / print layout containing only your authorized verified capabilities."
        badge="DOMAIN 6 · EXPORT & VERIFICATION SNAPSHOT"
        badgeColor="peach"
      >
        <Link
          href="/app/passport/permissions"
          className="pill-btn pill-btn-ghost text-xs"
        >
          Adjust Export Content
        </Link>
        <button
          onClick={handlePrint}
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Printer className="w-3.5 h-3.5" />
          Print to PDF / Paper
        </button>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl w-full mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">

      {/* Printable Sheet */}
      <div className="bg-white text-black p-8 md:p-12 rounded-2xl border-2 border-black/20 shadow-md space-y-8 print:border-none print:shadow-none print:p-0 print:rounded-none">
        {/* Document Header */}
        <div className="border-b-2 border-black pb-6 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className="text-xl font-normal tracking-tight text-black leading-none"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                SkillPassport
              </span>
              <span
                className="text-sm font-normal text-black/70"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                by GrowthLens
              </span>
            </div>
            <div suppressHydrationWarning className="text-right text-[11px] font-mono text-black/60">
              Export Date: {exportDateDisplay} · Official Verification Snapshot
            </div>
          </div>

          <div className="pt-2">
            <h2 className="text-3xl font-extrabold tracking-tight">
              {projection.candidateProfile.displayName || "Alex Rivera"}
            </h2>
            <p className="text-sm font-semibold text-black/80 mt-1">
              {projection.candidateProfile.headline || "Senior Software Engineer"}
            </p>
            {projection.candidateProfile.contactEmail && (
              <p className="text-xs text-black/60 mt-1">
                Contact: {projection.candidateProfile.contactEmail}
              </p>
            )}
          </div>

          {projection.candidateProfile.summary && (
            <p className="text-xs text-black/80 leading-relaxed pt-2">
              {projection.candidateProfile.summary}
            </p>
          )}
        </div>

        {/* Section: Verified Capabilities */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black/20 pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-black">
              1. Verified Demonstrated Competencies
            </h3>
            <span className="text-xs font-mono font-bold text-black/60">
              {projection.verifiedSkills.length} Verified
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projection.verifiedSkills.map((s) => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-black/20 space-y-2 bg-stone-50/50 print:bg-transparent"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold">{s.canonicalName}</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-black/10">
                    {s.verifiedProficiency}
                  </span>
                </div>
                <p className="text-[11px] text-black/70 leading-relaxed">
                  {s.description}
                </p>
                <div className="text-[10px] text-black/50 pt-1 font-mono">
                  Supported by {s.evidenceCount} verified workplace artifacts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Supporting Evidence Summaries */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-black/20 pb-2">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-black">
              2. Authorized Supporting Evidence
            </h3>
            <span className="text-xs font-mono font-bold text-black/60">
              {projection.authorizedEvidence.length} Artifacts
            </span>
          </div>

          <div className="space-y-3">
            {projection.authorizedEvidence.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl border border-black/15 space-y-1.5 bg-stone-50/50 print:bg-transparent text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">{ev.title}</span>
                  <span className="text-[10px] font-mono text-black/60">
                    {ev.sourceType.toUpperCase()} · {ev.date}
                  </span>
                </div>
                <p className="text-[11px] text-black/70 leading-relaxed">
                  {ev.shortSummary}
                </p>
                <div className="text-[11px] text-black/90 font-medium">
                  <strong>Contribution:</strong> {ev.claimedContribution}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Role Alignment (if enabled) */}
        {projection.roleAlignment && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-black/20 pb-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-black">
                3. Role Alignment: {projection.roleAlignment.targetRoleTitle}
              </h3>
              <span className="text-xs font-mono font-bold">
                {projection.roleAlignment.alignmentScore}% Match Indicator
              </span>
            </div>

            <p className="text-xs text-black/80 leading-relaxed">
              {projection.roleAlignment.alignmentSummary}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] pt-1">
              <div>
                <strong>Demonstrated Strengths:</strong>
                <ul className="list-disc list-inside mt-0.5 text-black/70">
                  {projection.roleAlignment.strengths.map((st, i) => (
                    <li key={i}>{st}</li>
                  ))}
                </ul>
              </div>
              <div>
                <strong>Areas Without Verified Evidence:</strong>
                <ul className="list-disc list-inside mt-0.5 text-black/70">
                  {projection.roleAlignment.unsupportedAreas.map((u, i) => (
                    <li key={i}>{u}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Verification Guarantee & Disclaimer */}
        <div className="border-t-2 border-black/20 pt-6 text-center text-[11px] text-black/60 space-y-1">
          <p className="font-semibold text-black">
            {projection.verificationGuaranteeNote}
          </p>
          <p suppressHydrationWarning className="text-[10px] text-black/50">
            This document represents verified competencies extracted and confirmed as of {exportDateDisplay}. It does not constitute an employment endorsement or guarantee of future performance.
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
