"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

export default function UploadEvidencePage() {
  const { refreshEvidenceData, addNotification } = useEvidence();

  const [category, setCategory] = useState<
    "document" | "certificate" | "resume" | "portfolio" | "research" | "other"
  >("document");

  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [contribution, setContribution] = useState("");
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [urlOrRef, setUrlOrRef] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<any | null>(null);

  // Portfolio URL preview state
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [showPagesList, setShowPagesList] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
      }
    }
  };

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
      setUploadError(err.message || "Failed to preview URL. Please verify the URL is public and valid.");
      setPreviewData(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadError(null);
    setUploading(true);

    try {
      let result;
      if (category === "portfolio") {
        if (!urlOrRef.trim()) {
          throw new Error("Please enter a valid website or portfolio URL.");
        }
        const targetUrl = urlOrRef.trim();
        result = await scrapePortfolio({
          url: targetUrl,
          title: title.trim() || undefined,
          related_project: project.trim() || undefined,
          claimed_contribution: contribution.trim() || undefined,
          is_collaborative: isCollaborative,
          max_depth: 2,
          max_pages: 10,
        });

        const pagesCount = result?.pages_scraped || result?.pages?.length || 1;
        const skillsCount = result?.candidate_skills?.length || result?.candidateSkills?.length || 0;

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
      } else {
        if (!selectedFile) {
          throw new Error("Please select a file to upload.");
        }
        const fileName = selectedFile.name;
        result = await uploadEvidenceDocument(
          selectedFile,
          category,
          title.trim() || selectedFile.name
        );

        if (result?.status === "already_exists") {
          addNotification({
            title: "Duplicate evidence skipped",
            description: `Document '${result.filename || fileName}' matches an existing file with identical SHA-256 hash. Duplicate skipped to preserve data integrity.`,
            category: "evidence",
            severity: "info",
            relatedDomain: "Evidence Workspace",
            actionRoute: result.evidence_id ? `/app/evidence/${result.evidence_id}` : "/app/evidence/library",
            actionLabel: "View Existing Evidence",
            dedupKey: `dup_${result.document_id || fileName}`,
          });
        } else {
          const docTitle = result.title || title.trim() || fileName;
          const wordCount = result.word_count || 0;
          const chunksCount = result.chunks_extracted || 0;
          const skillsCount = result.candidateSkills?.length || 0;

          const isInsufficient =
            result.extraction_quality === "insufficient_content" ||
            result.extraction_quality === "failed" ||
            result.status === "insufficient_content" ||
            (typeof result.word_count === "number" && result.word_count < 15);

          if (isInsufficient) {
            addNotification({
              title: "Extraction requires attention",
              description: `Document '${docTitle}' was uploaded, but text extraction was incomplete: ${result.quality_reason || "insufficient content detected"}.`,
              category: "evidence",
              severity: "warning",
              relatedDomain: "Evidence Workspace",
              actionRoute: "/app/evidence/runs",
              actionLabel: "Inspect Ingestion Run",
              dedupKey: `doc_insufficient_${result.document_id || fileName}`,
            });
          } else {
            addNotification({
              title: "Evidence added successfully",
              description: `Document '${docTitle}' (${wordCount} words, ${chunksCount} chunks) was successfully indexed into your Evidence Workspace.`,
              category: "evidence",
              severity: "success",
              relatedDomain: "Evidence Workspace",
              actionRoute: result.evidence_id ? `/app/evidence/${result.evidence_id}` : "/app/evidence/library",
              actionLabel: "View Evidence Item",
              dedupKey: `doc_add_${result.document_id || fileName}`,
            });

            if (skillsCount > 0) {
              addNotification({
                title: "Evidence extraction completed",
                description: `Extracted ${skillsCount} candidate skill${skillsCount === 1 ? "" : "s"} from '${docTitle}'.`,
                category: "evidence",
                severity: "success",
                relatedDomain: "Evidence Workspace",
                actionRoute: "/app/passport/candidates",
                actionLabel: "Review Candidate Skills",
                dedupKey: `doc_skills_${result.document_id || fileName}`,
              });
            }
          }
        }
      }

      setSuccessResult(result);
      await refreshEvidenceData();
    } catch (err: any) {
      const errMsg = err.message || "Failed to upload and process evidence.";
      setUploadError(errMsg);
      addNotification({
        title: "Document processing failed",
        description: `Failed to process '${category === "portfolio" ? urlOrRef : (selectedFile?.name || "document")}': ${errMsg}`,
        category: "evidence",
        severity: "error",
        relatedDomain: "Evidence Workspace",
        actionRoute: "/app/evidence/upload",
        actionLabel: "Retry Upload",
        dedupKey: `doc_err_${Date.now()}`,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setTitle("");
    setSelectedFile(null);
    setContribution("");
    setUrlOrRef("");
    setProject("");
    setIsCollaborative(false);
    setUploadError(null);
    setPreviewData(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Upload Work &amp; Documents"
        description="Add certificates, technical reports, papers, and portfolio URLs to your Evidence Library."
        backHref="/app/evidence"
        backLabel="Evidence Center"
      />

      <main className="p-6 lg:p-10 space-y-8 max-w-4xl">
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
                    setSuccessResult(null);
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

        {uploadError && (
          <div className="p-4 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {successResult ? (
          <div className="p-8 rounded-[32px] border-[2px] border-[#1C1C1C] bg-[#DFE968] text-center space-y-5 shadow-[4px_4px_0_0_#1C1C1C]">
            <CheckCircle2 className="w-12 h-12 text-[#4A7A4E] mx-auto" />
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-[#1C1C1C]">
                {successResult.status === "already_exists"
                  ? "Artifact Already Processed & In Library!"
                  : category === "portfolio"
                  ? "Portfolio Crawled & Evidence Extracted!"
                  : "Artifact Uploaded & Normalized!"}
              </h3>
              <p className="text-sm font-medium text-[#1C1C1C]/80 max-w-lg mx-auto">
                {successResult.message ||
                  successResult.evidence?.extracted_summary ||
                  successResult.evidence?.extractedSummary ||
                  "Your evidence has been thoroughly crawled, parsed, and indexed into your Evidence Library with candidate competencies waiting for review."}
              </p>
            </div>

            {/* Multi-Page Crawl Breakdown (For Portfolio Category) */}
            {category === "portfolio" && successResult.pages_crawled && (
              <div className="p-4 rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C] text-left max-w-xl mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#1C1C1C]" />
                    <span className="text-xs font-black uppercase text-[#1C1C1C]">
                      CRAWL BREAKDOWN: {successResult.total_pages || successResult.pages_crawled.length} PAGES DISCOVERED
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPagesList(!showPagesList)}
                    className="text-[11px] font-bold text-[#1C1C1C] underline flex items-center gap-1 cursor-pointer"
                  >
                    {showPagesList ? "Hide Pages" : "Show Pages"}
                    {showPagesList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="text-[11px] font-medium text-[#1C1C1C]/70">
                  Total words analyzed: <strong className="text-[#1C1C1C]">{successResult.total_words || 0}</strong>
                  {successResult.total_documents ? (
                    <span> • Linked documents parsed: <strong className="text-[#1C1C1C]">{successResult.total_documents}</strong></span>
                  ) : null}
                </div>

                {showPagesList && (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border-t border-[#1C1C1C]/15 pt-2">
                    {successResult.pages_crawled.map((pg: any, i: number) => (
                      <div
                        key={i}
                        className="p-2 rounded-xl bg-white/70 border border-[#1C1C1C]/20 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="truncate flex-1">
                          <p className="font-bold text-[#1C1C1C] truncate">{pg.title || "Untitled"}</p>
                          <p className="text-[10px] text-[#1C1C1C]/60 truncate font-mono">{pg.final_url || pg.submitted_url}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#DFE968] border border-[#1C1C1C]/40">
                            {pg.word_count || 0} words
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detected Candidate Competencies */}
            {(() => {
              const skills =
                successResult.evidence?.candidateSkills ||
                successResult.candidateSkills ||
                successResult.evidence?.candidate_skills ||
                [];
              if (!skills || skills.length === 0) return null;
              return (
                <div className="pt-2 max-w-xl mx-auto space-y-2">
                  <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">
                    DETECTED CANDIDATE COMPETENCIES ({skills.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {skills.map((cs: any, i: number) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#FBF6DF] border border-[#1C1C1C] text-[#1C1C1C] flex items-center gap-1.5"
                      >
                        <span>{cs.name || cs}</span>
                        {cs.proficiencyLevel && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#DFE968] text-[#1C1C1C] font-black">
                            {cs.proficiencyLevel}
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Link
                href={
                  successResult.evidence_id || successResult.evidence?.id
                    ? `/app/evidence/library/${successResult.evidence_id || successResult.evidence?.id}`
                    : "/app/evidence/library"
                }
                className="pill-btn pill-btn-primary text-xs py-3 px-6"
              >
                VIEW IN EVIDENCE LIBRARY →
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="pill-btn pill-btn-secondary text-xs py-3 px-6 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>PROCESS ANOTHER</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Drop Area vs Project URL Field */}
            {category !== "portfolio" ? (
              <div className="p-8 rounded-[28px] border-[2px] border-dashed border-[#1C1C1C] bg-[#FBF6DF] text-center space-y-3 relative hover:bg-[#FBF1CF]/60 transition-colors">
                <input
                  type="file"
                  required={!selectedFile}
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-12 h-12 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center mx-auto shadow-[1.5px_1.5px_0_0_#1C1C1C]">
                  <UploadCloud className="w-6 h-6 text-[#1C1C1C]" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#1C1C1C]">
                    {selectedFile ? `Selected: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : "Click or drag file to upload"}
                  </p>
                  <p className="text-xs font-medium text-[#1C1C1C]/60 mt-1">
                    Accepts PDF, DOCX, TXT, MD, PNG, JPG (Full OCR &amp; structured text extraction)
                  </p>
                </div>
              </div>
            ) : (
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
                  <p className="text-[11px] text-[#1C1C1C]/60 ml-2">
                    Safely crawled with SSRF protections, internal link discovery, and robots.txt compliance.
                  </p>
                </div>

                {/* Preview Card (Phase 1.2) */}
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
                        <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">Resolved Hostname</span>
                        <span className="font-mono font-bold text-[#1C1C1C] truncate block">{previewData.hostname}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">Detected Page Title</span>
                        <span className="font-bold text-[#1C1C1C] truncate block">{previewData.page_title}</span>
                      </div>
                      <div className="md:col-span-2">
                        <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60 block">Resolved Final URL</span>
                        <a
                          href={previewData.final_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] text-[#1C1C1C] underline flex items-center gap-1 truncate"
                        >
                          <span className="truncate">{previewData.final_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[#1C1C1C]/15">
                      <div className="flex items-center gap-1.5 text-[#1C1C1C]/80">
                        <span className="w-2 h-2 rounded-full bg-[#4A7A4E]"></span>
                        <span>{previewData.crawl_permitted ? "Crawl permitted by robots.txt" : "Robots.txt restricts bot access"}</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#1C1C1C]/60">
                        Ready to extract candidate evidence
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Metadata Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider ml-2">
                  Document / Artifact Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Telemetry Pipeline"
                  className="pill-input bg-[#FBF6DF]"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider ml-2">
                  Related Project Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Infrastructure"
                  className="pill-input bg-[#FBF6DF]"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider ml-2">
                Your Specific Claimed Contribution (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Explain what portions you personally implemented or authored..."
                className="w-full p-4 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] text-xs font-medium outline-none focus:ring-2 focus:ring-[#1C1C1C]"
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
              />
            </div>

            {/* Collaborative Toggle */}
            <div className="flex items-center gap-3 p-4 rounded-2xl border border-[#1C1C1C] bg-[#FBF6DF]">
              <input
                type="checkbox"
                id="collaborative"
                checked={isCollaborative}
                onChange={(e) => setIsCollaborative(e.target.checked)}
                className="w-4 h-4 accent-[#1C1C1C]"
              />
              <label htmlFor="collaborative" className="text-xs font-bold text-[#1C1C1C] cursor-pointer">
                This was a team or collaborative project (attribution will be flagged for verification review)
              </label>
            </div>

            {uploading && (
              <div className="p-6 rounded-3xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center space-y-2 overflow-hidden">
                <LoadingAnimation size="sm" className="-my-2" />
                <span className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                  {category === "portfolio"
                    ? "Controlled Crawler Active: Discovering Pages, Extracting Technical Evidence &amp; Running Qwen3 ···"
                    : "Domain 1 Engine: Parsing, Extracting &amp; Indexing ···"}
                </span>
                {category === "portfolio" && (
                  <p className="text-[11px] text-[#1C1C1C]/70">
                    Traversing within authorized host scope, parsing internal project pages, and indexing candidate competencies.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="pill-btn pill-btn-primary text-xs py-3.5 px-8 w-full justify-center flex items-center gap-2 cursor-pointer"
            >
              {uploading ? (
                <span>PROCESSING EVIDENCE ···</span>
              ) : previewData ? (
                <span>START EVIDENCE EXTRACTION →</span>
              ) : (
                <span>SUBMIT TO EVIDENCE LIBRARY →</span>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
