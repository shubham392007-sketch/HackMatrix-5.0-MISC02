"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Sparkles,
  Info,
  ChevronRight,
  Clock,
  ShieldCheck,
  Send,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { HumanReviewTask } from "@/types/ai";
import {
  RestrictedAccessCard,
} from "@/components/app/AIBadges";

export default function HumanReviewQueuePage() {
  const { currentRole, reviewTasks, updateReviewTask, addAIAuditEvent } =
    useEvidence();
  const [selectedTaskId, setSelectedTaskId] = useState<string>(
    reviewTasks[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedTaskId && reviewTasks.length > 0) {
      setSelectedTaskId(reviewTasks[0].id);
    }
  }, [reviewTasks, selectedTaskId]);

  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewNote, setReviewNote] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedTask =
    reviewTasks.find((t) => t.id === selectedTaskId) || reviewTasks[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Role gate: Reviewer or Admin only
  const isAuthorized = currentRole === "reviewer" || currentRole === "admin";

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col">
        <AppTopBar
          title="Human Review Queue"
          description="Where AI confidence is ambiguous or artifacts indicate theory-only study, claims are escalated for human oversight."
          badge="RESTRICTED (REVIEWER)"
          badgeColor="bg-amber-200 text-amber-950"
        />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
          <RestrictedAccessCard
            requiredRole="Authorized Reviewer or Administrator"
            screenName="Human Oversight & Verification Adjudication Queue"
            reason="Reviewing pending employee claims, adjudicating ambiguous taxonomy extractions, and resolving evidence conflicts requires certified reviewer authority."
          />
        </div>
      </div>
    );
  }

  const filteredTasks = reviewTasks.filter((t) => {
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  const handleTaskAction = (
    task: HumanReviewTask,
    action: "reviewed" | "rejected" | "escalated",
    decisionLabel: string
  ) => {
    const actor =
      currentRole === "admin"
        ? "Administrator"
        : "Authorized Reviewer";

    const note = reviewNote.trim() || `Adjudicated as ${decisionLabel} via Human Review Queue.`;

    updateReviewTask(task.id, {
      status: action,
    });

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "review_decision",
      affected_entity_type: "candidate_skill",
      affected_entity_id: task.claim_id,
      previous_state: "pending",
      new_state: decisionLabel,
      reason: note,
      actor,
      model_or_policy_version: "human-review-v1.0",
    });

    setReviewNote("");
    showToast(`Task ${task.id} marked as [${decisionLabel}]. Audit trail updated.`);
  };

  const getPriorityBadge = (priority: HumanReviewTask["priority"]) => {
    switch (priority) {
      case "high":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-900 border border-red-300">
            High Priority
          </span>
        );
      case "medium":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
            Medium
          </span>
        );
      case "low":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-slate-100 text-slate-800 border border-slate-300">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: HumanReviewTask["status"]) => {
    switch (status) {
      case "pending":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300">
            Pending
          </span>
        );
      case "reviewed":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300">
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-900 border border-red-300">
            Rejected
          </span>
        );
      case "escalated":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300">
            Escalated
          </span>
        );
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
        title="Human Review Queue"
        description="Where AI confidence is ambiguous or artifacts indicate theory-only study, claims are escalated for human oversight."
        badge="HUMAN-IN-THE-LOOP"
        badgeColor="bg-amber-200 text-amber-950"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Pending Triage</span>
          <p className="text-2xl font-bold text-ink mt-1">
            {reviewTasks.filter((t) => t.status === "pending").length}
          </p>
          <span className="text-[11px] text-ink-muted">Awaiting human decision</span>
        </div>
        <div className="gl-card p-4 bg-red-50/50 border-red-200">
          <span className="text-xs font-mono text-red-900 uppercase">High Priority</span>
          <p className="text-2xl font-bold text-red-900 mt-1">
            {reviewTasks.filter((t) => t.priority === "high" && t.status === "pending").length}
          </p>
          <span className="text-[11px] text-red-800">Prompt injection / conflict</span>
        </div>
        <div className="gl-card p-4 bg-emerald-50/50 border-emerald-200">
          <span className="text-xs font-mono text-emerald-900 uppercase">Adjudicated</span>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {reviewTasks.filter((t) => t.status !== "pending").length}
          </p>
          <span className="text-[11px] text-emerald-800">Recorded in audit log</span>
        </div>
        <div className="gl-card p-4 bg-white">
          <span className="text-xs font-mono text-ink-muted uppercase">Review Policy</span>
          <p className="text-sm font-bold text-ink mt-2">Zero Blind Acceptance</p>
          <span className="text-[11px] text-ink-muted">Model proposes &bull; Human decides</span>
        </div>
      </div>

      {/* Main Grid: Task List + Action Drawer */}
      {reviewTasks.length === 0 ? (
        <div className="gl-card p-12 text-center bg-white border border-dashed border-ink/20 rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-ink">Human Review Queue is Clear</h3>
          <p className="text-xs text-ink/70 max-w-md mx-auto mt-1 mb-6">
            No candidate skills or evidence claims currently require manual escalation. Claims flagged for ambiguous taxonomy mapping, low model confidence, or conflicting source attributions will appear here for review.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/app/ai/skill-extraction" className="pill-btn pill-btn-primary text-xs py-2 px-5">
              View Candidate Skills &rarr;
            </Link>
            <Link href="/app/ai" className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-5">
              Return to AI Overview
            </Link>
          </div>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Tasks Triage Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Users className="w-4 h-4 text-ink" />
              Review Tasks ({filteredTasks.length})
            </h3>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    statusFilter === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("pending")}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    statusFilter === "pending" ? "bg-amber-700 text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Pending
                </button>
              </div>

              <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full">
                <button
                  onClick={() => setPriorityFilter("all")}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    priorityFilter === "all" ? "bg-ink text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  All Pri
                </button>
                <button
                  onClick={() => setPriorityFilter("high")}
                  className={`px-2 py-0.5 rounded-full font-medium ${
                    priorityFilter === "high" ? "bg-red-700 text-white" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  High
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="gl-card p-6 text-center text-ink-muted text-xs bg-white">
                No review tasks match the selected filters.
              </div>
            ) : (
              filteredTasks.map((task) => {
                const isSelected = task.id === selectedTaskId;
                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`gl-card p-4 cursor-pointer transition-all border ${
                      isSelected
                        ? "ring-2 ring-ink border-ink bg-white shadow-md"
                        : "bg-white/80 hover:bg-white border-ink/10"
                    }`}
                  >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-ink-muted">{task.id}</span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(task.priority)}
                      {getStatusBadge(task.status)}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-ink line-clamp-2">{task.title}</h4>
                  <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                    {task.context_summary}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-ink-muted">Claim: {task.claim_id}</span>
                    <span className="text-ink font-semibold flex items-center gap-1">
                      Review <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Side: Human Adjudication Console */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="gl-card p-6 bg-white space-y-6 sticky top-6">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ink-muted">{selectedTask.id}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-ink/5 font-mono text-ink">
                      Category: {selectedTask.category.replace("_", " ")}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-ink">{selectedTask.title}</h2>
                  <p className="text-xs text-ink-muted mt-1 font-mono">
                    Assigned: <strong>{selectedTask.assigned_role}</strong> &bull; Created:{" "}
                    {selectedTask.created_at}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {getPriorityBadge(selectedTask.priority)}
                  {getStatusBadge(selectedTask.status)}
                </div>
              </div>

              {/* Context Summary */}
              <div className="p-4 rounded-xl bg-sand/20 border border-sand space-y-2 text-xs">
                <span className="font-bold text-ink uppercase tracking-wider text-[11px] block">
                  AI Context Summary & Escalation Trigger
                </span>
                <p className="text-ink/90 leading-relaxed font-mono">
                  {selectedTask.context_summary}
                </p>
              </div>

              {/* Deep Link to Entity View */}
              <div className="p-3.5 rounded-xl border border-ink/10 bg-white flex items-center justify-between text-xs">
                <div>
                  <span className="text-ink-muted">Associated Target Claim:</span>{" "}
                  <code className="font-bold text-ink">{selectedTask.claim_id}</code>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTask.category === "conflict" && (
                    <Link
                      href="/app/ai/conflicts"
                      className="text-xs font-semibold text-ink underline flex items-center gap-1"
                    >
                      Inspect in Conflicts <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {selectedTask.category === "suspicious_injection" && (
                    <Link
                      href="/app/ai/prompt-injection"
                      className="text-xs font-semibold text-ink underline flex items-center gap-1"
                    >
                      Inspect in Security <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {selectedTask.category === "unsupported_claim" && (
                    <Link
                      href="/app/ai/guard"
                      className="text-xs font-semibold text-ink underline flex items-center gap-1"
                    >
                      Inspect in Guard <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Adjudication Notes Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-ink">
                  Reviewer Decision Rationale (Written to Immutable Audit Trail)
                </label>
                <textarea
                  rows={3}
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  placeholder="State the justification for approving, down-rating, or escalating this claim..."
                  className="w-full p-3 rounded-xl border border-ink/20 text-xs focus:ring-1 focus:ring-ink focus:outline-none"
                />
              </div>

              {/* Reviewer Action Buttons */}
              <div className="space-y-3 pt-2 border-t border-ink/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Execute Decision
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <button
                    onClick={() =>
                      handleTaskAction(
                        selectedTask,
                        "reviewed",
                        "Approved (Promoted to Verified Passport)"
                      )
                    }
                    className="pill-btn pill-btn-primary text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Approve / Verify
                  </button>

                  <button
                    onClick={() =>
                      handleTaskAction(
                        selectedTask,
                        "rejected",
                        "Rejected (Restricted to Educational / Down-rated)"
                      )
                    }
                    className="pill-btn bg-white hover:bg-red-50 border border-ink text-red-800 text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                    Reject / Down-rate
                  </button>

                  <button
                    onClick={() =>
                      handleTaskAction(
                        selectedTask,
                        "escalated",
                        "Escalated to Staff Architect Adjudication"
                      )
                    }
                    className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2.5 flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Escalate to Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="gl-card p-12 text-center text-ink-muted">
              Select a task from the triage queue to review.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  </div>
  );
}
