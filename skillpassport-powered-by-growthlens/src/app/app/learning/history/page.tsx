"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { getLearningHistory } from "@/lib/evidenceApi";
import {
  ActiveDomainSelectorBar,
} from "@/components/app/LearningBadges";
import {
  History,
  Filter,
  Download,
  Calendar,
  CheckCircle,
  Award,
  FolderGit2,
  LifeBuoy,
  BookOpen,
  ArrowRight,
  ExternalLink,
  Code,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function LearningHistoryPage() {
  const { learningHistory, activeBlueprint } = useEvidence();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [copiedExport, setCopiedExport] = useState<boolean>(false);
  const [serverEvents, setServerEvents] = useState<any[] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLiveHistory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await getLearningHistory({ limit: 100 });
      if (res && Array.isArray(res.activities)) {
        const mapped = res.activities.map((a: any) => ({
          id: a.id,
          timestamp: a.created_at ? new Date(a.created_at).toLocaleString() : "Recently",
          type: a.activity_type,
          title: a.title,
          domain_id: a.domain_id || "general",
          topic_id: a.step_id || undefined,
          step_id: a.step_id || undefined,
          roadmap_id: a.roadmap_id || undefined,
          detail: a.detail || "",
          link_route: a.link_route || undefined,
          score: a.score != null ? a.score : undefined,
          activity_status: a.activity_status,
          activity_metadata: a.activity_metadata,
          created_at: a.created_at,
        }));
        setServerEvents(mapped);
      }
    } catch (e) {
      console.warn("Could not fetch server learning history:", e);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveHistory();
  }, [fetchLiveHistory]);

  const allDisplayHistory = useMemo(() => {
    if (serverEvents !== null) {
      return serverEvents;
    }
    return learningHistory || [];
  }, [serverEvents, learningHistory]);

  const filteredHistory = useMemo(() => {
    return allDisplayHistory.filter((ev) => {
      if (selectedType !== "all" && ev.type !== selectedType) return false;
      return true;
    });
  }, [allDisplayHistory, selectedType]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allDisplayHistory, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `skillpassport_learning_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2500);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "diagnostic":
        return { label: "Diagnostic", icon: Sparkles, color: "bg-purple-100 text-purple-900 border-purple-200" };
      case "step_completed":
        return { label: "Step Completed", icon: CheckCircle, color: "bg-emerald-100 text-emerald-900 border-emerald-200" };
      case "resource_viewed":
        return { label: "Resource Viewed", icon: BookOpen, color: "bg-blue-100 text-blue-900 border-blue-200" };
      case "practice_completed":
      case "practice_attempted":
        return { label: "Practice", icon: Code, color: "bg-amber-100 text-amber-900 border-amber-200" };
      case "assessment_attempt":
      case "assessment_completed":
        return { label: "Assessment", icon: Award, color: "bg-rose-100 text-rose-900 border-rose-200" };
      case "project_submitted":
        return { label: "Mini-Project Submitted", icon: FolderGit2, color: "bg-indigo-100 text-indigo-900 border-indigo-200" };
      case "project_evaluated":
        return { label: "Mini-Project Evaluated", icon: FolderGit2, color: "bg-teal-100 text-teal-900 border-teal-200" };
      case "roadmap_started":
        return { label: "Roadmap Started", icon: Sparkles, color: "bg-cyan-100 text-cyan-900 border-cyan-200" };
      case "remediation_completed":
        return { label: "Remediation", icon: LifeBuoy, color: "bg-orange-100 text-orange-900 border-orange-200" };
      default:
        return { label: "Activity", icon: History, color: "bg-stone-100 text-stone-900 border-stone-200" };
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Learning Activity History"
        description="Immutable chronology of all diagnostic tests, learning packets, practice submissions, formal assessments, and project evaluations. Every action directly feeds the 4-signal mastery telemetry."
        badge="Domain 5 · Auditable Activity Stream"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={fetchLiveHistory}
            disabled={isRefreshing}
            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-amber-600" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            onClick={handleExportJSON}
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            {copiedExport ? "Audit Log Exported!" : "Export Audit Log (JSON)"}
          </button>
          <Link
            href="/app/learning/capability"
            className="pill-btn pill-btn-primary text-xs"
          >
            View Candidate Evidence &rarr;
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        <ActiveDomainSelectorBar />

      {/* Filter Toolbar */}
      <div className="gl-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-bold text-ink/60 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Filter by Event:
            </div>
            {[
              { id: "all", label: "All Events" },
              { id: "diagnostic", label: "Diagnostics" },
              { id: "step_completed", label: "Steps" },
              { id: "resource_viewed", label: "Resources" },
              { id: "practice_completed", label: "Practice" },
              { id: "assessment_attempt", label: "Assessments" },
              { id: "project_submitted", label: "Mini-Projects" },
              { id: "remediation_completed", label: "Remediation" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedType(f.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedType === f.id
                    ? "bg-ink text-paper shadow-sm"
                    : "bg-paper hover:bg-card-hover text-ink/70 border border-ink/10"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="text-xs font-medium text-ink/60">
            Showing <span className="font-bold text-ink">{filteredHistory.length}</span> recorded events
          </div>
        </div>
      </div>

      {/* Chronological Timeline Stream */}
      <div className="space-y-4">
        {filteredHistory.map((item, idx) => {
          const badge = getTypeBadge(item.type);
          const IconComp = badge.icon;

          return (
            <div
              key={item.id}
              className="gl-card p-5 transition-all hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badge.color}`}
                >
                  <IconComp className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-ink/50 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {item.timestamp}
                    </span>
                    <span className="text-xs font-mono text-ink/40">
                      ID: {item.id}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-ink">
                    {item.title}
                  </h3>
                  <p className="text-xs text-ink/70 leading-relaxed max-w-3xl">
                    {item.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                {item.score !== undefined && (
                  <div className="text-right">
                    <div className="text-[10px] text-ink/50 font-bold uppercase">
                      Score / Outcome
                    </div>
                    <div className="text-sm font-extrabold text-ink">
                      {item.score}%
                    </div>
                  </div>
                )}

                {item.link_route && (
                  <Link
                    href={item.link_route}
                    className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
                  >
                    Inspect
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}

        {filteredHistory.length === 0 && (
          <div className="gl-card p-12 text-center text-ink/60">
            <History className="w-8 h-8 mx-auto text-ink/30 mb-2" />
            <p className="font-semibold">No history events match your filter.</p>
            <button
              onClick={() => setSelectedType("all")}
              className="mt-3 text-xs text-ink underline font-medium"
            >
              Show all events
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
