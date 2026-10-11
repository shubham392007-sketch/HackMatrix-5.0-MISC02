"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  Filter,
  Sparkles,
  Info,
  ChevronRight,
  RefreshCw,
  Search,
  ExternalLink,
  Layers,
  FileText,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import { GuardClaimResult, GuardOutcome } from "@/types/ai";
import {
  DemoDataNotice,
  DemoRoleSelector,
  GuardOutcomeBadge,
} from "@/components/app/AIBadges";
import AppTopBar from "@/components/app/AppTopBar";

export default function HallucinationGuardPage() {
  const { guardResults, updateGuardResult, addAIAuditEvent, currentRole } =
    useEvidence();
  const [filterOutcome, setFilterOutcome] = useState<string>("ALL");
  const [selectedClaimId, setSelectedClaimId] = useState<string>(
    guardResults[0]?.id || "grd-01"
  );
  const [simClaimTitle, setSimClaimTitle] = useState("");
  const [simSkill, setSimSkill] = useState("skill-python");
  const [simLevel, setSimLevel] = useState("Practitioner");
  const [simEvidenceId, setSimEvidenceId] = useState("ev-01");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedClaim =
    guardResults.find((g) => g.id === selectedClaimId) || guardResults[0];

  const filteredResults = guardResults.filter((g) => {
    if (filterOutcome === "ALL") return true;
    return g.guard_outcome === filterOutcome;
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSimulateCustomClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simClaimTitle.trim()) return;

    // Check rules
    const isFakeId =
      simEvidenceId.includes("fake") || simEvidenceId.includes("999");
    const isNoEvidence = !simEvidenceId || simEvidenceId === "none";
    const isCertOnly = simEvidenceId === "ev-04" && (simLevel === "Practitioner" || simLevel === "Expert");

    let outcome: GuardOutcome = "PASS";
    let reasonCode = "EVIDENCE_AUTHENTICATED";
    let explanation =
      "Evidence exists, belongs to user, semantically supports the skill, and aligns with claimed proficiency.";

    const checks = {
      evidence_exists: !isFakeId && !isNoEvidence,
      user_owns_evidence: !isFakeId,
      semantic_support_valid: !isFakeId && !isNoEvidence,
      attribution_valid: true,
      no_conflict: true,
      level_supported: !isCertOnly,
      not_revoked: true,
    };

    if (isFakeId) {
      outcome = "BLOCK";
      reasonCode = "INVENTED_EVIDENCE_ID";
      explanation = `Referenced evidence ID '${simEvidenceId}' was not found in the ingestion index. Blocked as model hallucination.`;
    } else if (isNoEvidence) {
      outcome = "INSUFFICIENT_EVIDENCE";
      reasonCode = "ZERO_ATTRIBUTABLE_ARTIFACTS";
      explanation =
        "Claim is completely unbacked by any ingested repository, document, or assessment artifact.";
    } else if (isCertOnly) {
      outcome = "INSUFFICIENT_EVIDENCE";
      reasonCode = "LEVEL_NOT_SUPPORTED";
      explanation =
        "Course completion certificates substantiate theoretical foundation only, not applied workplace Practitioner/Expert level.";
    }

    const newGuardId = `grd-${Date.now()}`;
    const newRecord: GuardClaimResult = {
      id: newGuardId,
      claim_title: simClaimTitle,
      associated_skill: simSkill,
      claimed_level: simLevel,
      evidence_id: isNoEvidence ? null : simEvidenceId,
      guard_outcome: outcome,
      reason_code: reasonCode,
      explanation,
      checks,
    };

    updateGuardResult(newGuardId, newRecord);

    addAIAuditEvent({
      timestamp: "Just now",
      event_type: outcome === "BLOCK" ? "guard_blocked" : "review_decision",
      affected_entity_type: "candidate_skill",
      affected_entity_id: newGuardId,
      new_state: `Guard Evaluated: ${outcome}`,
      reason: explanation,
      actor: `${currentRole === "admin" ? "Admin" : "System"} Guard Tester`,
      model_or_policy_version: "guard-v2.4",
    });

    setSelectedClaimId(newGuardId);
    setSimClaimTitle("");
    showToast(`Claim evaluated: Guard returned [${outcome}]. Logged to Audit.`);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-sand" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AppTopBar
        title="Hallucination / Unsupported-Claim Guard"
        description="GrowthLens executes a deterministic seven-point verification gate before any AI extraction can be linked to a candidate skill or promoted to a verified passport credential."
        badge="Policy Enforcement"
        badgeColor="border-red-300 text-red-900 bg-red-100"
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">

      {/* The 7 Automated Checks Banner */}
      <div className="gl-card p-5 bg-gradient-to-r from-red-50/40 via-amber-50/20 to-white border border-red-200">
        <h3 className="text-xs font-mono uppercase tracking-wider text-red-950 font-bold mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-700" />
          The Seven Deterministic Verification Checks
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">1. Evidence Exists</span>
            <span className="text-ink-muted text-[11px]">Database lookup confirms cited artifact ID exists.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">2. User Ownership</span>
            <span className="text-ink-muted text-[11px]">Git author / Jira assignee matches authenticated user identity.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">3. Semantic Validity</span>
            <span className="text-ink-muted text-[11px]">Content embeddings prove direct implementation, not casual mention.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">4. Attribution Match</span>
            <span className="text-ink-muted text-[11px]">Solo vs co-authored weighting verified against commit trailer.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">5. Zero Conflict</span>
            <span className="text-ink-muted text-[11px]">No open contradictory timeline or proficiency disputes exist.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100">
            <span className="font-mono font-bold text-red-900 block mb-0.5">6. Level Supported</span>
            <span className="text-ink-muted text-[11px]">Claimed proficiency level matches rubric depth requirements.</span>
          </div>
          <div className="p-3 bg-white rounded-lg border border-red-100 sm:col-span-2">
            <span className="font-mono font-bold text-red-900 block mb-0.5">7. Unrevoked Status</span>
            <span className="text-ink-muted text-[11px]">Underlying certificate or credential has not expired or been rescinded.</span>
          </div>
        </div>
      </div>

      {/* Outcome KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="gl-card p-3.5 bg-white text-center">
          <span className="text-[11px] font-mono text-ink-muted uppercase">Evaluated Claims</span>
          <p className="text-xl font-bold text-ink mt-1">{guardResults.length}</p>
        </div>
        <div className="gl-card p-3.5 bg-emerald-50/50 border-emerald-200 text-center">
          <span className="text-[11px] font-mono text-emerald-900 uppercase">PASS</span>
          <p className="text-xl font-bold text-emerald-900 mt-1">
            {guardResults.filter((r) => r.guard_outcome === "PASS").length}
          </p>
        </div>
        <div className="gl-card p-3.5 bg-red-50/50 border-red-200 text-center">
          <span className="text-[11px] font-mono text-red-900 uppercase">BLOCK</span>
          <p className="text-xl font-bold text-red-900 mt-1">
            {guardResults.filter((r) => r.guard_outcome === "BLOCK").length}
          </p>
        </div>
        <div className="gl-card p-3.5 bg-amber-50/50 border-amber-200 text-center">
          <span className="text-[11px] font-mono text-amber-900 uppercase">INSUFFICIENT</span>
          <p className="text-xl font-bold text-amber-900 mt-1">
            {guardResults.filter((r) => r.guard_outcome === "INSUFFICIENT_EVIDENCE").length}
          </p>
        </div>
        <div className="gl-card p-3.5 bg-purple-50/50 border-purple-200 text-center">
          <span className="text-[11px] font-mono text-purple-900 uppercase">CONFLICT</span>
          <p className="text-xl font-bold text-purple-900 mt-1">
            {guardResults.filter((r) => r.guard_outcome === "CONFLICT").length}
          </p>
        </div>
      </div>

      {/* Main Layout: Claims List & Inspection Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Filterable Evaluated Claims List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-ink" />
              Guard Audited Claims ({filteredResults.length})
            </h3>
            {/* Filter buttons */}
            <div className="flex items-center gap-1 bg-ink/5 p-1 rounded-full text-[11px]">
              {(["ALL", "PASS", "BLOCK", "INSUFFICIENT_EVIDENCE", "CONFLICT"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterOutcome(filter)}
                    className={`px-2 py-0.5 rounded-full font-medium transition-all ${
                      filterOutcome === filter
                        ? "bg-ink text-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {filter === "INSUFFICIENT_EVIDENCE" ? "INSUF" : filter}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-3">
            {filteredResults.map((item) => {
              const isSelected = item.id === selectedClaimId;
              const passedChecksCount = Object.values(item.checks).filter(Boolean).length;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedClaimId(item.id)}
                  className={`gl-card p-4 cursor-pointer transition-all border ${
                    isSelected
                      ? "ring-2 ring-ink border-ink bg-white shadow-md"
                      : "bg-white/80 hover:bg-white border-ink/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono text-ink-muted">{item.id}</span>
                    <GuardOutcomeBadge outcome={item.guard_outcome} />
                  </div>

                  <h4 className="text-sm font-bold text-ink">{item.claim_title}</h4>
                  <p className="text-xs text-ink-muted mt-1 font-mono">
                    Skill: {item.associated_skill} &bull; Claimed: {item.claimed_level}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-ink/5 flex items-center justify-between text-[11px] font-mono">
                    <span
                      className={`${
                        passedChecksCount === 7
                          ? "text-emerald-700"
                          : passedChecksCount < 4
                          ? "text-red-700"
                          : "text-amber-700"
                      } font-semibold`}
                    >
                      {passedChecksCount}/7 Checks Passed
                    </span>
                    <span className="text-ink-muted">Code: {item.reason_code}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Detailed Check Results & Testing Simulator */}
        <div className="lg:col-span-7 space-y-6">
          {/* Selected Claim Audit Drawer */}
          {selectedClaim && (
            <div className="gl-card p-6 bg-white space-y-6">
              <div className="flex items-start justify-between gap-4 border-b border-ink/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-ink-muted">{selectedClaim.id}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-ink/5 text-ink">
                      Reason: {selectedClaim.reason_code}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-ink">{selectedClaim.claim_title}</h2>
                  <p className="text-xs text-ink-muted mt-1">
                    Claimed Proficiency Level:{" "}
                    <strong className="text-ink">{selectedClaim.claimed_level}</strong> &bull;
                    Evidence Link:{" "}
                    <span className="font-mono text-ink">
                      {selectedClaim.evidence_id || "None (Self-claim)"}
                    </span>
                  </p>
                </div>
                <GuardOutcomeBadge outcome={selectedClaim.guard_outcome} />
              </div>

              {/* Guard Explanation Box */}
              <div
                className={`p-4 rounded-xl border text-xs leading-relaxed ${
                  selectedClaim.guard_outcome === "PASS"
                    ? "bg-emerald-50/50 border-emerald-200 text-emerald-950"
                    : selectedClaim.guard_outcome === "BLOCK"
                    ? "bg-red-50/50 border-red-200 text-red-950"
                    : selectedClaim.guard_outcome === "CONFLICT"
                    ? "bg-purple-50/50 border-purple-200 text-purple-950"
                    : "bg-amber-50/50 border-amber-200 text-amber-950"
                }`}
              >
                <strong>Guard Decision Narrative:</strong>
                <p className="mt-1 font-mono text-[11px]">{selectedClaim.explanation}</p>
              </div>

              {/* 7 Checks Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Deterministic Verification Checklist
                </h3>
                <div className="divide-y divide-ink/10 border border-ink/10 rounded-xl overflow-hidden bg-sand/10">
                  {Object.entries(selectedClaim.checks).map(([key, value]) => {
                    const label = key
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase());
                    return (
                      <div
                        key={key}
                        className="px-4 py-3 flex items-center justify-between text-xs bg-white/70"
                      >
                        <span className="font-medium text-ink flex items-center gap-2">
                          {value ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          )}
                          {label}
                        </span>
                        <span
                          className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                            value
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-red-100 text-red-900"
                          }`}
                        >
                          {value ? "SATISFIED" : "FAILED"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions for this Claim */}
              <div className="flex items-center justify-between pt-2 border-t border-ink/10 text-xs">
                <div className="text-ink-muted text-[11px]">
                  Governed by verification policy: <code>policy-v2026.1-core</code>
                </div>
                <div className="flex items-center gap-2">
                  {selectedClaim.guard_outcome === "CONFLICT" && (
                    <Link
                      href="/app/ai/conflicts"
                      className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      Resolve in Conflicts <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                  {selectedClaim.guard_outcome === "INSUFFICIENT_EVIDENCE" && (
                    <Link
                      href="/app/ai/review-queue"
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink text-ink text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      View in Review Queue <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Claim Simulator Form */}
          <div className="gl-card p-6 bg-white border border-sand">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-ink" />
                Live Guard Test Sandbox (Simulate Claim Evaluation)
              </h3>
              <span className="text-[10px] font-mono bg-ink/5 px-2 py-0.5 rounded text-ink-muted">
                Zero Model Latency
              </span>
            </div>

            <form onSubmit={handleSimulateCustomClaim} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-ink mb-1">
                  Claim Title or Extracted Candidate
                </label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus Architect (Raft / Paxos)"
                  value={simClaimTitle}
                  onChange={(e) => setSimClaimTitle(e.target.value)}
                  className="pill-input w-full text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-ink mb-1">Associated Skill</label>
                  <select
                    value={simSkill}
                    onChange={(e) => setSimSkill(e.target.value)}
                    className="pill-input w-full text-xs"
                  >
                    <option value="skill-python">Python Engineering</option>
                    <option value="skill-api-integration">API & Microservices</option>
                    <option value="skill-machine-learning">Machine Learning</option>
                    <option value="skill-cloud-deployment">Cloud & Container</option>
                    <option value="skill-deep-learning">Deep Learning</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Claimed Level</label>
                  <select
                    value={simLevel}
                    onChange={(e) => setSimLevel(e.target.value)}
                    className="pill-input w-full text-xs"
                  >
                    <option value="Foundation">Foundation</option>
                    <option value="Practitioner">Practitioner</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">Evidence Reference</label>
                  <select
                    value={simEvidenceId}
                    onChange={(e) => setSimEvidenceId(e.target.value)}
                    className="pill-input w-full text-xs font-mono"
                  >
                    <option value="ev-01">ev-01 (GitHub Repo #main)</option>
                    <option value="ev-02">ev-02 (Jira AGRI-142)</option>
                    <option value="ev-03">ev-03 (Capstone PDF)</option>
                    <option value="ev-04">ev-04 (Coursera Cert)</option>
                    <option value="none">None (Self-claim on Resume)</option>
                    <option value="ev-fake-999">ev-fake-999 (Fabricated ID)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-ink-muted">
                  Tests automated check logic and writes audit result to localStorage.
                </span>
                <button type="submit" className="pill-btn pill-btn-primary text-xs py-2 px-5">
                  Execute Guard Check &rarr;
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
