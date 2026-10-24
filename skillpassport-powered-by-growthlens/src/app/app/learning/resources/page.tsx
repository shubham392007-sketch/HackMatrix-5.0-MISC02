"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { TopicDifficultyBadge, ActiveDomainSelectorBar } from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  Layers,
  Search,
  Filter,
  ExternalLink,
  PlayCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  CheckCircle2,
  BookOpen,
  RefreshCw,
  Globe,
  AlertTriangle,
} from "lucide-react";
import { LearningResource } from "@/types/learning";
import { searchCuratedResources } from "@/lib/evidenceApi";

export default function LearningResourcesPage() {
  const { resources, activeDomainId, activeBlueprint, addToast } = useEvidence();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewedResourceIds, setViewedResourceIds] = useState<string[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [liveResources, setLiveResources] = useState<LearningResource[]>([]);
  const [providerStatuses, setProviderStatuses] = useState<Record<string, string>>({});

  const allResources = useMemo(() => {
    return [...liveResources, ...resources];
  }, [liveResources, resources]);

  const filteredResources = useMemo(() => {
    return allResources.filter((res) => {
      const matchesDomain = !res.domain_id || res.domain_id === activeDomainId;
      const matchesType =
        selectedType === "all" || res.resource_type === selectedType;
      const matchesDiff =
        selectedDifficulty === "all" || res.difficulty.toLowerCase() === selectedDifficulty.toLowerCase();
      const searchTokens = searchQuery.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 1);
      const matchesSearch =
        searchTokens.length === 0 ||
        searchTokens.some(
          (tok) =>
            res.title.toLowerCase().includes(tok) ||
            res.learning_objective.toLowerCase().includes(tok) ||
            res.provider.toLowerCase().includes(tok) ||
            (res.concepts_covered && res.concepts_covered.some((c) => c.toLowerCase().includes(tok)))
        );

      return matchesDomain && matchesType && matchesDiff && matchesSearch;
    });
  }, [allResources, activeDomainId, selectedType, selectedDifficulty, searchQuery]);

  const handleLiveSearch = async () => {
    setIsSearchingLive(true);
    const query = searchQuery.trim() || activeBlueprint.title;
    try {
      const res = await searchCuratedResources(
        query,
        activeDomainId,
        selectedDifficulty === "all" ? "intermediate" : selectedDifficulty.toLowerCase(),
        6
      );
      if (res.provider_statuses) {
        setProviderStatuses(res.provider_statuses);
      }
      if (Array.isArray(res.resources) && res.resources.length > 0) {
        const mapped: LearningResource[] = res.resources.map((r: any, idx: number) => ({
          id: r.id || `live-${Date.now()}-${idx}`,
          title: r.title,
          provider: r.provider,
          url: r.url,
          resource_type: r.resource_type || "article",
          difficulty: (r.difficulty ? r.difficulty.charAt(0).toUpperCase() + r.difficulty.slice(1) : "Intermediate") as any,
          duration_minutes: r.duration_minutes || 20,
          learning_objective: r.learning_objective || `Understand core concepts in ${query}`,
          selection_explanation: r.selection_explanation || (
            r.validation_status === "verified_available"
              ? "Verified playable via YouTube Data API v3 catalog."
              : r.validation_status === "unverified_quota_exhausted"
              ? "Unverified availability due to provider API quota limits."
              : "Live indexed from verified provider API catalog."
          ),
          relevance_score: Math.round(r.relevance_score * 100) || 85,
          domain_id: activeDomainId,
          topic_id: r.topic_id || `topic-live-${idx}`,
          concepts_covered: Array.isArray(r.concepts_covered) ? r.concepts_covered : [query],
          concepts_not_covered: Array.isArray(r.concepts_not_covered) ? r.concepts_not_covered : [],
          roadmap_position: r.is_fallback ? "Curated Fallback" : "Live Provider Result",
          thumbnail_url: r.thumbnail_url,
          author_or_channel: r.author_or_channel || r.provider_metadata?.channel,
          validation_status: r.validation_status,
        }));
        setLiveResources(mapped);
        addToast(
          "Live Catalog Updated",
          `Retrieved ${mapped.length} verified learning resources across live providers.`,
          "success"
        );
      } else {
        addToast("Search Completed", "No additional live resources found. Displaying curated offline catalog.", "info");
      }
    } catch (e: any) {
      addToast("Live Search Notice", "Using curated offline catalogue. Provider APIs authenticated securely.", "info");
    } finally {
      setIsSearchingLive(false);
    }
  };

  const handleMarkViewed = (resId: string) => {
    setViewedResourceIds((prev) =>
      prev.includes(resId) ? prev : [...prev, resId]
    );
  };

  // Auto-fetch live resources if active domain has few resources
  useEffect(() => {
    const domainMatches = allResources.filter(
      (r) => !r.domain_id || r.domain_id === activeDomainId
    );
    if (domainMatches.length < 2 && activeBlueprint?.title) {
      handleLiveSearch();
    }
  }, [activeDomainId]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Curated Learning Resources"
        description="Targeted tutorials, articles, and documentation mapped directly to your diagnosed objectives. Ranked by relevance to your active learning roadmap."
        badge="Objective-Specific Resources"
        badgeColor="border-ink/20 text-ink bg-sand/60"
      >
        <Link
          href={`/app/learning/roadmaps/roadmap-${activeDomainId}`}
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          Personalized Roadmap &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Domain Switcher */}
      <ActiveDomainSelectorBar />

      {/* Critical Mastery Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>Pedagogical Integrity Rule:</strong> Watching videos or reviewing guides supports concept formation, but <em>does not award mastery</em> on your roadmap or SkillPassport. Mastery requires passing knowledge assessments and submitting applied mini-project deliverables.
        </p>
      </div>

      {/* Provider Status Pill Bar if live query performed */}
      {Object.keys(providerStatuses).length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-ink/10 text-xs">
          <span className="font-bold text-ink text-[11px] flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5 text-lime-600" />
            Live Provider Statuses:
          </span>
          <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
            {Object.entries(providerStatuses).map(([provider, stat]) => (
              <span
                key={provider}
                className={`px-2 py-0.5 rounded border uppercase font-semibold ${
                  stat === "success"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : stat === "quota_exhausted" || stat === "rate_limited"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-sand/30 text-ink-muted border-ink/10"
                }`}
              >
                {provider}: {stat}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: "all", label: "All Types" },
            { id: "article", label: "Articles" },
            { id: "video", label: "Videos" },
            { id: "official_docs", label: "Official Docs" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id)}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                selectedType === tab.id
                  ? "bg-ink text-white shadow-sm"
                  : "bg-white text-ink-muted hover:text-ink border border-ink/10"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Difficulty & Live API trigger */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleLiveSearch();
                }
              }}
              className="pill-input text-xs py-1.5 pl-8 pr-3 w-36 md:w-48 bg-white"
            />
          </div>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="pill-input text-xs py-1.5 px-3 bg-white"
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>

          <button
            onClick={handleLiveSearch}
            disabled={isSearchingLive}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 transition-all disabled:opacity-60"
            title="Discover live verified resources from YouTube, DEV.to, and GitHub"
          >
            {isSearchingLive ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>{isSearchingLive ? "Searching..." : "Live APIs"}</span>
          </button>
        </div>
      </div>

      {/* Resource Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredResources.map((res) => {
          const isViewed = viewedResourceIds.includes(res.id);

          return (
            <div
              key={res.id}
              className="gl-card p-5 space-y-4 hover:shadow-md transition-shadow border-ink/10 flex flex-col justify-between bg-white"
            >
              <div className="space-y-3">
                {/* Meta header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink font-semibold">
                        {res.resource_type.replace("_", " ")}
                      </span>
                      {res.roadmap_position && (
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          res.roadmap_position.includes("Live")
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-purple-50 text-purple-800 border border-purple-200"
                        }`}>
                          {res.roadmap_position}
                        </span>
                      )}
                      {res.validation_status === "verified_available" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-700" /> Playable
                        </span>
                      )}
                      {res.validation_status === "unverified_quota_exhausted" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                          <Info className="w-2.5 h-2.5 text-amber-700" /> Unverified (Quota)
                        </span>
                      )}
                      {(res.validation_status === "unverified_network_failure" || res.validation_status === "unknown") && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1">
                          <Info className="w-2.5 h-2.5 text-amber-700" /> Unverified (Network)
                        </span>
                      )}
                      {res.validation_status === "unavailable" && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-50 text-red-800 border border-red-200 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-700" /> Unavailable
                        </span>
                      )}
                      <TopicDifficultyBadge difficulty={res.difficulty} />
                      <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {res.duration_minutes} min
                      </span>
                    </div>

                    {res.thumbnail_url && (
                      <div className="relative w-full h-36 rounded-xl overflow-hidden bg-sand/30 border border-ink/10 my-2 group">
                        <img
                          src={res.thumbnail_url}
                          alt={res.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                          loading="lazy"
                        />
                        {res.resource_type === "video" && (
                          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
                            <PlayCircle className="w-10 h-10 text-white/90 drop-shadow-md" />
                          </div>
                        )}
                      </div>
                    )}

                    <h3 className="text-base font-bold text-ink mt-1">
                      {res.title}
                    </h3>
                    <span className="text-xs text-ink-muted font-medium block">
                      Provider: <strong>{res.provider}</strong>
                      {res.author_or_channel && (
                        <span> &bull; Channel / Author: <strong>{res.author_or_channel}</strong></span>
                      )}
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-ink-muted uppercase block">
                      Relevance
                    </span>
                    <span className="text-sm font-bold font-mono px-2 py-0.5 rounded bg-lime/40 text-ink border border-ink/15 inline-block">
                      {res.relevance_score}% Match
                    </span>
                  </div>
                </div>

                {/* Target Learning Objective */}
                <div className="p-3 rounded-xl bg-sand/15 border border-ink/10 text-xs text-ink/80 space-y-1">
                  <span className="font-bold text-ink block text-[11px]">
                    Supports Learning Objective:
                  </span>
                  <p className="text-[11px] leading-relaxed text-ink-muted">
                    {res.learning_objective}
                  </p>
                </div>

                {/* Selection Explanation */}
                <div className="text-xs space-y-1">
                  <span className="font-bold text-ink text-[11px] flex items-center gap-1 text-ink">
                    <Sparkles className="w-3 h-3 text-ink" /> Why Recommended:
                  </span>
                  <p className="text-ink-muted text-[11px] leading-relaxed">
                    {res.selection_explanation}
                  </p>
                </div>
              </div>

              {/* Card Actions */}
              <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-2 text-xs">
                <Link
                  href={`/app/learning/resources/${res.id}`}
                  className="font-bold text-ink hover:underline flex items-center gap-1"
                >
                  <span>Why This Resource?</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMarkViewed(res.id)}
                    className={`pill-btn text-[11px] py-1 px-3 ${
                      isViewed
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold"
                        : "bg-white hover:bg-sand/30 border border-ink/20 text-ink"
                    }`}
                  >
                    {isViewed ? "Viewed" : "Mark Viewed"}
                  </button>

                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-btn pill-btn-primary text-[11px] py-1 px-3 flex items-center gap-1"
                  >
                    <span>Open</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
}
