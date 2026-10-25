"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Users,
  MessageSquare,
  Building,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  getRecruiterDashboardOverview,
  RecruiterDashboardOverview,
} from "@/lib/recruiterApi";

export default function RecruiterDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<RecruiterDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getRecruiterDashboardOverview();
      setData(res);
    } catch (err: any) {
      console.error("Could not load recruiter dashboard:", err);
      setErrorMessage(
        err.message || "Failed to load dashboard metrics. Check organization membership."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const metrics = data?.metrics || {
    active_jobs_count: 0,
    draft_jobs_count: 0,
    paused_jobs_count: 0,
    closed_jobs_count: 0,
    total_jobs_count: 0,
    candidate_shares_count: 0,
    new_candidates_count: 0,
    reviewing_candidates_count: 0,
    shortlisted_candidates_count: 0,
    interview_candidates_count: 0,
    unread_messages_count: 0,
  };

  const recentCandidates: any[] = data?.recent_candidates || data?.recent_shares || [];
  const activeJobs: any[] = data?.active_jobs || data?.recent_jobs || [];

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-50 text-blue-800 border-blue-300";
      case "reviewing":
        return "bg-amber-50 text-amber-800 border-amber-300";
      case "shortlisted":
        return "bg-emerald-50 text-emerald-800 border-emerald-300";
      case "interview":
        return "bg-purple-50 text-purple-800 border-purple-300";
      case "offer":
        return "bg-green-50 text-green-900 border-green-400";
      case "rejected":
        return "bg-stone-50 text-stone-600 border-stone-300";
      default:
        return "bg-[#FAF8F5] text-[#1C1C1C] border-[#1C1C1C]/20";
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1C1C1C]/15">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
              Employer Dashboard
            </h1>
            {data?.organization?.is_verified && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]">
                Verified Organization
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600 mt-1">
            Managing candidate applications, talent pipelines, and Mode C job postings for{" "}
            <strong>{data?.organization?.name || "your organization"}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/recruiter/jobs/create"
            className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-[2px_2px_0_0_#1C1C1C]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>POST NEW JOB</span>
          </Link>
          <Link
            href="/recruiter/candidates"
            className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center gap-1.5 shadow-[2px_2px_0_0_#1C1C1C]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>ALL CANDIDATES</span>
          </Link>
        </div>
      </div>

      {/* Error / DB Recovery Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-[#1C1C1C] flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_#1C1C1C]">
              <RotateCw className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h4 className="text-sm font-black text-[#1C1C1C]">Sync Notice</h4>
              <p className="text-xs text-[#1C1C1C]/75">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            className="pill-btn pill-btn-primary text-xs py-2 px-4 whitespace-nowrap self-start sm:self-auto inline-flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>RETRY SYNC</span>
          </button>
        </div>
      )}

      {/* ── EDITORIAL METRICS ROW (Same as Evidence Center) ────────── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Jobs */}
          <Link
            href="/recruiter/jobs"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF] shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60">
                ACTIVE JOBS
              </span>
              <Briefcase className="w-4 h-4 text-[#1C1C1C]/70 group-hover:text-[#1C1C1C]" />
            </div>
            {loading ? (
              <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
            ) : (
              <p className="text-3xl font-black text-[#1C1C1C]">{metrics.active_jobs_count}</p>
            )}
            <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block font-mono">
              of {metrics.total_jobs_count} total &bull; {metrics.draft_jobs_count} drafts
            </span>
          </Link>

          {/* Candidate Passports */}
          <Link
            href="/recruiter/candidates"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/50 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60">
                CANDIDATE PASSPORTS
              </span>
              <Users className="w-4 h-4 text-[#1C1C1C]/70 group-hover:text-[#1C1C1C]" />
            </div>
            {loading ? (
              <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
            ) : (
              <p className="text-3xl font-black text-[#1C1C1C]">
                {metrics.candidate_shares_count}
              </p>
            )}
            <span className="text-[10px] font-bold text-[#4A7A4E] mt-1 block font-mono">
              {metrics.new_candidates_count} new submissions
            </span>
          </Link>

          {/* In Review & Shortlisted */}
          <Link
            href="/recruiter/candidates?status=reviewing"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#F6BB84]/40 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60">
                IN REVIEW &amp; PIPELINE
              </span>
              <ShieldCheck className="w-4 h-4 text-[#1C1C1C]/70 group-hover:text-[#1C1C1C]" />
            </div>
            {loading ? (
              <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
            ) : (
              <p className="text-3xl font-black text-[#1C1C1C]">
                {metrics.reviewing_candidates_count + metrics.shortlisted_candidates_count}
              </p>
            )}
            <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block font-mono">
              {metrics.shortlisted_candidates_count} shortlisted &bull; {metrics.interview_candidates_count} interview
            </span>
          </Link>

          {/* Messages & Inquiries */}
          <Link
            href="/recruiter/inbox"
            className="p-5 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#E5D7F8]/50 shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col justify-between h-full hover:-translate-y-0.5 transition-all group"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-[#1C1C1C]/60">
                DIRECT INBOX
              </span>
              <MessageSquare className="w-4 h-4 text-[#1C1C1C]/70 group-hover:text-[#1C1C1C]" />
            </div>
            {loading ? (
              <div className="h-9 w-14 bg-[#1C1C1C]/15 rounded-md animate-pulse my-0.5" />
            ) : (
              <p className="text-3xl font-black text-[#1C1C1C]">
                {metrics.unread_messages_count}
              </p>
            )}
            <span className="text-[10px] font-bold text-[#1C1C1C]/70 mt-1 block font-mono">
              Unread inquiries awaiting reply
            </span>
          </Link>
        </div>
      </section>

      {/* ── MAIN WORKSPACE PANELS (Two Column Layout) ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recent Candidate Submissions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FAF8F5] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1C]/10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#1C1C1C]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                  Recent Candidate Submissions
                </h3>
              </div>
              <Link
                href="/recruiter/candidates"
                className="text-xs font-black text-[#1C1C1C] hover:underline flex items-center gap-1"
              >
                <span>VIEW ALL</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#1C1C1C]/60">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1C1C1C]/40" />
                Loading candidate submissions...
              </div>
            ) : recentCandidates.length > 0 ? (
              <div className="divide-y divide-[#1C1C1C]/10">
                {recentCandidates.map((cand: any) => (
                  <div
                    key={cand.invitation_id}
                    className="py-3.5 flex items-center justify-between gap-3 group"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/recruiter/candidates/${cand.invitation_id}`}
                          className="text-sm font-black text-[#1C1C1C] hover:underline truncate"
                        >
                          {cand.candidate_name}
                        </Link>
                        {!cand.is_read && (
                          <span className="w-2 h-2 rounded-full bg-[#E0533C]" title="New" />
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                            cand.pipeline_status
                          )}`}
                        >
                          {cand.pipeline_status}
                        </span>
                      </div>
                      <div className="text-xs text-[#1C1C1C]/65 truncate">
                        <span>{cand.candidate_headline || "Candidate"}</span>
                        <span className="mx-1.5 text-stone-300">&bull;</span>
                        <span className="font-semibold text-[#1C1C1C]">{cand.job_title}</span>
                      </div>
                    </div>

                    <Link
                      href={`/recruiter/candidates/${cand.invitation_id}`}
                      className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1 shrink-0"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Review</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-[#1C1C1C]/15 space-y-2">
                <Users className="w-8 h-8 text-[#1C1C1C]/30 mx-auto" />
                <h4 className="text-xs font-bold text-[#1C1C1C]">No Candidate Shares Yet</h4>
                <p className="text-[11px] text-[#1C1C1C]/60 max-w-xs mx-auto">
                  When candidates submit their verified Skill Passports to your organization or Mode C jobs, they appear here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Role Openings (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl border-[1.5px] border-[#1C1C1C] bg-[#FAF8F5] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1C1C1C]/10">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#1C1C1C]" />
                <h3 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                  Active Job Openings
                </h3>
              </div>
              <Link
                href="/recruiter/jobs"
                className="text-xs font-black text-[#1C1C1C] hover:underline flex items-center gap-1"
              >
                <span>MANAGE</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#1C1C1C]/60">
                <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#1C1C1C]/40" />
                Loading active jobs...
              </div>
            ) : activeJobs.length > 0 ? (
              <div className="space-y-3">
                {activeJobs.map((job: any) => (
                  <div
                    key={job.id}
                    className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/recruiter/jobs/${job.job_uuid}/edit`}
                          className="text-xs font-black text-[#1C1C1C] hover:underline truncate block"
                        >
                          {job.title}
                        </Link>
                        <span className="text-[11px] text-[#1C1C1C]/60 font-medium">
                          {job.location_text || "Remote"} &bull; {job.seniority}
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                          job.status === "published"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : "bg-amber-50 text-amber-800 border-amber-300"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#1C1C1C]/60 pt-1 border-t border-[#1C1C1C]/10 font-mono">
                      <span>{job.requirements_count} required skills</span>
                      <span className="font-bold text-[#1C1C1C]">
                        {job.applications_count} applicants
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-white rounded-xl border border-[#1C1C1C]/15 space-y-3">
                <Briefcase className="w-8 h-8 text-[#1C1C1C]/30 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#1C1C1C]">No Jobs Published Yet</h4>
                  <p className="text-[11px] text-[#1C1C1C]/60 max-w-xs mx-auto">
                    Post your first role opening to make it discoverable for verified candidates across Career Intelligence.
                  </p>
                </div>
                <Link
                  href="/recruiter/jobs/create"
                  className="pill-btn pill-btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>CREATE FIRST JOB</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
