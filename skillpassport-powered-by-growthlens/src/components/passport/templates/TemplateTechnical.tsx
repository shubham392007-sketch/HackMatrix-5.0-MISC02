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
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateTechnical({
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
    <div className="space-y-8 font-mono">
      {/* Terminal Header */}
      <div className="rounded-2xl bg-[#1C1C1C] text-[#FBF6DF] p-6 sm:p-8 shadow-[4px_4px_0_0_#DFE968] border border-[#1C1C1C] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#FBF6DF]/20">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FFA69E]" />
            <span className="w-3 h-3 rounded-full bg-[#DFE968]" />
            <span className="w-3 h-3 rounded-full bg-[#A8E6CF]" />
            <span className="text-xs text-[#FBF6DF]/60 pl-2">passport.sh --mode=recruiter_technical</span>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-4 py-1.5 rounded-md bg-[#DFE968] text-[#1C1C1C] text-xs font-black uppercase tracking-wider hover:bg-[#d4df55] flex items-center gap-1.5 cursor-pointer"
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

        <div className="pt-2 flex flex-wrap gap-3 text-xs text-[#DFE968]">
          <span>VERIFIED_SKILLS: {verifiedSkills.length}</span>
          <span>EVIDENCE_ARTIFACTS: {evidence.length}</span>
          <span>STATUS: AUDITED_AND_COMPLIANT</span>
        </div>
      </div>

      {/* Technical Capabilities Matrix */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Code2 className="w-4 h-4 text-emerald-700" />
            Verified Technical Stack ({verifiedSkills.length})
          </h2>
          <span className="text-[11px] text-[#1C1C1C]/60">[Click node to inspect AST/PR proof]</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {verifiedSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => onSelectSkill(skill)}
              className="p-4 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-[#1C1C1C]">{skill.canonicalName}</span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                  {skill.verifiedProficiency}
                </span>
              </div>
              <p className="text-xs text-[#1C1C1C]/70 font-sans line-clamp-2">{skill.description}</p>
              <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/50 pt-1">
                <span>{skill.category}</span>
                <span className="text-[#1C1C1C] font-bold">{skill.evidenceCount} commits/PRs &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Technical Skills */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/20">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase text-[#1C1C1C] flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Self-Assessed Stack & Experiments ({customSkills.length})
            </h3>
            <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-bold">
              User-Declared
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((cs) => (
              <div
                key={cs.id}
                onClick={() => onSelectSkill(cs)}
                className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/30 hover:border-[#1C1C1C] cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C]">{cs.title}</span>
                  <span className="text-[10px] text-stone-600">{cs.selfAssessedLevel}</span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/70 font-sans line-clamp-2">{cs.description}</p>
                {cs.tags && cs.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {cs.tags.map((t, idx) => (
                      <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Candidate Sections (Work Experience, Projects, Education, Certs, etc.) */}
      <PassportOptionalSections
        projection={projection}
        theme="technical"
        onInspectEvidence={onInspectEvidence}
      />

      {/* Code Repository & PR Evidence */}
      <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/20">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
          <GitBranch className="w-3.5 h-3.5 text-[#1C1C1C]" />
          Audited Code Artifacts & Commit Proof ({evidence.length})
        </h3>

        <div className="space-y-2.5">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-black text-[#1C1C1C]">{ev.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 font-bold uppercase">
                    {ev.sourceType}
                  </span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/60 font-sans line-clamp-1">{ev.shortSummary}</p>
              </div>

              {ev.allowDetailInspection && onInspectEvidence && (
                <button
                  onClick={() => onInspectEvidence(ev.id)}
                  className="px-3 py-1 rounded-md bg-[#1C1C1C] text-[#FBF6DF] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <span>Inspect Diff</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
