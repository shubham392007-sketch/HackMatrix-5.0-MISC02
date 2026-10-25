"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Briefcase,
  Plus,
  Trash2,
  DollarSign,
  Globe,
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  AlertCircle,
  Building,
  Mail,
  User,
  CheckCircle2,
} from "lucide-react";
import {
  getRecruiterJobDetail,
  updateRecruiterJob,
  deleteOrCloseJob,
  JobRequirementItem,
} from "@/lib/recruiterApi";

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [seniority, setSeniority] = useState("Mid Level");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [remoteStatus, setRemoteStatus] = useState("remote");
  const [locationText, setLocationText] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "published" | "paused" | "closed">("published");

  // Compensation
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");

  // Recruiter Contact
  const [publicRecruiterName, setPublicRecruiterName] = useState("");
  const [publicRecruiterEmail, setPublicRecruiterEmail] = useState("");

  // Requirements
  const [requirements, setRequirements] = useState<JobRequirementItem[]>([]);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillImportance, setNewSkillImportance] = useState("required");
  const [newSkillLevel, setNewSkillLevel] = useState("Practitioner");

  useEffect(() => {
    if (!jobId) return;

    setLoading(true);
    getRecruiterJobDetail(jobId)
      .then((job) => {
        setTitle(job.title);
        setSeniority(job.seniority || "Mid Level");
        setEmploymentType(job.employment_type || "full_time");
        setRemoteStatus(job.remote_status || "remote");
        setLocationText(job.location_text || "");
        setDescription(job.description || "");
        setStatus((job.status as any) || "published");

        if (job.salary_min) setSalaryMin(String(job.salary_min));
        if (job.salary_max) setSalaryMax(String(job.salary_max));
        if (job.salary_currency) setSalaryCurrency(job.salary_currency);
        if (job.salary_period) setSalaryPeriod(job.salary_period);

        setPublicRecruiterName(job.public_recruiter_name || "");
        setPublicRecruiterEmail(job.public_recruiter_email || "");
        setRequirements(job.requirements || []);
      })
      .catch((err) => {
        setErrorMessage(err.message || "Failed to load job details.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [jobId]);

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    setRequirements((prev) => [
      ...prev,
      {
        name: newSkillName.trim(),
        category: "Technical",
        importance: newSkillImportance,
        expected_level: newSkillLevel,
        expected_level_numeric: 3,
      },
    ]);
    setNewSkillName("");
  };

  const handleRemoveRequirement = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage(null);

    try {
      await updateRecruiterJob(jobId, {
        title: title.trim(),
        description: description.trim(),
        location_text: locationText.trim(),
        remote_status: remoteStatus,
        employment_type: employmentType,
        seniority,
        status,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
        salary_currency: salaryCurrency,
        salary_period: salaryPeriod,
        public_recruiter_name: publicRecruiterName.trim() || undefined,
        public_recruiter_email: publicRecruiterEmail.trim() || undefined,
        extracted_requirements: requirements,
      });

      router.push("/recruiter/jobs");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update job posting.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-16 text-center text-xs text-stone-500">
        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-stone-400" />
        Loading job opening details...
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6 pb-16">
      {/* ── CLEAN PAGE HEADER ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4 border-b border-[#1C1C1C]/15">
        <div>
          <Link
            href="/recruiter/jobs"
            className="text-xs font-bold text-stone-600 hover:text-black flex items-center gap-1.5 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Job Openings</span>
          </Link>
          <h1 className="text-2xl font-black text-[#1C1C1C] tracking-tight">
            Edit Job Opening
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Update role parameters, compensation brackets, and verified skills taxonomy requirements.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border-[1.5px] border-rose-300 flex items-start gap-2.5 text-xs text-rose-950 shadow-[2px_2px_0_0_#e11d48]">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Update Error</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Card 1: Role Details */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
            1. Role Essentials
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] font-bold"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="paused">Paused</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Seniority Level
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              >
                <option value="Entry Level">Entry Level</option>
                <option value="Mid Level">Mid Level</option>
                <option value="Senior">Senior</option>
                <option value="Staff / Lead">Staff / Lead</option>
                <option value="Executive">Executive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Workplace
              </label>
              <select
                value={remoteStatus}
                onChange={(e) => setRemoteStatus(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              >
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on_site">On-Site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Employment Type
              </label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              >
                <option value="full_time">Full-Time</option>
                <option value="part_time">Part-Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              Location
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2 text-xs text-[#1C1C1C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2 text-xs text-[#1C1C1C]"
            />
          </div>
        </div>

        {/* Card 2: Compensation */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
            2. Compensation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Minimum Pay
              </label>
              <input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Maximum Pay
              </label>
              <input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Currency
              </label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Period
              </label>
              <select
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C]"
              >
                <option value="yearly">Per Year</option>
                <option value="monthly">Per Month</option>
                <option value="hourly">Per Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Requirements */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
            3. Skill Requirements ({requirements.length})
          </h2>

          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1C1C1C]">{req.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-stone-100 border border-stone-300">
                    {req.importance}
                  </span>
                  <span className="text-stone-500 text-[11px]">Level: {req.expected_level}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(idx)}
                  className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-stone-100/70 border border-[#1C1C1C]/15 space-y-2">
            <span className="text-xs font-bold text-[#1C1C1C] block">Add Skill:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Skill name"
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-3 py-1.5 text-xs text-[#1C1C1C]"
              />
              <select
                value={newSkillImportance}
                onChange={(e) => setNewSkillImportance(e.target.value)}
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-2 py-1.5 text-xs text-[#1C1C1C]"
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="nice_to_have">Nice to Have</option>
              </select>
              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-2 py-1.5 text-xs text-[#1C1C1C]"
              >
                <option value="Foundational">Foundational</option>
                <option value="Working">Working</option>
                <option value="Practitioner">Practitioner</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
              <button
                type="button"
                onClick={handleAddRequirement}
                className="pill-btn pill-btn-primary px-3 py-1.5 text-xs font-bold"
              >
                Add Skill
              </button>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] flex items-center justify-end gap-3">
          <Link
            href="/recruiter/jobs"
            className="pill-btn pill-btn-secondary px-4 py-2 text-xs shadow-[1.5px_1.5px_0_0_#1C1C1C]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="pill-btn pill-btn-primary px-6 py-2 text-xs shadow-[2px_2px_0_0_#1C1C1C] flex items-center gap-2"
          >
            {saving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
