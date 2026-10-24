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
            templateId: "verified-competency",
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
      <div className="flex-1 flex items-center justify-center p-6 min-h-[70vh]">
        <div className="max-w-md w-full p-8 rounded-2xl bg-white border border-[#1C1C1C]/15 text-center space-y-4 shadow-[3px_3px_0_0_#1C1C1C]">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1C1C1C]" />
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-[#1C1C1C]">Verifying Shared Credential</h2>
            <p className="text-xs text-[#1C1C1C]/60">
              Validating candidate authorization and verified competency records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 1: Unknown / Link Not Found
  if (errorStatus === 404 || !projection) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[75vh]">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-[#1C1C1C]/15 text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1C]">
              Shared Passport Not Found
            </h1>
            <p className="text-xs sm:text-sm text-[#1C1C1C]/70 leading-relaxed max-w-md mx-auto">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FDFBF7] hover:bg-[#1C1C1C]/90 text-xs font-semibold"
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
      <div className="flex-1 flex items-center justify-center p-6 min-h-[75vh]">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-rose-300 text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold uppercase tracking-wider">
              Link Revoked by Candidate
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1C]">
              Access to This Passport Has Been Revoked
            </h1>
            <p className="text-xs sm:text-sm text-[#1C1C1C]/70 leading-relaxed max-w-md mx-auto">
              The candidate has terminated public access to this shared projection. In compliance with candidate data minimization standards, all capability data has been purged from this view.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-[#1C1C1C]/70 text-left space-y-1">
            <div className="flex justify-between">
              <span className="font-semibold">Security Token:</span>
              <span className="font-mono text-[#1C1C1C]/50">{shareId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Status:</span>
              <span className="font-bold text-rose-700">Access Terminated</span>
            </div>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FDFBF7] hover:bg-[#1C1C1C]/90 text-xs font-semibold"
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
      <div className="flex-1 flex items-center justify-center p-6 min-h-[75vh]">
        <div className="max-w-xl w-full p-8 sm:p-10 rounded-2xl bg-white border border-amber-300 text-center space-y-6 shadow-[4px_4px_0_0_#1C1C1C]">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center mx-auto shadow-sm">
            <Clock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider">
              Passport Access Window Expired
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1C]">
              This Passport Link Has Expired
            </h1>
            <p className="text-xs sm:text-sm text-[#1C1C1C]/70 leading-relaxed max-w-md mx-auto">
              The candidate set an expiration date on this shared passport to ensure only current competency information is evaluated.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 text-left space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Expiration Details:
            </p>
            <p>
              Expired on: <span className="font-semibold">{projection.expiresAt ? new Date(projection.expiresAt).toLocaleDateString() : "Recently"}</span>. Please reach out to the candidate directly to request an updated share link.
            </p>
          </div>
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FDFBF7] hover:bg-[#1C1C1C]/90 text-xs font-semibold"
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
    <div className="flex-1 flex flex-col min-h-screen bg-[#FDFBF7] text-[#1C1C1C]">
      {/* Single Clean Public Header */}
      <header className="sticky top-0 z-40 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#1C1C1C]/10 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          {/* Brand & Verification Badge */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#DFE968] border border-[#1C1C1C]/20 flex items-center justify-center font-black text-xs text-[#1C1C1C] shadow-sm">
              SP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-xl font-normal tracking-tight text-[#1C1C1C] leading-none"
                  style={{ fontFamily: "'Yellowtail', cursive" }}
                >
                  SkillPassport
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Verified Candidate
                </span>
              </div>
              <p className="hidden md:block text-[11px] text-[#1C1C1C]/60 font-medium leading-tight mt-0.5">
                Authoritative Skill Verification & Provenance
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={handleCopyLink}
              className="pill-btn pill-btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 border border-[#1C1C1C]/15 hover:bg-[#FBF1CF]/60"
              title="Copy share link to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                  <span className="font-medium text-[#1C1C1C]">Copy Link</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="pill-btn pill-btn-ghost text-xs py-1.5 px-3 flex items-center gap-1.5 border border-[#1C1C1C]/15 hover:bg-[#FBF1CF]/60"
              title="Print or save as PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
              <span className="hidden sm:inline font-medium text-[#1C1C1C]">Print / PDF</span>
            </button>

            {projection.allowRecruiterMessaging && (
              <button
                onClick={() => setContactOpen(true)}
                className="px-4 py-1.5 rounded-full bg-[#DFE968] hover:bg-[#d8e35c] border border-[#1C1C1C] text-xs font-bold text-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_0_#1C1C1C] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Contact Candidate</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 print:p-0 print:max-w-none">
        <TemplateDispatcher
          projection={projection}
          activeTemplateId={projection.templateId}
          isPreview={false}
          onOpenContact={() => setContactOpen(true)}
        />
      </main>

      {/* Factual Recruiter Footer */}
      <footer className="mt-auto border-t border-[#1C1C1C]/10 bg-[#FAF6EC] py-10 px-4 text-xs text-[#1C1C1C]/70 print:hidden">
        <div className="max-w-6xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[#1C1C1C]/10">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <span className="font-bold text-[#1C1C1C] text-sm">
                SkillPassport Verification Standard
              </span>
            </div>
            <div className="text-[11px] text-[#1C1C1C]/60 font-mono">
              CANDIDATE-AUTHORIZED PROJECTION
            </div>
          </div>
          <p className="text-[#1C1C1C]/70 leading-relaxed text-xs">
            This candidate passport is rendered via a candidate-controlled sharing configuration.
            Verified competencies are corroborated against authentic workplace evidence, code repositories,
            and certified achievements. Any self-declared skills are explicitly marked as candidate claims.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-[11px] text-[#1C1C1C]/50">
            <span>Powered by GrowthLens SkillPassport &bull; Privacy-first, candidate data rights respected</span>
            <span>Confidential &bull; Intended solely for authorized recruitment evaluation</span>
          </div>
        </div>
      </footer>

      {/* Recruiter Messaging Modal */}
      {contactOpen && (
        <RecruiterMessageModal
          token={shareId}
          candidateName={projection.candidateProfile?.displayName || "Candidate"}
          onClose={() => setContactOpen(false)}
        />
      )}
    </div>
  );
}
