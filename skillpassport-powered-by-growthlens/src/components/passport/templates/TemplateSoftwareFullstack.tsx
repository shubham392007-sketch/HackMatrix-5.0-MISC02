"use client";

import React from "react";
import {
  Layers,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Mail,
  Server,
  Workflow,
  ExternalLink,
  AlertCircle,
  Database,
  Globe,
  Terminal,
  Cpu,
  FolderGit2,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateSoftwareFullstack({
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

  // Group verified skills dynamically into software architecture layers if appropriate, or by category
  const categories = Array.from(new Set(verifiedSkills.map((s) => s.category || "Full-Stack")));

  return (
    <div className="space-y-8 font-sans">
      {/* 1. Software Engineering Header Banner */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1C1C1C]/15">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#000000] border border-[#1A1918] text-[10px] font-black uppercase tracking-wider text-[#FAF8F5]">
              <Server className="w-3 h-3 text-[#1C1C1C]" />
              Software & Full-Stack Systems Architecture
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#1C1C1C]">
              {profile.displayName || "Software Engineer"}
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
          <p className="text-base font-bold text-[#1C1C1C]/90">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-[#1C1C1C]/75 leading-relaxed max-w-3xl">
            {profile.summary}
          </p>
        )}

        {(profile.contactEmail || profile.contactLinkedIn) && (
          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
            {profile.contactEmail && (
              <span className="px-2.5 py-1 rounded-full bg-white border border-[#1C1C1C] font-mono text-[11px] text-[#1C1C1C]">
                {profile.contactEmail}
              </span>
            )}
            {profile.contactLinkedIn && (
              <a
                href={
                  profile.contactLinkedIn.startsWith("http")
                    ? profile.contactLinkedIn
                    : `https://${profile.contactLinkedIn}`
                }
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 rounded-full bg-white hover:bg-[#000000] hover:text-[#FAF8F5] border border-[#1C1C1C] text-[11px] font-bold text-[#1C1C1C] inline-flex items-center gap-1 transition-colors"
              >
                <span>LinkedIn</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* 2. Architecture & Layered Competencies */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Workflow className="w-4 h-4 text-emerald-700" />
            Verified Systems & Engineering Capabilities ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-semibold">
            Organized by architecture domain
          </span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#1C1C1C]/20 text-center text-sm text-[#1C1C1C]/60">
            No verified engineering capabilities authorized for display.
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((cat) => {
              const catSkills = verifiedSkills.filter((s) => (s.category || "Full-Stack") === cat);
              return (
                <div key={cat} className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70 border-b border-[#1C1C1C]/10 pb-1">
                    <Server className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Layer: {cat}</span>
                    <span className="font-mono text-[10px] text-stone-500">
                      ({catSkills.length} skills)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {catSkills.map((skill) => (
                      <div
                        key={skill.id}
                        onClick={() => onSelectSkill(skill)}
                        className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-black text-[#1C1C1C]">{skill.canonicalName}</h3>
                          <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            {skill.verifiedProficiency}
                          </span>
                        </div>
                        <p className="text-xs text-[#1C1C1C]/70 line-clamp-2">{skill.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/50 pt-1 border-t border-[#1C1C1C]/10 font-bold">
                          <span className="text-emerald-800">Verified Architecture</span>
                          <span className="text-[#1C1C1C]">{skill.evidenceCount} PRs/Documents &rarr;</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Production Engineering History */}
      {experiences.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-700" />
              Production Engineering Experience ({experiences.length})
            </h2>
          </div>

          <div className="space-y-4">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1C1C]">{exp.jobTitle}</h3>
                    <p className="text-xs text-emerald-800 font-semibold">{exp.organization}</p>
                  </div>
                  <span className="text-xs font-mono text-stone-500 font-medium">
                    {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                  </span>
                </div>

                <p className="text-xs text-stone-700 leading-relaxed">{exp.description}</p>

                {exp.achievements && exp.achievements.length > 0 && (
                  <ul className="list-disc list-inside space-y-1 text-xs text-stone-700 pl-1">
                    {exp.achievements.map((ach, i) => (
                      <li key={i}>{ach}</li>
                    ))}
                  </ul>
                )}

                {exp.techStack && exp.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {exp.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-stone-800 border border-stone-200"
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

      {/* 4. System Deliverables & Repositories */}
      {projects.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-emerald-700" />
              System Deliverables & Implementations ({projects.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-black text-[#1C1C1C]">{proj.title}</h3>
                    {proj.repoUrl && (
                      <a
                        href={proj.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>Repo</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed">{proj.description}</p>
                </div>

                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-1">
                    {proj.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200"
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

      {/* 5. Self-Declared Skills (Separate Section) */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                Self-Declared Skills ({customSkills.length})
              </h2>
              <p className="text-xs text-[#1C1C1C]/60">Authored by candidate · Not independently verified</p>
            </div>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Candidate Claims
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {customSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-4 rounded-xl bg-amber-50/40 border border-amber-300 space-y-1.5 cursor-pointer hover:bg-amber-100/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-[#1C1C1C]">{skill.title}</h3>
                  <span className="text-[10px] font-mono text-stone-600">
                    Self-Assessed: {skill.selfAssessedLevel}
                  </span>
                </div>
                <p className="text-xs text-[#1C1C1C]/75 line-clamp-2">{skill.description}</p>
                <div className="text-[10px] text-amber-900 font-bold pt-1">
                  {skill.verificationLabel}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Authorized Workplace Proofs */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1C1C1C]" />
            Authorized Workplace Artifacts ({evidence.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60">Grounded in code repositories & work items</span>
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
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#1C1C1C]/50">
                    <span>{ev.sourceType}</span>
                    <span>{ev.project}</span>
                  </div>
                  <h4 className="text-xs font-black text-[#1C1C1C] line-clamp-1">{ev.title}</h4>
                  <p className="text-[11px] text-[#1C1C1C]/75 line-clamp-2">{ev.shortSummary}</p>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px]">
                  <span className="text-stone-600">{ev.claimedContribution}</span>
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
          theme="engineering"
          onInspectEvidence={onInspectEvidence}
          excludeSections={["portfolio_projects", "projects", "work_experience"]}
        />
      </div>
    </div>
  );
}
