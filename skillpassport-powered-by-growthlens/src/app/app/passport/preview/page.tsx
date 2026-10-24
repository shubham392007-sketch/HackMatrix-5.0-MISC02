"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Eye,
  ShieldCheck,
  Link2,
  SlidersHorizontal,
  ArrowRight,
  Sparkles,
  Loader2,
  RefreshCw,
  Printer,
  Info,
  Briefcase,
  ExternalLink,
  Mail,
  Lock,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import TemplateSelector from "@/components/passport/TemplateSelector";
import TemplateDispatcher from "@/components/passport/templates/TemplateDispatcher";
import { sharingApi } from "@/lib/sharingApi";
import { PassportTemplateId, ShareProjection } from "@/types/sharing";

function PassportPreviewContent() {
  const searchParams = useSearchParams();
  const isRecruiterView = searchParams.get("view") === "recruiter";

  const [selectedTemplate, setSelectedTemplate] = useState<PassportTemplateId>("classic");
  const [loading, setLoading] = useState<boolean>(true);
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async (templateId: PassportTemplateId = selectedTemplate) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sharingApi.getDraftPreview({
        templateId,
      });
      setProjection(data);
    } catch (err: any) {
      console.error("Failed to load preview projection:", err);
      setError("Unable to generate live projection from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview(selectedTemplate);
  }, [selectedTemplate]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={isRecruiterView ? "Recruiter Preview" : "Live Passport Preview"}
        description={
          isRecruiterView
            ? "Inspect the authentic recruiter-facing presentation for your passport, strictly bounded by your persisted permissions allowlist."
            : "Inspect your passport using current saved information and sharing preferences before publishing."
        }
        badge={isRecruiterView ? "Domain 6 · Recruiter Perspective" : "Domain 6 · 8 Templates"}
        badgeColor={
          isRecruiterView
            ? "border-amber-400 text-amber-950 bg-amber-100"
            : "border-peach/40 text-ink bg-peach/20"
        }
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/app/passport/builder"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Customize Content</span>
          </Link>
          <Link
            href="/app/passport/permissions"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>Permissions</span>
          </Link>
          <Link
            href="/app/passport/share"
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Link2 className="w-3 h-3" />
            <span>Create Share Link &rarr;</span>
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Perspective Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 rounded-2xl bg-white/70 border border-ink/15 shadow-sm">
          <div className="flex items-center gap-2">
            <Link
              href="/app/passport/preview"
              scroll={false}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                !isRecruiterView
                  ? "bg-[#DFE968] text-ink shadow-[1px_1px_0_0_#1C1C1C] border border-ink"
                  : "text-ink/65 hover:text-ink hover:bg-ink/5"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Passport Preview</span>
            </Link>
            <Link
              href="/app/passport/preview?view=recruiter"
              scroll={false}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isRecruiterView
                  ? "bg-[#DFE968] text-ink shadow-[1px_1px_0_0_#1C1C1C] border border-ink"
                  : "text-ink/65 hover:text-ink hover:bg-ink/5"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Recruiter Preview</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadPreview(selectedTemplate)}
              className="text-xs font-semibold text-ink/70 hover:text-ink flex items-center gap-1 px-2.5 py-1 rounded-lg border border-ink/10 bg-white"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh Projection</span>
            </button>
            <Link
              href="/app/passport/export"
              className="text-xs font-semibold text-ink/70 hover:text-ink flex items-center gap-1 px-2.5 py-1 rounded-lg border border-ink/10 bg-white"
            >
              <Printer className="w-3 h-3" />
              <span>Export PDF</span>
            </Link>
          </div>
        </div>

        {/* View Mode Context Banners */}
        {isRecruiterView ? (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm">
            <Briefcase className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <span className="font-extrabold uppercase tracking-wide text-[11px] block text-amber-900">
                Recruiter Perspective Mode Active
              </span>
              <p className="leading-relaxed text-ink/80">
                This preview projects exactly what recruiters see upon opening your share link. Evidence inspection modals, verified skill badges, and candidate recruiter inquiry workflows are active for verification.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-paper border border-ink/10 flex items-start gap-3 text-xs text-ink/80">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-ink">Single Source of Truth: </span>
              This preview is computed directly from your authenticated profile, verified competencies in PostgreSQL, candidate-declared custom skills, and evidence permission allowlists.
            </div>
          </div>
        )}

        {/* Template Gallery Selector */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-extrabold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-peach" />
                Select Passport Presentation Template
              </h2>
              <p className="text-xs text-ink/70">
                Choose from 8 distinct layout archetypes. All templates display the same server-verified data projection.
              </p>
            </div>
          </div>

          <TemplateSelector
            selectedTemplate={selectedTemplate}
            onSelectTemplate={(tplId) => setSelectedTemplate(tplId)}
          />
        </div>

        {/* Live Template Frame */}
        {loading ? (
          <div className="gl-card p-16 text-center space-y-3">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-ink/70" />
            <p className="text-xs text-ink/60">
              Rendering canonical projection in {selectedTemplate.toUpperCase()} layout...
            </p>
          </div>
        ) : projection ? (
          <div className="gl-card p-4 sm:p-8 bg-paper border-2 border-ink shadow-md space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink/10 text-xs">
              <span className="font-extrabold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-peach" />
                {isRecruiterView ? "Recruiter View:" : "Active Preview Mode:"}{" "}
                {selectedTemplate.replace("_", " ").toUpperCase()}
              </span>
              <div className="flex items-center gap-3">
                <Link
                  href="/app/passport/export"
                  className="text-ink/70 hover:text-ink flex items-center gap-1 text-[11px] font-semibold"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print View</span>
                </Link>
                <Link
                  href="/app/passport/share"
                  className="pill-btn pill-btn-primary text-[10px] py-1 px-3"
                >
                  Share this Template &rarr;
                </Link>
              </div>
            </div>

            {/* Template Render */}
            <TemplateDispatcher
              projection={projection}
              activeTemplateId={selectedTemplate}
              isPreview={!isRecruiterView}
            />
          </div>
        ) : (
          <div className="gl-card p-8 text-center space-y-3">
            <p className="text-xs font-bold text-rose-700">{error || "Unable to display preview."}</p>
            <button
              onClick={() => loadPreview(selectedTemplate)}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-4"
            >
              Retry Loading Preview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PassportPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-ink/60" />
        </div>
      }
    >
      <PassportPreviewContent />
    </Suspense>
  );
}
