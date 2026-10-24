"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Copy,
  Check,
  FileCode,
  FileText,
  Globe,
  GitBranch,
  Loader2,
  Sparkles,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";

interface PublicEvidenceModalProps {
  token?: string;
  evidenceId: string;
  onClose: () => void;
}

interface EvidenceDetailData {
  id: string;
  title: string;
  sourceType: string;
  sourceProvider: string;
  project: string;
  date: string | null;
  shortSummary: string;
  relatedSkillName?: string;
  claimedContribution: string;
  allowDetailInspection: boolean;
  extractedExcerpt?: string | null;
  sourceUrl?: string | null;
  sourceReference?: string | null;
  provenance?: Record<string, any>;
  confidenceScore?: number;
  trustCertification?: string;
}

export default function PublicEvidenceModal({
  token,
  evidenceId,
  onClose,
}: PublicEvidenceModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<EvidenceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      if (!evidenceId) return;
      setLoading(true);
      setError(null);
      try {
        const effectiveToken = token || "preview-token";
        const result = await sharingApi.getPublicEvidenceDetail(effectiveToken, evidenceId);
        if (isMounted) {
          setData(result);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load artifact details.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [token, evidenceId]);

  const handleCopyExcerpt = () => {
    if (data?.extractedExcerpt && navigator?.clipboard) {
      navigator.clipboard.writeText(data.extractedExcerpt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1C]/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] rounded-2xl shadow-[6px_6px_0_0_#1C1C1C] p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-1.5 rounded-full bg-[#1C1C1C]/10 hover:bg-[#1C1C1C]/20 text-[#1C1C1C] transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {loading && (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1C1C1C]" />
            <p className="text-xs font-bold text-[#1C1C1C]/70">
              Retrieving cryptographic evidence artifact...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-[#1C1C1C]">Inspection Unavailable</h3>
              <p className="text-xs text-[#1C1C1C]/70 max-w-md mx-auto">{error}</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold"
            >
              Close
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Header / Badges */}
            <div className="space-y-2 pr-8">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                  Grounded Workplace Evidence
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#000000] border border-[#1A1918] text-[#FAF8F5] text-xs font-bold uppercase">
                  {data.sourceType || "Artifact"}
                </span>

                {data.confidenceScore && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C] text-xs font-bold">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    {data.confidenceScore}% Confidence
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
                {data.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#1C1C1C]/70 font-medium">
                <span>Project: <strong className="text-[#1C1C1C]">{data.project}</strong></span>
                {data.date && <span>· Observed: <strong className="text-[#1C1C1C]">{data.date.split("T")[0]}</strong></span>}
                <span>· Contribution: <strong className="text-[#1C1C1C] capitalize">{data.claimedContribution}</strong></span>
              </div>
            </div>

            {/* Supporting Skill */}
            {data.relatedSkillName && (
              <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/50 block">
                    Validates Competency
                  </span>
                  <span className="text-xs font-black text-[#1C1C1C]">
                    {data.relatedSkillName}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                  Independently Substantiated
                </span>
              </div>
            )}

            {/* Extracted Summary */}
            <div className="space-y-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
                Extracted Summary
              </h3>
              <p className="p-4 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] text-xs text-[#1C1C1C]/85 leading-relaxed">
                {data.shortSummary}
              </p>
            </div>

            {/* Extracted Excerpt / Technical Proof */}
            {data.allowDetailInspection && data.extractedExcerpt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#1C1C1C]" />
                    Inspected Artifact Excerpt & Provenance
                  </h3>
                  <button
                    onClick={handleCopyExcerpt}
                    className="text-[11px] font-bold text-[#1C1C1C]/70 hover:text-[#1C1C1C] flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? "Copied" : "Copy Proof"}</span>
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-[#1C1C1C] text-[#FBF6DF] font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap break-all shadow-[2px_2px_0_0_#DFE968] border border-[#1C1C1C]">
                  {data.extractedExcerpt}
                </pre>
              </div>
            )}

            {/* External Source Link */}
            {data.allowDetailInspection && data.sourceUrl && (
              <div className="pt-2">
                <a
                  href={data.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-5 rounded-full bg-[#000000] hover:bg-[#1A1918] border-[2px] border-[#1A1918] text-xs font-black tracking-wider uppercase text-[#FAF8F5] shadow-[3px_3px_0_0_#1A1918] flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Open Genuine Source Artifact</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            )}

            {/* Trust and Grounding Notice */}
            <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 text-[11px] text-[#1C1C1C]/75 leading-relaxed space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[#1C1C1C]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>SkillPassport Trust & Verification Guarantee</span>
              </div>
              <p>
                {data.trustCertification ||
                  "Grounded directly in authentic code commits, repository telemetry, and verified source documents. Zero fabricated records."}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
