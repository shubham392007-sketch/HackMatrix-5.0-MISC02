"use client";

import React from "react";
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  Mail,
  ExternalLink,
  Layers,
  AlertCircle,
  EyeOff,
  Fingerprint,
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateAnonymous({
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
      {/* Anonymous Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#1C1C1C] text-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#FBF6DF]/15">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-500 text-emerald-300 text-xs font-black uppercase tracking-wider">
              <EyeOff className="w-3.5 h-3.5 text-emerald-400" />
              Privacy-First Anonymous Projection
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#FFFFFF] flex items-center gap-2">
              <Fingerprint className="w-6 h-6 text-[#DFE968]" />
              <span>Verified Candidate #{projection.shareId.slice(-8).toUpperCase()}</span>
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-5 py-2.5 rounded-full bg-[#DFE968] hover:bg-[#d4df55] text-[#1C1C1C] text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start cursor-pointer shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Message Candidate</span>
            </button>
          )}
        </div>

        {profile.headline && (
          <p className="text-base font-bold text-[#DFE968]">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-[#FBF6DF]/75 leading-relaxed max-w-3xl">
            {profile.summary}
          </p>
        )}

        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-[#FBF6DF]/70 flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Candidate personal identity (name, email, social links) is shielded under Privacy-First policy. Contact is mediated through the secure message relay.
          </span>
        </div>
      </div>

      {/* Verified Competencies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Objective Verified Capabilities ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-semibold">Cryptographically Verified</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verifiedSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => onSelectSkill(skill)}
              className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#1C1C1C]">{skill.canonicalName}</h3>
                <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                  {skill.verifiedProficiency}
                </span>
              </div>
              <p className="text-xs text-[#1C1C1C]/70 line-clamp-2">{skill.description}</p>
              <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/50 pt-1 border-t border-[#1C1C1C]/10 font-bold">
                <span>{skill.category}</span>
                <span className="text-emerald-800">{skill.evidenceCount} Anonymized Artifacts &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Self-Declared Competencies */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Self-Declared Capabilities ({customSkills.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((cs) => (
              <div
                key={cs.id}
                onClick={() => onSelectSkill(cs)}
                className="p-4 rounded-xl border border-amber-300 bg-amber-50/30 hover:border-[#1C1C1C] cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C]">{cs.title}</span>
                  <span className="text-[10px] text-stone-600 font-mono">{cs.selfAssessedLevel}</span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/70 line-clamp-2">{cs.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Optional Candidate Sections (Work Experience, Projects, Education, Certs, etc.) */}
      <PassportOptionalSections
        projection={projection}
        theme="dark"
        onInspectEvidence={onInspectEvidence}
      />

      {/* Sanitized Evidence */}
      <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#1C1C1C]" />
          Sanitized Evidence Proofs ({evidence.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1.5 flex flex-col justify-between"
            >
              <div>
                <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/50 block">Sanitized Artifact</span>
                <h4 className="text-xs font-bold text-[#1C1C1C] truncate">{ev.title}</h4>
                <p className="text-[10px] text-[#1C1C1C]/60 line-clamp-2 mt-1">{ev.shortSummary}</p>
              </div>
              {ev.allowDetailInspection && onInspectEvidence && (
                <button
                  onClick={() => onInspectEvidence(ev.id)}
                  className="text-[10px] font-bold text-emerald-800 hover:underline pt-1 text-left cursor-pointer"
                >
                  Inspect Excerpt &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
