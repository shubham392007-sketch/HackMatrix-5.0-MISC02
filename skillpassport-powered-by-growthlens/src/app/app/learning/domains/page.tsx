"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { ActiveDomainSelectorBar } from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  BookOpen,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Search,
  Filter,
  GraduationCap,
  Briefcase,
  Compass,
} from "lucide-react";
import { listDomainBlueprints } from "@/lib/evidenceApi";
import { DomainBlueprint } from "@/types/learning";

function cleanBlueprintTitle(rawTitle: string | undefined, domainId: string): string {
  if (!rawTitle) return domainId.replace(/^domain-/, "").replace(/^gap-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (rawTitle.toLowerCase().includes("custom") || rawTitle === "Domain Custom") {
    return domainId
      .replace(/^domain-/, "")
      .replace(/^skill-/, "")
      .replace(/^gap-/, "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return rawTitle;
}

export default function DomainBlueprintsCatalogPage() {
  const {
    blueprints,
    activeDomainId,
    setActiveDomainId,
    activeTargetRole,
    activeBlueprint,
  } = useEvidence();

  const [remoteBlueprints, setRemoteBlueprints] = useState<DomainBlueprint[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    listDomainBlueprints()
      .then((res) => {
        if (!isMounted) return;
        if (res && Array.isArray(res.blueprints) && res.blueprints.length > 0) {
          setRemoteBlueprints(res.blueprints);
        }
      })
      .catch((err) => {
        console.warn("Could not fetch remote blueprints:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const allBlueprints = useMemo(() => {
    const list = remoteBlueprints.length > 0 ? remoteBlueprints : blueprints;
    const seen = new Set<string>();
    const deduped: DomainBlueprint[] = [];
    for (const b of list) {
      if (!seen.has(b.domain_id)) {
        seen.add(b.domain_id);
        deduped.push(b);
      }
    }
    return deduped;
  }, [remoteBlueprints, blueprints]);

  const filteredBlueprints = useMemo(() => {
    return allBlueprints.filter((b) => {
      const title = cleanBlueprintTitle(b.title, b.domain_id).toLowerCase();
      const desc = (b.description || "").toLowerCase();
      const query = searchQuery.toLowerCase();
      const matchesSearch = !query || title.includes(query) || desc.includes(query) || b.domain_id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (categoryFilter === "data") {
        return b.domain_id.includes("data") || title.includes("data") || title.includes("preprocessing");
      }
      if (categoryFilter === "cloud") {
        return b.domain_id.includes("cloud") || b.domain_id.includes("infra") || b.domain_id.includes("docker") || title.includes("cloud") || title.includes("docker");
      }
      if (categoryFilter === "systems") {
        return b.domain_id.includes("sys") || b.domain_id.includes("dist") || title.includes("system") || title.includes("relational");
      }
      return true;
    });
  }, [allBlueprints, searchQuery, categoryFilter]);

  const effectiveRoleTitle = activeTargetRole?.has_target
    ? activeTargetRole.role_title
    : "Target Career Role";

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Curriculum Domain Blueprints"
        description="Standardized, prerequisite-aware syllabus architectures covering data engineering, cloud infrastructure, ML workflows, and distributed systems."
        badge={`${allBlueprints.length} Curricula Available`}
        badgeColor="border-sky-300 text-sky-900 bg-sky-100"
      >
        <Link
          href={`/app/learning/domains/${activeDomainId}/diagnostic`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5" />
          Active Diagnostic Check
        </Link>
        <Link
          href="/app/learning"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Learning Overview &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* Active Domain Selector Bar */}
        <ActiveDomainSelectorBar />

        {/* Target Role Guidance Banner */}
        {activeTargetRole?.has_target && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cream via-sand/20 to-white border border-ink/15 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-lime/40 border border-ink/15 flex items-center justify-center shrink-0 text-ink">
                <Compass className="w-4 h-4 text-ink" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-ink-muted uppercase tracking-wider block">
                  Target Role Curriculum Alignment
                </span>
                <span className="font-bold text-ink text-sm">
                  Blueprints calibrated for {effectiveRoleTitle}
                </span>
              </div>
            </div>
            <Link
              href="/app/career/priorities"
              className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 text-ink font-semibold flex items-center gap-1.5 shrink-0 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-ink" />
              View Career Gaps &rarr;
            </Link>
          </div>
        )}

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter blueprints by name, concept, or domain..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-ink/15 focus:outline-none focus:ring-2 focus:ring-lime text-ink"
            />
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
            {[
              { id: "all", label: "All Curricula" },
              { id: "data", label: "Data & ML" },
              { id: "cloud", label: "Cloud & DevOps" },
              { id: "systems", label: "Systems & Backend" },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  categoryFilter === cat.id
                    ? "bg-ink text-white"
                    : "bg-white text-ink border border-ink/15 hover:bg-sand/20"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Blueprints Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredBlueprints.map((b) => {
            const cleanTitle = cleanBlueprintTitle(b.title, b.domain_id);
            const isActive = b.domain_id === activeDomainId;
            const totalTopics = (b.modules || []).flatMap((m: any) => m.topics || []).length;

            return (
              <div
                key={b.domain_id}
                className={`gl-card p-6 flex flex-col justify-between space-y-5 transition-all border-ink/15 ${
                  isActive ? "ring-2 ring-ink bg-white shadow-md" : "bg-white/90 hover:shadow-sm"
                }`}
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-lime text-ink font-bold border border-ink/15">
                          {b.version || "v1.0"}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink font-bold">
                          {b.status || "active"}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold">
                            Active Selection
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-ink text-base sm:text-lg">
                        {cleanTitle}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-ink block">
                        ~{b.estimated_hours || 40}h
                      </span>
                      <span className="text-[10px] text-ink-muted font-mono block">
                        Target: {b.target_mastery || 80}%
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-ink/75 leading-relaxed">
                    {b.description || "Structured pedagogical blueprint defining prerequisite hierarchies, module topics, and verified knowledge evaluations."}
                  </p>

                  {/* Curriculum Hierarchy Summary */}
                  <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-ink/10 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-ink flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-ink" />
                        Curriculum Scope:
                      </span>
                      <span className="font-mono text-ink-muted text-[10px]">
                        {(b.modules || []).length} Modules &bull; {totalTopics} Topics
                      </span>
                    </div>

                    {/* Module Names Preview */}
                    <div className="space-y-1 pt-1 border-t border-ink/5">
                      {(b.modules || []).slice(0, 3).map((mod: any, mIdx: number) => (
                        <div key={mod.id || mIdx} className="flex items-center justify-between text-[11px] text-ink-muted">
                          <span className="truncate pr-2 font-medium">
                            {mIdx + 1}. {mod.title}
                          </span>
                          <span className="font-mono text-[10px] shrink-0">
                            {(mod.topics || []).length} topics
                          </span>
                        </div>
                      ))}
                      {(b.modules || []).length > 3 && (
                        <span className="text-[10px] text-ink-muted italic block pt-0.5">
                          + {(b.modules || []).length - 3} more modules...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/app/learning/domains/${b.domain_id}/diagnostic`}
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 text-ink flex items-center gap-1 font-medium shadow-xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                      Diagnostic
                    </Link>
                  </div>

                  <Link
                    href={`/app/learning/domains/${b.domain_id}`}
                    onClick={() => setActiveDomainId(b.domain_id)}
                    className="pill-btn pill-btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1 shadow-sm"
                  >
                    Explore Blueprint
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredBlueprints.length === 0 && (
          <div className="gl-card p-12 text-center max-w-md mx-auto space-y-3 bg-[#FAF8F5] border-ink/15">
            <BookOpen className="w-8 h-8 text-ink-muted mx-auto" />
            <h4 className="font-bold text-ink text-sm">No Matching Blueprints Found</h4>
            <p className="text-xs text-ink-muted">
              No curriculum blueprint matched your search query. Try clearing the filter or exploring all available domains.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
              }}
              className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-1.5 px-3 text-ink font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
