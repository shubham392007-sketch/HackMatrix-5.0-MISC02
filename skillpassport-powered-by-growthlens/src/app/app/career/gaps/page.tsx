"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  GapExplanationTypeBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  AlertTriangle,
  HelpCircle,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Info,
  CheckCircle2,
  FileText,
  Compass,
  TrendingUp,
  Target,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Upload,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  Cpu,
} from "lucide-react";
import { GapClassification, RequirementType, GapExplanation, GapExplanationsResponse } from "@/types/career";
import { getGapExplanations } from "@/lib/careerApi";

export default function CareerGapsPage() {
  const { activeRole, activeGaps, activeMatch } = useEvidence();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedReq, setSelectedReq] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);

  // Ollama Evidence-Based "Why" Explanations State
  const [explanations, setExplanations] = useState<Record<string, GapExplanation>>({});
  const [isLoadingExplanations, setIsLoadingExplanations] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [explanationMeta, setExplanationMeta] = useState<{
    fromCache: boolean;
    modelUsed: string;
    analysisVersion: string;
    generatedAt: string;
  } | null>(null);
  const [expandedGapIds, setExpandedGapIds] = useState<Set<string>>(new Set());

  // Fetch gap explanations for active role
  const fetchExplanations = useCallback(
    async (roleId: string, forceRefresh: boolean = false) => {
      if (!roleId) return;
      if (forceRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoadingExplanations(true);
      }
      try {
        const res: GapExplanationsResponse = await getGapExplanations(roleId, forceRefresh);
        if (res && res.explanations) {
          setExplanations(res.explanations);
          setExplanationMeta({
            fromCache: res.from_cache,
            modelUsed: res.model_used,
            analysisVersion: res.analysis_version,
            generatedAt: res.generated_at,
          });
        }
      } catch (err) {
        console.warn("Could not fetch evidence-based gap explanations:", err);
      } finally {
        setIsLoadingExplanations(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeRole?.role_id) {
      fetchExplanations(activeRole.role_id, false);
    } else {
      setExplanations({});
      setExplanationMeta(null);
    }
  }, [activeRole?.role_id, fetchExplanations]);

  const toggleExpandGap = (gapId: string) => {
    setExpandedGapIds((prev) => {
      const next = new Set(prev);
      if (next.has(gapId)) {
        next.delete(gapId);
      } else {
        next.add(gapId);
      }
      return next;
    });
  };

  // Group counts
  const countsByType = useMemo(() => {
    const counts: Record<string, number> = {
      all: activeGaps.length,
      skill_gap: 0,
      depth_gap: 0,
      evidence_gap: 0,
      application_gap: 0,
      dependency_gap: 0,
      differentiation_opportunity: 0,
      freshness_gap: 0,
    };
    activeGaps.forEach((g) => {
      if (counts[g.gap_type] !== undefined) {
        counts[g.gap_type]++;
      }
    });
    return counts;
  }, [activeGaps]);

  const filteredGaps = useMemo(() => {
    return activeGaps.filter((gap) => {
      const matchesType =
        selectedType === "all" || gap.gap_type === selectedType;
      const matchesReq =
        selectedReq === "all" || gap.requirement_type === selectedReq;
      const matchesSearch =
        gap.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        gap.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesReq && matchesSearch;
    });
  }, [activeGaps, selectedType, selectedReq, searchQuery]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Skill Gap Analysis"
        description="Every gap explains exactly why the requirement did not achieve 100% proficiency coverage, comparing real job requirements against candidate Skill Intelligence assessments and supporting evidence."
        badge="Evidence-Based Analysis"
        badgeColor="border-amber-300 text-amber-900 bg-amber-100"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Gap Methodology
        </button>
        {activeRole && (
          <button
            onClick={() => fetchExplanations(activeRole.role_id, true)}
            disabled={isRefreshing || isLoadingExplanations}
            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5 disabled:opacity-50"
            title="Re-run Ollama evidence analysis"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
            {isRefreshing ? "Analyzing..." : "Re-Analyze Gaps"}
          </button>
        )}
        <Link
          href="/app/career/priorities"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          View Prioritization →
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Target Role Selector */}
      <TargetRoleSelectorBar />

      {/* Evidence-Grounding Engine Banner */}
      {explanationMeta && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/40 text-xs text-ink/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-400/20 border border-amber-400/40 flex items-center justify-center shrink-0">
              <Cpu className="w-4 h-4 text-amber-800" />
            </div>
            <div>
              <span className="font-semibold text-ink">
                Ollama Evidence Analyst ({explanationMeta.modelUsed})
              </span>
              <span className="text-ink-muted block text-[11px]">
                {explanationMeta.fromCache
                  ? "Serving authoritative cached gap diagnosis • Invalided on evidence or snapshot update"
                  : "Fresh multi-artifact reasoning synthesized across active Skill Passport evidence"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-sand/30 border border-ink/10 text-ink-muted">
              {explanationMeta.fromCache ? "Snapshot Cache" : "Live Inference"}
            </span>
            <span className="font-mono text-[10px] text-ink-muted">
              {explanationMeta.analysisVersion}
            </span>
          </div>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted">
            Total Target Gaps
          </span>
          <div className="text-2xl font-bold text-ink">{activeGaps.length}</div>
          <span className="text-[11px] text-ink-muted block">
            Across {activeRole?.competencies.length || 0} required competencies
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-purple-200 bg-purple-50/30">
          <span className="text-[10px] font-mono uppercase text-purple-900 font-semibold flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Evidence Gaps
          </span>
          <div className="text-2xl font-bold text-purple-900">
            {countsByType.evidence_gap}
          </div>
          <span className="text-[11px] text-purple-800/80 block">
            Claimed but uncorroborated
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-amber-200 bg-amber-50/30">
          <span className="text-[10px] font-mono uppercase text-amber-900 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Depth Shortfalls
          </span>
          <div className="text-2xl font-bold text-amber-900">
            {countsByType.depth_gap}
          </div>
          <span className="text-[11px] text-amber-800/80 block">
            Below required proficiency level
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-red-200 bg-red-50/30">
          <span className="text-[10px] font-mono uppercase text-red-900 font-semibold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Missing Capabilities
          </span>
          <div className="text-2xl font-bold text-red-900">
            {countsByType.skill_gap}
          </div>
          <span className="text-[11px] text-red-800/80 block">
            Zero recorded evidence
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gl-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Filter by skill name or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-ink/15 text-xs bg-white text-ink placeholder:text-ink-muted focus:outline-none focus:ring-1 focus:ring-ink"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-ink-muted font-mono">
              <Filter className="w-3.5 h-3.5" />
              <span>Classification:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-ink/15 bg-white text-ink focus:outline-none"
            >
              <option value="all">All Gaps ({activeGaps.length})</option>
              <option value="skill_gap">Skill Gaps ({countsByType.skill_gap})</option>
              <option value="depth_gap">Depth Gaps ({countsByType.depth_gap})</option>
              <option value="evidence_gap">Evidence Gaps ({countsByType.evidence_gap})</option>
              <option value="dependency_gap">Dependency Gaps ({countsByType.dependency_gap})</option>
              <option value="differentiation_opportunity">
                Differentiators ({countsByType.differentiation_opportunity})
              </option>
            </select>

            <select
              value={selectedReq}
              onChange={(e) => setSelectedReq(e.target.value)}
              className="text-xs py-1.5 px-2.5 rounded-xl border border-ink/15 bg-white text-ink focus:outline-none"
            >
              <option value="all">All Requirement Types</option>
              <option value="core_required">Core Required</option>
              <option value="supporting">Supporting</option>
              <option value="preferred">Preferred</option>
              <option value="differentiating">Differentiating</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gaps List / Grid */}
      {filteredGaps.length === 0 ? (
        <div className="gl-card p-12 text-center space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
          <h3 className="text-base font-bold text-ink">No matching gaps found</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            {activeGaps.length === 0
              ? "Select an active target role to evaluate real skill gaps, or all competencies meet 100% requirements."
              : "Try adjusting your search query or category filters."}
          </p>
          <button
            onClick={() => {
              setSelectedType("all");
              setSelectedReq("all");
              setSearchQuery("");
            }}
            className="pill-btn bg-white border border-ink/20 text-xs py-1.5 px-4"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGaps.map((gap) => {
            const explanation = explanations[gap.skill_id];
            const isExpanded = expandedGapIds.has(gap.gap_id);

            return (
              <div
                key={gap.gap_id}
                className={`gl-card p-5 space-y-4 hover:shadow-md transition-all border-ink/10 flex flex-col justify-between ${
                  isExpanded ? "ring-2 ring-amber-400/50 bg-amber-500/[0.02]" : ""
                }`}
              >
                <div className="space-y-3">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <GapTypeBadge type={gap.gap_type} />
                        <RequirementTypeBadge type={gap.requirement_type} />
                        <ImportanceBadge importance={gap.importance} />
                        {explanation && (
                          <GapExplanationTypeBadge type={explanation.gap_type} />
                        )}
                      </div>
                      <h3 className="text-base font-bold text-ink mt-1">
                        {gap.canonical_name}
                      </h3>
                      <span className="text-[10px] font-mono text-ink-muted">
                        ID: {gap.skill_id}
                      </span>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-ink-muted block uppercase">
                        Priority Rank
                      </span>
                      <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-lime/40 text-ink border border-ink/15 inline-block">
                        #{gap.priority_rank} ({gap.priority_score.toFixed(1)})
                      </span>
                    </div>
                  </div>

                  {/* Level Distance Indicator */}
                  <div className="p-3 rounded-xl bg-sand/20 border border-ink/10 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-muted">
                        Supported:{" "}
                        <strong className="text-ink font-semibold">
                          {gap.current_supported_level}
                        </strong>{" "}
                        <span className="text-[10px] text-ink-muted">
                          ({gap.verification_status})
                        </span>
                      </span>
                      <span className="text-ink-muted">
                        Expected:{" "}
                        <strong className="text-ink font-semibold">
                          {gap.expected_level}
                        </strong>
                      </span>
                    </div>

                    {/* Level Steps Bar */}
                    <div className="grid grid-cols-5 gap-1.5 h-2">
                      {[1, 2, 3, 4, 5].map((step) => {
                        const isCurrent =
                          step <=
                          (gap.current_supported_level === "Expert"
                            ? 5
                            : gap.current_supported_level === "Advanced"
                            ? 4
                            : gap.current_supported_level === "Practitioner"
                            ? 3
                            : gap.current_supported_level === "Working"
                            ? 2
                            : gap.current_supported_level === "Foundation"
                            ? 1
                            : 0);
                        const isExpected =
                          step <=
                          (gap.expected_level === "Expert"
                            ? 5
                            : gap.expected_level === "Advanced"
                            ? 4
                            : gap.expected_level === "Practitioner"
                            ? 3
                            : gap.expected_level === "Working"
                            ? 2
                            : gap.expected_level === "Foundation"
                            ? 1
                            : 0);

                        let bgClass = "bg-sand/40";
                        if (isCurrent) {
                          bgClass = "bg-emerald-500";
                        } else if (isExpected) {
                          bgClass = "bg-amber-400";
                        }

                        return (
                          <div
                            key={step}
                            className={`rounded-full ${bgClass}`}
                            title={`Level ${step}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div className="text-xs space-y-1">
                    <span className="font-semibold text-ink flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-ink-muted">
                      Diagnosis
                    </span>
                    <p className="text-ink/80 leading-relaxed text-xs">
                      {gap.diagnosis}
                    </p>
                  </div>

                  {/* Interactive "Why isn't this 100%?" Accordion Trigger */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => toggleExpandGap(gap.gap_id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-400/30 text-xs font-semibold text-amber-950 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                        <span>Why isn't this 100%?</span>
                        {explanation && (
                          <span className="text-[10px] font-normal font-mono text-amber-800">
                            ({explanation.gap_type.replace(/_/g, " ")})
                          </span>
                        )}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-amber-800" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-amber-800" />
                      )}
                    </button>
                  </div>

                  {/* Expandable Evidence-Based "Why" Analysis Drawer */}
                  {isExpanded && (
                    <div className="p-3.5 rounded-xl bg-white border border-amber-300/60 shadow-inner space-y-3.5 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
                      {isLoadingExplanations && !explanation ? (
                        <div className="py-4 text-center space-y-2 text-ink-muted">
                          <Cpu className="w-5 h-5 mx-auto animate-pulse text-amber-600" />
                          <p className="text-xs">Analyzing evidence artifacts with Ollama...</p>
                        </div>
                      ) : explanation ? (
                        <>
                          {/* 1. Requirement & Summary */}
                          <div className="space-y-1">
                            <span className="font-mono text-[10px] uppercase font-bold text-ink-muted block">
                              Requirement vs. Assessed State
                            </span>
                            <p className="text-ink font-medium leading-snug">
                              {explanation.summary}
                            </p>
                            <span className="text-[11px] text-ink-muted block mt-0.5">
                              <strong>Expected Capability:</strong> {explanation.required_capability}
                            </span>
                          </div>

                          {/* 2. What Your Evidence Demonstrates */}
                          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/60 space-y-1.5">
                            <span className="font-semibold text-emerald-950 text-[11px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> What your evidence demonstrates
                            </span>
                            {explanation.demonstrated_capabilities.length > 0 ? (
                              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900/90">
                                {explanation.demonstrated_capabilities.map((cap, idx) => (
                                  <li key={idx} className="leading-snug">{cap}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-emerald-800/80 italic">
                                Zero attributable work samples or verifiable repository artifacts currently recorded for this skill.
                              </p>
                            )}
                          </div>

                          {/* 3. Why the Match is Incomplete */}
                          <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 space-y-1.5">
                            <span className="font-semibold text-amber-950 text-[11px] flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-700" /> Why the match is incomplete
                            </span>
                            <p className="text-[11px] text-amber-900 leading-snug font-medium">
                              {explanation.specific_shortfall}
                            </p>
                            {explanation.evidence_limitations && (
                              <p className="text-[11px] text-amber-800/80 leading-snug pt-0.5 border-t border-amber-200/50">
                                <strong>Evidence Limitation:</strong> {explanation.evidence_limitations}
                              </p>
                            )}
                          </div>

                          {/* 4. Evidence Considered */}
                          <div className="space-y-1.5">
                            <span className="font-mono text-[10px] uppercase font-bold text-ink-muted flex items-center justify-between">
                              <span>Evidence Considered ({explanation.supporting_evidence_ids.length})</span>
                              <span className="text-[10px] font-normal">Confidence: {Math.round(explanation.reasoning_confidence * 100)}%</span>
                            </span>
                            {explanation.supporting_evidence_ids.length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {explanation.supporting_evidence_ids.map((eid) => (
                                  <Link
                                    key={eid}
                                    href="/app/evidence"
                                    className="pill-btn bg-sand/30 hover:bg-sand/60 text-[11px] py-1 px-2 text-ink flex items-center gap-1 border border-ink/10"
                                  >
                                    <FileText className="w-3 h-3 text-ink-muted" />
                                    <span>Artifact {eid.length > 8 ? eid.slice(0, 8) + '...' : eid}</span>
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[11px] text-ink-muted italic">
                                No linked Domain 1 artifacts available for this requirement.
                              </p>
                            )}
                          </div>

                          {/* 5. What to Do Next */}
                          <div className="p-2.5 rounded-lg bg-sand/30 border border-ink/10 space-y-1.5">
                            <span className="font-semibold text-ink text-[11px] flex items-center gap-1">
                              <Target className="w-3 h-3 text-ink" /> What to do next
                            </span>
                            <ul className="list-disc list-inside space-y-1 text-[11px] text-ink/80">
                              {explanation.recommended_next_actions.map((act, idx) => (
                                <li key={idx} className="leading-snug">{act}</li>
                              ))}
                            </ul>
                            <div className="flex items-center gap-2 pt-1 flex-wrap">
                              <Link
                                href="/app/sources"
                                className="pill-btn bg-white hover:bg-sand/20 border border-ink/20 text-[10px] py-1 px-2.5 text-ink flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3" /> Upload Attributable Proof
                              </Link>
                              <Link
                                href="/app/learn-and-grow"
                                className="pill-btn bg-white hover:bg-sand/20 border border-ink/20 text-[10px] py-1 px-2.5 text-ink flex items-center gap-1"
                              >
                                <BookOpen className="w-3 h-3" /> View Learning Roadmap
                              </Link>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2 text-ink-muted text-xs">
                          Detailed explanation not available.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next Step Direction */}
                  <div className="text-xs space-y-1 bg-white/70 p-2.5 rounded-xl border border-ink/5">
                    <span className="font-semibold text-ink flex items-center gap-1 text-[11px] text-ink">
                      <Target className="w-3 h-3 text-ink" /> Next Step Direction
                    </span>
                    <p className="text-ink-muted text-[11px] leading-relaxed">
                      {gap.next_step_direction}
                    </p>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2 text-xs mt-3">
                  <Link
                    href={`/app/career/gaps/${gap.gap_id}`}
                    className="font-bold text-ink hover:underline flex items-center gap-1 group"
                  >
                    <span>Forensic Details</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    {gap.relevant_evidence_ids.length > 0 && (
                      <Link
                        href="/app/evidence"
                        className="pill-btn bg-sand/20 hover:bg-sand/40 text-[11px] py-1 px-2.5 text-ink-muted flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        {gap.relevant_evidence_ids.length} Artifacts
                      </Link>
                    )}
                    <Link
                      href="/app/career/priorities"
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-[11px] py-1 px-2.5 text-ink"
                    >
                      Prioritize
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Calculation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />
      </div>
    </div>
  );
}
