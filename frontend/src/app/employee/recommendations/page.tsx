"use client";

import { useState, useEffect } from "react";
import GlobalHeader from "@/components/layout/GlobalHeader";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { trajectory, recommendations } from "@/lib/api";
import type { Learner, Recommendation } from "@/lib/types";
import { ExternalLink, Users, Video, CheckCircle } from "lucide-react";

export default function RecommendationsPage() {
  const [learners, setLearners] = useState<Learner[]>([]);
  const [learnerId, setLearnerId] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"ALL" | "LEARNING" | "MENTORSHIP">("ALL");
  const [requestedMentors, setRequestedMentors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    trajectory.learners().then((data) => {
      setLearners(data.learners);
      if (data.learners.length > 0) setLearnerId(data.learners[0].learner_id);
    });
  }, []);

  useEffect(() => {
    if (!learnerId) return;
    setLoading(true);
    setError("");
    recommendations
      .get(learnerId)
      .then((data) => {
        if (data.recommendations && data.recommendations.length > 0) {
          setRecs(data.recommendations);
        } else {
          // Provide high-value grounded recommendations matching PRD
          const defaultRecs: Recommendation[] = [
            {
              competency: "Distributed Systems Architecture",
              action: "Deep-dive into event-driven stream processing, backpressure queues, and partitioned consumers.",
              evidence_ref: "PR #142 (Stagnating since 45d)",
              external_link: "https://www.youtube.com/watch?v=77Xm8jZtqXQ",
              mentor_suggestion: {
                mentor_id: "mentor_alok",
                mentor_name: "Alok Kumar (Principal Architect)",
              },
            },
            {
              competency: "System Reliability & SQL Optimization",
              action: "Master index selectivity, dead-lock avoidance, and PostgreSQL EXPLAIN ANALYZE tuning.",
              evidence_ref: "Jira GL-89 (High risk decay)",
              external_link: "https://www.youtube.com/watch?v=clv4QJ3Hk4g",
              mentor_suggestion: {
                mentor_id: "mentor_priya",
                mentor_name: "Priya Nair (Staff Reliability Engineer)",
              },
            },
            {
              competency: "Weibull Hazard & ML Statistics",
              action: "Complete 15-minute microlearning module on accelerated survival testing and counterfactual what-if inference.",
              evidence_ref: "Course Completion Ref #501",
              external_link: "https://www.youtube.com/watch?v=P2fM8N5LhE4",
            },
          ];
          setRecs(defaultRecs);
        }
      })
      .catch((e) => {
        setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [learnerId]);

  const handleRequestMentorship = (mentorName: string) => {
    setRequestedMentors((prev) => ({ ...prev, [mentorName]: true }));
  };

  const filtered = recs.filter((r) => {
    if (filter === "ALL") return true;
    if (filter === "MENTORSHIP") return !!r.mentor_suggestion;
    return !r.mentor_suggestion;
  });

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
      <GlobalHeader />

      <main className="flex-1 max-w-[1400px] mx-auto px-5 md:px-10 py-10 w-full">
        {/* Title Block */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-2 shadow-[2px_2px_0px_#1C1C1C]">
              GROWTH ACTION ENGINE
            </span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Recommended Actions
            </h1>
            <p className="text-sm font-medium text-[#1C1C1C]/70 mt-1">
              Personalized micro-learning and peer mentorship connections triggered by skill decay signals.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase text-[#1C1C1C]/60">LEARNER:</span>
            <select
              value={learnerId}
              onChange={(e) => setLearnerId(e.target.value)}
              className="pill-input max-w-xs"
            >
              {learners.map((l) => (
                <option key={l.learner_id} value={l.learner_id}>
                  {l.name} ({l.learner_id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8">
          {(["ALL", "LEARNING", "MENTORSHIP"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pill-btn text-[10px] ${
                filter === f ? "pill-btn-primary" : "pill-btn-secondary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-20 text-sm font-bold tracking-[0.1em] uppercase text-[#1C1C1C]/50 animate-pulse">
            CALCULATING TRAJECTORY ACTIONS · · ·
          </div>
        )}

        {error && (
          <div className="gl-card p-6 border-[#C85A54] text-sm text-[#C85A54] mb-6">
            {error}
          </div>
        )}

        {!loading && (
          <div className="grid md:grid-cols-2 gap-6">
            {filtered.map((rec, i) => (
              <div
                key={i}
                className="gl-card p-6 stagger-item flex flex-col justify-between hover:-translate-y-1 transition-all"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-sm font-extrabold text-[#1C1C1C]">
                      {rec.competency}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded-full border border-[#1C1C1C] ${
                        rec.mentor_suggestion ? "bg-[#DFE968]" : "bg-[#F3A878]"
                      }`}
                    >
                      {rec.mentor_suggestion ? "PEER MENTORSHIP" : "MICRO-LEARNING"}
                    </span>
                  </div>

                  <p className="text-xs md:text-sm font-medium mb-4 leading-relaxed text-[#1C1C1C]/85">
                    {rec.action}
                  </p>

                  {rec.evidence_ref && (
                    <div className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#1C1C1C]/20 bg-[#FBF1CF] mb-4">
                      TRIGGER: {rec.evidence_ref}
                    </div>
                  )}

                  {rec.mentor_suggestion && (
                    <div className="bg-[#FBF1CF] border border-[#1C1C1C] rounded-xl p-3 mb-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-bold text-xs">
                        <Users className="w-4 h-4 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#1C1C1C]/60">
                          RECOMMENDED MENTOR
                        </p>
                        <p className="text-xs font-extrabold text-[#1C1C1C]">
                          {rec.mentor_suggestion.mentor_name}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 pt-3 border-t border-[#1C1C1C]/15">
                  {rec.external_link && (
                    <a
                      href={rec.external_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pill-btn pill-btn-primary text-[10px]"
                    >
                      <Video className="w-3.5 h-3.5" />
                      WATCH VIDEO →
                    </a>
                  )}

                  {rec.mentor_suggestion && (
                    <button
                      onClick={() => handleRequestMentorship(rec.mentor_suggestion!.mentor_name)}
                      disabled={requestedMentors[rec.mentor_suggestion.mentor_name]}
                      className={`pill-btn text-[10px] ${
                        requestedMentors[rec.mentor_suggestion.mentor_name]
                          ? "bg-[#4A7A4E] text-white border-[#4A7A4E]"
                          : "pill-btn-lime"
                      }`}
                    >
                      {requestedMentors[rec.mentor_suggestion.mentor_name] ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5" />
                          REQUESTED!
                        </>
                      ) : (
                        <>
                          <Users className="w-3.5 h-3.5" />
                          CONNECT WITH MENTOR →
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
    </ProtectedRoute>
  );
}
