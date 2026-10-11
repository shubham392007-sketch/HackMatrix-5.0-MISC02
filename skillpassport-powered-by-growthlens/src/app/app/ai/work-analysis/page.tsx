"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  AnalysisStatusBadge,
  DemoDataNotice,
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

export default function AIWorkAnalysisPage() {
  const {
    evidenceItems,
    workAnalyses,
    updateWorkAnalysis,
    addAIAuditEvent,
  } = useEvidence();

  const [selectedSourceId, setSelectedSourceId] = useState<string>(
    workAnalyses[0]?.source_id || "ev-01"
  );
  const [isSimulating, setIsSimulating] = useState(false);

  const selectedEvidence = evidenceItems.find((e) => e.id === selectedSourceId);
  const activeAnalysis = workAnalyses.find((a) => a.source_id === selectedSourceId);

  const handleSimulateAnalysis = () => {
    if (!activeAnalysis) return;
    setIsSimulating(true);

    setTimeout(() => {
      setIsSimulating(false);
      updateWorkAnalysis(activeAnalysis.analysis_id, {
        status: "completed",
        created_at: "Just now",
      });

      addAIAuditEvent({
        timestamp: "Just now",
        event_type: "analysis_completed",
        affected_entity_type: "source",
        affected_entity_id: activeAnalysis.source_id,
        new_state: "Analysis Completed",
        reason: `Re-analyzed work artifacts for ${selectedEvidence?.title || activeAnalysis.source_id}`,
        actor: "Ingestion Pipeline (Qwen-3 8B)",
        model_or_policy_version: activeAnalysis.model_version,
      });
    }, 1200);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/ai" className="hover:text-[#1F1E1D]">
              AI Intelligence
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Work Analysis</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            AI Work Analysis
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Inspect what was extracted from a source, which activities were identified, and where the supporting evidence comes from.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/app/ai/skill-extraction"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            Skill Extraction
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <DemoDataNotice />

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
              <AnalysisStatusBadge status={activeAnalysis.status} />
            )}
            <button
              onClick={handleSimulateAnalysis}
              disabled={isSimulating}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? "animate-spin" : ""}`} />
              {isSimulating ? "Analyzing..." : "Analyze Work"}
            </button>
          </div>
        </div>
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

              {/* Section 4: Key Findings & Uncertainty Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="gl-card p-5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                    Key Findings Summary
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#5A5550]">
                    {activeAnalysis.key_findings.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#2E6941] mt-1.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="gl-card p-5 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#B07219] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Uncertainty Flags
                  </span>
                  {activeAnalysis.uncertainty_flags.length === 0 ? (
                    <p className="text-xs text-[#8C827A] italic">No uncertainty flags detected.</p>
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
                  <span>Model: <strong className="text-[#1F1E1D]">{activeAnalysis.model_name}</strong></span>
                  <span>•</span>
                  <span>Version: {activeAnalysis.model_version}</span>
                </div>
                <span>Prompt Version: {activeAnalysis.prompt_version}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
