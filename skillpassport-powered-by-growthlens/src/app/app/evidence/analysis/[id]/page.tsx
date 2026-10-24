"use client";

import { use } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  FileCode,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function WorkAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { evidenceItems, updateCandidateSkillStatus, confirmContribution } = useEvidence();

  // Fallback to ev-03 if specified id isn't found
  const item = evidenceItems.find((e) => e.id === id) || evidenceItems[2] || evidenceItems[0];

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Work Analysis &amp; Skill Extraction"
        description="Inspect how unstructured project artifacts are normalized into candidate competency signals."
        backHref="/app/evidence/library"
        backLabel="Evidence Library"
      >
        <Link
          href={`/app/ai/work-analysis?evidence_id=${item.id}`}
          className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>VIEW AI WORK ANALYSIS</span>
        </Link>
      </AppTopBar>

      <main className="p-6 lg:p-10 space-y-8 max-w-5xl">
        {/* Illustrative AI Disclaimer */}
        <div className="p-4 rounded-2xl bg-[#DFE968]/40 border-[1.5px] border-[#1C1C1C] flex items-center justify-between shadow-[2px_2px_0_0_#1C1C1C]">
          <div className="flex items-center gap-2.5 text-xs font-bold text-[#1C1C1C]">
            <Sparkles className="w-4 h-4 text-[#1C1C1C]" />
            <span>
              Illustrative AI analysis only. Extracted candidate skills are not verified until evaluated against sufficient evidence.
            </span>
          </div>
        </div>

        {/* Selected Artifact Header */}
        <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] space-y-3 shadow-[3px_3px_0_0_#1C1C1C]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase text-[#1C1C1C]/60">
              TARGET ARTIFACT: {item.sourceReference}
            </span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-white border border-[#1C1C1C]">
              {item.sourceType.toUpperCase()}
            </span>
          </div>

          <h2 className="text-xl font-black text-[#1C1C1C]">{item.title}</h2>
          <p className="text-xs font-medium text-[#1C1C1C]/80 leading-relaxed">
            {item.extractedSummary}
          </p>
        </div>

        {/* Candidate Skills with Human Review Controls */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#1C1C1C]">
              Candidate Skill Associations ({item.candidateSkills.length})
            </h3>
            <span className="text-xs font-bold text-[#1C1C1C]/60">
              Human Evaluation Controls
            </span>
          </div>

          <div className="space-y-4">
            {item.candidateSkills.map((skill) => (
              <div
                key={skill.id}
                className="p-6 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-white space-y-4 shadow-[2px_2px_0_0_#1C1C1C]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1C1C1C]/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[#FBF1CF] border border-[#1C1C1C]">
                      {skill.category}
                    </span>
                    <h4 className="text-base font-black text-[#1C1C1C]">{skill.name}</h4>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border border-[#1C1C1C] ${
                      skill.status === "reviewed"
                        ? "bg-[#000000] text-[#FAF8F5] border-[#1A1918]"
                        : skill.status === "flagged"
                        ? "bg-[#F6C8D6] text-[#C85A54]"
                        : skill.status === "insufficient"
                        ? "bg-[#FBF1CF] text-[#1C1C1C]/70"
                        : "bg-white text-[#1C1C1C]"
                    }`}
                  >
                    STATUS: {skill.status.toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-[#1C1C1C]/60 block mb-0.5">EVIDENCE EXCERPT:</span>
                    <p className="p-3 bg-[#FBF1CF] rounded-xl border border-[#1C1C1C] font-mono leading-relaxed">
                      &ldquo;{skill.excerpt}&rdquo;
                    </p>
                  </div>
                  <div>
                    <span className="font-bold text-[#1C1C1C]/60 block mb-0.5">MAPPING RATIONALE:</span>
                    <p className="font-medium text-[#1C1C1C]/80">{skill.associationReason}</p>
                  </div>
                </div>

                {/* Human Review Decision Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1C1C1C]/10">
                  <button
                    type="button"
                    onClick={() => updateCandidateSkillStatus(item.id, skill.id, "reviewed")}
                    className="pill-btn pill-btn-primary text-[10.5px] py-1.5 px-3 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>CONFIRM ASSOCIATION</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateCandidateSkillStatus(item.id, skill.id, "flagged")}
                    className="pill-btn pill-btn-secondary text-[10.5px] py-1.5 px-3 flex items-center gap-1 text-[#C85A54]"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>FLAG INCORRECT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => updateCandidateSkillStatus(item.id, skill.id, "insufficient")}
                    className="pill-btn pill-btn-secondary text-[10.5px] py-1.5 px-3 flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>MARK INSUFFICIENT PROOF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
