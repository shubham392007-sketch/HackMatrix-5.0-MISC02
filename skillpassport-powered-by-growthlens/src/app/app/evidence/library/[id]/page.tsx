"use client";

import { use } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  ProcessingStatusBadge,
  ReviewStatusBadge,
  EvidenceStrengthBadge,
} from "@/components/app/StatusBadges";
import {
  FileText,
  ShieldCheck,
  GitBranch,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Trash2,
} from "lucide-react";

export default function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { evidenceItems, confirmContribution, deleteEvidenceItem } = useEvidence();

  const item = evidenceItems.find((e) => e.id === id);

  if (!item) {
    return (
      <div className="p-10 text-center">
        <p className="font-bold">Evidence record not found.</p>
        <Link href="/app/evidence/library" className="underline text-xs mt-2 block">
          Return to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={item.title}
        description={`Record ID: ${item.id} • Sourced from ${item.sourceType.toUpperCase()}`}
        backHref="/app/evidence/library"
        backLabel="Evidence Library"
      >
        <button
          type="button"
          onClick={() => {
            if (confirm(`Remove evidence item "${item.title}"?`)) {
              deleteEvidenceItem(item.id);
              router.push("/app/evidence/library");
            }
          }}
          className="pill-btn pill-btn-secondary text-xs text-[#C85A54] py-2 px-3 flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>REMOVE</span>
        </button>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        {/* A. Evidence Overview & Status Bar */}
        <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-wrap items-center justify-between gap-4 shadow-[3px_3px_0_0_#1C1C1C]">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
              VERIFICATION STATUS
            </span>
            <div className="flex items-center gap-3">
              <ReviewStatusBadge status={item.reviewStatus} />
              <ProcessingStatusBadge status={item.processingStatus} />
              <EvidenceStrengthBadge strength={item.evidenceStrength} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/app/evidence/analysis/${item.id}`}
              className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>INSPECT AI ANALYSIS</span>
            </Link>
          </div>
        </div>

        {/* B. Original vs Normalized Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF1CF] space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Original Source Metadata
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span>Source Channel:</span>
                <span className="uppercase">{item.sourceType}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Source Locator:</span>
                <span className="font-mono">{item.sourceReference}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Observed Date:</span>
                <span>{item.date}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Identified Author:</span>
                <span>{item.author}</span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Normalized Extraction Metrics
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-bold">
                <span>Format / Container:</span>
                <span>{item.normalizedMetadata.format}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Extraction Confidence:</span>
                <span className="text-[#4A7A4E] font-black">{item.extractionConfidence}%</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Collaborative Flag:</span>
                <span>{item.isCollaborative ? "Yes (Multi-contributor)" : "Individual"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* C. Contribution Attribution & Human Review Action */}
        <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
              Claimed Contribution &amp; Ownership
            </h3>
            {item.reviewStatus !== "verified" && (
              <button
                type="button"
                onClick={() => confirmContribution(item.id)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONFIRM CONTRIBUTION</span>
              </button>
            )}
          </div>
          <p className="text-xs font-medium text-[#1C1C1C]/85 leading-relaxed bg-[#FBF1CF] p-4 rounded-xl border border-[#1C1C1C]">
            &ldquo;{item.claimedContribution}&rdquo;
          </p>
        </div>

        {/* D. Candidate Skills Proposed from this Evidence */}
        <div className="space-y-4">
          <h3 className="text-base font-black text-[#1C1C1C]">
            Extracted Candidate Skills ({item.candidateSkills.length})
          </h3>

          <div className="space-y-3">
            {item.candidateSkills.map((sk) => (
              <div
                key={sk.id}
                className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#DFE968] border border-[#1C1C1C]">
                      {sk.category}
                    </span>
                    <h4 className="text-sm font-black text-[#1C1C1C]">{sk.name}</h4>
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/75">
                    Excerpt: &ldquo;{sk.excerpt}&rdquo;
                  </p>
                  <p className="text-[10.5px] text-[#1C1C1C]/60 italic">
                    Reason: {sk.associationReason}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-3">
                  <span className="text-[11px] font-black uppercase text-[#1C1C1C]/70">
                    LEVEL: {sk.proficiencyLevel}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black border border-[#1C1C1C] bg-[#FBF1CF]">
                    {sk.status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
