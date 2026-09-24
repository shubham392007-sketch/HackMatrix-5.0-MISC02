import React, { useState, useEffect } from "react";
import "./RecommendationsPanel.css";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

export default function RecommendationsPanel({ learnerId }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sentRequests, setSentRequests] = useState({});

  useEffect(() => {
    if (!learnerId) return;

    setLoading(true);
    fetch(`${API_BASE}/api/v1/learner/${learnerId}/recommendations`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setRecommendations(data.recommendations || []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [learnerId]);

  const handleMentorshipRequest = async (mentorId, competencyId) => {
    const key = `${mentorId}-${competencyId}`;
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/manager/mentorship/request`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manager_id: "mgr_1",
            mentee_id: learnerId,
            mentor_id: mentorId,
            competency_id: competencyId,
          }),
        }
      );
      if (!res.ok) throw new Error("Request failed");
      setSentRequests((prev) => ({ ...prev, [key]: true }));
    } catch {
      alert("Failed to send mentorship request. Please try again.");
    }
  };

  /* ── Render helpers ─────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="rec-panel">
        <h2 className="rec-title">Suggested Next Actions</h2>
        <div className="rec-skeleton">
          <div className="rec-skeleton-card" />
          <div className="rec-skeleton-card" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rec-panel">
        <h2 className="rec-title">Suggested Next Actions</h2>
        <p className="rec-error">⚠ Unable to load recommendations: {error}</p>
      </div>
    );
  }

  return (
    <div className="rec-panel">
      <h2 className="rec-title">
        <span className="rec-title-icon">🎯</span> Suggested Next Actions
      </h2>

      {recommendations.length === 0 && (
        <p className="rec-empty">
          No action items right now — you&apos;re on track! 🚀
        </p>
      )}

      <div className="rec-grid">
        {recommendations.map((rec, idx) => {
          const isMentorship = !!rec.mentor_suggestion;
          const requestKey = isMentorship
            ? `${rec.mentor_suggestion.mentor_id}-${rec.competency}`
            : null;

          return (
            <div
              key={idx}
              className={`rec-card ${isMentorship ? "rec-card--mentor" : "rec-card--tutorial"}`}
            >
              {/* Warning badge */}
              <div className="rec-badge">
                <span className="rec-badge-icon">⚠️</span>
                <span>Skill Warning</span>
              </div>

              {/* Competency header */}
              <h3 className="rec-competency">
                <span className="rec-competency-name">{rec.competency}</span> is
                declining
              </h3>

              {/* Evidence reference */}
              <p className="rec-evidence">
                Evidence Reference:{" "}
                <code className="rec-evidence-code">{rec.evidence_ref}</code>
              </p>

              {/* Action description */}
              <p className="rec-action-label">{rec.action}</p>

              {/* CTA buttons */}
              {rec.external_link && (
                <a
                  href={rec.external_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rec-btn rec-btn--tutorial"
                >
                  ▶ Watch Recommended Tutorial
                </a>
              )}

              {rec.mentor_suggestion && (
                <button
                  className={`rec-btn rec-btn--mentor ${sentRequests[requestKey] ? "rec-btn--sent" : ""}`}
                  disabled={!!sentRequests[requestKey]}
                  onClick={() =>
                    handleMentorshipRequest(
                      rec.mentor_suggestion.mentor_id,
                      rec.competency
                    )
                  }
                >
                  {sentRequests[requestKey]
                    ? "✓ Request Sent!"
                    : `🤝 Request Peer Mentorship from ${rec.mentor_suggestion.mentor_name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
