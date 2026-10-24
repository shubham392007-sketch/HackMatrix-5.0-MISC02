"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileSearch,
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
  Globe,
  ShieldAlert,
  Link2,
  BookmarkPlus,
  RefreshCw,
  Check,
} from "lucide-react";
import { useEvidence } from "@/context/EvidenceContext";
import {
  RoleDemandModel,
  RoleCompetency,
  RequirementType,
  ImportanceLevel,
} from "@/types/career";
import { ProficiencyLevel } from "@/types/passport";
import {
  parseJobDescription,
  parseJobDescriptionFromUrl,
  saveCustomRole as saveCustomRoleApi,
} from "@/lib/careerApi";
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

  const [inputTab, setInputTab] = useState<"text" | "url">("text");
  const [targetUrl, setTargetUrl] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [seniority, setSeniority] = useState<"Entry Level" | "Mid Level" | "Senior Level">("Mid Level");
  const [rawText, setRawText] = useState("");

  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [ssrfError, setSsrfError] = useState<string | null>(null);
  const [authWallNotice, setAuthWallNotice] = useState<string | null>(null);
  const [competencies, setCompetencies] = useState<ExtractedCompItem[]>([]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleParseJD = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSsrfError(null);
    setAuthWallNotice(null);

    if (inputTab === "text") {
      if (!rawText.trim() || rawText.trim().length < 40) {
        showToast("Please paste at least 40 characters of job description text.");
        return;
      }
    } else if (inputTab === "url") {
      if (!targetUrl.trim() || !targetUrl.startsWith("http")) {
        showToast("Please enter a valid HTTP/HTTPS public job posting URL.");
        return;
      }
    }

    setIsParsing(true);
    try {
      let res: any;
      if (inputTab === "url") {
        res = await parseJobDescriptionFromUrl({
          url: targetUrl.trim(),
          job_title: jobTitle.trim() || undefined,
          company_name: companyName.trim() || undefined,
          seniority: seniority,
        });
      } else {
        res = await parseJobDescription({
          raw_text: rawText.trim(),
          job_title: jobTitle.trim() || undefined,
          company_name: companyName.trim() || undefined,
          seniority: seniority,
        });
      }

      if (res.job_title && res.job_title !== "Not specified in source" && !jobTitle.trim()) {
        setJobTitle(res.job_title);
      } else if (res.job_title === "Not specified in source" && !jobTitle.trim()) {
        setJobTitle("");
      }

      if (res.company_name && res.company_name !== "Not specified in source" && !companyName.trim()) {
        setCompanyName(res.company_name);
      }

      if (res.extracted_competencies && res.extracted_competencies.length > 0) {
        setCompetencies(
          res.extracted_competencies.map((c: any, idx: number) => ({
            id: `comp-${idx + 1}-${Date.now()}`,
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
        showToast(`Parsed ${res.total_extracted || res.extracted_competencies.length} requirements with exact source spans!`);
      } else {
        setCompetencies([]);
        setParsed(true);
        showToast("Parsed job text. No canonical requirements identified.");
      }
    } catch (err: any) {
      console.warn("Parse error notice:", err);
      const errMsg = err.message || "Could not parse job description.";
      if (
        errMsg.toLowerCase().includes("authentication wall") ||
        errMsg.toLowerCase().includes("login") ||
        errMsg.toLowerCase().includes("linkedin") ||
        errMsg.toLowerCase().includes("indeed") ||
        errMsg.toLowerCase().includes("challenge")
      ) {
        setAuthWallNotice(errMsg);
      } else if (
        errMsg.toLowerCase().includes("ssrf") ||
        errMsg.toLowerCase().includes("prohibited host") ||
        errMsg.toLowerCase().includes("security violation")
      ) {
        setSsrfError(errMsg);
      } else {
        showToast(errMsg);
      }
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

  const handleAddCompetency = () => {
    const newComp: ExtractedCompItem = {
      id: `comp-custom-${Date.now()}`,
      original_label: "New Competency Requirement",
      skill_id: `skill-custom-${Date.now()}`,
      canonical_name: "New Skill Requirement",
      category: "Technical",
      requirement_type: "core_required",
      importance: "high",
      expected_level: "Practitioner",
      evidence_expectation: "Demonstrated code or production artifacts.",
      source_span: "User added requirement during review",
      mapping_status: "mapped",
    };
    setCompetencies([...competencies, newComp]);
  };

  const buildCustomRoleModel = (customRoleId: string): RoleDemandModel => {
    const title = jobTitle.trim() || "Custom Technical Role";
    const company = companyName.trim() || "Target Employer";

    return {
      role_id: customRoleId,
      version: "v2026.custom.1",
      title: title,
      seniority: seniority,
      context: `${company} — Parsed Job Specification`,
      description: `Custom role extracted from job posting: ${title} at ${company}.`,
      provenance: `Parsed from job description ${inputTab === "url" ? targetUrl : "text"} on ${new Date().toLocaleDateString()}`,
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
  };

  // Save Job as a target role WITHOUT activating it
  const handleSaveJobOnly = async () => {
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

    const newCustomModel = buildCustomRoleModel(customRoleId);
    saveCustomRole(newCustomModel);
    showToast(`Role "${title}" saved to your target roles! (Active target role unchanged)`);
  };

  // Save & Compare (Activates role and navigates to match breakdown)
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

    const newCustomModel = buildCustomRoleModel(customRoleId);
    saveCustomRole(newCustomModel);
    setSelectedRoleId(customRoleId);
    showToast(`Custom role "${title}" saved and set as active target!`);
    router.push("/app/career/match");
  };

  const handleResetForNewJob = () => {
    setParsed(false);
    setCompetencies([]);
    setRawText("");
    setTargetUrl("");
    setJobTitle("");
    setCompanyName("");
    setAuthWallNotice(null);
    setSsrfError(null);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-ink text-white px-5 py-3 rounded-full text-xs font-semibold shadow-2xl flex items-center gap-2 border border-ink/20 animate-fade-in">
          <BookmarkPlus className="w-4 h-4 text-lime" />
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
          className="pill-btn bg-lime/40 hover:bg-lime border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5 font-bold shadow-sm"
        >
          <Briefcase className="w-3.5 h-3.5" /> Discover Live Jobs
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Auth Wall Notice if Encountered */}
        {authWallNotice && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-start gap-3 text-amber-950 text-xs shadow-sm">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <strong className="font-bold block text-sm">Protected Job Posting (Authentication Wall)</strong>
              <p className="text-amber-900 leading-relaxed">{authWallNotice}</p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setInputTab("text");
                    setAuthWallNotice(null);
                  }}
                  className="pill-btn pill-btn-primary text-xs py-1.5 px-3 font-bold"
                >
                  Switch to Paste Text Tab &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SSRF Security Banner if Triggered */}
        {ssrfError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-rose-950 text-xs shadow-sm">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm">SSRF Protection Blocked Request</strong>
              <p className="mt-0.5 text-rose-800 leading-relaxed">{ssrfError}</p>
              <p className="text-[11px] text-rose-700/80 mt-1">
                For system security, requests to internal network ranges (127.0.0.1, 10.0.0.0/8, 192.168.0.0/16, AWS metadata 169.254.169.254) are rejected.
              </p>
            </div>
          </div>
        )}

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Input Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="gl-card p-6 bg-white space-y-4 border border-ink/10 shadow-sm">
              <div className="flex items-center justify-between border-b border-ink/10 pb-3 flex-wrap gap-2">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-ink" />
                  Job Description Input
                </h3>
                {/* 2 Tab Switcher: Text and URL */}
                <div className="flex items-center gap-1 bg-sand/30 p-1 rounded-xl border border-ink/10 text-xs">
                  <button
                    type="button"
                    onClick={() => { setInputTab("text"); setSsrfError(null); setAuthWallNotice(null); }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      inputTab === "text"
                        ? "bg-white text-ink shadow-xs font-bold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    Paste Text
                  </button>
                  <button
                    type="button"
                    onClick={() => { setInputTab("url"); setSsrfError(null); setAuthWallNotice(null); }}
                    className={`px-3 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                      inputTab === "url"
                        ? "bg-white text-ink shadow-xs font-bold"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    Public URL
                  </button>
                </div>
              </div>

              <form onSubmit={handleParseJD} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-ink mb-1">
                    Target Job Title <span className="font-normal text-ink-muted">(Optional — inferred if omitted)</span>
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="w-full bg-white border border-ink/20 rounded-xl px-3 py-2 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    placeholder="e.g. LLM Security Engineer"
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
                      placeholder="e.g. Anthropic, Stripe"
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

                {inputTab === "text" ? (
                  <div>
                    <label className="block font-semibold text-ink mb-1">
                      Paste Job Posting Text <span className="text-amber-800">*</span>
                    </label>
                    <textarea
                      rows={11}
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      className="w-full p-3 rounded-xl border border-ink/20 font-mono text-[11px] leading-relaxed focus:ring-2 focus:ring-ink/10 focus:border-ink focus:outline-none"
                      placeholder="Paste the full job description text here (requirements, responsibilities, tech stack, qualifications)..."
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block font-semibold text-ink mb-1">
                      Public Job Posting URL <span className="text-amber-800">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={targetUrl}
                        onChange={(e) => setTargetUrl(e.target.value)}
                        className="w-full bg-white border border-ink/20 rounded-xl pl-9 pr-3 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                        placeholder="https://boards.greenhouse.io/company/jobs/12345"
                      />
                      <Globe className="w-4 h-4 text-ink-muted absolute left-3 top-3" />
                    </div>
                    <span className="text-[11px] text-ink-muted block leading-relaxed">
                      Scrapes public careers pages and extracts job specifications with SSRF protection against private IP addresses.
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isParsing || (inputTab === "text" ? !rawText.trim() : !targetUrl.trim())}
                  className="pill-btn pill-btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 font-bold shadow disabled:opacity-50"
                >
                  {isParsing ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      {inputTab === "url" ? "Scraping & Parsing Public Posting..." : "Parsing Against Canonical Taxonomy..."}
                    </>
                  ) : (
                    <>
                      <FileSearch className="w-4 h-4" />
                      {inputTab === "url" ? "Scrape & Parse URL" : "Parse Requirements"}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Review Screen */}
          <div className="lg:col-span-7 space-y-4">
            {parsed && competencies.length > 0 ? (
              <div className="gl-card p-6 bg-white space-y-6 border border-ink/10 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-ink" />
                      Extracted Competency Specifications
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-ink text-white">
                        {competencies.length}
                      </span>
                    </h3>
                    <p className="text-xs text-ink-muted">
                      Extracted for <strong>{jobTitle || "Not specified in source"}</strong> at <strong>{companyName || "Not specified in source"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAddCompetency}
                      className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-ink text-xs py-2 px-3 flex items-center gap-1 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Requirement
                    </button>
                    {/* Option 1: Save Job Only without auto-activating */}
                    <button
                      type="button"
                      onClick={handleSaveJobOnly}
                      className="pill-btn bg-sand/30 hover:bg-sand/60 border border-ink/20 text-ink text-xs py-2 px-3 flex items-center gap-1.5 font-bold shadow-xs"
                    >
                      <BookmarkPlus className="w-3.5 h-3.5" /> Save Job
                    </button>
                    {/* Option 2: Save & Compare */}
                    <button
                      onClick={handleSaveAndCompare}
                      className="pill-btn pill-btn-primary text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save & Compare
                    </button>
                  </div>
                </div>

                {/* Notice if title not specified in source */}
                {(!jobTitle || jobTitle === "Not specified in source") && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                    <span>Job title was not explicitly stated in the source text. Please verify or enter a descriptive title above before saving.</span>
                  </div>
                )}

                {/* List of Extracted Competencies */}
                <div className="space-y-4">
                  {competencies.map((comp) => (
                    <div
                      key={comp.id}
                      className="p-4 rounded-xl border border-ink/10 bg-sand/10 space-y-3 hover:border-ink/20 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={comp.canonical_name}
                              onChange={(e) => handleUpdateComp(comp.id, { canonical_name: e.target.value })}
                              className="font-bold text-ink text-sm bg-transparent border-b border-dashed border-ink/30 hover:border-ink focus:border-ink focus:outline-none"
                            />
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand border border-ink/10 text-ink">
                              {comp.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pt-1 text-xs">
                            <div className="flex items-center gap-1">
                              <span className="text-ink-muted text-[11px]">Type:</span>
                              <select
                                value={comp.requirement_type}
                                onChange={(e) => handleUpdateComp(comp.id, { requirement_type: e.target.value as any })}
                                className="bg-white border border-ink/20 rounded px-2 py-0.5 text-xs text-ink"
                              >
                                <option value="core_required">Core Required</option>
                                <option value="important">Important</option>
                                <option value="supporting">Supporting</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-1">
                              <span className="text-ink-muted text-[11px]">Expected:</span>
                              <select
                                value={comp.expected_level}
                                onChange={(e) => handleUpdateComp(comp.id, { expected_level: e.target.value as any })}
                                className="bg-white border border-ink/20 rounded px-2 py-0.5 text-xs text-ink"
                              >
                                <option value="Foundation">Foundation</option>
                                <option value="Working">Working</option>
                                <option value="Practitioner">Practitioner</option>
                                <option value="Advanced">Advanced</option>
                                <option value="Expert">Expert</option>
                              </select>
                            </div>
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

                <div className="pt-4 border-t border-ink/10 flex items-center justify-between gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleResetForNewJob}
                    className="pill-btn bg-white hover:bg-sand/30 border border-ink/20 text-xs py-2 px-3 text-ink flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Parse Another Job
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveJobOnly}
                      className="pill-btn bg-sand/30 hover:bg-sand/60 border border-ink/20 text-xs py-2 px-4 text-ink font-bold shadow-xs flex items-center gap-1.5"
                    >
                      <BookmarkPlus className="w-4 h-4" /> Save Job
                    </button>
                    <button
                      onClick={handleSaveAndCompare}
                      className="pill-btn pill-btn-primary text-xs py-2 px-5 flex items-center justify-center gap-2 font-bold shadow"
                    >
                      <Save className="w-4 h-4" />
                      Save & Compare With My Skills
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="gl-card p-12 text-center bg-white border border-ink/10 space-y-3">
                <FileSearch className="w-10 h-10 text-ink-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink">Ready to Parse Job Requirements</h4>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  Paste the job posting text or submit a public careers URL on the left and click &ldquo;Parse Requirements&rdquo;. The parser will identify explicit competency expectations, assign maturity levels, and align them against the Skill Intelligence canonical taxonomy with source span provenance.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
