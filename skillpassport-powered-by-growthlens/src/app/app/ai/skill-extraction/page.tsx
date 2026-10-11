"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { DemoDataNotice } from "@/components/app/AIBadges";
import {
  Fingerprint,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Network,
  Tag,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Copy,
} from "lucide-react";

export default function AISkillExtractionPage() {
  const {
    extractionCandidates,
    evidenceItems,
    updateExtractionCandidate,
    addAIAuditEvent,
  } = useEvidence();

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [inspectItem, setInspectItem] = useState<string | null>(
    extractionCandidates[0]?.id || null
  );
  const [isExtracting, setIsExtracting] = useState(false);

  const totalCount = extractionCandidates.length;
  const duplicateCount = extractionCandidates.filter((c) => c.taxonomy_status === "duplicate").length;
  const pendingCount = extractionCandidates.filter((c) => c.review_state === "pending_review").length;
  const flaggedCount = extractionCandidates.filter((c) => c.review_state === "flagged" || c.review_state === "insufficient").length;

  const filteredCandidates = extractionCandidates.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.original_label.toLowerCase().includes(q) ||
      c.canonical_name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q);

    const matchesStatus =
      selectedStatus === "all" ||
      c.taxonomy_status === selectedStatus ||
      c.review_state === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const activeCandidate = extractionCandidates.find((c) => c.id === inspectItem);

  const handleSimulateExtraction = () => {
    setIsExtracting(true);
    setTimeout(() => {
      setIsExtracting(false);
      addAIAuditEvent({
        timestamp: "Just now",
        event_type: "candidate_extracted",
        affected_entity_type: "candidate_skill",
        affected_entity_id: "ext-batch",
        new_state: "Batch Extraction Completed",
        reason: "Simulated extraction pass across connected sources completed.",
        actor: "Qwen-3 8B Extraction Pipeline",
        model_or_policy_version: "v2.4.0",
      });
    }, 1000);
  };

  const handleFlagDuplicate = (id: string) => {
    updateExtractionCandidate(id, {
      taxonomy_status: "duplicate",
      review_state: "reviewed",
    });
    addAIAuditEvent({
      timestamp: "Just now",
      event_type: "candidate_extracted",
      affected_entity_type: "candidate_skill",
      affected_entity_id: id,
      new_state: "Taxonomy Status: Duplicate",
      reason: "Collapsed duplicate candidate synonym into canonical parent competency.",
      actor: "Reviewer (Alex Rivera)",
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8C827A] uppercase tracking-wider mb-2">
            <Link href="/app/ai" className="hover:text-[#1F1E1D]">
              AI Intelligence
            </Link>
            <span>/</span>
            <span className="text-[#1F1E1D]">Skill Extraction</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1F1E1D] tracking-tight">
            AI Skill Extraction
          </h1>
          <p className="text-sm text-[#5A5550] mt-1.5 max-w-2xl">
            Candidate skills extracted from work artifacts and normalized into the canonical taxonomy. Prevents fragmenting one competency into duplicate claims.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSimulateExtraction}
            disabled={isExtracting}
            className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isExtracting ? "animate-spin" : ""}`} />
            {isExtracting ? "Extracting..." : "Run Extraction Pass"}
          </button>
        </div>
      </div>

      <DemoDataNotice />

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Total Extracted
          </span>
          <div className="text-2xl font-extrabold text-[#1F1E1D] mt-1">{totalCount}</div>
          <p className="text-[11px] text-[#8C827A]">Candidate labels</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Duplicate Synonyms
          </span>
          <div className="text-2xl font-extrabold text-[#B07219] mt-1">{duplicateCount}</div>
          <p className="text-[11px] text-[#8C827A]">Collapsed into canonical</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Awaiting Review
          </span>
          <div className="text-2xl font-extrabold text-[#4361EE] mt-1">{pendingCount}</div>
          <p className="text-[11px] text-[#8C827A]">Needs human confirmation</p>
        </div>
        <div className="gl-card p-4">
          <span className="text-[10px] font-bold text-[#8C827A] uppercase tracking-wider">
            Flagged / Insufficient
          </span>
          <div className="text-2xl font-extrabold text-[#BA1A1A] mt-1">{flaggedCount}</div>
          <p className="text-[11px] text-[#8C827A]">Lack codebase backing</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="gl-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C827A]" />
            <input
              type="text"
              placeholder="Filter by candidate label, canonical name, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pill-input pl-10 text-xs w-full"
            />
          </div>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="pill-input text-xs py-2 px-3 pr-8 bg-white cursor-pointer font-medium"
          >
            <option value="all">All Taxonomies & States</option>
            <option value="resolved">Resolved Canonical Mappings</option>
            <option value="duplicate">Duplicate Synonyms</option>
            <option value="pending_review">Pending Review</option>
            <option value="insufficient">Insufficient Evidence</option>
            <option value="flagged">Flagged</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout: Candidates Table vs Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Candidates Table (2 cols) */}
        <div className="gl-card overflow-hidden lg:col-span-2 border-[#E4DDD3]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#EBE5DC] text-[11px] uppercase tracking-wider text-[#8C827A]">
                <tr>
                  <th className="py-3 px-4 font-bold">Extracted Label</th>
                  <th className="py-3 px-4 font-bold">Canonical Mapping</th>
                  <th className="py-3 px-4 font-bold">Confidence</th>
                  <th className="py-3 px-4 font-bold">Taxonomy</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EBE1]">
                {filteredCandidates.map((cand) => {
                  const isSelected = cand.id === inspectItem;

                  return (
                    <tr
                      key={cand.id}
                      onClick={() => setInspectItem(cand.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-[#F7F4EC]" : "hover:bg-[#FAF8F5]"
                      }`}
                    >
                      <td className="py-3 px-4 font-bold text-[#1F1E1D]">
                        <div>{cand.original_label}</div>
                        <div className="text-[10px] text-[#8C827A] font-normal">
                          {cand.category} • {cand.skill_type}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#1F1E1D]">
                          {cand.canonical_name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#1F1E1D]">
                        {cand.confidence}%
                      </td>
                      <td className="py-3 px-4">
                        {cand.taxonomy_status === "duplicate" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF6E9] text-[#B07219] border border-[#F0D5B5]">
                            Duplicate
                          </span>
                        ) : cand.taxonomy_status === "resolved" ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EBF3ED] text-[#2E6941] border border-[#B8D7C2]">
                            Resolved
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EFEAE1] text-[#1F1E1D]">
                            {cand.taxonomy_status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold capitalize text-[#5A5550]">
                          {cand.review_state.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setInspectItem(cand.id)}
                          className="font-bold text-[#1F1E1D] hover:text-[#2E6941] inline-flex items-center gap-1"
                        >
                          View
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Candidate Detail Drawer / Inspector (1 col) */}
        <div className="gl-card p-6 space-y-5 lg:col-span-1 border-[#E4DDD3]">
          {!activeCandidate ? (
            <div className="text-center py-10 text-xs text-[#8C827A]">
              Select a candidate claim to inspect its extraction details.
            </div>
          ) : (
            <>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Extraction Claim Locus
                </span>
                <h3 className="text-base font-bold text-[#1F1E1D] mt-1">
                  {activeCandidate.original_label}
                </h3>
              </div>

              {/* Canonical Mapping Card */}
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#EBE5DC] text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                    Canonical Skill
                  </span>
                  <Link
                    href="/app/passport/taxonomy"
                    className="text-[11px] font-bold text-[#2E6941] hover:underline flex items-center gap-0.5"
                  >
                    Taxonomy <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="font-bold text-sm text-[#1F1E1D]">
                  {activeCandidate.canonical_name}
                </div>
                <p className="text-[11px] text-[#5A5550] leading-relaxed">
                  {activeCandidate.extraction_rationale}
                </p>
              </div>

              {/* Supporting Excerpt */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C827A]">
                  Supporting Source Excerpt
                </span>
                <p className="p-3 rounded-xl bg-white border border-[#EBE5DC] text-[11px] font-mono text-[#5A5550] leading-relaxed">
                  &ldquo;{activeCandidate.supporting_excerpt}&rdquo;
                </p>
              </div>

              {/* Calibration Metadata */}
              <div className="space-y-2 text-xs pt-1">
                <div className="flex justify-between py-1 border-b border-[#F0EBE1]">
                  <span className="text-[#8C827A]">Extraction Confidence:</span>
                  <strong className="text-[#1F1E1D]">{activeCandidate.confidence}%</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0EBE1]">
                  <span className="text-[#8C827A]">Category:</span>
                  <span className="font-medium text-[#1F1E1D]">{activeCandidate.category}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0EBE1]">
                  <span className="text-[#8C827A]">Taxonomy Resolution:</span>
                  <span className="capitalize font-bold text-[#2E6941]">{activeCandidate.taxonomy_status}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#F0EBE1]">
                  <span className="text-[#8C827A]">Linked Artifacts:</span>
                  <span className="font-medium text-[#1F1E1D]">
                    {activeCandidate.evidence_ids.length} items
                  </span>
                </div>
              </div>

              {/* Ambiguity Flags */}
              {activeCandidate.ambiguity_flags.length > 0 && (
                <div className="p-3 rounded-xl bg-[#FFF6E9] border border-[#F0D5B5] text-[11px] text-[#B07219] space-y-1">
                  <strong>Notice:</strong>
                  {activeCandidate.ambiguity_flags.map((flag, idx) => (
                    <div key={idx}>• {flag}</div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 space-y-2">
                {activeCandidate.taxonomy_status !== "duplicate" && (
                  <button
                    onClick={() => handleFlagDuplicate(activeCandidate.id)}
                    className="pill-btn pill-btn-secondary text-xs w-full justify-center flex items-center gap-1.5"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Flag as Duplicate Synonym
                  </button>
                )}
                <Link
                  href="/app/ai/evidence-mapping"
                  className="pill-btn pill-btn-primary text-xs w-full justify-center flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  Inspect Evidence Mapping
                </Link>
                <Link
                  href="/app/passport/candidates"
                  className="text-xs font-semibold text-[#8C827A] hover:text-[#1F1E1D] block text-center pt-1"
                >
                  Open in Candidate Review Queue →
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
