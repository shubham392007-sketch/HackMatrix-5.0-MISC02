"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { PrivacyPreferences } from "@/types/account";
import { ConfirmationModal } from "@/components/app/AppStates";
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Share2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Info,
  Sliders,
  Database,
  Globe,
} from "lucide-react";

export default function PrivacyConsentPage() {
  const { privacyPreferences, updatePrivacyPreferences, addToast } =
    useEvidence();

  const [prefs, setPrefs] = useState<PrivacyPreferences>(privacyPreferences);
  const [hasChanges, setHasChanges] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const togglePref = (field: keyof PrivacyPreferences) => {
    setPrefs((prev) => {
      const next = { ...prev, [field]: !prev[field] };
      setHasChanges(true);
      return next;
    });
  };

  const handleSave = () => {
    updatePrivacyPreferences(prefs);
    setHasChanges(false);
  };

  const handleClearLocalData = () => {
    try {
      localStorage.clear();
      addToast(
        "Local Demo Storage Cleared",
        "Prototype cache cleared. Defaults restored upon refresh.",
        "info"
      );
    } catch {
      // Ignore
    }
    setIsResetModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Privacy & Data Governance"
        description="Candidate-controlled data boundaries, sharing defaults, and privacy consent protections."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Privacy & Consent" },
        ]}
      />

      <div className="p-6 lg:p-10 max-w-5xl space-y-8">
        {/* Core Sovereignty Banner */}
        <div className="p-6 rounded-2xl bg-[#DFE968]/20 border-2 border-[#DFE968] flex items-start gap-4 shadow-sm">
          <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs">
            <h3 className="text-sm font-bold text-ink">
              Candidate-Controlled Data Sovereignty & Minimization
            </h3>
            <p className="text-ink/80 leading-relaxed">
              SkillPassport is built on strict data minimization. We operate under zero-knowledge public sharing: external parties, recruiters, and third-party viewers can only inspect competencies and evidence items that you have explicitly authorized.
            </p>
          </div>
        </div>

        {/* Section A: Data-Use Overview */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-ink/70" />
            <h2 className="text-lg font-bold text-ink">
              Data Pipeline & Processing Lifecycle
            </h2>
          </div>
          <p className="text-xs text-ink/60 leading-relaxed">
            Understanding how your data flows through SkillPassport from ingestion to verified credential:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 space-y-1.5">
              <span className="font-mono font-bold text-[10px] text-ink/50 uppercase">
                Step 1: Read-Only Ingestion
              </span>
              <h4 className="font-bold text-ink">Source Normalization</h4>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                Tokens access read-only commit histories and resolved tickets. Internal passwords and proprietary keys are redacted.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 space-y-1.5">
              <span className="font-mono font-bold text-[10px] text-ink/50 uppercase">
                Step 2: Analysis & Quarantine
              </span>
              <h4 className="font-bold text-ink">Candidate Skill Claims</h4>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                Extracted claims are isolated. They are never projected as verified skills until corroborated by real deliverables.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 space-y-1.5">
              <span className="font-mono font-bold text-[10px] text-ink/50 uppercase">
                Step 3: Corroboration
              </span>
              <h4 className="font-bold text-ink">Empirical Verification</h4>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                Skills must meet artifact count, authorship attribution, and human review gates before receiving Verified status.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 space-y-1.5">
              <span className="font-mono font-bold text-[10px] text-ink/50 uppercase">
                Step 4: Selective Disclosure
              </span>
              <h4 className="font-bold text-ink">Gated Recruiter Links</h4>
              <p className="text-[11px] text-ink/70 leading-relaxed">
                You configure exactly which verified skills and evidence summaries are shared. Revoke access at any moment.
              </p>
            </div>
          </div>
        </div>

        {/* Section C: Evidence Visibility Tiers */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-ink/70" />
            <h2 className="text-lg font-bold text-ink">
              Evidence Disclosure Tiers
            </h2>
          </div>
          <p className="text-xs text-ink/60">
            SkillPassport enforces strict boundaries between internal evidence and public recruiter disclosure.
          </p>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink block">
                    Tier 1: Private Evidence Library (Default)
                  </span>
                  <p className="text-[11px] text-ink/70">
                    Stored exclusively in your personal workspace. Inaccessible to recruiters, hiring managers, or external links.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-2.5 py-1 rounded font-bold shrink-0">
                STRICTLY PRIVATE
              </span>
            </div>

            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink block">
                    Tier 2: Candidate Review & Audit Queue
                  </span>
                  <p className="text-[11px] text-ink/70">
                    Visible to internal reviewers evaluating skill claims against ingested deliverables. Internal provenance only.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-blue-100 text-blue-900 px-2.5 py-1 rounded font-bold shrink-0">
                INTERNAL REVIEW ONLY
              </span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink block">
                    Tier 3: Shared Summary Level (Recruiter Projection)
                  </span>
                  <p className="text-[11px] text-ink/70">
                    High-level capability summary and verified proficiency projected to authorized recruiter links. Deep repository URLs withheld.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded font-bold shrink-0">
                SELECTIVE SUMMARY
              </span>
            </div>

            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <Eye className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-ink block">
                    Tier 4: Deep Artifact Inspection
                  </span>
                  <p className="text-[11px] text-ink/70">
                    Explicitly authorized for deep technical loops. Enables recruiters to inspect sanitized PR diffs and commit hashes.
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] bg-purple-100 text-purple-900 px-2.5 py-1 rounded font-bold shrink-0">
                EXPLICIT DETAIL CONSENT
              </span>
            </div>
          </div>
        </div>

        {/* Section D: Passport Sharing Defaults */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                <Sliders className="w-5 h-5 text-ink/70" />
                <span>Default Preferences for New Recruiter Links</span>
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                These defaults pre-populate the Share Wizard in Domain 6. They do not alter already active links.
              </p>
            </div>
            {hasChanges && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-1.5 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-bold shadow-sm transition-all"
              >
                Save Defaults
              </button>
            )}
          </div>

          <div className="space-y-3 text-xs">
            {/* Share Verified Only (Non-negotiable) */}
            <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-ink block">
                  Enforce Verified Skills Only (Non-Negotiable)
                </span>
                <p className="text-[11px] text-ink/60">
                  Unverified claims and candidate skills are permanently barred from recruiter sharing.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-bold text-[10px]">
                ALWAYS ACTIVE
              </span>
            </div>

            {/* Exclude Contact Info by Default */}
            <div className="p-4 rounded-xl bg-white border border-ink/15 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-ink block">
                  Hide Contact Details by Default
                </span>
                <p className="text-[11px] text-ink/60">
                  Keep email and LinkedIn hidden until you choose to disclose them on a specific recruiter link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePref("excludeContactInfoDefault")}
                className={`w-11 h-6 rounded-full border border-ink/20 p-0.5 transition-colors ${
                  prefs.excludeContactInfoDefault ? "bg-ink" : "bg-ink/20"
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                    prefs.excludeContactInfoDefault ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Require Explicit Detail Inspection */}
            <div className="p-4 rounded-xl bg-white border border-ink/15 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-ink block">
                  Require Explicit Authorization for Detailed Artifact Inspection
                </span>
                <p className="text-[11px] text-ink/60">
                  New share links default to high-level summaries only, protecting code repository URLs.
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePref("requireExplicitDetailConsent")}
                className={`w-11 h-6 rounded-full border border-ink/20 p-0.5 transition-colors ${
                  prefs.requireExplicitDetailConsent ? "bg-ink" : "bg-ink/20"
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                    prefs.requireExplicitDetailConsent ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Anonymize Organization Names */}
            <div className="p-4 rounded-xl bg-white border border-ink/15 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-ink block">
                  Anonymize Employer & Client Names in Summaries
                </span>
                <p className="text-[11px] text-ink/60">
                  Mask specific company names as 'Enterprise Client' or 'Internal Platform'.
                </p>
              </div>
              <button
                type="button"
                onClick={() => togglePref("anonymizeOrganizationNames")}
                className={`w-11 h-6 rounded-full border border-ink/20 p-0.5 transition-colors ${
                  prefs.anonymizeOrganizationNames ? "bg-ink" : "bg-ink/20"
                }`}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full bg-white transition-transform ${
                    prefs.anonymizeOrganizationNames ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section E: Active Links Management & Data Deletion */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Share2 className="w-4 h-4 text-ink/70" />
              <span>Active Recruiter Links</span>
            </h3>
            <p className="text-xs text-ink/70 leading-relaxed">
              Review, update, or instantly revoke active public recruiter links created through Domain 6.
            </p>
            <div className="pt-2">
              <Link
                href="/app/passport/access"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-[#FBF1CF] hover:bg-ink/90 text-xs font-semibold shadow-sm"
              >
                <span>Manage & Revoke Links</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-rose-50/60 border border-rose-200 shadow-sm space-y-3">
            <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-700" />
              <span>Prototype Data Reset</span>
            </h3>
            <p className="text-xs text-rose-900/80 leading-relaxed">
              Clear local client-side prototype storage and reset demo data back to the clean architectural benchmark.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-800 text-xs font-semibold shadow-sm transition-all"
              >
                Clear Prototype Cache
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Prototype Storage */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Reset Local Prototype Storage?"
        message="This will clear your local client-side state and restore the baseline demo configuration across all domains."
        confirmLabel="Reset Prototype Cache"
        cancelLabel="Cancel"
        isDestructive={true}
        onConfirm={handleClearLocalData}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
