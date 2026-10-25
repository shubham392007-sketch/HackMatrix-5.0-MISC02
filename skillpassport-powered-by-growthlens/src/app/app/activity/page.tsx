"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { ActivityCategory, UnifiedActivityEvent } from "@/types/account";
import { EmptyState } from "@/components/app/AppStates";
import {
  Clock,
  Search,
  Filter,
  ExternalLink,
  Layers,
  Scale,
  GraduationCap,
  Share2,
  FolderGit2,
  User,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function ActivityHistoryPage() {
  const { unifiedActivities } = useEvidence();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | ActivityCategory
  >("all");

  const filteredActivities = unifiedActivities.filter((act) => {
    if (selectedCategory !== "all" && act.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = act.title.toLowerCase().includes(q);
      const matchDesc = act.description.toLowerCase().includes(q);
      const matchDomain = act.sourceDomain.toLowerCase().includes(q);
      const matchActor = act.actor ? act.actor.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchDomain || matchActor;
    }
    return true;
  });

  const getCategoryIcon = (category: ActivityCategory) => {
    switch (category) {
      case "profile":
        return User;
      case "connection":
        return FolderGit2;
      case "evidence":
        return Layers;
      case "verification":
        return Scale;
      case "learning":
        return GraduationCap;
      case "sharing":
        return Share2;
      case "privacy":
        return ShieldCheck;
      default:
        return Clock;
    }
  };

  const getStatusBadge = (status: UnifiedActivityEvent["status"]) => {
    switch (status) {
      case "completed":
        return {
          icon: CheckCircle2,
          color: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "COMPLETED",
        };
      case "revoked":
        return {
          icon: XCircle,
          color: "bg-rose-50 text-rose-800 border-rose-200",
          label: "REVOKED",
        };
      case "flagged":
        return {
          icon: AlertTriangle,
          color: "bg-amber-50 text-amber-800 border-amber-200",
          label: "FLAGGED",
        };
      default:
        return {
          icon: Clock,
          color: "bg-slate-50 text-slate-800 border-slate-200",
          label: "LOGGED",
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Activity History & Audit Feed"
        description="Chronological audit timeline of account updates, repository ingestions, verification gates, and sharing events."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Activity History" },
        ]}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto pb-16">
        {/* Filter & Search Bar */}
        <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activity by title, description, or domain..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-ink/20 text-xs text-ink placeholder:text-ink/40 bg-white font-medium focus:outline-none focus:border-ink"
              />
            </div>

            {(searchQuery || selectedCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="px-3 py-1.5 rounded-xl border border-ink/20 text-ink text-xs font-semibold hover:bg-ink/5 transition-all flex items-center gap-1.5 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 text-ink/60" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
            {(
              [
                { id: "all", label: "All Categories" },
                { id: "profile", label: "Profile" },
                { id: "connection", label: "Sources" },
                { id: "evidence", label: "Evidence" },
                { id: "verification", label: "Verification" },
                { id: "learning", label: "Learning" },
                { id: "sharing", label: "Sharing" },
                { id: "privacy", label: "Privacy" },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                  selectedCategory === cat.id
                    ? "bg-ink text-[#FBF1CF] border-ink"
                    : "bg-white text-ink/70 border-ink/15 hover:bg-ink/5"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Activity Timeline Feed */}
        <div className="space-y-3">
          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No Activity Events Recorded"
              description="No activity has been recorded for this period. As you update your profile, connect repositories, or undergo skill verification reviews, events will appear here."
              actionLabel="Show All Activity"
              onAction={() => {
                setSearchQuery("");
                setSelectedCategory("all");
              }}
            />
          ) : (
            filteredActivities.map((act) => {
              const CategoryIcon = getCategoryIcon(act.category);
              const status = getStatusBadge(act.status);
              const StatusIcon = status.icon;

              return (
                <div
                  key={act.id}
                  className="p-5 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-3 hover:border-ink/30 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-ink/5 border border-ink/10 flex items-center justify-center text-ink shrink-0 mt-0.5">
                        <CategoryIcon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-ink">
                            {act.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-md font-mono text-[10px] font-bold border ${status.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-xs text-ink/75 leading-relaxed">
                          {act.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-ink/50 shrink-0 font-mono">
                      {act.timestamp}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink/10 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-ink/60 bg-ink/5 px-2 py-0.5 rounded">
                        {act.sourceDomain}
                      </span>
                      {act.actor && (
                        <span className="text-[11px] text-ink/50">
                          Actor: {act.actor}
                        </span>
                      )}
                    </div>

                    {act.route && (
                      <Link
                        href={act.route}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink/80 hover:text-ink underline"
                      >
                        <span>Open Detailed View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
