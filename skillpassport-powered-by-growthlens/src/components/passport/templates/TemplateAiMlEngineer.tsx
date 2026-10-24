"use client";

import React from "react";
import {
  Sparkles,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ExternalLink,
  Layers,
  AlertCircle,
  Database,
  Binary,
  FolderGit2,
  BookOpen,
  GitBranch,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateAiMlEngineer({
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
  const publications = projection.publications || [];

  // Filter skills that mention AI/ML keywords if any, or general technical skills
  const aiKeywords = ["ai", "machine learning", "ml", "deep learning", "nlp", "llm", "neural", "vision", "model", "python", "data"];
  const aiSkills = verifiedSkills.filter((s) =>
    aiKeywords.some((kw) =>
      s.canonicalName.toLowerCase().includes(kw) ||
      (s.category && s.category.toLowerCase().includes(kw)) ||
      s.description.toLowerCase().includes(kw)
    )
  );

  return (
    <div className="space-y-8 font-sans">
      {/* 1. AI/ML Technical Architecture Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1C1C1C] via-[#2A2A2A] to-[#1C1C1C] text-white border-[2px] border-[#DFE968] shadow-[4px_4px_0_0_#DFE968] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DFE968]/20 border border-[#DFE968]/50 text-[#DFE968] text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              AI & Machine Learning Talent Passport
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              {profile.displayName || "AI Practitioner"}
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-2.5 rounded-full bg-[#DFE968] hover:bg-[#d4df55] text-[#1C1C1C] text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>Contact Candidate</span>
            </button>
          )}
        </div>

        {profile.headline && (
          <p className="text-base font-bold text-[#DFE968] leading-relaxed">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-white/70 leading-relaxed max-w-3xl">
            {profile.summary}
          </p>
        )}

        {/* Dynamic Metric Grid Computed Purely From Real Persisted Records */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-white/50 block font-mono">VERIFIED COMPETENCIES</span>
            <span className="font-bold text-[#DFE968] text-sm">{verifiedSkills.length} Capabilities</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-white/50 block font-mono">GROUNDED ARTIFACTS</span>
            <span className="font-bold text-white text-sm">{evidence.length} Evidence Items</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-white/50 block font-mono">ENGINEERING DELIVERABLES</span>
            <span className="font-bold text-white text-sm">{projects.length} System Projects</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-0.5">
            <span className="text-[10px] text-white/50 block font-mono">VERIFICATION INTEGRITY</span>
            <span className="font-bold text-emerald-400 text-sm">PostgreSQL Verified</span>
          </div>
        </div>
      </div>

      {/* 2. Audited AI & Machine Learning Competencies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-700" />
            Audited AI & Engineering Capabilities ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-medium">Grounded in code & evaluations</span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-[#1C1C1C]/20 text-center text-sm text-[#1C1C1C]/60">
            No verified AI/ML competencies authorized for this share configuration.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2.5 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-mono text-[#1C1C1C]/50 uppercase tracking-wider block">
                      {skill.category}
                    </span>
                    <h3 className="text-base font-black text-[#1C1C1C]">{skill.canonicalName}</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-black">
                    {skill.verifiedProficiency}
                  </span>
                </div>

                <p className="text-xs text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                  {skill.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-2 border-t border-[#1C1C1C]/10 font-bold">
                  <span className="flex items-center gap-1 text-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Verified Evidence
                  </span>
                  <span>{skill.evidenceCount} Grounded Proofs &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. AI/ML Projects & Model Pipelines */}
      {projects.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-emerald-700" />
              Machine Learning Systems & Projects ({projects.length})
            </h2>
            <span className="text-xs text-[#1C1C1C]/60">Production models and pipelines</span>
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
                        className="text-[10px] font-bold text-emerald-800 hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        <GitBranch className="w-3 h-3" />
                        <span>Repository</span>
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-[#1C1C1C]/75 leading-relaxed">{proj.description}</p>

                  {proj.outcomes && proj.outcomes.length > 0 && (
                    <ul className="space-y-0.5 text-[11px] text-stone-700 list-disc list-inside">
                      {proj.outcomes.map((out, idx) => (
                        <li key={idx}>{out}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {proj.techStack && proj.techStack.length > 0 && (
                  <div className="pt-2 border-t border-stone-200 flex flex-wrap gap-1">
                    {proj.techStack.map((tech, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-100 text-[#1C1C1C] border border-stone-200"
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

      {/* 4. Publications & Research Papers */}
      {publications.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              Research & Technical Publications ({publications.length})
            </h2>
          </div>

          <div className="space-y-3">
            {publications.map((pub) => (
              <div
                key={pub.id}
                className="p-4 rounded-xl bg-white border border-stone-200 space-y-1.5 text-xs"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-bold text-[#1C1C1C]">{pub.title}</h3>
                  {pub.date && <span className="font-mono text-stone-500">{pub.date}</span>}
                </div>
                {pub.venue && <p className="italic text-stone-600 text-[11px]">{pub.venue}</p>}
                {pub.summary && <p className="text-stone-700 text-[11px]">{pub.summary}</p>}
                {pub.url && (
                  <a
                    href={pub.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-emerald-800 hover:underline inline-flex items-center gap-1 font-bold pt-1"
                  >
                    <span>Read Publication</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Self-Declared Skills (Clearly Labeled) */}
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
                className="p-3.5 rounded-lg bg-amber-50/40 border border-amber-300 text-xs space-y-1 cursor-pointer hover:bg-amber-100/50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1C1C]">{skill.title}</span>
                  <span className="text-[10px] text-stone-600 font-mono">
                    Self-Assessed: {skill.selfAssessedLevel}
                  </span>
                </div>
                <p className="text-[11px] text-stone-700 line-clamp-2">{skill.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Authorized Workplace Proofs & Grounding Corpus */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#1C1C1C]" />
            Grounding Evidence Corpus ({evidence.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60">Traceable source artifacts</span>
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
                  <p className="text-[11px] text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                    {ev.shortSummary}
                  </p>
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
          theme="classic"
          onInspectEvidence={onInspectEvidence}
          excludeSections={["portfolio_projects", "projects", "publications"]}
        />
      </div>
    </div>
  );
}
