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
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateProject({
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
    <div className="space-y-8 font-sans">
      {/* Project Impact Hero */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1C1C1C]/15">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
              <TrendingUp className="w-3 h-3 text-[#1C1C1C]" />
              Project & Business Impact Portfolio
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-[#1C1C1C]">
              {profile.displayName || "Impact-Driven Candidate"}
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-2.5 rounded-full bg-[#1C1C1C] text-[#FBF6DF] hover:bg-[#1C1C1C]/90 text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start cursor-pointer shadow-[2px_2px_0_0_#DFE968]"
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

      {/* Case Studies & Impact Deliverables */}
      <div className="space-y-4">
        <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
          <FolderGit2 className="w-4 h-4 text-[#1C1C1C]" />
          Key Projects & Impact Case Studies ({evidence.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#DFE968] border border-[#1C1C1C]">
                    {ev.project}
                  </span>
                  <span className="text-[10px] text-[#1C1C1C]/50 font-mono">
                    {ev.sourceType}
                  </span>
                </div>
                <h3 className="text-sm font-black text-[#1C1C1C]">{ev.title}</h3>
                <p className="text-xs text-[#1C1C1C]/75 leading-relaxed">{ev.shortSummary}</p>
              </div>

              <div className="pt-2 border-t border-[#1C1C1C]/10 flex items-center justify-between text-xs">
                <span className="text-[10px] text-[#1C1C1C]/60">Role: <strong>{ev.claimedContribution}</strong></span>
                {ev.allowDetailInspection && onInspectEvidence && (
                  <button
                    onClick={() => onInspectEvidence(ev.id)}
                    className="text-[10px] font-black uppercase text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Inspect Proof</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Candidate Sections (Work Experience, Projects, Education, Certs, etc.) */}
      <PassportOptionalSections
        projection={projection}
        theme="classic"
        onInspectEvidence={onInspectEvidence}
      />

      {/* Verified Skills Demonstrated */}
      <div className="space-y-4 pt-4 border-t border-[#1C1C1C]/15">
        <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          Demonstrated Competencies ({verifiedSkills.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {verifiedSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => onSelectSkill(skill)}
              className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 hover:border-[#1C1C1C] cursor-pointer space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1C1C1C] truncate">{skill.canonicalName}</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {skill.verifiedProficiency}
                </span>
              </div>
              <p className="text-[10px] text-[#1C1C1C]/60 line-clamp-1">{skill.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Declared Skills */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Additional Domain Expertise ({customSkills.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((cs) => (
              <div
                key={cs.id}
                onClick={() => onSelectSkill(cs)}
                className="p-3 rounded-lg border border-amber-300 bg-amber-50/30 hover:border-[#1C1C1C] cursor-pointer space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C]">{cs.title}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{cs.selfAssessedLevel}</span>
                </div>
                <p className="text-[10px] text-[#1C1C1C]/60 line-clamp-1">{cs.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
