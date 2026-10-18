"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import {
  SkillVerificationBadge,
  ProficiencyBadge,
  CoverageBadge,
} from "@/components/app/SkillBadges";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Filter,
  Search,
  Sparkles,
  Layers,
  FileText,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";

export default function CandidateSkillReviewPage() {
  const {
    skills,
    evidenceItems,
    reviewCandidateSkill,
  } = useEvidence();

  const [search, setSearch] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    text: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  // Candidate skills from skills list with verificationState === 'candidate' or 'insufficient_evidence'
  const candidateSkills = skills.filter(
    (s) => s.verificationState === "candidate" || s.verificationState === "insufficient_evidence"
  );

  const filteredCandidates = candidateSkills.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.canonicalName.toLowerCase().includes(q) ||
      s.definition.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const handlePromote = async (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    setIsSubmitting(skillId);
    try {
      await reviewCandidateSkill(
        skillId,
        "verify",
        `Promoted to verified competency via candidate review queue.`
      );
      setFeedbackMessage({
        text: `Promoted "${skill.canonicalName}" to Verified Competencies.`,
        type: "success",
      });
    } catch (err: any) {
      setFeedbackMessage({
        text: `Failed to promote "${skill.canonicalName}": ${err.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleFlagIncorrect = async (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    setIsSubmitting(skillId);
    try {
      await reviewCandidateSkill(
        skillId,
        "reject",
        `Rejected by reviewer: superficial keyword match without substantial depth.`
      );
      setFeedbackMessage({
        text: `Flagged "${skill.canonicalName}" as incorrect extraction.`,
        type: "error",
      });
    } catch (err: any) {
      setFeedbackMessage({
        text: `Failed to reject "${skill.canonicalName}": ${err.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const handleMarkInsufficient = async (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;

    setIsSubmitting(skillId);
    try {
      await reviewCandidateSkill(
        skillId,
        "flag_insufficient",
        `Flagged as insufficient evidence. Needs corroborating workplace codebase artifacts.`
      );
      setFeedbackMessage({
        text: `Marked "${skill.canonicalName}" as Insufficient Evidence.`,
        type: "warning",
      });
    } catch (err: any) {
      setFeedbackMessage({
        text: `Failed to mark "${skill.canonicalName}": ${err.message || "Unknown error"}`,
        type: "error",
      });
    } finally {
      setIsSubmitting(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };


  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Candidate Skill Review"
        description="Provisional competencies extracted by pipeline models. Inspect the extracted rationale and corroborate evidence before promoting to your permanent passport."
        badge="Domain 2 · Candidate Queue"
        badgeColor="border-amber-300 text-amber-900 bg-amber-50"
      >
        <Link
          href="/app/passport/skills"
          className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
        >
          Verified Skills
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {/* Trust Philosophy Banner */}
      <div className="p-4 rounded-2xl bg-[#FFF6E9] border border-[#F0D5B5] flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#B07219] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-[#6B4710] leading-relaxed">
          <strong className="font-bold">Human-in-the-Loop Governance:</strong> Extracted candidate claims remain segregated here. A candidate never automatically gains verified status merely from high language-model extraction scores. Promoting a skill requires human verification.
        </div>
      </div>

      {/* Action Toast */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2 animate-fade-in ${
            feedbackMessage.type === "success"
              ? "bg-[#EBF3ED] text-[#234D31] border border-[#B8D7C2]"
              : feedbackMessage.type === "warning"
              ? "bg-[#FFF6E9] text-[#6B4710] border border-[#F0D5B5]"
              : "bg-[#FBE8E8] text-[#801414] border border-[#E8B8B8]"
          }`}
        >
          {feedbackMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
          ) : feedbackMessage.type === "warning" ? (
            <AlertTriangle className="w-4 h-4 text-[#B07219]" />
          ) : (
            <XCircle className="w-4 h-4 text-[#BA1A1A]" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="gl-card p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
          <input
            type="text"
            placeholder="Search candidate claims by name, concept, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pill-input pl-10 text-xs w-full"
          />
        </div>
      </div>

      {/* Candidates List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#1F1E1D]">
            Pending Candidate Queue ({filteredCandidates.length})
          </h2>
          <span className="text-xs text-[#8C827A]">
            Requires corroboration or calibration
          </span>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="gl-card p-12 text-center space-y-3">
            <CheckCircle2 className="w-8 h-8 text-[#2E6941] mx-auto" />
            <h3 className="text-base font-bold text-[#1F1E1D]">Candidate Queue Clear</h3>
            <p className="text-xs text-[#8C827A] max-w-sm mx-auto">
              All extracted competencies have been reviewed. Connect new repositories to ingest additional candidate skills.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredCandidates.map((cand) => {
              const linkedEv = evidenceItems.filter((e) => cand.evidenceIds.includes(e.id));

              return (
                <div
                  key={cand.id}
                  className="gl-card p-6 space-y-4 border-[#E4DDD3] hover:shadow-sm transition-shadow"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                          {cand.category}
                        </span>
                        <SkillVerificationBadge state={cand.verificationState} />
                        <CoverageBadge state={cand.coverageState} />
                      </div>
                      <h3 className="text-lg font-bold text-[#1F1E1D]">
                        {cand.canonicalName}
                      </h3>
                      <p className="text-xs text-[#5A5550] mt-1">{cand.definition}</p>
                    </div>

                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8C827A]">Model Suggestion:</span>
                        <ProficiencyBadge level={cand.estimatedProficiency} />
                      </div>
                      <span className="text-[11px] font-bold text-[#2E6941]">
                        {cand.confidence}% Extraction Confidence
                      </span>
                    </div>
                  </div>

                  {/* Extraction Rationale & Evidence Details */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
                    <div className="lg:col-span-2 space-y-2">
                      <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                          AI Pipeline Extraction Rationale
                        </span>
                        <p className="text-xs text-[#1F1E1D] leading-relaxed">
                          {cand.assessmentRationale}
                        </p>
                        {cand.limitations && (
                          <p className="text-[11px] text-[#BA1A1A] pt-1 border-t border-[#F0EBE1]">
                            <strong>Notice:</strong> {cand.limitations}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A] block">
                        Corroborating Work Artifacts ({linkedEv.length})
                      </span>
                      {linkedEv.length === 0 ? (
                        <div className="text-[11px] text-[#8C827A] italic p-3 bg-[#FAF8F5] rounded-xl border border-[#EBE5DC]">
                          No direct codebase artifacts attached yet.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {linkedEv.map((ev) => (
                            <Link
                              key={ev.id}
                              href={`/app/evidence/${ev.id}`}
                              className="flex items-center justify-between p-2 rounded-xl bg-[#FAF8F5] hover:bg-[#F0EBE1] transition-colors text-[11px]"
                            >
                              <span className="truncate font-medium text-[#1F1E1D]">{ev.title}</span>
                              <ExternalLink className="w-3 h-3 text-[#8C827A] flex-shrink-0 ml-1" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Review Buttons */}
                  <div className="pt-4 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href={`/app/passport/skills/${cand.id}/evidence`}
                      className="text-xs font-semibold text-[#8C827A] hover:text-[#1F1E1D] flex items-center gap-1"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      Detailed Evidence Map
                    </Link>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleFlagIncorrect(cand.id)}
                        disabled={isSubmitting === cand.id}
                        className="pill-btn pill-btn-secondary text-xs text-[#BA1A1A] hover:bg-[#FBE8E8] flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject / Flag Incorrect
                      </button>

                      <button
                        onClick={() => handleMarkInsufficient(cand.id)}
                        disabled={isSubmitting === cand.id}
                        className="pill-btn pill-btn-secondary text-xs text-[#B07219] hover:bg-[#FFF6E9] flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Insufficient Evidence
                      </button>

                      <button
                        onClick={() => handlePromote(cand.id)}
                        disabled={isSubmitting === cand.id}
                        className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isSubmitting === cand.id ? "Promoting..." : "Confirm & Promote to Verified"}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
