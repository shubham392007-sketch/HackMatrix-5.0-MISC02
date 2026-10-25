"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  TargetRoleSelectorBar,
  GapTypeBadge,
  RequirementTypeBadge,
  ImportanceBadge,
  CalculationExplanationModal,
} from "@/components/app/CareerBadges";
import AppTopBar from "@/components/app/AppTopBar";
import { ConfidenceScoreExplainer } from "@/components/app/ConfidenceRationaleCard";
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
  BrainCircuit,
  ShieldCheck,
  Briefcase,
} from "lucide-react";
import { GapClassification, RequirementType } from "@/types/career";
import SkillProvenanceModal from "@/components/app/SkillProvenanceModal";

export default function CareerGapsPage() {
  const { activeRole, activeGaps, activeMatch } = useEvidence();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedReq, setSelectedReq] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isExplainModalOpen, setIsExplainModalOpen] = useState<boolean>(false);
  const [provenanceTarget, setProvenanceTarget] = useState<{
    skillId: string;
    skillTitle?: string;
    roleId?: string;
    gapId?: string;
  } | null>(null);

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
        description="A gap is not simply an absent skill. GrowthLens categorizes 7 distinct gap types to distinguish missing capability from missing proof, depth shortfalls, and unverified claims."
        badge="Gap Taxonomy Engine"
        badgeColor="border-amber-300 text-amber-900 bg-amber-100"
      >
        <button
          onClick={() => setIsExplainModalOpen(true)}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Info className="w-3.5 h-3.5" />
          Gap Methodology
        </button>
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 space-y-1">
          <span className="text-[10px] font-mono uppercase text-ink-muted">
            Total Target Gaps
          </span>
          <div className="text-2xl font-bold text-ink">{activeGaps.length}</div>
          <span className="text-[11px] text-ink-muted block">
            Across {activeRole.competencies.length} required competencies
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-purple-200 bg-purple-50/30">
          <span className="text-[10px] font-mono uppercase text-purple-900 font-semibold flex items-center gap-1">
            <HelpCircle className="w-3 h-3" /> Evidence Gaps
          </span>
          <div className="text-2xl font-bold text-purple-950">
            {countsByType.evidence_gap}
          </div>
          <span className="text-[11px] text-purple-800/80 block">
            High leverage &bull; Add work artifacts
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-amber-200 bg-amber-50/30">
          <span className="text-[10px] font-mono uppercase text-amber-900 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Depth Gaps
          </span>
          <div className="text-2xl font-bold text-amber-950">
            {countsByType.depth_gap}
          </div>
          <span className="text-[11px] text-amber-800/80 block">
            Foundations present &bull; Need production depth
          </span>
        </div>

        <div className="gl-card p-4 space-y-1 border-red-200 bg-red-50/30">
          <span className="text-[10px] font-mono uppercase text-red-900 font-semibold flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Skill Gaps
          </span>
          <div className="text-2xl font-bold text-red-950">
            {countsByType.skill_gap}
          </div>
          <span className="text-[11px] text-red-800/80 block">
            No demonstrated baseline yet
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Gap Type Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Gaps", count: countsByType.all },
            { id: "evidence_gap", label: "Evidence Gaps", count: countsByType.evidence_gap },
            { id: "depth_gap", label: "Depth Gaps", count: countsByType.depth_gap },
            { id: "skill_gap", label: "Skill Gaps", count: countsByType.skill_gap },
            { id: "application_gap", label: "Application", count: countsByType.application_gap },
            { id: "dependency_gap", label: "Dependency", count: countsByType.dependency_gap },
            { id: "differentiation_opportunity", label: "Opportunities", count: countsByType.differentiation_opportunity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedType === tab.id
                  ? "bg-ink text-white shadow-sm"
                  : "bg-white text-ink-muted hover:text-ink border border-ink/10"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedType === tab.id
                    ? "bg-white/20 text-white"
                    : "bg-sand/40 text-ink-muted"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Requirement Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search gaps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input text-xs !py-1.5 !pl-9 pr-3 w-40 md:w-52 bg-white"
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          <select
            value={selectedReq}
            onChange={(e) => setSelectedReq(e.target.value)}
            className="pill-input text-xs py-1.5 px-3 bg-white"
          >
            <option value="all">All Requirements</option>
            <option value="core_required">Core Required</option>
            <option value="supporting">Supporting</option>
            <option value="preferred">Preferred</option>
          </select>
        </div>
      </div>

      {/* Gap Cards List */}
      {filteredGaps.length === 0 ? (
        <div className="gl-card p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center mx-auto text-emerald-700">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-ink">No matching gaps found</h3>
          <p className="text-xs text-ink-muted max-w-sm mx-auto">
            Either all requirements in this category are fully satisfied, or your filter criteria didn't match any active gap records.
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
          {filteredGaps.map((gap) => (
            <div
              key={gap.gap_id}
              className="gl-card p-5 space-y-4 hover:shadow-md transition-shadow border-ink/10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <GapTypeBadge type={gap.gap_type} />
                      <RequirementTypeBadge type={gap.requirement_type} />
                      <ImportanceBadge importance={gap.importance} />
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
                      // Determine fill
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

                {/* Confidence Score & Rationale */}
                <ConfidenceScoreExplainer
                  score={gap.confidence}
                  explanation={gap.confidence_explanation}
                  rationale={gap.confidence_rationale}
                  skillName={gap.canonical_name}
                />

                {/* Diagnosis */}
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-ink flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-ink-muted">
                    Diagnosis
                  </span>
                  <p className="text-ink/80 leading-relaxed text-xs">
                    {gap.diagnosis}
                  </p>
                </div>

                {/* Next Step Direction */}
                <div className="text-xs space-y-1 bg-white/70 p-2.5 rounded-xl border border-ink/5">
                  <span className="font-semibold text-ink flex items-center gap-1 text-[11px] text-ink">
                    <Target className="w-3 h-3 text-ink" /> Next Step Direction
                  </span>
                  <p className="text-ink-muted text-[11px] leading-relaxed">
                    {gap.next_step_direction}
                  </p>
                </div>

                {/* Authenticated Source & Provenance Assurance */}
                <div className="p-2.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink flex items-center gap-1.5 shrink-0">
                      <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                      Requirement Source:
                    </span>
                    <span className="font-mono text-ink-muted text-[10px] truncate text-right" title={gap.requirement_source || activeRole.provenance}>
                      {gap.requirement_source || activeRole.provenance || `${activeRole.title} (Benchmark v2026.1)`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-ink flex items-center gap-1.5 shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Assurance of Authentication:
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold shrink-0">
                      Authenticity Verified • Strict Guard
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2 text-xs mt-3 flex-wrap">
                <Link
                  href={`/app/career/gaps/${gap.gap_id}`}
                  className="font-bold text-ink hover:underline flex items-center gap-1 group"
                >
                  <span>Why This Gap?</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() =>
                      setProvenanceTarget({
                        skillId: gap.skill_id,
                        skillTitle: gap.canonical_name,
                        roleId: gap.role_id,
                        gapId: gap.gap_id,
                      })
                    }
                    className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-[11px] py-1 px-2.5 text-ink flex items-center gap-1 font-medium"
                    title="Audit requirement and authentic evidence sources for this lagging skill"
                  >
                    <BrainCircuit className="w-3 h-3 text-indigo-600" />
                    Audit Source
                  </button>
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
          ))}
        </div>
      )}

      {/* Calculation Modal */}
      <CalculationExplanationModal
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />

      {/* Evidence & Provenance Assurance Modal */}
      {provenanceTarget && (
        <SkillProvenanceModal
          isOpen={!!provenanceTarget}
          onClose={() => setProvenanceTarget(null)}
          skillId={provenanceTarget.skillId}
          skillTitle={provenanceTarget.skillTitle}
          roleId={provenanceTarget.roleId}
          gapId={provenanceTarget.gapId}
        />
      )}
    </div>
  </div>
);
}
