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
} from "lucide-react";
import { TemplateProps } from "./TemplateClassic";
import PassportOptionalSections from "./PassportOptionalSections";

export default function TemplateAiMl({
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
      {/* AI Intelligence Header Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#1C1C1C] via-[#2A2A2A] to-[#1C1C1C] text-white border-[2px] border-[#DFE968] shadow-[4px_4px_0_0_#DFE968] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="space-y-1">
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
              className="px-5 py-2.5 rounded-full bg-[#DFE968] hover:bg-[#d4df55] text-[#1C1C1C] text-xs font-black uppercase tracking-wider flex items-center gap-2 self-start cursor-pointer shadow-sm"
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/50 block font-mono">VERIFIED MODELS</span>
            <span className="font-bold text-white">Qwen, GLM-OCR</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/50 block font-mono">VERIFIED SKILLS</span>
            <span className="font-bold text-[#DFE968]">{verifiedSkills.length} Capabilities</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/50 block font-mono">EVIDENCE CORPUS</span>
            <span className="font-bold text-white">{evidence.length} Grounded Proofs</span>
          </div>
          <div className="p-2.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-[10px] text-white/50 block font-mono">TRUST STANDARD</span>
            <span className="font-bold text-emerald-400">Zero Hallucination</span>
          </div>
        </div>
      </div>

      {/* Verified AI/ML Competencies */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-700" />
            Audited AI & Engineering Competencies ({verifiedSkills.length})
          </h2>
          <span className="text-xs text-[#1C1C1C]/60 font-medium">Grounded in code & evaluations</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {verifiedSkills.map((skill) => (
            <div
              key={skill.id}
              onClick={() => onSelectSkill(skill)}
              className="p-5 rounded-xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] hover:bg-stone-50 cursor-pointer space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                    {skill.category}
                  </span>
                  <h3 className="text-base font-black text-[#1C1C1C]">{skill.canonicalName}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-300 text-indigo-900 text-xs font-black">
                  {skill.verifiedProficiency}
                </span>
              </div>

              <p className="text-xs text-[#1C1C1C]/75 leading-relaxed line-clamp-2">
                {skill.description}
              </p>

              <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-2 border-t border-[#1C1C1C]/10 font-bold">
                <span className="flex items-center gap-1 text-emerald-700">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Evidence
                </span>
                <span>{skill.evidenceCount} Artifacts &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emerging AI Research (Custom Skills) */}
      {customSkills.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
              <Binary className="w-4 h-4 text-amber-600" />
              Candidate AI Experiments & Self-Declared Work ({customSkills.length})
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
              Self-Declared
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customSkills.map((cs) => (
              <div
                key={cs.id}
                onClick={() => onSelectSkill(cs)}
                className="p-4 rounded-xl border border-amber-300 bg-amber-50/30 hover:border-[#1C1C1C] cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1C1C1C]">{cs.title}</span>
                  <span className="text-[10px] text-stone-600 font-mono">{cs.selfAssessedLevel}</span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/70 leading-relaxed line-clamp-2">{cs.description}</p>
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

      {/* Grounded Artifacts */}
      <div className="space-y-3 pt-4 border-t border-[#1C1C1C]/15">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
          <Database className="w-4 h-4 text-[#1C1C1C]" />
          Audited Artifacts, Models & Datasets ({evidence.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {evidence.map((ev) => (
            <div
              key={ev.id}
              className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/20 space-y-1.5 flex flex-col justify-between"
            >
              <div>
                <span className="text-[9px] uppercase font-bold text-[#1C1C1C]/50 block">{ev.sourceType}</span>
                <h4 className="text-xs font-bold text-[#1C1C1C] truncate">{ev.title}</h4>
                <p className="text-[10px] text-[#1C1C1C]/60 line-clamp-2 mt-1">{ev.shortSummary}</p>
              </div>
              {ev.allowDetailInspection && onInspectEvidence && (
                <button
                  onClick={() => onInspectEvidence(ev.id)}
                  className="text-[10px] font-bold text-indigo-700 hover:underline pt-1 text-left cursor-pointer"
                >
                  Inspect Extraction Details &rarr;
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
