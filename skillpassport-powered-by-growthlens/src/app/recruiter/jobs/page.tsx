"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  PlusCircle,
  Search,
  Filter,
  Users,
  Clock,
  Globe,
  DollarSign,
  AlertCircle,
  RotateCw,
  MoreVertical,
  Pause,
  Play,
  XCircle,
  Edit,
  CheckCircle2,
} from "lucide-react";
import {
  listRecruiterJobs,
  updateRecruiterJob,
  deleteOrCloseJob,
  RecruiterJob,
} from "@/lib/recruiterApi";

export default function RecruiterJobsPage() {
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await listRecruiterJobs({
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: search.trim() || undefined,
      });
      setJobs(res.jobs);
      setTotal(res.total);
    } catch (err: any) {
      console.error("Could not load recruiter jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadJobs();
  };

  const handleStatusChange = async (jobId: string, newStatus: "draft" | "published" | "paused" | "closed") => {
    try {
      await updateRecruiterJob(jobId, { status: newStatus });
      setActionNotice(`Job status changed to ${newStatus}.`);
      loadJobs();
      setTimeout(() => setActionNotice(null), 4000);
    } catch (err: any) {
      alert(err.message || "Could not update job status.");
    }
  };

  const filterTabs = [
    { label: "All Openings", value: "all" },
    { label: "Published", value: "published" },
    { label: "Drafts", value: "draft" },
    { label: "Paused", value: "paused" },
    { label: "Closed", value: "closed" },
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#1A1918]/15">
        <div>
          <h1 className="text-2xl font-black text-[#1A1918] tracking-tight">
            Job Openings
          </h1>
          <p className="text-xs text-stone-600">
            Create, manage, and publish verified openings to Career Intelligence Mode C
          </p>
        </div>

        <Link
          href="/recruiter/jobs/create"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1A1918] hover:bg-stone-800 text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow-[2px_2px_0_0_#1A1918]"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Post New Job</span>
        </Link>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-2 text-xs text-emerald-900 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                statusFilter === tab.value
                  ? "bg-[#1A1918] text-[#FAF8F5] shadow-[1.5px_1.5px_0_0_#1A1918]"
                  : "bg-white hover:bg-stone-100 text-[#1A1918] border border-stone-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or location..."
              className="w-full bg-white border border-[#1A1918]/25 rounded-full pl-9 pr-4 py-1.5 text-xs text-[#1A1918] placeholder:text-stone-400 focus:outline-none focus:border-[#1A1918]"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-full bg-white hover:bg-stone-100 border border-[#1A1918] text-xs font-bold text-[#1A1918]"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-stone-500 bg-white rounded-3xl border border-stone-200">
          <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
          Loading organization jobs...
        </div>
      ) : jobs.length > 0 ? (
        <div className="space-y-4">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="p-5 rounded-3xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] hover:border-black transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/recruiter/jobs/${job.job_uuid}/edit`}
                      className="text-base font-black text-[#1A1918] hover:underline"
                    >
                      {job.title}
                    </Link>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        job.status === "published"
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : job.status === "draft"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : job.status === "paused"
                          ? "bg-purple-50 text-purple-800 border-purple-300"
                          : "bg-stone-100 text-stone-600 border-stone-300"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-600 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-stone-400" />
                      {job.location_text || "Remote"} ({job.remote_status || "remote"})
                    </span>
                    <span className="text-stone-300">&bull;</span>
                    <span>{job.employment_type?.replace("_", " ")}</span>
                    <span className="text-stone-300">&bull;</span>
                    <span>{job.seniority}</span>
                    {job.posted_at && (
                      <>
                        <span className="text-stone-300">&bull;</span>
                        <span className="text-stone-400 font-mono text-[11px]">
                          Posted {new Date(job.posted_at).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {job.status === "published" ? (
                    <button
                      onClick={() => handleStatusChange(job.job_uuid, "paused")}
                      className="px-3 py-1 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold flex items-center gap-1"
                      title="Pause applications"
                    >
                      <Pause className="w-3 h-3" />
                      <span>Pause</span>
                    </button>
                  ) : job.status === "paused" || job.status === "draft" ? (
                    <button
                      onClick={() => handleStatusChange(job.job_uuid, "published")}
                      className="px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center gap-1"
                      title="Publish opening"
                    >
                      <Play className="w-3 h-3" />
                      <span>Publish</span>
                    </button>
                  ) : null}

                  <Link
                    href={`/recruiter/jobs/${job.job_uuid}/edit`}
                    className="p-1.5 rounded-full border border-stone-300 hover:border-black text-stone-700 hover:text-black"
                    title="Edit opening"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Compensation */}
              {(job.salary_min || job.salary_max) && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-mono font-semibold bg-emerald-50/70 px-3 py-1 rounded-xl border border-emerald-200 w-fit">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  <span>
                    {job.salary_currency || "USD"}{" "}
                    {job.salary_min?.toLocaleString()} – {job.salary_max?.toLocaleString()} / {job.salary_period || "year"}
                  </span>
                </div>
              )}

              {/* Taxonomy Requirements preview */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block">
                    Structured Skill Requirements:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {job.requirements.map((req, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-lg bg-sand/30 border border-ink/15 text-[#1A1918]"
                      >
                        <span className="font-bold">{req.name}</span>
                        <span className="text-[10px] text-stone-500 font-mono">({req.expected_level || "Practitioner"})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer applicant link */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
                <span className="text-stone-500">
                  Contact: <strong>{job.public_recruiter_name || "Hiring Team"}</strong> ({job.public_recruiter_email})
                </span>

                <Link
                  href={`/recruiter/candidates?job_id=${job.job_uuid}`}
                  className="font-bold text-[#1A1918] hover:underline flex items-center gap-1"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{job.applications_count} Candidates Applied &rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-16 text-center bg-white rounded-3xl border border-stone-200 space-y-4">
          <Briefcase className="w-10 h-10 text-stone-400 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-black text-[#1A1918]">No Job Openings Found</h3>
            <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
              {statusFilter !== "all"
                ? `There are no openings with status '${statusFilter}'.`
                : "Post your organization's first role to enable candidate discovery and targeted passport submissions."}
            </p>
          </div>
          <Link
            href="/recruiter/jobs/create"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-[#1A1918] text-xs font-black uppercase tracking-wider text-[#FAF8F5] shadow"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Job</span>
          </Link>
        </div>
      )}
    </div>
  );
}
