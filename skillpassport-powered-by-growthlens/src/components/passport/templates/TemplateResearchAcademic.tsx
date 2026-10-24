"use client";

import React from "react";
import {
  BookOpen,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ExternalLink,
  AlertCircle,
  Quote,
  GraduationCap,
  Award,
  Layers,
} from "lucide-react";
import { TemplateProps } from "./TemplateVerifiedCompetency";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateResearchAcademic({
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
  const education = projection.education || [];
  const publications = projection.publications || [];
  const achievements = projection.achievements || [];
  const projects = projection.projects || [];

  return (
    <div className="space-y-8 font-serif bg-[#FCFAF2] p-8 sm:p-12 rounded-2xl border border-stone-300 shadow-sm max-w-4xl mx-auto text-[#1C1C1C] print:border-none print:shadow-none print:p-0">
      {/* 1. Academic Header / Paper Title */}
      <div className="text-center space-y-4 pb-8 border-b border-stone-300">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500 block">
          TECHNICAL RESEARCH & COMPETENCY REPORT · PEER AUDITED
        </span>

        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[#1C1C1C]">
          {profile.displayName || "Research Author / Candidate"}
        </h1>

        {profile.headline && (
          <p className="text-base italic text-stone-700 max-w-2xl mx-auto font-serif">
            {profile.headline}
          </p>
        )}

        {/* Abstract Box */}
        {profile.summary && (
          <div className="max-w-2xl mx-auto text-left p-5 rounded-xl bg-white/80 border border-stone-200 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-600 font-bold block">
              ABSTRACT / RESEARCH SUMMARY
            </span>
            <p className="text-xs text-stone-800 leading-relaxed font-sans">
              {profile.summary}
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 font-sans">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Verified Competencies Corpus
          </span>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-1.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold uppercase tracking-wider hover:bg-stone-800 inline-flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Author</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Education & Academic Background (Prominently Placed at Top) */}
      {education.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-300 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-stone-700" />
            <span>1. Academic Background & Degrees ({education.length})</span>
          </h2>

          <div className="space-y-4 font-sans">
            {education.map((edu) => (
              <div
                key={edu.id}
                className="p-4 rounded-xl bg-white/90 border border-stone-200 space-y-1 text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h3 className="font-bold text-sm text-[#1C1C1C]">
                    {edu.degree} in {edu.fieldOfStudy}
                  </h3>
                  {(edu.startYear || edu.endYear) && (
                    <span className="font-mono text-stone-500 text-[11px]">
                      {edu.startYear} – {edu.endYear || "Present"}
                    </span>
                  )}
                </div>
                <p className="text-stone-700 font-semibold">{edu.institution}</p>
                {edu.coursework && edu.coursework.length > 0 && (
                  <p className="text-stone-600 text-[11px] pt-1">
                    <strong className="text-stone-800">Specialized Coursework:</strong>{" "}
                    {edu.coursework.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Publications & Technical Writing (Bibliographic Citation Format) */}
      {publications.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-300 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-stone-700" />
            <span>2. Scholarly Publications & Preprints ({publications.length})</span>
          </h2>

          <div className="space-y-4 font-sans">
            {publications.map((pub, idx) => (
              <div
                key={pub.id}
                className="p-4 rounded-xl bg-white/90 border border-stone-200 space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono font-bold text-stone-500 text-[11px] shrink-0">
                    [{idx + 1}]
                  </span>
                  <div className="space-y-1 flex-1">
                    <h3 className="font-bold text-sm text-[#1C1C1C]">{pub.title}</h3>
                    {pub.venue && (
                      <p className="italic text-stone-700 text-[11px]">
                        Published in: {pub.venue} {pub.date && `(${pub.date})`}
                      </p>
                    )}
                    {pub.summary && (
                      <p className="text-stone-600 text-[11px] leading-relaxed pt-1">
                        {pub.summary}
                      </p>
                    )}
                  </div>
                  {pub.url && (
                    <a
                      href={pub.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-semibold flex items-center gap-1 shrink-0"
                    >
                      <span>Paper</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Demonstrated Capabilities & Research Methodologies */}
      <section className="space-y-4">
        <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-300 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-700" />
          <span>3. Verified Capabilities & Methodologies ({verifiedSkills.length})</span>
        </h2>

        {verifiedSkills.length === 0 ? (
          <p className="text-xs text-stone-500 italic font-sans">
            No verified research capabilities authorized.
          </p>
        ) : (
          <div className="space-y-3 font-sans">
            {verifiedSkills.map((skill, idx) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-4 rounded-xl bg-white border border-stone-200 hover:border-[#1C1C1C] cursor-pointer space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#1C1C1C]">
                    [{idx + 1}] {skill.canonicalName}
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                    {skill.verifiedProficiency}
                  </span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">{skill.description}</p>
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-100 font-medium">
                  <span>Domain: {skill.category}</span>
                  <span className="text-emerald-800">
                    Verified by {skill.evidenceCount} Citations/Artifacts &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. Self-Declared Methodologies (Clearly Demarcated) */}
      {customSkills.length > 0 && (
        <section className="space-y-3 font-sans pt-2">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1.5">
            <h2 className="text-base font-normal tracking-tight text-[#1C1C1C] font-serif">
              4. Self-Declared Competencies ({customSkills.length})
            </h2>
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
                  <span className="text-[10px] text-stone-600 font-mono">
                    [{skill.selfAssessedLevel}]
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 line-clamp-2">{skill.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Research Projects & Studies */}
      {projects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-300 flex items-center gap-2">
            <FileText className="w-5 h-5 text-stone-700" />
            <span>5. Research Projects & Studies ({projects.length})</span>
          </h2>

          <div className="space-y-3 font-sans">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="p-4 rounded-xl bg-white border border-stone-200 space-y-1.5 text-xs"
              >
                <h3 className="font-bold text-sm text-[#1C1C1C]">{proj.title}</h3>
                <p className="text-stone-700 leading-relaxed">{proj.description}</p>
                {proj.repoUrl && (
                  <a
                    href={proj.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-800 hover:underline inline-flex items-center gap-1 font-semibold text-[11px]"
                  >
                    <span>View Repository</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 7. Grounded Evidence Citations */}
      <section className="space-y-4 pt-4 border-t border-stone-300 font-sans">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Layers className="w-4 h-4 text-stone-700" />
            <span>Grounded Evidence Citations ({evidence.length})</span>
          </h2>
          <span className="text-xs text-stone-500">Traceable source documents</span>
        </div>

        {evidence.length === 0 ? (
          <p className="text-xs text-stone-500 italic">No evidence citations authorized.</p>
        ) : (
          <div className="space-y-2.5">
            {evidence.map((ev, idx) => (
              <div
                key={ev.id}
                className="p-3.5 rounded-lg bg-white border border-stone-200 flex items-start justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-stone-500">
                    <span>REF #{idx + 1}</span>
                    <span>·</span>
                    <span>{ev.sourceType}</span>
                    <span>·</span>
                    <span>{ev.project}</span>
                  </div>
                  <h4 className="font-bold text-[#1C1C1C]">{ev.title}</h4>
                  <p className="text-stone-600 text-[11px] leading-relaxed">{ev.shortSummary}</p>
                </div>

                {ev.allowDetailInspection && onInspectEvidence && (
                  <button
                    onClick={() => onInspectEvidence(ev.id)}
                    className="text-stone-800 hover:text-black font-bold text-[11px] inline-flex items-center gap-1 shrink-0 pt-1"
                  >
                    <span>Inspect</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Additional Candidate-Authored Sections */}
      <div className="pt-4 border-t border-stone-300 font-sans">
        <PassportOptionalSections
          projection={projection}
          theme="executive"
          onInspectEvidence={onInspectEvidence}
          excludeSections={["education", "publications", "portfolio_projects", "projects", "achievements"]}
        />
      </div>
    </div>
  );
}
