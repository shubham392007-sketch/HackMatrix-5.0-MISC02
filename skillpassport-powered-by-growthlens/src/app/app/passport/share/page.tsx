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
import { SharePermissionsConfig, PassportTemplateId, UserMasterPassport } from "@/types/sharing";
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
  const [masterPassport, setMasterPassport] = useState<UserMasterPassport | null>(null);

  React.useEffect(() => {
    async function loadMaster() {
      try {
        const m = await sharingApi.getMasterPassport();
        if (m) {
          setMasterPassport(m);
          if (m.templateId) {
            setTemplateId(m.templateId as PassportTemplateId);
          }
        }
      } catch (err) {
        console.warn("Could not load master passport in share wizard:", err);
      }
    }
    loadMaster();
  }, []);

  const getSectionCount = (secId: string) => {
    if (!masterPassport) return null;
    switch (secId) {
      case "work_experience": return masterPassport.workExperiences?.length ?? 0;
      case "portfolio_projects": return masterPassport.portfolioProjects?.length ?? 0;
      case "education": return masterPassport.educationEntries?.length ?? 0;
      case "certifications": return masterPassport.certifications?.length ?? 0;
      case "publications": return masterPassport.publications?.length ?? 0;
      case "achievements": return masterPassport.achievements?.length ?? 0;
      case "custom_sections": return masterPassport.customSections?.length ?? 0;
      default: return null;
    }
  };

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

  // Template archetype
  const [templateId, setTemplateId] = useState<PassportTemplateId>(
    draftPermissions.templateId || "verified-competency"
  );

  // Master sections disclosure toggles
  const [includedSections, setIncludedSections] = useState<Record<string, boolean>>(
    draftPermissions.sections || {
      work_experience: true,
      portfolio_projects: true,
      education: true,
      certifications: true,
      publications: true,
      achievements: true,
      custom_sections: true,
    }
  );

  const toggleSection = (secId: string) => {
    setIncludedSections((prev) => ({
      ...prev,
      [secId]: !prev[secId],
    }));
  };

  // Only verified skills
  const verifiedSkills = skills.filter((s) => s.verificationState === "verified");
  const [selectedSkills, setSelectedSkills] = useState<string[]>(
    draftPermissions.selectedSkillIds.length > 0
      ? draftPermissions.selectedSkillIds
      : verifiedSkills.map((s) => s.id)
  );

  // Expiry days
  const [expiryDays, setExpiryDays] = useState<number | null>(
    draftPermissions.expiryDays !== undefined ? draftPermissions.expiryDays : 14
  );

  // Include Role Alignment
  const [includeRoleAlignment, setIncludeRoleAlignment] = useState<boolean>(
    draftPermissions.includeRoleAlignment
  );
  const [targetRoleId, setTargetRoleId] = useState<string>(
    draftPermissions.targetRoleId || targetRoles[0]?.role_id || "role-ai-platform-eng"
  );

  // Recruiter Messaging
  const [allowRecruiterMessaging, setAllowRecruiterMessaging] = useState<boolean>(
    draftPermissions.allowRecruiterMessaging ?? true
  );

  // Granular Evidence Permissions
  const [selectedEvidencePerms, setSelectedEvidencePerms] = useState<
    Record<string, { shareSummary: boolean; allowDetail: boolean }>
  >(
    draftPermissions.selectedEvidencePermissions || {
      "ev-repo-01": { shareSummary: true, allowDetail: true },
      "ev-pr-42": { shareSummary: true, allowDetail: false },
      "ev-jira-88": { shareSummary: true, allowDetail: false },
    }
  );

  const toggleSkill = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
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
      shareVerifiedSkillsOnly: true,
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
      ...(masterPassport ? { masterPassport } : {}),
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
    <div className="flex-1 flex flex-col bg-[#F5F2EB]">
      <AppTopBar
        title="Create Shareable Passport"
        description="Configure what recruiters can see, set optional expiration, and generate a selective access link."
        badge="Domain 6 · Sharing Wizard"
        badgeColor="border-[#1A1918]/20 text-[#1A1918] bg-white font-bold"
      >
        <Link
          href="/app/passport/sharing"
          className="pill-btn pill-btn-ghost text-xs py-1.5 px-3 shrink-0 bg-white border border-[#1A1918]/20 text-[#1A1918] font-bold"
        >
          Cancel
        </Link>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto pb-16">
        {/* High-Visibility Stepper Progress Bar */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918]">
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
                    ? "font-extrabold text-[#1A1918]"
                    : step > s.num
                    ? "text-[#4A7A4E] font-bold"
                    : "text-[#1A1918]/60 font-semibold"
                }`}
              >
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === s.num
                      ? "bg-[#1A1918] text-[#FAF8F5] shadow-sm"
                      : step > s.num
                      ? "bg-[#4A7A4E] text-white"
                      : "bg-[#FAF8F5] border-2 border-[#1A1918]/30 text-[#1A1918]"
                  }`}
                >
                  {step > s.num ? "✓" : s.num}
                </span>
                <span className="hidden sm:inline font-bold tracking-tight">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

      {/* STEP 1: Choose Contents */}
      {step === 1 && (
        <div className="p-6 md:p-8 space-y-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918]">
          <div className="border-b border-[#1A1918]/15 pb-4">
            <h2 className="text-xl font-extrabold text-[#1A1918]">
              Step 1: Choose Share Contents
            </h2>
            <p className="text-xs text-[#1A1918]/80 mt-1">
              Select which candidate profile attributes and verified competencies to disclose to recruiters.
            </p>
          </div>

          {/* Identity Disclosure */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1918]/70">
              Identity & Contact Disclosures
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#1A1918]/20 flex items-center justify-between cursor-pointer text-xs hover:border-[#1A1918] transition-all">
                <div>
                  <span className="font-bold text-[#1A1918] block">Display Name</span>
                  <span className="text-[11px] text-[#1A1918]/70 font-medium">"Alex Rivera"</span>
                </div>
                <input
                  type="checkbox"
                  checked={showDisplayName}
                  onChange={(e) => setShowDisplayName(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1918]"
                />
              </label>

              <label className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#1A1918]/20 flex items-center justify-between cursor-pointer text-xs hover:border-[#1A1918] transition-all">
                <div>
                  <span className="font-bold text-[#1A1918] block">Professional Headline</span>
                  <span className="text-[11px] text-[#1A1918]/70 font-medium">Senior Software Engineer...</span>
                </div>
                <input
                  type="checkbox"
                  checked={showHeadline}
                  onChange={(e) => setShowHeadline(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1918]"
                />
              </label>

              <label className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#1A1918]/20 flex items-center justify-between cursor-pointer text-xs hover:border-[#1A1918] transition-all">
                <div>
                  <span className="font-bold text-[#1A1918] block">Professional Summary</span>
                  <span className="text-[11px] text-[#1A1918]/70 font-medium">Overview biography</span>
                </div>
                <input
                  type="checkbox"
                  checked={showSummary}
                  onChange={(e) => setShowSummary(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1918]"
                />
              </label>

              <label className="p-3.5 bg-[#FAF8F5] rounded-xl border border-[#1A1918]/20 flex items-center justify-between cursor-pointer text-xs hover:border-[#1A1918] transition-all">
                <div>
                  <span className="font-bold text-[#1A1918] block">Contact Information</span>
                  <span className="text-[11px] text-[#1A1918]/70 font-medium">Email & LinkedIn (Opt-in)</span>
                </div>
                <input
                  type="checkbox"
                  checked={showContactInfo}
                  onChange={(e) => setShowContactInfo(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1918]"
                />
              </label>
            </div>
          </div>

          {/* Master Passport Sections Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1918]/70 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#1A1918]" />
                  Select Master Sections to Include
                </h3>
                <p className="text-[11px] text-[#1A1918]/80">
                  Choose which candidate-authored sections to disclose on this share link.
                </p>
              </div>
              <Link
                href="/app/passport/builder"
                className="text-[11px] font-bold text-[#1A1918] hover:underline flex items-center gap-1"
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
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isEnabled
                        ? "bg-[#FAF8F5] border-2 border-[#1A1918] shadow-[2px_2px_0px_#1A1918]"
                        : "bg-white border border-[#1A1918]/20 hover:border-[#1A1918]/60"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-[#1A1918] shrink-0" />
                      <div>
                        <span className="font-bold text-[#1A1918] block">{sec.label}</span>
                        {getSectionCount(sec.id) !== null && (
                          <span className="text-[10px] font-mono font-medium text-[#1A1918]/70">
                            {getSectionCount(sec.id)} {getSectionCount(sec.id) === 1 ? "entry" : "entries"} available
                          </span>
                        )}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => toggleSection(sec.id)}
                      className="w-4 h-4 accent-[#1A1918]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Verified Skills Selection */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1918]/70">
                Verified Skills Selection
              </h3>
              <span className="text-[11px] text-[#4A7A4E] bg-[#4A7A4E]/15 border border-[#4A7A4E]/30 font-bold px-2.5 py-0.5 rounded-full">
                Strictly Verified Only
              </span>
            </div>

            <div className="space-y-2.5">
              {verifiedSkills.map((s) => {
                const isSelected = selectedSkills.includes(s.id);
                return (
                  <div
                    key={s.id}
                    onClick={() => toggleSkill(s.id)}
                    className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[#FAF8F5] border-2 border-[#1A1918] shadow-[2px_2px_0px_#1A1918]"
                        : "bg-white border border-[#1A1918]/20 hover:border-[#1A1918]/60"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-[#1A1918] flex items-center gap-2">
                        <span>{s.canonicalName}</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-[#1A1918]/20 bg-[#FAF8F5] text-[#1A1918]">
                          {s.verifiedProficiency}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#1A1918]/80 mt-1 line-clamp-1">
                        {s.definition}
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="w-4 h-4 accent-[#1A1918]"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Details Permission */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#1A1918]/70">
              Evidence Disclosure & Inspection
            </h3>
            <p className="text-xs text-[#1A1918]/80">
              Control whether recruiters can inspect full repository details or only read high-level summaries.
            </p>

            <div className="space-y-2.5">
              {evidenceItems.slice(0, 3).map((ev) => {
                const perm = selectedEvidencePerms[ev.id] || { shareSummary: true, allowDetail: false };
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl bg-white border border-[#1A1918]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[#1A1918]">{ev.title}</div>
                      <div className="text-[11px] font-mono text-[#1A1918]/70 mt-0.5">{ev.evidenceType} &bull; {ev.project}</div>
                    </div>

                    <div className="flex items-center gap-4 text-[#1A1918]">
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                        <input
                          type="checkbox"
                          checked={perm.shareSummary}
                          onChange={() => toggleEvidenceSummary(ev.id)}
                          className="w-3.5 h-3.5 accent-[#1A1918]"
                        />
                        <span>Share Summary</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold">
                        <input
                          type="checkbox"
                          disabled={!perm.shareSummary}
                          checked={perm.allowDetail}
                          onChange={() => toggleEvidenceDetail(ev.id)}
                          className="w-3.5 h-3.5 accent-[#1A1918] disabled:opacity-40"
                        />
                        <span>Allow Detail Inspection</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#1A1918]/15 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={selectedSkills.length === 0}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 disabled:opacity-40 font-bold bg-[#1A1918] text-[#FAF8F5] px-4 py-2.5 rounded-full shadow-sm"
            >
              Continue to Step 2 (Access & Expiry) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Configure Access & Expiry */}
      {step === 2 && (
        <div className="p-6 md:p-8 space-y-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918]">
          <div className="border-b border-[#1A1918]/15 pb-4">
            <h2 className="text-xl font-extrabold text-[#1A1918]">
              Step 2: Configure Access & Expiry
            </h2>
            <p className="text-xs text-[#1A1918]/80 mt-1">
              Set link label, expiration date, and optional role-alignment comparison.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#1A1918] block mb-1">
                Link Description / Recruiter Target Label
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Anthropic Research Screening"
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-[#1A1918]/30 bg-white text-[#1A1918] font-medium focus:outline-none focus:border-[#1A1918]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#1A1918] block mb-1.5">
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
                    className={`p-3.5 rounded-xl border text-xs font-bold transition-all text-center ${
                      expiryDays === opt.days
                        ? "bg-[#1A1918] text-[#FAF8F5] border-2 border-[#1A1918] shadow-[2px_2px_0px_#1A1918]"
                        : "bg-white text-[#1A1918] border border-[#1A1918]/20 hover:border-[#1A1918]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/20 space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#1A1918] block">
                    Include Domain 4 Role Alignment
                  </span>
                  <span className="text-[11px] text-[#1A1918]/70 font-medium">
                    Show how candidate verified skills match against a target job role.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={includeRoleAlignment}
                  onChange={(e) => setIncludeRoleAlignment(e.target.checked)}
                  className="w-4 h-4 accent-[#1A1918]"
                />
              </div>

              {includeRoleAlignment && (
                <div className="pt-2 border-t border-[#1A1918]/15">
                  <label className="text-xs font-bold text-[#1A1918] block mb-1">
                    Select Target Role
                  </label>
                  <select
                    value={targetRoleId}
                    onChange={(e) => setTargetRoleId(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-[#1A1918]/30 bg-white text-[#1A1918] font-medium focus:outline-none"
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

          <div className="pt-4 border-t border-[#1A1918]/15 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1 font-bold bg-white border border-[#1A1918]/20 text-[#1A1918] px-4 py-2 rounded-full"
            >
              &larr; Back to Step 1
            </button>
            <button
              onClick={() => setStep(3)}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 font-bold bg-[#1A1918] text-[#FAF8F5] px-4 py-2.5 rounded-full shadow-sm"
            >
              Review Summary (Step 3) &rarr;
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review Final Settings */}
      {step === 3 && (
        <div className="p-6 md:p-8 space-y-6 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918]">
          <div className="border-b border-[#1A1918]/15 pb-4">
            <h2 className="text-xl font-extrabold text-[#1A1918]">
              Step 3: Review Final Sharing Settings
            </h2>
            <p className="text-xs text-[#1A1918]/80 mt-1">
              Confirm your disclosure choices before generating the recruiter link.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#1A1918]/20 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/60">
                Link Metadata
              </span>
              <div className="font-bold text-[#1A1918] text-sm">{label}</div>
              <div className="text-[#1A1918]/80 font-medium">
                Expiry: {expiryDays ? `${expiryDays} days from generation` : "No automatic expiration (Manual revoke)"}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#1A1918]/20 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#4A7A4E]">
                  Included in Share
                </span>
                <ul className="space-y-1 text-[#1A1918] list-disc list-inside font-medium">
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

              <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#1A1918]/20 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#C25450]">
                  Strictly Excluded & Protected
                </span>
                <ul className="space-y-1 text-[#1A1918] list-disc list-inside font-medium">
                  <li>Unverified / Candidate competencies</li>
                  <li>Internal AI confidence & prompt traces</li>
                  <li>Learning diagnostic responses & quiz logs</li>
                  <li>Private supervisor / reviewer flags</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#1A1918]/15 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1 font-bold bg-white border border-[#1A1918]/20 text-[#1A1918] px-4 py-2 rounded-full"
            >
              &larr; Back to Step 2
            </button>
            <button
              onClick={handleCreateLink}
              disabled={creatingLink}
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 bg-[#4A7A4E] hover:bg-[#39633D] text-white disabled:opacity-60 font-bold px-5 py-2.5 rounded-full shadow-sm"
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
        <div className="p-6 md:p-8 space-y-6 rounded-2xl bg-white border-2 border-[#4A7A4E] shadow-[3px_3px_0_0_#4A7A4E] animate-fadeIn">
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-[#4A7A4E]/15 text-[#4A7A4E] border border-[#4A7A4E]/30 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-[#1A1918]">
              Recruiter Link Generated Successfully!
            </h2>
            <p className="text-xs text-[#1A1918]/80 leading-relaxed font-medium">
              Your selective passport projection is now accessible via this demo link. You can revoke access at any time in Shared Access Management.
            </p>
          </div>

          {/* URL Box */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border-2 border-[#1A1918] shadow-sm space-y-2 max-w-2xl mx-auto">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/70 flex items-center justify-between">
              <span>Recruiter Passport Demo URL</span>
              <span className="text-[#4A7A4E] font-bold">Active & Ready</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full text-xs font-mono p-2.5 rounded-xl bg-white border border-[#1A1918]/20 text-[#1A1918] select-all focus:outline-none font-semibold"
              />
              <button
                onClick={handleCopyLink}
                className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 shrink-0 bg-[#1A1918] text-[#FAF8F5] font-bold px-4 py-2.5 rounded-full"
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
          <div className="pt-4 border-t border-[#1A1918]/15 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/p/${createdShareId}`}
              target="_blank"
              className="pill-btn pill-btn-primary text-xs flex items-center gap-1.5 font-bold bg-[#1A1918] text-[#FAF8F5] px-4 py-2 rounded-full shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Recruiter Experience in New Tab
            </Link>

            <Link
              href="/app/passport/access"
              className="pill-btn pill-btn-ghost text-xs flex items-center gap-1.5 font-bold bg-white border border-[#1A1918]/20 text-[#1A1918] px-4 py-2 rounded-full"
            >
              <Lock className="w-3.5 h-3.5" />
              View in Shared Access Management
            </Link>

            <Link
              href="/app/passport/sharing"
              className="pill-btn pill-btn-ghost text-xs font-bold bg-white border border-[#1A1918]/20 text-[#1A1918] px-4 py-2 rounded-full"
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
