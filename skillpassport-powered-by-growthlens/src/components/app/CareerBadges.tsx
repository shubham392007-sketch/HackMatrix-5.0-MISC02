"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  RequirementType,
  GapClassification,
  CompetencyMatchResult,
  ImportanceLevel,
  RoleDemandModel,
  GapExplanationType,
} from "@/types/career";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Compass,
  Briefcase,
  Layers,
  Scale,
  Globe,
  X,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";

export function RequirementTypeBadge({ type }: { type: RequirementType }) {
  switch (type) {
    case "core_required":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
          Core Required
        </span>
      );
    case "supporting":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300">
          Supporting
        </span>
      );
    case "preferred":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          Preferred
        </span>
      );
    case "differentiating":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
          Differentiating
        </span>
      );
  }
}

export function ImportanceBadge({ importance }: { importance: ImportanceLevel }) {
  switch (importance) {
    case "critical":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-red-200 text-red-950">
          Critical Importance
        </span>
      );
    case "high":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-amber-200 text-amber-950">
          High Importance
        </span>
      );
    case "medium":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-semibold uppercase bg-slate-200 text-slate-800">
          Medium
        </span>
      );
    case "low":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded text-ink-muted uppercase">
          Low
        </span>
      );
  }
}

export function GapTypeBadge({ type }: { type: GapClassification }) {
  switch (type) {
    case "skill_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
          <XCircle className="w-3 h-3" /> Skill Gap
        </span>
      );
    case "depth_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3" /> Depth Gap
        </span>
      );
    case "evidence_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
          <HelpCircle className="w-3 h-3" /> Evidence Gap
        </span>
      );
    case "application_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300">
          <Clock className="w-3 h-3" /> Application Gap
        </span>
      );
    case "dependency_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
          <Layers className="w-3 h-3" /> Dependency Gap
        </span>
      );
    case "differentiation_opportunity":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
          <Sparkles className="w-3 h-3" /> Differentiator
        </span>
      );
    case "freshness_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
          <Clock className="w-3 h-3" /> Freshness Gap
        </span>
      );
  }
}

export function GapExplanationTypeBadge({ type }: { type: GapExplanationType }) {
  switch (type) {
    case "genuine_proficiency_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-700" /> Genuine Proficiency Gap
        </span>
      );
    case "evidence_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
          <HelpCircle className="w-3 h-3 text-purple-700" /> Evidence Gap
        </span>
      );
    case "verification_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-300">
          <ShieldAlert className="w-3 h-3 text-blue-700" /> Verification Gap
        </span>
      );
    case "conflicting_evidence":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300">
          <Scale className="w-3 h-3 text-rose-700" /> Conflicting Evidence
        </span>
      );
    case "insufficient_data":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
          <XCircle className="w-3 h-3 text-slate-600" /> Insufficient Data
        </span>
      );
  }
}

export function MatchStatusBadge({
  status,
}: {
  status: CompetencyMatchResult["match_status"];
}) {
  switch (status) {
    case "strong_match":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Strong Match
        </span>
      );
    case "partial_match":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-700" /> Partial Match
        </span>
      );
    case "evidence_gap":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300">
          <HelpCircle className="w-3 h-3 text-purple-700" /> Evidence Gap
        </span>
      );
    case "missing_weak":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
          <XCircle className="w-3 h-3 text-red-700" /> Missing / Weak
        </span>
      );
    case "conflicting":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300">
          <ShieldAlert className="w-3 h-3 text-orange-700" /> Contradictory Evidence
        </span>
      );
  }
}

export function TargetRoleSelectorBar() {
  const { targetRoles, savedTargetRoles, catalogueRoles, selectedRoleId, setSelectedRoleId, activeRole } =
    useEvidence();

  const userTargets = savedTargetRoles && savedTargetRoles.length > 0 ? savedTargetRoles : [];
  const benchmarkRoles = catalogueRoles && catalogueRoles.length > 0 ? catalogueRoles : [];

  if (!activeRole) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 shadow-sm text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-200/60 border border-amber-300 flex items-center justify-center shrink-0">
            <Compass className="w-4 h-4 text-amber-900" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-amber-800 uppercase tracking-wider block">
              Active Target Role Model
            </span>
            <span className="font-bold text-amber-950 text-sm">
              No active target role selected
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/app/career/roles"
            className="pill-btn bg-ink hover:bg-ink/90 text-white text-xs py-1.5 px-3.5 shrink-0 flex items-center gap-1.5 font-bold shadow-sm"
          >
            <Compass className="w-3.5 h-3.5" />
            Select a Target Role
          </Link>
          <Link
            href="/app/career/discover"
            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-1.5 px-3 shrink-0"
          >
            Discover Jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/90 rounded-2xl border border-ink/10 shadow-sm text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-lime/40 border border-ink/20 flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4 text-ink" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">
            Active Target Role Model
          </span>
          <span className="font-bold text-ink text-sm">
            {activeRole.title}{" "}
            <span className="text-xs font-normal text-ink-muted">
              ({activeRole.seniority} &bull; {activeRole.version})
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label htmlFor="role-select" className="text-ink-muted font-medium shrink-0">
          Change Role:
        </label>
        <select
          id="role-select"
          value={selectedRoleId}
          onChange={(e) => setSelectedRoleId(e.target.value)}
          className="pill-input text-xs py-1.5 px-3 bg-sand/20"
        >
          {userTargets.length > 0 && (
            <optgroup label="My Selected Targets">
              {userTargets.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.title} — {r.seniority}
                </option>
              ))}
            </optgroup>
          )}
          {benchmarkRoles.length > 0 ? (
            <optgroup label="Industry Roles (Live Database)">
              {benchmarkRoles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.title} — {r.seniority}
                </option>
              ))}
            </optgroup>
          ) : targetRoles.length > 0 ? (
            <optgroup label="Industry Roles (Live Database)">
              {targetRoles.map((r) => (
                <option key={r.role_id} value={r.role_id}>
                  {r.title} — {r.seniority}
                </option>
              ))}
            </optgroup>
          ) : (
            <option disabled value="">Loading live roles...</option>
          )}
        </select>
        <Link
          href="/app/career/discover"
          className="pill-btn bg-lime/30 hover:bg-lime/60 border border-ink/20 text-ink text-xs py-1.5 px-3 shrink-0 flex items-center gap-1 font-medium"
        >
          <Globe className="w-3 h-3" />
          Discover Jobs
        </Link>
        <Link
          href="/app/career/roles"
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-1.5 px-3 shrink-0"
        >
          Manage Targets
        </Link>
      </div>
    </div>
  );
}

export function CalculationExplanationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-5 border-2 border-ink shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-ink-muted hover:text-ink p-1 rounded-full bg-sand/30"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-lime/40 border border-ink flex items-center justify-center">
            <Scale className="w-5 h-5 text-ink" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase text-ink-muted">
              Explainable Role Matching Formula
            </span>
            <h3 className="text-xl font-bold text-ink">How Match & Readiness Are Calculated</h3>
          </div>
        </div>

        <p className="text-xs text-ink/80 leading-relaxed">
          GrowthLens does not produce opaque machine learning similarity embeddings between resumes and job descriptions.
          Instead, we calculate an explicit, deterministic evaluation comparing your verified evidence state against versioned role demands.
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">1. Competency Maturity Distance</span>
            <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-ink/10 block my-1">
              raw_coverage = min(1.0, current_proficiency_numeric / expected_proficiency_numeric)
            </code>
            <p className="text-[11px] text-ink-muted">
              Evaluates demonstrated competency on a 5-point maturity scale (1: Foundation, 2: Working, 3: Practitioner, 4: Advanced, 5: Expert).
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">2. Verification State Weighting Discounts</span>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono mt-1">
              <div className="p-2 bg-white rounded border border-ink/5">
                <strong>Verified:</strong> 100% full credit
              </div>
              <div className="p-2 bg-white rounded border border-ink/5">
                <strong>Candidate:</strong> 55% discount factor
              </div>
              <div className="p-2 bg-white rounded border border-ink/5">
                <strong>Insufficient Ev:</strong> 20% uncertainty cap
              </div>
              <div className="p-2 bg-white rounded border border-ink/5">
                <strong>Conflicting:</strong> 35% dispute discount
              </div>
            </div>
            <p className="text-[11px] text-ink-muted mt-1">
              Unverified claims can never achieve full credit. High extraction confidence without attributable proof does not equal verification.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">3. Role Importance Hierarchy</span>
            <p className="text-[11px] text-ink-muted">
              Core Required requirements carry a 1.0 weight, Supporting competencies carry 0.6, Preferred carry 0.35, and Differentiating carry 0.20.
              Missing critical core skills heavily depresses readiness and triggers explicit Critical Blockers.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-sand/20 border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">4. Normalized Gap Prioritization (0–100 Scale)</span>
            <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-ink/10 block my-1">
              Priority = clamp((100 &times; Gap &times; Criticality &times; Urgency) &times; EffortDiscount &times; LeverageBoost, 1.0, 100.0)
            </code>
            <p className="text-[11px] text-ink-muted">
              Replaces unnormalized multiplicative scores (such as 1013.0) with an explainable, bounded percentage ranking based on strategic impact, required effort discount, and existing evidence leverage.
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-ink/10 flex justify-end">
          <button onClick={onClose} className="pill-btn pill-btn-primary text-xs py-2 px-6">
            Understood
          </button>
        </div>
      </div>
    </div>
  );
}
