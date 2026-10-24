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
import { TemplateProps } from "./TemplateVerifiedCompetency";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateMinimalPrivacy({
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

  const isAnonymous = profile.isAnonymous || !profile.displayName;
  const candidateIdentifier = isAnonymous
    ? `Candidate #${(projection.shareId || "ANON").slice(-8).toUpperCase()}`
    : profile.displayName;

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* 1. Restrained Privacy-First Header Card */}
      <div className="p-6 rounded-2xl bg-[#1C1C1C] text-[#FBF6DF] border-[2px] border-[#1C1C1C] shadow-[3px_3px_0_0_#DFE968] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#FBF6DF]/15">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              <EyeOff className="w-3 h-3 text-emerald-400" />
              Privacy-Preserving Credential Projection
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <Fingerprint className="w-6 h-6 text-[#DFE968]" />
              <span>{candidateIdentifier}</span>
            </h1>
          </div>

          {projection.allowRecruiterMessaging && onOpenContact && (
            <button
              onClick={onOpenContact}
              className="px-4 py-2 rounded-full bg-[#DFE968] hover:bg-[#d4df55] text-[#1C1C1C] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 self-start cursor-pointer transition-all shadow-sm"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Relay Message</span>
            </button>
          )}
        </div>

        {profile.headline && (
          <p className="text-sm font-bold text-[#DFE968]">
            {profile.headline}
          </p>
        )}

        {profile.summary && (
          <p className="text-xs text-[#FBF6DF]/80 leading-relaxed">
            {profile.summary}
          </p>
        )}

        {/* Zero-Leakage Privacy Policy Notice */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-[#FBF6DF]/70 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Candidate personal identifiable information is shielded under Privacy-First policy. Contact is mediated through the secure message relay without leaking private contact endpoints.
          </span>
        </div>
      </div>

      {/* 2. Compact Objective Verified Capabilities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            Verified Capabilities ({verifiedSkills.length})
          </h2>
          <span className="text-[10px] font-mono text-[#1C1C1C]/60">Cryptographic Verification</span>
        </div>

        {verifiedSkills.length === 0 ? (
          <div className="p-6 rounded-xl bg-white border border-[#1C1C1C]/15 text-center text-xs text-stone-500">
            No verified competencies authorized for display.
          </div>
        ) : (
          <div className="space-y-2">
            {verifiedSkills.map((skill) => (
              <div
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 hover:border-[#1C1C1C] cursor-pointer flex items-center justify-between gap-4 transition-all hover:bg-stone-50/80 shadow-sm"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1C1C1C]">{skill.canonicalName}</span>
                    <span className="text-[10px] font-mono text-stone-500 font-semibold">
                      [{skill.category}]
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600 line-clamp-1">{skill.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {skill.verifiedProficiency}
                  </span>
                  <span className="text-[10px] text-emerald-900 font-bold hidden sm:inline">
                    {skill.evidenceCount} proofs &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Permitted Self-Declared Skills (Clearly Labeled) */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-amber-300 pb-1">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              <h2 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                Self-Declared Skills ({customSkills.length})
              </h2>
            </div>
            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
              Self-Declared · Not independently verified
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {customSkills.map((skill) => (
              <span
                key={skill.id}
                onClick={() => onSelectSkill(skill)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50/60 border border-amber-300 text-xs text-[#1C1C1C] hover:bg-amber-100/60 cursor-pointer transition-colors"
              >
                <span className="font-medium">{skill.title}</span>
                <span className="text-[10px] font-mono text-amber-800">
                  ({skill.selfAssessedLevel})
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 4. Permitted Evidence Highlights (Summary-Only Mode by Default) */}
      {evidence.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between border-b border-stone-200 pb-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-stone-700" />
              Permitted Evidence Highlights ({evidence.length})
            </h2>
            <span className="text-[10px] text-stone-500 font-mono">Metadata-sanitized</span>
          </div>

          <div className="space-y-2">
            {evidence.map((ev) => (
              <div
                key={ev.id}
                className="p-3 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#1C1C1C]">{ev.title}</span>
                  <span className="text-[10px] font-mono text-stone-500">
                    {ev.sourceType} · {ev.project}
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 leading-relaxed">{ev.shortSummary}</p>
                {ev.allowDetailInspection && onInspectEvidence && (
                  <div className="pt-1 flex justify-end">
                    <button
                      onClick={() => onInspectEvidence(ev.id)}
                      className="text-[10px] font-bold text-emerald-800 hover:underline flex items-center gap-0.5"
                    >
                      <span>Inspect Artifact</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Authorized Candidate Optional Sections (if permitted) */}
      <div className="pt-2">
        <PassportOptionalSections
          projection={projection}
          theme="dark"
          onInspectEvidence={onInspectEvidence}
        />
      </div>
    </div>
  );
}
