"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import {
  AlertTriangle,
  GitCommit,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldAlert,
  Split,
  Scale,
  Clock,
  Sparkles,
  Info,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { ConflictRecord } from "@/types/ai";

export default function EvidenceConflictsPage() {
  const { conflicts, updateConflict, addAIAuditEvent, currentRole } = useEvidence();
  const [selectedConflictId, setSelectedConflictId] = useState<string>(
    conflicts[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedConflictId && conflicts.length > 0) {
      setSelectedConflictId(conflicts[0].id);
    }
  }, [conflicts, selectedConflictId]);

  const [filterType, setFilterType] = useState<string>("all");
  const [resolutionNote, setResolutionNote] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedConflict =
    conflicts.find((c) => c.id === selectedConflictId) || conflicts[0];

  const filteredConflicts = conflicts.filter((c) => {
    if (filterType === "all") return true;
    if (filterType === "open") return c.status === "open";
    if (filterType === "resolved") return c.status === "resolved";
    return c.conflict_type === filterType;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleResolveConflict = (
    conflict: ConflictRecord,
    decision: string,
    rationale: string
  ) => {
    const actorName =
      currentRole === "admin"
        ? "Administrator"
        : currentRole === "reviewer"
        ? "Authorized Reviewer"
        : "Employee (Self-Resolution)";

    updateConflict(conflict.id, {
      status: "resolved",
      resolution_outcome: {
        decision,
        rationale: rationale || conflict.suggested_resolution,
        actor: actorName,
        timestamp: "Just now",
      },
    });

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "review_decision",
      affected_entity_type: "conflict",
      affected_entity_id: conflict.id,
      previous_state: "open",
      new_state: `Resolved: ${decision}`,
      reason: rationale || conflict.suggested_resolution,
      actor: actorName,
      model_or_policy_version: "conflict-resolver-v2.1",
    });

    showToast(`Conflict resolved: "${decision}". Logged to Audit History.`);
    setResolutionNote("");
  };

  const handleMarkInsufficient = (conflict: ConflictRecord) => {
    const actorName =
      currentRole === "admin"
        ? "Administrator"
        : currentRole === "reviewer"
        ? "Authorized Reviewer"
        : "Employee";

    updateConflict(conflict.id, {
      status: "insufficient_evidence",
      resolution_outcome: {
        decision: "Marked Insufficient Evidence",
        rationale: "Neither source provides unambiguous proof. Down-rated to candidate claim.",
        actor: actorName,
        timestamp: "Just now",
      },
    });

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "guard_blocked",
      affected_entity_type: "conflict",
      affected_entity_id: conflict.id,
      previous_state: "open",
      new_state: "Insufficient Evidence (Down-rated)",
      reason: "Contradiction cannot be reconciled without further source artifacts.",
      actor: actorName,
    });

    showToast(`Conflict marked as Insufficient Evidence.`);
  };

  const getSourceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "github":
        return <GitCommit className="w-4 h-4 text-emerald-700" />;
      case "jira":
        return <FileText className="w-4 h-4 text-sky-700" />;
      case "resume":
        return <FileText className="w-4 h-4 text-amber-700" />;
      default:
        return <FileText className="w-4 h-4 text-ink-muted" />;
    }
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
        title="Evidence Conflict Resolution"
        description="When disparate ingestion sources report contradictory attribution, dates, or claims, Skill Passport preserves both audit trails and halts automated verification."
        badge="CONTRADICTION GUARD"
        badgeColor="bg-amber-200 text-amber-950"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Philosophy Callout */}
      <div className="gl-card p-5 bg-gradient-to-r from-amber-50/60 via-sand/20 to-white border border-amber-200">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-ink">Zero Silent Overwrites Guarantee</h4>
            <p className="text-xs text-ink/80 leading-relaxed">
              In naive AI extraction systems, the latest ingested document silences previous evidence. Skill Passport
              explicitly models conflicts as first-class objects. If Jira asserts a solo task but Git shows a co-authored
              trailer, both claims are preserved side-by-side with provenance, requiring policy-based reconciliation.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Total Conflicts</span>
          <p className="text-2xl font-bold text-ink mt-1">{conflicts.length}</p>
          <span className="text-[11px] text-ink-muted">Discovered across sources</span>
        </div>
        <div className="gl-card p-4 bg-amber-50/50 border-amber-200">
          <span className="text-xs font-mono text-amber-900 uppercase">Open Discrepancies</span>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {conflicts.filter((c) => c.status === "open").length}
          </p>
          <span className="text-[11px] text-amber-800">Requires adjudication</span>
        </div>
        <div className="gl-card p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-mono text-emerald-900 uppercase">Resolved</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {conflicts.filter((c) => c.status === "resolved").length}
          </p>
          <span className="text-[11px] text-emerald-800">Policy applied</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Resolution Strategy</span>
          <p className="text-sm font-bold text-ink mt-2">Split Attribution</p>
          <span className="text-[11px] text-ink-muted">Default recommendation</span>
        </div>
      </div>

      {/* Main Grid: Left List + Right Side-by-Side Review */}
      {conflicts.length === 0 ? (
        <div className="gl-card p-12 text-center bg-white border border-dashed border-ink/20 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">Zero Evidence Contradictions Detected</h3>
          <p className="text-xs text-ink/70 max-w-md mx-auto mt-1 mb-6">
            All ingested evidence sources are currently in consensus. When conflicting attribution, co-authorship disputes, or opposing proficiency signals arise across multiple artifacts, they will be quarantined here for adjudication.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/app/evidence" className="pill-btn pill-btn-primary text-xs py-2 px-5">
              Ingest Work Artifacts &rarr;
            </Link>
            <Link href="/app/ai" className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-5">
              Return to AI Overview
            </Link>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Conflict Selector List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              Conflict Records ({filteredConflicts.length})
            </h3>
            <div className="flex items-center gap-1.5 bg-ink/5 p-1 rounded-full text-xs">
              <button
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  filterType === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("open")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  filterType === "open" ? "bg-amber-700 text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                Open
              </button>
              <button
                onClick={() => setFilterType("resolved")}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all ${
                  filterType === "resolved" ? "bg-emerald-700 text-white" : "text-ink-muted hover:text-ink"
                }`}
              >
                Resolved
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredConflicts.length === 0 ? (
              <div className="gl-card p-6 text-center text-ink-muted text-xs bg-white">
                No conflicts match the &ldquo;{filterType}&rdquo; filter.
              </div>
            ) : (
              filteredConflicts.map((c) => {
                const isSelected = c.id === selectedConflictId;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedConflictId(c.id)}
                    className={`gl-card p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? "ring-2 ring-ink border-ink bg-white shadow-md"
                        : "bg-white/80 hover:bg-white border-ink/10"
                    }`}
                  >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-ink/5 text-ink-muted">
                      {c.conflict_type.replace("_", " ")}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold uppercase ${
                        c.status === "open"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : c.status === "resolved"
                          ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                          : "bg-slate-100 text-slate-800 border border-slate-300"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-ink line-clamp-2">{c.title}</h4>
                  <p className="text-xs text-ink-muted mt-1 line-clamp-2">{c.description}</p>

                  <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between text-[11px] text-ink-muted font-mono">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        {getSourceIcon(c.source_a.type)} {c.source_a.type}
                      </span>
                      <span>vs</span>
                      <span className="flex items-center gap-1">
                        {getSourceIcon(c.source_b.type)} {c.source_b.type}
                      </span>
                    </div>
                    <span className="text-ink font-semibold flex items-center gap-1">
                      Inspect <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Side: Side-by-Side Adjudication Console */}
        <div className="lg:col-span-7">
          {selectedConflict ? (
            <div className="gl-card p-6 bg-white space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ink-muted">{selectedConflict.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 font-mono text-ink">
                      Type: {selectedConflict.conflict_type.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{selectedConflict.title}</h2>
                  <p className="text-xs text-ink-muted mt-1">{selectedConflict.description}</p>
                </div>
                <span
                  className={`text-xs font-mono px-3 py-1 rounded-full font-bold uppercase shrink-0 ${
                    selectedConflict.status === "open"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : selectedConflict.status === "resolved"
                      ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      : "bg-slate-100 text-slate-800 border border-slate-300"
                  }`}
                >
                  Status: {selectedConflict.status}
                </span>
              </div>

              {/* Side-by-side Evidence Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" /> Competing Ingestion Sources
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source A */}
                  <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-sky-950 flex items-center gap-1.5">
                        {getSourceIcon(selectedConflict.source_a.type)} Source A
                      </span>
                      <span className="text-[11px] font-mono text-sky-800">
                        {selectedConflict.source_a.date}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-ink">
                      {selectedConflict.source_a.name}
                    </div>
                    <div className="text-xs text-ink/80 bg-white/80 p-2.5 rounded-lg border border-sky-100 font-mono text-[11px]">
                      &ldquo;{selectedConflict.source_a.claim}&rdquo;
                    </div>
                    <div className="text-[11px] text-ink-muted bg-white/40 p-2 rounded border border-ink/5 font-mono whitespace-pre-line">
                      <span className="font-bold text-ink">Excerpt:</span>
                      <br />
                      {selectedConflict.source_a.excerpt}
                    </div>
                    <div className="text-[11px] text-sky-900">
                      <strong>Author:</strong> {selectedConflict.source_a.author}
                    </div>
                  </div>

                  {/* Source B */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                        {getSourceIcon(selectedConflict.source_b.type)} Source B
                      </span>
                      <span className="text-[11px] font-mono text-emerald-800">
                        {selectedConflict.source_b.date}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-ink">
                      {selectedConflict.source_b.name}
                    </div>
                    <div className="text-xs text-ink/80 bg-white/80 p-2.5 rounded-lg border border-emerald-100 font-mono text-[11px]">
                      &ldquo;{selectedConflict.source_b.claim}&rdquo;
                    </div>
                    <div className="text-[11px] text-ink-muted bg-white/40 p-2 rounded border border-ink/5 font-mono whitespace-pre-line">
                      <span className="font-bold text-ink">Excerpt:</span>
                      <br />
                      {selectedConflict.source_b.excerpt}
                    </div>
                    <div className="text-[11px] text-emerald-900">
                      <strong>Author:</strong> {selectedConflict.source_b.author}
                    </div>
                  </div>
                </div>
              </div>

              {/* Skill Passport AI Suggested Resolution */}
              <div className="p-4 rounded-xl bg-sand/30 border border-sand space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-ink">
                  <Sparkles className="w-4 h-4 text-ink" />
                  Skill Passport Discrepancy Policy Engine
                </div>
                <p className="text-xs text-ink/90 leading-relaxed font-mono">
                  {selectedConflict.suggested_resolution}
                </p>
              </div>

              {/* Resolution History if Already Resolved */}
              {selectedConflict.resolution_outcome && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Resolution Record
                    </span>
                    <span className="text-[11px] font-mono text-emerald-800">
                      {selectedConflict.resolution_outcome.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-900 font-medium">
                    <strong>Decision:</strong> {selectedConflict.resolution_outcome.decision}
                  </p>
                  <p className="text-xs text-emerald-800">
                    <strong>Rationale:</strong> {selectedConflict.resolution_outcome.rationale}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-mono">
                    <strong>Adjudicated by:</strong> {selectedConflict.resolution_outcome.actor}
                  </p>
                </div>
              )}

              {/* Action Adjudication Controls */}
              <div className="space-y-3 pt-2 border-t border-ink/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Adjudication Actions
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() =>
                      handleResolveConflict(
                        selectedConflict,
                        "Split Attribution (50% Shared Weighting)",
                        "Collaborative co-authorship confirmed. Both contributors awarded 50% attribution weighting."
                      )
                    }
                    className="pill-btn pill-btn-primary text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <Split className="w-3.5 h-3.5" />
                    Split Attribution (Collaborative)
                  </button>

                  <button
                    onClick={() =>
                      handleResolveConflict(
                        selectedConflict,
                        "Uphold High-Trust Git Commits",
                        "Policy applies cryptographic Git commit log as primary ground truth over self-reported tracker."
                      )
                    }
                    className="pill-btn bg-white hover:bg-sand/30 border border-ink text-ink text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <GitCommit className="w-3.5 h-3.5 text-emerald-700" />
                    Uphold High-Trust Source (Git)
                  </button>

                  <button
                    onClick={() => handleMarkInsufficient(selectedConflict)}
                    className="pill-btn bg-white hover:bg-red-50 border border-ink/20 text-red-800 text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Down-rate (Insufficient Evidence)
                  </button>

                  <Link
                    href={`/app/ai/review-queue`}
                    className="pill-btn bg-white hover:bg-sand/20 border border-ink/20 text-ink text-xs py-2.5 flex items-center justify-center gap-2"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-ink-muted" />
                    Escalate to Review Queue
                  </Link>
                </div>

                <div className="text-[11px] text-ink-muted text-center pt-2 font-mono">
                  All actions trigger immutable audit logging and notify involved contributors.
                </div>
              </div>
            </div>
          ) : (
            <div className="gl-card p-12 text-center text-ink-muted">
              Select a conflict record from the list to review conflicting evidence.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  </div>
  );
}
