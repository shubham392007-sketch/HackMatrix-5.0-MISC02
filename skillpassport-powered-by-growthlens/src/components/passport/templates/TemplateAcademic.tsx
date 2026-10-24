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
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateAcademic({
  projection,
  onSelectSkill,
  onInspectEvidence,
  onOpenContact,
}: TemplateProps) {
  const profile = projection.candidateProfile;
  const verifiedSkills = projection.verifiedSkills || [];
  const customSkills = projection.customSkills || [];
  const evidence = projection.authorizedEvidence || [];

  return (
    <div className="space-y-8 font-serif bg-[#FCFAF2] p-8 sm:p-12 rounded-2xl border border-stone-300 shadow-sm max-w-4xl mx-auto text-[#1C1C1C]">
      {/* Paper Header / Abstract */}
      <div className="text-center space-y-4 pb-8 border-b border-stone-300">
        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500 block">
          TECHNICAL RESEARCH & COMPETENCY REPORT
        </span>

        <h1 className="text-3xl sm:text-4xl font-normal tracking-tight text-[#1C1C1C]">
          {profile.displayName || "Author / Candidate"}
        </h1>

        {profile.headline && (
          <p className="text-base italic text-stone-700 max-w-2xl mx-auto">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <div className="max-w-2xl mx-auto text-left p-4 rounded-xl bg-white/70 border border-stone-200 space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
              ABSTRACT
            </span>
            <p className="text-xs text-stone-800 leading-relaxed font-sans">
              {profile.summary}
            </p>
          </div>
        )}

        {projection.allowRecruiterMessaging && onOpenContact && (
          <div className="pt-2 font-sans">
            <button
              onClick={onOpenContact}
              className="px-5 py-2 rounded-full bg-[#1C1C1C] text-[#FBF6DF] text-xs font-bold uppercase tracking-wider hover:bg-[#1C1C1C]/90 inline-flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Author / Candidate</span>
            </button>
          </div>
        )}
      </div>

      {/* Section 1: Demonstrated Competencies */}
      <div className="space-y-4">
        <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-200">
          1. Demonstrated Capabilities & Methodologies ({verifiedSkills.length})
        </h2>

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
              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                <span>Domain: {skill.category}</span>
                <span className="text-emerald-800 font-medium">Verified by {skill.evidenceCount} Citations &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Working Hypotheses (Custom Skills) */}
      {customSkills.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-stone-200">
          <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-200">
            2. Primary Research Interests & Self-Declared Work ({customSkills.length})
          </h2>

          <div className="space-y-3 font-sans">
            {customSkills.map((cs, idx) => (
              <div
                key={cs.id}
                onClick={() => onSelectSkill(cs)}
                className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200 hover:border-amber-400 cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C]">
                    [W-{idx + 1}] {cs.title}
                  </span>
                  <span className="text-[10px] text-amber-900 font-mono font-bold">
                    Self-Assessed ({cs.selfAssessedLevel})
                  </span>
                </div>
                <p className="text-xs text-stone-600">{cs.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Candidate Sections (Work Experience, Projects, Education, Certs, etc.) */}
      <PassportOptionalSections
        projection={projection}
        theme="classic"
        onInspectEvidence={onInspectEvidence}
      />

      {/* Section 3: Primary Evidence Citations */}
      <div className="space-y-4 pt-4 border-t border-stone-200">
        <h2 className="text-xl font-normal tracking-tight text-[#1C1C1C] pb-2 border-b border-stone-200">
          3. Primary Evidence Citations & Archival Proofs ({evidence.length})
        </h2>

        <div className="space-y-2.5 font-sans">
          {evidence.map((ev, idx) => (
            <div
              key={ev.id}
              className="p-3 rounded-lg bg-white border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="space-y-0.5">
                <span className="font-bold text-[#1C1C1C]">
                  [{idx + 1}] {ev.title} ({ev.project})
                </span>
                <p className="text-[11px] text-stone-500 line-clamp-1">{ev.shortSummary}</p>
              </div>

              {ev.allowDetailInspection && onInspectEvidence && (
                <button
                  onClick={() => onInspectEvidence(ev.id)}
                  className="text-xs font-bold text-stone-800 hover:underline shrink-0 cursor-pointer"
                >
                  Inspect Citation &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
