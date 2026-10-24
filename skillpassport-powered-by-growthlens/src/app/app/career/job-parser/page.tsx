"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSearch,
  Sparkles,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Plus,
  Trash2,
  Scale,
  Save,
  HelpCircle,
  FileText,
  Building,
  Briefcase,
  Layers,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  RoleDemandModel,
  RoleCompetency,
  RequirementType,
  ImportanceLevel,
} from "@/types/career";
import { ProficiencyLevel } from "@/types/passport";
import { parseJobDescription, saveCustomRole as saveCustomRoleApi } from "@/lib/careerApi";
import AppTopBar from "@/components/app/AppTopBar";

interface ExtractedCompItem {
  id: string;
  original_label: string;
  skill_id: string;
  canonical_name: string;
  category: string;
  requirement_type: RequirementType;
  importance: ImportanceLevel;
  expected_level: ProficiencyLevel;
  evidence_expectation: string;
  source_span: string;
  mapping_status: "mapped" | "ambiguous" | "unrecognized";
}

export default function JobDescriptionParserPage() {
  const router = useRouter();
  const { saveCustomRole, setSelectedRoleId } = useEvidence();

  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [seniority, setSeniority] = useState<"Entry Level" | "Mid Level" | "Senior Level">("Mid Level");
  const [rawText, setRawText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [competencies, setCompetencies] = useState<ExtractedCompItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleParseJD = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!rawText.trim() || rawText.trim().length < 40) {
      showToast("Please paste at least 40 characters of job description text.");
      return;
    }

    setIsParsing(true);
    try {
      const res = await parseJobDescription({
        raw_text: rawText.trim(),
        job_title: jobTitle.trim() || undefined,
        company_name: companyName.trim() || undefined,
        seniority: seniority,
      });

      if (res.job_title && !jobTitle.trim()) {
        setJobTitle(res.job_title);
      }
      if (res.company_name && !companyName.trim()) {
        setCompanyName(res.company_name);
      }

      if (res.extracted_competencies && res.extracted_competencies.length > 0) {
        setCompetencies(
          res.extracted_competencies.map((c: any, idx: number) => ({
            id: `comp-${idx + 1}`,
            original_label: c.original_label || c.canonical_name,
            skill_id: c.canonical_skill_id || c.skill_id || `skill-custom-${idx}`,
            canonical_name: c.canonical_name || c.original_label,
            category: c.category || "Technical",
            requirement_type: c.requirement_type || "core_required",
            importance: c.importance || "high",
            expected_level: c.expected_level || "Practitioner",
            evidence_expectation: c.evidence_expectation || "Demonstrated production work artifacts.",
            source_span: c.source_span || "",
            mapping_status: c.status || "mapped",
          }))
        );
        setParsed(true);
        showToast(`Parsed ${res.total_extracted} requirements with exact source spans!`);
      } else {
        setParsed(true);
        showToast("Job text parsed successfully.");
      }
    } catch (err: any) {
      console.warn("Parse error notice:", err);
      showToast(err.message || "Could not parse job description.");
    } finally {
      setIsParsing(false);
    }
  };

  const handleRemoveComp = (id: string) => {
    setCompetencies(competencies.filter((c) => c.id !== id));
  };

  const handleUpdateComp = (id: string, updates: Partial<ExtractedCompItem>) => {
    setCompetencies(
      competencies.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleSaveAndCompare = async () => {
    const title = jobTitle.trim() || "Custom Role";
    const company = companyName.trim() || "Target Employer";
    const customRoleId = `role-custom-${Date.now()}`;

    try {
      await saveCustomRoleApi({
        job_title: title,
        company_name: company,
        seniority: seniority,
        context: `${company} — Parsed Job Specification`,
        extracted_competencies: competencies.map((c) => ({
          canonical_skill_id: c.skill_id,
          canonical_name: c.canonical_name,
          category: c.category,
          requirement_type: c.requirement_type,
          importance: c.importance,
          expected_level: c.expected_level,
          evidence_expectation: c.evidence_expectation,
          source_span: c.source_span,
          status: c.mapping_status,
        })),
      });
    } catch (e) {
      console.warn("Backend custom role persistence notice:", e);
    }

    const newCustomModel: RoleDemandModel = {
      role_id: customRoleId,
      version: "v2026.custom.1",
      title: title,
      seniority: seniority,
      context: `${company} — Parsed Job Specification`,
      description: `Custom role extracted from job posting: ${title} at ${company}.`,
      provenance: `Parsed from job description text on ${new Date().toLocaleDateString()}`,
      source_type: "custom_parsed_job",
      created_at: "Just now",
      updated_at: "Just now",
      competencies: competencies.map((c) => ({
        skill_id: c.skill_id,
        canonical_name: c.canonical_name,
        category: c.category,
        requirement_type: c.requirement_type,
        importance: c.importance,
        presence_rate: 95,
        expected_level: c.expected_level,
        expected_level_numeric:
          c.expected_level === "Expert"
            ? 5
            : c.expected_level === "Advanced"
            ? 4
            : c.expected_level === "Practitioner"
            ? 3
            : c.expected_level === "Working"
            ? 2
            : 1,
        evidence_expectation: c.evidence_expectation,
        prerequisites: [],
        reason_codes: ["PARSED_FROM_JOB_TEXT"],
        source_references: [c.source_span],
        mapping_status: c.mapping_status,
        source_span: c.source_span,
      })),
    };

    saveCustomRole(newCustomModel);
    setSelectedRoleId(customRoleId);
    showToast(`Custom role "${title}" saved and set as active target!`);
    router.push("/app/career/match");
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <Sparkles className="w-4 h-4 text-lime" />
          <span>{toastMessage}</span>
        </div>
      )}

      <AppTopBar
        title="Analyze a Job Description"
        description="Turn any real-world job posting into structured, versioned role requirements. Review and edit canonical taxonomy mappings, importance weights, and expected proficiencies before comparing against your Skill Passport."
        badge="Deterministic JD Parser"
        badgeColor="border-ink/20 text-ink bg-lime"
      >
        <Link
          href="/app/career/discover"
          className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <Briefcase className="w-3.5 h-3.5" /> Discover Live Jobs
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Raw Text Input Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="gl-card p-6 bg-white space-y-4 border border-ink/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink" />
                  Job Description Input
                </h3>
                <span className="text-[11px] font-mono text-ink-muted">Unstructured JD</span>
              </div>

              <form onSubmit={handleParseJD} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ink mb-1">Target Job Title (Optional)</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-white border border-ink/20 rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    placeholder="e.g. Senior Machine Learning Engineer (auto-inferred if blank)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-ink mb-1">Company / Organization</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-white border border-ink/20 rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                      placeholder="e.g. Schaeffler, Infosys"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-ink mb-1">Target Seniority</label>
                    <select
                      value={seniority}
                      onChange={(e) => setSeniority(e.target.value as any)}
                      className="w-full bg-white border border-ink/20 rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    >
                      <option value="Entry Level">Entry Level</option>
                      <option value="Mid Level">Mid Level</option>
                      <option value="Senior Level">Senior Level</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Paste Job Posting Text <span className="text-amber-800">*</span>
                  </label>
                  <textarea
                    rows={12}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-3 rounded-xl border border-ink/20 font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-ink/10 focus:border-ink focus:outline-none"
                    placeholder="Paste the full job description text here (requirements, responsibilities, tech stack, qualifications)..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isParsing || !rawText.trim()}
                  className="pill-btn pill-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold shadow disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Parsing Against Canonical Taxonomy...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Parse Requirements
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Parsed Structured Output */}
          <div className="lg:col-span-7 space-y-4">
            {parsed && competencies.length > 0 ? (
              <div className="gl-card p-6 bg-white space-y-6 border border-ink/10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Extracted Competency Specifications
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-ink text-white">
                        {competencies.length}
                      </span>
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Extracted for <strong>{jobTitle || "Role"}</strong> at <strong>{companyName || "Organization"}</strong>
                    </p>
                  </div>

                  <button
                    onClick={handleSaveAndCompare}
                    className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Role Model & Compare
                  </button>
                </div>

                {/* List of Extracted Competencies */}
                <div className="space-y-4">
                  {competencies.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 rounded-xl border border-ink/10 bg-sand/10 space-y-3 hover:border-ink/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-ink">{comp.canonical_name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand border border-ink/10 text-ink">
                              {comp.category}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                                comp.requirement_type === "core_required"
                                  ? "bg-rose-50 text-rose-900 border-rose-200"
                                  : "bg-amber-50 text-amber-900 border-amber-200"
                              }`}
                            >
                              {comp.requirement_type.replace("_", " ")}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                              Level: {comp.expected_level}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveComp(comp.id)}
                          className="p-1 hover:bg-rose-100 rounded text-ink-muted hover:text-rose-700 transition-colors shrink-0"
                          title="Remove requirement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Source Span Quote */}
                      {comp.source_span && (
                        <div className="p-2.5 rounded-lg bg-white border border-ink/10 text-[11px] text-ink-muted font-mono leading-relaxed">
                          <span className="text-ink font-bold block mb-0.5 text-[10px] uppercase">
                            Source Quote Span:
                          </span>
                          &ldquo;{comp.source_span}&rdquo;
                        </div>
                      )}

                      {/* Evidence Expectation */}
                      <p className="text-xs text-ink/80 leading-relaxed">
                        <strong className="text-ink font-semibold">Evidence Expectation: </strong>
                        {comp.evidence_expectation}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-ink/10 flex justify-end">
                  <button
                    onClick={handleSaveAndCompare}
                    className="pill-btn pill-btn-primary text-xs py-2.5 px-6 flex items-center justify-center gap-2 font-bold shadow"
                  >
                    <Save className="w-4 h-4" />
                    Save Role Model & Compare With My Skills
                  </button>
                </div>
              </div>
            ) : (
              <div className="gl-card p-12 text-center bg-white border border-ink/10 space-y-3">
                <FileSearch className="w-10 h-10 text-ink-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink">Ready to Parse Job Requirements</h4>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  Paste the job posting text on the left and click &ldquo;Parse Requirements&rdquo;. The parser will identify explicit competency expectations, assign maturity levels, and align them against the Skill Intelligence canonical taxonomy.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
