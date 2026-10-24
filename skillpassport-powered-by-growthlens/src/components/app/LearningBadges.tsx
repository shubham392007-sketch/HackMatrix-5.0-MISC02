"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { StepStatus, TopicDifficulty } from "@/types/learning";
import {
  Lock,
  CheckCircle2,
  Clock,
  AlertTriangle,
  PlayCircle,
  BookOpen,
  GraduationCap,
  Sparkles,
  Info,
  Scale,
  X,
  Target,
  Layers,
  ArrowRight,
} from "lucide-react";

export function StepStatusBadge({ status }: { status: StepStatus }) {
  switch (status) {
    case "locked":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
          <Lock className="w-3 h-3 text-slate-500" /> Prereq Locked
        </span>
      );
    case "available":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-900 border border-sky-300">
          <BookOpen className="w-3 h-3 text-sky-700" /> Available
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
          <Clock className="w-3 h-3 text-amber-700" /> In Progress
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Completed
        </span>
      );
    case "needs_remediation":
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-900 border border-red-300">
          <AlertTriangle className="w-3 h-3 text-red-700" /> Needs Remediation
        </span>
      );
  }
}

export function TopicDifficultyBadge({ difficulty }: { difficulty: TopicDifficulty }) {
  switch (difficulty) {
    case "Beginner":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-emerald-100 text-emerald-950 border border-emerald-200">
          Beginner
        </span>
      );
    case "Intermediate":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-amber-100 text-amber-950 border border-amber-200">
          Intermediate
        </span>
      );
    case "Advanced":
      return (
        <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase bg-purple-100 text-purple-950 border border-purple-200">
          Advanced
        </span>
      );
  }
}

export function MasteryProgressBar({
  current,
  target,
  baseline,
  showLabels = true,
}: {
  current: number;
  target: number;
  baseline?: number;
  showLabels?: boolean;
}) {
  const isSatisfied = current >= target;

  return (
    <div className="space-y-1.5 w-full">
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-muted flex items-center gap-1">
            {baseline !== undefined && (
              <span className="text-[11px] font-mono text-ink-muted">
                Baseline: {baseline}% &rarr;{" "}
              </span>
            )}
            <span>Mastery:</span>{" "}
            <strong className="text-ink font-bold">{current}%</strong>
          </span>
          <span className="text-ink-muted">
            Target: <strong className="text-ink font-semibold">{target}%</strong>
          </span>
        </div>
      )}
      <div className="w-full bg-sand/30 rounded-full h-2.5 overflow-hidden p-0.5 border border-ink/10 relative">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isSatisfied ? "bg-emerald-500" : "bg-[#FAF8F5]"
          }`}
          style={{ width: `${Math.min(100, current)}%` }}
        />
        {/* Target tick line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-ink/60"
          style={{ left: `${target}%` }}
          title={`Target Mastery: ${target}%`}
        />
      </div>
    </div>
  );
}

export function ActiveDomainSelectorBar() {
  const { blueprints, activeDomainId, setActiveDomainId, activeBlueprint } =
    useEvidence();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/90 rounded-2xl border border-ink/10 shadow-sm text-xs">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-lime/40 border border-ink/20 flex items-center justify-center shrink-0">
          <GraduationCap className="w-4 h-4 text-ink" />
        </div>
        <div>
          <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">
            Active Learning Blueprint
          </span>
          <span className="font-bold text-ink text-sm">
            {activeBlueprint.title}{" "}
            <span className="text-xs font-normal text-ink-muted">
              ({activeBlueprint.version} &bull; {activeBlueprint.estimated_hours}h est)
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="domain-select" className="text-ink-muted font-medium shrink-0">
          Switch Domain:
        </label>
        <select
          id="domain-select"
          value={activeDomainId}
          onChange={(e) => setActiveDomainId(e.target.value)}
          className="pill-input text-xs py-1.5 px-3 bg-sand/20"
        >
          {blueprints.map((b) => (
            <option key={b.domain_id} value={b.domain_id}>
              {b.title} ({b.version})
            </option>
          ))}
        </select>
        <Link
          href={`/app/learning/domains/${activeDomainId}`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-1.5 px-3 shrink-0"
        >
          View Blueprint
        </Link>
      </div>
    </div>
  );
}

export function MasteryFormulaModal({
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
              Explainable Mastery Calculation
            </span>
            <h3 className="text-xl font-bold text-ink">
              The 4-Signal Mastery Engine
            </h3>
          </div>
        </div>

        <p className="text-xs text-ink/80 leading-relaxed">
          GrowthLens does not reward passive content viewing. Reading articles or watching videos alone cannot establish verified capability. Mastery is calculated deterministically across four distinct practical signals:
        </p>

        <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 space-y-1">
          <span className="font-bold text-ink block text-xs">
            Deterministic Mastery Formula
          </span>
          <code className="text-[12px] font-mono bg-white px-2.5 py-1 rounded border border-ink/10 block my-1">
            Mastery = 0.30 &times; Knowledge + 0.25 &times; Practice + 0.20 &times; Assessment + 0.25 &times; Project
          </code>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">1. Knowledge Signal (30%)</span>
            <p className="text-[11px] text-ink-muted">
              Evaluated via targeted diagnostic checks and in-packet concept questions.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">2. Practice Signal (25%)</span>
            <p className="text-[11px] text-ink-muted">
              Demonstrated through objective-specific exercises, syntax completion, and scenario analysis.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">3. Assessment Signal (20%)</span>
            <p className="text-[11px] text-ink-muted">
              Formative evaluation assessing both conceptual understanding and applied problem-solving.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="font-bold text-ink block">4. Mini-Project Signal (25%)</span>
            <p className="text-[11px] text-ink-muted">
              Tangible code deliverable evaluated against an explicit rubric. Produces candidate evidence.
            </p>
          </div>
        </div>

        {/* Regulatory note */}
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 text-amber-800 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Critical Boundary:</strong> Achieving 100% learning mastery proves curriculum completion, but does <em>not</em> automatically mark your professional Skill Passport as verified. Deliverables must be submitted to the Verification Center for human review.
          </p>
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
