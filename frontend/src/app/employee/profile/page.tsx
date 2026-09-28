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
  ExternalLink,
  Save,
  RefreshCw,
  Trash2,
  ArrowRight,
  Sparkles,
  Key,
  FolderGit2,
  Building2,
  Mail,
  Briefcase,
} from "lucide-react";

export default function EmployeeProfilePage() {
  const { profile, user, refreshProfile } = useAuth();

  // Profile fields state
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
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

  // Active tab inside settings
  const [activeTab, setActiveTab] = useState<"profile" | "github" | "jira">("profile");

  // Populate form from current authenticated user profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setJobTitle(profile.job_title || "");
      setDepartment(profile.department || "");
      setAvatarUrl(profile.avatar_url || "");
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
        // Fallback to server status
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
        avatar_url: avatarUrl.trim() || undefined,
      });
      await refreshProfile();
      setProfileMessage({ type: "success", text: "Profile details updated successfully." });
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
            text: `Connection verified! Authenticated as @${res.username || "user"} (Rate limit: ${res.rate_limit_remaining ?? "OK"}).`,
          });
        } else {
          setGithubStatus("needs_attention");
          setGithubFeedback({ type: "error", text: res.message || "Invalid credentials." });
        }
      } else {
        const res = await integrations.testGithub();
        if (res.authenticated) {
          setGithubStatus("connected");
          setGithubFeedback({
            type: "success",
            text: `Connected to GitHub as @${res.username} (Rate limit: ${res.rate_limit_remaining ?? "OK"}).`,
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
      setGithubToken(""); // Clear cleartext field
      await loadIntegrations();
      setGithubFeedback({ type: "success", text: "GitHub integration saved and verified successfully!" });
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
      setGithubFeedback({ type: "success", text: "GitHub integration removed." });
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
          setJiraFeedback({ type: "success", text: "Jira connection validated." });
        } else {
          setJiraStatus("needs_attention");
          setJiraFeedback({ type: "error", text: (res.message as string) || "Jira credentials invalid or missing." });
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
      setJiraToken(""); // Clear cleartext field
      await loadIntegrations();
      setJiraFeedback({ type: "success", text: "Jira integration saved and verified successfully!" });
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
      setJiraFeedback({ type: "success", text: "Jira integration removed." });
      await loadIntegrations();
    } catch (err: any) {
      setJiraFeedback({ type: "error", text: err.message || "Failed to disconnect." });
    }
  };

  return (
    <ProtectedRoute allowedRoles={["EMPLOYEE", "MANAGER", "ADMIN"]}>
      <div className="min-h-screen flex flex-col text-[#1C1C1C]">
        <GlobalHeader />

        <main className="flex-1 max-w-[1200px] mx-auto px-5 md:px-10 py-10 md:py-14 w-full space-y-10">
          {/* ── Page Header ───────────────────────────────────────── */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b-[1.5px] border-[#1C1C1C]/15">
            <div>
              <span className="inline-block px-3 py-1 rounded-full border border-[#1C1C1C] bg-[#DFE968] text-[10px] font-extrabold tracking-[0.12em] uppercase mb-3 shadow-[2px_2px_0px_#1C1C1C]">
                ACCOUNT & CREDENTIALS
              </span>
              <ScriptHeading
                preText="Manage your"
                scriptWord="identity."
                level={1}
                className="mb-2"
              />
              <p className="text-sm font-medium text-[#1C1C1C]/75 max-w-xl">
                Configure your employee profile and secure integrations with GitHub and Jira Cloud to power your continuous talent intelligence.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/employee/evidence"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#1C1C1C] bg-[#FBF6DF] text-xs font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1C1C1C] transition-all"
              >
                <span>View Evidence Explorer</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ── User Quick Summary Card ───────────────────────────── */}
          <div className="p-6 md:p-8 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[4px_4px_0px_#1C1C1C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full border-2 border-[#1C1C1C] bg-[#DFE968] flex items-center justify-center text-2xl font-black shadow-[3px_3px_0px_#1C1C1C]">
                {profile?.full_name?.charAt(0).toUpperCase() || "E"}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight">
                    {profile?.full_name || "Employee"}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full border border-[#1C1C1C] bg-white text-[10px] font-extrabold uppercase tracking-wider">
                    {profile?.role || "EMPLOYEE"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#1C1C1C]/70">
                  {profile?.job_title || "Engineer"} • {profile?.department || "Core Team"} • {user?.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/60 block leading-none mb-1">
                  CONNECTED APIS
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full border border-[#1C1C1C] text-[9px] font-black uppercase ${githubStatus === 'connected' ? 'bg-[#DFE968]' : 'bg-neutral-200'}`}>
                    GitHub: {githubStatus === 'connected' ? 'Active' : 'Off'}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border border-[#1C1C1C] text-[9px] font-black uppercase ${jiraStatus === 'connected' ? 'bg-[#F3A878]' : 'bg-neutral-200'}`}>
                    Jira: {jiraStatus === 'connected' ? 'Active' : 'Off'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Settings Tabs ─────────────────────────────────────── */}
          <div className="flex items-center gap-2 border-b border-[#1C1C1C]/20 pb-1">
            <button
              onClick={() => setActiveTab("profile")}
              className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === "profile"
                  ? "bg-[#1C1C1C] text-white shadow-[2px_2px_0px_#DFE968]"
                  : "bg-transparent text-[#1C1C1C]/70 hover:text-[#1C1C1C] hover:bg-[#1C1C1C]/5"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Details</span>
            </button>

            <button
              onClick={() => setActiveTab("github")}
              className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === "github"
                  ? "bg-[#1C1C1C] text-white shadow-[2px_2px_0px_#DFE968]"
                  : "bg-transparent text-[#1C1C1C]/70 hover:text-[#1C1C1C] hover:bg-[#1C1C1C]/5"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5" />
              <span>GitHub Integration</span>
              {githubStatus === "connected" && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("jira")}
              className={`px-5 py-2.5 rounded-full text-xs font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                activeTab === "jira"
                  ? "bg-[#1C1C1C] text-white shadow-[2px_2px_0px_#DFE968]"
                  : "bg-transparent text-[#1C1C1C]/70 hover:text-[#1C1C1C] hover:bg-[#1C1C1C]/5"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Jira Integration</span>
              {jiraStatus === "connected" && (
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>

          {/* ── Tab 1: Personal Details Form ───────────────────────── */}
          {activeTab === "profile" && (
            <div className="p-6 md:p-8 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] space-y-6">
              <div>
                <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight mb-1">
                  Employee Identity & Work Information
                </h3>
                <p className="text-xs font-medium text-[#1C1C1C]/70">
                  These details establish your official profile for talent trajectories, competency evaluations, and managerial reviews.
                </p>
              </div>

              {profileMessage && (
                <div
                  className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2 ${
                    profileMessage.type === "success" ? "bg-[#DFE968]/50 text-emerald-950" : "bg-[#F6C8D6] text-rose-950"
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

              <form onSubmit={handleSaveProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pill-input w-full pl-10 text-xs font-medium"
                        placeholder="e.g. Shubham Sharma"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Work Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="email"
                        disabled
                        value={user?.email || ""}
                        className="pill-input w-full pl-10 text-xs font-medium bg-[#1C1C1C]/5 text-[#1C1C1C]/60 cursor-not-allowed"
                      />
                    </div>
                    <span className="text-[10px] font-semibold text-[#1C1C1C]/50 mt-1 block">
                      Synced with Supabase Auth provider
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Job Title *
                    </label>
                    <div className="relative">
                      <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        required
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        className="pill-input w-full pl-10 text-xs font-medium"
                        placeholder="e.g. Senior Software Engineer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Department / Organization Unit *
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        required
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="pill-input w-full pl-10 text-xs font-medium"
                        placeholder="e.g. Core Engineering"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end">
                  <PillButton
                    variant="primary"
                    size="md"
                    type="submit"
                    loading={savingProfile}
                    icon={<Save className="w-3.5 h-3.5" />}
                  >
                    SAVE PROFILE DETAILS
                  </PillButton>
                </div>
              </form>
            </div>
          )}

          {/* ── Tab 2: GitHub Integration Form ─────────────────────── */}
          {activeTab === "github" && (
            <div className="p-6 md:p-8 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight">
                      GitHub Source Connector
                    </h3>
                    <StatusBadge type="connection" status={githubStatus} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/70">
                    Connect your GitHub account to extract traceable commits, merged pull requests, and code review activity.
                  </p>
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
                  className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2 ${
                    githubFeedback.type === "success" ? "bg-[#DFE968]/50 text-emerald-950" : "bg-[#F6C8D6] text-rose-950"
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

              <form onSubmit={handleSaveGithub} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                    GitHub Personal Access Token (PAT) {githubMaskedToken && <span className="text-emerald-700 font-bold">(Configured: {githubMaskedToken})</span>}
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                    <input
                      type={showGithubToken ? "text" : "password"}
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder={githubMaskedToken ? "Enter new token to replace existing, or leave blank to keep" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                      className="pill-input w-full pl-10 pr-10 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
                    >
                      {showGithubToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] font-medium text-[#1C1C1C]/60 mt-1 block">
                    Requires <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#1C1C1C]/20">repo</code> scope for private repositories or public repo access.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      GitHub Username
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="e.g. shubham392007-sketch"
                        className="pill-input w-full pl-10 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Repository Owner / Org
                    </label>
                    <div className="relative">
                      <FolderGit2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        value={githubRepoOwner}
                        onChange={(e) => setGithubRepoOwner(e.target.value)}
                        placeholder="e.g. shubham392007-sketch"
                        className="pill-input w-full pl-10 text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Repository Name
                    </label>
                    <div className="relative">
                      <FolderGit2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type="text"
                        value={githubRepoName}
                        onChange={(e) => setGithubRepoName(e.target.value)}
                        placeholder="e.g. HackMatrix-5.0-MISC02"
                        className="pill-input w-full pl-10 text-xs font-medium"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#1C1C1C]/15 bg-[#FBF1CF]/60 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-800" />
                    <span className="font-semibold text-[#1C1C1C]/80">
                      Credentials are encrypted at rest with AES-256-GCM.
                    </span>
                  </div>
                  {githubStatus === "connected" && (
                    <button
                      type="button"
                      onClick={handleDisconnectGithub}
                      className="text-[11px] font-extrabold uppercase text-rose-700 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
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

          {/* ── Tab 3: Jira Integration Form ───────────────────────── */}
          {activeTab === "jira" && (
            <div className="p-6 md:p-8 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/90 shadow-[3px_3px_0px_#1C1C1C] space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-black text-[#1C1C1C] tracking-tight">
                      Jira Cloud Source Connector
                    </h3>
                    <StatusBadge type="connection" status={jiraStatus} size="sm" />
                  </div>
                  <p className="text-xs font-medium text-[#1C1C1C]/70">
                    Connect Jira Cloud to import resolved sprint tickets, deliverables, and engineering tasks into the evidence pipeline.
                  </p>
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
                  className={`p-4 rounded-2xl border border-[#1C1C1C] text-xs font-bold flex items-center gap-2 ${
                    jiraFeedback.type === "success" ? "bg-[#DFE968]/50 text-emerald-950" : "bg-[#F6C8D6] text-rose-950"
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

              <form onSubmit={handleSaveJira} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Jira Base URL *
                    </label>
                    <input
                      type="url"
                      value={jiraBaseUrl}
                      onChange={(e) => setJiraBaseUrl(e.target.value)}
                      placeholder="https://your-domain.atlassian.net"
                      className="pill-input w-full text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Atlassian Account Email *
                    </label>
                    <input
                      type="email"
                      value={jiraEmail}
                      onChange={(e) => setJiraEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      className="pill-input w-full text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Jira API Token * {jiraMaskedToken && <span className="text-emerald-700 font-bold">(Configured: {jiraMaskedToken})</span>}
                    </label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1C1C1C]/50" />
                      <input
                        type={showJiraToken ? "text" : "password"}
                        value={jiraToken}
                        onChange={(e) => setJiraToken(e.target.value)}
                        placeholder={jiraMaskedToken ? "Enter new token to replace existing, or leave blank to keep" : "ATATT3xFfGF0..."}
                        className="pill-input w-full pl-10 pr-10 text-xs font-mono"
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

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] mb-1.5">
                      Target Project Key (Optional)
                    </label>
                    <input
                      type="text"
                      value={jiraProjectKey}
                      onChange={(e) => setJiraProjectKey(e.target.value)}
                      placeholder="e.g. GROWTH, CORE"
                      className="pill-input w-full text-xs font-medium uppercase font-mono"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-2xl border border-[#1C1C1C]/15 bg-[#FBF1CF]/60 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-800" />
                    <span className="font-semibold text-[#1C1C1C]/80">
                      Generate API tokens at <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noreferrer" className="underline font-bold">id.atlassian.com</a>.
                    </span>
                  </div>
                  {jiraStatus === "connected" && (
                    <button
                      type="button"
                      onClick={handleDisconnectJira}
                      className="text-[11px] font-extrabold uppercase text-rose-700 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Disconnect
                    </button>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
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

          {/* ── Security & Architecture Callout ───────────────────── */}
          <div className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#DFE968]/30 shadow-[3px_3px_0px_#1C1C1C] flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-2xl border border-[#1C1C1C] bg-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#1C1C1C]">
                <Shield className="w-5 h-5 text-[#1C1C1C]" />
              </div>
              <div>
                <h4 className="font-black text-sm text-[#1C1C1C] uppercase tracking-wide">
                  Enterprise Security & Privacy Architecture
                </h4>
                <p className="text-xs font-medium text-[#1C1C1C]/75 leading-relaxed max-w-2xl mt-0.5">
                  Tokens are never stored in plaintext and never leaked to LLM prompts. Ingestion pipelines execute under strict row-level security isolation (PostgreSQL RLS), scoping evidence strictly to your authenticated employee profile.
                </p>
              </div>
            </div>

            <Link
              href="/employee/evidence"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#1C1C1C] bg-white text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] shadow-[2px_2px_0px_#1C1C1C] hover:bg-[#1C1C1C] hover:text-white transition-all shrink-0"
            >
              <span>Sync Pipeline</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </main>

        <GlobalFooter />
      </div>
    </ProtectedRoute>
  );
}
