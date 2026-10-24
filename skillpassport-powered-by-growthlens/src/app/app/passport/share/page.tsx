"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  Link2,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Lock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  SlidersHorizontal,
  Info,
  Check,
  User,
  GitBranch,
  Briefcase,
  AlertTriangle,
  GraduationCap,
  FolderGit2,
  Award,
  BookOpen,
  Trophy,
  Mail,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import TemplateSelector from "@/components/passport/TemplateSelector";
import { SharePermissionsConfig, PassportTemplateId } from "@/types/sharing";
import { sharingApi } from "@/lib/sharingApi";

export default function SharePassportWizardPage() {
  const router = useRouter();
  const {
    skills,
    evidenceItems,
    targetRoles,
    draftPermissions,
    createShareRecord,
  } = useEvidence();

  const [step, setStep] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [createdShareId, setCreatedShareId] = useState<string | null>(null);

  // Form local state initialized from draftPermissions
  const [label, setLabel] = useState<string>(
    draftPermissions.customLinkLabel || "Recruiter Capability Share"
  );
  const [showDisplayName, setShowDisplayName] = useState<boolean>(
    draftPermissions.identity.showDisplayName
  );
  const [showHeadline, setShowHeadline] = useState<boolean>(
    draftPermissions.identity.showHeadline
  );
  const [showSummary, setShowSummary] = useState<boolean>(
    draftPermissions.identity.showSummary
  );
  const [showContactInfo, setShowContactInfo] = useState<boolean>(
    draftPermissions.identity.showContactInfo
  );

  const [templateId, setTemplateId] = useState<PassportTemplateId>(
    draftPermissions.templateId || "classic"
  );
  const [allowRecruiterMessaging, setAllowRecruiterMessaging] = useState<boolean>(
    draftPermissions.allowRecruiterMessaging ?? true
  );
  const [includedSections, setIncludedSections] = useState<Record<string, boolean>>({
    work_experience: true,
    portfolio_projects: true,
    education: true,
    certifications: true,
    publications: true,
    achievements: true,
    custom_sections: true,
  });

  const toggleSection = (secKey: string) => {
    setIncludedSections((prev) => ({
      ...prev,
      [secKey]: !prev[secKey],
    }));
  };

  const verifiedSkills = skills.filter((s) => s.verificationState === "verified");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    draftPermissions.selectedSkillIds.length > 0
      ? draftPermissions.selectedSkillIds
      : verifiedSkills.map((s) => s.id)
  );

  const [selectedEvidencePerms, setSelectedEvidencePerms] = useState<
    Record<string, { shareSummary: boolean; allowDetail: boolean }>
  >(draftPermissions.selectedEvidencePermissions);

  const [includeRoleAlignment, setIncludeRoleAlignment] = useState<boolean>(
    draftPermissions.includeRoleAlignment
  );
  const [targetRoleId, setTargetRoleId] = useState<string>(
    draftPermissions.targetRoleId || targetRoles[0]?.role_id || "role-data-scientist"
  );
  const [expiryDays, setExpiryDays] = useState<number | null>(
    draftPermissions.expiryDays ?? 14
  );

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const toggleEvidenceSummary = (evId: string) => {
    setSelectedEvidencePerms((prev) => {
      const current = prev[evId] || { shareSummary: false, allowDetail: false };
      return {
        ...prev,
        [evId]: { ...current, shareSummary: !current.shareSummary },
      };
    });
  };

  const toggleEvidenceDetail = (evId: string) => {
    setSelectedEvidencePerms((prev) => {
      const current = prev[evId] || { shareSummary: true, allowDetail: false };
      return {
        ...prev,
        [evId]: { ...current, allowDetail: !current.allowDetail },
      };
    });
  };

  const [creatingLink, setCreatingLink] = useState<boolean>(false);

  const handleCreateLink = async () => {
    setCreatingLink(true);
    const config: SharePermissionsConfig = {
      identity: {
        showDisplayName,
        showHeadline,
        showSummary,
        showContactInfo,
        contactEmail: draftPermissions.identity.contactEmail,
        contactLinkedIn: draftPermissions.identity.contactLinkedIn,
      },
      shareVerifiedSkillsOnly: true, // Non-negotiable
      selectedSkillIds: selectedSkills,
      selectedCustomSkillIds: draftPermissions.selectedCustomSkillIds || [],
      evidenceAccessLevel: "detail_inspection",
      selectedEvidencePermissions: selectedEvidencePerms,
      includeRoleAlignment,
      targetRoleId,
      expiryDays,
      customLinkLabel: label,
      templateId,
      allowRecruiterMessaging,
      sections: includedSections,
    };

    try {
      const serverRecord = await sharingApi.createLink({
        label: label || "Selective Recruiter Share",
        template_id: templateId,
        permissions: config,
        expiry_days: expiryDays,
      });
      const effectiveShareId = serverRecord.shareId || (serverRecord as any).id;
      createShareRecord(label, { ...config, customLinkLabel: label });
      setCreatedShareId(effectiveShareId);
      setStep(4);
    } catch (err) {
      console.warn("Backend share creation failed, falling back to local record:", err);
      const newShare = createShareRecord(label, config);
      setCreatedShareId(newShare.shareId);
      setStep(4);
    } finally {
      setCreatingLink(false);
    }
  };

  const shareUrl = typeof window !== "undefined" && createdShareId
    ? `${window.location.origin}/p/${createdShareId}`
    : `/p/${createdShareId || ""}`;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Create Shareable Passport"
        description="Configure what recruiters can see, set optional expiration, and generate a selective access link."
        badge="Domain 6 · Sharing Wizard"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <Link
          href="/app/passport/sharing"
          className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 shrink-0"
        >
          Cancel
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {/* Stepper Progress Bar */}
        <div className="gl-card p-4 sm:p-6">
          <div className="flex items-center justify-between text-xs">
            {[
              { num: 1, title: "Contents" },
              { num: 2, title: "Access & Expiry" },
              { num: 3, title: "Review" },
              { num: 4, title: "Link Created" },
            ].map((s) => (
              <div
                key={s.num}
                className={`flex items-center gap-2 ${
                  step === s.num
                    ? "font-extrabold text-ink"
                    : step > s.num
                    ? "text-emerald-700 font-semibold"
                    : "text-ink/40 font-medium"
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step === s.num
                      ? "bg-ink text-paper"
                      : step > s.num
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-paper border border-ink/20"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

      {/* STEP 1: Choose Contents */}
      {step === 1 && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="border-b border-ink/10 pb-4">
            <h2 className="text-lg font-extrabold text-ink">
              Step 1: Choose Share Contents
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Select which candidate profile attributes and verified competencies to disclose.
            </p>
          </div>

          {/* Identity Disclosure */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Identity & Contact Disclosures
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between cursor-pointer text-xs">
                <div>
                  <span className="font-bold text-ink block">Display Name</span>
                  <span className="text-[11px] text-ink/60">"Alex Rivera"</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDisplayName}
                  onChange={(e) => setShowDisplayName(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
              </label>

              <label className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between cursor-pointer text-xs">
                <div>
                  <span className="font-bold text-ink block">Professional Headline</span>
                  <span className="text-[11px] text-ink/60">Senior Software Engineer...</span>
                </div>
                <input
                  type="checkbox"
                  checked={showHeadline}
                  onChange={(e) => setShowHeadline(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
              </label>

              <label className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between cursor-pointer text-xs">
                <div>
                  <span className="font-bold text-ink block">Professional Summary</span>
                  <span className="text-[11px] text-ink/60">Overview biography</span>
                </div>
                <input
                  type="checkbox"
                  checked={showSummary}
                  onChange={(e) => setShowSummary(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
              </label>

              <label className="p-3 bg-paper rounded-xl border border-ink/10 flex items-center justify-between cursor-pointer text-xs">
                <div>
                  <span className="font-bold text-ink block">Contact Information</span>
                  <span className="text-[11px] text-ink/60">Email & LinkedIn (Opt-in)</span>
                </div>
                <input
                  type="checkbox"
                  checked={showContactInfo}
                  onChange={(e) => setShowContactInfo(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
              </label>
            </div>
          </div>

          {/* Master Passport Sections Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-peach" />
                  Select Master Sections to Include
                </h3>
                <p className="text-[11px] text-ink/70">
                  Choose which candidate-authored sections to disclose on this share link.
                </p>
              </div>
              <Link
                href="/app/passport/builder"
                className="text-[11px] font-bold text-ink hover:underline flex items-center gap-1"
              >
                Edit in Content Builder &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {[
                { id: "work_experience", label: "Work Experience", icon: Briefcase },
                { id: "portfolio_projects", label: "Portfolio & Projects", icon: FolderGit2 },
                { id: "education", label: "Education & Academics", icon: GraduationCap },
                { id: "certifications", label: "Certifications", icon: Award },
                { id: "publications", label: "Publications & Writing", icon: BookOpen },
                { id: "achievements", label: "Honors & Achievements", icon: Trophy },
                { id: "custom_sections", label: "Custom Sections", icon: Sparkles },
              ].map((sec) => {
                const isEnabled = includedSections[sec.id] !== false;
                const Icon = sec.icon;
                return (
                  <label
                    key={sec.id}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isEnabled
                        ? "bg-peach/15 border-ink shadow-sm"
                        : "bg-paper border-ink/10 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-ink/70 shrink-0" />
                      <span className="font-bold text-ink">{sec.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleSection(sec.id)}
                      className="w-4 h-4 accent-ink"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Verified Skills Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60">
                Verified Skills Selection
              </h3>
              <span className="text-[11px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                Strictly Verified Only
              </span>
            </div>

            <div className="space-y-2">
              {verifiedSkills.map((s) => {
                const isSelected = selectedSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-peach/20 border-ink shadow-sm"
                        : "bg-paper border-ink/10 opacity-70"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-ink flex items-center gap-2">
                        <span>{s.canonicalName}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-ink/5 font-semibold">
                          {s.verifiedProficiency}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink/60 mt-0.5 line-clamp-1">
                        {s.definition}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 accent-ink"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Details Permission */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Evidence Disclosure & Inspection
            </h3>
            <p className="text-xs text-ink/70">
              Control whether recruiters can inspect full repository details or only read high-level summaries.
            </p>

            <div className="space-y-2">
              {evidenceItems.slice(0, 3).map((ev) => {
                const perm = selectedEvidencePerms[ev.id] || { shareSummary: true, allowDetail: false };
                return (
                  <div
                    key={ev.id}
                    className="p-3.5 rounded-xl bg-paper border border-ink/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-ink">{ev.title}</div>
                      <div className="text-[11px] text-ink/60">{ev.evidenceType} · {ev.project}</div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={perm.shareSummary}
                          onChange={() => toggleEvidenceSummary(ev.id)}
                          className="accent-ink"
                        />
                        <span>Share Summary</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          disabled={!perm.shareSummary}
                          checked={perm.allowDetail}
                          onChange={() => toggleEvidenceDetail(ev.id)}
                          className="accent-ink disabled:opacity-40"
                        />
                        <span>Allow Detail Inspection</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={selectedSkills.length === 0}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              Continue to Step 2 (Access & Expiry) →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Configure Access & Expiry */}
      {step === 2 && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="border-b border-ink/10 pb-4">
            <h2 className="text-lg font-extrabold text-ink">
              Step 2: Configure Access & Expiry
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Set link label, expiration date, and optional role-alignment comparison.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-ink block mb-1">
                Link Description / Recruiter Target Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Anthropic Research Screening"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-ink/20 bg-paper text-ink font-medium focus:outline-none focus:border-ink"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-ink block mb-1.5">
                Link Expiration Scope
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { days: 7, label: "7 Days" },
                  { days: 14, label: "14 Days (Standard)" },
                  { days: 30, label: "30 Days" },
                  { days: null, label: "Never (Manual Revoke)" },
                ].map((opt) => (
                  <button
                    key={String(opt.days)}
                    type="button"
                    onClick={() => setExpiryDays(opt.days)}
                    className={`p-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      expiryDays === opt.days
                        ? "bg-ink text-paper border-ink"
                        : "bg-paper text-ink/70 border-ink/10 hover:bg-card"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-paper border border-ink/10 space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-ink block">
                    Include Domain 4 Role Alignment
                  </span>
                  <span className="text-[11px] text-ink/60">
                    Show how candidate verified skills match against a target job role.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeRoleAlignment}
                  onChange={(e) => setIncludeRoleAlignment(e.target.checked)}
                  className="w-4 h-4 accent-ink"
                />
              </div>

              {includeRoleAlignment && (
                <div className="pt-2 border-t border-ink/10">
                  <label className="text-xs font-bold text-ink block mb-1">
                    Select Target Role
                  </label>
                  <select
                    value={targetRoleId}
                    onChange={(e) => setTargetRoleId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-ink/20 bg-paper text-ink font-medium focus:outline-none"
                  >
                    {targetRoles.map((r) => (
                      <option key={r.role_id} value={r.role_id}>
                        {r.title} ({r.context})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
            >
              ← Back to Step 1
            </button>
            <button
              onClick={() => setStep(3)}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
            >
              Review Summary (Step 3) →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review Final Settings */}
      {step === 3 && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="border-b border-ink/10 pb-4">
            <h2 className="text-lg font-extrabold text-ink">
              Step 3: Review Final Sharing Settings
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Confirm your disclosure choices before generating the recruiter link.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                Link Metadata
              </span>
              <div className="font-bold text-ink text-sm">{label}</div>
              <div className="text-ink/60">
                Expiry: {expiryDays ? `${expiryDays} days from generation` : "No automatic expiration (Manual revoke)"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Included in Share
                </span>
                <ul className="space-y-1 text-ink/80 list-disc list-inside">
                  <li>Template Archetype: <strong className="uppercase">{templateId}</strong></li>
                  <li>Sections Disclosed: <strong>{Object.values(includedSections).filter(Boolean).length} of 7</strong></li>
                  <li>Display Name ({showDisplayName ? "Yes" : "Hidden"})</li>
                  <li>Professional Headline ({showHeadline ? "Yes" : "Hidden"})</li>
                  <li>Summary ({showSummary ? "Yes" : "Hidden"})</li>
                  <li>Contact Info ({showContactInfo ? "Disclosed" : "Protected / Hidden"})</li>
                  <li>{selectedSkills.length} Verified Skills</li>
                  <li>Role Alignment ({includeRoleAlignment ? "Included" : "Omitted"})</li>
                </ul>
              </div>

              <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-800">
                  Strictly Excluded & Protected
                </span>
                <ul className="space-y-1 text-ink/80 list-disc list-inside">
                  <li>Unverified / Candidate competencies</li>
                  <li>Internal AI confidence & prompt traces</li>
                  <li>Learning diagnostic responses & quiz logs</li>
                  <li>Private supervisor / reviewer flags</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1"
            >
              ← Back to Step 2
            </button>
            <button
              onClick={handleCreateLink}
              disabled={creatingLink}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-60"
            >
              {creatingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {creatingLink ? "Generating Secure Link..." : "Generate Public Recruiter Link"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Link Created Confirmation */}
      {step === 4 && createdShareId && (
        <div className="gl-card p-6 md:p-8 space-y-6 border-2 border-emerald-400 bg-emerald-50/20 animate-fadeIn">
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-ink">
              Recruiter Link Generated Successfully!
            </h2>
            <p className="text-xs text-ink/70 leading-relaxed">
              Your selective passport projection is now accessible via this demo link. You can revoke access at any time in Shared Access Management.
            </p>
          </div>

          {/* URL Box */}
          <div className="p-4 bg-paper rounded-2xl border-2 border-ink shadow-sm space-y-2 max-w-2xl mx-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-ink/50 flex items-center justify-between">
              <span>Recruiter Passport Demo URL</span>
              <span className="text-emerald-700 font-bold">Active & Ready</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs font-mono p-2.5 rounded-xl bg-ink/5 border border-ink/10 text-ink select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-ink/10 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/p/${createdShareId}`}
              target="_blank"
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Recruiter Experience in New Tab
            </Link>

            <Link
              href="/app/passport/access"
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              View in Shared Access Management
            </Link>

            <Link
              href="/app/passport/sharing"
              className="pill-btn pill-btn-ghost text-xs"
            >
              Done & Return to Overview
            </Link>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
