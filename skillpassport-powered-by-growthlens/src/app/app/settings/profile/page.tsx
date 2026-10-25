"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import { ConfirmationModal } from "@/components/app/AppStates";
import {
  User,
  ShieldCheck,
  Building,
  MapPin,
  Mail,
  Globe,
  FileText,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Briefcase,
  GraduationCap,
  Sparkles,
  ExternalLink,
} from "lucide-react";

interface ProfileFormData {
  displayName: string;
  preferredName: string;
  headline: string;
  currentRole: string;
  organization: string;
  location: string;
  workPreference: string;
  experienceLevel: string;
  careerStage: string;
  summary: string;
  contactEmail: string;
  contactLinkedIn: string;
  portfolioUrl: string;
  githubUrl: string;
}

export default function ProfileSettingsPage() {
  const { userProfile, updateUserProfile, addToast } = useEvidence();
  const { user: authUser, profile: authProfile, updateProfile } = useAuth();

  const [formData, setFormData] = useState<ProfileFormData>({
    displayName: "",
    preferredName: "",
    headline: "",
    currentRole: "",
    organization: "",
    location: "",
    workPreference: "Remote",
    experienceLevel: "Mid-Level Practitioner (3-5 yrs)",
    careerStage: "Autonomous Technical Contributor",
    summary: "",
    contactEmail: "",
    contactLinkedIn: "",
    portfolioUrl: "",
    githubUrl: "",
  });

  const [snapshot, setSnapshot] = useState<ProfileFormData | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Synchronize initial state from authenticated server profile
  useEffect(() => {
    const email = authProfile?.email || authUser?.email || userProfile.contactEmail || "";
    const name =
      authProfile?.display_name ||
      authUser?.user_metadata?.full_name ||
      authUser?.user_metadata?.name ||
      userProfile.displayName ||
      (email ? email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Technical Contributor");

    const initial: ProfileFormData = {
      displayName: name,
      preferredName: authProfile?.preferred_name || userProfile.preferredName || "",
      headline: authProfile?.headline || userProfile.headline || "",
      currentRole: authProfile?.job_title || authProfile?.current_role || userProfile.currentRole || "",
      organization: authProfile?.department_or_team || userProfile.organization || "",
      location: authProfile?.location || userProfile.location || "",
      workPreference: authProfile?.work_preference || userProfile.workPreference || "Remote",
      experienceLevel: authProfile?.experience_level || userProfile.experienceLevel || "Mid-Level Practitioner (3-5 yrs)",
      careerStage: (authProfile as any)?.career_stage || userProfile.careerStage || "Autonomous Technical Contributor",
      summary: authProfile?.professional_summary || userProfile.summary || "",
      contactEmail: email,
      contactLinkedIn: authProfile?.linkedin_url || userProfile.contactLinkedIn || "",
      portfolioUrl: authProfile?.portfolio_url || userProfile.portfolioUrl || "",
      githubUrl: authProfile?.github_url || userProfile.githubUrl || "",
    };

    setFormData(initial);
    setSnapshot(initial);
    setHasUnsavedChanges(false);
  }, [authProfile, authUser, userProfile]);

  const handleChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errs: { [key: string]: string } = {};

    if (!formData.displayName.trim()) {
      errs.displayName = "Full display name is required.";
    }

    if (formData.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail.trim())) {
      errs.contactEmail = "Please enter a valid contact email address.";
    }

    const validateUrl = (url: string, fieldName: string, label: string) => {
      if (!url.trim()) return;
      try {
        const parsed = url.startsWith("http://") || url.startsWith("https://")
          ? new URL(url)
          : new URL(`https://${url}`);
        if (!parsed.hostname || !parsed.hostname.includes(".")) {
          errs[fieldName] = `Please enter a valid ${label} URL.`;
        }
      } catch {
        errs[fieldName] = `Please enter a valid ${label} URL.`;
      }
    };

    validateUrl(formData.portfolioUrl, "portfolioUrl", "Portfolio");
    validateUrl(formData.contactLinkedIn, "contactLinkedIn", "LinkedIn");
    validateUrl(formData.githubUrl, "githubUrl", "GitHub");

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSaving) return;

    setIsSaving(true);
    try {
      // Calculate dynamic initials from real display name
      const nameParts = formData.displayName.trim().split(/\s+/);
      const initials = nameParts.length >= 2
        ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
        : formData.displayName.trim().slice(0, 2).toUpperCase() || "SP";

      // 1. Update local Evidence context
      updateUserProfile({
        ...userProfile,
        displayName: formData.displayName.trim(),
        preferredName: formData.preferredName.trim() || undefined,
        headline: formData.headline.trim(),
        currentRole: formData.currentRole.trim(),
        organization: formData.organization.trim(),
        location: formData.location.trim(),
        workPreference: formData.workPreference,
        experienceLevel: formData.experienceLevel,
        careerStage: formData.careerStage,
        summary: formData.summary.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactLinkedIn: formData.contactLinkedIn.trim(),
        portfolioUrl: formData.portfolioUrl.trim(),
        githubUrl: formData.githubUrl.trim(),
        avatarInitials: initials,
        lastUpdated: "Just now",
      });

      // 2. Persist to authoritative backend endpoint
      if (updateProfile) {
        const result = await updateProfile({
          display_name: formData.displayName.trim(),
          preferred_name: formData.preferredName.trim() || null,
          headline: formData.headline.trim() || null,
          job_title: formData.currentRole.trim() || null,
          department_or_team: formData.organization.trim() || null,
          location: formData.location.trim() || null,
          work_preference: formData.workPreference || null,
          experience_level: formData.experienceLevel || null,
          professional_summary: formData.summary.trim() || null,
          portfolio_url: formData.portfolioUrl.trim() || null,
          linkedin_url: formData.contactLinkedIn.trim() || null,
          github_url: formData.githubUrl.trim() || null,
        });

        if (result.error) {
          throw result.error;
        }
      }

      setSnapshot(formData);
      setHasUnsavedChanges(false);
      addToast("Profile Saved", "Your professional profile has been saved to your account.", "success");
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      addToast("Save Failed", err.message || "Failed to persist profile changes. Please try again.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (snapshot) {
      setFormData(snapshot);
    }
    setHasUnsavedChanges(false);
    setErrors({});
    setIsResetModalOpen(false);
  };

  // Dynamic initials calculation for avatar preview
  const currentInitials = (() => {
    const parts = (formData.displayName || "User").trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (formData.displayName || "US").slice(0, 2).toUpperCase();
  })();

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Profile Identity"
        description="Manage your professional information, contact details, and public headline across SkillPassport."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Profile" },
        ]}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-5xl w-full mx-auto pb-16">
        {/* Architectural Security Notice */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/20 border-2 border-[#DFE968] flex items-start gap-3.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-ink">
              Integrity Boundary: Professional Profile vs. Verified Capabilities
            </span>
            <p className="text-ink/80 leading-relaxed">
              Information entered here represents your self-described professional profile. Editing your headline or summary will never fabricate, modify, or verify skills. In SkillPassport, all verified competencies remain anchored exclusively in authentic repository commits, deliverable evaluations, and human governance decisions.
            </p>
          </div>
        </div>

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have unsaved changes to your professional profile.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-ink/20 bg-white hover:bg-ink/5 text-xs font-semibold text-ink transition-all"
              >
                Discard
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSubmit}
                className="px-3.5 py-1.5 rounded-lg bg-ink hover:bg-ink/90 text-[#FBF1CF] text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Primary Identity */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DFE968] border border-ink/20 flex items-center justify-center font-black text-lg text-ink shadow-sm">
                  {currentInitials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Primary Identity
                  </h2>
                  <p className="text-xs text-ink/60">
                    User Account: {authUser?.email || "Authenticated User"}
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-mono text-ink/50 bg-ink/5 px-2 py-1 rounded">
                  ID: {authProfile?.id ? `${authProfile.id.slice(0, 8)}...` : authUser?.id ? `${authUser.id.slice(0, 8)}...` : "User"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Display Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1">
                  <span>Full Display Name</span>
                  <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleChange("displayName", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-ink bg-white font-medium focus:outline-none ${
                    errors.displayName
                      ? "border-rose-400 focus:ring-1 focus:ring-rose-400"
                      : "border-ink/20 focus:border-ink"
                  }`}
                  placeholder="e.g. Jane Doe"
                />
                {errors.displayName && (
                  <p className="text-[11px] text-rose-600">{errors.displayName}</p>
                )}
              </div>

              {/* Preferred Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1">
                  <span>Preferred / Given Name</span>
                  <span className="text-ink/40 text-[10px]">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.preferredName}
                  onChange={(e) => handleChange("preferredName", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. JD"
                />
              </div>

              {/* Authenticated Account Email (Read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-ink/40" />
                  <span>Authenticated Account Email</span>
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-ink/15 bg-ink/5 text-xs text-ink/70 font-mono flex items-center justify-between">
                  <span>{authUser?.email || "user@skillpassport.io"}</span>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded">Verified Auth</span>
                </div>
                <p className="text-[11px] text-ink/50">
                  Authoritative account login. Email changes require security re-verification.
                </p>
              </div>

              {/* Contact Email (Editable) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-ink/50" />
                  <span>Public / Contact Email</span>
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-ink bg-white font-medium focus:outline-none ${
                    errors.contactEmail
                      ? "border-rose-400 focus:ring-1 focus:ring-rose-400"
                      : "border-ink/20 focus:border-ink"
                  }`}
                  placeholder="e.g. contact@domain.com"
                />
                {errors.contactEmail && (
                  <p className="text-[11px] text-rose-600">{errors.contactEmail}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Professional Identity & Experience */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-6">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-ink/70" />
                <span>Professional Identity & Career Context</span>
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                Define your current engineering title, area of focus, career stage, and working preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Current Title / Role
                </label>
                <input
                  type="text"
                  value={formData.currentRole}
                  onChange={(e) => handleChange("currentRole", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. Full-Stack Engineer / Systems Researcher"
                />
                <p className="text-[11px] text-ink/50">
                  Students can use "Computer Science Student" or "Undergraduate Researcher".
                </p>
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-ink/50" />
                  <span>Current Organization / University / Lab</span>
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => handleChange("organization", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. Engineering Lab / Independent"
                />
              </div>

              {/* Professional Headline */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span>Professional Headline</span>
                  <span className="text-[11px] text-ink/50 font-normal">
                    {formData.headline.length}/140
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={140}
                  value={formData.headline}
                  onChange={(e) => handleChange("headline", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. Distributed Systems & Rust Developer | High-Throughput Stream Processing"
                />
                <p className="text-[11px] text-ink/60">
                  Displayed on your Passport Overview and recruiter previews when sharing is enabled. For students, focus on primary technical interests rather than unearned seniority.
                </p>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-ink/50" />
                  <span>Location</span>
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. San Francisco, CA / London / Remote"
                />
              </div>

              {/* Work Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Work Arrangement Preference
                </label>
                <select
                  value={formData.workPreference}
                  onChange={(e) => handleChange("workPreference", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                >
                  <option value="Remote">Remote Only</option>
                  <option value="Hybrid">Hybrid (Flexible)</option>
                  <option value="Onsite">Onsite</option>
                  <option value="Open to Any">Open to Any Arrangement</option>
                </select>
              </div>

              {/* Experience Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Experience Tier / Level
                </label>
                <select
                  value={formData.experienceLevel}
                  onChange={(e) => handleChange("experienceLevel", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                >
                  <option value="Student / Pre-Career">Student / Pre-Career</option>
                  <option value="Early Career (0-2 yrs)">Early Career (0-2 yrs)</option>
                  <option value="Mid-Level Practitioner (3-5 yrs)">Mid-Level Practitioner (3-5 yrs)</option>
                  <option value="Senior Specialist (5-8 yrs)">Senior Specialist (5-8 yrs)</option>
                  <option value="Staff / Lead / Architect (8+ yrs)">Staff / Lead / Architect (8+ yrs)</option>
                </select>
              </div>

              {/* Career Stage */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Career Trajectory Stage
                </label>
                <select
                  value={formData.careerStage}
                  onChange={(e) => handleChange("careerStage", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                >
                  <option value="Student / New Graduate">Student / New Graduate</option>
                  <option value="Career Transition / Re-skilling">Career Transition / Re-skilling</option>
                  <option value="Autonomous Technical Contributor">Autonomous Technical Contributor</option>
                  <option value="Senior Engineering Leadership">Senior Engineering Leadership</option>
                </select>
              </div>

              {/* Professional Summary */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-ink/50" />
                    <span>Executive Professional Summary</span>
                  </span>
                  <span className="text-[11px] text-ink/50 font-normal">
                    {formData.summary.length}/1000 characters
                  </span>
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={formData.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink leading-relaxed"
                  placeholder="Summarize your engineering journey, architectural strengths, and core domain areas. (e.g. 'Software engineer specializing in distributed backend systems with Go and PostgreSQL. Passionate about concurrent event streaming, containerized pipelines, and observability.')"
                />
                <p className="text-[11px] text-ink/50">
                  Writing guidance: Focus on technical strengths, architectural paradigms, and real problem-solving autonomy. This self-description remains distinct from empirical skill verification.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Contact & Professional Handles */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink flex items-center gap-2">
                <Globe className="w-4 h-4 text-ink/70" />
                <span>Professional Handles & Public Links</span>
              </h2>
              <p className="text-xs text-ink/60 mt-0.5">
                External portfolios and profiles. You selectively choose whether to disclose these when creating recruiter share links in Domain 6.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* LinkedIn */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ink/50" />
                  <span>LinkedIn Profile URL</span>
                </label>
                <input
                  type="text"
                  value={formData.contactLinkedIn}
                  onChange={(e) => handleChange("contactLinkedIn", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-ink bg-white font-medium focus:outline-none ${
                    errors.contactLinkedIn
                      ? "border-rose-400 focus:ring-1 focus:ring-rose-400"
                      : "border-ink/20 focus:border-ink"
                  }`}
                  placeholder="https://linkedin.com/in/username"
                />
                {errors.contactLinkedIn && (
                  <p className="text-[11px] text-rose-600">{errors.contactLinkedIn}</p>
                )}
              </div>

              {/* GitHub */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ink/50" />
                  <span>GitHub Profile URL</span>
                </label>
                <input
                  type="text"
                  value={formData.githubUrl}
                  onChange={(e) => handleChange("githubUrl", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-ink bg-white font-medium focus:outline-none ${
                    errors.githubUrl
                      ? "border-rose-400 focus:ring-1 focus:ring-rose-400"
                      : "border-ink/20 focus:border-ink"
                  }`}
                  placeholder="https://github.com/username"
                />
                {errors.githubUrl && (
                  <p className="text-[11px] text-rose-600">{errors.githubUrl}</p>
                )}
              </div>

              {/* Portfolio */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ink/50" />
                  <span>Portfolio / Personal Website</span>
                </label>
                <input
                  type="text"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleChange("portfolioUrl", e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-ink bg-white font-medium focus:outline-none ${
                    errors.portfolioUrl
                      ? "border-rose-400 focus:ring-1 focus:ring-rose-400"
                      : "border-ink/20 focus:border-ink"
                  }`}
                  placeholder="https://myportfolio.dev"
                />
                {errors.portfolioUrl && (
                  <p className="text-[11px] text-rose-600">{errors.portfolioUrl}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="flex items-center justify-between pt-2">
            <Link
              href="/app/passport"
              className="text-xs font-semibold text-ink/70 hover:text-ink underline"
            >
              ← Return to Passport Overview
            </Link>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!hasUnsavedChanges || isSaving}
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-ink/20 bg-white hover:bg-ink/5 text-ink text-xs font-semibold disabled:opacity-40 transition-all flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>

              <button
                type="submit"
                disabled={!hasUnsavedChanges || isSaving}
                className="px-5 py-2 rounded-xl bg-ink hover:bg-ink/90 text-[#FBF1CF] text-xs font-bold shadow-sm disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Saving..." : "Save Profile Changes"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Discarding Changes */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Discard Unsaved Changes?"
        message="Are you sure you want to revert your edits? Any unconfirmed changes will be reset to your last saved profile state."
        confirmLabel="Yes, Discard Changes"
        cancelLabel="Keep Editing"
        isDestructive={false}
        onConfirm={handleReset}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </div>
  );
}
