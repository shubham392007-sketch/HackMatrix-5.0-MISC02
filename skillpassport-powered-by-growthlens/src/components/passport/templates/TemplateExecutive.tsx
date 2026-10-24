"use client";

import React from "react";
import {
  ShieldCheck,
  Award,
  CheckCircle2,
  Mail,
  Layers,
  AlertCircle,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateExecutive({
  projection,
  onSelectSkill,
  onInspectEvidence,
  onOpenContact,
}: TemplateProps) {
  const profile = projection.candidateProfile;
  const verifiedSkills = projection.verifiedSkills || [];
  const customSkills = projection.customSkills || [];
  const evidence = projection.authorizedEvidence || [];
  const alignment = projection.roleAlignment;

  return (
    <div className="space-y-8 font-sans bg-white p-6 sm:p-10 rounded-2xl border-[1.5px] border-[#1C1C1C]/20 shadow-sm">
      {/* Executive Header Banner */}
      <div className="border-b-[2px] border-[#1C1C1C] pb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#1C1C1C]/50">
              Executive Skill Passport · Minimal Layout
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#1C1C1C]">
              {profile.displayName || "Candidate Profile"}
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-2 rounded-lg bg-[#1C1C1C] hover:bg-[#1C1C1C]/90 text-white text-xs font-bold tracking-wider uppercase flex items-center gap-2 self-start cursor-pointer"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Candidate</span>
            </button>
          )}
        </div>

        {profile.headline && (
          <p className="text-base font-semibold text-[#1C1C1C]/80 leading-relaxed border-l-2 border-[#1C1C1C] pl-3 italic">
            "{profile.headline}"
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-[#1C1C1C]/70 leading-relaxed max-w-3xl">
            {profile.summary}
          </p>
        )}

        {(profile.contactEmail || profile.contactLinkedIn) && (
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#1C1C1C]/70 pt-1">
            {profile.contactEmail && <span>Email: {profile.contactEmail}</span>}
            {profile.contactLinkedIn && <span>LinkedIn: {profile.contactLinkedIn}</span>}
          </div>
        )}
      </div>

      {/* Two-Column Executive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Verified Capabilities */}
        <div className="lg:col-span-7 space-y-5">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Verified Competencies ({verifiedSkills.length})
            </h2>
            <span className="text-[10px] font-mono text-[#1C1C1C]/50">Audited Proof</span>
          </div>

          <div className="divide-y divide-[#1C1C1C]/10">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="py-3.5 hover:bg-stone-50 px-2 rounded-lg transition-colors cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1C1C1C]">{skill.canonicalName}</h3>
                  <span className="text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {skill.verifiedProficiency}
                  </span>
                </div>
                <p className="text-xs text-[#1C1C1C]/65 line-clamp-1">{skill.description}</p>
                <div className="flex items-center justify-between text-[10px] text-[#1C1C1C]/50">
                  <span>{skill.category}</span>
                  <span className="text-[#1C1C1C] font-semibold flex items-center gap-0.5">
                    {skill.evidenceCount} Artifacts <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Self-Declared Skills */}
          {customSkills.length > 0 && (
            <div className="pt-4 border-t border-[#1C1C1C]/15 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Self-Declared Expertise ({customSkills.length})
                </h3>
                <span className="text-[9px] uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Unverified
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customSkills.map((cs) => (
                  <div
                    key={cs.id}
                    onClick={() => onSelectSkill(cs)}
                    className="p-3 rounded-lg border border-stone-200 bg-stone-50/50 hover:border-[#1C1C1C] cursor-pointer space-y-1"
                  >
                    <span className="text-xs font-bold text-[#1C1C1C] block">{cs.title}</span>
                    <span className="text-[10px] text-stone-500 block">Level: {cs.selfAssessedLevel}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Verified Project Artifacts & Strategic Alignment */}
        <div className="lg:col-span-5 space-y-6">
          {alignment && (
            <div className="p-4 rounded-xl border border-[#1C1C1C]/15 bg-stone-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1C1C]">Role: {alignment.targetRoleTitle}</span>
                {alignment.alignmentScore && (
                  <span className="text-xs font-mono font-bold text-[#1C1C1C]">
                    {alignment.alignmentScore}% Index
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#1C1C1C]/70 leading-relaxed">
                {alignment.alignmentSummary}
              </p>
            </div>
          )}

          <div className="space-y-3">
            <div className="border-b border-[#1C1C1C]/15 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#1C1C1C]" />
                Audited Workplace Proof ({evidence.length})
              </h3>
            </div>

            <div className="space-y-2">
              {evidence.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-lg border border-[#1C1C1C]/15 bg-white space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-[#1C1C1C] truncate max-w-[200px]">{ev.title}</span>
                    <span className="text-[10px] font-mono text-[#1C1C1C]/50">{ev.sourceType}</span>
                  </div>
                  <p className="text-[10px] text-[#1C1C1C]/60 line-clamp-1">{ev.shortSummary}</p>
                  {ev.allowDetailInspection && onInspectEvidence && (
                    <button
                      onClick={() => onInspectEvidence(ev.id)}
                      className="text-[10px] font-bold text-emerald-800 hover:underline pt-0.5 block cursor-pointer"
                    >
                      Inspect Artifact Details &rarr;
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Optional Candidate Sections (Work Experience, Projects, Education, Certs, etc.) */}
      <PassportOptionalSections
        projection={projection}
        theme="executive"
        onInspectEvidence={onInspectEvidence}
      />

      {/* Assurance Footer */}
      <div className="pt-4 border-t border-[#1C1C1C]/10 text-center text-[10px] font-mono text-[#1C1C1C]/50">
        SkillPassport Immutable Provenance Guarantee · {new Date().getFullYear()}
      </div>
    </div>
  );
}

const LinkedinIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
  </svg>
);
