"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { trajectory, recommendations } from "@/lib/api";
import type { Learner, Recommendation } from "@/lib/types";
import {
  ExternalLink,
  Users,
  Video,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  HelpCircle,
  X,
  RefreshCw,
  AlertTriangle,
  Play,
  ArrowRight,
  ShieldCheck,
  Award,
} from "lucide-react";

export default function RecommendationsPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "MICRO_LEARNING" | "MENTORSHIP" | "EVIDENCE">("ALL");
  const [requestedMentors, setRequestedMentors] = useState<Record<string, boolean>>({});
  const [selectedEvidenceRec, setSelectedEvidenceRec] = useState<Recommendation | null>(null);

  // Load available learners on mount
  useEffect(() => {
    trajectory.learners().then((data) => {
      setLearners(data.learners);
      if (data.learners.length > 0) {
        setLearnerId(data.learners[0].learner_id);
      }
    });
  }, []);

  // Fetch recommendations whenever learnerId changes
  useEffect(() => {
    if (!learnerId) return;
    loadRecommendations(learnerId);
  }, [learnerId]);

  const loadRecommendations = (id: string) => {
    setLoading(true);
    setError("");
    recommendations
      .get(id, true)
      .then((data) => {
        setRecs(data.recommendations || []);
      })
      .catch((e) => {
        setError(e.message || "Failed to load next-action recommendations.");
      })
      .finally(() => setLoading(false));
  };

  const handleForceRegenerate = () => {
    if (!learnerId) return;
    setGenerating(true);
    recommendations
      .generate(learnerId)
      .then((res) => {
        setRecs(res.recommendations || []);
      })
      .catch((e) => {
        setError(e.message || "Failed to regenerate recommendations.");
      })
      .finally(() => setGenerating(false));
  };

  const handleRequestMentorship = async (rec: Recommendation) => {
    if (!rec.mentor_suggestion || !rec.id) return;
    const mentorId = rec.mentor_suggestion.mentor_id;
    try {
      await recommendations.requestMentorship(
        learnerId,
        mentorId,
        rec.competency,
        rec.id,
        `Growth Action Engine connection request for ${rec.competency}`
      );
      setRequestedMentors((prev) => ({ ...prev, [mentorId]: true }));
    } catch (e: any) {
      alert(e.message || "Could not complete mentorship request.");
    }
  };

  const handleUpdateStatus = async (recId: string, newStatus: "started" | "completed") => {
    try {
      await recommendations.updateStatus(recId, newStatus);
      setRecs((prev) =>
        prev.map((r) => (r.id === recId ? { ...r, status: newStatus } : r))
      );
    } catch (e) {
      console.error("Failed to update recommendation status:", e);
    }
  };

  const filtered = recs.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "MICRO_LEARNING") return r.action_type === "micro_learning" || (r.external_link && !r.mentor_suggestion);
    if (filter === "MENTORSHIP") return r.action_type === "peer_mentorship" || !!r.mentor_suggestion;
    if (filter === "EVIDENCE") return r.action_type === "evidence_gathering" || r.trend === "insufficient_evidence";
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
          {/* Header Block */}
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
                FEATURE 3 · NEXT-ACTION RECOMMENDATION ENGINE
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Recommended Actions
              </h1>
              <p className="text-sm font-medium text-[#1C1C1C]/70 mt-1 max-w-2xl">
                Evidence-grounded prescriptive development interventions. Converts Feature 2 competency trajectory
                signals into deep-linked micro-learning and verified peer mentorship.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-[#FAF7F2] border border-[#1C1C1C] px-3 py-1.5 rounded-full shadow-[2px_2px_0px_#1C1C1C]">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
                  LEARNER:
                </span>
                <select
                  value={learnerId}
                  onChange={(e) => setLearnerId(e.target.value)}
                  className="bg-transparent font-extrabold text-xs outline-none cursor-pointer"
                >
                  {learners.map((l) => (
                    <option key={l.learner_id} value={l.learner_id}>
                      {l.name} ({l.learner_id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleForceRegenerate}
                disabled={generating || loading}
                className="pill-btn pill-btn-secondary text-[11px] flex items-center gap-2 hover:bg-[#DFE968] transition-colors"
                title="Re-run Feature 2 LSTM trajectories through Feature 3 catalog rules"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                {generating ? "RE-EVALUATING ···" : "RE-EVALUATE ACTIONS"}
              </button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-[#1C1C1C]/10">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "ALL", label: "ALL INTERVENTIONS" },
                { key: "MICRO_LEARNING", label: "MICRO-LEARNING" },
                { key: "MENTORSHIP", label: "PEER MENTORSHIP" },
                { key: "EVIDENCE", label: "EVIDENCE GATHERING" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`pill-btn text-[10px] font-extrabold tracking-wider ${
                    filter === tab.key ? "pill-btn-primary" : "pill-btn-secondary"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-[#1C1C1C]/60">
              Showing {filtered.length} {filtered.length === 1 ? "action" : "actions"}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="text-center py-24">
              <div className="inline-block p-4 rounded-full bg-[#DFE968] border border-[#1C1C1C] animate-bounce mb-3 shadow-[3px_3px_0px_#1C1C1C]">
                <Sparkles className="w-6 h-6 text-[#1C1C1C]" />
              </div>
              <p className="text-sm font-extrabold tracking-[0.12em] uppercase text-[#1C1C1C]">
                ROUTING TRAJECTORY SIGNALS TO TARGETED INTERVENTIONS · · ·
              </p>
              <p className="text-xs text-[#1C1C1C]/60 mt-1 font-medium">
                Evaluating confidence gates, searching video transcripts, and querying verified peer mentors.
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="gl-card p-6 border-[#C85A54] bg-[#FFECEB] text-sm text-[#C85A54] mb-8 font-medium flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && filtered.length === 0 && (
            <div className="gl-card p-12 text-center max-w-xl mx-auto my-12">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center shadow-[3px_3px_0px_#1C1C1C]">
                <Award className="w-7 h-7 text-[#1C1C1C]" />
              </div>
              <h3 className="text-xl font-extrabold text-[#1C1C1C] mb-2">
                No Corrective Actions Needed!
              </h3>
              <p className="text-xs md:text-sm text-[#1C1C1C]/70 mb-6 leading-relaxed font-medium">
                All assessed competencies for this employee show positive trajectory momentum or are actively building baseline evidence.
              </p>
              <Link href="/employee/dashboard" className="pill-btn pill-btn-primary text-xs inline-flex items-center gap-2">
                VIEW TALENT INTELLIGENCE DASHBOARD →
              </Link>
            </div>
          )}

          {/* Recommendations Grid */}
          {!loading && !error && filtered.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              {filtered.map((rec, i) => {
                const isMentorship = rec.action_type === "peer_mentorship" || !!rec.mentor_suggestion;
                const isInsufficient = rec.action_type === "evidence_gathering" || rec.trend === "insufficient_evidence";
                const isCompleted = rec.status === "completed";
                const isStarted = rec.status === "started";
                const isLowConfidence = (rec.confidence || 0) < 0.50 && !isInsufficient;

                return (
                  <div
                    key={rec.id || i}
                    className={`gl-card p-6 md:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 ${
                      isCompleted ? "opacity-75 bg-[#F9F7F2]/80" : ""
                    }`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-[#1C1C1C]">
                            {rec.competency}
                          </span>
                          {rec.trend && (
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border border-[#1C1C1C] uppercase ${
                                rec.trend === "declining"
                                  ? "bg-[#FFECEB] text-[#C85A54]"
                                  : rec.trend === "improving"
                                  ? "bg-[#DFE968] text-[#1C1C1C]"
                                  : "bg-[#F3A878]/30 text-[#1C1C1C]"
                              }`}
                            >
                              {rec.trend.replace("_", " ")}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {rec.priority && (
                            <span
                              className={`text-[9px] font-extrabold px-2 py-0.5 rounded border border-[#1C1C1C] ${
                                rec.priority === "HIGH"
                                  ? "bg-[#C85A54] text-white"
                                  : rec.priority === "MEDIUM"
                                  ? "bg-[#F3A878] text-[#1C1C1C]"
                                  : "bg-white text-[#1C1C1C]"
                              }`}
                            >
                              {rec.priority}
                            </span>
                          )}
                          <span
                            className={`text-[9px] font-extrabold tracking-wider px-2.5 py-0.5 rounded-full border border-[#1C1C1C] ${
                              isMentorship
                                ? "bg-[#DFE968] text-[#1C1C1C]"
                                : isInsufficient
                                ? "bg-white text-[#1C1C1C]/70"
                                : "bg-[#F3A878] text-[#1C1C1C]"
                            }`}
                          >
                            {isMentorship
                              ? "PEER MENTORSHIP"
                              : isInsufficient
                              ? "CONTINUOUS EVIDENCE"
                              : "MICRO-LEARNING"}
                          </span>
                        </div>
                      </div>

                      {/* Action Title */}
                      <h3 className="text-base md:text-lg font-extrabold text-[#1C1C1C] mb-2 leading-snug">
                        {rec.action}
                      </h3>

                      {/* Justification */}
                      <p className="text-xs md:text-sm font-medium mb-4 leading-relaxed text-[#1C1C1C]/80">
                        {rec.justification}
                      </p>

                      {/* Low Confidence Uncertainty Warning */}
                      {isLowConfidence && (
                        <div className="bg-[#FFF8E7] border border-[#1C1C1C]/30 rounded-lg p-2.5 mb-4 text-[11px] font-medium text-[#1C1C1C]/80 flex items-start gap-2">
                          <Info className="w-4 h-4 text-[#C48C2C] shrink-0 mt-0.5" />
                          <span>
                            <strong>Uncertainty Notice:</strong> This action has moderate evidence confidence ({Math.round((rec.confidence || 0) * 100)}%). Evaluated as a potential development focus rather than a mandatory gap.
                          </span>
                        </div>
                      )}

                      {/* Micro-learning: YouTube Video Details & Deep Link */}
                      {rec.resource && (
                        <div className="bg-[#FAF7F2] border border-[#1C1C1C] rounded-xl p-3 mb-4 flex flex-col sm:flex-row gap-3">
                          {rec.resource.thumbnail_url && (
                            <div className="relative w-full sm:w-28 h-20 rounded-lg overflow-hidden border border-[#1C1C1C] shrink-0 bg-black">
                              <img
                                src={rec.resource.thumbnail_url}
                                alt={rec.resource.title}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white drop-shadow" />
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60 block mb-0.5">
                              {rec.resource.channel_title || "Verified Technical Tutorial"}
                            </span>
                            <h4 className="text-xs font-bold text-[#1C1C1C] truncate mb-1" title={rec.resource.title}>
                              {rec.resource.title}
                            </h4>
                            {rec.resource.timestamp_available ? (
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-[#1C1C1C] bg-[#DFE968] px-2 py-0.5 rounded border border-[#1C1C1C]">
                                <Clock className="w-3 h-3" />
                                Deep Link: Starts at {rec.resource.timestamp_formatted}
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-[#1C1C1C]/70 bg-white px-2 py-0.5 rounded border border-[#1C1C1C]/20">
                                Full Course Tutorial
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mentorship Suggestion Card */}
                      {rec.mentor_suggestion && (
                        <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-xl p-3 mb-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-bold text-sm shadow-[1px_1px_0px_#1C1C1C]">
                              <Users className="w-5 h-5 text-[#1C1C1C]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60">
                                  VERIFIED INTERNAL MENTOR
                                </span>
                                <ShieldCheck className="w-3 h-3 text-[#4A7A4E]" />
                              </div>
                              <p className="text-xs font-extrabold text-[#1C1C1C]">
                                {rec.mentor_suggestion.mentor_name}
                              </p>
                              <span className="text-[10px] text-[#1C1C1C]/70 font-medium">
                                Improving trajectory in {rec.competency} ({Math.round((rec.mentor_suggestion.mentor_confidence || 0.85) * 100)}% conf.)
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Trigger Citation */}
                      {rec.evidence_ref && (
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/50">
                            TRIGGERED BY:
                          </span>
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#1C1C1C]/20 bg-[#FAF7F2] truncate max-w-xs">
                            {rec.evidence_ref}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1C1C1C]/15">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Micro-learning Watch button */}
                        {rec.external_link && (
                          <a
                            href={rec.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => rec.id && handleUpdateStatus(rec.id, "started")}
                            className="pill-btn pill-btn-primary text-[10px] flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            {rec.resource?.timestamp_available
                              ? `WATCH FROM ${rec.resource.timestamp_formatted} →`
                              : "WATCH LESSON →"}
                          </a>
                        )}

                        {/* Mentorship Request Button */}
                        {rec.mentor_suggestion && (
                          <button
                            onClick={() => handleRequestMentorship(rec)}
                            disabled={requestedMentors[rec.mentor_suggestion.mentor_id] || isCompleted}
                            className={`pill-btn text-[10px] flex items-center gap-1.5 ${
                              requestedMentors[rec.mentor_suggestion.mentor_id]
                                ? "bg-[#4A7A4E] text-white border-[#4A7A4E]"
                                : "pill-btn-lime"
                            }`}
                          >
                            {requestedMentors[rec.mentor_suggestion.mentor_id] ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                MENTORSHIP REQUESTED!
                              </>
                            ) : (
                              <>
                                <Users className="w-3.5 h-3.5" />
                                CONNECT WITH MENTOR →
                              </>
                            )}
                          </button>
                        )}

                        {/* Mark Completed Toggle */}
                        {rec.id && !isInsufficient && (
                          <button
                            onClick={() =>
                              handleUpdateStatus(rec.id!, isCompleted ? "started" : "completed")
                            }
                            className={`pill-btn text-[10px] flex items-center gap-1 border border-[#1C1C1C] ${
                              isCompleted
                                ? "bg-[#DFE968] text-[#1C1C1C] font-extrabold"
                                : "bg-white hover:bg-[#FAF7F2] text-[#1C1C1C]/80"
                            }`}
                          >
                            <CheckCircle className="w-3 h-3" />
                            {isCompleted ? "COMPLETED ✓" : "MARK DONE"}
                          </button>
                        )}

                        {/* Insufficient Evidence link */}
                        {isInsufficient && (
                          <Link
                            href="/employee/evidence"
                            className="pill-btn pill-btn-secondary text-[10px] flex items-center gap-1"
                          >
                            SUBMIT OR SYNC EVIDENCE →
                          </Link>
                        )}
                      </div>

                      {/* Why this recommendation button */}
                      <button
                        onClick={() => setSelectedEvidenceRec(rec)}
                        className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/70 hover:text-[#1C1C1C] flex items-center gap-1 underline underline-offset-4 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        WHY THIS ACTION?
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* Evidence Grounding Drawer / Modal */}
        {selectedEvidenceRec && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn">
            <div className="gl-card max-w-2xl w-full p-6 md:p-8 max-h-[85vh] overflow-y-auto relative bg-[#FAF7F2] shadow-[8px_8px_0px_#1C1C1C]">
              <button
                onClick={() => setSelectedEvidenceRec(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full border border-[#1C1C1C] bg-white hover:bg-[#DFE968] transition-colors"
              >
                <X className="w-4 h-4 text-[#1C1C1C]" />
              </button>

              <div className="mb-6">
                <span className="inline-block px-2.5 py-0.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[9px] font-extrabold tracking-wider uppercase mb-2">
                  EVIDENCE PROVENANCE & RATIONALE
                </span>
                <h3 className="text-xl md:text-2xl font-extrabold text-[#1C1C1C]">
                  Why this action was recommended
                </h3>
                <p className="text-xs text-[#1C1C1C]/70 mt-1 font-medium">
                  Prescriptive rationale connecting Feature 1 evidence to Feature 2 trajectory and Feature 3 development intervention.
                </p>
              </div>

              {/* Competency & Trend Summary */}
              <div className="bg-white border border-[#1C1C1C] rounded-xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-[#1C1C1C]/50 uppercase tracking-wider block">
                    TARGET COMPETENCY
                  </span>
                  <span className="text-sm font-extrabold text-[#1C1C1C]">
                    {selectedEvidenceRec.competency}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#1C1C1C]/50 uppercase tracking-wider block">
                    OBSERVED TRAJECTORY
                  </span>
                  <span className="text-sm font-extrabold uppercase text-[#C85A54]">
                    {selectedEvidenceRec.trend || "DECLINING"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-[#1C1C1C]/50 uppercase tracking-wider block">
                    MODEL CONFIDENCE
                  </span>
                  <span className="text-sm font-extrabold text-[#1C1C1C]">
                    {Math.round((selectedEvidenceRec.confidence || 0) * 100)}%
                  </span>
                </div>
              </div>

              {/* AI Explanation / Prescriptive Reason */}
              <div className="mb-6">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1C1C] mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                  Prescriptive Rationale
                </h4>
                <div className="bg-[#FAF7F2] border border-[#1C1C1C] rounded-xl p-4 text-xs md:text-sm font-medium leading-relaxed text-[#1C1C1C]">
                  {selectedEvidenceRec.ai_explanation?.reason ||
                    selectedEvidenceRec.justification ||
                    "This action targets specific decelerations detected in recent code diffs, PR reviews, and sprint velocity."}
                </div>
              </div>

              {/* Supporting Evidence Items */}
              <div className="mb-6">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#1C1C1C] mb-2">
                  Triggering Feature 1 Evidence ({selectedEvidenceRec.supporting_evidence_details?.length || selectedEvidenceRec.evidence_refs?.length || 0})
                </h4>
                <div className="space-y-2.5">
                  {selectedEvidenceRec.supporting_evidence_details && selectedEvidenceRec.supporting_evidence_details.length > 0 ? (
                    selectedEvidenceRec.supporting_evidence_details.map((ev, idx) => (
                      <div key={ev.id || idx} className="bg-white border border-[#1C1C1C] rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-extrabold text-[#1C1C1C]">{ev.title || `Evidence ${ev.id}`}</span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#FAF7F2] border border-[#1C1C1C]/20 uppercase">
                            {ev.source || "github"}
                          </span>
                        </div>
                        {ev.content && (
                          <p className="text-[11px] text-[#1C1C1C]/75 line-clamp-2 font-medium">
                            {ev.content}
                          </p>
                        )}
                        {ev.occurred_at && (
                          <span className="text-[9px] text-[#1C1C1C]/50 block mt-1">
                            Recorded: {new Date(ev.occurred_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 bg-white border border-[#1C1C1C] rounded-lg text-xs text-[#1C1C1C]/70">
                      Citations: {selectedEvidenceRec.evidence_refs?.join(", ") || selectedEvidenceRec.evidence_ref || "Recent continuous commits"}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-between items-center pt-4 border-t border-[#1C1C1C]/15">
                <Link
                  href={`/employee/evidence?highlight=${selectedEvidenceRec.evidence_refs?.[0] || ""}`}
                  className="text-xs font-extrabold text-[#1C1C1C] underline flex items-center gap-1"
                >
                  VIEW RAW EVIDENCE STREAM <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => setSelectedEvidenceRec(null)}
                  className="pill-btn pill-btn-primary text-xs"
                >
                  CLOSE DRAWER
                </button>
              </div>
            </div>
          </div>
        )}

        <GlobalFooter />
      </div>
    </ProtectedRoute>
  );
}
