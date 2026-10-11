"use client";

import React, { use, useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
} from "@/components/app/SkillBadges";
import {
  ArrowLeft,
  Layers,
  FileText,
  ExternalLink,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldAlert,
  X,
  Send,
} from "lucide-react";

interface PageProps {
  params: Promise<{ skillId: string }>;
}

export default function EvidenceToSkillMappingPage({ params }: PageProps) {
  const { skillId } = use(params);
  const { skills, evidenceItems, addHistoryEvent, updateSkill } = useEvidence();

  const [flagModalItem, setFlagModalItem] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagSuccessMessage, setFlagSuccessMessage] = useState<string | null>(null);

  const skill = skills.find((s) => s.id === skillId);

  if (!skill) {
    return (
      <div className="gl-card p-12 text-center space-y-4 my-8">
        <h2 className="text-xl font-bold text-[#1F1E1D]">Skill Not Found</h2>
        <Link href="/app/passport/skills" className="pill-btn pill-btn-primary inline-flex text-xs">
          Return to Skills
        </Link>
      </div>
    );
  }

  const linkedEvidence = evidenceItems.filter((e) => skill.evidenceIds.includes(e.id));

  const handleReportIncorrectMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagModalItem || !flagReason.trim()) return;

    // Log to audit history
    addHistoryEvent({
      timestamp: "Just now",
      skillId: skill.id,
      skillName: skill.canonicalName,
      eventType: "mapping_corrected",
      previousValue: `Linked to ${flagModalItem}`,
      newValue: "Mapping Flagged by Employee",
      reason: flagReason,
      relatedEvidenceId: flagModalItem,
      actor: "Reviewer (Alex Rivera)",
    });

    setFlagSuccessMessage(`Mapping for ${flagModalItem} reported and queued for calibration.`);
    setFlagModalItem(null);
    setFlagReason("");
    setTimeout(() => setFlagSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/passport" className="hover:text-[#1F1E1D]">
              Passport
            </Link>
            <span>/</span>
            <Link href={`/app/passport/skills/${skill.id}`} className="hover:text-[#1F1E1D]">
              {skill.canonicalName}
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Evidence Mapping</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            Evidence-to-Skill Mapping
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Granular inspection of the exact artifacts, commits, tickets, and document excerpts that substantiate <strong>{skill.canonicalName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/app/passport/skills/${skill.id}`}
            className="pill-btn pill-btn-secondary text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Profile
          </Link>
          <Link
            href="/app/evidence/connect"
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Connect More Evidence
          </Link>
        </div>
      </div>

      {/* Success Notification */}
      {flagSuccessMessage && (
        <div className="p-4 rounded-2xl bg-[#EBF3ED] border border-[#B8D7C2] flex items-center justify-between text-xs text-[#234D31] animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
            <span>{flagSuccessMessage}</span>
          </div>
          <button onClick={() => setFlagSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Trust & Provenance Card */}
      <div className="gl-card p-6 bg-gradient-to-br from-[#FAF8F5] to-[#F5EFE6] border-[#E8E1D5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[#8C827A] uppercase tracking-wider">
                Competency Profile
              </span>
              <SkillVerificationBadge state={skill.verificationState} />
            </div>
            <h2 className="text-xl font-bold text-[#1F1E1D]">{skill.canonicalName}</h2>
            <p className="text-xs text-[#5A5550] mt-1 max-w-xl">{skill.definition}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-center p-3 rounded-xl bg-white border border-[#E0D9CD]">
              <div className="text-2xl font-extrabold text-[#1F1E1D]">{linkedEvidence.length}</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Corroborating Items</div>
            </div>
            <div className="text-center p-3 rounded-xl bg-white border border-[#E0D9CD]">
              <div className="text-2xl font-extrabold text-[#2E6941]">{skill.confidence}%</div>
              <div className="text-[10px] uppercase font-bold text-[#8C827A]">Extraction Conf.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Mappings List */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1F1E1D]">
            Supporting Work Artifacts ({linkedEvidence.length})
          </h2>
          <span className="text-xs text-[#8C827A]">
            Sorted by relevance & attribution strength
          </span>
        </div>

        {linkedEvidence.length === 0 ? (
          <div className="gl-card p-12 text-center space-y-3">
            <Layers className="w-8 h-8 text-[#8C827A] mx-auto" />
            <h3 className="text-base font-bold text-[#1F1E1D]">No Evidence Mapped</h3>
            <p className="text-xs text-[#8C827A] max-w-sm mx-auto">
              This competency currently has no linked artifacts. Connect a repository or document to establish proof.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {linkedEvidence.map((ev, idx) => {
              // Extract matching candidate skill if present in evidence
              const candidateMatch = ev.candidateSkills.find(
                (cs) => cs.name.toLowerCase() === skill.canonicalName.toLowerCase() ||
                skill.aliases.some((a) => a.toLowerCase() === cs.name.toLowerCase())
              );

              return (
                <div key={ev.id} className="gl-card p-6 space-y-4 border-[#E4DDD3]">
                  {/* Item Header */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#EFEAE1] text-[#1F1E1D] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#EAE5DC] text-[#1F1E1D]">
                            {ev.sourceType}
                          </span>
                          <h3 className="text-sm font-bold text-[#1F1E1D]">{ev.title}</h3>
                        </div>
                        <div className="text-[11px] text-[#8C827A] mt-0.5">
                          ID: <span className="font-mono">{ev.id}</span> • Date: {ev.date} • Author Attribution: <strong className="text-[#1F1E1D]">{ev.author}</strong> ({ev.reviewStatus})
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/app/evidence/${ev.id}`}
                        className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1"
                      >
                        Inspect Full Artifact
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      <button
                        onClick={() => setFlagModalItem(ev.id)}
                        className="p-1.5 rounded-full text-[#8C827A] hover:text-[#BA1A1A] hover:bg-[#FBE8E8] transition-colors"
                        title="Report Inaccurate Mapping"
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary & Excerpt */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                        Artifact Summary & Work Scope
                      </span>
                      <p className="text-xs text-[#5A5550] leading-relaxed bg-[#FAF8F5] p-3 rounded-xl border border-[#EBE5DC]">
                        {ev.description || ev.extractedSummary}
                      </p>

                      {candidateMatch?.associationReason && (
                        <div className="text-xs text-[#2E6941] bg-[#EBF3ED] p-3 rounded-xl border border-[#B8D7C2]">
                          <strong>Extraction Rationale:</strong> {candidateMatch.associationReason}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-xl border border-[#EBE5DC]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                        Mapping Calibration
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[#8C827A]">Extraction Confidence:</span>
                          <strong className="text-[#1F1E1D]">{ev.extractionConfidence ?? skill.confidence}%</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8C827A]">Attribution State:</span>
                          <strong className="text-[#2E6941] capitalize">{ev.reviewStatus}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8C827A]">Demonstrated Level:</span>
                          <strong className="text-[#1F1E1D]">{candidateMatch?.proficiencyLevel ?? skill.verifiedProficiency}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#8C827A]">Review Status:</span>
                          <strong className="text-[#2E6941] capitalize">{candidateMatch?.status ?? "Reviewed"}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flag / Report Mapping Modal */}
      {flagModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E0D9CD] space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-[#BA1A1A]">
                <ShieldAlert className="w-4 h-4" />
                <span>Report Incorrect Evidence Mapping</span>
              </div>
              <button
                onClick={() => setFlagModalItem(null)}
                className="p-1 rounded-full text-[#8C827A] hover:text-[#1F1E1D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A5550] leading-relaxed">
              If this artifact does not meaningfully demonstrate <strong>{skill.canonicalName}</strong> (e.g. incidental library import, boiler-template code, or minor typo fix), please provide feedback. This prevents model hallucinations from polluting your verified passport.
            </p>

            <form onSubmit={handleReportIncorrectMapping} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#1F1E1D] mb-1">
                  Reason for flag / feedback
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this artifact does not substantiate this competency..."
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  className="pill-input rounded-2xl w-full text-xs p-3 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFlagModalItem(null)}
                  className="pill-btn pill-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pill-btn pill-btn-primary bg-[#BA1A1A] hover:bg-[#9E1414] text-white text-xs flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
