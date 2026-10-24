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
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "new":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "reviewing":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "shortlisted":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "interview":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "offer":
        return "bg-green-100 text-green-900 border-green-400";
      case "rejected":
        return "bg-stone-100 text-stone-600 border-stone-300";
      default:
        return "bg-sand/30 text-ink border-ink/20";
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1A1918]/15">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-[#1A1918] tracking-tight">
              Recruiter Dashboard
            </h1>
            {data?.organization?.is_verified && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-[11px] font-bold text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Employer
              </span>
            )}
          </div>
          <p className="text-xs text-stone-600">
            Managing candidate applications and job postings for{" "}
            <strong className="text-[#1A1918]">{data?.organization?.name || "your organization"}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/recruiter/jobs/create"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A1918] hover:bg-stone-800 text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918] transition-transform active:translate-y-0.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Post New Job</span>
          </Link>

          <Link
            href="/recruiter/candidates"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-stone-50 border border-[#1A1918] text-xs font-bold text-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]"
          >
            <Users className="w-3.5 h-3.5" />
            <span>All Candidates</span>
          </Link>
        </div>
      </div>

      {/* Error / DB Recovery Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Live Database Connection Notice</span>
              <p className="text-amber-800">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            className="px-3 py-1.5 rounded-xl bg-white border border-amber-400 font-bold hover:bg-amber-100 shrink-0 flex items-center gap-1"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 4 Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Openings */}
        <Link
          href="/recruiter/jobs"
          className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] hover:-translate-y-0.5 transition-all space-y-2 block"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Jobs</span>
            <Briefcase className="w-4 h-4 text-[#1A1918]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1A1918]">
              {loading ? "..." : metrics.active_jobs_count}
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              of {metrics.total_jobs_count} total
            </span>
          </div>
          <p className="text-[11px] text-stone-600">
            {metrics.draft_jobs_count} drafts &bull; {metrics.paused_jobs_count} paused
          </p>
        </Link>

        {/* Candidate Shares */}
        <Link
          href="/recruiter/candidates"
          className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] hover:-translate-y-0.5 transition-all space-y-2 block"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Candidate Passports</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1A1918]">
              {loading ? "..." : metrics.candidate_shares_count}
            </span>
            <span className="text-[11px] text-emerald-700 font-bold font-mono">
              {metrics.new_candidates_count} new
            </span>
          </div>
          <p className="text-[11px] text-stone-600">
            Direct candidate shares received
          </p>
        </Link>

        {/* Pipeline Active */}
        <Link
          href="/recruiter/candidates?status=reviewing"
          className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] hover:-translate-y-0.5 transition-all space-y-2 block"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">In Review & Shortlisted</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1A1918]">
              {loading ? "..." : metrics.reviewing_candidates_count + metrics.shortlisted_candidates_count}
            </span>
            <span className="text-[11px] text-stone-500 font-mono">
              {metrics.interview_candidates_count} interview
            </span>
          </div>
          <p className="text-[11px] text-stone-600">
            Candidates progressing in hiring pipeline
          </p>
        </Link>

        {/* Unread Inbound Messages */}
        <Link
          href="/recruiter/inbox"
          className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] hover:-translate-y-0.5 transition-all space-y-2 block"
        >
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-xs font-bold uppercase tracking-wider">Inbox Messages</span>
            <MessageSquare className="w-4 h-4 text-[#E0533C]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#1A1918]">
              {loading ? "..." : metrics.unread_messages_count}
            </span>
            <span className="text-[11px] text-[#E0533C] font-bold font-mono">
              unread
            </span>
          </div>
          <p className="text-[11px] text-stone-600">
            Two-way candidate communication threads
          </p>
        </Link>
      </div>

      {/* Grid: Recent Candidates & Active Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Recent Candidates (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-black text-[#1A1918]">
                Recent Candidate Submissions
              </h2>
              <p className="text-xs text-stone-600">
                Candidates who shared their Skill Passport directly with your organization
              </p>
            </div>
            <Link
              href="/recruiter/candidates"
              className="text-xs font-bold text-[#1A1918] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200">
              <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
              Loading candidate shares...
            </div>
          ) : data?.recent_shares && data.recent_shares.length > 0 ? (
            <div className="space-y-3">
              {data.recent_shares.map((share: any) => (
                <div
                  key={share.invitation_id}
                  className="p-4 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] hover:border-black transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#1A1918]">
                        {share.candidate_name}
                      </span>
                      {!share.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#E0533C]" />
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          share.pipeline_status
                        )}`}
                      >
                        {share.pipeline_status}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 flex items-center gap-2 flex-wrap">
                      <span>Applied to: <strong className="text-[#1A1918]">{share.job_title}</strong></span>
                      <span className="text-stone-300">&bull;</span>
                      <span className="text-stone-400 font-mono text-[10px]">
                        {new Date(share.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {share.candidate_message && (
                      <p className="text-[11px] text-stone-600 line-clamp-1 italic">
                        &quot;{share.candidate_message}&quot;
                      </p>
                    )}
                  </div>

                  <Link
                    href={`/recruiter/candidates/${share.invitation_id}`}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#DFE968] hover:bg-[#d6e05a] border border-[#1A1918] text-xs font-bold text-[#1A1918] shadow-[1px_1px_0_0_#1A1918] shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Review Passport</span>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
              <Users className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#1A1918]">No Candidate Submissions Yet</h4>
                <p className="text-[11px] text-stone-600 max-w-sm mx-auto">
                  When candidates discover your openings in Career Intelligence Mode C and share their Skill Passport, their verified credentials will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Jobs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-black text-[#1A1918]">
                Organization Jobs
              </h2>
              <p className="text-xs text-stone-600">
                Published to Career Intelligence Mode C
              </p>
            </div>
            <Link
              href="/recruiter/jobs"
              className="text-xs font-bold text-[#1A1918] hover:underline flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 bg-white rounded-2xl border border-stone-200">
              <RotateCw className="w-5 h-5 animate-spin mx-auto mb-2 text-stone-400" />
              Loading job postings...
            </div>
          ) : data?.recent_jobs && data.recent_jobs.length > 0 ? (
            <div className="space-y-3">
              {data.recent_jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="p-4 rounded-2xl bg-white border border-[#1A1918]/20 hover:border-[#1A1918] transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <Link
                        href={`/recruiter/jobs/${job.job_uuid}/edit`}
                        className="text-xs font-bold text-[#1A1918] hover:underline block"
                      >
                        {job.title}
                      </Link>
                      <span className="text-[11px] text-stone-500">
                        {job.location_text || "Remote"} &bull; {job.seniority || "Mid Level"}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        job.status === "published"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1 border-t border-stone-100 font-mono">
                    <span>{job.requirements_count} required skills</span>
                    <span className="font-bold text-[#1A1918]">
                      {job.applications_count} applicants
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 space-y-3">
              <Briefcase className="w-8 h-8 text-stone-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#1A1918]">No Jobs Published Yet</h4>
                <p className="text-[11px] text-stone-600 max-w-xs mx-auto">
                  Post your first role opening to make it discoverable for verified candidates across Career Intelligence.
                </p>
              </div>
              <Link
                href="/recruiter/jobs/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A1918] text-xs font-bold text-white shadow"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Create First Job</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
