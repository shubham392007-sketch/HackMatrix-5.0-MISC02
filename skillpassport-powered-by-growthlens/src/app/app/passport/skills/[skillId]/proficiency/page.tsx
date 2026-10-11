"use client";

import React, { use } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { ProficiencyLevel } from "@/types/passport";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
} from "@/components/app/SkillBadges";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Circle,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

interface PageProps {
  params: Promise<{ skillId: string }>;
}

const RUBRIC_LEVELS: {
  level: ProficiencyLevel;
  title: string;
  description: string;
  criteria: string[];
}[] = [
  {
    level: "Foundation",
    title: "1. Foundation",
    description: "Grasps fundamental terminology, syntax rules, and follows established code conventions.",
    criteria: [
      "Can read existing codebase and understand standard idioms",
      "Executes local tests and reproduces known issues",
      "Completes structured coursework or introductory modules",
    ],
  },
  {
    level: "Working",
    title: "2. Working",
    description: "Autonomously writes functional code and implements standard features with peer guidance.",
    criteria: [
      "Implements routine endpoints, models, or data scripts",
      "Handles basic edge cases and writes unit test suites",
      "Navigates debugging tools and resolves standard stack traces",
    ],
  },
  {
    level: "Practitioner",
    title: "3. Practitioner",
    description: "Independently delivers end-to-end features, handles asynchronous operations, and debugs complex bugs.",
    criteria: [
      "Designs and ships production microservices and modules",
      "Applies defensive programming, circuit breakers, and retry mechanisms",
      "Performs code reviews and establishes testing patterns",
    ],
  },
  {
    level: "Advanced",
    title: "4. Advanced",
    description: "Architects performant subsystems, tunes concurrency, authors RFCs, and sets engineering standards.",
    criteria: [
      "Solves complex performance bottlenecks and memory bottlenecks",
      "Authors formal architecture specifications and technical designs",
      "Leads cross-functional integrations across distinct service boundaries",
    ],
  },
  {
    level: "Expert",
    title: "5. Expert",
    description: "Industry or enterprise authority driving paradigm shifts, patents, and foundational core infrastructure.",
    criteria: [
      "Publishes peer-reviewed novel algorithms or industry open-source libraries",
      "Defines multi-year architectural roadmaps and high-scale consensus protocols",
      "Mentors senior engineers and advises executive technical governance",
    ],
  },
];

export default function ProficiencyAssessmentPage({ params }: PageProps) {
  const { skillId } = use(params);
  const { skills } = useEvidence();

  const skill = skills.find((s) => s.id === skillId);

  if (!skill) {
    return (
      <div className="gl-card p-12 text-center space-y-4 my-8">
        <h2 className="text-xl font-bold text-[#1F1E1D]">Skill Not Found</h2>
        <Link href="/app/passport/skills" className="pill-btn pill-btn-primary inline-flex text-xs">
          Return to Skills
        </Link>
      </div>
    );
  }

  const getLevelRank = (lvl: ProficiencyLevel): number => {
    switch (lvl) {
      case "Foundation":
        return 1;
      case "Working":
        return 2;
      case "Practitioner":
        return 3;
      case "Advanced":
        return 4;
      case "Expert":
        return 5;
      default:
        return 0;
    }
  };

  const currentRank = getLevelRank(
    skill.verificationState === "verified"
      ? skill.verifiedProficiency
      : skill.estimatedProficiency
  );

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Proficiency Rubric"
        description={`Objective criteria ladder evaluating competence from foundational basics to expert architectural leadership for ${skill.canonicalName}.`}
        badge="Domain 2 · Assessment Framework"
        badgeColor="border-amber-300 text-amber-900 bg-amber-50"
      >
        <div className="flex items-center gap-2">
          <Link
            href={`/app/passport/skills/${skill.id}`}
            className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Profile
          </Link>
          <Link
            href={`/app/passport/skills/${skill.id}/evidence`}
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            Inspect Evidence Map
          </Link>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Current Level Summary Card */}
      <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">
                Assessed Competency
              </span>
              <SkillVerificationBadge state={skill.verificationState} />
            </div>
            <h2 className="text-2xl font-extrabold text-[#1F1E1D]">{skill.canonicalName}</h2>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5A5550]">Verified Level:</span>
                <ProficiencyBadge level={skill.verifiedProficiency} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#5A5550]">Model Estimate:</span>
                <ProficiencyBadge level={skill.estimatedProficiency} />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-[#E0D9CD] text-right space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
              Calibration Confidence
            </span>
            <div className="text-2xl font-black text-[#2E6941]">{skill.confidence}%</div>
            <div className="text-[11px] text-[#8C827A]">
              Strength: {skill.evidenceStrength.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Rationale and Next Growth Leap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="gl-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F1E1D]">
            <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
            <h3>Why was this level assigned?</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            {skill.assessmentRationale}
          </p>
        </div>

        <div className="gl-card p-5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#1F1E1D]">
            <TrendingUp className="w-4 h-4 text-[#4361EE]" />
            <h3>To advance to the next tier:</h3>
          </div>
          <p className="text-xs text-[#5A5550] leading-relaxed">
            {skill.limitations
              ? `Resolve existing boundaries: ${skill.limitations}`
              : "Provide further multi-system production evidence demonstrating cross-team engineering leadership."}
          </p>
        </div>
      </div>

      {/* The 5-Tier Rubric Ladder */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-[#1F1E1D]">
          Competency Progression Ladder
        </h2>

        <div className="space-y-4">
          {RUBRIC_LEVELS.map((rubric) => {
            const levelRank = getLevelRank(rubric.level);
            const isAchieved = levelRank <= currentRank;
            const isCurrent = levelRank === currentRank;

            return (
              <div
                key={rubric.level}
                className={`gl-card p-6 transition-all border ${
                  isCurrent
                    ? "border-[#2E6941] bg-[#F4F9F5] shadow-sm"
                    : isAchieved
                    ? "border-[#D6DEC8] bg-[#FAF8F5]"
                    : "border-[#E8E1D5] bg-white opacity-80"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {isCurrent ? (
                      <span className="w-7 h-7 rounded-full bg-[#2E6941] text-white flex items-center justify-center font-bold text-xs">
                        ✓
                      </span>
                    ) : isAchieved ? (
                      <span className="w-7 h-7 rounded-full bg-[#EBF3ED] text-[#2E6941] flex items-center justify-center font-bold text-xs">
                        ✓
                      </span>
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-[#FAF8F5] border border-[#E0D9CD] text-[#8C827A] flex items-center justify-center font-bold text-xs">
                        {levelRank}
                      </span>
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-[#1F1E1D]">
                          {rubric.title}
                        </h3>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#2E6941] text-white">
                            Current Standing
                          </span>
                        )}
                        {!isCurrent && isAchieved && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#234D31]">
                            Demonstrated
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#5A5550] mt-0.5">
                        {rubric.description}
                      </p>
                    </div>
                  </div>

                  <ProficiencyBadge level={rubric.level} />
                </div>

                {/* Rubric Criteria List */}
                <div className="mt-4 pt-3 border-t border-[#F0EBE1] pl-10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                    Key Observable Indicators:
                  </span>
                  <ul className="space-y-1.5 text-xs text-[#5A5550]">
                    {rubric.criteria.map((c, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                          isAchieved ? "bg-[#2E6941]" : "bg-[#8C827A]"
                        }`} />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}
