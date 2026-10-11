"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  RotateCw,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
  Layers,
  Database,
  Sliders,
  Cpu,
  ShieldCheck,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { AIEvalCase } from "@/types/ai";
import {
  DemoDataNotice,
  DemoRoleSelector,
  RestrictedAccessCard,
} from "@/components/app/AIBadges";

export default function AIEvaluationDashboardPage() {
  const { currentRole, evalCases, addAIAuditEvent } = useEvidence();
  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    evalCases[0]?.case_id || "eval-01"
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isRunningSuite, setIsRunningSuite] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedCase =
    evalCases.find((c) => c.case_id === selectedCaseId) || evalCases[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Admin role check
  const isAdmin = currentRole === "admin";

  if (!isAdmin) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-ink-muted uppercase tracking-wider mb-1">
              <span>Model Governance & Benchmarking</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-ink font-semibold">AI Evaluation</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              AI Evaluation Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <DemoRoleSelector />
            <DemoDataNotice />
          </div>
        </div>

        <RestrictedAccessCard
          requiredRole="System Administrator"
          screenName="Model Evaluation & Offline Benchmark Suite"
          reason="Inspecting continuous model regression benchmarks, adversarial prompt test suites, and hallucination guard accuracy metrics is restricted to platform administrators."
        />
      </div>
    );
  }

  const filteredCases = evalCases.filter((c) => {
    if (categoryFilter === "all") return true;
    return c.category === categoryFilter;
  });

  const handleRunSuite = () => {
    setIsRunningSuite(true);
    setTimeout(() => {
      setIsRunningSuite(false);
      addAIAuditEvent({
        timestamp: "Just now",
        event_type: "analysis_completed",
        affected_entity_type: "validation_run",
        affected_entity_id: "eval-regression-run-latest",
        new_state: "5/5 Tests Passed (100% Accuracy)",
        reason: "Offline evaluation regression suite executed against Qwen-3 8B + Guard v2.4.",
        actor: "Admin (Automated CI/CD Evaluator)",
        model_or_policy_version: "eval-suite-v1.4",
      });
      showToast("Evaluation suite completed: 5/5 regression scenarios passed. Zero regressions detected.");
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-sand" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink/10 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-ink-muted uppercase tracking-wider mb-1">
            <span>Model Governance & Benchmarking</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-ink font-semibold">AI Evaluation</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
            AI Evaluation Dashboard
            <span className="text-xs px-2.5 py-1 bg-purple-100 text-purple-900 border border-purple-300 rounded-full font-mono font-medium">
              Offline Test Suites
            </span>
          </h1>
          <p className="text-ink-muted text-sm mt-1 max-w-3xl">
            Offline benchmark suites continuously evaluate model extraction precision, hallucination interception,
            adversarial prompt resilience, and schema compliance to ensure zero regressions across production deploys.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleRunSuite}
            disabled={isRunningSuite}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-2 shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRunningSuite ? "animate-spin" : ""}`} />
            {isRunningSuite ? "Running Benchmark..." : "Run Evaluation Suite"}
          </button>
          <DemoRoleSelector />
          <DemoDataNotice />
        </div>
      </div>

      {/* Benchmark Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Overall Accuracy</span>
          <p className="text-2xl font-bold text-ink mt-1">99.2%</p>
          <span className="text-[11px] text-emerald-700 font-semibold">&uarr; +0.4% from v1.3</span>
        </div>
        <div className="gl-card p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-mono text-emerald-900 uppercase">Hallucination Intercept</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">100%</p>
          <span className="text-[11px] text-emerald-800">Zero fake citations allowed</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Prompt Injection Def</span>
          <p className="text-2xl font-bold text-ink mt-1">100%</p>
          <span className="text-[11px] text-emerald-700 font-semibold">14/14 test attacks blocked</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Schema Adherence</span>
          <p className="text-2xl font-bold text-ink mt-1">98.8%</p>
          <span className="text-[11px] text-ink-muted">Pydantic strict validation</span>
        </div>
      </div>

      {/* 8 Benchmark Categories Progress */}
      <div className="gl-card p-5 bg-white space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-ink" /> Trust Metric Evaluation Matrix (8 Categories)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Unsupported Claims Rejection</span>
              <span className="font-mono text-emerald-800">100%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Conflicting Sources Routing</span>
              <span className="font-mono text-emerald-800">100%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Schema Output Conformance</span>
              <span className="font-mono text-emerald-800">98.8%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "98.8%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Prompt Injection Neutralization</span>
              <span className="font-mono text-emerald-800">100%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Extraction Precision (F1 Score)</span>
              <span className="font-mono text-emerald-800">96.4%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "96.4%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1 font-semibold">
              <span>Attribution Split Correctness</span>
              <span className="font-mono text-emerald-800">99.0%</span>
            </div>
            <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 rounded-full" style={{ width: "99%" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Test Cases List + Inspection Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Test Cases List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Activity className="w-4 h-4 text-ink" />
              Evaluation Scenarios ({filteredCases.length})
            </h3>
            {/* Category Filter */}
            <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full text-xs">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-2.5 py-0.5 rounded-full font-medium ${
                  categoryFilter === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCategoryFilter("unsupported_claims")}
                className={`px-2 py-0.5 rounded-full font-medium ${
                  categoryFilter === "unsupported_claims" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                Guard
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredCases.map((c) => {
              const isSelected = c.case_id === selectedCaseId;
              return (
                <div
                  key={c.case_id}
                  onClick={() => setSelectedCaseId(c.case_id)}
                  className={`gl-card p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? "ring-2 ring-ink border-ink bg-white shadow-md"
                      : "bg-white/80 hover:bg-white border-ink/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-ink-muted">{c.case_id}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        c.outcome === "pass"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : c.outcome === "fail"
                          ? "bg-red-100 text-red-900 border border-red-300"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {c.outcome}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-ink">{c.scenario_title}</h4>
                  <p className="text-xs text-ink-muted mt-1 font-mono">
                    Category: {c.category.replace("_", " ")}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-emerald-700 font-semibold">{c.tested_model}</span>
                    <span className="text-ink font-semibold flex items-center gap-1">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Scenario Benchmark Detail */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="gl-card p-6 bg-white space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ink-muted">{selectedCase.case_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 font-mono text-ink">
                      {selectedCase.category.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{selectedCase.scenario_title}</h2>
                  <p className="text-xs text-ink-muted mt-1 font-mono">
                    Model: {selectedCase.tested_model} &bull; Dataset: {selectedCase.dataset_version}
                  </p>
                </div>
                <span
                  className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase shrink-0 ${
                    selectedCase.outcome === "pass"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-red-100 text-red-900 border border-red-300"
                  }`}
                >
                  {selectedCase.outcome}
                </span>
              </div>

              {/* Behavior Comparison */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-sand/20 border border-sand space-y-1">
                  <span className="text-[11px] font-mono uppercase font-bold text-ink">
                    Expected Policy Behavior
                  </span>
                  <p className="text-xs text-ink font-mono">{selectedCase.expected_behavior}</p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-1">
                  <span className="text-[11px] font-mono uppercase font-bold text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Simulated Pipeline Result
                  </span>
                  <p className="text-xs text-emerald-900 font-mono">
                    {selectedCase.simulated_result}
                  </p>
                </div>
              </div>

              {/* Benchmark Meta */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-lg border border-ink/10">
                  <span className="text-ink-muted font-mono uppercase text-[10px] block">
                    Execution Time
                  </span>
                  <span className="font-bold text-ink">42ms (In-Memory Guard)</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-ink/10">
                  <span className="text-ink-muted font-mono uppercase text-[10px] block">
                    Adherence Confidence
                  </span>
                  <span className="font-bold text-emerald-800">100% Deterministic</span>
                </div>
              </div>

              <div className="pt-3 border-t border-ink/10 text-xs text-ink-muted text-center font-mono">
                Evaluations run against immutable golden test sets to ensure model updates do not introduce hallucinations.
              </div>
            </div>
          ) : (
            <div className="gl-card p-12 text-center text-ink-muted">
              Select an evaluation scenario to inspect.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
