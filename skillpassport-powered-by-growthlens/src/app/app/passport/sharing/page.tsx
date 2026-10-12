"use client";

import React from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Share2,
  ShieldCheck,
  Eye,
  Link2,
  SlidersHorizontal,
  Lock,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  FileText,
  UserCheck,
  FileCheck2,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function PassportSharingOverviewPage() {
  const { skills, evidenceItems, shareRecords } = useEvidence();

  // Metrics strictly computed from shared state
  const verifiedSkillsCount = skills.filter(
    (s) => s.verificationState === "verified"
  ).length;
  const candidateSkillsCount = skills.filter(
    (s) => s.verificationState !== "verified"
  ).length;
  const eligibleEvidenceCount = evidenceItems.filter(
    (e) => e.reviewStatus === "verified" || e.processingStatus === "indexed"
  ).length;

  const activeLinks = shareRecords.filter((r) => r.status === "active");
  const revokedLinks = shareRecords.filter((r) => r.status === "revoked");
  const expiredLinks = shareRecords.filter((r) => r.status === "expired");

  const mostRecentLink = shareRecords[0];

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Share Demonstrated Capabilities"
        description="Configure selective recruiter access, preview candidate projections, and manage live links."
        badge="Domain 6 · Recruiter Experience"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/preview"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Eye className="w-3 h-3" />
            <span>Preview</span>
          </Link>
          <Link
            href="/app/passport/share"
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Link2 className="w-3 h-3" />
            <span>Create Link &rarr;</span>
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Security / Verification Notice */}
        <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 flex items-start gap-3">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold block mb-0.5">
              Evidence-Backed Verification Guarantee:
            </span>
            Only skills with explicit <span className="font-bold">VERIFIED</span> status are eligible for public recruiter passports. Candidate competencies, diagnostic scores, and course certificates remain private until validated through workplace proof in Domain 3.
          </div>
        </div>

      {/* Grid: Passport Readiness & Current Share Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section A: Passport Readiness */}
        <div className="gl-card p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Passport Sharing Readiness
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Ready to Share
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
              <span className="text-xs text-ink/60">Verified Skills</span>
              <div className="text-2xl font-extrabold text-ink">
                {verifiedSkillsCount}
              </div>
              <p className="text-[11px] text-emerald-700 font-semibold">
                Available for public disclosure
              </p>
            </div>

            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-1">
              <span className="text-xs text-ink/60">Eligible Evidence</span>
              <div className="text-2xl font-extrabold text-ink">
                {eligibleEvidenceCount} Items
              </div>
              <p className="text-[11px] text-ink/50">
                Repositories, Jira tasks, RFCs
              </p>
            </div>
          </div>

          <div className="space-y-2.5 pt-1 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
              <span className="text-ink/70">Candidate / Unverified Skills (Excluded):</span>
              <span className="font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                {candidateSkillsCount} Ineligible
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
              <span className="text-ink/70">Underlying Passport Freshness:</span>
              <span className="font-semibold text-ink">Today, 11:45 AM</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
              <span className="text-ink/70">Public Recruiter Projection:</span>
              <span className="font-bold text-emerald-700">Allowlist Enforced</span>
            </div>
          </div>
        </div>

        {/* Section B: Current Share Status */}
        <div className="gl-card p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Link2 className="w-4 h-4 text-peach" />
              Active Share Links & Access
            </h2>
            <Link
              href="/app/passport/access"
              className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
            >
              Manage Access →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
              <span className="text-[11px] text-ink/60 font-semibold">Active</span>
              <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                {activeLinks.length}
              </div>
            </div>

            <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
              <span className="text-[11px] text-ink/60 font-semibold">Revoked</span>
              <div className="text-xl font-extrabold text-rose-700 mt-0.5">
                {revokedLinks.length}
              </div>
            </div>

            <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
              <span className="text-[11px] text-ink/60 font-semibold">Expired</span>
              <div className="text-xl font-extrabold text-stone-600 mt-0.5">
                {expiredLinks.length}
              </div>
            </div>
          </div>

          {mostRecentLink && (
            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink">{mostRecentLink.label}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {mostRecentLink.status.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-ink/60">
                Created: {mostRecentLink.createdAt} · Accesses: {mostRecentLink.accessCount}
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/p/${mostRecentLink.shareId}`}
                  target="_blank"
                  className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Recruiter Page
                </Link>
                <span className="text-ink/20">|</span>
                <Link
                  href="/app/passport/access"
                  className="text-xs text-ink/70 hover:text-ink"
                >
                  Configure / Revoke
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Section C: Main Actions Navigation Hub */}
      <div className="gl-card p-6 md:p-8 space-y-4">
        <h2 className="text-base font-extrabold text-ink">
          Passport Sharing Hub Actions
        </h2>
        <p className="text-xs text-ink/70">
          Everything you need to configure visibility, review recruiter experience, and grant or revoke access.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
          <Link
            href="/app/passport/preview"
            className="p-4 bg-paper rounded-2xl border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-peach/20 flex items-center justify-center text-ink group-hover:scale-105 transition-transform">
              <Eye className="w-4 h-4" />
            </div>
            <div className="text-xs font-extrabold text-ink">Preview Passport</div>
            <p className="text-[11px] text-ink/60 leading-relaxed">
              Inspect exactly what recruiters will see before creating links.
            </p>
          </Link>

          <Link
            href="/app/passport/share"
            className="p-4 bg-paper rounded-2xl border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-105 transition-transform">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="text-xs font-extrabold text-ink">Create Share Link</div>
            <p className="text-[11px] text-ink/60 leading-relaxed">
              Step-by-step wizard to selectively pick skills and expiry rules.
            </p>
          </Link>

          <Link
            href="/app/passport/permissions"
            className="p-4 bg-paper rounded-2xl border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 group-hover:scale-105 transition-transform">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div className="text-xs font-extrabold text-ink">Sharing Permissions</div>
            <p className="text-[11px] text-ink/60 leading-relaxed">
              Configure fine-grained identity and evidence detail access.
            </p>
          </Link>

          <Link
            href="/app/passport/access"
            className="p-4 bg-paper rounded-2xl border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800 group-hover:scale-105 transition-transform">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs font-extrabold text-ink">Manage Access</div>
            <p className="text-[11px] text-ink/60 leading-relaxed">
              Monitor active links, review access history, and revoke anytime.
            </p>
          </Link>

          <Link
            href="/app/passport/export"
            className="p-4 bg-paper rounded-2xl border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-blue-800 group-hover:scale-105 transition-transform">
              <Download className="w-4 h-4" />
            </div>
            <div className="text-xs font-extrabold text-ink">Export Passport</div>
            <p className="text-[11px] text-ink/60 leading-relaxed">
              Generate a clean, print-friendly verification document.
            </p>
          </Link>
        </div>
      </div>

      {/* Section D: What is Included / Excluded in a Standard Share */}
      <div className="gl-card p-6 md:p-8 space-y-6">
        <div>
          <h2 className="text-base font-extrabold text-ink">
            Disclosure Transparency & Data Boundaries
          </h2>
          <p className="text-xs text-ink/70 mt-0.5">
            Understand exactly what recruiters can see versus what is strictly protected.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Included in Standard Share */}
          <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Included in a Standard Share
            </div>
            <ul className="space-y-2 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span><strong>Candidate Identity:</strong> Display name and professional headline.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span><strong>Verified Skills:</strong> Only canonical skills with confirmed proof (4 active).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span><strong>Proficiency Levels:</strong> Foundation, Working, Practitioner, Advanced, Expert.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span><strong>Authorized Evidence Summaries:</strong> Clean summaries of project repositories & RFCs.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                <span><strong>Optional Role Alignment:</strong> Target role match explanation from Domain 4.</span>
              </li>
            </ul>
          </div>

          {/* Strictly Excluded from All Shares */}
          <div className="p-5 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              Never Disclosed / Strictly Excluded
            </div>
            <ul className="space-y-2 text-xs text-ink/80">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span><strong>Unverified / Candidate Skills:</strong> Claims without completed verification.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span><strong>Internal AI Diagnostics:</strong> Prompt traces, NLP confidence debugging, model tokens.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span><strong>Private Reviewer Notes:</strong> Internal verification team conversations and flags.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span><strong>Learning Diagnostics & Quizzes:</strong> Domain 5 practice tests and remediation attempts.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0" />
                <span><strong>Restricted Evidence Details:</strong> Documents marked private or unauthorized.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
