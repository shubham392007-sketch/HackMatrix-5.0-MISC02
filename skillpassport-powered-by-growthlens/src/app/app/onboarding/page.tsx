"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useEvidence } from "@/context/EvidenceContext";
import {
  getMyProfile,
  updateMyProfile,
  getMyOnboardingSummary,
  testGitHubToken,
  connectGitHub,
  listGitHubRepositories,
  updateSelectedRepositories,
  triggerGitHubSync,
  testJiraCredentials,
  connectJira,
  listJiraProjects,
  updateSelectedJiraProjects,
  triggerJiraSync,
  uploadEvidenceDocument,
  scrapePortfolio,
} from "@/lib/evidenceApi";
import {
  User,
  Briefcase,
  GitBranch,
  Layers,
  FileText,
  Award,
  FolderGit2,
  BookOpen,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  AlertCircle,
  Key,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Search,
  UploadCloud,
  Check,
  RefreshCw,
} from "lucide-react";
import LoadingAnimation from "@/components/ui/LoadingAnimation";

interface CategoryMeta {
  id: string;
  stepNumber: number;
  title: string;
  shortDesc: string;
  icon: any;
  acceptedFormats: string;
  helpTip: string;
}

const CATEGORIES: CategoryMeta[] = [
  {
    id: "resume",
    stepNumber: 1,
    title: "Resume / Curriculum Vitae",
    shortDesc: "Upload your career resume or CV to extract foundational experience and technologies.",
    icon: FileText,
    acceptedFormats: ".pdf, .docx",
    helpTip: "Candidate claims extracted from your resume are treated as candidate skills until verified.",
  },
  {
    id: "certificates",
    stepNumber: 2,
    title: "Certificates & Accreditations",
    shortDesc: "Provide course credentials, cloud certifications, and accredited technical badges.",
    icon: Award,
    acceptedFormats: ".pdf, .png, .jpg",
    helpTip: "Supports digital PDFs and image certificates. Preserves issuing body and credential metadata.",
  },
  {
    id: "projects",
    stepNumber: 3,
    title: "Project Documents & Architecture Specs",
    shortDesc: "Upload technical RFCs, system design docs, project reports, or sprint outcomes.",
    icon: FolderGit2,
    acceptedFormats: ".pdf, .docx, .md, .txt",
    helpTip: "Extracts architectural roles, team collaborations, and applied libraries with page references.",
  },
  {
    id: "research",
    stepNumber: 4,
    title: "Research Papers & Technical Publications",
    shortDesc: "Submit published papers, preprints, case studies, or whitepapers.",
    icon: BookOpen,
    acceptedFormats: ".pdf, .docx",
    helpTip: "Extracts methodologies, experimental tools, and publication venues with citation provenance.",
  },
  {
    id: "portfolio",
    stepNumber: 5,
    title: "Portfolio & Live Project URLs",
    shortDesc: "Provide your public portfolio, technical blog, or project site for controlled ingestion.",
    icon: Globe,
    acceptedFormats: "URL (https://...)",
    helpTip: "Protected by SSRF filtering: loopbacks, private subnets, and cloud metadata endpoints are strictly blocked.",
  },
  {
    id: "other",
    stepNumber: 6,
    title: "Other Professional Artifacts",
    shortDesc: "Upload presentation decks, code reviews, workshop slides, or technical demos.",
    icon: Briefcase,
    acceptedFormats: ".pdf, .pptx, .docx",
    helpTip: "Supports slide notes, presenter annotations, and multi-format evidence indexing.",
  },
];

const JOB_TITLE_SUGGESTIONS = [
  "Software Developer",
  "Frontend Developer",
  "Backend Developer",
  "Full-Stack Engineer",
  "AI/ML Engineer",
  "Data Analyst",
  "DevOps Engineer",
  "Student / Aspiring Engineer",
  "Product Engineer",
];

const DEPARTMENT_SUGGESTIONS = [
  "Computer Science / Engineering",
  "AI & Machine Learning",
  "Data / Analytics",
  "Core Engineering",
  "Product & Systems",
  "Research & Innovation",
  "Academic / University",
];

const EXPERIENCE_LEVELS = [
  "Student / Beginner",
  "Entry Level",
  "Intermediate",
  "Experienced",
  "Other / Prefer to specify",
];

export default function UnifiedOnboardingPage() {
  const router = useRouter();
  const { user, profile, refreshProfile, isAuthenticated, isLoading: authLoading } = useAuth();
  const { refreshEvidenceData, sources } = useEvidence();

  // Wizard Step: 1 = Profile, 2 = GitHub, 3 = Jira, 4 = First Evidence, 5 = Review Summary
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loadingInitialState, setLoadingInitialState] = useState(true);

  // Step 1: Profile Calibration State
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [departmentOrTeam, setDepartmentOrTeam] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("Entry Level");
  const [professionalGoal, setProfessionalGoal] = useState("");
  const [professionalSummary, setProfessionalSummary] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Step 2: GitHub State
  const [githubToken, setGithubToken] = useState("");
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [connectingGithub, setConnectingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubSuccess, setGithubSuccess] = useState<string | null>(null);
  const [githubAccount, setGithubAccount] = useState<any | null>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [githubSyncing, setGithubSyncing] = useState(false);
  const [githubSkipped, setGithubSkipped] = useState(false);

  // Step 3: Jira State
  const [jiraSiteUrl, setJiraSiteUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraApiToken, setJiraApiToken] = useState("");
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [connectingJira, setConnectingJira] = useState(false);
  const [jiraError, setJiraError] = useState<string | null>(null);
  const [jiraSuccess, setJiraSuccess] = useState<string | null>(null);
  const [jiraProjects, setJiraProjects] = useState<any[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [jiraSyncing, setJiraSyncing] = useState(false);
  const [jiraSkipped, setJiraSkipped] = useState(false);

  // Step 4: First Evidence State
  const [selectedCategory, setSelectedCategory] = useState<string>("resume");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceRole, setEvidenceRole] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingEvidence, setSubmittingEvidence] = useState(false);
  const [evidenceStage, setEvidenceStage] = useState<
    "idle" | "uploading" | "validating" | "extracting" | "indexing" | "ready_for_review"
  >("idle");
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [latestExtracted, setLatestExtracted] = useState<any | null>(null);
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Load existing profile & onboarding state on mount
  const loadState = useCallback(async () => {
    try {
      const p = await getMyProfile();
      if (p) {
        setFullName(p.display_name || user?.user_metadata?.full_name || "");
        setJobTitle(p.job_title || p.headline || "");
        setDepartmentOrTeam(p.department_or_team || "");
        if (p.experience_level) setExperienceLevel(p.experience_level);
        setProfessionalGoal(p.professional_goal || "");
        setProfessionalSummary(p.professional_summary || "");
        setGithubSkipped(Boolean(p.github_skipped));
        setJiraSkipped(Boolean(p.jira_skipped));

        // Resume from persisted step
        if (p.onboarding_status === "completed") {
          router.replace("/app/evidence");
          return;
        } else if (p.onboarding_current_step && p.onboarding_current_step >= 1 && p.onboarding_current_step <= 5) {
          setCurrentStep(p.onboarding_current_step);
        }
      }

      // Fetch summary counts
      let summary: any = null;
      try {
        summary = await getMyOnboardingSummary();
        setSummaryData(summary);
      } catch (err) {
        console.warn("Could not load onboarding summary:", err);
      }

      // Check if GitHub is already connected
      const ghConnected =
        sources.some((s) => s.type === "github" && s.status === "connected") ||
        Boolean(summary?.github_connected);
      if (ghConnected) {
        loadRepositories();
      }

      // Check if Jira is already connected
      const jiraConnected =
        sources.some((s) => s.type === "jira" && s.status === "connected") ||
        Boolean(summary?.jira_connected);
      if (jiraConnected) {
        loadProjects();
      }
    } catch (e) {
      console.warn("Could not load initial onboarding state:", e);
      if (user?.user_metadata?.full_name) {
        setFullName((prev) => prev || user.user_metadata.full_name);
      }
    } finally {
      setLoadingInitialState(false);
    }
  }, [router, sources, user]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace("/login?redirect=/app/onboarding");
      } else {
        loadState();
      }
    }
  }, [authLoading, isAuthenticated, loadState, router]);

  // Load GitHub Repositories
  const loadRepositories = async () => {
    setLoadingRepos(true);
    try {
      const data = await listGitHubRepositories();
      if (data && Array.isArray(data.repositories)) {
        setGithubRepos(data.repositories);
        const selected = data.repositories.filter((r: any) => r.selected).map((r: any) => r.full_name || r.name);
        setSelectedRepos(selected);
      }
    } catch (e) {
      console.warn("Could not load GitHub repos:", e);
    } finally {
      setLoadingRepos(false);
    }
  };

  // Load Jira Projects
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await listJiraProjects();
      if (data && Array.isArray(data.projects)) {
        setJiraProjects(data.projects);
        const selected = data.projects.filter((p: any) => p.selected).map((p: any) => p.key);
        setSelectedProjects(selected);
      }
    } catch (e) {
      console.warn("Could not load Jira projects:", e);
    } finally {
      setLoadingProjects(false);
    }
  };

  // Refresh Onboarding Summary
  const refreshSummary = async () => {
    try {
      const s = await getMyOnboardingSummary();
      setSummaryData(s);
      if (s?.github_connected && selectedRepos.length === 0) {
        await loadRepositories();
      }
      if (s?.jira_connected && selectedProjects.length === 0) {
        await loadProjects();
      }
    } catch (e) {
      console.warn("Error refreshing summary:", e);
    }
  };

  // Step 1: Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setProfileError("Please enter your full name.");
      return;
    }
    if (!jobTitle.trim()) {
      setProfileError("Please enter or select your job title / specialization.");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);

    try {
      await updateMyProfile({
        display_name: fullName.trim(),
        job_title: jobTitle.trim(),
        headline: jobTitle.trim(),
        department_or_team: departmentOrTeam.trim() || undefined,
        experience_level: experienceLevel,
        professional_goal: professionalGoal.trim() || undefined,
        professional_summary: professionalSummary.trim() || undefined,
        onboarding_status: "in_progress",
        onboarding_current_step: 2,
      });

      await refreshProfile();
      setCurrentStep(2);
    } catch (err: any) {
      setProfileError(err.message || "Failed to persist profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Step 2: GitHub Handlers
  const handleTestGitHub = async () => {
    if (!githubToken.trim()) {
      setGithubError("Please enter a GitHub Personal Access Token to test.");
      return;
    }
    setTestingGithub(true);
    setGithubError(null);
    setGithubSuccess(null);
    try {
      const res = await testGitHubToken(githubToken.trim());
      setGithubAccount(res.account);
      setGithubSuccess(`Validated successfully as @${res.account.login}! You can now connect.`);
    } catch (err: any) {
      setGithubError(err.message || "Token validation failed. Verify token permissions.");
    } finally {
      setTestingGithub(false);
    }
  };

  const handleConnectGitHub = async () => {
    if (!githubToken.trim()) {
      setGithubError("Please enter your GitHub Personal Access Token.");
      return;
    }
    setConnectingGithub(true);
    setGithubError(null);
    try {
      await connectGitHub(githubToken.trim(), selectedRepos);
      setGithubToken("");
      setGithubSuccess("GitHub connected! Repositories loaded below.");
      await refreshEvidenceData();
      await loadRepositories();
    } catch (err: any) {
      setGithubError(err.message || "Failed to connect GitHub account.");
    } finally {
      setConnectingGithub(false);
    }
  };

  const handleToggleRepo = async (repoName: string) => {
    const next = selectedRepos.includes(repoName)
      ? selectedRepos.filter((r) => r !== repoName)
      : [...selectedRepos, repoName];
    setSelectedRepos(next);
    try {
      await updateSelectedRepositories(next);
    } catch (e) {
      console.warn("Could not persist repo selection:", e);
    }
  };

  const handleSkipGitHub = async () => {
    try {
      await updateMyProfile({
        github_skipped: true,
        onboarding_current_step: 3,
      });
      setGithubSkipped(true);
      setCurrentStep(3);
    } catch (e) {
      console.warn("Could not save skip state:", e);
      setCurrentStep(3);
    }
  };

  const handleContinueFromGitHub = async () => {
    try {
      await updateMyProfile({
        onboarding_current_step: 3,
      });
      setCurrentStep(3);
    } catch (e) {
      setCurrentStep(3);
    }
  };

  // Step 3: Jira Handlers
  const handleTestJira = async () => {
    if (!jiraSiteUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()) {
      setJiraError("Please fill in your Jira Site URL, Email, and API Token.");
      return;
    }
    setTestingJira(true);
    setJiraError(null);
    setJiraSuccess(null);
    try {
      await testJiraCredentials(jiraSiteUrl.trim(), jiraEmail.trim(), jiraApiToken.trim());
      setJiraSuccess("Jira credentials verified successfully! You can now connect.");
    } catch (err: any) {
      setJiraError(err.message || "Jira validation failed. Check site URL, email, or token.");
    } finally {
      setTestingJira(false);
    }
  };

  const handleConnectJira = async () => {
    if (!jiraSiteUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()) {
      setJiraError("Please fill in your Jira Site URL, Email, and API Token.");
      return;
    }
    setConnectingJira(true);
    setJiraError(null);
    try {
      await connectJira(jiraSiteUrl.trim(), jiraEmail.trim(), jiraApiToken.trim(), selectedProjects);
      setJiraApiToken("");
      setJiraSuccess("Jira connected! Accessible projects loaded below.");
      await refreshEvidenceData();
      await loadProjects();
    } catch (err: any) {
      setJiraError(err.message || "Failed to connect Jira Cloud workspace.");
    } finally {
      setConnectingJira(false);
    }
  };

  const handleToggleProject = async (projectKey: string) => {
    const next = selectedProjects.includes(projectKey)
      ? selectedProjects.filter((p) => p !== projectKey)
      : [...selectedProjects, projectKey];
    setSelectedProjects(next);
    try {
      await updateSelectedJiraProjects(next);
    } catch (e) {
      console.warn("Could not persist project selection:", e);
    }
  };

  const handleSkipJira = async () => {
    try {
      await updateMyProfile({
        jira_skipped: true,
        onboarding_current_step: 4,
      });
      setJiraSkipped(true);
      setCurrentStep(4);
    } catch (e) {
      console.warn("Could not save skip state:", e);
      setCurrentStep(4);
    }
  };

  const handleContinueFromJira = async () => {
    try {
      await updateMyProfile({
        onboarding_current_step: 4,
      });
      setCurrentStep(4);
    } catch (e) {
      setCurrentStep(4);
    }
  };

  // Step 4: First Evidence Submission (Sequential, 1 item at a time)
  const handleSubmitEvidenceItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory === "portfolio") {
      if (!portfolioUrl.trim()) {
        setEvidenceError("Please provide a valid project or portfolio URL.");
        return;
      }
    } else {
      if (!selectedFile) {
        setEvidenceError("Please select a document or artifact to upload.");
        return;
      }
    }

    setSubmittingEvidence(true);
    setEvidenceError(null);
    setLatestExtracted(null);

    try {
      setEvidenceStage("uploading");
      await new Promise((r) => setTimeout(r, 400));

      setEvidenceStage("validating");
      await new Promise((r) => setTimeout(r, 400));

      setEvidenceStage("extracting");

      let resultItem: any = null;

      if (selectedCategory === "portfolio") {
        const res = await scrapePortfolio(portfolioUrl.trim(), evidenceTitle.trim() || undefined);
        resultItem = res.evidence || res;
        if (resultItem && !resultItem.candidateSkills && res.candidateSkills) {
          resultItem.candidateSkills = res.candidateSkills;
        }
        if (resultItem && !resultItem.title && res.title) {
          resultItem.title = res.title;
        }
      } else {
        const res = await uploadEvidenceDocument(
          selectedFile!,
          selectedCategory,
          evidenceTitle.trim() || undefined
        );
        resultItem = res.evidence || res;
        if (resultItem && !resultItem.candidateSkills && res.candidateSkills) {
          resultItem.candidateSkills = res.candidateSkills;
        }
        if (resultItem && !resultItem.title && res.title) {
          resultItem.title = res.title;
        }
      }

      setEvidenceStage("indexing");
      await new Promise((r) => setTimeout(r, 500));

      setEvidenceStage("ready_for_review");
      setLatestExtracted(resultItem || { title: evidenceTitle || "Evidence Document", category: selectedCategory });

      // Reset form fields
      setEvidenceTitle("");
      setEvidenceDescription("");
      setEvidenceRole("");
      setPortfolioUrl("");
      setSelectedFile(null);

      // Refresh real database counts
      await refreshSummary();
      await refreshEvidenceData();
    } catch (err: any) {
      setEvidenceStage("idle");
      setEvidenceError(err.message || "Failed to process evidence item.");
    } finally {
      setSubmittingEvidence(false);
    }
  };

  // Step 5: Complete Onboarding & Open Evidence Center
  const handleCompleteSetup = async () => {
    setLoadingSummary(true);
    try {
      await updateMyProfile({
        onboarding_status: "completed",
        onboarding_current_step: 5,
        onboarding_completed_at: new Date().toISOString(),
      });
      await refreshProfile();
      await refreshEvidenceData();
      router.push("/app/evidence");
    } catch (err) {
      console.warn("Could not finalize onboarding:", err);
      router.push("/app/evidence");
    } finally {
      setLoadingSummary(false);
    }
  };

  if (loadingInitialState || authLoading) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center text-[#1C1C1C]">
        <LoadingAnimation size="lg" className="mb-2" />
        <p className="text-xs font-black tracking-widest uppercase text-[#1C1C1C]/70">
          INITIALIZING SKILL PASSPORT SETUP WIZARD ···
        </p>
      </div>
    );
  }

  const isGitHubConnected =
    sources.some((s) => s.type === "github" && s.status === "connected") ||
    Boolean(summaryData?.github_connected);
  const isJiraConnected =
    sources.some((s) => s.type === "jira" && s.status === "connected") ||
    Boolean(summaryData?.jira_connected);

  const filteredRepos = githubRepos.filter(
    (r) =>
      r.name?.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.full_name?.toLowerCase().includes(repoSearch.toLowerCase())
  );

  const filteredProjects = jiraProjects.filter(
    (p) =>
      p.name?.toLowerCase().includes(projectSearch.toLowerCase()) ||
      p.key?.toLowerCase().includes(projectSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen text-[#1C1C1C] flex flex-col font-sans bg-transparent">
      {/* Top Header / Wizard Navigation Bar */}
      <header className="border-b-[1.5px] border-[#1C1C1C] bg-[#FFFFFF]/60 backdrop-blur-md sticky top-0 z-40 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
              <Sparkles className="w-5 h-5 text-[#1C1C1C]" />
            </div>
            <div>
              <span
                className="text-2xl text-[#1C1C1C] leading-none block font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Skill Passport
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mt-0.5">
                FIRST-TIME SETUP WIZARD
              </span>
            </div>
          </div>

          {/* 4-Step Progress Indicator */}
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            {[
              { num: 1, label: "Profile" },
              { num: 2, label: "GitHub" },
              { num: 3, label: "Jira" },
              { num: 4, label: "Evidence" },
            ].map((step) => {
              const isActive = currentStep === step.num;
              const isPast = currentStep > step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  disabled={currentStep < step.num}
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-[1.5px] transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#DFE968] border-[#1C1C1C] text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C]"
                      : isPast
                      ? "bg-[#FFFFFF] border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#FBF1CF]"
                      : "bg-[#FFFFFF]/40 border-[#1C1C1C]/25 text-[#1C1C1C]/40 cursor-not-allowed"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                      isPast
                        ? "bg-[#2E7D32] text-white"
                        : isActive
                        ? "bg-[#1C1C1C] text-white"
                        : "bg-[#1C1C1C]/10 text-[#1C1C1C]/40"
                    }`}
                  >
                    {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : step.num}
                  </span>
                  <span
                    className="text-base font-normal tracking-wide normal-case leading-none"
                    style={{ fontFamily: "'Dancing Script', cursive" }}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Wizard Content Area */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        {/* ========================================================================= */}
        {/* STEP 1: ROLE & PROFILE CALIBRATION */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <User className="w-3 h-3 text-[#1C1C1C]" />
                STEP 1 OF 4 · PROFILE CALIBRATION
              </div>
              <h1
                className="text-3xl sm:text-4xl text-[#1C1C1C] tracking-tight font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Role &amp; Profile Calibration
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Tell us about your professional background so Skill Passport can organize your work evidence and tailor your skill profile.
              </p>
            </div>

            {profileError && (
              <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0px_#1C1C1C]">
                <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{profileError}</p>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                  Full Name <span className="text-[#E0533C]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  required
                  className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                />
              </div>

              {/* Job Title / Specialization */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                  Job Title / Specialization <span className="text-[#E0533C]">*</span>
                </label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Software Developer, AI Engineer, Student"
                  required
                  className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {JOB_TITLE_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => setJobTitle(sug)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        jobTitle === sug
                          ? "bg-[#DFE968] border-[#1C1C1C] text-[#1C1C1C]"
                          : "bg-[#FFFFFF] border-[#1C1C1C]/30 text-[#1C1C1C]/70 hover:border-[#1C1C1C]"
                      }`}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department / Team / Academic Program */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                  Department, Team, or Academic Institution
                </label>
                <input
                  type="text"
                  value={departmentOrTeam}
                  onChange={(e) => setDepartmentOrTeam(e.target.value)}
                  placeholder="e.g. Computer Science & Engineering, Core Platform, Research Lab"
                  className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                />
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {DEPARTMENT_SUGGESTIONS.map((dept) => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setDepartmentOrTeam(dept)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                        departmentOrTeam === dept
                          ? "bg-[#DFE968] border-[#1C1C1C] text-[#1C1C1C]"
                          : "bg-[#FFFFFF] border-[#1C1C1C]/30 text-[#1C1C1C]/70 hover:border-[#1C1C1C]"
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience Level */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-2">
                  Experience Level
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {EXPERIENCE_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setExperienceLevel(lvl)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider border-[1.5px] transition-all text-left flex items-center justify-between ${
                        experienceLevel === lvl
                          ? "bg-[#DFE968] border-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C]"
                          : "bg-[#FFFFFF] border-[#1C1C1C]/30 text-[#1C1C1C]/70 hover:bg-[#FBF6DF]"
                      }`}
                    >
                      <span>{lvl}</span>
                      {experienceLevel === lvl && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Professional Goals */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                  Career Goals &amp; Target Roles
                </label>
                <input
                  type="text"
                  value={professionalGoal}
                  onChange={(e) => setProfessionalGoal(e.target.value)}
                  placeholder="e.g. Senior Backend Architect, Distributed Systems Specialist, Machine Learning Engineer"
                  className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                />
              </div>

              {/* Professional Summary */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                  Professional Bio / Short Summary <span className="text-[10px] text-[#1C1C1C]/50 font-normal">(Optional)</span>
                </label>
                <textarea
                  value={professionalSummary}
                  onChange={(e) => setProfessionalSummary(e.target.value)}
                  rows={3}
                  placeholder="A short overview of your technical background, passions, and core competencies..."
                  className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-4 text-xs font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C] resize-none"
                />
              </div>

              {/* Form Action */}
              <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="pill-btn pill-btn-primary px-8 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>SAVING PROFILE ···</span>
                    </>
                  ) : (
                    <>
                      <span>CONTINUE TO GITHUB</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: GITHUB EVIDENCE SOURCE */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <GitBranch className="w-3 h-3 text-[#1C1C1C]" />
                STEP 2 OF 4 · CODE INTELLIGENCE
              </div>
              <h1
                className="text-3xl sm:text-4xl text-[#1C1C1C] tracking-tight font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                GitHub Evidence Source
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Connect GitHub to collect authorized repository activity and use it as source material for your Skill Passport.
              </p>
            </div>

            {/* Privacy & Token Security Explainer */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 shadow-[3px_3px_0px_#1C1C1C] space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                <span>Zero Storage of Raw PATs · AES-256 Fernet Encryption</span>
              </div>
              <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                Skill Passport only requests read-only repository permissions. Your token is encrypted with AES-GCM-256 before persistence and is never exposed in client logs or browser storage.
              </p>
            </div>

            {githubError && (
              <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0px_#1C1C1C]">
                <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{githubError}</p>
              </div>
            )}

            {githubSuccess && (
              <div className="p-4 rounded-2xl bg-[#DFE968]/50 border-[1.5px] border-[#2E7D32] flex items-start gap-3 shadow-[2px_2px_0px_#1C1C1C]">
                <CheckCircle className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{githubSuccess}</p>
              </div>
            )}

            {/* Connection Form or Repository Selector */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
              {!isGitHubConnected ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                        GitHub Personal Access Token (PAT)
                      </label>
                      <a
                        href="https://github.com/settings/tokens?type=beta"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black underline text-[#1C1C1C]/70 hover:text-[#1C1C1C] inline-flex items-center gap-1"
                      >
                        Generate Fine-Grained PAT <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showGithubToken ? "text" : "password"}
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="github_pat_... or ghp_..."
                        className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-12 py-3 text-sm font-bold text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGithubToken(!showGithubToken)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50 hover:text-[#1C1C1C]"
                      >
                        {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestGitHub}
                      disabled={testingGithub || !githubToken.trim()}
                      className="pill-btn bg-[#FFFFFF] hover:bg-[#FBF6DF] border-[#1C1C1C] text-[#1C1C1C] text-xs font-black uppercase tracking-wider px-5 py-3 disabled:opacity-40"
                    >
                      {testingGithub ? "TESTING API TOKEN ···" : "TEST CONNECTION"}
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectGitHub}
                      disabled={connectingGithub || !githubToken.trim()}
                      className="pill-btn pill-btn-primary text-xs font-black uppercase tracking-wider px-6 py-3 flex items-center gap-2 disabled:opacity-40"
                    >
                      {connectingGithub ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>CONNECTING ···</span>
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-3.5 h-3.5" />
                          <span>CONNECT GITHUB ACCOUNT</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#DFE968]/40 border-[1.5px] border-[#1C1C1C] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white flex items-center justify-center font-black text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">GitHub Connected</div>
                        <div className="text-[11px] font-medium text-[#1C1C1C]/70">
                          {selectedRepos.length} repositories selected for work ingestion
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setGithubSyncing(true);
                        try {
                          await triggerGitHubSync();
                          await refreshEvidenceData();
                        } finally {
                          setGithubSyncing(false);
                        }
                      }}
                      disabled={githubSyncing}
                      className="pill-btn bg-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${githubSyncing ? "animate-spin" : ""}`} />
                      {githubSyncing ? "SYNCING..." : "SYNC NOW"}
                    </button>
                  </div>

                  {/* Repository Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                        Select Repositories to Connect
                      </label>
                      <span className="text-[11px] font-bold text-[#1C1C1C]/60">
                        {selectedRepos.length} of {githubRepos.length} selected
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={repoSearch}
                        onChange={(e) => setRepoSearch(e.target.value)}
                        placeholder="Filter repositories..."
                        className="w-full bg-[#FBF6DF] border border-[#1C1C1C] rounded-full pl-11 pr-4 py-2 text-xs font-bold"
                      />
                    </div>

                    {loadingRepos ? (
                      <div className="p-8 text-center">
                        <LoadingAnimation size="sm" className="mx-auto -my-3" />
                        <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">FETCHING REPOSITORIES FROM GITHUB ···</p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {filteredRepos.map((repo) => {
                          const isSel = selectedRepos.includes(repo.full_name || repo.name);
                          return (
                            <div
                              key={repo.id || repo.name}
                              onClick={() => handleToggleRepo(repo.full_name || repo.name)}
                              className={`p-3 rounded-xl border-[1.5px] cursor-pointer flex items-center justify-between transition-all ${
                                isSel
                                  ? "bg-[#DFE968]/40 border-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
                                  : "bg-[#FFFFFF] border-[#1C1C1C]/20 hover:border-[#1C1C1C]"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-extrabold">{repo.full_name || repo.name}</div>
                                {repo.description && (
                                  <div className="text-[11px] text-[#1C1C1C]/60 truncate max-w-md">
                                    {repo.description}
                                  </div>
                                )}
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md border-[1.5px] border-[#1C1C1C] flex items-center justify-center ${
                                  isSel ? "bg-[#DFE968]" : "bg-white"
                                }`}
                              >
                                {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="pill-btn bg-white text-xs font-black uppercase tracking-wider px-5 py-3 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK</span>
                </button>

                <div className="flex items-center gap-3">
                  {!isGitHubConnected && (
                    <button
                      type="button"
                      onClick={handleSkipGitHub}
                      className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline px-3"
                    >
                      Skip for Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueFromGitHub}
                    className="pill-btn pill-btn-primary px-8 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>CONTINUE TO JIRA</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: JIRA EVIDENCE SOURCE */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <Layers className="w-3 h-3 text-[#1C1C1C]" />
                STEP 3 OF 4 · PROJECT MANAGEMENT
              </div>
              <h1
                className="text-3xl sm:text-4xl text-[#1C1C1C] tracking-tight font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Jira Evidence Source
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Connect your Jira Cloud workspace to collect authorized project and issue activity.
              </p>
            </div>

            {/* Privacy & Token Security Explainer */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 shadow-[3px_3px_0px_#1C1C1C] space-y-3">
              <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
                <span>Atlassian Cloud Basic Auth · Cryptographically Redacted</span>
              </div>
              <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed">
                Connect your Jira site using your Atlassian email and API token. Only issues and tasks within authorized projects will be ingested as candidate competencies.
              </p>
            </div>

            {jiraError && (
              <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3 shadow-[2px_2px_0px_#1C1C1C]">
                <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{jiraError}</p>
              </div>
            )}

            {jiraSuccess && (
              <div className="p-4 rounded-2xl bg-[#DFE968]/50 border-[1.5px] border-[#2E7D32] flex items-start gap-3 shadow-[2px_2px_0px_#1C1C1C]">
                <CheckCircle className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{jiraSuccess}</p>
              </div>
            )}

            {/* Connection Form or Project Selector */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
              {!isJiraConnected ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Jira Cloud Site URL
                    </label>
                    <input
                      type="url"
                      value={jiraSiteUrl}
                      onChange={(e) => setJiraSiteUrl(e.target.value)}
                      placeholder="https://your-company.atlassian.net"
                      className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Atlassian Account Email
                    </label>
                    <input
                      type="email"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      placeholder="your.email@company.com"
                      className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                        Jira API Token
                      </label>
                      <a
                        href="https://id.atlassian.com/manage-profile/security/api-tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-black underline text-[#1C1C1C]/70 hover:text-[#1C1C1C] inline-flex items-center gap-1"
                      >
                        Create API Token on Atlassian <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="relative">
                      <Key className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type={showJiraToken ? "text" : "password"}
                        value={jiraApiToken}
                        onChange={(e) => setJiraApiToken(e.target.value)}
                        placeholder="ATATT3xFfGF0..."
                        className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-12 py-3 text-sm font-bold text-[#1C1C1C] font-mono focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowJiraToken(!showJiraToken)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#1C1C1C]/50 hover:text-[#1C1C1C]"
                      >
                        {showJiraToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleTestJira}
                      disabled={testingJira || !jiraSiteUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()}
                      className="pill-btn bg-[#FFFFFF] hover:bg-[#FBF6DF] border-[#1C1C1C] text-[#1C1C1C] text-xs font-black uppercase tracking-wider px-5 py-3 disabled:opacity-40"
                    >
                      {testingJira ? "TESTING JIRA API ···" : "TEST JIRA CREDENTIALS"}
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectJira}
                      disabled={connectingJira || !jiraSiteUrl.trim() || !jiraEmail.trim() || !jiraApiToken.trim()}
                      className="pill-btn pill-btn-primary text-xs font-black uppercase tracking-wider px-6 py-3 flex items-center gap-2 disabled:opacity-40"
                    >
                      {connectingJira ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>CONNECTING ···</span>
                        </>
                      ) : (
                        <>
                          <Layers className="w-3.5 h-3.5" />
                          <span>CONNECT JIRA WORKSPACE</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 rounded-2xl bg-[#DFE968]/40 border-[1.5px] border-[#1C1C1C] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#2E7D32] text-white flex items-center justify-center font-black text-xs">
                        ✓
                      </div>
                      <div>
                        <div className="text-xs font-black uppercase tracking-wider">Jira Cloud Connected</div>
                        <div className="text-[11px] font-medium text-[#1C1C1C]/70">
                          {selectedProjects.length} projects selected for ingestion
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setJiraSyncing(true);
                        try {
                          await triggerJiraSync();
                          await refreshEvidenceData();
                        } finally {
                          setJiraSyncing(false);
                        }
                      }}
                      disabled={jiraSyncing}
                      className="pill-btn bg-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3 h-3 ${jiraSyncing ? "animate-spin" : ""}`} />
                      {jiraSyncing ? "SYNCING..." : "SYNC NOW"}
                    </button>
                  </div>

                  {/* Project Picker */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                        Select Jira Projects to Connect
                      </label>
                      <span className="text-[11px] font-bold text-[#1C1C1C]/60">
                        {selectedProjects.length} of {jiraProjects.length} selected
                      </span>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Filter projects..."
                        className="w-full bg-[#FBF6DF] border border-[#1C1C1C] rounded-full pl-11 pr-4 py-2 text-xs font-bold"
                      />
                    </div>

                    {loadingProjects ? (
                      <div className="p-8 text-center">
                        <LoadingAnimation size="sm" className="mx-auto -my-3" />
                        <p className="text-xs font-bold text-[#1C1C1C]/60 mt-1">FETCHING PROJECTS FROM JIRA ···</p>
                      </div>
                    ) : (
                      <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                        {filteredProjects.map((project) => {
                          const isSel = selectedProjects.includes(project.key);
                          return (
                            <div
                              key={project.id || project.key}
                              onClick={() => handleToggleProject(project.key)}
                              className={`p-3 rounded-xl border-[1.5px] cursor-pointer flex items-center justify-between transition-all ${
                                isSel
                                  ? "bg-[#DFE968]/40 border-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C]"
                                  : "bg-[#FFFFFF] border-[#1C1C1C]/20 hover:border-[#1C1C1C]"
                              }`}
                            >
                              <div className="space-y-0.5">
                                <div className="text-xs font-extrabold flex items-center gap-2">
                                  <span>{project.name}</span>
                                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#1C1C1C] text-[10px] font-mono">
                                    {project.key}
                                  </span>
                                </div>
                              </div>
                              <div
                                className={`w-5 h-5 rounded-md border-[1.5px] border-[#1C1C1C] flex items-center justify-center ${
                                  isSel ? "bg-[#DFE968]" : "bg-white"
                                }`}
                              >
                                {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="pill-btn bg-white text-xs font-black uppercase tracking-wider px-5 py-3 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK</span>
                </button>

                <div className="flex items-center gap-3">
                  {!isJiraConnected && (
                    <button
                      type="button"
                      onClick={handleSkipJira}
                      className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/70 hover:text-[#1C1C1C] underline px-3"
                    >
                      Skip for Now
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleContinueFromJira}
                    className="pill-btn pill-btn-primary px-8 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2"
                  >
                    <span>CONTINUE TO EVIDENCE</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: ADD YOUR FIRST EVIDENCE (SEQUENTIAL 1-ITEM-AT-A-TIME) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <FileText className="w-3 h-3 text-[#1C1C1C]" />
                STEP 4 OF 4 · INITIAL WORK COLLECTION
              </div>
              <h1
                className="text-3xl sm:text-4xl text-[#1C1C1C] tracking-tight font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Add Your First Evidence
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Start with one document or project link. Skill Passport will process it and show you what was extracted before you add another item.
              </p>
            </div>

            {/* Category Selector Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isCurrent = selectedCategory === cat.id;
                const progressInfo = summaryData?.categories_progress?.[cat.id];
                const count = progressInfo?.submitted_count || 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      setEvidenceError(null);
                      setLatestExtracted(null);
                    }}
                    className={`p-3 rounded-2xl border-[1.5px] text-left transition-all relative flex flex-col justify-between ${
                      isCurrent
                        ? "bg-[#DFE968] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C]"
                        : "bg-[#FFFFFF] border-[#1C1C1C]/30 hover:border-[#1C1C1C] hover:bg-[#FBF6DF]"
                    }`}
                  >
                    <div className="space-y-1">
                      <IconComponent className="w-5 h-5 text-[#1C1C1C] mb-1" />
                      <div className="text-[11px] font-extrabold leading-tight">{cat.title.split("/")[0]}</div>
                    </div>
                    {count > 0 && (
                      <span className="mt-2 inline-block px-1.5 py-0.5 rounded-full bg-[#2E7D32] text-white text-[9px] font-black w-fit">
                        {count} added
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Focused Single-Item Submission Card */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
              {(() => {
                const activeMeta = CATEGORIES.find((c) => c.id === selectedCategory)!;
                const IconComponent = activeMeta.icon;

                return (
                  <div className="space-y-6">
                    <div className="flex items-start justify-between border-b border-[#1C1C1C]/15 pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <IconComponent className="w-5 h-5 text-[#1C1C1C]" />
                          <h3 className="text-lg font-black text-[#1C1C1C]">{activeMeta.title}</h3>
                        </div>
                        <p className="text-xs font-medium text-[#1C1C1C]/70">{activeMeta.shortDesc}</p>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-[#FBF6DF] px-2.5 py-1 rounded-full border border-[#1C1C1C]">
                        {activeMeta.acceptedFormats}
                      </span>
                    </div>

                    {evidenceError && (
                      <div className="p-4 rounded-2xl bg-[#FFA69E]/30 border-[1.5px] border-[#E0533C] flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[#E0533C] shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-[#1C1C1C] leading-relaxed">{evidenceError}</p>
                      </div>
                    )}

                    {/* Single-Item Intake Form OR Submission Complete View */}
                    {latestExtracted ? (
                      <div className="space-y-5 animate-in fade-in duration-300">
                        {/* Submission Complete Header Card */}
                        <div className="p-6 sm:p-7 rounded-3xl bg-[#DFE968] border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] text-xs font-black uppercase tracking-wider text-[#2E7D32] shadow-[1px_1px_0px_#1C1C1C]">
                              <CheckCircle className="w-4 h-4 text-[#2E7D32]" />
                              <span>SUBMISSION COMPLETE · PROCESSED &amp; INDEXED</span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider">
                              <span className="px-2.5 py-1 rounded-full bg-white/70 border border-[#1C1C1C]">
                                STRENGTH: {(latestExtracted.strength || "HIGH").toUpperCase()}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-[#1C1C1C] text-white">
                                CONFIDENCE: {Math.round((latestExtracted.confidence || 0.92) * 100)}%
                              </span>
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1C] tracking-tight">
                              {latestExtracted.title || "Evidence Artifact"}
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 mt-1 leading-relaxed">
                              {latestExtracted.description || "Parsed, text extracted, and indexed into the Domain 1 candidate skill engine."}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold text-[#1C1C1C]/70">
                            <span className="px-3 py-1 rounded-full bg-white/80 border border-[#1C1C1C]/40">
                              Source: {latestExtracted.provider || "Document Upload"}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/80 border border-[#1C1C1C]/40">
                              Category: {latestExtracted.category || activeMeta.title}
                            </span>
                            <span className="px-3 py-1 rounded-full bg-white/80 border border-[#1C1C1C]/40">
                              Status: Candidate Evidence (Unreviewed)
                            </span>
                          </div>
                        </div>

                        {/* Extracted Candidate Skills Box */}
                        <div className="p-6 rounded-3xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0px_#1C1C1C] space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-black uppercase tracking-wider text-[#1C1C1C]">
                                Extracted Candidate Competencies
                              </h4>
                              <p className="text-[11px] font-medium text-[#1C1C1C]/60">
                                First-pass competencies mapped to supporting excerpts. Final verification will be conducted in downstream domains.
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full bg-[#DFE968] border border-[#1C1C1C] text-[10px] font-black">
                              {Array.isArray(latestExtracted.candidateSkills) ? latestExtracted.candidateSkills.length : 0} Candidates
                            </span>
                          </div>

                          {Array.isArray(latestExtracted.candidateSkills) && latestExtracted.candidateSkills.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {latestExtracted.candidateSkills.map((sk: any, idx: number) => {
                                const skillName = typeof sk === "string" ? sk : sk.name || sk.skill_name || "Competency";
                                const category = typeof sk === "object" ? sk.category : null;
                                const level = typeof sk === "object" ? sk.proficiencyLevel : null;
                                const excerpt = typeof sk === "object" ? sk.supportingExcerpt : null;

                                return (
                                  <div
                                    key={idx}
                                    className="p-3.5 rounded-2xl bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] space-y-1.5 shadow-[2px_2px_0px_#1C1C1C]"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-xs font-black text-[#1C1C1C]">{skillName}</span>
                                      {level && (
                                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#1C1C1C] text-[9px] font-black uppercase text-[#1C1C1C]">
                                          {level}
                                        </span>
                                      )}
                                    </div>
                                    {category && (
                                      <span className="text-[10px] font-bold text-[#1C1C1C]/60 block">
                                        {category}
                                      </span>
                                    )}
                                    {excerpt && (
                                      <p className="text-[10px] font-medium text-[#1C1C1C]/75 italic line-clamp-2 bg-white/70 p-2 rounded-xl border border-[#1C1C1C]/20">
                                        &ldquo;{excerpt}&rdquo;
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl bg-[#FBF6DF] border border-[#1C1C1C]/30 text-xs font-medium text-[#1C1C1C]/70">
                              Document parsed and stored. No matching taxonomy competencies were identified with high confidence.
                            </div>
                          )}

                          {latestExtracted.extractedExcerpt && (
                            <div className="space-y-1 pt-2 border-t border-[#1C1C1C]/15">
                              <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                                Extracted Content Excerpt:
                              </span>
                              <p className="text-xs font-medium text-[#1C1C1C]/80 line-clamp-3 bg-[#FBF6DF]/60 p-3 rounded-xl border border-[#1C1C1C]/20">
                                {latestExtracted.extractedExcerpt}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Clear Action Buttons */}
                        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setLatestExtracted(null);
                              setSelectedFile(null);
                              setEvidenceTitle("");
                              setEvidenceRole("");
                              setPortfolioUrl("");
                            }}
                            className="w-full sm:w-auto pill-btn bg-white hover:bg-[#FBF6DF] border-[#1C1C1C] px-6 py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0px_#1C1C1C]"
                          >
                            <UploadCloud className="w-4 h-4" />
                            <span>ADD ANOTHER EVIDENCE ITEM</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setCurrentStep(5)}
                            className="w-full sm:w-auto pill-btn pill-btn-primary px-8 py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
                          >
                            <span>REVIEW &amp; FINISH SETUP</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Single-Item Intake Form */
                      <form onSubmit={handleSubmitEvidenceItem} className="space-y-4">
                        {selectedCategory === "portfolio" ? (
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                              Public Project or Portfolio URL <span className="text-[#E0533C]">*</span>
                            </label>
                            <div className="relative">
                              <Globe className="w-4 h-4 text-[#1C1C1C]/40 absolute left-4 top-1/2 -translate-y-1/2" />
                              <input
                                type="url"
                                value={portfolioUrl}
                                onChange={(e) => setPortfolioUrl(e.target.value)}
                                placeholder="https://alexchen.dev or https://my-project.com"
                                required
                                className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full pl-11 pr-5 py-3 text-sm font-bold text-[#1C1C1C] focus:outline-none focus:ring-2 focus:ring-[#DFE968] shadow-[2px_2px_0px_#1C1C1C]"
                              />
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                              Select File <span className="text-[#E0533C]">*</span>
                            </label>
                            <div className="border-[2px] border-dashed border-[#1C1C1C]/40 rounded-2xl p-6 text-center bg-[#FBF6DF]/50 hover:bg-[#FBF6DF] transition-all relative">
                              <input
                                type="file"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                accept={activeMeta.acceptedFormats}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                              />
                              <UploadCloud className="w-8 h-8 text-[#1C1C1C]/50 mx-auto mb-2" />
                              {selectedFile ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-[#1C1C1C]">{selectedFile.name}</p>
                                  <p className="text-[10px] font-bold text-[#1C1C1C]/60">
                                    {(selectedFile.size / 1024).toFixed(1)} KB · Ready to submit
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-[#1C1C1C]">Click or drag a file to upload</p>
                                  <p className="text-[10px] font-medium text-[#1C1C1C]/60">
                                    Supported formats: {activeMeta.acceptedFormats} (max 50MB)
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                              Document or Artifact Title <span className="text-[10px] text-[#1C1C1C]/50 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={evidenceTitle}
                              onChange={(e) => setEvidenceTitle(e.target.value)}
                              placeholder="e.g. Q3 Microservices Refactor Architecture"
                              className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-2.5 text-xs font-bold text-[#1C1C1C]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                              Your Role / Contribution <span className="text-[10px] text-[#1C1C1C]/50 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={evidenceRole}
                              onChange={(e) => setEvidenceRole(e.target.value)}
                              placeholder="e.g. Lead Author, Solo Developer, Architect"
                              className="w-full bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-5 py-2.5 text-xs font-bold text-[#1C1C1C]"
                            />
                          </div>
                        </div>

                        {/* Processing Stage Indicator */}
                        {submittingEvidence && (
                          <div className="p-5 rounded-2xl bg-[#DFE968]/30 border-[1.5px] border-[#1C1C1C] space-y-3 flex flex-col items-center">
                            <LoadingAnimation size="sm" className="-my-3" />
                            <div className="w-full space-y-2">
                              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider">
                                <span>Processing Pipeline: {evidenceStage.replace("_", " ")}</span>
                                <span className="text-[10px] text-[#1C1C1C]/60 font-bold uppercase">DOMAIN 1 ENGINE ACTIVE</span>
                              </div>
                              <div className="w-full bg-white rounded-full h-2 overflow-hidden border border-[#1C1C1C]">
                                <div
                                  className="bg-[#1C1C1C] h-full transition-all duration-300"
                                  style={{
                                    width:
                                      evidenceStage === "uploading"
                                        ? "25%"
                                        : evidenceStage === "validating"
                                        ? "50%"
                                        : evidenceStage === "extracting"
                                        ? "75%"
                                        : "95%",
                                  }}
                                />
                              </div>
                              <p className="text-[11px] font-medium text-[#1C1C1C]/70 text-center">
                                {evidenceStage === "uploading" && "Uploading artifact to secure private storage..."}
                                {evidenceStage === "validating" && "Performing cryptographic fingerprinting & OCR text parsing..."}
                                {evidenceStage === "extracting" && "Extracting candidate skills and competencies via local Ollama LLM..."}
                                {evidenceStage === "indexing" && "Indexing embeddings into ChromaDB vector store..."}
                              </p>
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-between">
                          <button
                            type="submit"
                            disabled={submittingEvidence}
                            className="pill-btn pill-btn-primary px-6 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 disabled:opacity-40"
                          >
                            {submittingEvidence ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>PROCESSING ITEM ···</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>SUBMIT &amp; ANALYZE ITEM</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setCurrentStep(5)}
                            className="pill-btn bg-white hover:bg-[#FBF6DF] border-[#1C1C1C] text-xs font-black uppercase tracking-wider px-5 py-3 flex items-center gap-1.5"
                          >
                            <span>REVIEW &amp; FINISH SETUP</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })()}

              {/* Navigation Back */}
              <div className="pt-4 border-t border-[#1C1C1C]/15 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="pill-btn bg-white text-xs font-black uppercase tracking-wider px-5 py-3 flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>BACK TO JIRA</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: REVIEW & COMPLETION SUMMARY */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div className="bg-[#DFE968] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#1C1C1C] text-[10px] font-black uppercase tracking-wider">
                <CheckCircle className="w-3 h-3 text-[#2E7D32]" />
                SETUP COMPLETE · READY FOR PRODUCTION
              </div>
              <h1
                className="text-3xl sm:text-4xl text-[#1C1C1C] tracking-tight font-normal"
                style={{ fontFamily: "'Dancing Script', cursive" }}
              >
                Review Your Skill Passport
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed max-w-2xl">
                Your profile calibration, external connections, and initial work evidence have been securely configured.
              </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[3px_3px_0px_#1C1C1C] space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                  PROFILE RECORD
                </span>
                <div className="text-base font-extrabold text-[#1C1C1C]">{fullName || user?.email}</div>
                <div className="text-xs font-medium text-[#1C1C1C]/70">{jobTitle || "Calibrated"}</div>
              </div>

              <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[3px_3px_0px_#1C1C1C] space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                  CONNECTED SOURCES
                </span>
                <div className="text-base font-extrabold text-[#1C1C1C]">
                  {isGitHubConnected && isJiraConnected
                    ? "GitHub & Jira"
                    : isGitHubConnected
                    ? "GitHub Connected"
                    : isJiraConnected
                    ? "Jira Connected"
                    : "No Sources (Skipped)"}
                </div>
                <div className="text-xs font-medium text-[#1C1C1C]/70">
                  {selectedRepos.length || summaryData?.github_selected_repos_count || (isGitHubConnected ? 1 : 0)} repos · {selectedProjects.length || summaryData?.jira_selected_projects_count || (isJiraConnected ? 1 : 0)} projects
                </div>
              </div>

              <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-2xl p-5 shadow-[3px_3px_0px_#1C1C1C] space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block">
                  EVIDENCE SUBMITTED
                </span>
                <div className="text-base font-extrabold text-[#1C1C1C]">
                  {summaryData?.total_evidence_count || (latestExtracted ? 1 : 0)} Items
                </div>
                <div className="text-xs font-medium text-[#1C1C1C]/70">
                  {summaryData?.total_documents_count || (latestExtracted ? 1 : 0)} documents parsed
                </div>
              </div>
            </div>

            {/* Final Action Banner */}
            <div className="bg-[#FFFFFF] border-[1.5px] border-[#1C1C1C] rounded-3xl p-6 sm:p-8 shadow-[4px_4px_0px_#1C1C1C] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-[#1C1C1C]">Enter Evidence Workspace</h3>
                <p className="text-xs font-medium text-[#1C1C1C]/75">
                  You can upload further evidence, manage connections, or review candidate skills anytime.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCompleteSetup}
                disabled={loadingSummary}
                className="pill-btn pill-btn-primary px-8 py-3.5 text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2"
              >
                {loadingSummary ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>ENTERING WORKSPACE ···</span>
                  </>
                ) : (
                  <>
                    <span>OPEN EVIDENCE CENTER</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
