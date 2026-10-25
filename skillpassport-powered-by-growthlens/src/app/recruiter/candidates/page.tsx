"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  CheckCircle2,
  Clock,
  Briefcase,
  ShieldCheck,
  RotateCw,
  Eye,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  listRecruiterCandidates,
  CandidateInvitationSummary,
} from "@/lib/recruiterApi";

export default function RecruiterCandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateInvitationSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const res = await listRecruiterCandidates({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setCandidates(res.candidates);
      setTotal(res.total);
      setCounts(res.pipeline_counts || {});
    } catch (err: any) {
      console.error("Could not load recruiter candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCandidates();
  };

  const tabs = [
    { label: "All Candidates", value: "all", count: counts.all ?? 0 },
    { label: "New", value: "new", count: counts.new ?? 0 },
    { label: "Reviewing", value: "reviewing", count: counts.reviewing ?? 0 },
    { label: "Shortlisted", value: "shortlisted", count: counts.shortlisted ?? 0 },
    { label: "Interview", value: "interview", count: counts.interview ?? 0 },
    { label: "Offer", value: "offer", count: counts.offer ?? 0 },
    { label: "Hired", value: "hired", count: counts.hired ?? 0 },
    { label: "Rejected", value: "rejected", count: counts.rejected ?? 0 },
  ];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-50 text-blue-800 border-blue-400";
      case "reviewing":
        return "bg-amber-50 text-amber-800 border-amber-400";
      case "shortlisted":
        return "bg-emerald-50 text-emerald-800 border-emerald-400";
      case "interview":
        return "bg-purple-50 text-purple-800 border-purple-400";
      case "offer":
        return "bg-green-50 text-green-950 border-green-500";
      case "rejected":
        return "bg-stone-100 text-stone-600 border-stone-300";
      default:
        return "bg-stone-50 text-stone-700 border-stone-300";
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
              Candidate Pipeline
            </h1>
            {total > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                {total} in Pipeline
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Candidates who have submitted their verified Skill Passport directly to your organization.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 border-[1.5px] ${
                statusFilter === tab.value
                  ? "bg-[#1C1C1C] text-[#FAF8F5] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                  : "bg-[#FAF8F5] hover:bg-white text-[#1C1C1C] border-[#1C1C1C]/25"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  statusFilter === tab.value ? "bg-white/20 text-white" : "bg-stone-200/80 text-stone-700"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate name or job..."
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#1C1C1C] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1C1C]"
            />
          </div>
          <button
            type="submit"
            className="pill-btn pill-btn-secondary px-4 py-1.5 text-xs shadow-[1.5px_1.5px_0_0_#1C1C1C]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-stone-500 bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C]">
          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
          Loading candidate submissions...
        </div>
      ) : candidates.length > 0 ? (
        <div className="space-y-4">
          {candidates.map((cand) => (
            <div
              key={cand.invitation_id}
              className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] hover:shadow-[4px_4px_0_0_#1C1C1C] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/recruiter/candidates/${cand.invitation_id}`}
                    className="text-base font-black text-[#1C1C1C] hover:underline"
                  >
                    {cand.candidate_name}
                  </Link>

                  {!cand.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E0533C]" title="Unreviewed candidate" />
                  )}

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border-[1.5px] ${getStatusBadge(
                      cand.pipeline_status
                    )}`}
                  >
                    {cand.pipeline_status}
                  </span>

                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-300">
                    {cand.delivery_status === "delivered" ? "Delivered In-App" : "Pending Registration"}
                  </span>
                </div>

                <div className="text-xs text-stone-600 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#1C1C1C]">{cand.candidate_headline}</span>
                  <span className="text-stone-300">&bull;</span>
                  <span>Target Opening: <strong className="text-[#1C1C1C]">{cand.job_title}</strong></span>
                  <span className="text-stone-300">&bull;</span>
                  <span className="text-stone-400 font-mono text-[11px]">
                    Shared {new Date(cand.created_at).toLocaleDateString()}
                  </span>
                </div>

                {cand.candidate_message && (
                  <p className="text-xs text-stone-700 bg-white p-3 rounded-xl border border-stone-200 line-clamp-2 italic">
                    &quot;{cand.candidate_message}&quot;
                  </p>
                )}

                {cand.recruiter_notes && (
                  <p className="text-[11px] text-amber-900 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-300 inline-block font-mono">
                    Note: {cand.recruiter_notes.slice(0, 80)}...
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/recruiter/candidates/${cand.invitation_id}`}
                  className="pill-btn pill-btn-primary flex items-center gap-1.5 text-xs py-2 px-4 shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Passport & Proof</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-[#FAF8F5] rounded-2xl border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <Users className="w-10 h-10 text-stone-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#1C1C1C]">No Candidates in this Pipeline Stage</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              {statusFilter !== "all"
                ? `No candidate submissions currently have the status '${statusFilter}'.`
                : "Candidates will appear here when they share their customized Skill Passport with your organization."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
