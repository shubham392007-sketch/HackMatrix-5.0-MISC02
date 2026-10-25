"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  GitBranch,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  ExternalLink,
  Eye,
  Hash,
  Cpu,
  Globe,
  Award,
  Copy,
  Check,
  RefreshCw,
  Maximize2,
  BookOpen,
  Calendar,
  User,
  CheckSquare,
  Square,
  FileCode,
  Lock,
} from "lucide-react";
import RepositoryLanguageBar, { formatBytes } from "@/components/evidence/RepositoryLanguageBar";
import MarkdownViewer from "@/components/evidence/MarkdownViewer";
import {
  VaultArtifactDetail,
  VaultArtifactType,
  fetchVaultPreviewBlob,
  triggerVaultDownload,
  getVaultArtifactDetail,
} from "@/lib/vaultApi";
import { getEvidenceItem } from "@/lib/evidenceApi";
import type { CandidateSkill, EvidenceItem } from "@/types/evidence";

export interface ArtifactInspectorViewerProps {
  evidenceItem?: EvidenceItem | null;
  vaultArtifact?: VaultArtifactDetail | null;
  artifactId?: string;
  artifactType?: VaultArtifactType;
  onClose?: () => void;
  mode?: "page" | "modal";
}

export default function ArtifactInspectorViewer({
  evidenceItem: initialItem,
  vaultArtifact: initialVaultArtifact,
  artifactId: propArtifactId,
  artifactType: propArtifactType = "evidence",
  onClose,
  mode = "page",
}: ArtifactInspectorViewerProps) {
  const [activeTab, setActiveTab] = useState<"viewer" | "verbatim" | "skills" | "provenance">("viewer");
  const [evidenceItem, setEvidenceItem] = useState<EvidenceItem | null>(initialItem || null);
  const [vaultArtifact, setVaultArtifact] = useState<VaultArtifactDetail | null>(initialVaultArtifact || null);
  const [loading, setLoading] = useState<boolean>(!initialItem && !initialVaultArtifact && Boolean(propArtifactId));
  const [error, setError] = useState<string | null>(null);

  // Binary stream state for PDF and image previews
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [copiedSha, setCopiedSha] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [rawTextMode, setRawTextMode] = useState<boolean>(false);

  const effectiveId = propArtifactId || evidenceItem?.id || vaultArtifact?.id;

  // 1. Fetch item/artifact data if not passed directly
  useEffect(() => {
    let isMounted = true;
    if (!effectiveId) return;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch vault artifact details first
        try {
          const vData = await getVaultArtifactDetail(propArtifactType, effectiveId!);
          if (isMounted && vData) {
            setVaultArtifact(vData);
          }
        } catch (vErr) {
          console.debug("Vault detail fetch fallback:", vErr);
        }

        // Fetch evidence item details
        if (!evidenceItem) {
          try {
            const eData = await getEvidenceItem(effectiveId!);
            if (isMounted && eData && !eData.error) {
              setEvidenceItem(eData);
            }
          } catch (eErr) {
            console.debug("Evidence detail fetch fallback:", eErr);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load artifact");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (!evidenceItem || !vaultArtifact) {
      loadData();
    }

    return () => {
      isMounted = false;
    };
  }, [effectiveId, propArtifactType]);

  // 2. Fetch binary stream (PDF / image) when available
  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    async function fetchStream() {
      const mime = (vaultArtifact?.mime_type || (evidenceItem?.normalizedMetadata as any)?.format || "").toLowerCase();
      const filename = (vaultArtifact?.filename || evidenceItem?.sourceReference || "").toLowerCase();
      const isPdf = mime.includes("pdf") || filename.endsWith(".pdf");
      const isImage = mime.includes("image") || /\.(png|jpe?g|webp|gif)$/i.test(filename);

      if ((isPdf || isImage) && (vaultArtifact?.has_original_file || vaultArtifact?.id || evidenceItem?.id)) {
        try {
          setPreviewLoading(true);
          setPreviewError(null);
          const targetType = vaultArtifact?.artifact_type || "evidence";
          const targetId = vaultArtifact?.id || evidenceItem?.id;
          if (targetId) {
            const { blobUrl } = await fetchVaultPreviewBlob(targetType, targetId);
            if (isMounted) {
              createdUrl = blobUrl;
              setPreviewBlobUrl(blobUrl);
            }
          }
        } catch (err: any) {
          if (isMounted) {
            setPreviewError(err.message || "Preview stream could not be loaded");
          }
        } finally {
          if (isMounted) setPreviewLoading(false);
        }
      }
    }

    fetchStream();

    return () => {
      isMounted = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [vaultArtifact, evidenceItem]);

  // Unified metadata resolution
  const title = vaultArtifact?.title || evidenceItem?.title || "Artifact Document";
  const sourceProvider = (vaultArtifact?.source_provider || evidenceItem?.sourceType || "document").toLowerCase();
  const category = (vaultArtifact?.category || evidenceItem?.evidenceType || "").toLowerCase();
  const rawText = vaultArtifact?.full_extracted_text || (evidenceItem as any)?.extractedExcerpt || evidenceItem?.description || "";
  const summary = vaultArtifact?.extracted_summary || evidenceItem?.extractedSummary || evidenceItem?.description || "";
  const sourceUrl = vaultArtifact?.source_url || evidenceItem?.sourceUrl;
  const sha256 = vaultArtifact?.provenance?.sha256 || (evidenceItem as any)?.contentHash || (evidenceItem as any)?.provenance?.sha256 || "";
  const candidateSkills: CandidateSkill[] = (vaultArtifact?.linked_evidence?.candidate_skills || evidenceItem?.candidateSkills || []) as CandidateSkill[];

  // Determine artifact category
  const isCertificate =
    category === "certification" ||
    category === "certificate" ||
    sourceProvider === "certificate" ||
    title.toLowerCase().includes("certificate") ||
    title.toLowerCase().includes("cert") ||
    title.toLowerCase().includes("job simulation") ||
    title.toLowerCase().includes("accreditation");

  const isGitHub =
    sourceProvider === "github" ||
    category === "code_repository" ||
    title.toLowerCase().includes("github") ||
    Boolean(vaultArtifact?.provenance?.repo_full_name);

  const isJira =
    sourceProvider === "jira" ||
    category === "work_ticket" ||
    Boolean((evidenceItem?.normalizedMetadata as any)?.issue_key) ||
    Boolean((evidenceItem?.normalizedMetadata as any)?.project);

  const isWebsite =
    sourceProvider === "portfolio" ||
    sourceProvider === "web_crawl" ||
    category === "portfolio" ||
    vaultArtifact?.artifact_type === "web_snapshot";

  const handleDownload = async () => {
    if (!effectiveId) return;
    try {
      setIsDownloading(true);
      const targetType = vaultArtifact?.artifact_type || "evidence";
      await triggerVaultDownload(targetType, effectiveId, vaultArtifact?.filename || `${title}.pdf`);
    } catch (err: any) {
      alert(`Download failed: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopySha = () => {
    if (sha256 && navigator?.clipboard) {
      navigator.clipboard.writeText(sha256);
      setCopiedSha(true);
      setTimeout(() => setCopiedSha(false), 2000);
    }
  };

  const handleCopyText = () => {
    if (rawText && navigator?.clipboard) {
      navigator.clipboard.writeText(rawText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="p-16 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] flex flex-col items-center justify-center space-y-3 shadow-[3px_3px_0_0_#1C1C1C]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#1C1C1C]" />
        <p className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70">
          Loading Cryptographic Artifact Viewer...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-[24px] border-[2px] border-[#1C1C1C] bg-[#FAF8F5] shadow-[4px_4px_0_0_#1C1C1C] overflow-hidden flex flex-col">
      {/* 1. TOP HEADER & ARTIFACT BADGE BAR */}
      <div className="p-5 sm:p-6 bg-[#FBF6DF] border-b-[1.5px] border-[#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
              {isCertificate ? (
                <>
                  <Award className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>Verified Credential & Certificate</span>
                </>
              ) : isGitHub ? (
                <>
                  <GitBranch className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>Repository Code Deliverable</span>
                </>
              ) : isJira ? (
                <>
                  <Layers className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>Jira Tracked Work Ticket</span>
                </>
              ) : isWebsite ? (
                <>
                  <Globe className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>Web Capture & Portfolio Record</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  <span>Technical Project Document</span>
                </>
              )}
            </span>

            {sha256 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white border border-[#1C1C1C]/30 text-[#1C1C1C]">
                <ShieldCheck className="w-3 h-3 text-[#4A7A4E]" />
                <span>SHA-256: {sha256.substring(0, 8)}...</span>
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-black text-[#1C1C1C] leading-snug">{title}</h2>
          <p className="text-xs text-[#1C1C1C]/70">
            {vaultArtifact?.filename || evidenceItem?.sourceReference || "Verified digital deliverable"} • Observed{" "}
            {evidenceItem?.date || (vaultArtifact?.created_at ? new Date(vaultArtifact.created_at).toLocaleDateString() : "Recently")}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          {(vaultArtifact?.has_original_file || previewBlobUrl) && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
              title="Download verified original document"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
              <span>{isDownloading ? "DOWNLOADING..." : "DOWNLOAD ORIGINAL"}</span>
            </button>
          )}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
              title="Open authoritative external record in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>VISIT SOURCE</span>
            </a>
          )}

          {mode === "modal" && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full border border-[#1C1C1C] bg-white hover:bg-[#1C1C1C] hover:text-white transition-colors"
              title="Close modal"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 2. INSPECTION TABS */}
      <div className="flex items-center gap-1 px-5 pt-3 border-b border-[#1C1C1C]/15 bg-[#FBF1CF] overflow-x-auto">
        {[
          { id: "viewer", label: "Artifact View", icon: Eye },
          { id: "verbatim", label: "Extracted Verbatim Text", icon: FileText },
          { id: "skills", label: `Grounded Skills (${candidateSkills.length})`, icon: Sparkles },
          { id: "provenance", label: "Security & Provenance", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 text-xs font-black rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-[#FAF8F5] border-[#1C1C1C] text-[#1C1C1C] shadow-[0_2px_0_0_#FAF8F5]"
                  : "border-transparent text-[#1C1C1C]/60 hover:text-[#1C1C1C] hover:bg-white/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN INSPECTOR CONTENT */}
      <div className="p-5 sm:p-7 space-y-6 flex-1 overflow-y-auto">
        {/* TAB 1: ARTIFACT VIEWER */}
        {activeTab === "viewer" && (
          <div className="space-y-6">
            {/* A. CERTIFICATE SHOWCASE */}
            {isCertificate && (
              <div className="space-y-5">
                {/* Visual Diploma / Certificate Frame */}
                <div className="relative rounded-[20px] border-[3px] border-[#1C1C1C] bg-[#FFFDF5] p-6 sm:p-10 shadow-[4px_4px_0_0_#1C1C1C] overflow-hidden">
                  {/* Decorative Vintage Certificate Corner Accents */}
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-[#1C1C1C]" />
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-[#1C1C1C]" />
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-[#1C1C1C]" />
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-[#1C1C1C]" />

                  <div className="text-center space-y-4 max-w-2xl mx-auto">
                    {/* Gold Seal Emblem */}
                    <div className="w-16 h-16 rounded-full bg-[#DFE968] border-[2px] border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[2px_2px_0_0_#1C1C1C]">
                      <Award className="w-9 h-9 text-[#1C1C1C]" />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-black uppercase tracking-[0.25em] text-[#1C1C1C]/60 block">
                        CERTIFICATE OF COMPLETION &amp; COMPETENCY
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1C] tracking-tight">{title}</h3>
                    </div>

                    <p className="text-xs sm:text-sm text-[#1C1C1C]/80 italic font-serif">
                      This credential officially certifies verified demonstrated competence and completion of accredited curriculum.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-left">
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#1C1C1C]/20">
                        <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">RECIPIENT</span>
                        <span className="text-xs font-black text-[#1C1C1C]">
                          {evidenceItem?.author || "Verified Learner"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#1C1C1C]/20">
                        <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">ISSUED BY / PROGRAM</span>
                        <span className="text-xs font-black text-[#1C1C1C]">
                          {evidenceItem?.project || (evidenceItem?.normalizedMetadata as any)?.issuer || "Accredited Authority"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#FAF8F5] rounded-xl border border-[#1C1C1C]/20">
                        <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">STATUS</span>
                        <span className="text-xs font-black text-[#4A7A4E] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tamper-Evident Verified</span>
                        </span>
                      </div>
                    </div>

                    {candidateSkills.length > 0 && (
                      <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#1C1C1C]/60 mr-1 uppercase">
                          Certified Competencies:
                        </span>
                        {candidateSkills.map((sk) => (
                          <span
                            key={sk.id || sk.name}
                            className="px-2.5 py-1 rounded-full text-[10px] font-black bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C]"
                          >
                            {sk.name} • {sk.proficiencyLevel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* If PDF preview is available, show authenticated PDF pages */}
                {previewBlobUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-[#1C1C1C]">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#4A7A4E]" />
                        <span>Original Stored Certificate Document Stream</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="underline text-[11px] font-black hover:opacity-80 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                    <div className="rounded-2xl border-[2px] border-[#1C1C1C] overflow-hidden bg-slate-900 shadow-[3px_3px_0_0_#1C1C1C]">
                      <iframe src={previewBlobUrl} className="w-full h-[540px] bg-white" title={title} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* B. PROJECT DOCUMENT / RESUME SHOWCASE */}
            {!isCertificate && !isGitHub && !isJira && !isWebsite && (
              <div className="space-y-4">
                {/* If PDF preview is active */}
                {previewBlobUrl ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#4A7A4E]" />
                        <span className="font-black text-[#1C1C1C]">Embedded Document Viewer</span>
                        <span className="text-[#1C1C1C]/40">•</span>
                        <span className="text-[#1C1C1C]/70 font-mono text-[11px]">
                          {vaultArtifact?.file_size_bytes ? formatBytes(vaultArtifact.file_size_bytes) : "Verified Binary"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="font-black text-[#1C1C1C] underline flex items-center gap-1 text-[11px]"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download Document</span>
                      </button>
                    </div>

                    <div className="rounded-2xl border-[2px] border-[#1C1C1C] overflow-hidden bg-slate-900 shadow-[3px_3px_0_0_#1C1C1C]">
                      <iframe src={previewBlobUrl} className="w-full h-[560px] bg-white" title={title} />
                    </div>
                  </div>
                ) : (
                  /* Fallback to Chunk-based Document Presentation */
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#FBF1CF] border border-[#1C1C1C]/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                          Structured Document Inspection
                        </span>
                        {vaultArtifact?.chunks && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C]/20">
                            {vaultArtifact.chunks.length} Extracted Sections
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">
                        Extracted text processed by SkillPassport&apos;s native document ingestion engine.
                      </p>
                    </div>

                    {vaultArtifact?.chunks && vaultArtifact.chunks.length > 0 ? (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {vaultArtifact.chunks.map((chk, i) => (
                          <div
                            key={i}
                            className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 space-y-2 shadow-sm"
                          >
                            <div className="flex items-center justify-between text-[11px] font-bold text-[#1C1C1C]/60 border-b border-[#1C1C1C]/10 pb-1.5">
                              <span>
                                {chk.section_title || `Section ${chk.chunk_index + 1}`} (Page/Slide {chk.page_or_slide_number})
                              </span>
                              <span className="font-mono text-[10px] uppercase">{chk.extraction_method}</span>
                            </div>
                            <p className="text-xs font-medium text-[#1C1C1C] leading-relaxed whitespace-pre-wrap">
                              {chk.original_text}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl bg-white border border-[#1C1C1C]/15 text-xs whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto font-sans">
                        {rawText || summary || "No text available for this document."}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* C. GITHUB REPOSITORY / CODE DELIVERABLE */}
            {isGitHub && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] space-y-3 shadow-[2px_2px_0_0_#1C1C1C]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-5 h-5 text-[#1C1C1C]" />
                      <h3 className="font-black text-sm text-[#1C1C1C]">
                        {vaultArtifact?.provenance?.repo_full_name || evidenceItem?.project || title}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRawTextMode(!rawTextMode)}
                        className="px-2.5 py-1 rounded-lg border border-[#1C1C1C]/30 text-[11px] font-bold hover:bg-[#FAF8F5]"
                      >
                        {rawTextMode ? "Rendered View" : "Raw Source View"}
                      </button>
                      {sourceUrl && (
                        <a
                          href={sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <span>Open on GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Repository Language Breakdown */}
                  {((evidenceItem?.normalizedMetadata as any)?.repositoryLanguages?.length > 0 ||
                    (evidenceItem?.normalizedMetadata as any)?.repository_languages?.length > 0) && (
                    <div className="pt-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                        Codebase Language Composition
                      </span>
                      <RepositoryLanguageBar
                        languages={(
                          (evidenceItem?.normalizedMetadata as any)?.repositoryLanguages ||
                          (evidenceItem?.normalizedMetadata as any)?.repository_languages ||
                          []
                        ).map((l: any) => ({
                          name: l.name,
                          bytes: l.bytes || 0,
                          percentage: l.percentage,
                        }))}
                        compact={true}
                        showTitle={false}
                      />
                    </div>
                  )}
                </div>

                {/* Markdown or Code content */}
                <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] max-h-[500px] overflow-y-auto shadow-[2px_2px_0_0_#1C1C1C]">
                  {rawTextMode ? (
                    <pre className="text-xs font-mono text-[#1C1C1C] whitespace-pre-wrap leading-relaxed">
                      {rawText || summary}
                    </pre>
                  ) : (
                    <MarkdownViewer
                      content={rawText || summary}
                      repoName={vaultArtifact?.provenance?.repo_full_name || evidenceItem?.project}
                    />
                  )}
                </div>
              </div>
            )}

            {/* D. JIRA ISSUE / WORK ITEM */}
            {isJira && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl border-[2px] border-[#1C1C1C] bg-[#FFFDF5] space-y-4 shadow-[3px_3px_0_0_#1C1C1C]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/15 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                        Jira
                      </div>
                      <div>
                        <span className="text-[10px] font-mono font-black uppercase text-[#1C1C1C]/60 block">
                          {(evidenceItem?.normalizedMetadata as any)?.issue_key || evidenceItem?.externalRecordId || "ISSUE"}
                        </span>
                        <h3 className="text-sm font-black text-[#1C1C1C]">{title}</h3>
                      </div>
                    </div>

                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        <span>Open in Jira Cloud</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Jira Structured Fields Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-[#1C1C1C]/20">
                      <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">Project</span>
                      <span className="font-mono font-black text-[#1C1C1C]">
                        {evidenceItem?.project || (evidenceItem?.normalizedMetadata as any)?.project || "—"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-[#1C1C1C]/20">
                      <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">Issue Type</span>
                      <span className="font-bold text-[#1C1C1C]">
                        {(evidenceItem?.normalizedMetadata as any)?.issue_type || "Task"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-[#1C1C1C]/20">
                      <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">Status</span>
                      <span className="font-bold text-[#4A7A4E]">
                        {(evidenceItem?.normalizedMetadata as any)?.status || "Completed"}
                      </span>
                    </div>
                    <div className="p-2.5 bg-white rounded-xl border border-[#1C1C1C]/20">
                      <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/60 block">Assignee</span>
                      <span className="font-bold text-[#1C1C1C]">
                        {evidenceItem?.author || "Assigned"}
                      </span>
                    </div>
                  </div>

                  {/* Full Description & Scope */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                      Description &amp; Acceptance Criteria
                    </span>
                    <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-sans">
                      {rawText || summary}
                    </div>
                  </div>

                  {/* Components and Labels */}
                  {(((evidenceItem?.normalizedMetadata as any)?.components?.length || 0) > 0 ||
                    ((evidenceItem?.normalizedMetadata as any)?.labels?.length || 0) > 0) && (
                    <div className="pt-1 flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-[#1C1C1C]/70 mr-1">Tags:</span>
                      {((evidenceItem?.normalizedMetadata as any)?.components || []).map((c: string) => (
                        <span key={c} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C]">
                          Component: {c}
                        </span>
                      ))}
                      {((evidenceItem?.normalizedMetadata as any)?.labels || []).map((lbl: string) => (
                        <span key={lbl} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#1C1C1C]/40">
                          #{lbl}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* E. WEBSITE / WEB PORTFOLIO */}
            {isWebsite && (
              <div className="space-y-4">
                {/* Browser-like Chrome Header */}
                <div className="rounded-2xl border-[2px] border-[#1C1C1C] bg-[#FFFDF5] overflow-hidden shadow-[3px_3px_0_0_#1C1C1C]">
                  <div className="p-3 bg-[#EAE5DC] border-b border-[#1C1C1C]/20 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                      <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#C85A54]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E5B842]" />
                        <div className="w-2.5 h-2.5 rounded-full bg-[#4A7A4E]" />
                      </div>
                      <div className="flex-1 bg-white px-3 py-1 rounded-lg border border-[#1C1C1C]/20 font-mono text-[11px] text-[#1C1C1C] truncate flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-[#4A7A4E] shrink-0" />
                        <span className="truncate">{sourceUrl || "https://portfolio.snapshot"}</span>
                      </div>
                    </div>

                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="pill-btn pill-btn-primary text-xs py-1 px-3 flex items-center gap-1 shrink-0"
                      >
                        <span>Visit Live Site</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
                    <h3 className="text-base font-black text-[#1C1C1C]">{title}</h3>
                    <div className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap font-sans">
                      {rawText || summary}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EXTRACTED VERBATIM TEXT */}
        {activeTab === "verbatim" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#1C1C1C]">Extracted Verbatim Text</h3>
                <p className="text-xs text-[#1C1C1C]/70">
                  Derived from OCR and document parsing engines. Serves as ground truth for AI skill extraction.
                </p>
              </div>

              {rawText && (
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  {copiedText ? <Check className="w-3.5 h-3.5 text-[#4A7A4E]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText ? "COPIED" : "COPY TEXT"}</span>
                </button>
              )}
            </div>

            {rawText ? (
              <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] font-mono text-xs text-[#1C1C1C] leading-relaxed whitespace-pre-wrap max-h-[520px] overflow-y-auto shadow-[2px_2px_0_0_#1C1C1C]">
                {rawText}
              </div>
            ) : (
              <div className="p-8 rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-white text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-[#1C1C1C]">No verbatim text available</p>
                <p className="text-[11px] text-[#1C1C1C]/60">
                  Document text extraction has not yet completed for this item.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: GROUNDED CANDIDATE SKILLS */}
        {activeTab === "skills" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-[#1C1C1C]">
                  Grounded Candidate Competencies ({candidateSkills.length})
                </h3>
                <p className="text-xs text-[#1C1C1C]/70">
                  Every competency is strictly justified by verbatim excerpts from this deliverable.
                </p>
              </div>
            </div>

            {candidateSkills.length === 0 ? (
              <div className="p-8 rounded-2xl border-[1.5px] border-dashed border-[#1C1C1C]/30 bg-white text-center space-y-2">
                <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                <p className="text-xs font-bold text-[#1C1C1C]">No Supported Candidate Competencies</p>
                <p className="text-[11px] text-[#1C1C1C]/60 max-w-md mx-auto">
                  This deliverable does not currently map to verified skills with sufficient confidence.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {candidateSkills.map((cs) => (
                  <div
                    key={cs.id || cs.name}
                    className="p-4 rounded-xl bg-white border border-[#1C1C1C] space-y-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-[#1C1C1C]">{cs.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#1C1C1C]/30">
                          {cs.category || "General"}
                        </span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C]">
                        {cs.proficiencyLevel || "Foundation"}
                      </span>
                    </div>

                    {cs.excerpt && (
                      <div className="p-3 bg-[#FAF8F5] rounded-lg border border-[#1C1C1C]/10 text-xs font-serif italic text-[#1C1C1C]/80">
                        &ldquo;{cs.excerpt}&rdquo;
                      </div>
                    )}

                    {cs.associationReason && (
                      <p className="text-xs text-[#4A7A4E] font-medium">
                        <strong>Rationale:</strong> {cs.associationReason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SECURITY & PROVENANCE */}
        {activeTab === "provenance" && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] space-y-4 shadow-[2px_2px_0_0_#1C1C1C]">
              <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                Cryptographic Provenance &amp; Verification
              </h3>

              <div className="space-y-3 text-xs">
                {sha256 && (
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1C1C1C]/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">
                        SHA-256 Checksum Fingerprint
                      </span>
                      <span className="font-mono font-bold text-[#1C1C1C] break-all">{sha256}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopySha}
                      className="pill-btn pill-btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 shrink-0 ml-2"
                    >
                      {copiedSha ? <Check className="w-3 h-3 text-[#4A7A4E]" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedSha ? "COPIED" : "COPY"}</span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1C1C1C]/20">
                    <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Record UUID</span>
                    <span className="font-mono text-xs font-bold text-[#1C1C1C]">{effectiveId}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1C1C1C]/20">
                    <span className="text-[10px] uppercase font-bold text-[#1C1C1C]/60 block">Source Provider</span>
                    <span className="text-xs font-bold text-[#1C1C1C] uppercase">{sourceProvider}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
