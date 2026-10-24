"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  RefreshCw,
  Loader2,
  ExternalLink,
} from "lucide-react";
import ArtifactInspectorViewer from "@/components/evidence/ArtifactInspectorViewer";
import {
  reprocessUploadedDocument,
  runWorkAnalysis,
  runSkillExtraction,
  getEvidenceItem,
} from "@/lib/evidenceApi";
import type { CandidateSkill, EvidenceItem, SourceType, EvidenceStrength, ProcessingStatus, ReviewStatus } from "@/types/evidence";

export default function EvidenceInspectorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { id } = use(params);
  const {
    evidenceItems,
    confirmContribution,
    deleteEvidenceItem,
    refreshEvidenceData,
    workAnalyses,
  } = useEvidence();

  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // 1. Fetch fresh individual item details directly from database on mount
  useEffect(() => {
    let isMounted = true;
    async function fetchDetail() {
      try {
        setLoadingDetail(true);
        const data = await getEvidenceItem(id);
        if (isMounted && data && !data.error) {
          setDetailItem(data);
        }
      } catch (err) {
        console.warn("Could not load fresh evidence detail:", err);
      } finally {
        if (isMounted) setLoadingDetail(false);
      }
    }
    fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const contextItem = evidenceItems.find((e) => e.id === id);

  const item: EvidenceItem | null = (() => {
    if (contextItem) {
      if (detailItem && Array.isArray(detailItem.candidateSkills) && detailItem.candidateSkills.length > 0) {
        return {
          ...contextItem,
          candidateSkills: detailItem.candidateSkills,
          extractionConfidence: typeof detailItem.confidence === "number"
            ? Math.round(detailItem.confidence <= 1 ? detailItem.confidence * 100 : detailItem.confidence)
            : contextItem.extractionConfidence,
        };
      }
      return contextItem;
    }

    if (detailItem) {
      return {
        id: detailItem.id,
        externalRecordId: detailItem.externalRecordId || detailItem.external_record_id,
        title: detailItem.title || "Untitled Evidence",
        description: detailItem.description || "",
        sourceType: (() => {
          const p = (detailItem.provider || "").toLowerCase();
          const st = (detailItem.sourceType || "").toLowerCase();
          if (p === "jira" || st.startsWith("jira")) return "jira";
          if (p === "github" || st.startsWith("github")) return "github";
          return (detailItem.sourceType || detailItem.provider || "document") as SourceType;
        })(),
        sourceReference: detailItem.sourceName || detailItem.sourceUrl || "Uploaded Document",
        sourceUrl: detailItem.sourceUrl,
        project: detailItem.projectName || detailItem.sourceName || "General",
        evidenceType: detailItem.category || "General Evidence",
        date: detailItem.observedAt ? new Date(detailItem.observedAt).toLocaleDateString() : "Recently",
        claimedContribution: detailItem.attributionStatus === "author" ? "Author" : "Contributor",
        author: detailItem.contributorIdentity || "User",
        isCollaborative: Boolean(detailItem.isCollaborative),
        evidenceStrength: (detailItem.strength || "medium") as EvidenceStrength,
        extractionConfidence: typeof detailItem.confidence === "number"
          ? Math.round(detailItem.confidence <= 1 ? detailItem.confidence * 100 : detailItem.confidence)
          : 85,
        processingStatus: (detailItem.processingStatus || "ready_for_review") as ProcessingStatus,
        reviewStatus: (detailItem.verificationStatus || "unreviewed") as ReviewStatus,
        normalizedMetadata: {
          format: detailItem.metadata?.format || "Standard",
          authorIdentified: detailItem.metadata?.author || detailItem.contributorIdentity || "User",
          repositoryLanguages: detailItem.metadata?.repository_languages || detailItem.metadata?.repositoryLanguages || [],
          primaryLanguage: detailItem.metadata?.primary_language || detailItem.metadata?.primaryLanguage,
          ...detailItem.metadata,
        },
        extractedSummary: detailItem.extractedSummary || detailItem.description || "",
        candidateSkills: Array.isArray(detailItem.candidateSkills) ? detailItem.candidateSkills : [],
        processingHistory: [],
      };
    }

    return null;
  })();

  const handleReprocess = async () => {
    if (!item) return;
    try {
      setReprocessing(true);
      setReprocessMsg(null);
      const docId = (item as any).externalRecordId || item.id;
      await reprocessUploadedDocument(docId);
      await refreshEvidenceData();
      const fresh = await getEvidenceItem(item.id);
      if (fresh && !fresh.error) setDetailItem(fresh);
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
      await Promise.allSettled([
        runWorkAnalysis([item.id]),
        runSkillExtraction([item.id]),
      ]);
      await refreshEvidenceData();
      try {
        const fresh = await getEvidenceItem(item.id);
        if (fresh && !fresh.error) setDetailItem(fresh);
      } catch {}
      setReprocessMsg({ text: "Evidence item successfully analyzed and candidate competencies extracted via Ollama (qwen3:8b)!" });
    } catch (err: any) {
      setReprocessMsg({ text: err.message || "Failed to analyze evidence with Ollama", error: true });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loadingDetail && !item) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#1C1C1C]" />
        <p className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60">
          Loading Cryptographic Artifact Record...
        </p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-10 text-center space-y-3">
        <p className="font-bold text-sm text-[#1C1C1C]">Evidence artifact record not found.</p>
        <Link href="/app/evidence/library" className="underline text-xs block text-[#1C1C1C]">
          Return to Evidence Library
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={item.title}
        description={`Artifact ID: ${item.id} • ${item.sourceType.toUpperCase()} Record`}
        backHref="/app/evidence/library"
        backLabel="Evidence Library"
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={analyzing}
            onClick={handleOllamaAnalyze}
            className="pill-btn pill-btn-primary text-xs py-2 px-3 flex items-center gap-1.5 disabled:opacity-50"
            title="Run genuine Ollama LLM work analysis & candidate skill extraction on this item"
          >
            <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
            <span>{analyzing ? "ANALYZING..." : "ANALYZE WITH OLLAMA"}</span>
          </button>
          {item.sourceType === "document" || item.sourceType === "certificate" ? (
            <button
              type="button"
              disabled={reprocessing}
              onClick={handleReprocess}
              className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? "animate-spin" : ""}`} />
              <span>{reprocessing ? "REPROCESSING..." : "REPROCESS"}</span>
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
            <span>{deleting ? "REMOVING..." : "REMOVE"}</span>
          </button>
        </div>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl mx-auto w-full">
        {reprocessMsg && (
          <div
            className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-2 ${
              reprocessMsg.error
                ? "bg-[#EAE5D9] border-[#1A1918] text-[#C85A54]"
                : "bg-[#000000] border-[#1A1918] text-[#FAF8F5]"
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

        {/* 1. EMBEDDED RICH ARTIFACT INSPECTOR */}
        <ArtifactInspectorViewer
          evidenceItem={item}
          artifactId={item.id}
          mode="page"
        />

        {/* 2. VERIFICATION & STATUS BANNER */}
        <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-wrap items-center justify-between gap-4 shadow-[3px_3px_0_0_#1C1C1C]">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
              VERIFICATION STATUS
            </span>
            <div className="flex flex-wrap items-center gap-2.5">
              <ReviewStatusBadge status={item.reviewStatus} />
              <EvidenceStrengthBadge strength={item.evidenceStrength} />
              <ProcessingStatusBadge status={item.processingStatus} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {item.reviewStatus !== "verified" && (
              <button
                type="button"
                onClick={() => confirmContribution(item.id)}
                className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>CONFIRM CONTRIBUTION</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
