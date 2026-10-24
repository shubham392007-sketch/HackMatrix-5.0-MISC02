"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Download,
  Printer,
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowLeft,
  Check,
  Info,
  Loader2,
  FileText,
  Tag,
  Sparkles,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { sharingApi } from "@/lib/sharingApi";
import { ShareProjection, PassportTemplateId } from "@/types/sharing";
import PassportOptionalSections from "@/components/passport/templates/PassportOptionalSections";

export default function PassportExportPage() {
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTemplate, setSelectedTemplate] = useState<PassportTemplateId>("classic");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const data = await sharingApi.getDraftPreview({
          templateId: selectedTemplate,
        });
        setProjection(data);
      } catch (err) {
        console.error("Failed to load export projection:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedTemplate]);

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const currentDateDisplay = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Print & Export Passport"
        description="Clean, high-fidelity PDF / print layout containing only authorized verified capabilities and candidate evidence."
        badge="Domain 6 · Official Export"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrint}
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3.5 flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print to PDF</span>
          </button>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-4xl w-full mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
        {/* Print Instruction Card (hidden on print) */}
        <div className="print:hidden p-4 rounded-2xl bg-paper border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-ink/80">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-peach shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-ink">Export Configuration: </span>
              Use the button above or press <kbd className="font-mono bg-ink/5 px-1.5 py-0.5 rounded border border-ink/20">Ctrl + P</kbd> / <kbd className="font-mono bg-ink/5 px-1.5 py-0.5 rounded border border-ink/20">⌘ + P</kbd> to save as PDF. Backgrounds and shadows are automatically optimized for print.
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-4 shrink-0"
          >
            Print / PDF
          </button>
        </div>

        {loading ? (
          <div className="gl-card p-16 text-center space-y-3 print:hidden">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink/70" />
            <p className="text-xs text-ink/60">Compiling official verified passport document...</p>
          </div>
        ) : projection ? (
          /* Printable Sheet */
          <div className="bg-white text-black p-8 md:p-12 rounded-2xl border-2 border-black/20 shadow-md space-y-8 print:border-none print:shadow-none print:p-0 print:rounded-none">
            {/* Document Header */}
            <div className="border-b-2 border-black pb-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl font-normal tracking-tight text-black leading-none"
                    style={{ fontFamily: "'Yellowtail', cursive" }}
                  >
                    SkillPassport
                  </span>
                  <span className="text-xs uppercase font-extrabold tracking-wider bg-black text-white px-2 py-0.5 rounded">
                    Official Credential
                  </span>
                </div>
                <div className="text-right text-[11px] font-mono text-black/60">
                  Export Date: {currentDateDisplay}
                </div>
              </div>

              <div className="pt-2">
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {projection.candidateProfile.displayName || "Verified Candidate"}
                </h1>
                {projection.candidateProfile.headline && (
                  <p className="text-sm font-semibold text-black/80 mt-1">
                    {projection.candidateProfile.headline}
                  </p>
                )}
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

            {/* Section 1: Verified Demonstrated Competencies */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/20 pb-2">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-black">
                  1. Verified Demonstrated Competencies ({projection.verifiedSkills.length})
                </h2>
                <span className="text-xs font-mono font-bold text-black/60">
                  PostgreSQL Verified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projection.verifiedSkills.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border border-black/20 space-y-2 bg-stone-50/50 print:bg-transparent"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-black">{s.canonicalName}</span>
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

            {/* Section 2: Candidate-Declared Custom Skills (if any) */}
            {projection.customSkills && projection.customSkills.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-black">
                    2. Candidate-Declared Skills ({projection.customSkills.length})
                  </h2>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    User-Declared · Not Independently Verified
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projection.customSkills.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-amber-300/80 space-y-2 bg-amber-50/30 print:bg-transparent"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-black">{c.title}</span>
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-amber-200/60 text-amber-900">
                          {c.selfAssessedLevel}
                        </span>
                      </div>
                      <p className="text-[11px] text-black/70 leading-relaxed">
                        {c.description}
                      </p>
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {c.tags.map((t, idx) => (
                            <span key={idx} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/5 text-black/70">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Candidate Sections (Work Experience, Education, Projects, Certifications, etc.) */}
            <div className="pt-2">
              <PassportOptionalSections
                projection={projection}
                theme="classic"
              />
            </div>

            {/* Section 3: Authorized Supporting Evidence */}
            {projection.authorizedEvidence && projection.authorizedEvidence.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-black">
                    3. Authorized Supporting Evidence ({projection.authorizedEvidence.length})
                  </h2>
                  <span className="text-xs font-mono font-bold text-black/60">
                    Workplace Artifacts
                  </span>
                </div>

                <div className="space-y-3">
                  {projection.authorizedEvidence.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-xl border border-black/15 space-y-1.5 bg-stone-50/50 print:bg-transparent text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-black">{ev.title}</span>
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
            )}

            {/* Section 4: Role Alignment (if authorized) */}
            {projection.roleAlignment && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <h2 className="text-sm font-extrabold uppercase tracking-wider text-black">
                    4. Target Role Alignment: {projection.roleAlignment.targetRoleTitle}
                  </h2>
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
                {projection.verificationGuaranteeNote ||
                  "Verified through workplace evidence. Candidate-declared skills are explicitly marked unverified."}
              </p>
              <p className="text-[10px] text-black/50">
                This document represents verified competencies extracted and confirmed as of {currentDateDisplay}. It does not constitute an employment endorsement or guarantee of future performance.
              </p>
            </div>
          </div>
        ) : (
          <div className="gl-card p-8 text-center text-xs text-rose-700">
            Unable to load export projection.
          </div>
        )}
      </div>
    </div>
  );
}
