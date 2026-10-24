"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Briefcase,
  ExternalLink,
  Sparkles,
  Layers,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Scale,
  ArrowRight,
  RotateCw,
  Sliders,
  DollarSign,
  Building,
  ShieldCheck,
  Zap,
  Globe,
  X,
  ChevronRight,
  Bookmark,
  Send,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { TargetRoleSelectorBar } from "@/components/app/CareerBadges";
import CountrySelector from "@/components/app/CountrySelector";
import { CountryOption } from "@/data/countries";
import { useEvidence } from "@/context/EvidenceContext";
import {
  discoverJobs,
  getJobProviderStatus,
  extractJobRequirements,
  NormalizedJob,
  JobProviderStatus,
  JobDiscoveryResponse,
  saveCustomRole as saveCustomRoleApi,
} from "@/lib/careerApi";

export default function DiscoverJobsPage() {
  const router = useRouter();
  const { skills, initialLoading, setSelectedRoleId, saveCustomRole } = useEvidence();

  // Mode Selection: "mode_a_skills" vs "mode_b_role"
  const [mode, setMode] = useState<"mode_a_skills" | "mode_b_role" | "mode_c_recruiter">("mode_a_skills");

  // Inputs
  const [roleQuery, setRoleQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);

  // Selected skill IDs for Mode A query construction
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);

  // Search execution & UI states
  const [isSearching, setIsSearching] = useState(false);
  const [searchStep, setSearchStep] = useState<string>("");
  const [discoveryResult, setDiscoveryResult] = useState<JobDiscoveryResponse | null>(null);
  const [providerStatus, setProviderStatus] = useState<JobProviderStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCategory, setErrorCategory] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [extractingJobId, setExtractingJobId] = useState<string | null>(null);

  // Load provider status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        const s = await getJobProviderStatus();
        setProviderStatus(s);
      } catch (err: any) {
        console.warn("Could not load provider status:", err);
      }
    }
    loadStatus();
  }, []);

  // Filter eligible skills from user's Skill Passport
  const eligibleSkills = useMemo(() => {
    return skills.filter(
      (s) =>
        s.verificationState === "verified" ||
        s.verificationState === "candidate" ||
        (s as any).verificationState === "reviewed"
    );
  }, [skills]);

  // Initialize selected skills with top 5 when eligible skills arrive
  useEffect(() => {
    if (eligibleSkills.length > 0 && selectedSkillIds.length === 0) {
      setSelectedSkillIds(eligibleSkills.slice(0, 5).map((s) => s.id));
    }
  }, [eligibleSkills, selectedSkillIds.length]);

  // Toggle a skill's inclusion in Mode A search
  const toggleSkillSelection = (skillId: string) => {
    setSelectedSkillIds((prev) => {
      if (prev.includes(skillId)) {
        if (prev.length <= 1) return prev; // Keep at least one skill selected
        return prev.filter((id) => id !== skillId);
      } else {
        if (prev.length >= 8) return prev; // Cap at 8 skills
        return [...prev, skillId];
      }
    });
  };

  // Explicit Search Execution
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (mode === "mode_b_role" && !roleQuery.trim()) {
      setErrorMessage("Please enter a target role to search for (e.g. AI Engineer, Python Developer).");
      setErrorCategory("validation_error");
      return;
    }

    if (mode === "mode_a_skills" && eligibleSkills.length > 0 && selectedSkillIds.length === 0) {
      setErrorMessage("Please select at least one skill to guide your search.");
      setErrorCategory("validation_error");
      return;
    }

    setIsSearching(true);
    setSearchStep("Connecting to server-side provider orchestrator...");
    setErrorMessage(null);
    setErrorCategory(null);
    setActionNotice(null);

    // Build effective query
    let queryToSubmit: string | undefined = undefined;
    if (mode === "mode_b_role") {
      queryToSubmit = roleQuery.trim();
    } else {
      // For Mode A: build query from selected skills
      const selectedNames = eligibleSkills
        .filter((s) => selectedSkillIds.includes(s.id))
        .map((s) => s.canonicalName || (s as any).name || (s as any).title)
        .filter(Boolean);

      if (selectedNames.length > 0) {
        const combined = selectedNames.join(" ").toLowerCase();
        if (combined.includes("machine learning") || combined.includes("ai") || combined.includes("deep learning")) {
          queryToSubmit = "AI Machine Learning Engineer";
        } else if (combined.includes("frontend") || combined.includes("react") || combined.includes("typescript") || combined.includes("javascript")) {
          queryToSubmit = "Frontend Engineer";
        } else if (combined.includes("python") || combined.includes("fastapi") || combined.includes("django")) {
          queryToSubmit = "Python Developer";
        } else if (combined.includes("devops") || combined.includes("cloud") || combined.includes("docker") || combined.includes("kubernetes")) {
          queryToSubmit = "DevOps Engineer";
        } else if (combined.includes("data") || combined.includes("sql") || combined.includes("postgresql")) {
          queryToSubmit = "Data Engineer";
        } else {
          queryToSubmit = "Software Engineer";
        }
      }
    }

    try {
      setSearchStep("Querying live job listings with deduplication & caching...");
      const res = await discoverJobs({
        mode,
        query: queryToSubmit,
        location: selectedCountry ? selectedCountry.name : undefined,
        country_code: selectedCountry ? selectedCountry.code : undefined,
        remote_only: remoteOnly,
        limit: 10,
      });

      setDiscoveryResult(res);

      if (res.total_results === 0 && (!res.jobs || res.jobs.length === 0)) {
        setActionNotice(
          "No matching vacancies found for these exact filters. Try clearing the country filter or exploring related role keywords."
        );
      }
    } catch (err: any) {
      console.error("Job discovery failed:", err);
      const rawMsg = err.message || "Job discovery failed.";

      if (rawMsg.toLowerCase().includes("authentication") || rawMsg.toLowerCase().includes("401") || rawMsg.toLowerCase().includes("403")) {
        setErrorCategory("provider_authentication_error");
        setErrorMessage("The job provider rejected authentication. Please check server-side provider credentials in backend/.env.");
      } else if (rawMsg.toLowerCase().includes("rate limit") || rawMsg.toLowerCase().includes("429")) {
        setErrorCategory("rate_limit_exceeded");
        setErrorMessage("The external job provider has reached its request limit. Please try again shortly or use cached data.");
      } else if (rawMsg.toLowerCase().includes("timed out") || rawMsg.toLowerCase().includes("504")) {
        setErrorCategory("network_timeout");
        setErrorMessage("The provider search request timed out. Please retry with a more specific location or title.");
      } else {
        setErrorCategory("provider_error");
        setErrorMessage(rawMsg);
      }
    } finally {
      setIsSearching(false);
      setSearchStep("");
    }
  };

  // Compare My Skills Action on a discovered job
  const handleCompareJobSkills = async (job: NormalizedJob) => {
    setExtractingJobId(job.id);
    setActionNotice(null);

    try {
      const res = await extractJobRequirements(job.id);
      const count = (res as any).total_extracted ?? res.extracted_competencies?.length ?? 0;

      if (res.extracted_competencies && res.extracted_competencies.length > 0) {
        const customRole = {
          role_id: `role-job-${job.id.slice(0, 16)}`,
          version: "v2026.custom.1",
          title: job.title,
          seniority: (job.seniority as any) || "Mid Level",
          context: `${job.company_name} — Discovered Vacancy`,
          description: job.description || `Job posting for ${job.title} at ${job.company_name}.`,
          provenance: `Discovered from real vacancy via ${job.provider} (${job.job_url || "Direct"})`,
          source_type: "custom_parsed_job" as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          competencies: res.extracted_competencies.map((c: any) => ({
            skill_id: c.canonical_skill_id || c.skill_id || `skill-${c.canonical_name?.toLowerCase().replace(/\s+/g, "-")}`,
            canonical_name: c.canonical_name || c.original_label || "Engineering Competency",
            category: c.category || "Technical",
            requirement_type: c.requirement_type || "core_required",
            importance: c.importance || "high",
            expected_level: c.expected_level || "Practitioner",
            expected_level_numeric: c.expected_level_numeric || 3,
            evidence_expectation: c.evidence_expectation || "Production work artifacts demonstrating this capability.",
            prerequisites: [],
            reason_codes: [],
            source_references: [],
            mapping_status: c.status || "mapped",
            source_span: c.source_span,
          })),
        };

        saveCustomRole(customRole);
        setSelectedRoleId(customRole.role_id);

        try {
          await saveCustomRoleApi({
            job_title: job.title,
            company_name: job.company_name,
            seniority: (job.seniority as any) || "Mid Level",
            context: `${job.company_name} — Discovered Vacancy`,
            source_url: job.job_url,
            extracted_competencies: res.extracted_competencies,
          });
        } catch (apiErr) {
          console.warn("Could not save custom role to backend:", apiErr);
        }

        setActionNotice(
          `Extracted ${count} requirements from "${job.title}". Set as your active target role! Compare your skills below.`
        );
      } else {
        setActionNotice(`Job description parsed, but no structured competencies were recognized.`);
      }
    } catch (err: any) {
      console.error("Requirement extraction error:", err);
      setErrorMessage(`Could not extract competencies from job description: ${err.message}`);
    } finally {
      setExtractingJobId(null);
    }
  };

  const isAnyProviderConfigured = Boolean(providerStatus?.any_configured);

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Discover Real Jobs"
        description="Search real job postings using server-side, cost-aware provider orchestration. Find openings tailored to your verified skills or explore any desired career."
        badge="Cost-Aware Orchestration"
        badgeColor="border-ink/20 text-ink bg-lime"
      >
        <Link
          href="/app/career/roles"
          className="pill-btn pill-btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
        >
          <Briefcase className="w-3.5 h-3.5" /> Curated Catalogue
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-20">
        <TargetRoleSelectorBar />

        {/* Configuration Notice if Providers Unconfigured */}
        {!isAnyProviderConfigured && providerStatus && (
          <div className="gl-card p-5 bg-amber-50 border border-amber-300 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-amber-900">
                  Live External Job Providers Not Configured
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  No active provider credentials found in backend environment. To query real live
                  openings from TheirStack, JSearch (RapidAPI), or Fantastic.jobs, add at least one key
                  to your server environment (e.g., <code className="font-mono font-bold">THEIRSTACK_API_KEY</code>,{" "}
                  <code className="font-mono font-bold">JSEARCH_API_KEY</code>, or{" "}
                  <code className="font-mono font-bold">FANTASTIC_JOBS_API_KEY</code>).
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] font-mono text-amber-900 flex-wrap">
                  {providerStatus.providers?.map((p) => (
                    <span
                      key={p.provider}
                      className="inline-flex items-center gap-1 bg-white/70 px-2.5 py-1 rounded border border-amber-200"
                    >
                      <strong className="capitalize">{p.provider.replace("_", ".")}:</strong>
                      <span className={p.is_configured ? "text-emerald-700 font-bold" : "text-amber-800"}>
                        {p.is_configured ? "Configured" : "Not configured"}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="gl-card p-4 bg-emerald-50 border border-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-xs text-emerald-950 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <Link
              href="/app/career/match"
              className="text-xs font-bold text-emerald-900 underline hover:text-emerald-700 ml-4 shrink-0 flex items-center gap-1"
            >
              View Match &rarr;
            </Link>
          </div>
        )}

        {/* Error Toast */}
        {errorMessage && (
          <div className="gl-card p-4 bg-rose-50 border border-rose-300 space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-rose-950 font-medium">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Search Unsuccessful</span>
                <p className="text-xs text-rose-800">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1 & 2: DISCOVERY SEARCH WORKSPACE */}
        <div className="gl-card p-6 bg-white border border-ink/10 shadow-sm space-y-6">
          {/* Step 1: Mode Switcher */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-muted font-bold">
                Step 1: Choose Discovery Mode
              </span>
              <span className="text-[11px] font-mono text-ink-muted">
                {mode === "mode_a_skills" ? "Profile Driven" : mode === "mode_b_role" ? "Exploratory Search" : "Direct Recruiter Openings"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMode("mode_a_skills");
                  setErrorMessage(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  mode === "mode_a_skills"
                    ? "bg-sand/30 border-ink ring-2 ring-ink/15 shadow-sm"
                    : "bg-white hover:bg-sand/10 border-ink/15 text-ink-muted hover:text-ink"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    Mode A — Find Jobs That Fit My Skills
                  </span>
                  {mode === "mode_a_skills" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Queries openings tailored directly to your verified and candidate Skill Intelligence profile.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("mode_b_role");
                  setErrorMessage(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  mode === "mode_b_role"
                    ? "bg-sand/30 border-ink ring-2 ring-ink/15 shadow-sm"
                    : "bg-white hover:bg-sand/10 border-ink/15 text-ink-muted hover:text-ink"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Search className="w-4 h-4 text-ink" />
                    Mode B — Search for a Role I Choose
                  </span>
                  {mode === "mode_b_role" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Search for any career you aspire to explore, even if you do not yet have its prerequisites.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("mode_c_recruiter");
                  setErrorMessage(null);
                }}
                className={`p-4 rounded-xl border text-left transition-all relative ${
                  mode === "mode_c_recruiter"
                    ? "bg-sand/30 border-ink ring-2 ring-ink/15 shadow-sm"
                    : "bg-white hover:bg-sand/10 border-ink/15 text-ink-muted hover:text-ink"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink">
                    <Building className="w-4 h-4 text-emerald-700" />
                    Mode C — Recruiter-Published Jobs
                  </span>
                  {mode === "mode_c_recruiter" && (
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  )}
                </div>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Direct openings posted by verified employers. Match your verified skills and share your Skill Passport.
                </p>
              </button>
            </div>
          </div>

          {/* Step 2: Inputs for Selected Mode */}
          <form onSubmit={handleSearch} className="space-y-5 pt-2 border-t border-ink/10">
            {mode === "mode_a_skills" ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    Influencing Skills from your Skill Intelligence Profile:
                  </label>
                  <span className="text-[11px] font-mono text-ink-muted">
                    {selectedSkillIds.length} of 8 selected
                  </span>
                </div>

                {initialLoading ? (
                  <div className="py-4 flex items-center gap-2 text-xs text-ink-muted">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Loading your skill profile from Skill Intelligence...
                  </div>
                ) : eligibleSkills.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {eligibleSkills.map((skill) => {
                        const isSelected = selectedSkillIds.includes(skill.id);
                        const skillName =
                          skill.canonicalName || (skill as any).name || (skill as any).title || "Unnamed Skill";
                        const profLevel =
                          skill.verifiedProficiency && skill.verifiedProficiency !== "Not Established"
                            ? skill.verifiedProficiency
                            : skill.estimatedProficiency || (skill as any).proficiencyLevel || "Practitioner";
                        const isVerified = skill.verificationState === "verified";

                        return (
                          <button
                            key={skill.id}
                            type="button"
                            onClick={() => toggleSkillSelection(skill.id)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all border ${
                              isSelected
                                ? isVerified
                                  ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-medium shadow-sm"
                                  : "bg-amber-50 border-amber-400 text-amber-950 font-medium shadow-sm"
                                : "bg-sand/15 border-ink/15 text-ink-muted/80 opacity-60 hover:opacity-100"
                            }`}
                            title={isSelected ? "Click to exclude from this search" : "Click to include in search query"}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isVerified ? "bg-emerald-600" : "bg-amber-500"
                              }`}
                            />
                            <span>{skillName}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-white/60 border border-ink/10 text-ink-muted">
                              {profLevel}
                            </span>
                            {skill.confidence && (
                              <span className="text-[10px] font-mono text-ink-muted font-bold">
                                {skill.confidence}%
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-ink-muted italic">
                      Click any chip to toggle its inclusion in this search query without removing it from your Skill Passport.
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-sand/20 border border-ink/10 text-xs text-ink-muted space-y-1">
                    <p className="font-semibold text-ink">No verified skills found in your profile yet.</p>
                    <p className="text-[11px]">
                      Connect repositories or documents in the Evidence Workspace to extract skills, or switch to{" "}
                      <strong className="text-ink">Mode B</strong> above to search for any role directly.
                    </p>
                  </div>
                )}
              </div>
            ) : mode === "mode_b_role" ? (
              <div className="space-y-1.5">
                <label htmlFor="role-query-input" className="block text-xs font-bold text-ink">
                  What role do you want to become?
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    id="role-query-input"
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="e.g. AI Engineer, Machine Learning Engineer, MLOps Specialist, Backend Developer..."
                    className="w-full bg-white border border-ink/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    autoComplete="off"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="role-query-input" className="block text-xs font-bold text-ink">
                  Filter Employer Openings (Optional)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
                  <input
                    id="role-query-input"
                    type="text"
                    value={roleQuery}
                    onChange={(e) => setRoleQuery(e.target.value)}
                    placeholder="Search by role title, skill requirements, or company (leave blank for all)..."
                    className="w-full bg-white border border-ink/20 rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[11px] text-ink-muted">
                  Browsing verified employer openings published directly on Skill Passport.
                </p>
              </div>
            )}

            {/* Country Selector & Remote Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <CountrySelector
                value={selectedCountry}
                onChange={setSelectedCountry}
                disabled={isSearching}
              />

              <div className="flex flex-col justify-end space-y-1.5">
                <span className="text-xs font-bold text-ink opacity-0 pointer-events-none hidden md:block">
                  Remote Filter
                </span>
                <label className="flex items-center gap-3 p-2.5 bg-sand/15 border border-ink/15 rounded-xl cursor-pointer hover:bg-sand/30 transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={remoteOnly}
                    onChange={(e) => setRemoteOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-ink focus:ring-ink"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-ink block">Remote Only Openings</span>
                    <span className="text-[10px] text-ink-muted">Filter exclusively for remote positions</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-ink/10">
              <div className="text-[11px] font-mono text-ink-muted">
                {isSearching ? (
                  <span className="flex items-center gap-2 text-ink">
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    {searchStep}
                  </span>
                ) : (
                  <span>
                    Cost-aware query strictly bounded to 10 jobs &bull; 120-min deduplicated cache
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="pill-btn pill-btn-primary text-xs py-2.5 px-7 w-full sm:w-auto flex items-center justify-center gap-2 font-bold shadow disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    Searching Live Jobs...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    Find Jobs
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* STEP 3: DISCOVERY RESULTS AREA */}
        {discoveryResult && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Results Header Metadata Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white rounded-xl border border-ink/10 shadow-sm">
              <div className="space-y-0.5">
                <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                  <span>Job Openings Found</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-ink text-white">
                    {discoveryResult.total_results ?? discoveryResult.jobs?.length ?? 0}
                  </span>
                </h3>
                <p className="text-xs text-ink-muted">
                  Queried for: <strong className="text-ink">&quot;{discoveryResult.query}&quot;</strong>
                  {selectedCountry && (
                    <span> in <strong className="text-ink">{selectedCountry.name}</strong></span>
                  )}
                  {remoteOnly && <span> (Remote Only)</span>}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-ink-muted">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sand/30 border border-ink/10">
                  <span>Provider:</span>
                  <strong className="text-ink uppercase">{discoveryResult.provider_used || "live"}</strong>
                </span>

                {discoveryResult.from_cache ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    <span>Cache Hit (0 credits)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    <span>Fresh Provider Fetch</span>
                  </span>
                )}
              </div>
            </div>

            {/* Job Cards Grid */}
            {discoveryResult.jobs && discoveryResult.jobs.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {discoveryResult.jobs.map((job) => {
                  const isExtracting = extractingJobId === job.id;

                  return (
                    <div
                      key={job.id}
                      className="gl-card p-5 bg-white border border-ink/15 hover:border-ink/30 transition-all space-y-4 shadow-sm"
                    >
                      {/* Top Header of Card */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <h4 className="text-base font-bold text-ink hover:underline cursor-pointer">
                            <a
                              href={job.job_url || (job as any).apply_url || (job as any).applyUrl || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5"
                            >
                              {job.title}
                              <ExternalLink className="w-3.5 h-3.5 text-ink-muted shrink-0" />
                            </a>
                          </h4>
                          <div className="flex items-center gap-3 text-xs text-ink-muted flex-wrap">
                            <span className="flex items-center gap-1 font-semibold text-ink">
                              <Building className="w-3.5 h-3.5 text-ink-muted" />
                              {job.company_name}
                            </span>
                            {job.location_text && (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5 text-ink-muted" />
                                {job.location_text}
                              </span>
                            )}
                            {job.posted_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-ink-muted" />
                                {new Date(job.posted_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${
                              job.remote_status === "remote"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-bold"
                                : job.remote_status === "hybrid"
                                ? "bg-purple-50 text-purple-800 border-purple-300"
                                : "bg-sand/30 text-ink border-ink/15"
                            }`}
                          >
                            {job.remote_status === "remote"
                              ? "Remote"
                              : job.remote_status === "hybrid"
                              ? "Hybrid"
                              : "On-site"}
                          </span>

                          {job.employment_type && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sand/20 border border-ink/15 text-ink-muted capitalize">
                              {job.employment_type.replace("_", " ")}
                            </span>
                          )}

                          {job.seniority && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-sand/20 border border-ink/15 text-ink-muted">
                              {job.seniority}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Salary if available */}
                      {(job.salary_min || job.salary_max) && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-900 font-mono font-semibold bg-emerald-50/60 px-3 py-1.5 rounded-lg border border-emerald-200/60 w-fit">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                          <span>
                            {job.salary_currency || "$"}{" "}
                            {job.salary_min ? job.salary_min.toLocaleString() : ""}{" "}
                            {job.salary_min && job.salary_max ? "–" : ""}{" "}
                            {job.salary_max ? job.salary_max.toLocaleString() : ""} /{" "}
                            {job.salary_period || "yr"}
                          </span>
                        </div>
                      )}

                      {/* Description Excerpt */}
                      {job.description && (
                        <p className="text-xs text-ink/80 leading-relaxed line-clamp-3 font-sans">
                          {job.description.replace(/<[^>]*>/g, " ")}
                        </p>
                      )}

                      {/* Technologies Pill List if available */}
                      {(job as any).raw_metadata?.technologies && Array.isArray((job as any).raw_metadata.technologies) && (job as any).raw_metadata.technologies.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[10px] font-mono text-ink-muted mr-1">Technologies:</span>
                          {(job as any).raw_metadata.technologies.slice(0, 8).map((t: string) => (
                            <span
                              key={t}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-sand/30 border border-ink/10 text-ink"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-ink/10">
                        <div className="flex items-center gap-2 text-[11px] font-mono text-ink-muted">
                          <span>Source: {job.provider}</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {job.job_url && (
                            <a
                              href={job.job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="pill-btn pill-btn-secondary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View Post
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCompareJobSkills(job)}
                            disabled={isExtracting}
                            className="pill-btn pill-btn-secondary text-xs py-2 px-4 flex items-center justify-center gap-1.5 font-bold shadow-sm"
                          >
                            {isExtracting ? (
                              <>
                                <RotateCw className="w-3 h-3 animate-spin" />
                                Analyzing Fit...
                              </>
                            ) : (
                              <>
                                <Scale className="w-3 h-3" />
                                Analyze Fit
                              </>
                            )}
                          </button>

                          {(job.provider === "recruiter_portal" || Boolean(job.public_recruiter_email)) && (
                            <Link
                              href={`/app/passport/share?jobId=${job.id}&recruiterEmail=${encodeURIComponent(job.public_recruiter_email || '')}&jobTitle=${encodeURIComponent(job.title)}`}
                              className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center justify-center gap-1.5 font-bold shadow-sm bg-[#E0533C] text-white hover:bg-[#d0452f] border-none"
                            >
                              <Send className="w-3 h-3" />
                              <span>Send Passport</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="gl-card p-12 text-center bg-white border border-ink/10 space-y-3">
                <Briefcase className="w-8 h-8 text-ink-muted mx-auto" />
                <h4 className="text-sm font-bold text-ink">No Matching Openings Found</h4>
                <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed">
                  The provider search returned zero live postings matching your criteria. Try widening your country filter, enabling remote openings, or adjusting role keywords.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
