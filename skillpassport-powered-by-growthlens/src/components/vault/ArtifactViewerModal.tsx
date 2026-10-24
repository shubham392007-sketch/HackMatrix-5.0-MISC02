"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Layers,
  Copy,
  Check,
  Globe,
  GitBranch,
  BookOpen,
  Award,
  RefreshCw,
  Eye,
  Hash,
  Cpu,
  FileCode,
  FileSpreadsheet,
  Maximize2,
  ZoomIn,
} from "lucide-react";
import {
  VaultArtifactDetail,
  VaultArtifactType,
  fetchVaultPreviewBlob,
  triggerVaultDownload,
} from "@/lib/vaultApi";

interface ArtifactViewerModalProps {
  artifactType: VaultArtifactType;
  artifactId: string;
  onClose: () => void;
}

export default function ArtifactViewerModal({
  artifactType,
  artifactId,
  onClose,
}: ArtifactViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "extracted" | "provenance" | "processing">("preview");
  const [artifact, setArtifact] = useState<VaultArtifactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [rawMarkdownMode, setRawMarkdownMode] = useState(false);

  // 1. Fetch artifact details
  useEffect(() => {
    let isMounted = true;
    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);
        // Dynamic import to prevent circular issues
        const { getVaultArtifactDetail } = await import("@/lib/vaultApi");
        const data = await getVaultArtifactDetail(artifactType, artifactId);
        if (isMounted) {
          setArtifact(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Failed to load artifact details");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDetail();
    return () => {
      isMounted = false;
    };
  }, [artifactType, artifactId]);

  // 2. Fetch binary preview blob for PDF and image documents
  useEffect(() => {
    let isMounted = true;
    let createdUrl: string | null = null;

    async function loadPreviewStream() {
      if (!artifact) return;
      const mime = (artifact.mime_type || "").toLowerCase();
      const isPdf = mime.includes("pdf") || (artifact.filename || "").endsWith(".pdf");
      const isImage = mime.includes("image") || /\.(png|jpe?g|webp|gif)$/i.test(artifact.filename || "");

      if ((isPdf || isImage) && artifact.has_original_file) {
        try {
          setPreviewLoading(true);
          setPreviewError(null);
          const { blobUrl } = await fetchVaultPreviewBlob(artifact.artifact_type, artifact.id);
          if (isMounted) {
            createdUrl = blobUrl;
            setPreviewBlobUrl(blobUrl);
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

    loadPreviewStream();

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [artifact]);

  const handleDownload = async () => {
    if (!artifact) return;
    try {
      setIsDownloading(true);
      await triggerVaultDownload(
        artifact.artifact_type,
        artifact.id,
        artifact.filename || `${artifact.title}.bin`
      );
    } catch (err: any) {
      alert(`Download error: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyExtracted = () => {
    if (!artifact?.full_extracted_text) return;
    navigator.clipboard.writeText(artifact.full_extracted_text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border-[2px] border-[#1A1918] rounded-[28px] shadow-[6px_6px_0_0_#1A1918] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-[#1A1918]">
        {/* Modal Top Bar */}
        <div className="p-5 sm:p-6 border-b-[2px] border-[#1A1918] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-[#1A1918] bg-[#000000] text-[#FAF8F5]">
                {artifactType.replace(/_/g, " ")}
              </span>
              {artifact?.category && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-[#1A1918]/30 bg-[#FAF8F5]">
                  {artifact.category}
                </span>
              )}
              {artifact?.processing_state && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                    artifact.processing_state === "completed" || artifact.processing_state === "extracted"
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : artifact.processing_state === "insufficient_content"
                      ? "bg-amber-100 text-amber-900 border-amber-300"
                      : "bg-red-100 text-red-900 border-red-300"
                  }`}
                >
                  {artifact.processing_state}
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-black text-[#1A1918] truncate">
              {artifact?.title || "Artifact Viewer"}
            </h2>
            {artifact?.filename && (
              <p className="text-xs text-[#1A1918]/60 font-mono truncate">
                File: {artifact.filename} • {formatBytes(artifact.file_size_bytes)}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(artifact?.has_original_file || artifact?.has_snapshot) && (
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
                title="Download original file with verified authorization"
              >
                <Download className={`w-3.5 h-3.5 ${isDownloading ? "animate-bounce" : ""}`} />
                <span>{isDownloading ? "DOWNLOADING..." : "DOWNLOAD"}</span>
              </button>
            )}

            {artifact?.source_url && (
              <a
                href={artifact.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                title="Open original external URL in new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">ORIGINAL SOURCE</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-[#1A1918] bg-[#FAF8F5] hover:bg-[#1A1918] hover:text-white flex items-center justify-center transition-colors"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-[#1A1918]/15 bg-[#FAF8F5] shrink-0 overflow-x-auto">
          {[
            { id: "preview", label: "Preview", icon: Eye },
            { id: "extracted", label: "Extracted Content", icon: FileText },
            { id: "provenance", label: "Source & Provenance", icon: ShieldCheck },
            { id: "processing", label: "Processing & AI Grounding", icon: Cpu },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-xs font-black rounded-t-xl border-t border-x transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-white border-[#1A1918] text-[#1A1918] shadow-[0_2px_0_0_#FFF]"
                    : "border-transparent text-[#1A1918]/60 hover:text-[#1A1918] hover:bg-white/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-7 h-7 animate-spin text-[#1A1918]/70" />
              <p className="text-xs font-black uppercase tracking-wider text-[#1A1918]/60">
                Retrieving artifact metadata & content from vault...
              </p>
            </div>
          ) : error ? (
            <div className="p-8 rounded-2xl border-[1.5px] border-[#C85A54] bg-[#F6C8D6] text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-[#C85A54] mx-auto" />
              <h3 className="text-sm font-black text-[#1A1918]">Artifact Access Error</h3>
              <p className="text-xs font-medium text-[#1A1918]/80 max-w-md mx-auto">{error}</p>
            </div>
          ) : !artifact ? (
            <div className="p-8 text-center text-xs font-bold text-[#1A1918]/60">
              No artifact record found.
            </div>
          ) : (
            <>
              {/* TAB A: PREVIEW */}
              {activeTab === "preview" && (
                <div className="space-y-4">
                  {/* PDF Document Preview */}
                  {artifact.artifact_type === "uploaded_document" &&
                    (artifact.mime_type?.includes("pdf") || (artifact.filename || "").endsWith(".pdf")) && (
                      <div className="space-y-3">
                        <div className="p-3.5 rounded-xl bg-white border border-[#1A1918]/15 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-emerald-700" />
                            <span className="font-bold text-[#1A1918]">Verified PDF Document</span>
                            <span className="text-ink/50">•</span>
                            <span className="text-ink/60 font-mono text-[11px]">
                              {formatBytes(artifact.file_size_bytes)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={handleDownload}
                            className="text-xs font-black underline text-[#1A1918] hover:opacity-80 flex items-center gap-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download PDF</span>
                          </button>
                        </div>

                        {previewLoading ? (
                          <div className="h-[520px] rounded-2xl border-[1.5px] border-[#1A1918] bg-white flex flex-col items-center justify-center space-y-3">
                            <RefreshCw className="w-8 h-8 animate-spin text-[#1A1918]" />
                            <p className="text-xs font-black uppercase text-[#1A1918]/60">
                              Streaming secure PDF pages...
                            </p>
                          </div>
                        ) : previewError ? (
                          <div className="p-8 rounded-2xl border border-amber-300 bg-amber-50 text-center space-y-2">
                            <AlertTriangle className="w-6 h-6 text-amber-700 mx-auto" />
                            <p className="text-xs font-bold text-amber-900">{previewError}</p>
                            <p className="text-[11px] text-amber-800">
                              You can still download the original PDF or inspect extracted text in the Extracted Content tab.
                            </p>
                          </div>
                        ) : previewBlobUrl ? (
                          <div className="rounded-2xl border-[2px] border-[#1A1918] overflow-hidden bg-slate-900 shadow-[3px_3px_0_0_#1A1918]">
                            <iframe
                              src={previewBlobUrl}
                              className="w-full h-[580px] bg-white"
                              title={artifact.title}
                            />
                          </div>
                        ) : (
                          <div className="p-8 rounded-2xl border border-[#1A1918]/20 bg-white text-center space-y-2">
                            <p className="text-xs text-[#1A1918]/70">
                              Direct PDF preview is ready. Click below to load pages.
                            </p>
                            <button
                              type="button"
                              onClick={handleDownload}
                              className="pill-btn pill-btn-primary text-xs py-2 px-4"
                            >
                              Download Original File
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Image Document Preview */}
                  {artifact.artifact_type === "uploaded_document" &&
                    (artifact.mime_type?.includes("image") || /\.(png|jpe?g|webp)$/i.test(artifact.filename || "")) && (
                      <div className="space-y-3">
                        {previewBlobUrl ? (
                          <div className="rounded-2xl border-[2px] border-[#1A1918] p-4 bg-white flex items-center justify-center shadow-[3px_3px_0_0_#1A1918]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previewBlobUrl}
                              alt={artifact.title}
                              className="max-h-[540px] max-w-full rounded-xl object-contain border border-[#1A1918]/15"
                            />
                          </div>
                        ) : (
                          <div className="p-12 text-center bg-white rounded-2xl border border-[#1A1918]/20">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#1A1918]" />
                            <p className="text-xs font-bold mt-2">Loading image preview...</p>
                          </div>
                        )}
                      </div>
                    )}

                  {/* Word / Presentation / Structured Document */}
                  {artifact.artifact_type === "uploaded_document" &&
                    !artifact.mime_type?.includes("pdf") &&
                    !artifact.mime_type?.includes("image") &&
                    !/\.(pdf|png|jpe?g|webp)$/i.test(artifact.filename || "") && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-white border border-[#1A1918]/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileSpreadsheet className="w-5 h-5 text-blue-700" />
                              <span className="font-bold text-sm text-[#1A1918]">Structured Document Preview</span>
                            </div>
                            <button
                              type="button"
                              onClick={handleDownload}
                              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download Original {artifact.filename?.split(".").pop()?.toUpperCase()}</span>
                            </button>
                          </div>
                          <p className="text-xs text-[#1A1918]/70">
                            Rendered using normalized document sections extracted by SkillPassport&apos;s native document parser. For complete proprietary layout and styles, download the verified original file.
                          </p>
                        </div>

                        {artifact.chunks && artifact.chunks.length > 0 ? (
                          <div className="space-y-3">
                            {artifact.chunks.map((chk, i) => (
                              <div
                                key={i}
                                className="p-4 rounded-xl bg-white border border-[#1A1918]/15 space-y-2 shadow-sm"
                              >
                                <div className="flex items-center justify-between text-[11px] font-bold text-[#1A1918]/60 border-b border-[#1A1918]/10 pb-1.5">
                                  <span>
                                    {chk.section_title || `Section ${chk.chunk_index + 1}`} (Page/Slide {chk.page_or_slide_number})
                                  </span>
                                  <span className="font-mono text-[10px] uppercase">{chk.extraction_method}</span>
                                </div>
                                <p className="text-xs font-medium text-[#1A1918] leading-relaxed whitespace-pre-wrap">
                                  {chk.original_text}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-6 rounded-xl bg-white border border-[#1A1918]/15 text-xs whitespace-pre-wrap">
                            {artifact.full_extracted_text || "No structured text parsed for this document."}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Web Snapshot Preview */}
                  {artifact.artifact_type === "web_snapshot" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 space-y-1.5 text-xs text-amber-950">
                        <div className="flex items-center gap-2 font-bold">
                          <Globe className="w-4 h-4 text-amber-700" />
                          <span>
                            Captured snapshot —{" "}
                            {artifact.created_at
                              ? new Date(artifact.created_at).toLocaleDateString("en-US", {
                                  month: "long",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "Recent"}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 leading-relaxed">
                          This snapshot preserves the exact content retrieved during portfolio crawling. It is distinct from the live website, which may have changed since ingestion.
                        </p>
                      </div>

                      <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1A1918] space-y-4 shadow-[2px_2px_0_0_#1A1918]">
                        <div className="border-b border-[#1A1918]/10 pb-3 flex items-center justify-between">
                          <h3 className="font-black text-sm text-[#1A1918]">{artifact.title}</h3>
                          {artifact.source_url && (
                            <a
                              href={artifact.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold underline text-[#1A1918] hover:opacity-75 inline-flex items-center gap-1"
                            >
                              <span>Visit Live URL</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        {artifact.extracted_headings?.headings && (
                          <div className="flex flex-wrap gap-1.5">
                            {artifact.extracted_headings.headings.map((h: any, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF8F5] border border-[#1A1918]/20"
                              >
                                {h.text || h}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="p-4 rounded-xl bg-[#FAF8F5]/50 border border-[#1A1918]/15 max-h-[460px] overflow-y-auto custom-scrollbar">
                          <p className="text-xs text-[#1A1918] leading-relaxed whitespace-pre-wrap font-sans">
                            {artifact.full_extracted_text || artifact.extracted_summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Repository README Preview */}
                  {artifact.artifact_type === "repository_readme" && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl bg-white border border-[#1A1918]/15 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-[#1A1918]" />
                          <span className="font-bold text-[#1A1918]">Repository Documentation</span>
                          <span className="text-ink/50">•</span>
                          <span className="text-ink/60 font-mono text-[11px]">
                            {artifact.provenance?.repo_full_name || artifact.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setRawMarkdownMode(!rawMarkdownMode)}
                            className="px-2.5 py-1 rounded-lg border border-[#1A1918]/30 text-[11px] font-bold hover:bg-[#FAF8F5]"
                          >
                            {rawMarkdownMode ? "Rendered View" : "Raw Markdown"}
                          </button>
                          {artifact.source_url && (
                            <a
                              href={artifact.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-black underline text-[#1A1918] hover:opacity-80 flex items-center gap-1"
                            >
                              <span>Open on GitHub</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1A1918] max-h-[540px] overflow-y-auto custom-scrollbar shadow-[2px_2px_0_0_#1A1918]">
                        {rawMarkdownMode ? (
                          <pre className="text-xs font-mono text-[#1A1918] whitespace-pre-wrap leading-relaxed">
                            {artifact.full_extracted_text || artifact.extracted_summary}
                          </pre>
                        ) : (
                          <div className="prose prose-sm max-w-none text-xs leading-relaxed text-[#1A1918] whitespace-pre-wrap font-sans">
                            {artifact.full_extracted_text || artifact.extracted_summary}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Connected Jira / External Record */}
                  {artifact.artifact_type === "connected_source_record" && (
                    <div className="space-y-4">
                      <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1A1918] space-y-4 shadow-[2px_2px_0_0_#1A1918]">
                        <div className="flex items-center justify-between border-b border-[#1A1918]/10 pb-3">
                          <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-blue-700" />
                            <h3 className="font-black text-sm text-[#1A1918]">{artifact.title}</h3>
                          </div>
                          {artifact.source_url && (
                            <a
                              href={artifact.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <span>Open in Jira</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 space-y-2">
                          <span className="text-[10px] font-black uppercase text-[#1A1918]/60 block">
                            EXTRACTED RECORD CONTENT
                          </span>
                          <p className="text-xs font-medium text-[#1A1918] leading-relaxed whitespace-pre-wrap">
                            {artifact.full_extracted_text || artifact.extracted_summary}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB B: EXTRACTED CONTENT */}
              {activeTab === "extracted" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-[#1A1918]">Normalized Extracted Text</h3>
                      <p className="text-xs text-[#1A1918]/60">
                        Derived text used for grounded AI skill extraction, semantic indexing, and verification.
                      </p>
                    </div>
                    {artifact.full_extracted_text && (
                      <button
                        type="button"
                        onClick={handleCopyExtracted}
                        className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                      >
                        {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedText ? "COPIED" : "COPY TEXT"}</span>
                      </button>
                    )}
                  </div>

                  {artifact.full_extracted_text ? (
                    <div className="p-6 rounded-2xl bg-white border-[1.5px] border-[#1A1918] max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#1A1918]">
                      {artifact.full_extracted_text}
                    </div>
                  ) : (
                    <div className="p-8 rounded-2xl border-[1.5px] border-dashed border-[#1A1918]/30 bg-white text-center space-y-2">
                      <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto" />
                      <p className="text-xs font-bold text-[#1A1918]">No Extracted Text Available</p>
                      <p className="text-[11px] text-[#1A1918]/60">
                        Text extraction was either incomplete or did not detect text in this artifact.
                      </p>
                    </div>
                  )}

                  {/* Chunks breakdown if available */}
                  {artifact.chunks && artifact.chunks.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-black uppercase text-[#1A1918]/70">
                        Document Chunks ({artifact.chunks.length})
                      </h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {artifact.chunks.map((chk, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-white border border-[#1A1918]/15 text-xs space-y-1"
                          >
                            <div className="flex justify-between font-bold text-[11px] text-[#1A1918]/60">
                              <span>Chunk #{chk.chunk_index + 1} • Page {chk.page_or_slide_number}</span>
                              <span className="font-mono text-[10px]">{chk.extraction_method}</span>
                            </div>
                            <p className="line-clamp-2 text-[#1A1918] font-mono text-[11px]">
                              {chk.normalized_text}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB C: SOURCE & PROVENANCE */}
              {activeTab === "provenance" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-5 rounded-2xl bg-white border border-[#1A1918]/15 space-y-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1918]/50 block">
                        ARTIFACT PROVENANCE
                      </span>
                      <div className="flex justify-between font-bold border-b border-ink/10 pb-1.5">
                        <span className="text-[#1A1918]/70">Artifact ID:</span>
                        <span className="font-mono text-[11px]">{artifact.id}</span>
                      </div>
                      <div className="flex justify-between font-bold border-b border-ink/10 pb-1.5">
                        <span className="text-[#1A1918]/70">Source Provider:</span>
                        <span className="uppercase">{artifact.source_provider}</span>
                      </div>
                      <div className="flex justify-between font-bold border-b border-ink/10 pb-1.5">
                        <span className="text-[#1A1918]/70">MIME Type:</span>
                        <span className="font-mono text-[11px]">{artifact.mime_type || "N/A"}</span>
                      </div>
                      <div className="flex justify-between font-bold border-b border-ink/10 pb-1.5">
                        <span className="text-[#1A1918]/70">File Size:</span>
                        <span>{formatBytes(artifact.file_size_bytes)}</span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-[#1A1918]/70">Ingestion Date:</span>
                        <span>
                          {artifact.created_at ? new Date(artifact.created_at).toLocaleString() : "Unknown"}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white border border-[#1A1918]/15 space-y-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#1A1918]/50 block">
                        SECURITY & STORAGE INTEGRITY
                      </span>
                      {artifact.provenance?.sha256 && (
                        <div className="space-y-1 border-b border-ink/10 pb-1.5">
                          <span className="text-[#1A1918]/70 font-bold block">SHA-256 Fingerprint:</span>
                          <span className="font-mono text-[10px] break-all bg-[#FAF8F5] p-1.5 rounded block border border-ink/10">
                            {artifact.provenance.sha256}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-b border-ink/10 pb-1.5">
                        <span className="text-[#1A1918]/70">Original Stored:</span>
                        <span className="text-emerald-700 font-black">
                          {artifact.has_original_file ? "Yes (Private Storage Vault)" : "No (External Reference)"}
                        </span>
                      </div>
                      <div className="flex justify-between font-bold">
                        <span className="text-[#1A1918]/70">Snapshot Available:</span>
                        <span className="font-black">
                          {artifact.has_snapshot ? "Yes (Immutable DB Snapshot)" : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {artifact.source_url && (
                    <div className="p-4 rounded-xl bg-white border border-[#1A1918]/15 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#1A1918] block">Original Source Deep Link</span>
                        <span className="text-[#1A1918]/60 text-[11px] font-mono break-all">
                          {artifact.source_url}
                        </span>
                      </div>
                      <a
                        href={artifact.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pill-btn pill-btn-primary text-xs py-1.5 px-3 shrink-0 flex items-center gap-1"
                      >
                        <span>Open Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* TAB D: PROCESSING & GROUNDING */}
              {activeTab === "processing" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#1A1918]/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-[#1A1918]">AI Grounding & Verification State</h4>
                      {artifact.linked_evidence?.id && (
                        <Link
                          href={`/app/evidence/library/${artifact.linked_evidence.id}`}
                          className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                        >
                          <span>View in Evidence Library</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-ink/10">
                        <span className="text-[10px] font-black uppercase text-ink/50 block">STATUS</span>
                        <span className="font-bold capitalize">{artifact.processing_state}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-ink/10">
                        <span className="text-[10px] font-black uppercase text-ink/50 block">VERIFICATION</span>
                        <span className="font-bold capitalize">{artifact.verification_status}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-ink/10">
                        <span className="text-[10px] font-black uppercase text-ink/50 block">EXTRACTOR</span>
                        <span className="font-bold">{artifact.user_metadata?.extractor || "Native Parser"}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-ink/10">
                        <span className="text-[10px] font-black uppercase text-ink/50 block">OCR DETECTED</span>
                        <span className="font-bold">
                          {artifact.user_metadata?.ocr_pages_detected ? `${artifact.user_metadata.ocr_pages_detected} Pages` : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Linked candidate skills */}
                  {artifact.linked_evidence?.candidate_skills && artifact.linked_evidence.candidate_skills.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918]/70">
                        Grounded Candidate Skills ({artifact.linked_evidence.candidate_skills.length})
                      </h4>
                      <div className="space-y-2">
                        {artifact.linked_evidence.candidate_skills.map((skill) => (
                          <div
                            key={skill.id}
                            className="p-3.5 rounded-xl bg-white border border-[#1A1918]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#1A1918]">{skill.name}</span>
                                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[#000000] border border-[#1A1918] text-[#FAF8F5]">
                                  {skill.category}
                                </span>
                              </div>
                              {skill.supporting_excerpt && (
                                <p className="text-[11px] text-[#1A1918]/70 italic line-clamp-1">
                                  &ldquo;{skill.supporting_excerpt}&rdquo;
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold text-ink/60 uppercase">
                                Level: {skill.proficiency_level}
                              </span>
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                {Math.round(skill.confidence * 100)}% CONF
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-white border border-[#1A1918]/15 text-center text-xs text-[#1A1918]/60">
                      No candidate skills currently mapped to this artifact.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1A1918]/15 bg-white flex items-center justify-between text-xs shrink-0">
          <span className="text-[#1A1918]/60 font-medium text-[11px]">
            Evidence Vault • Authenticated Personal Archive
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-[#1A1918] text-xs font-bold hover:bg-[#1A1918] hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
