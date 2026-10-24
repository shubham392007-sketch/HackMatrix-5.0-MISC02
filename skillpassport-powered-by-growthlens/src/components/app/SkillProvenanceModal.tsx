"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  X,
  ShieldCheck,
  BrainCircuit,
  FileCheck2,
  FileQuestion,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  GitCommit,
  FileText,
  Briefcase,
  Award,
  Layers,
  ArrowRight,
  Info,
  Calendar,
  Sparkles,
  CheckCircle2,
  Database,
  Cpu,
} from "lucide-react";
import {
  SkillGapAssessment,
  RequirementSourceRef,
  UserEvidenceSourceRef,
  EvidenceSufficiencyType,
} from "@/types/learning";
import { getSkillGapProvenance, evaluateSkillGapProvenance } from "@/lib/evidenceApi";

interface SkillProvenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillId: string;
  skillTitle?: string;
  roleId?: string;
  gapId?: string;
  roadmapId?: string;
  roadmapPathId?: string;
}

export function SufficiencyBadge({ type }: { type: EvidenceSufficiencyType }) {
  switch (type) {
    case "verified_skill_gap":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          Verified Skill Gap
        </span>
      );
    case "evidence_gap":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
          <FileQuestion className="w-3.5 h-3.5 text-sky-500" />
          Evidence Gap (Unconfirmed Deficiency)
        </span>
      );
    case "conflicting_evidence":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Conflicting Evidence
        </span>
      );
    case "verified_learning_need":
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          Verified Learning Target
        </span>
      );
    case "awaiting_analysis":
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Info className="w-3.5 h-3.5 text-slate-500" />
          Awaiting Analysis
        </span>
      );
  }
}

export function ProviderIcon({ provider }: { provider: string }) {
  const p = provider.toLowerCase();
  if (p.includes("github") || p.includes("commit") || p.includes("repo")) {
    return <GitCommit className="w-4 h-4 text-slate-700" />;
  }
  if (p.includes("document") || p.includes("pdf") || p.includes("upload")) {
    return <FileText className="w-4 h-4 text-blue-600" />;
  }
  if (p.includes("jira") || p.includes("ticket")) {
    return <Briefcase className="w-4 h-4 text-indigo-600" />;
  }
  if (p.includes("assessment") || p.includes("quiz")) {
    return <Award className="w-4 h-4 text-emerald-600" />;
  }
  return <Database className="w-4 h-4 text-slate-500" />;
}

export default function SkillProvenanceModal({
  isOpen,
  onClose,
  skillId,
  skillTitle,
  roleId,
  gapId,
  roadmapId,
  roadmapPathId,
}: SkillProvenanceModalProps) {
  const [assessment, setAssessment] = useState<SkillGapAssessment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "requirements" | "evidence" | "audit">("overview");

  // Load provenance data when modal opens
  useEffect(() => {
    if (!isOpen || !skillId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getSkillGapProvenance(skillId, roleId, gapId, false)
      .then((data: SkillGapAssessment) => {
        if (isMounted) {
          setAssessment(data);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          setError(err.message || "Failed to load skill provenance explanation");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, skillId, roleId, gapId]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleForceRefresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await evaluateSkillGapProvenance({
        skill_id: skillId,
        target_role_id: roleId,
        gap_id: gapId,
        force_refresh: true,
      });
      setAssessment(fresh);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to re-evaluate skill with AI");
    } finally {
      setRefreshing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                <BrainCircuit className="w-3.5 h-3.5" />
                Evidence Provenance Audit
              </span>
              {assessment && <SufficiencyBadge type={assessment.evidence_sufficiency} />}
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {assessment?.canonical_name || skillTitle || skillId}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Target Role:{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {assessment?.target_role_title || "Target Career Alignment"}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleForceRefresh}
              disabled={refreshing || loading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Re-run assessment with AI engine"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 text-sm font-medium">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3 border-b-2 transition-colors ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            Overview &amp; Rationale
          </button>
          <button
            onClick={() => setActiveTab("requirements")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "requirements"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Layers className="w-4 h-4" />
            Role Requirements
            {assessment?.requirement_sources?.length ? (
              <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600">
                {assessment.requirement_sources.length}
              </span>
            ) : null}
          </button>
          <button
            onClick={() => setActiveTab("evidence")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "evidence"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            User Evidence
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full text-slate-600">
              {(assessment?.supporting_evidence?.length || 0) + (assessment?.contradicting_evidence?.length || 0)}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === "audit"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
            }`}
          >
            <Cpu className="w-4 h-4" />
            Engine &amp; AI Provenance
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-sm text-slate-500">Auditing authentic evidence and role criteria...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Assessment Retrieval Error
              </div>
              <p className="text-sm">{error}</p>
            </div>
          ) : assessment ? (
            <>
              {/* TAB: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Assurance of Authentication Certificate */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 via-white to-indigo-50/50 dark:from-emerald-950/30 dark:via-slate-900 dark:to-indigo-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                          Assurance of Authentication
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 font-semibold border border-emerald-300 dark:border-emerald-700">
                          Verified Authentic Source &bull; Zero Hallucination
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        Every role requirement and evidence artifact shown in this audit is authenticated against verified benchmarks and genuine tenant-isolated source records. The anti-hallucination citation guard strictly prevents fabricated citations.
                      </p>
                      <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 pt-1">
                        <span>Engine: <strong>{assessment.ai_provider} ({assessment.ai_model})</strong></span>
                        <span>&bull;</span>
                        <span>Citation Guard: <strong>{assessment.validation_status.toUpperCase()}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Proficiency Level Comparison Bar */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        Role Requirement
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                        {assessment.required_proficiency}
                      </p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        Demonstrated Level
                      </span>
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {assessment.current_proficiency}
                      </p>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                        Proficiency Distance
                      </span>
                      <p className="text-lg font-bold text-slate-800 dark:text-white mt-1">
                        {assessment.proficiency_distance} Tier{assessment.proficiency_distance === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  {/* Sufficiency Explanation Notice */}
                  {assessment.evidence_sufficiency === "evidence_gap" && (
                    <div className="p-4 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-200 text-sm space-y-1">
                      <div className="flex items-center gap-2 font-bold text-sky-800 dark:text-sky-300">
                        <FileQuestion className="w-4 h-4 text-sky-600" />
                        Evidence Gap Identified
                      </div>
                      <p className="text-xs leading-relaxed">
                        This skill was marked lagging because there are insufficient verified artifacts in your Evidence
                        Workspace to confirm the required mastery. This is not a confirmed deficit; completing the Learn &amp; Grow
                        roadmap will produce verifiable evidence artifacts for your passport.
                      </p>
                    </div>
                  )}

                  {/* AI Assessment Rationale */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      Assessment Rationale &amp; Gap Analysis
                    </h3>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-sm leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                      {assessment.assessment_rationale}
                    </div>
                  </div>

                  {/* Evidence Snapshot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Requirement Sources
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {assessment.requirement_sources.length} sources
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Derived from authoritative role demand models and target job descriptions.
                      </p>
                      <button
                        onClick={() => setActiveTab("requirements")}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2"
                      >
                        Inspect Requirement Criteria <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Demonstrated Evidence
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {assessment.supporting_evidence.length} items
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Evaluated from your connected GitHub commits, documents, and past assessments.
                      </p>
                      <button
                        onClick={() => setActiveTab("evidence")}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2"
                      >
                        Inspect Evidence Items <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: REQUIREMENTS */}
              {activeTab === "requirements" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Authoritative Role Expectations
                      </h3>
                      <p className="text-xs text-slate-500">
                        Concrete criteria demanding proficiency in {assessment.canonical_name}.
                      </p>
                    </div>
                    <span className="text-xs font-mono bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Target: {assessment.required_proficiency}
                    </span>
                  </div>

                  {assessment.requirement_sources.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                      No explicit role specification criteria linked. Derived from baseline taxonomy standards.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assessment.requirement_sources.map((req: RequirementSourceRef, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              <Briefcase className="w-3 h-3 text-slate-500" />
                              {req.source_type.replace(/_/g, " ").toUpperCase()}
                            </span>
                            {req.source_url && (
                              <a
                                href={req.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                              >
                                View Job Spec <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>

                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {req.title}
                          </h4>

                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            {req.requirement}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>Ref: {req.source_reference}</span>
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              Authenticated Role Spec
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB: EVIDENCE */}
              {activeTab === "evidence" && (
                <div className="space-y-6">
                  {/* Supporting Evidence */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Demonstrated User Artifacts ({assessment.supporting_evidence.length})
                      </h3>
                      <span className="text-xs text-slate-500">Filtered to authorized user records</span>
                    </div>

                    {assessment.supporting_evidence.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        No supporting artifacts currently exist in your Evidence Workspace for this competency.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {assessment.supporting_evidence.map((item: UserEvidenceSourceRef) => (
                          <div
                            key={item.evidence_id}
                            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="p-1 rounded bg-slate-100 dark:bg-slate-800">
                                  <ProviderIcon provider={item.provider} />
                                </span>
                                <span className="text-xs font-semibold capitalize text-slate-700 dark:text-slate-300">
                                  {item.provider} &bull; {item.source_type}
                                </span>
                                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {item.verification_status}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                  Authenticated Artifact
                                </span>
                              </div>

                              {item.source_url && (
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                                >
                                  Source Link <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>

                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>

                            <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                              &ldquo;{item.excerpt}&rdquo;
                            </p>

                            <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                              <span>Strength: {item.evidence_strength} ({Math.round(item.extraction_confidence * 100)}% conf)</span>
                              {item.observed_date && <span>Observed: {new Date(item.observed_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contradicting Evidence */}
                  {assessment.contradicting_evidence.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          Contradicting Artifacts ({assessment.contradicting_evidence.length})
                        </h3>
                        <span className="text-xs text-amber-600">Items indicating deficits or failed evaluations</span>
                      </div>

                      <div className="space-y-3">
                        {assessment.contradicting_evidence.map((item: UserEvidenceSourceRef) => (
                          <div
                            key={item.evidence_id}
                            className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold capitalize text-amber-800 dark:text-amber-300">
                                {item.provider} &bull; {item.title}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                Contradiction
                              </span>
                            </div>

                            <p className="text-xs text-amber-900 dark:text-amber-200 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900">
                              {item.contradiction_reason || item.excerpt}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: AUDIT & AI PROVENANCE */}
              {activeTab === "audit" && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          Inference Engine Provenance
                        </h4>
                      </div>
                      <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {assessment.ai_provider}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Model Identity</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {assessment.ai_model}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Anti-Hallucination Status</span>
                        <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase">
                          {assessment.validation_status} (Strict Citation Guard)
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Prompt Contract Version</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {assessment.prompt_version}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="text-slate-400 block mb-0.5">Analysis Run ID</span>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                          {assessment.analysis_run_id}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Anti-Hallucination Integrity Verification
                    </div>
                    <p>
                      Every cited evidence UUID in this report is strictly validated against the authenticated user&apos;s
                      authorized evidence tables. Any citation outside the user&apos;s genuine evidence set is rejected
                      by the backend validation layer before persistence.
                    </p>
                    <div className="pt-2 text-[11px] text-slate-400 font-mono">
                      Timestamp: {new Date(assessment.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {(assessment?.roadmap_path_id || roadmapPathId) && (
              <Link
                href={`/app/learning/roadmaps/${encodeURIComponent(assessment?.roadmap_path_id || roadmapPathId || "active")}`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
              >
                Open Personalized Roadmap <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
