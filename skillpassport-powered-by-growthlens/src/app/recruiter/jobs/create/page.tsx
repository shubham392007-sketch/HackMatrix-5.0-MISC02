"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  createJobPosting,
  getCurrentRecruiterProfile,
  JobRequirementItem,
} from "@/lib/recruiterApi";

export default function CreateJobPage() {
  const router = useRouter();

  // Basic Information
  const [title, setTitle] = useState("");
  const [seniority, setSeniority] = useState("Mid Level");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [remoteStatus, setRemoteStatus] = useState("remote");
  const [locationText, setLocationText] = useState("Remote / Global");
  const [description, setDescription] = useState("");

  // Compensation
  const [salaryMin, setSalaryMin] = useState<string>("");
  const [salaryMax, setSalaryMax] = useState<string>("");
  const [salaryCurrency, setSalaryCurrency] = useState("USD");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");

  // Recruiter Public Contact Details
  const [publicRecruiterName, setPublicRecruiterName] = useState("");
  const [publicRecruiterEmail, setPublicRecruiterEmail] = useState("");

  // Structured Requirements
  const [requirements, setRequirements] = useState<JobRequirementItem[]>([
    {
      name: "Python",
      category: "Technical",
      importance: "required",
      expected_level: "Practitioner",
      expected_level_numeric: 3,
      evidence_expectation: "Production backend or ML pipelines with clean tests",
    },
    {
      name: "API Design & Integration",
      category: "Software Engineering",
      importance: "required",
      expected_level: "Practitioner",
      expected_level_numeric: 3,
      evidence_expectation: "REST/GraphQL endpoints and webhook consumers",
    },
  ]);

  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState("Technical");
  const [newSkillImportance, setNewSkillImportance] = useState("required");
  const [newSkillLevel, setNewSkillLevel] = useState("Practitioner");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Prefill recruiter contact details from logged in profile
  useEffect(() => {
    getCurrentRecruiterProfile()
      .then((p) => {
        setPublicRecruiterName(p.public_contact_name || p.full_name || "");
        setPublicRecruiterEmail(p.public_contact_email || p.email || "");
      })
      .catch(() => {});
  }, []);

  const handleAddRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    const levelNumericMap: Record<string, number> = {
      Foundational: 1,
      Working: 2,
      Practitioner: 3,
      Advanced: 4,
      Expert: 5,
    };

    setRequirements((prev) => [
      ...prev,
      {
        name: newSkillName.trim(),
        category: newSkillCategory,
        importance: newSkillImportance,
        expected_level: newSkillLevel,
        expected_level_numeric: levelNumericMap[newSkillLevel] || 3,
      },
    ]);

    setNewSkillName("");
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (targetStatus: "draft" | "published") => {
    if (!title.trim() || !description.trim()) {
      setErrorMessage("Please enter both a job title and description.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await createJobPosting({
        title: title.trim(),
        description: description.trim(),
        location_text: locationText.trim(),
        remote_status: remoteStatus,
        employment_type: employmentType,
        seniority,
        salary_min: salaryMin ? parseFloat(salaryMin) : undefined,
        salary_max: salaryMax ? parseFloat(salaryMax) : undefined,
        salary_currency: salaryCurrency,
        salary_period: salaryPeriod,
        status: targetStatus,
        extracted_requirements: requirements,
        public_recruiter_name: publicRecruiterName.trim() || undefined,
        public_recruiter_email: publicRecruiterEmail.trim() || undefined,
      });

      router.push("/recruiter/jobs");
    } catch (err: any) {
      console.error("Job creation failed:", err);
      setErrorMessage(err.message || "Failed to create job posting.");
    } finally {
      setIsLoading(false);
    }
  };

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
            Post New Job Opening
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Published openings appear immediately in Career Intelligence Mode C for candidates to discover and match.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border-[1.5px] border-rose-300 flex items-start gap-2.5 text-xs text-rose-950 shadow-[2px_2px_0_0_#e11d48]">
          <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold block">Submission Error</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Main Form Cards */}
      <div className="space-y-6">
        {/* Card 1: Job Essentials */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
            1. Role Details
          </h2>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              Job Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Machine Learning Engineer"
              required
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2.5 text-xs text-[#1C1C1C] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1C1C]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Seniority Level
              </label>
              <select
                value={seniority}
                onChange={(e) => setSeniority(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
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
                Workplace Mode
              </label>
              <select
                value={remoteStatus}
                onChange={(e) => setRemoteStatus(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
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
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
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
              Location / Region
            </label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              placeholder="e.g. San Francisco, CA or Worldwide Remote"
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2 text-xs text-[#1C1C1C] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1C1C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
              Job Description & Responsibilities *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              placeholder="Outline the mission, primary responsibilities, key projects, and team culture..."
              required
              className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-4 py-2.5 text-xs text-[#1C1C1C] placeholder:text-stone-400 focus:outline-none focus:border-[#1C1C1C] font-sans"
            />
          </div>
        </div>

        {/* Card 2: Compensation Range */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
            2. Compensation (Optional)
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
                placeholder="120000"
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
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
                placeholder="165000"
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Currency
              </label>
              <select
                value={salaryCurrency}
                onChange={(e) => setSalaryCurrency(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Period
              </label>
              <select
                value={salaryPeriod}
                onChange={(e) => setSalaryPeriod(e.target.value)}
                className="w-full bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C]/25 rounded-xl px-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
              >
                <option value="yearly">Per Year</option>
                <option value="monthly">Per Month</option>
                <option value="hourly">Per Hour</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card 3: Structured Taxonomy Requirements */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
              3. Structured Skill Taxonomy Requirements
            </h2>
            <p className="text-xs text-stone-600">
              These structured skills enable the Role Intelligence engine to calculate precise match scores against candidate verified passports.
            </p>
          </div>

          {/* Existing Requirements List */}
          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-[#1C1C1C]">{req.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-stone-100 border border-stone-300">
                      {req.importance}
                    </span>
                    <span className="text-[11px] text-stone-600">
                      Level: <strong>{req.expected_level}</strong>
                    </span>
                  </div>
                  {req.evidence_expectation && (
                    <p className="text-[11px] text-stone-500 italic">
                      Proof expected: {req.evidence_expectation}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveRequirement(idx)}
                  className="p-1 text-stone-400 hover:text-rose-600 transition-colors"
                  title="Remove requirement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add New Requirement Bar */}
          <div className="p-4 rounded-xl bg-stone-100/70 border border-[#1C1C1C]/15 space-y-3">
            <span className="text-xs font-bold text-[#1C1C1C] block">Add Skill Requirement:</span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="Skill name (e.g. React)"
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-3 py-1.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
              />

              <select
                value={newSkillImportance}
                onChange={(e) => setNewSkillImportance(e.target.value)}
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-2 py-1.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
              >
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="nice_to_have">Nice to Have</option>
              </select>

              <select
                value={newSkillLevel}
                onChange={(e) => setNewSkillLevel(e.target.value)}
                className="bg-white border border-[#1C1C1C]/25 rounded-xl px-2 py-1.5 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
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
                className="pill-btn pill-btn-primary px-3 py-1.5 text-xs flex items-center justify-center gap-1 shadow-[1px_1px_0_0_#1C1C1C]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Skill</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Recruiter Public Contact Details */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] space-y-4">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-[#1C1C1C] uppercase tracking-wider">
              4. Recruiter Contact Details
            </h2>
            <p className="text-xs text-stone-600">
              Displayed on the job posting in Career Intelligence Mode C so candidates know who is evaluating their passport.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Recruiter Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={publicRecruiterName}
                  onChange={(e) => setPublicRecruiterName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full bg-[#FAF8F5] border border-[#1C1C1C]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1C1C1C] mb-1.5">
                Contact Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={publicRecruiterEmail}
                  onChange={(e) => setPublicRecruiterEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="w-full bg-[#FAF8F5] border border-[#1C1C1C]/25 rounded-xl pl-9 pr-3 py-2 text-xs text-[#1C1C1C] focus:outline-none focus:border-[#1C1C1C]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Submission Action Bar */}
        <div className="p-6 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-stone-600 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Ready to publish to Career Intelligence Mode C</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit("draft")}
              className="pill-btn pill-btn-secondary flex-1 sm:flex-none px-4 py-2 text-xs shadow-[1.5px_1.5px_0_0_#1C1C1C]"
            >
              Save as Draft
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={() => handleSubmit("published")}
              className="pill-btn pill-btn-primary flex-1 sm:flex-none px-6 py-2 text-xs shadow-[2px_2px_0_0_#1C1C1C] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span>Publish Job</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
