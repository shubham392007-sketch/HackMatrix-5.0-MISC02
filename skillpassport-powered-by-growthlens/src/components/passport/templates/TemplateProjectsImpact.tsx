"use client";

import React from "react";
import {
  FolderGit2,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ExternalLink,
  Layers,
  AlertCircle,
  Sparkles,
  GitBranch,
  Target,
  Award,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateProjectsImpact({
  projection,
  onSelectSkill,
  onInspectEvidence,
  onOpenContact,
  isPreview,
}: TemplateProps) {
  const profile = projection.candidateProfile;
  const verifiedSkills = projection.verifiedSkills || [];
  const customSkills = projection.customSkills || [];
  const evidence = projection.authorizedEvidence || [];
  const projects = projection.projects || [];
  const experiences = projection.workExperience || [];

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Project Impact Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1C1C1C]/15">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]">
              <TrendingUp className="w-3 h-3 text-[#1C1C1C]" />
              Projects & Measurable Business Impact
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#1C1C1C]">
              {profile.displayName || "Impact Portfolio"}
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] hover:bg-[#1C1C1C]/90 text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start cursor-pointer shadow-[2px_2px_0_0_#DFE968] transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Candidate</span>
            </button>
          )}
        </div>

        {profile.headline && (
          <p className="text-base font-bold text-[#1C1C1C]/80">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-[#1C1C1C]/75 leading-relaxed max-w-3xl">
            {profile.summary}
          </p>
        )}
      </div>

      {/* 2. Narrative Case Studies & Deliverables */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-700" />
            Impact Case Studies & Deliverables ({projects.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-medium">Outcome-driven engineering</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#1C1C1C]/20 text-center text-sm text-[#1C1C1C]/60">
            No projects or case studies published in this passport projection.
          </div>
        ) : (
          <div className="space-y-6">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-6 sm:p-7 rounded-2xl bg-white border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-[#1C1C1C]/10 pb-3">
                  <div>
                    <h3 className="text-lg font-black text-[#1C1C1C]">{proj.title}</h3>
                    {proj.role && (
                      <span className="text-xs font-bold text-emerald-800">
                        Candidate Role: {proj.role}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {proj.repoUrl && (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-full bg-stone-100 hover:bg-[#DFE968] border border-[#1C1C1C] text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>Source Code</span>
                      </a>
                    )}
                    {proj.liveDemoUrl && (
                      <a
                        href={proj.liveDemoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1 rounded-full bg-[#1C1C1C] text-white hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Live System</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Narrative Description & Challenge */}
                <div className="space-y-1">
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-stone-500">
                    Challenge & Implementation
                  </h4>
                  <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">{proj.description}</p>
                </div>

                {/* Measurable Outcomes / Impact */}
                {proj.outcomes && proj.outcomes.length > 0 && (
                  <div className="space-y-1.5 bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                      Measurable Outcomes & Business Impact
                    </h4>
                    <ul className="space-y-1 text-xs text-emerald-950">
                      {proj.outcomes.map((out, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-emerald-700 mt-0.5">✓</span>
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Tech Stack */}
                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {proj.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200 font-bold"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Verified Competencies in Action */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Verified Competencies in Action ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-medium">Click to inspect workplace proof</span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#1C1C1C]/20 text-center text-xs text-stone-500">
            No verified competencies authorized for display.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#1C1C1C]">{skill.canonicalName}</h3>
                  <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    {skill.verifiedProficiency}
                  </span>
                </div>
                <p className="text-xs text-[#1C1C1C]/75 line-clamp-2">{skill.description}</p>
                <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-1 border-t border-[#1C1C1C]/10 font-bold">
                  <span>{skill.category}</span>
                  <span className="text-emerald-800">{skill.evidenceCount} verified proofs &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Self-Declared Skills (Clearly Labeled) */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Self-Declared Capabilities ({customSkills.length})
              </h2>
              <p className="text-xs text-[#1C1C1C]/60">Authored by candidate · Not independently verified</p>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Candidate Claims
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-300 text-xs space-y-1 cursor-pointer hover:bg-amber-100/40"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1C1C]">{skill.title}</span>
                  <span className="text-[10px] font-mono text-stone-600">
                    [{skill.selfAssessedLevel}]
                  </span>
                </div>
                <p className="text-[11px] text-stone-700 line-clamp-2">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Work Experience Context */}
      {experiences.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Award className="w-4 h-4 text-emerald-700" />
            Professional Work History ({experiences.length})
          </h2>

          <div className="space-y-3">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl bg-white border border-stone-200 space-y-1.5 text-xs"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-sm text-[#1C1C1C]">
                    {exp.jobTitle} @ {exp.organization}
                  </span>
                  <span className="font-mono text-stone-500 text-[11px]">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>
                <p className="text-stone-700 leading-relaxed">{exp.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Grounded Evidence Deliverables */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1C1C1C]" />
            Authorized Impact Proofs ({evidence.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60">Grounded workplace proof</span>
        </div>

        {evidence.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white border border-[#1C1C1C]/20 text-center text-xs text-[#1C1C1C]/60">
            No evidence summaries authorized for public display.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#1C1C1C]/60 font-mono">
                    <span>{ev.sourceType}</span>
                    <span>{ev.project}</span>
                  </div>
                  <h4 className="text-xs font-black text-[#1C1C1C] line-clamp-1">{ev.title}</h4>
                  <p className="text-[11px] text-[#1C1C1C]/75 line-clamp-2">{ev.shortSummary}</p>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px]">
                  <span className="text-stone-600 font-medium">{ev.claimedContribution}</span>
                  {ev.allowDetailInspection && onInspectEvidence ? (
                    <button
                      onClick={() => onInspectEvidence(ev.id)}
                      className="text-emerald-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ) : (
                    <span className="text-stone-400">Summary Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Additional Candidate-Authored Sections */}
      <div className="pt-4 border-t border-[#1C1C1C]/15">
        <PassportOptionalSections
          projection={projection}
          theme="classic"
          onInspectEvidence={onInspectEvidence}
          excludeSections={["portfolio_projects", "projects", "work_experience"]}
        />
      </div>
    </div>
  );
}
