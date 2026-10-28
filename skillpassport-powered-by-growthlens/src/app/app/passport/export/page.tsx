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
  Layout,
  ExternalLink,
  Layers,
  Link2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { sharingApi } from "@/lib/sharingApi";
import { ShareProjection, PassportTemplateId } from "@/types/sharing";
import TemplateDispatcher from "@/components/passport/templates/TemplateDispatcher";
import { TEMPLATE_DEFINITIONS } from "@/components/passport/TemplateSelector";

export default function PassportExportPage() {
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] =
    useState<PassportTemplateId>("verified-competency");

  // Read stored master passport or finalized permissions template on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedFinalized = localStorage.getItem("sp_finalized_permissions");
        if (storedFinalized) {
          const parsed = JSON.parse(storedFinalized);
          if (parsed.templateId) {
            setSelectedTemplate(parsed.templateId);
            return;
          }
        }
      } catch {}
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        let activePermissions = undefined;
        if (typeof window !== "undefined") {
          try {
            const storedFinalized = localStorage.getItem("sp_finalized_permissions");
            if (storedFinalized) activePermissions = JSON.parse(storedFinalized);
          } catch {}
        }

        const data = await sharingApi.getDraftPreview({
          templateId: selectedTemplate,
          permissions: activePermissions,
        });

        // Strict skill-to-evidence isolation
        const eligibleEvidenceIds = new Set<string>();
        (data.verifiedSkills || []).forEach((s) => {
          (s.authorizedEvidenceIds || []).forEach((id) => eligibleEvidenceIds.add(id));
        });
        (data.customSkills || []).forEach((cs) => {
          (cs.attachedEvidenceIds || []).forEach((id) => eligibleEvidenceIds.add(id));
        });

        const scoped = {
          ...data,
          authorizedEvidence: (data.authorizedEvidence || []).filter((ev) =>
            eligibleEvidenceIds.has(ev.id)
          ),
        };

        setProjection(scoped);
      } catch (err) {
        console.error("Failed to load export projection:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedTemplate]);

  // Primary Action: Genuine Evidence-Linked Vector PDF Generation & Download
  const handleDownloadPdf = async () => {
    setGeneratingPdf(true);
    setDownloadError(null);
    setDownloadSuccess(false);

    try {
      let activePermissions = undefined;
      if (typeof window !== "undefined") {
        try {
          const storedFinalized = localStorage.getItem("sp_finalized_permissions");
          if (storedFinalized) activePermissions = JSON.parse(storedFinalized);
        } catch {}
      }

      const { blob, filename } = await sharingApi.downloadPassportPdf({
        templateId: selectedTemplate,
        permissions: activePermissions,
      });

      // Trigger native vector PDF download in browser
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(anchor);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err: any) {
      console.error("PDF download failed:", err);
      setDownloadError(err.message || "Failed to generate evidence-linked PDF. Please try again.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  // Secondary Action: Browser Print Fallback
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

  // Calculate summary metrics
  const verifiedCount = projection?.verifiedSkills?.length || 0;
  const customCount = projection?.customSkills?.length || 0;
  const totalSkillsCount = verifiedCount + customCount;
  const totalEvidenceCount = projection?.authorizedEvidence?.length || 0;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Passport Export & Document Generation"
        description="Download your customized Skill Passport with supporting evidence and clickable source links."
        badge="Domain 6 · Official Export"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-xl border border-[#1C1C1C]/20 bg-white text-[#1C1C1C] hover:bg-stone-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Alternative: print via browser print dialog"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print (Browser)</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={generatingPdf || loading}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-4 flex items-center gap-2 shadow-sm font-bold disabled:opacity-50"
          >
            {generatingPdf ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Generating Vector PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download Evidence-Linked PDF</span>
              </>
            )}
          </button>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
        {/* Primary Action Card: Download Evidence-Linked PDF */}
        <div className="print:hidden p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#FBF6DF] via-[#FDFBF7] to-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#1C1C1C] text-white">
                  ISO 32000 Vector Document
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Clickable Hyperlinks
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#1C1C1C] tracking-tight">
                Download Evidence-Linked PDF
              </h2>
              <p className="text-xs text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Download your customized Skill Passport with supporting evidence and clickable source links.
                Includes selectable text, embedded brand typography, multi-page layout, and genuine hyperlinks to repositories, issues, and verified proof artifacts.
              </p>
            </div>

            <button
              onClick={handleDownloadPdf}
              disabled={generatingPdf || loading}
              className="pill-btn pill-btn-primary text-xs sm:text-sm py-2.5 px-5 font-black flex items-center justify-center gap-2 shadow-[2px_2px_0_0_#1C1C1C] shrink-0 disabled:opacity-50"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Compiling Document...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Evidence-Linked PDF</span>
                </>
              )}
            </button>
          </div>

          {/* Feedback states */}
          {downloadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <b>Success:</b> Your official SkillPassport PDF has been generated and downloaded with working evidence hyperlinks.
              </span>
            </div>
          )}

          {downloadError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <b>Error:</b> {downloadError}
              </span>
            </div>
          )}

          {/* Export Summary Bar */}
          <div className="pt-3 border-t border-[#1C1C1C]/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white/80 p-2.5 rounded-xl border border-[#1C1C1C]/10">
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Active Template</div>
              <div className="font-extrabold text-[#1C1C1C] capitalize mt-0.5">
                {selectedTemplate.replace("-", " ")}
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-[#1C1C1C]/10">
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Included Skills</div>
              <div className="font-extrabold text-[#1C1C1C] mt-0.5">
                {verifiedCount} Verified {customCount > 0 ? `· ${customCount} Declared` : ""}
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-[#1C1C1C]/10">
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Evidence Links</div>
              <div className="font-extrabold text-[#1C1C1C] mt-0.5 flex items-center gap-1">
                <Link2 className="w-3 h-3 text-sky-600" />
                <span>{totalEvidenceCount} Linked Proofs</span>
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-[#1C1C1C]/10">
              <div className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">Verification Protocol</div>
              <div className="font-extrabold text-emerald-700 mt-0.5 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>PostgreSQL Audited</span>
              </div>
            </div>
          </div>
        </div>

        {/* Template Quick-Switcher Toolbar (hidden on print) */}
        <div className="print:hidden p-4 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-3">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#1C1C1C]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                Export Layout Style (Select Template)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/app/passport/builder"
                className="text-xs text-[#1C1C1C]/70 hover:text-[#1C1C1C] font-semibold flex items-center gap-1"
              >
                <span>Edit Sections in Builder</span>
                <span>&rarr;</span>
              </Link>
              <Link
                href="/app/passport/preview"
                className="text-xs text-[#1C1C1C]/70 hover:text-[#1C1C1C] font-semibold"
              >
                &larr; Back to Live Preview
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {TEMPLATE_DEFINITIONS.map((tmpl) => {
              const isSelected = tmpl.id === selectedTemplate;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#000000] text-[#FAF8F5] border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918]"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200"
                  }`}
                >
                  <tmpl.icon className="w-3.5 h-3.5" />
                  <span>{tmpl.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-stone-200 print:hidden">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1C1C1C]" />
            <p className="text-xs text-stone-600">Compiling official passport in selected layout...</p>
          </div>
        ) : projection ? (
          /* Printable Document Sheet */
          <div className="print-passport-container bg-white text-[#1C1C1C] p-6 sm:p-10 rounded-2xl border-[1.5px] border-[#1C1C1C]/20 shadow-md space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
            {/* Header Watermark */}
            <div className="flex items-center justify-between border-b-2 border-black pb-3 text-xs mb-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-tight">SkillPassport™ Official Credential</span>
                <span className="bg-black text-white px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                  Verified Provenance
                </span>
              </div>
              <div className="text-[10px] font-mono text-stone-600">
                Generated: {currentDateDisplay} · Token: #{projection.shareId.slice(-8).toUpperCase()}
              </div>
            </div>

            {/* Template Render */}
            <TemplateDispatcher
              projection={projection}
              activeTemplateId={selectedTemplate}
              isPreview={false}
            />

            {/* Print Footer Notice */}
            <div className="flex items-center justify-between border-t border-black/20 pt-3 text-[10px] text-stone-500 font-mono mt-8">
              <span>SkillPassport Trust &amp; Verification Protocol · PostgreSQL Audited Proof</span>
              <span>Authorized Credential Projection</span>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-rose-700 bg-rose-50 rounded-xl">
            Failed to compile printable projection.
          </div>
        )}
      </div>

      {/* Print-specific style adjustments */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 15mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .print-passport-container {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
