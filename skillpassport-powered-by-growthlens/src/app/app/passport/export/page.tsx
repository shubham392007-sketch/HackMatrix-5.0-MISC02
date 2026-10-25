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
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { sharingApi } from "@/lib/sharingApi";
import { ShareProjection, PassportTemplateId } from "@/types/sharing";
import TemplateDispatcher from "@/components/passport/templates/TemplateDispatcher";
import { TEMPLATE_DEFINITIONS } from "@/components/passport/TemplateSelector";

export default function PassportExportPage() {
  const [projection, setProjection] = useState<ShareProjection | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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
        description="Clean, high-fidelity PDF / print layout containing only authorized verified capabilities and candidate evidence across all 8 templates."
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

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto pb-16 print:p-0 print:m-0 print:max-w-none">
        {/* Template Quick-Switcher Toolbar (hidden on print) */}
        <div className="print:hidden p-4 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/10 pb-3">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-[#1C1C1C]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                Export Layout Style (Select Template)
              </span>
            </div>
            <div className="flex items-center gap-2">
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

        {/* Print Instruction Card (hidden on print) */}
        <div className="print:hidden p-4 rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#1C1C1C]">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold">PDF Export Ready: </span>
              Use the button below or press <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#1C1C1C]/20">Ctrl + P</kbd> / <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#1C1C1C]/20">⌘ + P</kbd> to save as PDF. Page breaks, margins, and typography are automatically calibrated for the selected template.
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-4 shrink-0 font-bold"
          >
            Print / Save PDF
          </button>
        </div>

        {loading ? (
          <div className="p-16 text-center space-y-3 bg-white rounded-2xl border border-stone-200 print:hidden">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#1C1C1C]" />
            <p className="text-xs text-stone-600">Compiling official passport in selected layout...</p>
          </div>
        ) : projection ? (
          /* Printable Document Sheet */
          <div className="print-passport-container bg-white text-[#1C1C1C] p-6 sm:p-10 rounded-2xl border-[1.5px] border-[#1C1C1C]/20 shadow-md space-y-6 print:border-none print:shadow-none print:p-0 print:m-0">
            {/* Print Header Watermark (visible on print, hidden in web view if desired) */}
            <div className="hidden print:flex items-center justify-between border-b-2 border-black pb-3 text-xs mb-4">
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
            <div className="hidden print:flex items-center justify-between border-t border-black/20 pt-3 text-[10px] text-stone-500 font-mono mt-8">
              <span>SkillPassport Trust & Verification Protocol · PostgreSQL Audited Proof</span>
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
