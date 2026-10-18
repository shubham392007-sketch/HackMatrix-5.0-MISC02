"use client";

import { useState, use } from "react";
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
  Code2,
  RefreshCw,
  Cpu,
} from "lucide-react";
import RepositoryLanguageBar from "@/components/evidence/RepositoryLanguageBar";
import { reprocessUploadedDocument, runWorkAnalysis } from "@/lib/evidenceApi";

export default function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const { evidenceItems, confirmContribution, deleteEvidenceItem, refreshEvidenceData, workAnalyses } = useEvidence();
  const [reprocessing, setReprocessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const item = evidenceItems.find((e) => e.id === id);

  const handleReprocess = async () => {
    if (!item) return;
    try {
      setReprocessing(true);
      setReprocessMsg(null);
      const docId = (item as any).externalRecordId || item.id;
      await reprocessUploadedDocument(docId);
      await refreshEvidenceData();
      setReprocessMsg({ text: "Artifact successfully reprocessed with OCR and AI!" });
    } catch (err: any) {
      setReprocessMsg({ text: err.message || "Failed to reprocess document", error: true });
    } finally {
      setReprocessing(false);
    }
  };

  const handleOllamaAnalyze = async () => {
    if (!item) return;
    try {
      setAnalyzing(true);
      setReprocessMsg(null);
      await runWorkAnalysis([item.id]);
      await refreshEvidenceData();
      setReprocessMsg({ text: "Evidence item successfully analyzed using local Ollama (qwen3:8b)!" });
    } catch (err: any) {
      setReprocessMsg({ text: err.message || "Failed to analyze evidence with Ollama", error: true });
    } finally {
      setAnalyzing(false);
    }
  };

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
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={analyzing}
            onClick={handleOllamaAnalyze}
            className="pill-btn pill-btn-primary text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
            title="Run genuine Ollama LLM work analysis on this item"
          >
            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
            <span>{analyzing ? "ANALYZING WITH OLLAMA ···" : "ANALYZE WITH OLLAMA"}</span>
          </button>
          {item.sourceType === "document" || item.sourceType === "certificate" ? (
            <button
              type="button"
              disabled={reprocessing}
              onClick={handleReprocess}
              className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? "animate-spin" : ""}`} />
              <span>{reprocessing ? "REPROCESSING ···" : "REPROCESS ARTIFACT"}</span>
            </button>
          ) : null}
          <button
            type="button"
            disabled={deleting}
            onClick={async () => {
              if (confirm(`Remove evidence item "${item.title}"?`)) {
                try {
                  setDeleting(true);
                  await deleteEvidenceItem(item.id);
                  router.push("/app/evidence/library");
                } catch (e) {
                  setDeleting(false);
                }
              }
            }}
            className="pill-btn pill-btn-secondary text-xs text-[#C85A54] py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            <span>{deleting ? "REMOVING ···" : "REMOVE"}</span>
          </button>
        </div>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        {reprocessMsg && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              reprocessMsg.error
                ? "bg-[#F6C8D6] border-[#1C1C1C] text-[#C85A54]"
                : "bg-[#DFE968] border-[#1C1C1C] text-[#1C1C1C]"
            }`}
          >
            {reprocessMsg.error ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#4A7A4E]" />
            )}
            <span>{reprocessMsg.text}</span>
          </div>
        )}
        {/* A. Evidence Overview & Status Bar */}
        {(() => {
          const analysis = workAnalyses.find((a) => a.source_id === item.id);
          const isOllamaAnalyzed = analysis && analysis.status === "completed" && analysis.analysis_method === "ollama";
          const isRuleBased = analysis && (analysis.analysis_method === "rule_based" || analysis.fallback_used);

          return (
            <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-wrap items-center justify-between gap-4 shadow-[3px_3px_0_0_#1C1C1C]">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                  VERIFICATION STATUS
                </span>
                <div className="flex flex-wrap items-center gap-2.5">
                  <ReviewStatusBadge status={item.reviewStatus} />
                  <ProcessingStatusBadge status={item.processingStatus} />
                  <EvidenceStrengthBadge strength={item.evidenceStrength} />
                  {isOllamaAnalyzed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-[#1C1C1C] bg-[#DFE968] text-[#1C1C1C]">
                      <Cpu className="w-3 h-3 text-[#1C1C1C]" />
                      {analysis.model_name || "qwen3:8b"}
                    </span>
                  ) : isRuleBased ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#1C1C1C] bg-[#FBF1CF] text-[#1C1C1C]/70">
                      RULE-BASED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-dashed border-[#1C1C1C]/40 bg-white text-[#1C1C1C]/50">
                      NOT ANALYZED
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/app/ai/work-analysis?evidence_id=${item.id}`}
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>INSPECT AI ANALYSIS</span>
                </Link>
              </div>
            </div>
          );
        })()}

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

        {/* C. Repository Languages Contextual Panel (when evidence originates from GitHub) */}
        {item.sourceType === "github" && (
          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-3 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/15 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#1C1C1C]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                  Repository Languages • Contextual Technology Signal
                </h3>
              </div>
              <Link
                href="/app/evidence/sources/github"
                className="text-xs font-bold underline text-[#1C1C1C] hover:opacity-75 inline-flex items-center gap-1"
              >
                <span>View Full Repository Analysis</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <p className="text-xs text-[#1C1C1C]/75">
              Surrounding codebase composition for repository <span className="font-mono font-bold text-[#1C1C1C]">{item.project || item.sourceReference}</span>.
              <span className="italic block mt-1 text-[#1C1C1C]/60">
                Notice: Repository-level language distribution indicates the codebase environment and is preserved as context. It does not infer this specific pull request or commit contains these exact proportions.
              </span>
            </p>

            {item.normalizedMetadata?.repositoryLanguages && item.normalizedMetadata.repositoryLanguages.length > 0 ? (
              <div className="pt-2">
                <RepositoryLanguageBar
                  languages={item.normalizedMetadata.repositoryLanguages.map((l) => ({
                    name: l.name,
                    bytes: l.bytes || 0,
                    percentage: l.percentage,
                  }))}
                  compact={true}
                  showTitle={false}
                />
              </div>
            ) : (
              <div className="p-3 bg-white/70 rounded-xl border border-[#1C1C1C]/20 text-xs text-[#1C1C1C]/60 flex items-center justify-between">
                <span>Repository language statistics available in Connected Sources.</span>
                <Link
                  href="/app/evidence/sources/github"
                  className="pill-btn pill-btn-secondary text-[10px] py-1 px-2.5"
                >
                  INSPECT REPO
                </Link>
              </div>
            )}
          </div>
        )}

        {/* D. Contribution Attribution & Human Review Action */}
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

          {item.candidateSkills.length === 0 ? (
            <div className="p-8 rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C] bg-[#FBF1CF] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#C85A54] mx-auto" />
              <h4 className="text-sm font-black text-[#1C1C1C]">No Supported Candidate Competencies</h4>
              <p className="text-xs font-medium text-[#1C1C1C]/75 max-w-lg mx-auto">
                The source artifact contained insufficient verifiable text to propose candidate competencies. SkillPassport enforces strict grounding: skills are never fabricated from person names or file names alone.
              </p>
              {(item.sourceType === "document" || item.sourceType === "certificate") && (
                <button
                  type="button"
                  onClick={handleReprocess}
                  disabled={reprocessing}
                  className="pill-btn pill-btn-primary text-xs py-2 px-5 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{reprocessing ? "Reprocessing Artifact ···" : "Reprocess with OCR & AI"}</span>
                </button>
              )}
            </div>
          ) : (
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
          )}
        </div>
      </main>
    </div>
  );
}
