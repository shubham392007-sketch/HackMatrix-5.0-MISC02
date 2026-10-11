"use client";

import React, { useMemo } from "react";
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
} from "lucide-react";

export default function DomainBlueprintDetailPage() {
  const params = useParams();
  const domainId = params?.domainId as string;

  const { blueprints, activeRoadmap, setActiveDomainId } = useEvidence();

  const blueprint = useMemo(() => {
    return (
      blueprints.find((b) => b.domain_id === domainId) ||
      blueprints[0]
    );
  }, [blueprints, domainId]);

  const totalTopics = blueprint.modules.flatMap((m) => m.topics).length;

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title={`${blueprint.title} Blueprint`}
        description={blueprint.description}
        badge={blueprint.version}
        badgeColor="border-sky-300 text-sky-900 bg-sky-100"
      >
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
      <div className="gl-card p-6 md:p-8 space-y-6 bg-gradient-to-r from-cream via-white to-sand/20 border-ink/15">
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
            {blueprint.learning_objectives.map((obj, i) => (
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

        {blueprint.modules.map((module, mIdx) => (
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
                {module.topics.length} Topics
              </span>
            </div>

            {/* Topics inside this module */}
            <div className="space-y-3">
              {module.topics.map((topic) => (
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
                      {topic.prerequisites.length === 0 ? (
                        <span className="text-emerald-700 font-medium">None (Entry Point)</span>
                      ) : (
                        topic.prerequisites.map((p) => (
                          <span
                            key={p}
                            className="font-mono text-[10px] px-2 py-0.2 rounded bg-sand/30 text-ink"
                          >
                            {p.replace("topic-", "")}
                          </span>
                        ))
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/learning/steps/step-${topic.id}`}
                        className="pill-btn bg-sand/20 hover:bg-sand/40 text-ink text-[11px] py-1 px-3 flex items-center gap-1"
                      >
                        <PlayCircle className="w-3 h-3" />
                        Study Packet
                      </Link>
                      <Link
                        href="/app/learning/practice"
                        className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-[11px] py-1 px-3 flex items-center gap-1"
                      >
                        <Code2 className="w-3 h-3" />
                        Practice
                      </Link>
                    </div>
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
