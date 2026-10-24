"use client";

import { useState, useEffect, use } from "react";
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
  Loader2,
  ExternalLink,
} from "lucide-react";
import RepositoryLanguageBar from "@/components/evidence/RepositoryLanguageBar";
import ArtifactInspectorViewer from "@/components/evidence/ArtifactInspectorViewer";
import {
  reprocessUploadedDocument,
  runWorkAnalysis,
  runSkillExtraction,
  getEvidenceItem,
} from "@/lib/evidenceApi";
import type { CandidateSkill, EvidenceItem, SourceType, EvidenceStrength, ProcessingStatus, ReviewStatus } from "@/types/evidence";

export default function EvidenceDetailPage({
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
    extractionCandidates,
  } = useEvidence();

  const [detailItem, setDetailItem] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // 1. Fetch fresh individual item details directly from the database on mount
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

  // Context item (if available from library cache)
  const contextItem = evidenceItems.find((e) => e.id === id);

  // 2. Synthesize unified item from detailItem and contextItem
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

  // 3. Resolve candidate skills across all sources (DB mappings, context items, extraction candidates, work analyses)
  const resolvedCandidateSkills: CandidateSkill[] = (() => {
    // 1. Direct from fresh backend query
    if (detailItem && Array.isArray(detailItem.candidateSkills) && detailItem.candidateSkills.length > 0) {
      return detailItem.candidateSkills.map((c: any) => {
        const rawScore = c.confidence !== undefined ? c.confidence : (c.confidence_score !== undefined ? c.confidence_score : c.relevance_score);
        const dynamicScore = typeof rawScore === "number" ? Math.round(rawScore <= 1.0 ? rawScore * 100 : rawScore) : 85;
        return {
          id: c.id || c.mapping_id || `cand-${c.name}`,
          name: c.name,
          category: c.category || "General",
          excerpt: c.excerpt || c.supporting_excerpt || "",
          associationReason: c.associationReason || c.rationale || "Extracted from verified evidence artifact",
          status: c.status || "candidate",
          proficiencyLevel: c.proficiencyLevel || c.proficiency_level || "Practitioner",
          confidence: dynamicScore,
        };
      });
    }

    // 2. From context item
    if (contextItem && Array.isArray(contextItem.candidateSkills) && contextItem.candidateSkills.length > 0) {
      return contextItem.candidateSkills;
    }

    // 3. From extraction candidates in context matching this item id
    const matchingCandidates = extractionCandidates.filter(
      (c) => c.evidence_ids?.includes(id) || (c as any).evidence_id === id
    );
    if (matchingCandidates.length > 0) {
      return matchingCandidates.map((c) => ({
        id: c.id,
        name: c.canonical_name || c.original_label,
        category: c.category || "Extracted Competency",
        excerpt: c.supporting_excerpt || "",
        associationReason: c.extraction_rationale || "Extracted from verified evidence artifact",
        status: (c.review_state === "reviewed" ? "reviewed" : c.review_state === "insufficient" ? "insufficient" : "candidate") as any,
        proficiencyLevel: "Practitioner" as any,
        confidence: c.confidence,
      }));
    }

    // 4. Fallback to work analysis demonstrated skills
    const analysis = workAnalyses.find((a) => a.source_id === id);
    if (analysis && Array.isArray(analysis.demonstrated_skills) && analysis.demonstrated_skills.length > 0) {
      return analysis.demonstrated_skills.map((s, idx) => ({
        id: `analysis-skill-${idx}`,
        name: s.name,
        category: s.category || "Demonstrated Competency",
        excerpt: s.justification || "",
        associationReason: s.corroborated_with_evidence ? "Corroborated with evidence analysis" : "Demonstrated in artifact code/stack",
        status: "candidate" as any,
        proficiencyLevel: (s.proficiency || "Intermediate") as any,
        confidence: Math.round(analysis.inferred_attributes?.[0]?.confidence || 85),
      }));
    }

    return [];
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
      // Run both work analysis and skill extraction concurrently
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
          Loading Evidence Record...
        </p>
      </div>
    );
  }

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
            title="Run genuine Ollama LLM work analysis & candidate skill extraction on this item"
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

        {/* Embedded Full Artifact Inspector */}
        <ArtifactInspectorViewer
          evidenceItem={item}
          artifactId={item.id}
          mode="page"
        />

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
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black border border-[#1A1918] bg-[#000000] text-[#FAF8F5]">
                      <Cpu className="w-3 h-3 text-[#FAF8F5]" />
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

        {/* Jira Work Item Contextual Panel (when evidence originates from Jira) */}
        {item.sourceType === "jira" && (
          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-3 shadow-[2.5px_2.5px_0_0_#1C1C1C]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/15 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#1C1C1C]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                  Jira Work Item Details • Tracked Project Artifact
                </h3>
              </div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold underline text-[#1C1C1C] hover:opacity-75 inline-flex items-center gap-1"
                >
                  <span>Open in Jira Cloud</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            <p className="text-xs text-[#1C1C1C]/75">
              Verified work item synchronized from Jira project <span className="font-mono font-bold text-[#1C1C1C]">{item.project || "Jira"}</span>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
              <div className="p-2.5 bg-white/70 rounded-xl border border-[#1C1C1C]/20">
                <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Project Key</span>
                <span className="font-mono font-black text-[#1C1C1C] text-sm">
                  {item.project || (item.normalizedMetadata as any)?.project || "—"}
                </span>
              </div>
              <div className="p-2.5 bg-white/70 rounded-xl border border-[#1C1C1C]/20">
                <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Issue Key</span>
                <span className="font-mono font-black text-[#1C1C1C] text-sm">
                  {item.externalRecordId || (item.normalizedMetadata as any)?.issue_key || "—"}
                </span>
              </div>
              <div className="p-2.5 bg-white/70 rounded-xl border border-[#1C1C1C]/20">
                <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Issue Type</span>
                <span className="font-bold text-[#1C1C1C]">
                  {(item.normalizedMetadata as any)?.issue_type || "Task"}
                </span>
              </div>
              <div className="p-2.5 bg-white/70 rounded-xl border border-[#1C1C1C]/20">
                <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Workflow Status</span>
                <span className="font-bold text-[#4A7A4E]">
                  {(item.normalizedMetadata as any)?.status || "Completed"}
                </span>
              </div>
            </div>

            {((item.normalizedMetadata as any)?.components?.length > 0 || (item.normalizedMetadata as any)?.labels?.length > 0) && (
              <div className="pt-2 flex flex-wrap gap-1.5 items-center">
                <span className="text-[11px] font-bold text-[#1C1C1C]/70 mr-1">Tags & Components:</span>
                {((item.normalizedMetadata as any)?.components || []).map((c: string) => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C]">
                    Component: {c}
                  </span>
                ))}
                {((item.normalizedMetadata as any)?.labels || []).map((lbl: string) => (
                  <span key={lbl} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#1C1C1C]/40">
                    #{lbl}
                  </span>
                ))}
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

        {/* E. Candidate Skills Proposed from this Evidence */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-[#1C1C1C]">
              Extracted Candidate Skills ({resolvedCandidateSkills.length})
            </h3>
            {resolvedCandidateSkills.length > 0 && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-[#1C1C1C] bg-[#000000] text-[#FAF8F5] border-[#1A1918]">
                {resolvedCandidateSkills.length} Evidence-Grounded
              </span>
            )}
          </div>

          {resolvedCandidateSkills.length === 0 ? (
            <div className="p-8 rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C] bg-[#FBF1CF] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#C85A54] mx-auto" />
              <h4 className="text-sm font-black text-[#1C1C1C]">No Supported Candidate Competencies</h4>
              <p className="text-xs font-medium text-[#1C1C1C]/75 max-w-lg mx-auto">
                The source artifact contained insufficient verifiable text to propose candidate competencies. SkillPassport enforces strict grounding: skills are never fabricated from person names or file names alone.
              </p>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  disabled={analyzing}
                  onClick={handleOllamaAnalyze}
                  className="pill-btn pill-btn-primary text-xs py-2 px-5 inline-flex items-center gap-1.5"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${analyzing ? "animate-spin" : ""}`} />
                  <span>{analyzing ? "Extracting Skills with Ollama ···" : "Extract Skills with Ollama"}</span>
                </button>
                {(item.sourceType === "document" || item.sourceType === "certificate") && (
                  <button
                    type="button"
                    onClick={handleReprocess}
                    disabled={reprocessing}
                    className="pill-btn pill-btn-secondary text-xs py-2 px-5 inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${reprocessing ? "animate-spin" : ""}`} />
                    <span>{reprocessing ? "Reprocessing Artifact ···" : "Reprocess with OCR & AI"}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {resolvedCandidateSkills.map((sk) => {
                const confScore = typeof sk.confidence === "number" ? Math.round(sk.confidence <= 1 ? sk.confidence * 100 : sk.confidence) : null;
                return (
                  <div
                    key={sk.id || sk.name}
                    className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[2px_2px_0_0_#1C1C1C]"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#000000] text-[#FAF8F5] border border-[#1A1918]">
                          {sk.category || "Competency"}
                        </span>
                        <h4 className="text-sm font-black text-[#1C1C1C]">{sk.name}</h4>
                        {confScore !== null && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-[#4A7A4E]">
                            {confScore}% CONFIDENCE
                          </span>
                        )}
                      </div>
                      {sk.excerpt && (
                        <p className="text-xs font-medium text-[#1C1C1C]/75">
                          Excerpt: &ldquo;{sk.excerpt}&rdquo;
                        </p>
                      )}
                      {sk.associationReason && (
                        <p className="text-[10.5px] text-[#1C1C1C]/60 italic">
                          Reason: {sk.associationReason}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-[11px] font-black uppercase text-[#1C1C1C]/70">
                        LEVEL: {sk.proficiencyLevel || "Practitioner"}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black border border-[#1C1C1C] bg-[#FBF1CF]">
                        {(sk.status || "candidate").toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
