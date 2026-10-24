"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Share2,
  ShieldCheck,
  Eye,
  Link2,
  SlidersHorizontal,
  Lock,
  Download,
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
  Mail,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
  FolderSync,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { sharingApi } from "@/lib/sharingApi";
import { SharingOverviewData } from "@/types/sharing";

export default function PassportSharingOverviewPage() {
  const { skills, evidenceItems, shareRecords, shareActivities } = useEvidence();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<SharingOverviewData | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sharingApi.getOverview();
      setOverview(data);
    } catch (err: any) {
      console.warn("Could not load sharing overview from API, using local state fallback:", err?.message || err);
      setOverview({
        readiness: {
          verified_skills_count: skills.filter((s) => s.verificationState === "verified").length,
          candidate_skills_count: skills.filter((s) => s.verificationState !== "verified").length,
          eligible_evidence_count: evidenceItems.length,
          custom_skills_count: 0,
          is_ready_to_share: skills.length > 0 || evidenceItems.length > 0,
        },
        links: {
          total_links: shareRecords.length,
          active_links: shareRecords.filter((r) => r.status === "active").length,
          expired_links: shareRecords.filter((r) => r.status === "expired").length,
          revoked_links: shareRecords.filter((r) => r.status === "revoked").length,
          total_access_count: shareRecords.reduce((acc, r) => acc + (r.accessCount || 0), 0),
          recent_links: shareRecords.map((r) => ({
            id: r.id || `share-${r.shareId}`,
            token: r.shareId,
            label: r.label,
            template_id: (r.templateId || r.permissions?.templateId || "classic") as any,
            status: r.status,
            created_at: r.createdAt || new Date().toISOString(),
            expires_at: r.expiresAt || null,
            access_count: r.accessCount || 0,
          })),
        },
        messaging: {
          unread_count: 0,
          total_count: 0,
        },
        recent_activities: shareActivities.map((a) => ({
          id: a.id,
          action: a.action,
          details: a.details,
          timestamp: a.timestamp,
          share_link_id: a.shareId || "",
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleCopyLink = (shareId: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/p/${shareId}`;
      navigator.clipboard.writeText(url);
      setCopiedId(shareId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const recentLinks = overview?.links?.recent_links || [];
  const mostRecentLink = recentLinks[0] || null;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Share Demonstrated Capabilities"
        description="Configure selective recruiter access, choose from 8 passport templates, and manage live links."
        badge="Domain 6 · Sharing & Recruiter"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/builder"
            className="pill-btn pill-btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Customize Content</span>
          </Link>
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
        {/* Verification Guarantee Banner */}
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-extrabold block mb-0.5">
              Evidence-Backed Verification Guarantee & Canonical Projection:
            </span>
            Only skills with reviewed or verified workplace proof appear in your verified competencies passport. Candidate-declared skills are visibly isolated and labeled{" "}
            <span className="font-semibold text-ink bg-amber-200/60 px-1 py-0.5 rounded">
              User-declared · Not independently verified
            </span>
            . All recruiter views, previews, and PDF exports reflect the exact same persisted access configuration.
          </div>
        </div>

        {loading ? (
          <div className="gl-card p-12 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink/70" />
            <p className="text-xs text-ink/60">Gathering verified capabilities and active share links...</p>
          </div>
        ) : (
          <>
            {/* New Key Feature Spotlight: Passport Content Builder */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-[#DFE968]/30 via-peach/20 to-paper border-2 border-ink shadow-[3px_3px_0_0_#1C1C1C] flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-ink text-[#FBF6DF] text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    New Key Feature
                  </span>
                  <span className="text-xs font-bold text-ink/70">Master Competency Passport</span>
                </div>
                <h2 className="text-lg font-black text-ink">
                  Passport Content Builder & Customizer
                </h2>
                <p className="text-xs text-ink/80 leading-relaxed">
                  Add and organize your <strong>Work Experience</strong>, <strong>Education</strong>, <strong>Portfolio Projects</strong>, <strong>Certifications</strong>, <strong>Publications</strong>, <strong>Honors</strong>, and <strong>Custom Sections</strong>. Freely reorder sections and preview across <strong>8 distinct layout templates</strong>.
                </p>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  href="/app/passport/builder"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-bold shadow-[2px_2px_0_0_#1C1C1C]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Open Content Builder &rarr;</span>
                </Link>
                <Link
                  href="/app/passport/preview"
                  className="pill-btn pill-btn-secondary text-xs py-2 px-3.5 flex items-center gap-1.5 font-bold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview Templates</span>
                </Link>
              </div>
            </div>

            {/* Grid: Readiness & Share Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 1: Passport Readiness */}
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-paper rounded-2xl border border-ink/10 space-y-1">
                    <span className="text-[11px] text-ink/60 font-medium">Verified Skills</span>
                    <div className="text-2xl font-extrabold text-ink">
                      {overview?.readiness?.verified_skills_count ?? 0}
                    </div>
                    <p className="text-[10px] text-emerald-700 font-semibold">
                      Eligible for verified passport
                    </p>
                  </div>

                  <div className="p-3.5 bg-paper rounded-2xl border border-ink/10 space-y-1">
                    <span className="text-[11px] text-ink/60 font-medium">Eligible Evidence</span>
                    <div className="text-2xl font-extrabold text-ink">
                      {overview?.readiness?.eligible_evidence_count ?? 0}
                    </div>
                    <p className="text-[10px] text-ink/50">
                      Workplace proof artifacts
                    </p>
                  </div>

                  <div className="p-3.5 bg-paper rounded-2xl border border-ink/10 space-y-1">
                    <span className="text-[11px] text-ink/60 font-medium">Custom Skills</span>
                    <div className="text-2xl font-extrabold text-ink">
                      {overview?.readiness?.custom_skills_count ?? 0}
                    </div>
                    <p className="text-[10px] text-amber-800 font-semibold">
                      Candidate self-declared
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
                    <span className="text-ink/70">Candidate / Unverified Skills (Excluded from verified matrix):</span>
                    <span className="font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                      {overview?.readiness?.candidate_skills_count ?? 0} Pending Proof
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
                    <span className="text-ink/70">Projection Model:</span>
                    <span className="font-bold text-emerald-700">Canonical Server Allowlist</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-paper/60 border border-ink/5">
                    <span className="text-ink/70">Template Variety:</span>
                    <span className="font-bold text-ink">8 Tailored Layouts</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Active Links & Inquiries */}
              <div className="gl-card p-6 md:p-8 space-y-5">
                <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                  <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-peach" />
                    Share Links & Inquiries
                  </h2>
                  <Link
                    href="/app/passport/access"
                    className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                  >
                    Manage Links →
                  </Link>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
                    <span className="text-[11px] text-ink/60 font-semibold">Active</span>
                    <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                      {overview?.links?.active_links ?? 0}
                    </div>
                  </div>

                  <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
                    <span className="text-[11px] text-ink/60 font-semibold">Expired</span>
                    <div className="text-xl font-extrabold text-stone-600 mt-0.5">
                      {overview?.links?.expired_links ?? 0}
                    </div>
                  </div>

                  <div className="p-3 bg-paper rounded-2xl border border-ink/10 text-center">
                    <span className="text-[11px] text-ink/60 font-semibold">Revoked</span>
                    <div className="text-xl font-extrabold text-rose-700 mt-0.5">
                      {overview?.links?.revoked_links ?? 0}
                    </div>
                  </div>
                </div>

                {/* Recruiter Messages Alert Box */}
                <div className="p-4 rounded-2xl bg-[#DFE968]/20 border border-[#DFE968] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-ink text-[#FBF6DF] flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        Recruiter Inquiries
                        {(overview?.messaging?.unread_count ?? 0) > 0 && (
                          <span className="px-2 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                            {overview?.messaging?.unread_count} unread
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink/70">
                        {overview?.messaging?.total_count ?? 0} recruiter message{overview?.messaging?.total_count === 1 ? "" : "s"} received
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/app/passport/messages"
                    className="pill-btn pill-btn-primary text-[10px] py-1.5 px-3 shrink-0"
                  >
                    View Inbox →
                  </Link>
                </div>

                {/* Most Recent Link Preview */}
                {mostRecentLink && (
                  <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink truncate max-w-[200px]">
                        {mostRecentLink.label}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {mostRecentLink.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink/60">
                      Created: {mostRecentLink.created_at ? new Date(mostRecentLink.created_at).toLocaleDateString() : "Recent"} · Views: {mostRecentLink.access_count}
                    </p>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-ink/5">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/p/${mostRecentLink.token}`}
                          target="_blank"
                          className="text-xs font-bold text-ink hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open Recruiter View
                        </Link>
                        <span className="text-ink/20">|</span>
                        <Link
                          href="/app/passport/access"
                          className="text-xs text-ink/70 hover:text-ink"
                        >
                          Configure
                        </Link>
                      </div>
                      <button
                        onClick={() => handleCopyLink(mostRecentLink.token)}
                        className="text-xs font-semibold text-ink flex items-center gap-1 hover:text-ink/70"
                      >
                        {copiedId === mostRecentLink.token ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Section C: Domain 6 Action Hub */}
            <div className="gl-card p-6 md:p-8 space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Passport Sharing & Recruiter Capabilities
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  Full control over your public professional footprint, template designs, evidence inspection, and recruiter communication.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Passport Content Builder */}
                <Link
                  href="/app/passport/builder"
                  className="p-5 rounded-2xl bg-paper border-2 border-ink shadow-[2px_2px_0_0_#1C1C1C] hover:bg-[#DFE968]/20 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-200 text-ink flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-ink group-hover:text-amber-900 transition-colors">
                      1. Content Builder
                    </h3>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      NEW
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Add work history, education, projects, certifications, publications, honors, and toggle section visibility.
                  </p>
                </Link>
                <Link
                  href="/app/passport/preview"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-peach/20 text-ink flex items-center justify-center">
                    <Eye className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-peach transition-colors">
                    2. 8 Passport Templates Preview
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Switch between Classic, Minimal Executive, Technical, AI/ML, Engineering, Academic, Project, and Anonymous styles.
                  </p>
                </Link>

                <Link
                  href="/app/passport/preview?view=recruiter"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-amber-800 transition-colors">
                    3. Recruiter Preview Mode
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Inspect the allowlist-restricted presentation visible to hiring managers with clickable evidence inspection.
                  </p>
                </Link>

                <Link
                  href="/app/passport/share"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Link2 className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-emerald-700 transition-colors">
                    5. Create Share Link (4-Step Wizard)
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Disclose selective skills, attach user-declared skills, calibrate evidence summaries, and set token expiration.
                  </p>
                </Link>

                <Link
                  href="/app/passport/messages"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-[#DFE968]/40 text-ink flex items-center justify-center">
                    <Mail className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:underline transition-colors flex items-center justify-between">
                    <span>7. Recruiter Inquiries</span>
                    {(overview?.messaging?.unread_count ?? 0) > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    )}
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    View direct inquiries from hiring managers who explored your passport and submitted outreach forms.
                  </p>
                </Link>

                <Link
                  href="/app/passport/access"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-ink/5 text-ink flex items-center justify-center">
                    <Lock className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:underline transition-colors">
                    8. Manage Shared Access
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Track recruiter view counts, extend expiration dates, and trigger instant cryptographic revocation.
                  </p>
                </Link>

                <Link
                  href="/app/passport/permissions"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-amber-800 transition-colors">
                    6. Sharing Permissions
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Configure baseline visibility rules, anonymous modes, and evidence inspection permissions for new links.
                  </p>
                </Link>

                <Link
                  href="/app/passport/export"
                  className="p-5 rounded-2xl bg-paper border border-ink/10 hover:border-ink/30 transition-all space-y-2 group"
                >
                  <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-ink group-hover:text-sky-800 transition-colors">
                    4. Print & PDF Export
                  </h3>
                  <p className="text-[11px] text-ink/70 leading-relaxed">
                    Generate clean, high-fidelity PDF documentation reflecting your authorized demonstrated capabilities.
                  </p>
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
