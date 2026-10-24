"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import JSZip from "jszip";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  uploadEvidenceDocument,
  scrapePortfolio,
  previewPortfolio,
} from "@/lib/evidenceApi";
import {
  UploadCloud,
  FileCode,
  Award,
  BookOpen,
  Globe,
  FileText,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Plus,
  ExternalLink,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Search,
  FileArchive,
  Trash2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Check,
  File as FileIcon,
  Info,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

// Supported extensions according to existing backend specification
const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".pptx",
  ".ppt",
  ".txt",
  ".md",
  ".png",
  ".jpg",
  ".jpeg",
];

const MIME_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_ZIP_FILES = 50; // max 50 documents per archive
const MAX_TOTAL_DECOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB zip bomb defense

export type QueueItemStatus =
  | "queued"
  | "uploading"
  | "processing"
  | "verification_pending"
  | "verified"
  | "needs_review"
  | "failed";

export interface QueueItem {
  id: string;
  file?: File; // Present during active session
  filename: string;
  fileSizeBytes: number;
  mimeType: string;
  sourceType: "single" | "multi" | "zip";
  zipArchiveName?: string;
  status: QueueItemStatus;
  statusMessage?: string;
  documentId?: string;
  evidenceId?: string;
  wordCount?: number;
  chunksExtracted?: number;
  candidateSkills?: Array<{ name: string; proficiencyLevel?: string }>;
  verificationStatus?: string;
  error?: string;
  completedAt?: number;
}

export interface SkippedFile {
  name: string;
  reason: string;
  archiveName?: string;
}

/**
 * Safely inspects and decompresses a ZIP archive in browser memory.
 * Enforces file size limits, decompression bomb defenses, and path traversal protections.
 */
async function extractZipArchive(
  zipFile: File
): Promise<{
  validFiles: File[];
  skippedFiles: SkippedFile[];
  error?: string;
}> {
  const validFiles: File[] = [];
  const skippedFiles: SkippedFile[] = [];

  if (zipFile.size > MAX_FILE_SIZE) {
    return {
      validFiles: [],
      skippedFiles: [],
      error: `ZIP archive exceeds 50MB limit (${(zipFile.size / (1024 * 1024)).toFixed(1)} MB).`,
    };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipFile);
  } catch (err: any) {
    return {
      validFiles: [],
      skippedFiles: [],
      error: `Corrupt or invalid ZIP archive: ${err.message || "Unable to read archive structure."}`,
    };
  }

  const entries = Object.entries(zip.files).filter(([_, entry]) => !entry.dir);
  if (entries.length === 0) {
    return {
      validFiles: [],
      skippedFiles: [],
      error: "The ZIP archive is empty or contains only folders.",
    };
  }

  if (entries.length > MAX_ZIP_FILES) {
    return {
      validFiles: [],
      skippedFiles: [],
      error: `ZIP archive contains ${entries.length} files. Maximum allowed per archive is ${MAX_ZIP_FILES} files.`,
    };
  }

  let totalDecompressed = 0;

  for (const [relativePath, entry] of entries) {
    // 1. Path traversal guard & sanitize name
    const rawName = relativePath.split(/[/\\]/).pop()?.trim() || "";
    if (!rawName || rawName.startsWith(".") || relativePath.includes("__MACOSX")) {
      continue;
    }

    if (rawName.includes("..") || relativePath.includes("..")) {
      skippedFiles.push({
        name: rawName,
        reason: "Security guard: path traversal (..) detected in archive entry",
        archiveName: zipFile.name,
      });
      continue;
    }

    // 2. Validate file extension against existing allowed types
    const ext = "." + (rawName.split(".").pop() || "").toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      skippedFiles.push({
        name: rawName,
        reason: `Unsupported file type (${ext}). Supported formats: PDF, DOCX, PPTX, TXT, MD, PNG, JPG`,
        archiveName: zipFile.name,
      });
      continue;
    }

    // 3. Extract blob and verify decompressed bounds
    try {
      const blob = await entry.async("blob");
      if (blob.size === 0) {
        skippedFiles.push({
          name: rawName,
          reason: "Empty document (0 bytes)",
          archiveName: zipFile.name,
        });
        continue;
      }

      if (blob.size > MAX_FILE_SIZE) {
        skippedFiles.push({
          name: rawName,
          reason: `Decompressed size (${(blob.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50MB limit`,
          archiveName: zipFile.name,
        });
        continue;
      }

      totalDecompressed += blob.size;
      if (totalDecompressed > MAX_TOTAL_DECOMPRESSED_SIZE) {
        return {
          validFiles: [],
          skippedFiles,
          error: "ZIP bomb defense triggered: total decompressed size exceeds safe limit (100MB). Archive rejected.",
        };
      }

      const mimeType = MIME_MAP[ext] || "application/octet-stream";
      const file = new File([blob], rawName, {
        type: mimeType,
        lastModified: entry.date ? entry.date.getTime() : Date.now(),
      });
      validFiles.push(file);
    } catch (err: any) {
      skippedFiles.push({
        name: rawName,
        reason: `Failed to unpack file: ${err.message}`,
        archiveName: zipFile.name,
      });
    }
  }

  if (validFiles.length === 0 && skippedFiles.length > 0) {
    return {
      validFiles: [],
      skippedFiles,
      error: `Archive contains ${skippedFiles.length} file(s), but none are supported document types (PDF, DOCX, PPTX, TXT, MD, PNG, JPG).`,
    };
  }

  return { validFiles, skippedFiles };
}

export default function UploadEvidencePage() {
  const { refreshEvidenceData, addNotification, currentUserId } = useEvidence();

  const [category, setCategory] = useState<
    "document" | "certificate" | "resume" | "portfolio" | "research" | "other"
  >("document");

  // Metadata Fields
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [contribution, setContribution] = useState("");
  const [isCollaborative, setIsCollaborative] = useState(false);

  // Portfolio URL preview state
  const [urlOrRef, setUrlOrRef] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [showPagesList, setShowPagesList] = useState(false);
  const [portfolioSuccessResult, setPortfolioSuccessResult] = useState<any | null>(null);
  const [portfolioUploading, setPortfolioUploading] = useState(false);

  // Document Queue State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<SkippedFile[]>([]);
  const [showSkippedList, setShowSkippedList] = useState(false);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [currentlyProcessingId, setCurrentlyProcessingId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs for tracking async state without stale closures
  const queueRef = useRef<QueueItem[]>(queue);
  queueRef.current = queue;
  const shouldStopRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load persisted queue from sessionStorage on mount
  useEffect(() => {
    const storageKey = `sp_evidence_upload_queue_${currentUserId || "guest"}`;
    const raw = sessionStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQueue(parsed);
        }
      } catch {}
    }
  }, [currentUserId]);

  // Sync queue state to sessionStorage
  useEffect(() => {
    const storageKey = `sp_evidence_upload_queue_${currentUserId || "guest"}`;
    if (queue.length > 0) {
      const serializable = queue.map(({ file, ...rest }) => rest);
      sessionStorage.setItem(storageKey, JSON.stringify(serializable));
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [queue, currentUserId]);

  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  /**
   * Enqueues documents from FileList or File array.
   * Unpacks ZIP files client-side and validates individual files.
   */
  const handleFilesInput = async (files: FileList | File[]) => {
    setUploadError(null);
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const newItems: QueueItem[] = [];
    const newSkipped: SkippedFile[] = [];

    for (const f of fileArray) {
      const ext = "." + (f.name.split(".").pop() || "").toLowerCase();

      if (ext === ".zip") {
        setIsExtractingZip(true);
        try {
          const { validFiles, skippedFiles: extractedSkipped, error } =
            await extractZipArchive(f);

          if (error) {
            setUploadError(error);
          }
          if (extractedSkipped.length > 0) {
            newSkipped.push(...extractedSkipped);
          }

          for (const vf of validFiles) {
            newItems.push({
              id: `qitem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              file: vf,
              filename: vf.name,
              fileSizeBytes: vf.size,
              mimeType: vf.type,
              sourceType: "zip",
              zipArchiveName: f.name,
              status: "queued",
              statusMessage: `Extracted from ${f.name} — waiting in queue.`,
            });
          }
        } catch (err: any) {
          setUploadError(`Failed to process archive '${f.name}': ${err.message}`);
        } finally {
          setIsExtractingZip(false);
        }
      } else if (SUPPORTED_EXTENSIONS.includes(ext)) {
        if (f.size > MAX_FILE_SIZE) {
          newSkipped.push({
            name: f.name,
            reason: `File size (${(f.size / (1024 * 1024)).toFixed(1)} MB) exceeds 50MB limit`,
          });
        } else if (f.size === 0) {
          newSkipped.push({
            name: f.name,
            reason: "Empty file (0 bytes)",
          });
        } else {
          newItems.push({
            id: `qitem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            file: f,
            filename: f.name,
            fileSizeBytes: f.size,
            mimeType: f.type,
            sourceType: fileArray.length === 1 ? "single" : "multi",
            status: "queued",
            statusMessage: "Waiting in queue to be processed.",
          });
        }
      } else {
        newSkipped.push({
          name: f.name,
          reason: `Unsupported file type (${ext}). Supported formats: PDF, DOCX, PPTX, TXT, MD, PNG, JPG, ZIP`,
        });
      }
    }

    if (newSkipped.length > 0) {
      setSkippedFiles((prev) => [...prev, ...newSkipped]);
    }

    if (newItems.length > 0) {
      if (newItems.length === 1 && queue.length === 0 && !title) {
        setTitle(newItems[0].filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
      setQueue((prev) => [...prev, ...newItems]);
    }

    // Reset file input value to allow re-selecting same files if removed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Processes an individual document sequentially through the existing upload pipeline.
   * Maps backend results strictly to authentic verification outcomes.
   */
  const processSingleItem = async (itemId: string): Promise<boolean> => {
    const item = queueRef.current.find((q) => q.id === itemId);
    if (!item || !item.file) {
      updateQueueItem(itemId, {
        status: "failed",
        error: "File data unavailable in active memory. Please re-select the file to retry.",
        statusMessage: "File payload expired from session.",
      });
      return false;
    }

    setCurrentlyProcessingId(itemId);

    // 1. Transition to 'uploading'
    updateQueueItem(itemId, {
      status: "uploading",
      statusMessage: "Uploading document to secure private storage vault...",
    });

    // Small delay for UI smoothness
    await new Promise((r) => setTimeout(r, 150));

    // 2. Transition to 'processing'
    updateQueueItem(itemId, {
      status: "processing",
      statusMessage: "Extracting structured text, chunks & candidate competencies...",
    });

    try {
      // Use custom title if single file upload, or clean filename as document title
      const docTitle =
        queueRef.current.length === 1 && title.trim()
          ? title.trim()
          : item.filename.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");

      const result = await uploadEvidenceDocument(item.file, category, docTitle);

      // 3. Map authoritative backend status
      const isAlreadyExists = result.status === "already_exists";
      const evStatus = (
        result.evidence?.verificationStatus ||
        result.evidence?.verification_status ||
        result.verification_status ||
        "unreviewed"
      ).toLowerCase();

      const isInsufficient =
        result.extraction_quality === "insufficient_content" ||
        result.extraction_quality === "failed" ||
        result.status === "insufficient_content" ||
        evStatus === "insufficient_evidence";

      let finalStatus: QueueItemStatus = "verification_pending";
      let finalMsg = "Extraction complete; candidate competencies pending verification review.";

      if (evStatus === "verified") {
        finalStatus = "verified";
        finalMsg = "Confirmed and verified by authoritative verification engine.";
      } else if (
        evStatus === "needs_confirmation" ||
        evStatus === "needs_review" ||
        evStatus === "partially_supported" ||
        isInsufficient
      ) {
        finalStatus = "needs_review";
        finalMsg = isInsufficient
          ? `Extraction incomplete: ${result.quality_reason || "insufficient content detected"}. Flagged for review.`
          : "Evidence flagged for manual confirmation or governance corroboration.";
      } else {
        finalStatus = "verification_pending";
        finalMsg = isAlreadyExists
          ? "Existing evidence verified in library with identical SHA-256; candidate skills mapped."
          : "Extraction and ChromaDB indexing complete. Candidate competencies pending review.";
      }

      const rawSkills =
        result.candidateSkills || result.evidence?.candidateSkills || [];
      const parsedSkills = rawSkills.map((s: any) => ({
        name: typeof s === "string" ? s : s.name,
        proficiencyLevel: typeof s === "object" ? s.proficiencyLevel : undefined,
      }));

      updateQueueItem(itemId, {
        status: finalStatus,
        statusMessage: finalMsg,
        documentId: result.document_id,
        evidenceId: result.evidence_id || result.evidence?.id,
        wordCount: result.word_count || 0,
        chunksExtracted: result.chunks_extracted || 0,
        candidateSkills: parsedSkills,
        verificationStatus: evStatus,
        completedAt: Date.now(),
      });

      // Fire relevant notifications
      if (isAlreadyExists) {
        addNotification({
          title: "Duplicate evidence skipped",
          description: `Document '${item.filename}' matches existing evidence with identical SHA-256.`,
          category: "evidence",
          severity: "info",
          relatedDomain: "Evidence Workspace",
          actionRoute: result.evidence_id
            ? `/app/evidence/library/${result.evidence_id}`
            : "/app/evidence/library",
          actionLabel: "View Evidence Item",
          dedupKey: `dup_${result.document_id || item.filename}`,
        });
      } else if (isInsufficient) {
        addNotification({
          title: "Extraction requires attention",
          description: `Document '${docTitle}' uploaded, but text extraction was incomplete.`,
          category: "evidence",
          severity: "warning",
          relatedDomain: "Evidence Workspace",
          actionRoute: "/app/evidence/runs",
          actionLabel: "Inspect Ingestion Run",
          dedupKey: `insufficient_${result.document_id || item.filename}`,
        });
      } else {
        addNotification({
          title: "Evidence added successfully",
          description: `Document '${docTitle}' (${result.word_count || 0} words) indexed into Evidence Workspace.`,
          category: "evidence",
          severity: "success",
          relatedDomain: "Evidence Workspace",
          actionRoute: result.evidence_id
            ? `/app/evidence/library/${result.evidence_id}`
            : "/app/evidence/library",
          actionLabel: "View Evidence Item",
          dedupKey: `doc_add_${result.document_id || item.filename}`,
        });
      }

      return true;
    } catch (err: any) {
      const errorMsg = err.message || "Failed to process document.";
      updateQueueItem(itemId, {
        status: "failed",
        error: errorMsg,
        statusMessage: `Processing failed: ${errorMsg}`,
        completedAt: Date.now(),
      });

      addNotification({
        title: "Document processing failed",
        description: `Failed to process '${item.filename}': ${errorMsg}`,
        category: "evidence",
        severity: "error",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/upload",
        actionLabel: "Retry Document",
        dedupKey: `doc_err_${itemId}_${Date.now()}`,
      });

      return false;
    } finally {
      setCurrentlyProcessingId(null);
    }
  };

  /**
   * Processes the entire queue strictly one document at a time.
   * Never starts document N+1 until document N has finished.
   */
  const startSequentialProcessing = async () => {
    if (isProcessingQueue) return;
    setIsProcessingQueue(true);
    shouldStopRef.current = false;
    setUploadError(null);

    const snapshot = [...queueRef.current];

    for (let i = 0; i < snapshot.length; i++) {
      if (shouldStopRef.current) break;
      const current = snapshot[i];

      // Only process items that are queued or failed
      const liveItem = queueRef.current.find((q) => q.id === current.id);
      if (liveItem && (liveItem.status === "queued" || liveItem.status === "failed")) {
        await processSingleItem(current.id);
        // Refresh evidence context after each document completes
        await refreshEvidenceData().catch(() => {});
      }
    }

    setIsProcessingQueue(false);
  };

  const handleStopQueue = () => {
    shouldStopRef.current = true;
  };

  const handleRetryItem = async (itemId: string) => {
    if (isProcessingQueue) return;
    setIsProcessingQueue(true);
    await processSingleItem(itemId);
    await refreshEvidenceData().catch(() => {});
    setIsProcessingQueue(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== itemId));
  };

  const handleClearQueue = () => {
    if (isProcessingQueue) {
      shouldStopRef.current = true;
    }
    setQueue([]);
    setSkippedFiles([]);
    setTitle("");
    setProject("");
    setContribution("");
    setIsCollaborative(false);
    setUploadError(null);
  };

  // Portfolio URL Handlers
  const handlePreviewUrl = async () => {
    if (!urlOrRef.trim()) {
      setUploadError("Please enter a valid website or portfolio URL to preview.");
      return;
    }
    setUploadError(null);
    setPreviewLoading(true);
    try {
      const data = await previewPortfolio({
        url: urlOrRef.trim(),
        title: title.trim() || undefined,
        related_project: project.trim() || undefined,
        claimed_contribution: contribution.trim() || undefined,
        is_collaborative: isCollaborative,
      });
      setPreviewData(data);
      if (!title && data.page_title) {
        setTitle(data.page_title);
      }
    } catch (err: any) {
      setUploadError(
        err.message ||
          "Failed to preview URL. Please verify the URL is public and valid."
      );
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlOrRef.trim()) {
      setUploadError("Please enter a valid website or portfolio URL.");
      return;
    }
    setUploadError(null);
    setPortfolioUploading(true);

    try {
      const targetUrl = urlOrRef.trim();
      const result = await scrapePortfolio({
        url: targetUrl,
        title: title.trim() || undefined,
        related_project: project.trim() || undefined,
        claimed_contribution: contribution.trim() || undefined,
        is_collaborative: isCollaborative,
        max_depth: 2,
        max_pages: 10,
      });

      const pagesCount = result?.pages_scraped || result?.pages?.length || 1;
      const skillsCount =
        result?.candidate_skills?.length || result?.candidateSkills?.length || 0;

      addNotification({
        title: "Evidence added successfully",
        description: `Portfolio URL '${targetUrl}' was successfully scraped (${pagesCount} pages indexed).`,
        category: "evidence",
        severity: "success",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/library",
        actionLabel: "View Evidence Library",
        dedupKey: `scrape_${targetUrl}_${Date.now()}`,
      });

      if (skillsCount > 0) {
        addNotification({
          title: "Evidence extraction completed",
          description: `Extracted ${skillsCount} candidate skill${skillsCount === 1 ? "" : "s"} from '${targetUrl}'.`,
          category: "evidence",
          severity: "success",
          relatedDomain: "Evidence Workspace",
          actionRoute: "/app/passport/candidates",
          actionLabel: "Review Candidate Skills",
          dedupKey: `scrape_skills_${targetUrl}_${skillsCount}`,
        });
      }

      setPortfolioSuccessResult(result);
      await refreshEvidenceData();
    } catch (err: any) {
      setUploadError(err.message || "Failed to crawl portfolio URL.");
    } finally {
      setPortfolioUploading(false);
    }
  };

  // Queue Outcome Metrics
  const totalSelected = queue.length + skippedFiles.length;
  const documentsProcessed = queue.filter((q) =>
    ["verified", "verification_pending", "needs_review", "failed"].includes(
      q.status
    )
  ).length;
  const documentsVerified = queue.filter((q) => q.status === "verified").length;
  const documentsAwaitingReview = queue.filter(
    (q) => q.status === "verification_pending" || q.status === "needs_review"
  ).length;
  const documentsFailedOrSkipped =
    queue.filter((q) => q.status === "failed").length + skippedFiles.length;

  const hasQueuedItems = queue.some(
    (q) => q.status === "queued" || q.status === "failed"
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Upload Work & Documents"
        description="Add certificates, technical reports, papers, multiple files, or ZIP archives to your Evidence Library."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        {/* Category Selector Tabs */}
        <section className="space-y-2">
          <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
            SELECT EVIDENCE CATEGORY
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {[
              { id: "document", label: "Project Doc", icon: FileCode },
              { id: "certificate", label: "Certificate", icon: Award },
              { id: "resume", label: "Resume / CV", icon: FileText },
              { id: "portfolio", label: "Project URL", icon: Globe },
              { id: "research", label: "Research", icon: BookOpen },
              { id: "other", label: "Other Artifact", icon: UploadCloud },
            ].map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setCategory(cat.id as any);
                    setPortfolioSuccessResult(null);
                    setUploadError(null);
                    setPreviewData(null);
                  }}
                  className={`p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#DFE968] shadow-[2px_2px_0_0_#1C1C1C]"
                      : "bg-[#FBF6DF] opacity-75 hover:opacity-100"
                  }`}
                >
                  <Icon className="w-5 h-5 text-[#1C1C1C]" />
                  <span className="text-[11px] font-black">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Global Error Banner */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CATEGORY: PORTFOLIO / URL SCRAPING                                         */}
        {/* ========================================================================= */}
        {category === "portfolio" ? (
          portfolioSuccessResult ? (
            <div className="p-8 rounded-[32px] border-[2px] border-[#1C1C1C] bg-[#DFE968] text-center space-y-5 shadow-[4px_4px_0_0_#1C1C1C]">
              <CheckCircle2 className="w-12 h-12 text-[#4A7A4E] mx-auto" />
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-[#1C1C1C]">
                  Portfolio Crawled & Evidence Extracted!
                </h3>
                <p className="text-sm font-medium text-[#1C1C1C]/80 max-w-lg mx-auto">
                  {portfolioSuccessResult.message ||
                    "Your portfolio has been crawled and indexed into your Evidence Library with candidate competencies waiting for review."}
                </p>
              </div>

              {/* Multi-Page Crawl Breakdown */}
              {portfolioSuccessResult.pages_crawled && (
                <div className="p-4 rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C] text-left max-w-xl mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#1C1C1C]" />
                      <span className="text-xs font-black uppercase text-[#1C1C1C]">
                        CRAWL BREAKDOWN:{" "}
                        {portfolioSuccessResult.total_pages ||
                          portfolioSuccessResult.pages_crawled.length}{" "}
                        PAGES DISCOVERED
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPagesList(!showPagesList)}
                      className="text-[11px] font-bold text-[#1C1C1C] underline flex items-center gap-1 cursor-pointer"
                    >
                      {showPagesList ? "Hide Pages" : "Show Pages"}
                      {showPagesList ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="text-[11px] font-medium text-[#1C1C1C]/70">
                    Total words analyzed:{" "}
                    <strong className="text-[#1C1C1C]">
                      {portfolioSuccessResult.total_words || 0}
                    </strong>
                  </div>

                  {showPagesList && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border-t border-[#1C1C1C]/15 pt-2">
                      {portfolioSuccessResult.pages_crawled.map((pg: any, i: number) => (
                        <div
                          key={i}
                          className="p-2 rounded-xl bg-white/70 border border-[#1C1C1C]/20 text-[11px] flex items-center justify-between gap-2"
                        >
                          <div className="truncate flex-1">
                            <p className="font-bold text-[#1C1C1C] truncate">
                              {pg.title || "Untitled"}
                            </p>
                            <p className="text-[10px] text-[#1C1C1C]/60 truncate font-mono">
                              {pg.final_url || pg.submitted_url}
                            </p>
                          </div>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C]/40">
                            {pg.word_count || 0} words
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 flex flex-wrap justify-center gap-3">
                <Link
                  href="/app/evidence/library"
                  className="pill-btn pill-btn-primary text-xs py-3 px-6"
                >
                  VIEW IN EVIDENCE LIBRARY →
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setPortfolioSuccessResult(null);
                    setUrlOrRef("");
                    setPreviewData(null);
                  }}
                  className="pill-btn pill-btn-secondary text-xs py-3 px-6 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>PROCESS ANOTHER</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePortfolioSubmit} className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between ml-2">
                    <label className="text-xs font-black uppercase tracking-wider">
                      Project or Portfolio URL
                    </label>
                    <span className="text-[10px] font-bold text-[#1C1C1C]/60">
                      HTTP / HTTPS Only
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      required
                      placeholder="https://my-project-demo.com or https://portfolio.dev"
                      className="pill-input bg-[#FBF6DF] flex-1"
                      value={urlOrRef}
                      onChange={(e) => {
                        setUrlOrRef(e.target.value);
                        setPreviewData(null);
                      }}
                    />
                    <button
                      type="button"
                      disabled={previewLoading || !urlOrRef.trim()}
                      onClick={handlePreviewUrl}
                      className="pill-btn pill-btn-secondary text-xs px-4 py-2.5 flex items-center gap-1.5 shrink-0"
                    >
                      {previewLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>PREVIEW URL</span>
                    </button>
                  </div>
                </div>

                {previewData && (
                  <div className="p-4 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] space-y-3">
                    <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#4A7A4E]" />
                        <span className="text-xs font-black uppercase text-[#1C1C1C]">
                          URL VALIDATED &amp; PREVIEW READY
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C]">
                        HTTP {previewData.http_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">
                          Resolved Hostname
                        </span>
                        <span className="font-mono font-bold text-[#1C1C1C] truncate block">
                          {previewData.hostname}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">
                          Detected Page Title
                        </span>
                        <span className="font-bold text-[#1C1C1C] truncate block">
                          {previewData.page_title}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={portfolioUploading}
                className="pill-btn pill-btn-primary text-xs py-3.5 px-8 w-full justify-center flex items-center gap-2 cursor-pointer"
              >
                {portfolioUploading ? (
                  <span>CRAWLING PORTFOLIO ···</span>
                ) : (
                  <span>START EVIDENCE EXTRACTION →</span>
                )}
              </button>
            </form>
          )
        ) : (
          /* ========================================================================= */
          /* CATEGORIES: DOCUMENTS, CERTIFICATES, RESUMES, PAPERS, ZIP ARCHIVES         */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* 1. Upload Dropzone Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  handleFilesInput(e.dataTransfer.files);
                }
              }}
              className={`p-8 sm:p-10 rounded-[28px] border-[2px] border-dashed border-[#1C1C1C] text-center space-y-4 relative transition-all ${
                isDragOver
                  ? "bg-[#DFE968]/50 border-solid scale-[0.99] shadow-[2px_2px_0_0_#1C1C1C]"
                  : "bg-[#FBF6DF] hover:bg-[#FBF1CF]/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.pptx,.ppt,.txt,.md,.png,.jpg,.jpeg,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,text/markdown,image/png,image/jpeg,application/zip,application/x-zip-compressed"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFilesInput(e.target.files);
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
              />

              <div className="w-14 h-14 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[2px_2px_0_0_#1C1C1C]">
                {isExtractingZip ? (
                  <Loader2 className="w-7 h-7 text-[#1C1C1C] animate-spin" />
                ) : (
                  <UploadCloud className="w-7 h-7 text-[#1C1C1C]" />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-base font-black text-[#1C1C1C]">
                  {isExtractingZip
                    ? "Safely Unpacking ZIP Archive ···"
                    : "Click to select or drag and drop files here"}
                </p>
                <p className="text-xs font-semibold text-[#1C1C1C]/70 max-w-lg mx-auto">
                  Supports <strong className="text-[#1C1C1C]">Single File</strong>,{" "}
                  <strong className="text-[#1C1C1C]">Multiple Files</strong>, or a{" "}
                  <strong className="text-[#1C1C1C]">ZIP Archive</strong> containing supported documents.
                </p>
                <p className="text-[11px] font-medium text-[#1C1C1C]/50 mt-1">
                  Accepted formats: PDF, DOCX, PPTX, TXT, MD, PNG, JPG (up to 50MB per file). Every document is processed individually.
                </p>
              </div>
            </div>

            {/* 2. Skipped / Unsupported Files Notification */}
            {skippedFiles.length > 0 && (
              <div className="p-4 rounded-2xl bg-[#FEF3E2] border-[1.5px] border-[#C47D2B]/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#C47D2B]">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-black uppercase">
                      {skippedFiles.length} File(s) Skipped / Not Enqueued
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSkippedList(!showSkippedList)}
                    className="text-[11px] font-bold text-[#C47D2B] underline flex items-center gap-1 cursor-pointer"
                  >
                    {showSkippedList ? "Hide Skipped" : "Inspect Skipped"}
                    {showSkippedList ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-[#1C1C1C]/70">
                  Some files could not be added because they are unsupported file formats, empty, or exceeded limits. Valid documents have been enqueued safely.
                </p>

                {showSkippedList && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pt-2 border-t border-[#C47D2B]/20">
                    {skippedFiles.map((sf, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-white/80 border border-[#C47D2B]/30 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="truncate flex-1">
                          <span className="font-mono font-bold text-[#1C1C1C] truncate block">
                            {sf.name}
                          </span>
                          {sf.archiveName && (
                            <span className="text-[10px] text-[#1C1C1C]/50 block">
                              From: {sf.archiveName}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-[#C47D2B] shrink-0">
                          {sf.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Overall Summary Dashboard */}
            {queue.length > 0 && (
              <section className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <div className="p-3 rounded-2xl bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] text-center">
                    <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">
                      Total Selected
                    </span>
                    <span className="text-xl font-black text-[#1C1C1C]">
                      {totalSelected}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] text-center">
                    <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">
                      Processed
                    </span>
                    <span className="text-xl font-black text-[#1C1C1C]">
                      {documentsProcessed}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#E8F5E9] border-[1.5px] border-[#2E7D32] text-center">
                    <span className="text-[10px] font-black uppercase text-[#2E7D32] block">
                      Verified
                    </span>
                    <span className="text-xl font-black text-[#2E7D32]">
                      {documentsVerified}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#FEF3E2] border-[1.5px] border-[#C47D2B] text-center">
                    <span className="text-[10px] font-black uppercase text-[#C47D2B] block">
                      Awaiting Review
                    </span>
                    <span className="text-xl font-black text-[#C47D2B]">
                      {documentsAwaitingReview}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#F6C8D6] border-[1.5px] border-[#C85A54] text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black uppercase text-[#C85A54] block">
                      Failed / Skipped
                    </span>
                    <span className="text-xl font-black text-[#C85A54]">
                      {documentsFailedOrSkipped}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* 4. Live Per-Document Processing Queue */}
            {queue.length > 0 && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1C1C1C]/15 pb-3">
                  <div>
                    <h3 className="text-base font-black text-[#1C1C1C] flex items-center gap-2">
                      <Layers className="w-5 h-5 text-[#1C1C1C]" />
                      <span>Individual Processing Queue ({queue.length})</span>
                    </h3>
                    <p className="text-xs text-[#1C1C1C]/60">
                      Each document is uploaded and extracted sequentially with independent outcomes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {hasQueuedItems && (
                      <button
                        type="button"
                        disabled={isProcessingQueue}
                        onClick={startSequentialProcessing}
                        className="pill-btn pill-btn-primary text-xs py-2 px-5 flex-1 sm:flex-none flex items-center justify-center gap-1.5 cursor-pointer shadow-[2px_2px_0_0_#1C1C1C]"
                      >
                        {isProcessingQueue ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>PROCESSING QUEUE ···</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>START UPLOAD &amp; EXTRACTION</span>
                          </>
                        )}
                      </button>
                    )}

                    {isProcessingQueue && (
                      <button
                        type="button"
                        onClick={handleStopQueue}
                        className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center gap-1 text-[#C85A54] cursor-pointer"
                      >
                        <span>PAUSE</span>
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isProcessingQueue}
                      onClick={handleClearQueue}
                      className="pill-btn pill-btn-secondary text-xs py-2 px-3 text-[#1C1C1C]/70 hover:text-[#C85A54] cursor-pointer flex items-center gap-1"
                      title="Clear Queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">CLEAR</span>
                    </button>
                  </div>
                </div>

                {/* Queue Cards */}
                <div className="space-y-3">
                  {queue.map((item, idx) => {
                    const isCurrent = item.id === currentlyProcessingId;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border-[1.5px] transition-all space-y-3 ${
                          isCurrent
                            ? "bg-[#DFE968]/30 border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C]"
                            : item.status === "failed"
                            ? "bg-[#F6C8D6]/40 border-[#C85A54]"
                            : item.status === "verified"
                            ? "bg-[#E8F5E9]/50 border-[#2E7D32]"
                            : item.status === "needs_review"
                            ? "bg-[#FEF3E2]/50 border-[#C47D2B]"
                            : item.status === "verification_pending"
                            ? "bg-[#FBF6DF] border-[#1C1C1C]/40"
                            : "bg-[#FBF6DF]/60 border-[#1C1C1C]/20"
                        }`}
                      >
                        {/* Header: File info, badge, and actions */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                                item.status === "verified"
                                  ? "bg-[#E8F5E9] border-[#2E7D32] text-[#2E7D32]"
                                  : item.status === "failed"
                                  ? "bg-[#F6C8D6] border-[#C85A54] text-[#C85A54]"
                                  : "bg-[#DFE968] border-[#1C1C1C] text-[#1C1C1C]"
                              }`}
                            >
                              {item.sourceType === "zip" ? (
                                <FileArchive className="w-4 h-4" />
                              ) : (
                                <FileIcon className="w-4 h-4" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-[#1C1C1C] truncate block">
                                  {item.filename}
                                </span>
                                {item.zipArchiveName && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-[#FBF6DF] border border-[#1C1C1C]/30 text-[#1C1C1C]/70">
                                    ZIP: {item.zipArchiveName}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#1C1C1C]/60 block font-mono">
                                {(item.fileSizeBytes / 1024).toFixed(1)} KB • Document #{idx + 1}
                              </span>
                            </div>
                          </div>

                          {/* Status Badge & Row Action */}
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {/* Status Badge */}
                            {item.status === "queued" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F0EDE4] text-[#1C1C1C]/70 border border-[#1C1C1C]/20 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span>Queued</span>
                              </span>
                            )}
                            {item.status === "uploading" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] flex items-center gap-1.5 animate-pulse">
                                <UploadCloud className="w-3 h-3" />
                                <span>Uploading</span>
                              </span>
                            )}
                            {item.status === "processing" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#EBF3FA] text-[#2E5B82] border border-[#2E5B82]/40 flex items-center gap-1.5">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Processing</span>
                              </span>
                            )}
                            {item.status === "verification_pending" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FEF3E2] text-[#C47D2B] border border-[#C47D2B]/40 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                <span>Verification pending</span>
                              </span>
                            )}
                            {item.status === "verified" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E8F5E9] text-[#2E7D32] border border-[#2E7D32]/40 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Verified</span>
                              </span>
                            )}
                            {item.status === "needs_review" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF3E0] text-[#E65100] border border-[#E65100]/40 flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Needs review</span>
                              </span>
                            )}
                            {item.status === "failed" && (
                              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#F6C8D6] text-[#C85A54] border border-[#C85A54]/50 flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3" />
                                <span>Failed</span>
                              </span>
                            )}

                            {/* Row Action Buttons */}
                            {item.status === "failed" && (
                              <button
                                type="button"
                                disabled={isProcessingQueue}
                                onClick={() => handleRetryItem(item.id)}
                                className="p-1 px-2.5 rounded-lg border border-[#C85A54] bg-white text-[#C85A54] hover:bg-[#F6C8D6] text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Retry this document"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Retry</span>
                              </button>
                            )}

                            {item.evidenceId && (
                              <Link
                                href={`/app/evidence/library/${item.evidenceId}`}
                                className="p-1 px-2.5 rounded-lg border border-[#1C1C1C] bg-[#DFE968] text-[#1C1C1C] text-[10px] font-bold flex items-center gap-1 hover:bg-[#d4de5b]"
                              >
                                <span>View Evidence →</span>
                              </Link>
                            )}

                            {item.status === "queued" && !isProcessingQueue && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="p-1 text-[#1C1C1C]/50 hover:text-[#C85A54] cursor-pointer"
                                title="Remove from queue"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status Message / Explanation */}
                        {item.statusMessage && (
                          <p className="text-[11px] font-medium text-[#1C1C1C]/80 bg-white/60 p-2 rounded-xl border border-[#1C1C1C]/10">
                            {item.statusMessage}
                          </p>
                        )}

                        {/* Error detail if failed */}
                        {item.error && (
                          <p className="text-[11px] font-bold text-[#C85A54] bg-[#F6C8D6]/60 p-2 rounded-xl border border-[#C85A54]/30">
                            {item.error}
                          </p>
                        )}

                        {/* Extracted Candidate Skills Chips */}
                        {item.candidateSkills && item.candidateSkills.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-black uppercase text-[#1C1C1C]/50 block">
                              Detected Candidate Competencies ({item.candidateSkills.length}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.candidateSkills.map((sk, sidx) => (
                                <span
                                  key={sidx}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FBF6DF] border border-[#1C1C1C]/30 text-[#1C1C1C] flex items-center gap-1"
                                >
                                  <span>{sk.name}</span>
                                  {sk.proficiencyLevel && (
                                    <span className="text-[8px] px-1 py-0.1 rounded-full bg-[#DFE968] text-[#1C1C1C] font-black">
                                      {sk.proficiencyLevel}
                                    </span>
                                  )}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* 5. Optional Metadata Context & Submission */}
            <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>
                  {queue.length <= 1
                    ? "Document Attribution & Metadata (Optional)"
                    : "Batch Attribution & Project Context (Applied to All Queued Files)"}
                </span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queue.length <= 1 && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider ml-1">
                      Document Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Distributed Telemetry Pipeline"
                      className="pill-input bg-white"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider ml-1">
                    Related Project Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cloud Infrastructure"
                    className="pill-input bg-white"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-wider ml-1">
                    Your Specific Claimed Contribution
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Explain what portions you personally implemented or authored..."
                    className="w-full p-3 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-[#1C1C1C]"
                    value={contribution}
                    onChange={(e) => setContribution(e.target.value)}
                  />
                </div>
              </div>

              {/* Collaborative Toggle */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[#1C1C1C]/30 bg-white/70">
                <input
                  type="checkbox"
                  id="collaborative"
                  checked={isCollaborative}
                  onChange={(e) => setIsCollaborative(e.target.checked)}
                  className="w-4 h-4 accent-[#1C1C1C] cursor-pointer"
                />
                <label
                  htmlFor="collaborative"
                  className="text-xs font-bold text-[#1C1C1C] cursor-pointer"
                >
                  This was a team or collaborative project (attribution will be flagged for verification review)
                </label>
              </div>

              {/* Action Button */}
              {queue.length > 0 && hasQueuedItems && (
                <button
                  type="button"
                  disabled={isProcessingQueue}
                  onClick={startSequentialProcessing}
                  className="pill-btn pill-btn-primary text-xs py-3 px-8 w-full justify-center flex items-center gap-2 cursor-pointer shadow-[2px_2px_0_0_#1C1C1C]"
                >
                  {isProcessingQueue ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>PROCESSING QUEUE ({documentsProcessed}/{queue.length}) ···</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>
                        {queue.length === 1
                          ? "SUBMIT DOCUMENT TO EVIDENCE LIBRARY →"
                          : `PROCESS ALL ${queue.length} DOCUMENTS IN QUEUE →`}
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
