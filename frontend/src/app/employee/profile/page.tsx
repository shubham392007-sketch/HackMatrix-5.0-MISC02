"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import GlobalHeader from "@/components/layout/GlobalHeader";
import GlobalFooter from "@/components/layout/GlobalFooter";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import {
  ScriptHeading,
  PillButton,
  StatusBadge,
} from "@/components/growthlens";
import { profile as profileApi, integrations } from "@/lib/api";
import {
  User,
  GitPullRequest,
  CheckSquare,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  Trash2,
  ArrowRight,
  Key,
  FolderGit2,
  Building2,
  Mail,
  Briefcase,
  ExternalLink,
  Layers,
  Sparkles,
  Lock,
} from "lucide-react";

export default function EmployeeProfilePage() {
  const { profile, user, refreshProfile } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // GitHub integration state
  const [githubToken, setGithubToken] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubRepoOwner, setGithubRepoOwner] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [githubStatus, setGithubStatus] = useState<"connected" | "not_connected" | "needs_attention">("not_connected");
  const [githubLastValidated, setGithubLastValidated] = useState<string | null>(null);
  const [githubMaskedToken, setGithubMaskedToken] = useState<string | null>(null);
  const [savingGithub, setSavingGithub] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [githubFeedback, setGithubFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Jira integration state
  const [jiraBaseUrl, setJiraBaseUrl] = useState("");
  const [jiraEmail, setJiraEmail] = useState("");
  const [jiraToken, setJiraToken] = useState("");
  const [jiraProjectKey, setJiraProjectKey] = useState("");
  const [showJiraToken, setShowJiraToken] = useState(false);
  const [jiraStatus, setJiraStatus] = useState<"connected" | "not_connected" | "needs_attention">("not_connected");
  const [jiraLastValidated, setJiraLastValidated] = useState<string | null>(null);
  const [jiraMaskedToken, setJiraMaskedToken] = useState<string | null>(null);
  const [savingJira, setSavingJira] = useState(false);
  const [testingJira, setTestingJira] = useState(false);
  const [jiraFeedback, setJiraFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active view tab filter
  const [activeTab, setActiveTab] = useState<"all" | "profile" | "github" | "jira">("all");

  // Populate form from current authenticated user profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      setDepartment(profile.department || "");
    }
  }, [profile]);

  // Load existing integration details
  const loadIntegrations = async () => {
    try {
      const userInts = await profileApi.integrations();

      // GitHub
      if (userInts && userInts.github && userInts.github.is_active) {
        setGithubStatus(userInts.github.connection_status === "connected" ? "connected" : "needs_attention");
        setGithubUsername(userInts.github.external_username || "");
        setGithubRepoOwner(userInts.github.repository_owner || "");
        setGithubRepoName(userInts.github.repository_name || "");
        setGithubMaskedToken(userInts.github.token_masked || null);
        setGithubLastValidated(userInts.github.last_validated_at || null);
      } else {
        try {
          const gh = await integrations.githubStatus();
          if (gh.status === "connected" || gh.configured) {
            setGithubStatus("connected");
            setGithubRepoOwner((gh.details?.repository_owner as string) || "");
            setGithubRepoName((gh.details?.repository_name as string) || "");
            setGithubUsername((gh.details?.username as string) || "");
          }
        } catch {
          // Non-blocking
        }
      }

      // Jira
      if (userInts && userInts.jira && userInts.jira.is_active) {
        setJiraStatus(userInts.jira.connection_status === "connected" ? "connected" : "needs_attention");
        setJiraBaseUrl(userInts.jira.base_url || "");
        setJiraEmail(userInts.jira.external_username || "");
        setJiraProjectKey(userInts.jira.project_key || "");
        setJiraMaskedToken(userInts.jira.token_masked || null);
        setJiraLastValidated(userInts.jira.last_validated_at || null);
      }
    } catch {
      // Non-blocking
    }
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Save personal profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      await profileApi.update({
        full_name: fullName.trim(),
        job_title: jobTitle.trim(),
        department: department.trim(),
      });
      await refreshProfile();
      setProfileMessage({ type: "success", text: "Profile information saved successfully!" });
    } catch (err: any) {
      setProfileMessage({ type: "error", text: err.message || "Failed to update profile." });
    } finally {
      setSavingProfile(false);
    }
  };

  // Test GitHub Connection
  const handleTestGithub = async () => {
    setTestingGithub(true);
    setGithubFeedback(null);
    try {
      if (githubToken) {
        const res = await profileApi.validateGithub({
          token: githubToken.trim(),
          repository_owner: githubRepoOwner.trim() || undefined,
          repository_name: githubRepoName.trim() || undefined,
        });
        if (res.valid) {
          setGithubStatus("connected");
          if (res.username && !githubUsername) setGithubUsername(res.username);
          setGithubFeedback({
            type: "success",
            text: `Connection verified! Authenticated as @${res.username || "user"} (API rate limit: ${res.rate_limit_remaining ?? "OK"}).`,
          });
        } else {
          setGithubStatus("needs_attention");
          setGithubFeedback({ type: "error", text: res.message || "Invalid GitHub token." });
        }
      } else {
        const res = await integrations.testGithub();
        if (res.authenticated) {
          setGithubStatus("connected");
          setGithubFeedback({
            type: "success",
            text: `Connected to GitHub as @${res.username} (API rate limit: ${res.rate_limit_remaining ?? "OK"}).`,
          });
        } else {
          setGithubStatus("needs_attention");
          setGithubFeedback({ type: "error", text: "GitHub credentials not validated or expired." });
        }
      }
    } catch (err: any) {
      setGithubStatus("needs_attention");
      setGithubFeedback({ type: "error", text: err.message || "Connection test failed." });
    } finally {
      setTestingGithub(false);
    }
  };

  // Save GitHub Integration
  const handleSaveGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGithub(true);
    setGithubFeedback(null);
    try {
      const res = await profileApi.updateGithub({
        token: githubToken.trim() || githubMaskedToken || "",
        username: githubUsername.trim() || undefined,
        repository_owner: githubRepoOwner.trim() || undefined,
        repository_name: githubRepoName.trim() || undefined,
      });
      setGithubStatus(res.connection_status === "connected" ? "connected" : "needs_attention");
      setGithubMaskedToken(res.token_masked || null);
      setGithubToken(""); // Clear raw field
      await loadIntegrations();
      setGithubFeedback({ type: "success", text: "GitHub credentials encrypted and saved successfully!" });
    } catch (err: any) {
      setGithubFeedback({ type: "error", text: err.message || "Failed to save GitHub credentials." });
    } finally {
      setSavingGithub(false);
    }
  };

  // Disconnect GitHub
  const handleDisconnectGithub = async () => {
    if (!confirm("Are you sure you want to disconnect GitHub?")) return;
    try {
      await profileApi.disconnect("github");
      setGithubStatus("not_connected");
      setGithubToken("");
      setGithubMaskedToken(null);
      setGithubUsername("");
      setGithubFeedback({ type: "success", text: "GitHub integration disconnected." });
      await loadIntegrations();
    } catch (err: any) {
      setGithubFeedback({ type: "error", text: err.message || "Failed to disconnect." });
    }
  };

  // Test Jira Connection
  const handleTestJira = async () => {
    setTestingJira(true);
    setJiraFeedback(null);
    try {
      if (jiraToken && jiraBaseUrl && jiraEmail) {
        const res = await profileApi.validateJira({
          base_url: jiraBaseUrl.trim(),
          email: jiraEmail.trim(),
          api_token: jiraToken.trim(),
          project_key: jiraProjectKey.trim() || undefined,
        });
        if (res.valid) {
          setJiraStatus("connected");
          setJiraFeedback({
            type: "success",
            text: `Connection verified! Authenticated as ${res.display_name || jiraEmail}.`,
          });
        } else {
          setJiraStatus("needs_attention");
          setJiraFeedback({ type: "error", text: res.message || "Invalid Jira credentials." });
        }
      } else {
        const res = await integrations.testJira();
        if (res.authenticated) {
          setJiraStatus("connected");
          setJiraFeedback({ type: "success", text: "Jira connection validated successfully." });
        } else {
          setJiraStatus("needs_attention");
          setJiraFeedback({ type: "error", text: (res.message as string) || "Jira credentials missing or invalid." });
        }
      }
    } catch (err: any) {
      setJiraStatus("needs_attention");
      setJiraFeedback({ type: "error", text: err.message || "Connection test failed." });
    } finally {
      setTestingJira(false);
    }
  };

  // Save Jira Integration
  const handleSaveJira = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJira(true);
    setJiraFeedback(null);
    try {
      const res = await profileApi.updateJira({
        base_url: jiraBaseUrl.trim(),
        email: jiraEmail.trim(),
        api_token: jiraToken.trim() || jiraMaskedToken || "",
        project_key: jiraProjectKey.trim() || undefined,
      });
      setJiraStatus(res.connection_status === "connected" ? "connected" : "needs_attention");
      setJiraMaskedToken(res.token_masked || null);
      setJiraToken(""); // Clear raw field
      await loadIntegrations();
      setJiraFeedback({ type: "success", text: "Jira credentials encrypted and saved successfully!" });
    } catch (err: any) {
      setJiraFeedback({ type: "error", text: err.message || "Failed to save Jira credentials." });
    } finally {
      setSavingJira(false);
    }
  };

  // Disconnect Jira
  const handleDisconnectJira = async () => {
    if (!confirm("Are you sure you want to disconnect Jira?")) return;
    try {
      await profileApi.disconnect("jira");
      setJiraStatus("not_connected");
      setJiraToken("");
      setJiraMaskedToken(null);
      setJiraFeedback({ type: "success", text: "Jira integration disconnected." });
      await loadIntegrations();
    } catch (err: any) {
      setJiraFeedback({ type: "error", text: err.message || "Failed to disconnect." });
    }
  };

  const showProfile = activeTab === "all" || activeTab === "profile";
  const showGithub = activeTab === "all" || activeTab === "github";
  const showJira = activeTab === "all" || activeTab === "jira";

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1320px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-10">
          {/* ── Page Header ───────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-3 shadow-[2px_2px_0px_#1C1C1C]">
                TALENT IDENTITY & CREDENTIALS
              </span>
              <ScriptHeading
                preText="Manage your"
                scriptWord="identity."
                level={1}
                className="mb-2"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/75 max-w-2xl leading-relaxed">
                Configure your verified employee identity, connect version control and issue tracking sources, and manage cryptographic token encryption at rest.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/employee/evidence"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-xs font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1C1C1C] transition-all"
              >
                <span>Evidence Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── Section Navigation Filter Bar ──────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2">
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[2px_2px_0px_#1C1C1C]">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all ${
                  activeTab === "all"
                    ? "bg-[#1C1C1C] text-white shadow-[1px_1px_0px_#DFE968]"
                    : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                }`}
              >
                All Sections
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === "profile"
                    ? "bg-[#1C1C1C] text-white shadow-[1px_1px_0px_#DFE968]"
                    : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Personal Info</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("github")}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === "github"
                    ? "bg-[#1C1C1C] text-white shadow-[1px_1px_0px_#DFE968]"
                    : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                }`}
              >
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>GitHub</span>
                <span className={`w-2 h-2 rounded-full ${githubStatus === "connected" ? "bg-emerald-500" : "bg-neutral-400"}`} />
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("jira")}
                className={`px-4 py-1.5 rounded-full text-xs font-extrabold tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                  activeTab === "jira"
                    ? "bg-[#1C1C1C] text-white shadow-[1px_1px_0px_#DFE968]"
                    : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Jira Cloud</span>
                <span className={`w-2 h-2 rounded-full ${jiraStatus === "connected" ? "bg-emerald-500" : "bg-neutral-400"}`} />
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1C1C1C]/70">
              <Shield className="w-4 h-4 text-emerald-800" />
              <span>AES-256-GCM Hardware Encrypted</span>
            </div>
          </div>

          {/* ── Main 2-Column Responsive Layout ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ── Left Sticky Sidebar: Identity Card ───────────────── */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              {/* Profile Monogram Card */}
              <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/95 shadow-[3px_3px_0px_#1C1C1C] text-center relative overflow-hidden">
                <div className="w-20 h-20 rounded-full border-2 border-[#1C1C1C] bg-[#DFE968] mx-auto flex items-center justify-center text-3xl font-black shadow-[3px_3px_0px_#1C1C1C] mb-4">
                  {profile?.full_name?.charAt(0).toUpperCase() || "E"}
                </div>

                <h3 className="text-xl font-black text-[#1C1C1C] tracking-tight leading-snug">
                  {profile?.full_name || "Employee User"}
                </h3>

                <div className="flex items-center justify-center gap-2 my-2">
                  <span className="px-3 py-0.5 rounded-full border border-[#1C1C1C] bg-white text-[10px] font-extrabold uppercase tracking-wider">
                    {profile?.role || "EMPLOYEE"}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    Verified
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#1C1C1C]/75 mt-1">
                  {profile?.job_title || "Engineer"}
                </p>
                <p className="text-[11px] font-bold text-[#1C1C1C]/60 uppercase tracking-wider">
                  {profile?.department || "Core Organization"}
                </p>

                <div className="mt-5 pt-4 border-t border-[#1C1C1C]/15 space-y-2.5 text-left text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C1C1C]/60">Auth Account:</span>
                    <span className="font-mono text-[#1C1C1C] font-bold truncate max-w-[170px]" title={user?.email}>
                      {user?.email}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C1C1C]/60">Isolation:</span>
                    <span className="font-mono text-emerald-800 font-extrabold">PostgreSQL RLS</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1C1C1C]/60">Telemetry:</span>
                    <span className="font-mono text-[#1C1C1C] font-bold">Continuous Stream</span>
                  </div>
                </div>
              </div>

              {/* Ingestion Connectors Quick Summary Card */}
              <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] space-y-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block mb-1">
                  CONNECTED ACTIVITY SOURCES
                </span>

                {/* GitHub mini item */}
                <div className="p-3.5 rounded-2xl border border-[#1C1C1C]/20 bg-[#FBF1CF]/70 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center shadow-[1px_1px_0px_#1C1C1C]">
                      <GitPullRequest className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-[#1C1C1C]">GitHub</h4>
                      <p className="text-[10px] font-mono text-[#1C1C1C]/70 truncate max-w-[130px]">
                        {githubRepoOwner && githubRepoName ? `${githubRepoOwner}/${githubRepoName}` : "Not linked"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge type="connection" status={githubStatus} size="sm" />
                </div>

                {/* Jira mini item */}
                <div className="p-3.5 rounded-2xl border border-[#1C1C1C]/20 bg-[#FBF1CF]/70 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl border border-[#1C1C1C] bg-[#F3A878] flex items-center justify-center shadow-[1px_1px_0px_#1C1C1C]">
                      <CheckSquare className="w-4 h-4 text-[#1C1C1C]" />
                    </div>
                    <div>
                      <h4 className="font-black text-xs text-[#1C1C1C]">Jira Cloud</h4>
                      <p className="text-[10px] font-mono text-[#1C1C1C]/70 truncate max-w-[130px]">
                        {jiraProjectKey ? `Project: ${jiraProjectKey}` : "Not linked"}
                      </p>
                    </div>
                  </div>
                  <StatusBadge type="connection" status={jiraStatus} size="sm" />
                </div>

                <div className="pt-2">
                  <Link
                    href="/employee/evidence"
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-[#1C1C1C] bg-white text-xs font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1C1C1C] transition-all"
                  >
                    <span>Inspect Synced Evidence</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* ── Right Content Area: Structured Details & Forms ───── */}
            <div className="lg:col-span-8 space-y-8">
              {/* ── CARD 1: Personal & Role Information ─────────────── */}
              {showProfile && (
                <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
                  <div className="flex items-center justify-between border-b border-[#1C1C1C]/15 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl border border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                        <User className="w-5 h-5 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight">
                          Personal & Professional Profile
                        </h3>
                        <p className="text-xs font-medium text-[#1C1C1C]/70">
                          These details align your competency framework, trajectory metrics, and organizational hierarchy.
                        </p>
                      </div>
                    </div>
                  </div>

                  {profileMessage && (
                    <div
                      className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2.5 ${
                        profileMessage.type === "success"
                          ? "bg-[#DFE968]/60 text-emerald-950"
                          : "bg-[#F6C8D6] text-rose-950"
                      }`}
                    >
                      {profileMessage.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                      )}
                      <span>{profileMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <User className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Full Name *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-semibold text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                          placeholder="e.g. Shubham Sharma"
                        />
                      </div>

                      {/* Work Email */}
                      <div className="space-y-1.5">
                        <label className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                            <span>Work Email</span>
                          </span>
                          <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                            Verified
                          </span>
                        </label>
                        <input
                          type="email"
                          disabled
                          value={user?.email || ""}
                          className="pill-input w-full bg-[#1C1C1C]/5 border-[#1C1C1C]/40 text-[#1C1C1C]/70 font-semibold text-xs md:text-sm px-4 py-2.5 cursor-not-allowed shadow-[1px_1px_0px_#1C1C1C]"
                        />
                        <span className="text-[10px] font-semibold text-[#1C1C1C]/50 ml-3 block">
                          Locked to authenticated identity session
                        </span>
                      </div>

                      {/* Job Title */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <Briefcase className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Job Title / Role *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={jobTitle}
                          onChange={(e) => setJobTitle(e.target.value)}
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-semibold text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                          placeholder="e.g. Senior Backend Engineer"
                        />
                        <span className="text-[10px] font-semibold text-[#1C1C1C]/50 ml-3 block">
                          Determines competency matrix baselines
                        </span>
                      </div>

                      {/* Department */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <Building2 className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Department / Unit *</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-semibold text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                          placeholder="e.g. AI / Machine Learning"
                        />
                        <span className="text-[10px] font-semibold text-[#1C1C1C]/50 ml-3 block">
                          Used for peer benchmarking and team heatmaps
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 flex items-center justify-end">
                      <PillButton
                        variant="primary"
                        size="md"
                        type="submit"
                        loading={savingProfile}
                        icon={<Save className="w-3.5 h-3.5" />}
                      >
                        SAVE PERSONAL DETAILS
                      </PillButton>
                    </div>
                  </form>
                </div>
              )}

              {/* ── CARD 2: GitHub Developer Integration ─────────────── */}
              {showGithub && (
                <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C]/15 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl border border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                        <GitPullRequest className="w-5 h-5 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight">
                            GitHub Source Connector
                          </h3>
                          <StatusBadge type="connection" status={githubStatus} size="sm" />
                        </div>
                        <p className="text-xs font-medium text-[#1C1C1C]/70">
                          Ingest commits, merged PRs, and code review activity from your repositories.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={handleTestGithub}
                        loading={testingGithub}
                        icon={<RefreshCw className={`w-3 h-3 ${testingGithub ? "animate-spin" : ""}`} />}
                      >
                        TEST CONNECTION
                      </PillButton>
                    </div>
                  </div>

                  {githubFeedback && (
                    <div
                      className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2.5 ${
                        githubFeedback.type === "success"
                          ? "bg-[#DFE968]/60 text-emerald-950"
                          : "bg-[#F6C8D6] text-rose-950"
                      }`}
                    >
                      {githubFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                      )}
                      <span>{githubFeedback.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveGithub} className="space-y-6">
                    {/* GitHub Token */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between ml-3">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                          <Key className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Personal Access Token (PAT)</span>
                        </label>
                        {githubMaskedToken && (
                          <span className="text-[10px] font-mono font-bold text-emerald-800 bg-[#DFE968]/70 px-2 py-0.5 rounded-full border border-[#1C1C1C]/20">
                            Configured: {githubMaskedToken}
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <input
                          type={showGithubToken ? "text" : "password"}
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          placeholder={
                            githubMaskedToken
                              ? "Enter new token to replace existing, or leave blank to keep current"
                              : "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          }
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono text-xs md:text-sm px-4 py-2.5 pr-12 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGithubToken(!showGithubToken)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                        >
                          {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      <span className="text-[10px] font-medium text-[#1C1C1C]/60 ml-3 block">
                        Requires <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#1C1C1C]/20 text-[10px]">repo</code> scope for private repositories or standard read access for public repositories.
                      </span>
                    </div>

                    {/* Repository details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <User className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Username</span>
                        </label>
                        <input
                          type="text"
                          value={githubUsername}
                          onChange={(e) => setGithubUsername(e.target.value)}
                          placeholder="e.g. shubham392007-sketch"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <FolderGit2 className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Repository Owner</span>
                        </label>
                        <input
                          type="text"
                          value={githubRepoOwner}
                          onChange={(e) => setGithubRepoOwner(e.target.value)}
                          placeholder="e.g. shubham392007-sketch"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <FolderGit2 className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Repository Name</span>
                        </label>
                        <input
                          type="text"
                          value={githubRepoName}
                          onChange={(e) => setGithubRepoName(e.target.value)}
                          placeholder="e.g. HackMatrix-5.0-MISC02"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>
                    </div>

                    {/* Encryption & Actions */}
                    <div className="p-4 rounded-2xl border border-[#1C1C1C]/15 bg-[#FBF1CF]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-[#1C1C1C]/80 font-medium">
                        <Shield className="w-4 h-4 text-emerald-800 shrink-0" />
                        <span>Tokens are encrypted with AES-256-GCM. Unencrypted secrets are never logged.</span>
                      </div>

                      {githubStatus === "connected" && (
                        <button
                          type="button"
                          onClick={handleDisconnectGithub}
                          className="text-[11px] font-black uppercase text-rose-700 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Disconnect Integration
                        </button>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <PillButton
                        variant="primary"
                        size="md"
                        type="submit"
                        loading={savingGithub}
                        icon={<Save className="w-3.5 h-3.5" />}
                      >
                        SAVE GITHUB CONFIGURATION
                      </PillButton>
                    </div>
                  </form>
                </div>
              )}

              {/* ── CARD 3: Jira Cloud Integration ──────────────────── */}
              {showJira && (
                <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C]/15 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl border border-[#1C1C1C] bg-[#F3A878] flex items-center justify-center shadow-[2px_2px_0px_#1C1C1C]">
                        <CheckSquare className="w-5 h-5 text-[#1C1C1C]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight">
                            Jira Cloud Source Connector
                          </h3>
                          <StatusBadge type="connection" status={jiraStatus} size="sm" />
                        </div>
                        <p className="text-xs font-medium text-[#1C1C1C]/70">
                          Import resolved sprint tickets, deliverables, and engineering stories into the evidence pipeline.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <PillButton
                        variant="secondary"
                        size="sm"
                        onClick={handleTestJira}
                        loading={testingJira}
                        icon={<RefreshCw className={`w-3 h-3 ${testingJira ? "animate-spin" : ""}`} />}
                      >
                        TEST CONNECTION
                      </PillButton>
                    </div>
                  </div>

                  {jiraFeedback && (
                    <div
                      className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2.5 ${
                        jiraFeedback.type === "success"
                          ? "bg-[#DFE968]/60 text-emerald-950"
                          : "bg-[#F6C8D6] text-rose-950"
                      }`}
                    >
                      {jiraFeedback.type === "success" ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-700" />
                      ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-700" />
                      )}
                      <span>{jiraFeedback.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveJira} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Jira Base URL */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <ExternalLink className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Jira Base URL *</span>
                        </label>
                        <input
                          type="url"
                          value={jiraBaseUrl}
                          onChange={(e) => setJiraBaseUrl(e.target.value)}
                          placeholder="https://your-domain.atlassian.net"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>

                      {/* Atlassian Email */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <Mail className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Atlassian Account Email *</span>
                        </label>
                        <input
                          type="email"
                          value={jiraEmail}
                          onChange={(e) => setJiraEmail(e.target.value)}
                          placeholder="engineer@company.com"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-medium text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Jira API Token */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between ml-3">
                          <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C]">
                            <Key className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                            <span>Jira API Token *</span>
                          </label>
                          {jiraMaskedToken && (
                            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-[#DFE968]/70 px-2 py-0.5 rounded-full border border-[#1C1C1C]/20">
                              Configured: {jiraMaskedToken}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <input
                            type={showJiraToken ? "text" : "password"}
                            value={jiraToken}
                            onChange={(e) => setJiraToken(e.target.value)}
                            placeholder={
                              jiraMaskedToken
                                ? "Enter new token to replace existing, or leave blank to keep current"
                                : "ATATT3xFfGF0xxxxxxxxxxxxxxxxxxxx"
                            }
                            className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono text-xs md:text-sm px-4 py-2.5 pr-12 shadow-[2px_2px_0px_#1C1C1C]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowJiraToken(!showJiraToken)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                          >
                            {showJiraToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Project Key */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[#1C1C1C] ml-3">
                          <FolderGit2 className="w-3.5 h-3.5 text-[#1C1C1C]/70" />
                          <span>Target Project Key (Optional)</span>
                        </label>
                        <input
                          type="text"
                          value={jiraProjectKey}
                          onChange={(e) => setJiraProjectKey(e.target.value.toUpperCase())}
                          placeholder="e.g. GROWTH, CORE"
                          className="pill-input w-full bg-[#FBF1CF] border-[#1C1C1C] font-mono font-bold text-xs md:text-sm px-4 py-2.5 shadow-[2px_2px_0px_#1C1C1C]"
                        />
                      </div>
                    </div>

                    {/* Encryption & Actions */}
                    <div className="p-4 rounded-2xl border border-[#1C1C1C]/15 bg-[#FBF1CF]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-[#1C1C1C]/80 font-medium">
                        <Shield className="w-4 h-4 text-emerald-800 shrink-0" />
                        <span>
                          Generate API tokens at{" "}
                          <a
                            href="https://id.atlassian.com/manage-profile/security/api-tokens"
                            target="_blank"
                            rel="noreferrer"
                            className="underline font-bold text-[#1C1C1C] hover:text-black"
                          >
                            id.atlassian.com
                          </a>.
                        </span>
                      </div>

                      {jiraStatus === "connected" && (
                        <button
                          type="button"
                          onClick={handleDisconnectJira}
                          className="text-[11px] font-black uppercase text-rose-700 hover:underline flex items-center gap-1 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Disconnect Integration
                        </button>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <PillButton
                        variant="primary"
                        size="md"
                        type="submit"
                        loading={savingJira}
                        icon={<Save className="w-3.5 h-3.5" />}
                      >
                        SAVE JIRA CONFIGURATION
                      </PillButton>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </main>

        <GlobalFooter />
      </div>
    </ProtectedRoute>
  );
}
