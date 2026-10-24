"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { DEFAULT_SHARE_PERMISSIONS } from "@/lib/sharingCalculations";
import {
  SlidersHorizontal,
  ShieldCheck,
  Eye,
  RotateCcw,
  Save,
  Sparkles,
  CheckCircle,
  Lock,
  ShieldAlert,
  AlertTriangle,
  Info,
  Check,
  User,
  GitBranch,
  Briefcase,
  FileCode,
  FileText,
  GraduationCap,
  FolderGit2,
  Award,
  BookOpen,
  Trophy,
} from "lucide-react";
import AppTopBar from "@/components/app/AppTopBar";
import { SharePermissionsConfig } from "@/types/sharing";

export default function SharingPermissionsPage() {
  const router = useRouter();
  const {
    draftPermissions,
    setDraftPermissions,
    skills,
    evidenceItems,
    targetRoles,
  } = useEvidence();

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [localConfig, setLocalConfig] = useState<SharePermissionsConfig>({
    ...draftPermissions,
  });

  const verifiedSkills = skills.filter((s) => s.verificationState === "verified");

  const handleToggleSkill = (skillId: string) => {
    setLocalConfig((prev) => {
      const isSelected = prev.selectedSkillIds.includes(skillId);
      return {
        ...prev,
        selectedSkillIds: isSelected
          ? prev.selectedSkillIds.filter((id) => id !== skillId)
          : [...prev.selectedSkillIds, skillId],
      };
    });
  };

  const handleToggleEvidenceSummary = (evId: string) => {
    setLocalConfig((prev) => {
      const current = prev.selectedEvidencePermissions[evId] || {
        shareSummary: false,
        allowDetail: false,
      };
      return {
        ...prev,
        selectedEvidencePermissions: {
          ...prev.selectedEvidencePermissions,
          [evId]: { ...current, shareSummary: !current.shareSummary },
        },
      };
    });
  };

  const handleToggleEvidenceDetail = (evId: string) => {
    setLocalConfig((prev) => {
      const current = prev.selectedEvidencePermissions[evId] || {
        shareSummary: true,
        allowDetail: false,
      };
      return {
        ...prev,
        selectedEvidencePermissions: {
          ...prev.selectedEvidencePermissions,
          [evId]: { ...current, allowDetail: !current.allowDetail },
        },
      };
    });
  };

  const sectionsConfig = localConfig.sections || {
    work_experience: true,
    portfolio_projects: true,
    education: true,
    certifications: true,
    publications: true,
    achievements: true,
    custom_sections: true,
  };

  const handleToggleSection = (secKey: string) => {
    setLocalConfig((prev) => {
      const currentMap = prev.sections || sectionsConfig;
      return {
        ...prev,
        sections: {
          ...currentMap,
          [secKey]: currentMap[secKey] === false ? true : false,
        },
      };
    });
  };

  const handleSave = () => {
    setDraftPermissions(localConfig);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleReset = () => {
    if (confirm("Reset sharing permissions to secure default configuration?")) {
      setLocalConfig({ ...DEFAULT_SHARE_PERMISSIONS });
      setDraftPermissions({ ...DEFAULT_SHARE_PERMISSIONS });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Sharing Permissions"
        description="Calibrate baseline data disclosure rules and visibility policies for external links."
        badge="Domain 6 · Permissions"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleReset}
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-2.5 flex items-center gap-1 shrink-0"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <Link
            href="/app/passport/builder"
            className="pill-btn pill-btn-ghost text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Content Builder</span>
          </Link>
          <button
            onClick={handleSave}
            className="pill-btn pill-btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1 shrink-0"
          >
            <Save className="w-3 h-3" />
            <span>{savedSuccess ? "Saved!" : "Save"}</span>
          </button>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-16">
        {savedSuccess && (
          <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle className="w-4 h-4 text-emerald-700" />
            Settings saved successfully. All future preview projections will reflect these rules.
          </div>
        )}

      {/* Permission Groups */}
      <div className="space-y-6">
        {/* Group A: Candidate Identity */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="border-b border-ink/10 pb-3">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <User className="w-4 h-4 text-peach" />
              Group A: Candidate Identity Permissions
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Control whether public recruiters see personal identifiers or an anonymous technical profile.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <label className="p-4 bg-paper rounded-2xl border border-ink/10 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-ink block">Display Name</span>
                <span className="text-[11px] text-ink/60">Disclose candidate full name</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.identity.showDisplayName}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    identity: {
                      ...localConfig.identity,
                      showDisplayName: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-ink"
              />
            </label>

            <label className="p-4 bg-paper rounded-2xl border border-ink/10 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-ink block">Professional Headline</span>
                <span className="text-[11px] text-ink/60">Display technical title</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.identity.showHeadline}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    identity: {
                      ...localConfig.identity,
                      showHeadline: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-ink"
              />
            </label>

            <label className="p-4 bg-paper rounded-2xl border border-ink/10 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-ink block">Professional Biography Summary</span>
                <span className="text-[11px] text-ink/60">Disclose multi-paragraph overview</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.identity.showSummary}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    identity: {
                      ...localConfig.identity,
                      showSummary: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-ink"
              />
            </label>

            <label className="p-4 bg-paper rounded-2xl border border-ink/10 flex items-center justify-between cursor-pointer">
              <div>
                <span className="font-bold text-ink block">Professional Contact Details</span>
                <span className="text-[11px] text-ink/60">Disclose email and LinkedIn (Opt-in)</span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.identity.showContactInfo}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    identity: {
                      ...localConfig.identity,
                      showContactInfo: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-ink"
              />
            </label>
          </div>
        </div>

        {/* Group B: Verified Capability Selection */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Group B: Verified Capabilities Disclosure
              </h2>
              <p className="text-xs text-ink/70 mt-0.5">
                Only skills verified against authentic artifacts are eligible. Candidate skills are permanently locked out of sharing.
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              {verifiedSkills.length} Verified in Passport
            </span>
          </div>

          <div className="space-y-2">
            {verifiedSkills.map((s) => {
              const isSelected = localConfig.selectedSkillIds.includes(s.id);
              return (
                <div
                  key={s.id}
                  onClick={() => handleToggleSkill(s.id)}
                  className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isSelected
                      ? "bg-peach/15 border-ink shadow-sm"
                      : "bg-paper border-ink/10 opacity-70"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-ink">
                      <span>{s.canonicalName}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-ink/5 font-semibold">
                        {s.verifiedProficiency}
                      </span>
                    </div>
                    <p className="text-xs text-ink/70">{s.definition}</p>
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

        {/* Group C: Per-Evidence Permissions Matrix */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="border-b border-ink/10 pb-3">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-peach" />
              Group C: Per-Evidence Access Matrix
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Granting visibility to a skill does NOT automatically expose underlying documents. Select summary versus detail permissions independently.
            </p>
          </div>

          <div className="space-y-3">
            {evidenceItems.slice(0, 4).map((ev) => {
              const perm = localConfig.selectedEvidencePermissions[ev.id] || {
                shareSummary: true,
                allowDetail: false,
              };

              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl bg-paper border border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{ev.title}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ink/5 text-ink/70">
                        {ev.sourceType}
                      </span>
                    </div>
                    <p className="text-ink/60 text-[11px] line-clamp-1">
                      {ev.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                      <input
                        type="checkbox"
                        checked={perm.shareSummary}
                        onChange={() => handleToggleEvidenceSummary(ev.id)}
                        className="w-4 h-4 accent-ink"
                      />
                      <span>Share Summary Card</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer font-medium text-xs">
                      <input
                        type="checkbox"
                        disabled={!perm.shareSummary}
                        checked={perm.allowDetail}
                        onChange={() => handleToggleEvidenceDetail(ev.id)}
                        className="w-4 h-4 accent-ink disabled:opacity-30"
                      />
                      <span>Allow Detail Inspection</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group D: Master Passport Sections Disclosure */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="flex items-center justify-between border-b border-ink/10 pb-3">
            <div>
              <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-peach" />
                Group D: Master Passport Sections Disclosure
              </h2>
              <p className="text-xs text-ink/70 mt-0.5">
                Decide which candidate-authored sections are disclosed on shared recruiter passports. Empty sections are omitted automatically.
              </p>
            </div>
            <Link
              href="/app/passport/builder"
              className="pill-btn pill-btn-ghost text-[11px] py-1 px-3 border border-ink/20 flex items-center gap-1 text-ink"
            >
              <span>Edit Content in Builder &rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {[
              { id: "work_experience", label: "Work Experience", icon: Briefcase, desc: "Employment history & achievements" },
              { id: "portfolio_projects", label: "Portfolio & Projects", icon: FolderGit2, desc: "Technical builds & repos" },
              { id: "education", label: "Education & Academics", icon: GraduationCap, desc: "Degrees, institutions & courses" },
              { id: "certifications", label: "Certifications", icon: Award, desc: "Credentials & issuing authorities" },
              { id: "publications", label: "Publications & Writing", icon: BookOpen, desc: "Papers, venues & abstracts" },
              { id: "achievements", label: "Honors & Achievements", icon: Trophy, desc: "Awards, competitions & recognitions" },
              { id: "custom_sections", label: "Custom Candidate Sections", icon: FileText, desc: "User-defined custom content" },
            ].map((sec) => {
              const isEnabled = sectionsConfig[sec.id] !== false;
              const Icon = sec.icon;
              return (
                <label
                  key={sec.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isEnabled
                      ? "bg-peach/15 border-ink shadow-sm"
                      : "bg-paper border-ink/10 opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className="w-4 h-4 text-ink/70 mt-0.5 shrink-0" />
                    <div>
                      <span className="font-bold text-ink block">{sec.label}</span>
                      <span className="text-[10px] text-ink/60">{sec.desc}</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleSection(sec.id)}
                    className="w-4 h-4 accent-ink"
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Group E: Role Alignment */}
        <div className="gl-card p-6 md:p-8 space-y-4">
          <div className="border-b border-ink/10 pb-3">
            <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-peach" />
              Group E: Role Alignment Permissions
            </h2>
            <p className="text-xs text-ink/70 mt-0.5">
              Allow recruiters to see how your verified capabilities map against a specific benchmark role from Domain 4.
            </p>
          </div>

          <div className="p-4 bg-paper rounded-2xl border border-ink/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-ink block">
                  Enable Role Alignment Section
                </span>
                <span className="text-[11px] text-ink/60">
                  Displays strengths and unverified areas relative to target role.
                </span>
              </div>
              <input
                type="checkbox"
                checked={localConfig.includeRoleAlignment}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    includeRoleAlignment: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-ink"
              />
            </div>

            {localConfig.includeRoleAlignment && (
              <div className="pt-2 border-t border-ink/10">
                <label className="text-xs font-bold text-ink block mb-1">
                  Default Target Role
                </label>
                <select
                  value={localConfig.targetRoleId}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      targetRoleId: e.target.value,
                    })
                  }
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

        {/* Group E: Excluded Internal Information (Non-editable Security Boundary) */}
        <div className="gl-card p-6 md:p-8 space-y-4 border-2 border-rose-300 bg-rose-50/30">
          <div className="border-b border-rose-200 pb-3">
            <div className="flex items-center gap-2 text-rose-900 font-extrabold text-base">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Group F: Excluded Internal Information (Strictly Non-Shareable)
            </div>
            <p className="text-xs text-rose-950/80 mt-0.5">
              These internal records are permanently excluded from all public projections and cannot be toggled on.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {[
              "Raw AI Prompt & Model Completion Traces",
              "Hallucination Guard Internal Decision Graphs",
              "Internal Schema Validation Logs & Payload Dumps",
              "Private Human Reviewer Notes & Risk Flags",
              "Domain 5 Diagnostic Question Scores & Error Records",
              "Targeted Remediation Quiz Answers & Checkpoints",
              "Unshared Repositories & Confidential Local Files",
              "Underlying Database UUIDs & Internal Connection Keys",
            ].map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-paper rounded-xl border border-rose-200/80 text-ink/80 flex items-center justify-between"
              >
                <span className="font-semibold">{item}</span>
                <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
