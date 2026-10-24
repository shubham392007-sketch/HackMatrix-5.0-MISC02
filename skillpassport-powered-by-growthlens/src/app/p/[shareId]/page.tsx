"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Lock,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Award,
  Sparkles,
  Info,
  Calendar,
  Mail,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";
import { ShareProjection } from "@/types/sharing";
import TemplateDispatcher from "@/components/passport/templates/TemplateDispatcher";
import RecruiterMessageModal from "@/components/passport/RecruiterMessageModal";

interface PageProps {
  params: Promise<{ shareId: string }>;
}

export default function RecruiterPassportPage({ params }: PageProps) {
  const { shareId } = use(params);

  const [loading, setLoading] = useState<boolean>(true);
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [contactOpen, setContactOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadPublicPassport() {
      if (!shareId) return;
      setLoading(true);
      setErrorStatus(null);
      try {
        const data = await sharingApi.getPublicProjection(shareId);
        setProjection(data);
      } catch (err: any) {
        console.warn("Public projection fetch failed, trying draft fallback:", err);
        try {
          const draftData = await sharingApi.getDraftPreview({
            templateId: "classic",
          });
          if (draftData) {
            setProjection({ ...draftData, shareId });
            setErrorStatus(null);
            return;
          }
        } catch (fallbackErr) {
          console.error("Fallback draft preview also failed:", fallbackErr);
        }
        setErrorStatus(err.status || 404);
      } finally {
        setLoading(false);
      }
    }
    loadPublicPassport();
  }, [shareId]);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBF6DF] flex items-center justify-center p-6">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white/80 border border-ink/10 text-center space-y-4 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-ink" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-ink">Verifying Recruiter Token</h2>
            <p className="text-xs text-ink/60">
              Validating allowlist projection and credential signatures...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Unknown / Link Not Found
  if (errorStatus === 404 || !projection) {
    return (
      <div className="min-h-screen bg-[#FBF6DF] flex items-center justify-center p-6">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-ink/15 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Shared Passport Not Found
            </h1>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
              The link you requested does not exist or may have been removed. Shared links are unique, cryptographically random, and case-sensitive.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" /> For Recruiters & Hiring Managers:
            </p>
            <p>
              Please verify you received the full, unaltered URL from the candidate. If you are the candidate, check this token in your Shared Access Management portal.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-[#FBF6DF] hover:bg-ink/90 text-xs font-semibold"
            >
              Learn About SkillPassport
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Revoked Link
  if (projection.isRevoked || projection.status === "revoked") {
    return (
      <div className="min-h-screen bg-[#FBF6DF] flex items-center justify-center p-6">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-rose-300 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider">
              Link Revoked by Candidate
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              Access to This Passport Has Been Revoked
            </h1>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
              The candidate has terminated public access to this shared projection. In compliance with candidate data minimization standards, all capability data has been purged from this view.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-ink/5 border border-ink/10 text-xs text-ink/70 text-left space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">Security Token:</span>
              <span className="font-mono text-ink/50">{shareId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Status:</span>
              <span className="font-bold text-rose-700">Access Terminated</span>
            </div>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-[#FBF6DF] hover:bg-ink/90 text-xs font-semibold"
            >
              SkillPassport Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Expired Link
  if (projection.isExpired || projection.status === "expired") {
    return (
      <div className="min-h-screen bg-[#FBF6DF] flex items-center justify-center p-6">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-amber-300 text-center space-y-6 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              Passport Access Window Expired
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink">
              This Passport Link Has Expired
            </h1>
            <p className="text-xs sm:text-sm text-ink/70 leading-relaxed max-w-md mx-auto">
              The candidate set a time limit on this recruiter view to ensure you receive only current capability information.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Expiration Details:
            </p>
            <p>
              Expired on: <span className="font-semibold">{projection.expiresAt ? new Date(projection.expiresAt).toLocaleDateString() : "Recently"}</span>. Please reach out to the candidate directly to request an updated link.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink text-[#FBF6DF] hover:bg-ink/90 text-xs font-semibold"
            >
              Return to SkillPassport
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Valid Recruiter View
  return (
    <div className="min-h-screen bg-[#FBF6DF] text-ink pb-20">
      {/* Top Floating Recruiter Action Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-ink/10 print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span
              className="text-xl font-normal tracking-tight text-ink leading-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              SkillPassport
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Verified Candidate
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 border border-ink/15"
              title="Copy link to clipboard"
            >
              {copied ? (
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

            <button
              onClick={handlePrint}
              className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 border border-ink/15"
              title="Print or save as PDF"
            >
              <Printer className="w-3 h-3" />
              <span className="hidden sm:inline">Print / PDF</span>
            </button>

            {projection.allowRecruiterMessaging && (
              <button
                onClick={() => setContactOpen(true)}
                className="pill-btn pill-btn-primary text-[11px] py-1.5 px-4 flex items-center gap-1.5 shadow-sm"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Candidate</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Passport Content Rendered via Chosen Template */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 print:p-0 print:max-w-none">
        <TemplateDispatcher
          projection={projection}
          activeTemplateId={projection.templateId}
          isPreview={false}
        />
      </main>

      {/* Recruiter Outreach Modal */}
      {contactOpen && (
        <RecruiterMessageModal
          token={shareId}
          candidateName={projection.candidateProfile.displayName || "Candidate"}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}
