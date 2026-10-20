"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import type { WorkAnalysisResult } from "@/types/ai";
import {
  AnalysisStatusBadge,
  AnalysisMethodBadge,
} from "@/components/app/AIBadges";
import {
  Sparkles,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  GitBranch,
  Cpu,
  Clock,
  Info,
  CheckCircle2,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

function mapRawAnalysisToWorkResult(w: any): WorkAnalysisResult {
  const rawSkills = Array.isArray(w.demonstrated_skills) && w.demonstrated_skills.length > 0
    ? w.demonstrated_skills
    : [];

  const demonstrated_skills = rawSkills.map((s: any) => ({
    name: s.name || s.skill || "",
    proficiency: s.proficiency || "Intermediate",
    category: s.category || "Competency",
    corroborated_with_evidence: s.corroborated_with_evidence !== undefined ? !!s.corroborated_with_evidence : true,
    justification: s.justification || "",
  })).filter((s: any) => Boolean(s.name));

  const techList = Array.isArray(w.technologies) && w.technologies.length > 0
    ? w.technologies
    : demonstrated_skills.map((s: any) => `${s.name} (${s.proficiency})`);

  const wConf = w.confidence_score !== undefined && w.confidence_score !== null
    ? (w.confidence_score <= 1.0 ? w.confidence_score * 100 : w.confidence_score)
    : 85;

  return {
    analysis_id: w.analysis_id || `analysis-${Date.now()}`,
    source_id: w.evidence_id || w.source_id,
    source_title: w.title || w.source_title || "Evidence Artifact",
    source_type: w.source_type || "document",
    observed_facts: (w.observed_facts || []).map((f: any, idx: number) => ({
      id: `fact-${idx}`,
      fact: typeof f === "string" ? f : f.fact || "",
      excerpt: typeof f === "object" ? f.excerpt || f.fact || "" : f,
      evidence_id: w.evidence_id || w.source_id,
      source_locus: typeof f === "object" ? f.source_locus || f.type : undefined,
    })),
    inferred_attributes: (w.inferred_attributes || []).map((inf: any, idx: number) => ({
      id: `inf-${idx}`,
      attribute: typeof inf === "string" ? inf : inf.attribute || "",
      interpretation: typeof inf === "object" ? inf.supported_by || inf.interpretation || "" : "",
      confidence: Math.round(wConf),
      is_tentative: true,
    })),
    detected_activities: (w.technical_tasks || []).map((t: any) => ({
      task: typeof t === "string" ? t : t.task || "",
      contribution_level: (w.role?.toLowerCase().includes("author") ? "author" : "collaborator") as any,
      attribution_state: "confirmed" as any,
    })),
    key_findings: techList,
    demonstrated_skills,
    uncertainty_flags: (w.uncertainty_flags || []).map((u: any) => typeof u === "string" ? u : `${u.area || "Area"}: ${u.reason || u}`),
    status: (w.analysis_status || "completed") as any,
    model_name: w.analysis_method === "rule_based" || w.fallback_used ? "Rule-based Engine" : (w.model_name || "qwen3:8b"),
    model_version: w.model_version || (w.analysis_method === "rule_based" ? "deterministic-v1.0" : "qwen3:8b"),
    prompt_version: "v1.0",
    analysis_method: w.analysis_method || "ollama",
    fallback_used: !!w.fallback_used,
    fallback_reason: w.fallback_reason || null,
    analysis_status: w.analysis_status || "completed",
    validation_status: w.validation_status || "valid",
    created_at: w.created_at || "Recently",
  };
}

function WorkAnalysisContent() {
  const {
    evidenceItems,
    workAnalyses,
    upsertWorkAnalysis,
    addAIAuditEvent,
    refreshEvidenceData,
  } = useEvidence();

  const searchParams = useSearchParams();
  const evidenceIdParam = searchParams.get("evidence_id") || searchParams.get("source_id");

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    evidenceIdParam || workAnalyses[0]?.source_id || evidenceItems[0]?.id || ""
  );
  const [localAnalyses, setLocalAnalyses] = useState<WorkAnalysisResult[]>([]);
  const [isLoadingAnalyses, setIsLoadingAnalyses] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<"ALL" | "GITHUB" | "DOCUMENTS" | "PORTFOLIO">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDirectory, setShowDirectory] = useState(false);

  // Pre-load all saved analyses from DB on mount so existing records are immediately accessible
  useEffect(() => {
    let isMounted = true;
    async function loadSavedAnalyses() {
      try {
        setIsLoadingAnalyses(true);
        const { listWorkAnalyses } = await import("@/lib/evidenceApi");
        const res = await listWorkAnalyses();
        if (isMounted && res?.items && Array.isArray(res.items)) {
          const mapped = res.items.map((item: any) => mapRawAnalysisToWorkResult(item));
          setLocalAnalyses(mapped);
          mapped.forEach((item: WorkAnalysisResult) => upsertWorkAnalysis(item));
        }
      } catch (err) {
        console.warn("Could not pre-fetch work analyses:", err);
      } finally {
        if (isMounted) setIsLoadingAnalyses(false);
      }
    }
    loadSavedAnalyses();
    return () => {
      isMounted = false;
    };
  }, []);

  const sourceCounts = useMemo(() => {
    let github = 0;
    let documents = 0;
    let portfolio = 0;
    for (const item of evidenceItems) {
      const st = (item.sourceType || "").toLowerCase();
      if (["github", "commit", "pull_request", "readme", "code_repository"].includes(st)) {
        github++;
      } else if (["document", "certificate", "resume"].includes(st)) {
        documents++;
      } else if (["portfolio", "web_page", "website"].includes(st)) {
        portfolio++;
      }
    }
    return { all: evidenceItems.length, github, documents, portfolio };
  }, [evidenceItems]);

  const filteredItems = useMemo(() => {
    return evidenceItems.filter((item) => {
      const st = (item.sourceType || "").toLowerCase();
      if (filterCategory === "GITHUB" && !["github", "commit", "pull_request", "readme", "code_repository"].includes(st)) {
        return false;
      }
      if (filterCategory === "DOCUMENTS" && !["document", "certificate", "resume"].includes(st)) {
        return false;
      }
      if (filterCategory === "PORTFOLIO" && !["portfolio", "web_page", "website"].includes(st)) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchProject = (item.project || "").toLowerCase().includes(q);
        const matchExt = (item.externalRecordId || "").toLowerCase().includes(q);
        return matchTitle || matchProject || matchExt;
      }
      return true;
    });
  }, [evidenceItems, filterCategory, searchQuery]);

  const groupedSources = useMemo(() => {
    const groups: { [key: string]: typeof evidenceItems } = {};
    for (const ev of filteredItems) {
      let groupKey = ev.project || "Other Sources";
      const st = (ev.sourceType || "").toLowerCase();
      if (["github", "commit", "pull_request", "readme", "code_repository"].includes(st)) {
        groupKey = `Repository: ${ev.project || "GitHub"}`;
      } else if (["document", "certificate", "resume"].includes(st)) {
        groupKey = `Document: ${ev.project || "Uploaded Files"}`;
      } else if (["portfolio", "web_page", "website"].includes(st)) {
        groupKey = `Web / Portfolio: ${ev.project || "Web Articles"}`;
      }
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(ev);
    }
    return groups;
  }, [filteredItems]);

  const formatOptionLabel = (ev: typeof evidenceItems[0]) => {
    const shortSha = ev.externalRecordId && ev.externalRecordId.length >= 7 
      ? ` [${ev.externalRecordId.slice(0, 7)}]` 
      : "";
    const dateStr = ev.date && ev.date !== "Recently" ? ` • ${ev.date}` : "";
    return `${ev.title}${shortSha} (${ev.sourceType.toUpperCase()})${dateStr}`;
  };

  useEffect(() => {
    if (evidenceIdParam && evidenceItems.some((e) => e.id === evidenceIdParam)) {
      setSelectedSourceId(evidenceIdParam);
    } else if (!selectedSourceId && evidenceItems.length > 0) {
      setSelectedSourceId(evidenceItems[0].id);
    }
  }, [evidenceIdParam, evidenceItems, selectedSourceId]);

  const selectedEvidence = evidenceItems.find((e) => e.id === selectedSourceId);
  const activeAnalysis = useMemo(() => {
    if (!selectedSourceId) return null;
    const local = localAnalyses.find((a) => a.source_id === selectedSourceId);
    if (local) return local;
    const fromContext = workAnalyses.find((a) => a.source_id === selectedSourceId);
    if (fromContext) return fromContext;
    return null;
  }, [selectedSourceId, localAnalyses, workAnalyses]);

  const handleRunAnalysis = async () => {
    if (!selectedSourceId) return;
    setIsSimulating(true);
    setAnalysisError(null);

    try {
      const { runWorkAnalysis } = await import("@/lib/evidenceApi");
      const res = await runWorkAnalysis([selectedSourceId]);

      const itemResult = res?.analyses?.[0];
      if (itemResult && itemResult.status !== "failed") {
        const mapped = mapRawAnalysisToWorkResult(itemResult);
        setLocalAnalyses((prev) => [mapped, ...prev.filter((a) => a.source_id !== selectedSourceId)]);
        upsertWorkAnalysis(mapped);
      } else if (itemResult?.status === "failed") {
        throw new Error(itemResult.error || "Analysis failed");
      }

      await refreshEvidenceData(true).catch(() => {});

      const modelName = itemResult?.model_name || "qwen3:8b";
      const isFallback = itemResult?.fallback_used || itemResult?.analysis_method === "rule_based";

      addAIAuditEvent({
        timestamp: "Just now",
        event_type: "analysis_completed",
        affected_entity_type: "source",
        affected_entity_id: selectedSourceId,
        new_state: "Analysis Completed",
        reason: `Analyzed work artifacts for ${selectedEvidence?.title || selectedSourceId} via ${isFallback ? "Deterministic Engine" : `Ollama (${modelName})`}`,
        actor: isFallback ? "Rule-based Fallback Pipeline" : `Ollama LLM Pipeline (${modelName})`,
        model_or_policy_version: modelName,
      });
    } catch (e: any) {
      console.error("Backend analysis error:", e);
      setAnalysisError(e?.message || "Ollama work analysis failed. Please verify Ollama is running and qwen3:8b is loaded.");
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="AI Work Analysis"
        description="Inspect what was extracted from a source, which activities were identified, and where the supporting evidence comes from."
      >
        <Link
          href="/app/ai/skill-extraction"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <span>SKILL EXTRACTION</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {evidenceItems.length === 0 ? (
        <div className="gl-card p-12 text-center space-y-4 my-8 max-w-md mx-auto">
          <FileText className="w-10 h-10 text-[#8C827A] mx-auto opacity-50" />
          <h3 className="text-base font-bold text-[#1F1E1D]">No Evidence Sources Ingested</h3>
          <p className="text-xs text-[#8C827A] leading-relaxed">
            You must ingest at least one evidence item (code commits, pull requests, Jira tickets, or documents) in the Evidence Workspace before running AI Work Analysis.
          </p>
          <Link href="/app/evidence" className="pill-btn pill-btn-primary text-xs inline-flex items-center gap-1.5 mx-auto">
            Go to Evidence Workspace →
          </Link>
        </div>
      ) : (
        <>
          {/* Source Selector Bar & Actions */}
          <div className="gl-card p-5 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">
                    Ingested Source:
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#EFECE6] text-[#1C1C1C] border border-[#E4DDD3]">
                    {evidenceItems.length} Available
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <select
                    value={selectedSourceId}
                    onChange={(e) => setSelectedSourceId(e.target.value)}
                    className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer font-medium w-full truncate border-[#1C1C1C]"
                  >
                    {selectedEvidence && !filteredItems.some((i) => i.id === selectedSourceId) && (
                      <option value={selectedEvidence.id}>
                        * Selected: {formatOptionLabel(selectedEvidence)}
                      </option>
                    )}
                    {Object.entries(groupedSources).map(([groupTitle, items]) => (
                      <optgroup key={groupTitle} label={`${groupTitle} (${items.length})`}>
                        {items.map((ev) => (
                          <option key={ev.id} value={ev.id}>
                            {formatOptionLabel(ev)}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDirectory(!showDirectory)}
                  className={`pill-btn text-xs py-2 px-3 flex items-center gap-1.5 transition-all ${
                    showDirectory
                      ? "bg-[#DFE968] text-[#1C1C1C] font-bold border-[#1C1C1C]"
                      : "pill-btn-secondary"
                  }`}
                  title="Browse all ingested sources in an organized directory view"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{showDirectory ? "Hide Directory" : `Browse All Sources (${evidenceItems.length})`}</span>
                  {showDirectory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {activeAnalysis && (
                  <div className="hidden sm:flex items-center gap-2">
                    <AnalysisMethodBadge
                      method={activeAnalysis.analysis_method}
                      modelName={activeAnalysis.model_name}
                      fallbackUsed={activeAnalysis.fallback_used}
                      fallbackReason={activeAnalysis.fallback_reason}
                    />
                    <AnalysisStatusBadge status={activeAnalysis.status} />
                  </div>
                )}

                <button
                  onClick={handleRunAnalysis}
                  disabled={isSimulating}
                  className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                  title="Run real Ollama (qwen3:8b) inference on this work artifact"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
                  {isSimulating ? "Analyzing with Ollama..." : "Analyze with Ollama"}
                </button>
              </div>
            </div>

            {/* Quick Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#F0EBE1]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase text-[#8C827A] mr-1">Filter Sources:</span>
                <button
                  type="button"
                  onClick={() => setFilterCategory("ALL")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCategory === "ALL"
                      ? "bg-[#1C1C1C] text-white"
                      : "bg-[#F4EFE6] text-[#5A5550] hover:bg-[#EAE4D9]"
                  }`}
                >
                  All ({sourceCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("GITHUB")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCategory === "GITHUB"
                      ? "bg-[#1C1C1C] text-white"
                      : "bg-[#F4EFE6] text-[#5A5550] hover:bg-[#EAE4D9]"
                  }`}
                >
                  GitHub ({sourceCounts.github})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("DOCUMENTS")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCategory === "DOCUMENTS"
                      ? "bg-[#1C1C1C] text-white"
                      : "bg-[#F4EFE6] text-[#5A5550] hover:bg-[#EAE4D9]"
                  }`}
                >
                  Documents ({sourceCounts.documents})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterCategory("PORTFOLIO")}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                    filterCategory === "PORTFOLIO"
                      ? "bg-[#1C1C1C] text-white"
                      : "bg-[#F4EFE6] text-[#5A5550] hover:bg-[#EAE4D9]"
                  }`}
                >
                  Web Portfolio ({sourceCounts.portfolio})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]" />
                <input
                  type="text"
                  placeholder="Filter sources by title, repo, or sha..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pill-input text-xs py-1.5 pl-8 pr-3 w-full bg-[#FAF8F5] border-[#E4DDD3]"
                />
              </div>
            </div>

            {/* Collapsible Full Ingested Sources Directory */}
            {showDirectory && (
              <div className="pt-3 border-t border-[#F0EBE1] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase text-[#1C1C1C]">
                      Ingested Sources Directory ({filteredItems.length} of {evidenceItems.length})
                    </h3>
                    <p className="text-[11px] text-[#8C827A]">
                      Select any ingested evidence source below to inspect its extracted activities and run AI analysis.
                    </p>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#F0EBE1] border border-[#E4DDD3] rounded-xl bg-white">
                  {filteredItems.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#8C827A]">
                      No ingested sources match the current filter.
                    </div>
                  ) : (
                    filteredItems.map((ev) => {
                      const isSelected = ev.id === selectedSourceId;
                      const hasAnalysis = workAnalyses.some((a) => a.source_id === ev.id);
                      const shortSha = ev.externalRecordId && ev.externalRecordId.length >= 7 
                        ? ev.externalRecordId.slice(0, 7) 
                        : null;
                      return (
                        <div
                          key={ev.id}
                          onClick={() => {
                            setSelectedSourceId(ev.id);
                          }}
                          className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-[#DFE968]/20 border-l-4 border-l-[#1C1C1C]"
                              : "hover:bg-[#FAF8F5]"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[#1F1E1D] truncate">
                                {ev.title}
                              </span>
                              {shortSha && (
                                <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#1C1C1C]">
                                  {shortSha}
                                </code>
                              )}
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#EAE4D9] text-[#5A5550]">
                                {ev.sourceType}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-[11px] text-[#8C827A]">
                              <span>Project: <strong className="text-[#1C1C1C] font-semibold">{ev.project}</strong></span>
                              <span>•</span>
                              <span>Date: {ev.date}</span>
                              {ev.author && (
                                <>
                                  <span>•</span>
                                  <span>Author: {ev.author}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasAnalysis ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4EDDA] text-[#155724] border border-[#C3E6CB] flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Analyzed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#FAF8F5] text-[#8C827A] border border-[#E4DDD3]">
                                Ready for Analysis
                              </span>
                            )}
                            <button
                              type="button"
                              className={`pill-btn text-[11px] py-1 px-3 ${
                                isSelected ? "pill-btn-primary" : "pill-btn-secondary"
                              }`}
                            >
                              {isSelected ? "Active" : "Select"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {analysisError && (
              <div className="p-3.5 rounded-xl border border-[#1C1C1C] bg-[#F6C8D6] text-xs font-bold text-[#C85A54] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{analysisError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAnalysisError(null)}
                  className="text-[10px] font-black underline uppercase"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>

      {/* Two-Column Analysis Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Selected Source Details */}
        <div className="gl-card p-6 space-y-5 lg:col-span-1 border-[#E4DDD3]">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
              Selected Source Metadata
            </span>
            <h2 className="text-base font-bold text-[#1F1E1D] mt-1">
              {selectedEvidence?.title || "Source"}
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#F0EBE1]">
              <span className="text-[#8C827A]">Source Type:</span>
              <span className="font-bold uppercase text-[#1F1E1D]">
                {selectedEvidence?.sourceType}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0EBE1]">
              <span className="text-[#8C827A]">Project / Repository:</span>
              <span className="font-medium text-[#1F1E1D] truncate max-w-[150px]">
                {selectedEvidence?.project}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0EBE1]">
              <span className="text-[#8C827A]">Import Date:</span>
              <span className="font-medium text-[#1F1E1D]">
                {selectedEvidence?.date}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0EBE1]">
              <span className="text-[#8C827A]">Author Identified:</span>
              <span className="font-medium text-[#1F1E1D]">
                {selectedEvidence?.author}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#F0EBE1]">
              <span className="text-[#8C827A]">Attribution State:</span>
              <span className="font-bold text-[#2E6941] capitalize">
                {selectedEvidence?.reviewStatus}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            {selectedEvidence && (
              <Link
                href={`/app/evidence/${selectedEvidence.id}`}
                className="pill-btn pill-btn-secondary text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Evidence Artifact
              </Link>
            )}
            <Link
              href="/app/ai/evidence-mapping"
              className="text-xs font-semibold text-[#8C827A] hover:text-[#1F1E1D] text-center"
            >
              Inspect Candidate Skill Mappings →
            </Link>
          </div>
        </div>

        {/* Right Column: AI Analysis Output */}
        <div className="lg:col-span-2 space-y-6">
          {isSimulating ? (
            <div className="gl-card p-12 text-center space-y-4 border-[#E4DDD3]">
              <div className="w-12 h-12 rounded-full bg-[#DFE968]/30 flex items-center justify-center mx-auto">
                <RefreshCw className="w-6 h-6 text-[#1C1C1C] animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#1F1E1D]">
                  Running AI Work Analysis via Ollama (qwen3:8b)...
                </h3>
                <p className="text-xs text-[#8C827A] max-w-md mx-auto leading-relaxed">
                  Offloading model layers to your NVIDIA RTX 4050 GPU. Extracting observed facts, verifiable activities, demonstrated competencies, and model interpretations...
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FAF8F5] border border-[#E0D9CD] text-[11px] font-semibold text-[#5A5550]">
                <Cpu className="w-3.5 h-3.5 text-[#2E6941]" />
                <span>GPU Acceleration Active • Zero Fabrication Guard Engaged</span>
              </div>
            </div>
          ) : !activeAnalysis ? (
            <div className="gl-card p-12 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-[#8C827A] mx-auto" />
              <h3 className="text-base font-bold text-[#1F1E1D]">
                No Analysis Generated Yet
              </h3>
              <p className="text-xs text-[#8C827A] max-w-sm mx-auto">
                Click &ldquo;Analyze with Ollama&rdquo; above to run local LLM analysis on this source artifact.
              </p>
            </div>
          ) : (
            <>
              {/* Analysis Success & Model Banner */}
              <div className="p-3.5 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] flex items-center justify-between text-xs text-[#166534]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#2E6941] shrink-0" />
                  <span>
                    <strong>Analysis Complete:</strong> Evaluated by {activeAnalysis.model_name || "Ollama (qwen3:8b)"} ({activeAnalysis.created_at || "Recently"})
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white text-[#2E6941] border border-[#C8E6C9]">
                  {activeAnalysis.analysis_status || "completed"}
                </span>
              </div>

              {/* Section 1: Observed Facts */}
              <div className="gl-card p-6 space-y-4 border-[#E4DDD3]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F1E1D]">
                      Observed Facts ({activeAnalysis.observed_facts.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-[#8C827A] font-semibold">
                    Direct Codebase Citations
                  </span>
                </div>
                <p className="text-xs text-[#5A5550]">
                  Grounded facts directly substantiated by lines of code, commit signatures, or ticket logs.
                </p>

                {activeAnalysis.observed_facts.length === 0 ? (
                  <p className="text-xs text-[#8C827A] italic py-2">
                    No explicit factual citations extracted from this artifact.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeAnalysis.observed_facts.map((fact) => (
                      <div
                        key={fact.id}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-semibold text-[#1F1E1D]">{fact.fact}</span>
                          {fact.source_locus && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#8C827A] border border-[#E0D9CD] flex-shrink-0">
                              {fact.source_locus}
                            </span>
                          )}
                        </div>
                        {fact.excerpt && (
                          <p className="text-[11px] font-mono bg-white p-2 rounded-lg text-[#5A5550] border border-[#EAE4D8] overflow-x-auto">
                            &ldquo;{fact.excerpt}&rdquo;
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Inferred Attributes (Explicitly Labeled as Interpretations) */}
              <div className="gl-card p-6 space-y-4 border-[#E4DDD3]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#4361EE]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F1E1D]">
                      Inferred Attributes ({activeAnalysis.inferred_attributes.length})
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold text-[#4361EE] uppercase tracking-wider">
                    Model Interpretations
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-[#F0F4FF] border border-[#C5D5F9] text-xs text-[#1E3A8A]">
                  <strong>Interpretation Boundary:</strong> Inferred attributes are machine hypotheses derived from observed patterns. They do not constitute formal skills until corroborated by verification.
                </div>

                <div className="space-y-3">
                  {activeAnalysis.inferred_attributes.map((inf) => (
                    <div
                      key={inf.id}
                      className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#1F1E1D]">{inf.attribute}</span>
                        <span className="text-[10px] font-semibold text-[#8C827A]">
                          Confidence: {inf.confidence}%
                        </span>
                      </div>
                      <p className="text-[#5A5550]">{inf.interpretation}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Detected Activities & Contributions */}
              <div className="gl-card p-6 space-y-4 border-[#E4DDD3]">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F1E1D]">
                  Detected Activities & Attribution
                </h3>
                {activeAnalysis.detected_activities.length === 0 ? (
                  <p className="text-xs text-[#8C827A] italic py-2">
                    No explicit git commit tasks or engineering activities detected in this text document. Demonstrable competencies and observed facts are captured below.
                  </p>
                ) : (
                  <div className="divide-y divide-[#F0EBE1] text-xs">
                    {activeAnalysis.detected_activities.map((act, i) => (
                      <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between">
                        <span className="font-medium text-[#1F1E1D]">{act.task}</span>
                        <div className="flex items-center gap-2">
                          <span className="capitalize px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[10px] font-bold text-[#1F1E1D]">
                            Level: {act.contribution_level}
                          </span>
                          <span className={`text-[10px] font-bold capitalize ${
                            act.attribution_state === "confirmed" ? "text-[#2E6941]" : "text-[#B07219]"
                          }`}>
                            {act.attribution_state.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Demonstrated Skills & Competencies & Uncertainty Flags */}
              <div className="space-y-4">
                <div className="gl-card p-6 space-y-4 border-[#E4DDD3]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#4361EE]" />
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#1F1E1D]">
                        Demonstrated Skills & Competencies ({(activeAnalysis.demonstrated_skills || []).length})
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold text-[#2E6941] uppercase tracking-wider bg-[#E8F5E9] px-2.5 py-0.5 rounded-full border border-[#C8E6C9]">
                      Artifact-Grounded & Cross-Verified
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534] leading-relaxed">
                    <strong>Evidence Corroboration:</strong> Skills identified from this artifact by Qwen-3 8B are checked against competencies extracted during Domain 1 Evidence Ingestion. Green badges denote skills directly verified by evidence excerpts.
                  </div>

                  {(!activeAnalysis.demonstrated_skills || activeAnalysis.demonstrated_skills.length === 0) ? (
                    <div className="p-6 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-center space-y-2">
                      <p className="text-xs font-semibold text-[#1F1E1D]">No demonstrated skills recorded yet for this artifact.</p>
                      <p className="text-[11px] text-[#8C827A]">
                        Click <strong>Re-run AI Analysis</strong> above to trigger Qwen-3 8B extraction with Domain 1 verification.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {activeAnalysis.demonstrated_skills.map((skill, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] space-y-2 hover:border-[#D5CFC7] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-[#1F1E1D] text-sm block">
                                {skill.name}
                              </span>
                              {skill.category && (
                                <span className="text-[10px] font-medium text-[#8C827A]">
                                  {skill.category}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  skill.proficiency === "Advanced"
                                    ? "bg-[#EDE9FE] text-[#6D28D9] border-[#DDD6FE]"
                                    : skill.proficiency === "Foundational"
                                    ? "bg-[#F4F4F6] text-[#5A5550] border-[#E2E2E6]"
                                    : "bg-[#E8F0FE] text-[#1D4ED8] border-[#BFDBFE]"
                                }`}
                              >
                                {skill.proficiency || "Intermediate"}
                              </span>
                              {skill.corroborated_with_evidence ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E8F5E9] text-[#2E6941] border border-[#C8E6C9]">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Corroborated
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
                                  <Sparkles className="w-2.5 h-2.5" /> Qwen Inferred
                                </span>
                              )}
                            </div>
                          </div>

                          {skill.justification && (
                            <p className="text-xs text-[#5A5550] bg-white/80 p-2.5 rounded-lg border border-[#EFEAE1] leading-relaxed">
                              <strong className="text-[#1F1E1D] text-[11px]">Artifact Grounding: </strong>
                              {skill.justification}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {activeAnalysis.key_findings && activeAnalysis.key_findings.length > 0 && (
                    <div className="pt-2 border-t border-[#F0EBE1] space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                        Detected Tooling & Stack
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {activeAnalysis.key_findings.map((tech, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFEAE1] text-[#1F1E1D] border border-[#E2DDD3]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="gl-card p-5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B07219] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Uncertainty Flags & Evidence Gaps
                  </span>
                  {activeAnalysis.uncertainty_flags.length === 0 ? (
                    <p className="text-xs text-[#8C827A] italic">No uncertainty flags detected. Evidence provides clear attribution.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-[#5A5550]">
                      {activeAnalysis.uncertainty_flags.map((u, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[#B07219]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#B07219] mt-1.5 flex-shrink-0" />
                          <span>{u}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Section 5: Model Metadata Footnote */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-[11px] text-[#8C827A] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-[#1F1E1D]" />
                  <span>Method: <strong className="text-[#1F1E1D] capitalize">{activeAnalysis.analysis_method?.replace("_", " ") || "Ollama"}</strong></span>
                  <span>•</span>
                  <span>Engine: <strong className="text-[#1F1E1D]">{activeAnalysis.model_name || "Rule-based Engine"}</strong></span>
                  {activeAnalysis.fallback_used && activeAnalysis.fallback_reason && (
                    <>
                      <span>•</span>
                      <span className="text-[#B07219] font-medium">Fallback Reason: {activeAnalysis.fallback_reason}</span>
                    </>
                  )}
                </div>
                <span>Prompt Version: {activeAnalysis.prompt_version}</span>
              </div>
            </>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  </div>
  );
}

export default function AIWorkAnalysisPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-xs font-bold text-[#8C827A]">Loading Work Analysis Workspace...</div>}>
      <WorkAnalysisContent />
    </Suspense>
  );
}
