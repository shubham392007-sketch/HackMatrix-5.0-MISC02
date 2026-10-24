"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  StepStatusBadge,
  TopicDifficultyBadge,
  MasteryProgressBar,
  ActiveDomainSelectorBar,
} from "@/components/app/LearningBadges";
import AppTopBar from "@/components/app/AppTopBar";
import {
  BookOpen,
  GraduationCap,
  Layers,
  Clock,
  Target,
  ArrowRight,
  Lock,
  CheckCircle2,
  Sparkles,
  Info,
  Code2,
  PlayCircle,
  FileText,
  AlertCircle,
} from "lucide-react";
import { getDomainBlueprint } from "@/lib/evidenceApi";

export default function DomainBlueprintDetailPage() {
  const params = useParams();
  const domainId = params?.domainId as string;

  const { blueprints, activeRoadmap, setActiveDomainId } = useEvidence();
  const [fetchedBlueprint, setFetchedBlueprint] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setFetchedBlueprint(null);
    setActiveDomainId(domainId);

    const existing = blueprints.find((b) => b.domain_id === domainId);
    if (existing && existing.modules && existing.modules.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getDomainBlueprint(domainId)
      .then((res) => {
        if (isMounted && res) {
          setFetchedBlueprint(res);
        }
      })
      .catch((e) => {
        console.warn("Could not fetch remote blueprint:", e);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [domainId, blueprints, setActiveDomainId]);

  const blueprint = useMemo(() => {
    const fromContext = blueprints.find((b) => b.domain_id === domainId);
    if (fromContext && fromContext.modules && fromContext.modules.length > 0) {
      return fromContext;
    }
    if (fetchedBlueprint && fetchedBlueprint.domain_id === domainId) {
      return fetchedBlueprint;
    }
    return fromContext || fetchedBlueprint || null;
  }, [blueprints, domainId, fetchedBlueprint]);

  if (loading && !blueprint) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-4">
        <Sparkles className="w-8 h-8 animate-spin text-ink/40" />
        <p className="text-xs font-mono text-ink-muted">Loading learning blueprint from database...</p>
      </div>
    );
  }

  if (!blueprint || !blueprint.modules) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 space-y-4 text-center">
        <AlertCircle className="w-10 h-10 text-ink/30 mx-auto" />
        <h3 className="text-base font-bold text-ink">Blueprint Not Found</h3>
        <p className="text-xs text-ink/70 max-w-sm mx-auto">
          We could not resolve curriculum blueprint "{domainId}".
        </p>
        <Link href="/app/learning" className="pill-btn pill-btn-primary text-xs py-2 px-4">
          Return to Learning Hub &rarr;
        </Link>
      </div>
    );
  }

  const rawTitle = blueprint.title || domainId;
  const cleanTitle = (!rawTitle || rawTitle.toLowerCase().includes("custom") || rawTitle === "Domain Custom")
    ? domainId.replace(/^domain-/, "").replace(/^skill-/, "").replace(/^gap-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : rawTitle;

  const totalTopics = blueprint.modules.flatMap((m: any) => m.topics || []).length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={`${cleanTitle} Blueprint`}
        description={blueprint.description}
        badge={blueprint.version}
        badgeColor="border-sky-300 text-sky-900 bg-sky-100"
      >
        <Link
          href="/app/learning/domains"
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <BookOpen className="w-3.5 h-3.5" />
          Browse All Blueprints
        </Link>
        <Link
          href={`/app/learning/domains/${blueprint.domain_id}/diagnostic`}
          className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
        >
          <Target className="w-3.5 h-3.5" />
          Take Diagnostic Check
        </Link>
        <Link
          href={`/app/learning/roadmaps/roadmap-${blueprint.domain_id}`}
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <GraduationCap className="w-3.5 h-3.5" />
          Personalized Roadmap &rarr;
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Domain Switcher */}
      <ActiveDomainSelectorBar />

      {/* Blueprint Header Stats */}
      <div className="gl-card p-6 md:p-8 space-y-6 bg-[#FAF8F5] border-ink/15">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">
              Blueprint Status
            </span>
            <span className="font-bold text-ink capitalize text-sm block">
              {blueprint.status} &bull; {blueprint.version}
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">
              Curriculum Scope
            </span>
            <span className="font-bold text-ink text-sm block">
              {blueprint.modules.length} Modules &bull; {totalTopics} Topics
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">
              Estimated Duration
            </span>
            <span className="font-bold text-ink text-sm block">
              ~{blueprint.estimated_hours} Hours Total
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-white border border-ink/10 space-y-1">
            <span className="text-[10px] font-mono uppercase text-ink-muted block">
              Target Mastery
            </span>
            <span className="font-bold text-ink text-sm block">
              {blueprint.target_mastery}% (Required for Clearance)
            </span>
          </div>
        </div>

        {/* High-Level Learning Objectives */}
        <div className="p-4 rounded-2xl bg-white border border-ink/10 space-y-2 text-xs">
          <span className="font-bold text-ink flex items-center gap-1.5 text-sm">
            <Sparkles className="w-4 h-4 text-ink" />
            Core Domain Competency Objectives
          </span>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-ink/80 pt-1">
            {(blueprint.learning_objectives || []).map((obj: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-relaxed">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Module & Topic Hierarchy Breakdown */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink flex items-center gap-2">
            <Layers className="w-5 h-5 text-ink" />
            Curriculum Structure & Dependency Hierarchy
          </h2>
          <span className="text-xs text-ink-muted font-mono">
            Structured Topic Hierarchy
          </span>
        </div>

        {(blueprint.modules || []).map((module: any, mIdx: number) => (
          <div key={module.id} className="gl-card p-6 space-y-4 border-ink/15">
            <div className="flex items-start justify-between gap-4 pb-2 border-b border-ink/10">
              <div>
                <span className="text-[10px] font-mono uppercase text-ink-muted block">
                  Module {mIdx + 1}
                </span>
                <h3 className="text-base font-bold text-ink">{module.title}</h3>
                <p className="text-xs text-ink-muted mt-0.5">{module.description}</p>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded bg-sand/30 text-ink shrink-0">
                {(module.topics || []).length} Topics
              </span>
            </div>

            {/* Topics inside this module */}
            <div className="space-y-3">
              {(module.topics || []).map((topic: any) => (
                <div
                  key={topic.id}
                  className="p-4 rounded-2xl bg-white border border-ink/10 space-y-3 hover:shadow-sm transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StepStatusBadge status={topic.status} />
                        <TopicDifficultyBadge difficulty={topic.difficulty} />
                        <span className="text-[10px] font-mono text-ink-muted flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {topic.estimated_minutes} min
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-ink">{topic.title}</h4>
                      <p className="text-xs text-ink/80 leading-relaxed max-w-2xl">
                        <strong>Measurable Objective:</strong> {topic.learning_objective}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono text-ink-muted uppercase block">
                        Mastery
                      </span>
                      <span className="text-lg font-mono font-black text-ink">
                        {topic.current_mastery}%
                      </span>
                    </div>
                  </div>

                  {/* Prerequisites & Signals Row */}
                  <div className="pt-2 border-t border-ink/5 flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-ink-muted flex-wrap">
                      <span>Prerequisites:</span>
                      {(topic.prerequisites || []).length === 0 ? (
                        <span className="text-emerald-700 font-medium">None (Entry Point)</span>
                      ) : (
                        (topic.prerequisites || []).map((p: string) => (
                          <span
                            key={p}
                            className="font-mono text-[10px] px-2 py-0.2 rounded bg-sand/30 text-ink"
                          >
                            {p.replace("topic-", "")}
                          </span>
                        ))
                      )}
                    </div>

                    {(() => {
                      const matchingStep = activeRoadmap?.steps?.find(
                        (s) => s.topic_id === topic.id || s.step_id === `step-${topic.id}` || s.step_id === topic.id
                      );
                      const stepHref = matchingStep
                        ? `/app/learning/steps/${matchingStep.step_id}?roadmap_id=${encodeURIComponent(activeRoadmap.path_id || activeRoadmap.id || "")}`
                        : `/app/learning/steps/step-${topic.id}?roadmap_id=roadmap-${blueprint.domain_id}`;

                      return (
                        <div className="flex items-center gap-2">
                          <Link
                            href={stepHref}
                            className="pill-btn bg-sand/20 hover:bg-sand/40 text-ink text-[11px] py-1 px-3 flex items-center gap-1 font-semibold"
                          >
                            <PlayCircle className="w-3 h-3" />
                            Study Packet
                          </Link>
                          <Link
                            href="/app/learning/practice"
                            className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-[11px] py-1 px-3 flex items-center gap-1 font-semibold"
                          >
                            <Code2 className="w-3 h-3" />
                            Practice
                          </Link>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);
}
