"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { TopicDifficultyBadge } from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Target,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  Layers,
  Map,
  Info,
} from "lucide-react";

export default function ResourceExplanationPage() {
  const params = useParams();
  const resourceId = params?.resourceId as string;

  const { resources, activeRoadmap } = useEvidence();

  const resource = useMemo(() => {
    return (
      resources.find((r) => r.id === resourceId) ||
      resources[0]
    );
  }, [resources, resourceId]);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={resource.title}
        description={`Provider: ${resource.provider} • Duration: ${resource.duration_minutes} min • Relevance: ${resource.relevance_score}%`}
        badge={resource.resource_type.replace("_", " ").toUpperCase()}
      >
        <Link
          href="/app/learning/resources"
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Resources
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Main Explainability Card */}
      <div className="gl-card p-6 md:p-8 space-y-6 border-ink/15 bg-white">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-sand/40 text-ink font-bold">
                {resource.resource_type.replace("_", " ")}
              </span>
              <TopicDifficultyBadge difficulty={resource.difficulty} />
              <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                <Clock className="w-3 h-3" /> {resource.duration_minutes} Minutes
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-ink">
              {resource.title}
            </h1>

            <p className="text-xs text-ink-muted font-medium">
              Provider / Author: <strong>{resource.provider}</strong>
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-sand/20 border border-ink/10 text-center shrink-0 min-w-[150px]">
            <span className="text-[10px] font-mono text-ink-muted uppercase block">
              Selection Match
            </span>
            <span className="text-3xl font-black text-ink">
              {resource.relevance_score}%
            </span>
            <span className="text-[10px] text-ink-muted block mt-0.5 font-mono">
              Objective-Aligned
            </span>
          </div>
        </div>

        {/* Explainability Callout: Why this resource was selected */}
        <div className="p-4 rounded-2xl bg-lime/15 border border-lime-300 space-y-1.5 text-xs">
          <span className="font-bold text-ink flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-ink" />
            Selection Rationale & Diagnosed Weakness Fit
          </span>
          <p className="text-ink/80 leading-relaxed text-xs">
            {resource.selection_explanation}
          </p>
        </div>

        {/* Target Objective & Position */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-sand/15 border border-ink/10 space-y-1">
            <span className="font-bold text-ink flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-ink-muted">
              Target Learning Objective
            </span>
            <p className="text-ink/80 leading-relaxed text-xs">
              {resource.learning_objective}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-sand/15 border border-ink/10 space-y-1">
            <span className="font-bold text-ink flex items-center gap-1 text-[11px] uppercase tracking-wider font-mono text-ink-muted">
              Roadmap Position
            </span>
            <p className="text-ink/80 leading-relaxed text-xs">
              {resource.roadmap_position}
            </p>
          </div>
        </div>

        {/* Scope Matrix: What it covers vs What it DOES NOT cover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-emerald-50/30 border border-emerald-200 space-y-2">
            <span className="font-bold text-emerald-950 flex items-center gap-1 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              What This Resource Covers
            </span>
            <ul className="space-y-1 text-emerald-900 text-[11px]">
              {resource.concepts_covered.map((concept, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="font-bold text-emerald-700">&bull;</span>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-red-50/20 border border-red-200 space-y-2">
            <span className="font-bold text-red-950 flex items-center gap-1 text-sm">
              <XCircle className="w-4 h-4 text-red-700" />
              What It Does NOT Cover (Out of Scope)
            </span>
            <ul className="space-y-1 text-red-900 text-[11px]">
              {resource.concepts_not_covered.map((concept, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  <span className="font-bold text-red-700">&bull;</span>
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3 text-xs">
          <Link
            href={`/app/learning/roadmaps/${activeRoadmap.path_id}`}
            className="pill-btn bg-sand/20 hover:bg-sand/40 text-ink py-2 px-4 flex items-center gap-1"
          >
            <Map className="w-3.5 h-3.5" />
            Return to Roadmap
          </Link>

          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pill-btn pill-btn-primary py-2 px-6 flex items-center gap-1.5"
          >
            <span>Open External Resource</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  </div>
);
}
