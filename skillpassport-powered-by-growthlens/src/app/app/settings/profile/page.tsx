"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/account";
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
  Info,
} from "lucide-react";

export default function ProfileSettingsPage() {
  const { userProfile, updateUserProfile } = useEvidence();
  const { profile, updateProfile } = useAuth();

  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        displayName: profile.display_name || prev.displayName,
        contactEmail: profile.email || prev.contactEmail,
        currentRole: profile.job_title || profile.current_role || prev.currentRole,
        headline: profile.headline || prev.headline,
        organization: profile.department_or_team || prev.organization,
        summary: profile.professional_summary || prev.summary,
      }));
    } else {
      setFormData(userProfile);
    }
  }, [profile, userProfile]);

  const handleChange = (
    field: keyof UserProfile,
    value: string
  ) => {
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
      errs.displayName = "Display name is required.";
    }
    if (!formData.contactEmail.trim()) {
      errs.contactEmail = "Contact email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      errs.contactEmail = "Please enter a valid email address.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Generate initials from display name
    const initials = formData.displayName
      .split(" ")
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AR";

    updateUserProfile({
      ...formData,
      avatarInitials: initials,
    });

    if (updateProfile) {
      await updateProfile({
        display_name: formData.displayName,
        headline: formData.headline,
        job_title: formData.currentRole,
        department_or_team: formData.organization,
        professional_summary: formData.summary,
      });
    }

    setHasUnsavedChanges(false);
  };

  const handleReset = () => {
    setFormData(userProfile);
    setHasUnsavedChanges(false);
    setErrors({});
    setIsResetModalOpen(false);
  };

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

      <div className="p-6 lg:p-10 max-w-5xl space-y-8">
        {/* Architectural Security Notice */}
        <div className="p-5 rounded-2xl bg-[#DFE968]/20 border-2 border-[#DFE968] flex items-start gap-3.5 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <span className="font-bold text-ink">
              Integrity Boundary: Professional Profile vs. Verified Capabilities
            </span>
            <p className="text-ink/80 leading-relaxed">
              Information entered here represents your self-described professional profile. Editing your headline or summary will never fabricate, modify, or verify skills. In SkillPassport, all verified competencies remain anchored exclusively in authentic repository commits and deliverables.
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
                onClick={handleSubmit}
                className="px-3.5 py-1.5 rounded-lg bg-ink hover:bg-ink/90 text-[#FBF1CF] text-xs font-semibold shadow-sm transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-ink/10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#DFE968] border border-ink/20 flex items-center justify-center font-black text-lg text-ink shadow-sm">
                  {formData.avatarInitials}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">
                    Primary Identity
                  </h2>
                  <p className="text-xs text-ink/60">
                    Last updated: {userProfile.lastUpdated}
                  </p>
                </div>
              </div>

              <div className="text-right hidden sm:block">
                <span className="text-[11px] font-mono text-ink/50 bg-ink/5 px-2 py-1 rounded">
                  ID: {formData.id}
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
                  placeholder="e.g. Alex Rivera"
                />
                {errors.displayName && (
                  <p className="text-[11px] text-rose-600">{errors.displayName}</p>
                )}
              </div>

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
                  placeholder="e.g. Senior Software Engineer"
                />
              </div>

              {/* Professional Headline */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-ink">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={formData.headline}
                  onChange={(e) => handleChange("headline", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. Senior Software Engineer & Data Intelligence Specialist"
                />
                <p className="text-[11px] text-ink/60">
                  Displayed on your Passport Overview and shared recruiter previews when enabled.
                </p>
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-ink/50" />
                  <span>Current Organization / Team</span>
                </label>
                <input
                  type="text"
                  value={formData.organization}
                  onChange={(e) => handleChange("organization", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="e.g. GrowthLens Engineering Lab"
                />
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
                  placeholder="e.g. San Francisco, CA (Hybrid / Remote)"
                />
              </div>

              {/* Professional Summary */}
              <div className="sm:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-ink/50" />
                  <span>Executive Professional Summary</span>
                </label>
                <textarea
                  rows={4}
                  value={formData.summary}
                  onChange={(e) => handleChange("summary", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink leading-relaxed"
                  placeholder="Summarize your engineering journey, architectural strengths, and core domain areas..."
                />
              </div>
            </div>
          </div>

          {/* Contact & Social Links */}
          <div className="p-6 sm:p-8 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-5">
            <div>
              <h2 className="text-base font-bold text-ink">
                Contact & External Handles
              </h2>
              <p className="text-xs text-ink/60">
                You can selectively choose whether to disclose these when creating recruiter share links in Domain 6.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-ink/50" />
                  <span>Contact Email</span>
                  <span className="text-rose-600">*</span>
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
                  placeholder="alex.rivera@example.com"
                />
                {errors.contactEmail && (
                  <p className="text-[11px] text-rose-600">{errors.contactEmail}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ink/50" />
                  <span>LinkedIn Handle</span>
                </label>
                <input
                  type="text"
                  value={formData.contactLinkedIn}
                  onChange={(e) => handleChange("contactLinkedIn", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="linkedin.com/in/alex-rivera-dev"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-ink/50" />
                  <span>Portfolio / Personal Website</span>
                </label>
                <input
                  type="text"
                  value={formData.portfolioUrl || ""}
                  onChange={(e) => handleChange("portfolioUrl", e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-ink/20 text-xs text-ink bg-white font-medium focus:outline-none focus:border-ink"
                  placeholder="https://alexrivera.dev"
                />
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
                disabled={!hasUnsavedChanges}
                onClick={() => setIsResetModalOpen(true)}
                className="px-4 py-2 rounded-xl border border-ink/20 bg-white hover:bg-ink/5 text-ink text-xs font-semibold disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard Changes</span>
              </button>

              <button
                type="submit"
                disabled={!hasUnsavedChanges}
                className="px-5 py-2 rounded-xl bg-ink hover:bg-ink/90 text-[#FBF1CF] text-xs font-bold shadow-sm disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile Changes</span>
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
