"use client";

import React, { useState } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Layers,
  Search,
  ExternalLink,
  Flag,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Plus,
  Send,
  X,
} from "lucide-react";

export default function EvidenceMappingReviewPage() {
  const {
    evidenceMappings,
    extractionCandidates,
    evidenceItems,
    userProfile,
    addAIAuditEvent,
  } = useEvidence();

  const [selectedMappingId, setSelectedMappingId] = useState<string>(
    evidenceMappings[0]?.id || ""
  );
  const [search, setSearch] = useState("");
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  React.useEffect(() => {
    if (!selectedMappingId && evidenceMappings.length > 0) {
      setSelectedMappingId(evidenceMappings[0].id);
    }
  }, [evidenceMappings, selectedMappingId]);

  const activeMapping = evidenceMappings.find((m) => m.id === selectedMappingId);
  const matchingEvidence = activeMapping
    ? evidenceItems.find((e) => e.id === activeMapping.evidence_id)
    : null;

  const filteredMappings = evidenceMappings.filter((m) => {
    const q = search.toLowerCase();
    return (
      m.candidate_label.toLowerCase().includes(q) ||
      m.evidence_title.toLowerCase().includes(q) ||
      m.source_type.toLowerCase().includes(q)
    );
  });

  const getRelationshipBadge = (rel: string) => {
    switch (rel) {
      case "direct_implementation":
        return { label: "Direct Implementation", bg: "bg-[#EBF3ED] text-[#2E6941] border-[#B8D7C2]" };
      case "project_documentation":
        return { label: "Project Documentation", bg: "bg-[#F0F4FF] text-[#1E3A8A] border-[#C5D5F9]" };
      case "course_certificate":
        return { label: "Course Certificate", bg: "bg-[#FFF6E9] text-[#B07219] border-[#F0D5B5]" };
      case "self_claim":
        return { label: "Self-Reported Claim", bg: "bg-[#FBE8E8] text-[#BA1A1A] border-[#E8B8B8]" };
      default:
        return { label: rel, bg: "bg-[#EFEAE1] text-[#1F1E1D] border-[#E0D9CD]" };
    }
  };

  const handleReportIncorrectMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMapping || !flagReason.trim()) return;

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "review_decision",
      affected_entity_type: "candidate_skill",
      affected_entity_id: activeMapping.candidate_skill_id,
      new_state: "Mapping Flagged by Reviewer",
      reason: flagReason,
      actor: userProfile.displayName ? `Reviewer (${userProfile.displayName})` : "Authorized Reviewer",
    });

    setFeedbackToast(`Mapping reported for calibration: "${flagReason}"`);
    setFlagModalOpen(false);
    setFlagReason("");
    setTimeout(() => setFeedbackToast(null), 4000);
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Evidence Mapping Review"
        description="Inspect the exact work locus, code excerpt, and artifact that connects a candidate claim to source evidence."
      >
        <Link
          href="/app/ai/verification"
          className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5"
        >
          <span>VERIFICATION REVIEW</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">

      {feedbackToast && (
        <div className="p-3.5 rounded-2xl bg-[#EBF3ED] border border-[#B8D7C2] flex items-center justify-between text-xs text-[#234D31] animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2E6941]" />
            <span>{feedbackToast}</span>
          </div>
          <button onClick={() => setFeedbackToast(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Split Interface: Left = Claims / Mappings, Right = Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Side: Mapping Rows (5 cols) */}
        <div className="lg:col-span-5 gl-card p-4 space-y-4 border-[#E4DDD3]">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-[#1F1E1D] uppercase tracking-wider">
              Evidence Mappings ({evidenceMappings.length})
            </h2>
            <span className="text-[10px] text-[#8C827A]">Many-to-Many Graph</span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Search mappings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-9 text-xs w-full py-1.5"
            />
          </div>

          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredMappings.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#8C827A] space-y-2">
                <Layers className="w-8 h-8 text-[#8C827A] mx-auto opacity-50" />
                <p className="font-bold text-[#1F1E1D]">No Evidence Mappings Found</p>
                <p>Run skill extraction on your ingested sources to map candidate skills to evidence.</p>
              </div>
            ) : (
              filteredMappings.map((map) => {
                const isSelected = map.id === selectedMappingId;
              const relMeta = getRelationshipBadge(map.relationship_type);

              return (
                <div
                  key={map.id}
                  onClick={() => setSelectedMappingId(map.id)}
                  className={`p-3.5 rounded-2xl cursor-pointer border transition-all text-xs ${
                    isSelected
                      ? "bg-[#F7F4EC] border-[#1C1C1C] shadow-sm"
                      : "bg-[#FAF8F5] border-[#EBE5DC] hover:border-[#D5CDBD]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="font-bold text-[#1F1E1D]">{map.candidate_label}</span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${relMeta.bg}`}>
                      {map.source_type}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5A5550] line-clamp-1">
                    Artifact: {map.evidence_title}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#F0EBE1] text-[10px]">
                    <span className="text-[#8C827A]">
                      Relevance Score: <strong>{map.relevance_score}%</strong>
                    </span>
                    <span className="capitalize font-semibold text-[#2E6941]">
                      {map.attribution_state}
                    </span>
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Side: Selected Mapping Locus & Excerpt (7 cols) */}
        <div className="lg:col-span-7 gl-card p-6 space-y-5 border-[#E4DDD3]">
          {!activeMapping ? (
            <div className="text-center py-12 text-xs text-[#8C827A]">
              Select a mapping on the left to inspect its evidence substantiation.
            </div>
          ) : (
            <>
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-[#F0EBE1]">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                      Candidate Claim
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        getRelationshipBadge(activeMapping.relationship_type).bg
                      }`}
                    >
                      {getRelationshipBadge(activeMapping.relationship_type).label}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-[#1F1E1D]">
                    {activeMapping.candidate_label}
                  </h3>
                  <p className="text-xs text-[#5A5550] mt-0.5">
                    Resolves to:{" "}
                    <Link
                      href={`/app/passport/skills/${activeMapping.canonical_skill_id}`}
                      className="font-bold text-[#1F1E1D] hover:underline"
                    >
                      {activeMapping.canonical_skill_id}
                    </Link>
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-2xl font-black text-[#2E6941]">
                    {activeMapping.relevance_score}%
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#8C827A]">
                    Relevance Score
                  </span>
                </div>
              </div>

              {/* Source Provenance */}
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                    Corroborating Work Artifact
                  </span>
                  <span className="text-[10px] text-[#8C827A]">{activeMapping.occurred_date}</span>
                </div>
                <div className="font-bold text-sm text-[#1F1E1D]">
                  {activeMapping.evidence_title}
                </div>
                <div className="flex items-center gap-4 text-[11px] text-[#5A5550]">
                  <span>Source Type: <strong className="uppercase">{activeMapping.source_type}</strong></span>
                  <span>•</span>
                  <span>Attribution: <strong className="capitalize">{activeMapping.attribution_state}</strong></span>
                </div>
              </div>

              {/* Verbatim Supporting Excerpt / Code Locus */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Verbatim Source Locus & Excerpt
                </span>
                <div className="p-4 rounded-xl bg-white border border-[#EAE4D8] font-mono text-[11px] text-[#1F1E1D] leading-relaxed shadow-inner overflow-x-auto">
                  {activeMapping.supporting_excerpt}
                </div>
              </div>

              {/* Evidence Review History */}
              <div className="space-y-2 pt-2 border-t border-[#F0EBE1] text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Mapping Audit Events
                </span>
                <div className="space-y-1.5">
                  {activeMapping.review_history.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-[#FAF8F5] text-[11px]"
                    >
                      <span className="text-[#1F1E1D] font-medium">{h.action}</span>
                      <span className="text-[#8C827A]">
                        {h.actor} • {h.timestamp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#F0EBE1] flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => setFlagModalOpen(true)}
                  className="pill-btn pill-btn-secondary text-xs text-[#BA1A1A] hover:bg-[#FBE8E8] flex items-center gap-1.5"
                >
                  <Flag className="w-3.5 h-3.5" />
                  Report Incorrect Mapping
                </button>

                <div className="flex items-center gap-2">
                  {matchingEvidence && (
                    <Link
                      href={`/app/evidence/${matchingEvidence.id}`}
                      className="pill-btn pill-btn-secondary text-xs flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Open Full Artifact
                    </Link>
                  )}
                  <Link
                    href={`/app/passport/skills/${activeMapping.canonical_skill_id}`}
                    className="pill-btn pill-btn-primary text-xs flex items-center gap-1"
                  >
                    View Passport Skill Profile
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Modal */}
      {flagModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-[#E0D9CD] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#BA1A1A] flex items-center gap-1.5">
                <Flag className="w-4 h-4" />
                Report Incorrect Evidence Mapping
              </h3>
              <button onClick={() => setFlagModalOpen(false)}>
                <X className="w-4 h-4 text-[#8C827A]" />
              </button>
            </div>
            <p className="text-xs text-[#5A5550]">
              Explain why this artifact does not meaningfully substantiate{" "}
              <strong>{activeMapping?.candidate_label}</strong>.
            </p>
            <form onSubmit={handleReportIncorrectMapping} className="space-y-4">
              <textarea
                rows={3}
                required
                placeholder="Reason (e.g. incidental import, boilerplate tutorial code, or wrong author)..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                className="pill-input rounded-2xl w-full text-xs p-3 h-24 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFlagModalOpen(false)}
                  className="pill-btn pill-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pill-btn pill-btn-primary bg-[#BA1A1A] text-white text-xs flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  Submit Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
