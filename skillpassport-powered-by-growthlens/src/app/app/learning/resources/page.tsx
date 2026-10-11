"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { TopicDifficultyBadge, ActiveDomainSelectorBar } from "@/components/app/LearningBadges";
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
} from "lucide-react";
import { LearningResource } from "@/types/learning";

export default function LearningResourcesPage() {
  const { resources, activeDomainId, activeBlueprint } = useEvidence();

  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewedResourceIds, setViewedResourceIds] = useState<string[]>([]);

  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const matchesDomain = res.domain_id === activeDomainId;
      const matchesType =
        selectedType === "all" || res.resource_type === selectedType;
      const matchesDiff =
        selectedDifficulty === "all" || res.difficulty === selectedDifficulty;
      const matchesSearch =
        res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.learning_objective.toLowerCase().includes(searchQuery.toLowerCase()) ||
        res.provider.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDomain && matchesType && matchesDiff && matchesSearch;
    });
  }, [resources, activeDomainId, selectedType, selectedDifficulty, searchQuery]);

  const handleMarkViewed = (resId: string) => {
    setViewedResourceIds((prev) =>
      prev.includes(resId) ? prev : [...prev, resId]
    );
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/60 text-ink border border-ink/20 font-bold">
              Domain 5 &bull; Screen 6
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              Objective-Specific Resources
            </span>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sand/30 text-ink-muted">
              DEMO DATA
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-ink">
            Curated Learning Resources
          </h1>
          <p className="text-sm text-ink-muted mt-1 max-w-2xl">
            Targeted tutorials, articles, and documentation mapped directly to your diagnosed objectives.
            Ranked by relevance to your active learning roadmap.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/app/learning/roadmaps/roadmap-${activeDomainId}`}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            Personalized Roadmap &rarr;
          </Link>
        </div>
      </div>

      {/* Domain Switcher */}
      <ActiveDomainSelectorBar />

      {/* Critical Mastery Notice */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          <strong>Pedagogical Integrity Rule:</strong> Watching videos or reviewing guides supports concept formation, but <em>does not award mastery</em> on your roadmap or SkillPassport. Mastery requires passing knowledge assessments and submitting applied mini-project deliverables.
        </p>
      </div>

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

        {/* Search & Difficulty */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pill-input text-xs py-1.5 pl-8 pr-3 w-40 md:w-56 bg-white"
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
                      <TopicDifficultyBadge difficulty={res.difficulty} />
                      <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {res.duration_minutes} min
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-ink mt-1">
                      {res.title}
                    </h3>
                    <span className="text-xs text-ink-muted font-medium block">
                      Provider: <strong>{res.provider}</strong>
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
  );
}
