"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
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
} from "lucide-react";

function WorkAnalysisContent() {
  const {
    evidenceItems,
    workAnalyses,
    addAIAuditEvent,
    refreshEvidenceData,
  } = useEvidence();

  const searchParams = useSearchParams();
  const evidenceIdParam = searchParams.get("evidence_id") || searchParams.get("source_id");

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    evidenceIdParam || workAnalyses[0]?.source_id || evidenceItems[0]?.id || ""
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  React.useEffect(() => {
    if (evidenceIdParam && evidenceItems.some((e) => e.id === evidenceIdParam)) {
      setSelectedSourceId(evidenceIdParam);
    } else if (!selectedSourceId && evidenceItems.length > 0) {
      setSelectedSourceId(evidenceItems[0].id);
    }
  }, [evidenceIdParam, evidenceItems, selectedSourceId]);

  const selectedEvidence = evidenceItems.find((e) => e.id === selectedSourceId);
  const activeAnalysis = workAnalyses.find((a) => a.source_id === selectedSourceId);

  const handleRunAnalysis = async () => {
    if (!selectedSourceId) return;
    setIsSimulating(true);
    setAnalysisError(null);

    try {
      const { runWorkAnalysis } = await import("@/lib/evidenceApi");
      const res = await runWorkAnalysis([selectedSourceId]);
      await refreshEvidenceData();

      const itemResult = res?.analyses?.[0];
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">
                  Ingested Source:
                </span>
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer font-medium"
                >
                  {evidenceItems.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.sourceType.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                {activeAnalysis && (
                  <div className="flex items-center gap-2">
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
          {!activeAnalysis ? (
            <div className="gl-card p-12 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-[#8C827A] mx-auto" />
              <h3 className="text-base font-bold text-[#1F1E1D]">
                No Analysis Generated Yet
              </h3>
              <p className="text-xs text-[#8C827A] max-w-sm mx-auto">
                Click &ldquo;Analyze Work&rdquo; above to run the simulated extraction pipeline on this source artifact.
              </p>
            </div>
          ) : (
            <>
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
                      <p className="text-[11px] font-mono bg-white p-2 rounded-lg text-[#5A5550] border border-[#EAE4D8] overflow-x-auto">
                        &ldquo;{fact.excerpt}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
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
