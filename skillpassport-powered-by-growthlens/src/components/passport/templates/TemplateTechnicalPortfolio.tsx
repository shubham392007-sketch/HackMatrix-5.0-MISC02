"use client";

import React from "react";
import {
  Terminal,
  GitBranch,
  GitPullRequest,
  ShieldCheck,
  Code2,
  ExternalLink,
  Mail,
  AlertCircle,
  FileCode,
  FolderGit2,
  Cpu,
  Layers,
  Database,
  Globe,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";

export default function TemplateTechnicalPortfolio({
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
    <div className="space-y-8 font-mono">
      {/* 1. Terminal Command Header */}
      <div className="rounded-2xl bg-[#1C1C1C] text-[#FBF6DF] p-6 sm:p-8 shadow-[4px_4px_0_0_#DFE968] border border-[#1C1C1C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#FBF6DF]/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FFA69E]" />
            <span className="w-3 h-3 rounded-full bg-[#DFE968]" />
            <span className="w-3 h-3 rounded-full bg-[#A8E6CF]" />
            <span className="text-xs text-[#FBF6DF]/60 pl-2">
              git://skillpassport.io/{profile.displayName ? profile.displayName.toLowerCase().replace(/\s+/g, "-") : "candidate"}.git
            </span>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-4 py-1.5 rounded-md bg-[#DFE968] text-[#1C1C1C] text-xs font-black uppercase tracking-wider hover:bg-[#d4df55] flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Candidate</span>
            </button>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-[#DFE968]">&gt; whoami</div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#FFFFFF]">
            {profile.displayName || "Technical Candidate"}
          </h1>
          {profile.headline && (
            <p className="text-sm text-[#FBF6DF]/80 font-sans">
              // {profile.headline}
            </p>
          )}
          {profile.summary && (
            <p className="text-xs text-[#FBF6DF]/70 font-sans leading-relaxed pt-1 max-w-3xl">
              {profile.summary}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-wrap gap-4 text-xs text-[#DFE968] border-t border-white/10">
          <span className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5" />
            VERIFIED_SKILLS: {verifiedSkills.length}
          </span>
          <span className="flex items-center gap-1.5">
            <FolderGit2 className="w-3.5 h-3.5" />
            REPOSITORIES & PROJECTS: {projects.length}
          </span>
          <span className="flex items-center gap-1.5">
            <GitPullRequest className="w-3.5 h-3.5" />
            EVIDENCE_ARTIFACTS: {evidence.length}
          </span>
          <span className="text-emerald-400">
            AUDITED_STATUS: VERIFIED
          </span>
        </div>
      </div>

      {/* 2. Featured Projects & Repositories Grid (Project-First Architecture) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <FolderGit2 className="w-4 h-4 text-[#1C1C1C]" />
            Featured Repositories & Engineering Systems ({projects.length})
          </h2>
          <span className="text-[11px] text-[#1C1C1C]/60">[Source-verified deliverables]</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-[#1C1C1C]/20 text-xs text-stone-500 font-sans text-center">
            No projects published in this passport projection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[#1C1C1C] flex items-center gap-1.5">
                        <FileCode className="w-4 h-4 text-emerald-700 shrink-0" />
                        {proj.title}
                      </h3>
                      {proj.role && (
                        <span className="text-[11px] text-stone-500 block pt-0.5">
                          Role: {proj.role}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {proj.repoUrl && (
                        <a
                          href={proj.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-stone-100 hover:bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-bold flex items-center gap-1 text-[#1C1C1C]"
                        >
                          <GitBranch className="w-3 h-3" />
                          <span>Code</span>
                        </a>
                      )}
                      {proj.liveDemoUrl && (
                        <a
                          href={proj.liveDemoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-[#1C1C1C] text-white hover:bg-stone-800 text-[10px] font-bold flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Demo</span>
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#1C1C1C]/75 font-sans leading-relaxed">
                    {proj.description}
                  </p>

                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <ul className="space-y-1 pt-1 text-[11px] font-sans text-stone-700">
                      {proj.outcomes.map((out, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-700 font-bold">&gt;</span>
                          <span>{out}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="pt-3 border-t border-[#1C1C1C]/10 flex flex-wrap gap-1.5">
                    {proj.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] px-2 py-0.5 rounded bg-stone-100 text-[#1C1C1C] border border-[#1C1C1C]/20"
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

      {/* 3. Verified Technical Stack Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-700" />
            Verified Technical Stack ({verifiedSkills.length})
          </h2>
          <span className="text-[11px] text-[#1C1C1C]/60">[Click node to inspect AST/PR proof]</span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-[#1C1C1C]/20 text-xs text-stone-500 font-sans text-center">
            No verified technical skills authorized.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-4 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-[#1C1C1C]">{skill.canonicalName}</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    {skill.verifiedProficiency}
                  </span>
                </div>
                <p className="text-xs text-[#1C1C1C]/70 font-sans line-clamp-2">
                  {skill.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/50 pt-1 border-t border-[#1C1C1C]/10 font-bold">
                  <span>cat: {skill.category}</span>
                  <span className="text-emerald-800">
                    {skill.evidenceCount} PRs/proofs &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Self-Declared Skills (Separate Section) */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                Self-Declared Capabilities ({customSkills.length})
              </h2>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Self-Declared · Not independently verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-3 rounded-lg bg-amber-50/50 border border-amber-300 text-xs space-y-1 cursor-pointer hover:bg-amber-100/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1C1C]">{skill.title}</span>
                  <span className="text-[10px] text-amber-900 font-mono">
                    [{skill.selfAssessedLevel}]
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 font-sans line-clamp-2">
                  {skill.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Production Engineering History */}
      {experiences.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/20">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-700" />
            Engineering & Infrastructure Timeline ({experiences.length})
          </h2>

          <div className="space-y-3 font-sans">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-xl bg-white border border-stone-300 space-y-1.5 text-xs"
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
                {exp.techStack && exp.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1 font-mono">
                    {exp.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded border border-stone-200"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Grounded Evidence Commits & Pull Requests */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/20">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <GitPullRequest className="w-4 h-4 text-emerald-700" />
            Authorized Workplace Artifacts ({evidence.length})
          </h2>
          <span className="text-[11px] text-[#1C1C1C]/60">[Tamper-evident verification]</span>
        </div>

        {evidence.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-[#1C1C1C]/20 text-xs text-stone-500 font-sans text-center">
            No evidence artifacts authorized for inspection.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-xl bg-[#1C1C1C] text-white border border-stone-700 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-[#DFE968]">
                    <span>{ev.sourceType || "CODE"}</span>
                    <span>{ev.project}</span>
                  </div>
                  <h4 className="font-bold text-white line-clamp-1">{ev.title}</h4>
                  <p className="text-[11px] text-stone-300 font-sans line-clamp-2">
                    {ev.shortSummary}
                  </p>
                </div>

                <div className="pt-2 border-t border-stone-800 flex items-center justify-between text-[10px]">
                  <span className="text-stone-400">{ev.claimedContribution}</span>
                  {ev.allowDetailInspection && onInspectEvidence ? (
                    <button
                      onClick={() => onInspectEvidence(ev.id)}
                      className="text-[#DFE968] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <span>INSPECT</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ) : (
                    <span className="text-stone-500">Summary Only</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
