"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import {
  History,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCw,
  Search,
  Filter,
  Download,
  Sparkles,
  ChevronRight,
  ExternalLink,
  User,
  Clock,
  Layers,
  Cpu,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { AIAuditEvent } from "@/types/ai";

export default function AIAuditHistoryPage() {
  const { aiAuditEvents, currentRole } = useEvidence();

  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredEvents = aiAuditEvents.filter((ev) => {
    if (eventTypeFilter !== "all" && ev.event_type !== eventTypeFilter) return false;
    if (entityFilter !== "all" && ev.affected_entity_type !== entityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = `${ev.id} ${ev.affected_entity_id} ${ev.reason} ${ev.actor} ${ev.new_state}`.toLowerCase();
      if (!matchText.includes(q)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setEventTypeFilter("all");
    setEntityFilter("all");
    setSearchQuery("");
  };

  const handleExportAuditJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(aiAuditEvents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `skillpassport-ai-audit-log-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("Audit trail exported successfully as JSON.");
  };

  const getEventBadge = (type: AIAuditEvent["event_type"]) => {
    switch (type) {
      case "guard_blocked":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-red-100 text-red-900 border border-red-300 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Guard Blocked
          </span>
        );
      case "review_decision":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Review Decision
          </span>
        );
      case "conflict_recorded":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Conflict Recorded
          </span>
        );
      case "injection_quarantined":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-purple-100 text-purple-900 border border-purple-300 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> Injection Quarantined
          </span>
        );
      case "validation_retried":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-sky-100 text-sky-900 border border-sky-300 flex items-center gap-1">
            <RotateCw className="w-3 h-3" /> Validation Retried
          </span>
        );
      case "analysis_completed":
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-sand text-ink border border-ink/20 flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Analysis Completed
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase bg-ink/5 text-ink">
            {(type || "EVENT").replace(/_/g, " ")}
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
        title="AI & Governance Audit History"
        description="A cryptographically structured timeline of all AI extractions, guard policy intercepts, human adjudications, and threat quarantines."
        badge="IMMUTABLE AUDIT TRAIL"
      >
        <button
          onClick={handleExportAuditJson}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink text-ink text-xs py-2 px-4 flex items-center gap-2 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>EXPORT AUDIT LOG (JSON)</span>
        </button>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* Filter and Search Bar */}
      <div className="gl-card p-4 bg-white space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              placeholder="Search by event ID, entity, actor, or rationale..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input w-full pl-10 text-xs"
            />
          </div>

          {/* Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="pill-input text-xs"
            >
              <option value="all">All Event Types</option>
              <option value="guard_blocked">Guard Blocked</option>
              <option value="review_decision">Review Decision</option>
              <option value="conflict_recorded">Conflict Recorded</option>
              <option value="injection_quarantined">Injection Quarantined</option>
              <option value="validation_retried">Validation Retried</option>
              <option value="analysis_completed">Analysis Completed</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="pill-input text-xs"
            >
              <option value="all">All Entities</option>
              <option value="candidate_skill">Candidate Skill</option>
              <option value="conflict">Conflict</option>
              <option value="source">Source</option>
              <option value="validation_run">Validation Run</option>
              <option value="verification">Verification</option>
            </select>

            {(eventTypeFilter !== "all" || entityFilter !== "all" || searchQuery) && (
              <button
                onClick={clearFilters}
                className="text-xs text-ink-muted hover:text-ink underline px-2 py-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-ink-muted px-1">
          <span>Showing {filteredEvents.length} audit trail records</span>
          <span className="font-mono">Policy Spec: SkillPassport-Audit-2026</span>
        </div>

        {aiAuditEvents.length === 0 ? (
          <div className="gl-card p-12 text-center bg-white border border-dashed border-ink/20 rounded-2xl">
            <History className="w-12 h-12 text-ink-muted mx-auto mb-3 opacity-50" />
            <h3 className="text-base font-bold text-ink">Zero Audit Events Recorded</h3>
            <p className="text-xs text-ink/70 max-w-md mx-auto mt-1 mb-6">
              No verification decisions, guard policy blocks, conflict reconciliations, or model output validations have occurred yet. All system and human actions are cryptographically and immutably recorded here as they occur.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/app/evidence" className="pill-btn pill-btn-primary text-xs py-2 px-5">
                Ingest Work Evidence &rarr;
              </Link>
              <Link href="/app/ai" className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-5">
                Return to AI Overview
              </Link>
            </div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="gl-card p-12 text-center text-ink-muted">
            No audit events matched your search filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((ev) => (
              <div
                key={ev.id}
                className="gl-card p-5 bg-white border border-ink/10 hover:border-ink/30 transition-all space-y-3"
              >
                {/* Top line: ID, timestamp, and Event Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/5 pb-2.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-ink">{ev.id}</span>
                    <span className="text-[11px] font-mono text-ink-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {ev.timestamp}
                    </span>
                    {ev.run_id && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-ink/5 text-ink-muted">
                        Run: {ev.run_id}
                      </span>
                    )}
                  </div>
                  <div>{getEventBadge(ev.event_type)}</div>
                </div>

                {/* State Transition and Entity Details */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                  <div className="md:col-span-4 space-y-1">
                    <span className="text-[11px] font-mono text-ink-muted uppercase block">
                      Target Entity
                    </span>
                    <div className="font-semibold text-ink flex items-center gap-1.5">
                      <code className="text-ink font-mono bg-sand/30 px-1.5 py-0.5 rounded">
                        {ev.affected_entity_id}
                      </code>
                      <span className="text-ink-muted font-normal capitalize">
                        ({ev.affected_entity_type.replace("_", " ")})
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-8 space-y-1">
                    <span className="text-[11px] font-mono text-ink-muted uppercase block">
                      State Transition
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      {ev.previous_state && (
                        <>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 line-through">
                            {ev.previous_state}
                          </span>
                          <span className="text-ink-muted">&rarr;</span>
                        </>
                      )}
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                        {ev.new_state}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Justification Rationale */}
                <div className="p-3 rounded-xl bg-sand/15 border border-ink/5 text-xs">
                  <span className="font-semibold text-ink">Audit Rationale:</span>{" "}
                  <span className="text-ink/85">{ev.reason}</span>
                </div>

                {/* Footer metadata: Actor and Policy Version */}
                <div className="pt-2 border-t border-ink/5 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] font-mono text-ink-muted gap-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink" />
                    <span>Actor:</span>
                    <strong className="text-ink">{ev.actor}</strong>
                  </div>
                  {ev.model_or_policy_version && (
                    <div>
                      <span>Version:</span>{" "}
                      <code className="text-ink font-semibold">{ev.model_or_policy_version}</code>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
