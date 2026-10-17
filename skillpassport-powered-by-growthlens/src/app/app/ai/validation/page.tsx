"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Code2,
  FileCode,
  ShieldCheck,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
  ArrowRight,
  Cpu,
  Layers,
  Braces,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { OutputValidationRecord } from "@/types/ai";
import {
  ValidationStatusBadge,
} from "@/components/app/AIBadges";

export default function AIOutputValidationPage() {
  const { validationRecords, updateValidationRecord, addAIAuditEvent, currentRole } =
    useEvidence();
  const [selectedRunId, setSelectedRunId] = useState<string>(
    validationRecords[0]?.run_id || ""
  );

  useEffect(() => {
    if (!selectedRunId && validationRecords.length > 0) {
      setSelectedRunId(validationRecords[0].run_id);
    }
  }, [validationRecords, selectedRunId]);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedRecord =
    validationRecords.find((r) => r.run_id === selectedRunId) || validationRecords[0];

  const filteredRecords = validationRecords.filter((r) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "valid") return r.status === "valid";
    if (statusFilter === "failed") return r.status === "validation_failed" || r.status === "invalid";
    return true;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRetryPipeline = (runId: string) => {
    setIsRetrying(true);
    setTimeout(() => {
      updateValidationRecord(runId, {
        status: "valid",
        issues: [],
        retryable: false,
        received_payload_summary: {
          ...selectedRecord.received_payload_summary,
          schema_adherence: true,
          retry_attempt: 2,
          remediated_field: "candidate_skills[2].evidence_id = 'ev-03'",
        },
      });

      addAIAuditEvent({
        timestamp: "Just now",
        event_type: "validation_retried",
        affected_entity_type: "validation_run",
        affected_entity_id: runId,
        previous_state: "validation_failed",
        new_state: "valid",
        reason: "Model regenerated JSON payload with strictly conforming schema and bounded confidence scores.",
        actor: currentRole === "admin" ? "Administrator" : "System Pipeline",
        model_or_policy_version: "qwen-3-8b (prompt-retry-v2)",
        run_id: runId,
      });

      setIsRetrying(false);
      showToast(`Run ${runId} regenerated & validated successfully. Logged to Audit.`);
    }, 1200);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-sand" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AppTopBar
        title="AI Output Validation"
        description="Raw LLM inference streams are strictly quarantined until they pass rigorous schema conformance, boundary checks, and integrity validation."
        badge="JSON SCHEMA GATE"
        badgeColor="bg-sky-200 text-sky-950"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Validation Runs</span>
          <p className="text-2xl font-bold text-ink mt-1">{validationRecords.length}</p>
          <span className="text-[11px] text-ink-muted">Inference outputs checked</span>
        </div>
        <div className="gl-card p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-mono text-emerald-900 uppercase">Conforming (Valid)</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {validationRecords.filter((r) => r.status === "valid").length}
          </p>
          <span className="text-[11px] text-emerald-800">100% Schema Compliant</span>
        </div>
        <div className="gl-card p-4 bg-red-50/50 border-red-200">
          <span className="text-xs font-mono text-red-900 uppercase">Schema Violations</span>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {validationRecords.filter((r) => r.status === "validation_failed" || r.status === "invalid").length}
          </p>
          <span className="text-[11px] text-red-800">Intercepted by validator</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Active Validator</span>
          <p className="text-sm font-bold text-ink mt-2">Pydantic v2.6 + JSONSchema</p>
          <span className="text-[11px] text-ink-muted">Strict type boundaries</span>
        </div>
      </div>

      {/* Main Grid: Runs List + Detailed Inspector */}
      {validationRecords.length === 0 ? (
        <div className="gl-card p-12 text-center bg-white border border-dashed border-ink/20 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-sky-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">Zero Model Output Violations</h3>
          <p className="text-xs text-ink/70 max-w-md mx-auto mt-1 mb-6">
            GrowthLens strictly quarantines raw model inference streams and validates them against Pydantic schemas and numerical boundary rules before candidate skills are accepted. When AI Work Analysis or Candidate Extraction jobs execute, schema conformance checks will be recorded here.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/app/ai/work-analysis" className="pill-btn pill-btn-primary text-xs py-2 px-5">
              Run Work Analysis &rarr;
            </Link>
            <Link href="/app/ai" className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-5">
              Return to AI Overview
            </Link>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Runs List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Code2 className="w-4 h-4 text-ink" />
              Inference Validation Runs ({filteredRecords.length})
            </h3>
            <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full text-xs">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("valid")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === "valid" ? "bg-emerald-700 text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                Valid
              </button>
              <button
                onClick={() => setStatusFilter("failed")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  statusFilter === "failed" ? "bg-red-700 text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                Failed
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredRecords.length === 0 ? (
              <div className="gl-card p-6 text-center text-ink-muted text-xs bg-white">
                No validation runs match the &ldquo;{statusFilter}&rdquo; filter.
              </div>
            ) : (
              filteredRecords.map((r) => {
                const isSelected = r.run_id === selectedRunId;
                return (
                  <div
                    key={r.run_id}
                    onClick={() => setSelectedRunId(r.run_id)}
                    className={`gl-card p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? "ring-2 ring-ink border-ink bg-white shadow-md"
                        : "bg-white/80 hover:bg-white border-ink/10"
                    }`}
                  >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-ink-muted">{r.run_id}</span>
                    <ValidationStatusBadge status={r.status} />
                  </div>
                  <h4 className="text-sm font-bold text-ink uppercase tracking-wide">
                    {r.output_type.replace("_", " ")}
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5 font-mono">
                    Model: {r.model_version} &bull; Schema: {r.schema_version}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={
                        r.issues.length === 0 ? "text-emerald-700 font-bold" : "text-red-700 font-bold"
                      }
                    >
                      {r.issues.length === 0 ? "0 Schema Errors" : `${r.issues.length} Validation Issues`}
                    </span>
                    <span className="text-ink font-semibold flex items-center gap-1">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Side: Detailed Inspection Console */}
        <div className="lg:col-span-7">
          {selectedRecord ? (
            <div className="gl-card p-6 bg-white space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ink-muted">{selectedRecord.run_id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 font-mono text-ink">
                      {selectedRecord.output_type}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink capitalize">
                    {selectedRecord.output_type.replace("_", " ")} Payload Validation
                  </h2>
                  <p className="text-xs text-ink-muted mt-1 font-mono">
                    Model: <strong>{selectedRecord.model_version}</strong> &bull; Prompt Version:{" "}
                    <strong>{selectedRecord.prompt_version}</strong> &bull; Timestamp:{" "}
                    {selectedRecord.timestamp}
                  </p>
                </div>
                <ValidationStatusBadge status={selectedRecord.status} />
              </div>

              {/* Issues List or Clean Bill of Health */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" /> Schema Violations & Diagnostics
                </h3>

                {selectedRecord.issues.length === 0 ? (
                  <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                    <div className="text-xs text-emerald-950">
                      <strong>Perfect Schema Adherence:</strong> All required fields, data types, and
                      numerical ranges conform to <code>{selectedRecord.schema_version}</code>.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedRecord.issues.map((issue, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                          issue.severity === "error"
                            ? "bg-red-50/60 border-red-200 text-red-950"
                            : "bg-amber-50/60 border-amber-200 text-amber-950"
                        }`}
                      >
                        <AlertCircle
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            issue.severity === "error" ? "text-red-700" : "text-amber-700"
                          }`}
                        />
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-[11px] flex items-center gap-2">
                            <span>Field: <code>{issue.field}</code></span>
                            <span className="uppercase text-[9px] px-1.5 py-0.2 rounded bg-red-200 text-red-900 font-bold">
                              {issue.severity}
                            </span>
                          </div>
                          <p className="text-[11px] text-ink/80">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Payload Summary Inspector */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 flex items-center gap-1.5">
                  <Braces className="w-3.5 h-3.5" /> Received JSON Payload Metadata
                </h3>
                <pre className="p-4 rounded-xl bg-sand/20 border border-ink/10 text-ink font-mono text-xs overflow-x-auto leading-relaxed">
                  {JSON.stringify(selectedRecord.received_payload_summary, null, 2)}
                </pre>
              </div>

              {/* Remediation & Action Bar */}
              <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
                <div className="text-[11px] text-ink-muted">
                  Strict rejection prevents malformed JSON from reaching candidate skills.
                </div>

                {selectedRecord.status !== "valid" && selectedRecord.retryable ? (
                  <button
                    onClick={() => handleRetryPipeline(selectedRecord.run_id)}
                    disabled={isRetrying}
                    className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                    {isRetrying ? "Regenerating..." : "Simulate Pipeline Retry (Reprompt)"}
                  </button>
                ) : (
                  <span className="text-xs text-emerald-800 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Output Certified & Normalized
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="gl-card p-12 text-center text-ink-muted">
              Select an inference validation run to inspect.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  </div>
  );
}
