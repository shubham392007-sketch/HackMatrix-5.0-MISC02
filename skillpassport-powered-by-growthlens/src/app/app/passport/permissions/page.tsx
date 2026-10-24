"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { DEFAULT_SHARE_PERMISSIONS } from "@/lib/sharingCalculations";
import { sharingApi } from "@/lib/sharingApi";
import {
  SlidersHorizontal,
  ShieldCheck,
  Eye,
  RotateCcw,
  Save,
  Sparkles,
  CheckCircle,
  CheckCircle2,
  Lock,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
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
  Loader2,
  ArrowRight,
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
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Load initial config from localStorage cache (if finalized previously) or EvidenceContext draft
  const [localConfig, setLocalConfig] = useState<SharePermissionsConfig>(() => {
    if (typeof window !== "undefined") {
      try {
        const storedFinalized = localStorage.getItem("sp_finalized_permissions");
        if (storedFinalized) return JSON.parse(storedFinalized);
        const storedDraft = localStorage.getItem("sp_draft_permissions");
        if (storedDraft) return JSON.parse(storedDraft);
      } catch {}
    }
    return { ...draftPermissions };
  });

  // Fetch authoritative saved permissions from PostgreSQL backend
  React.useEffect(() => {
    let isMounted = true;
    async function loadAuthoritative() {
      try {
        const perms = await sharingApi.getSharingPermissions();
        if (isMounted && perms) {
          setLocalConfig(perms);
          setDraftPermissions(perms);
          if (perms.selectedSkillIds && perms.selectedSkillIds.length > 0) {
            setIsFinalized(true);
          }
        }
      } catch (err: any) {
        console.warn("Could not fetch remote sharing permissions, using local cache:", err);
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    }
    loadAuthoritative();
    return () => {
      isMounted = false;
    };
  }, [setDraftPermissions]);

  const [isFinalized, setIsFinalized] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(localStorage.getItem("sp_permissions_finalized_at"));
    }
    return false;
  });

  const verifiedSkills = useMemo(() => {
    return skills.filter((s) => s.verificationState === "verified");
  }, [skills]);

  // Selected verified skills based on user's current checkboxes
  const selectedVerifiedSkills = useMemo(() => {
    return verifiedSkills.filter((s) => localConfig.selectedSkillIds.includes(s.id));
  }, [verifiedSkills, localConfig.selectedSkillIds]);

  // STRICT RULE: Build mapping from evidence ID -> list of selected skill names it backs
  const evidenceToSelectedSkillsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    selectedVerifiedSkills.forEach((skill) => {
      // 1. Check explicit evidenceIds on skill item
      if (Array.isArray(skill.evidenceIds)) {
        skill.evidenceIds.forEach((evId) => {
          const current = map.get(evId) || [];
          if (!current.includes(skill.canonicalName)) {
            current.push(skill.canonicalName);
          }
          map.set(evId, current);
        });
      }

      // 2. Cross-reference evidence items that match canonical name or project
      evidenceItems.forEach((ev) => {
        const related = (ev as any).relatedSkillName;
        if (related && related.toLowerCase() === skill.canonicalName.toLowerCase()) {
          const current = map.get(ev.id) || [];
          if (!current.includes(skill.canonicalName)) {
            current.push(skill.canonicalName);
          }
          map.set(ev.id, current);
        }
      });
    });
    return map;
  }, [selectedVerifiedSkills, evidenceItems]);

  // STRICT REQUIREMENT: Only evidence items supporting currently selected skills are displayed
  const relevantEvidenceItems = useMemo(() => {
    return evidenceItems.filter((ev) => evidenceToSelectedSkillsMap.has(ev.id));
  }, [evidenceItems, evidenceToSelectedSkillsMap]);

  const handleToggleSkill = (skillId: string) => {
    setLocalConfig((prev) => {
      const isSelected = prev.selectedSkillIds.includes(skillId);
      const updatedSkillIds = isSelected
        ? prev.selectedSkillIds.filter((id) => id !== skillId)
        : [...prev.selectedSkillIds, skillId];

      return {
        ...prev,
        selectedSkillIds: updatedSkillIds,
      };
    });
  };

  const handleSelectAllSkills = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedSkillIds: verifiedSkills.map((s) => s.id),
    }));
  };

  const handleDeselectAllSkills = () => {
    setLocalConfig((prev) => ({
      ...prev,
      selectedSkillIds: [],
    }));
  };

  const handleToggleEvidenceSummary = (evId: string) => {
    setLocalConfig((prev) => {
      const current = prev.selectedEvidencePermissions[evId] || {
        shareSummary: true,
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

  // Finalize Permissions and persist them authoritatively to PostgreSQL
  const finalizePermissions = async (navigateImmediately: boolean = false) => {
    setIsFinalizing(true);
    setSaveError(null);

    // Build cleaned evidence permissions: only keep permissions for relevant evidence of chosen skills!
    const allowedEvIds = new Set(Array.from(evidenceToSelectedSkillsMap.keys()));
    const cleanedEvidencePermissions: Record<string, { shareSummary: boolean; allowDetail: boolean }> = {};

    allowedEvIds.forEach((evId) => {
      cleanedEvidencePermissions[evId] = localConfig.selectedEvidencePermissions[evId] || {
        shareSummary: true,
        allowDetail: false,
      };
    });

    const finalizedPermissions: SharePermissionsConfig = {
      ...localConfig,
      selectedEvidencePermissions: cleanedEvidencePermissions,
    };

    try {
      // 1. Authoritative Backend Persistence to PostgreSQL
      const persisted = await sharingApi.saveSharingPermissions(finalizedPermissions);

      // 2. Update context state
      setDraftPermissions(persisted);
      setLocalConfig(persisted);

      // 3. Persist to localStorage cache
      const nowIso = new Date().toISOString();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("sp_finalized_permissions", JSON.stringify(persisted));
          localStorage.setItem("sp_draft_permissions", JSON.stringify(persisted));
          localStorage.setItem("sp_permissions_finalized_at", nowIso);
        } catch (e) {
          console.warn("Could not save to localStorage:", e);
        }
      }

      setIsFinalized(true);
      setSuccessMessage(
        `Finalized & Saved! Exactly ${persisted.selectedSkillIds?.length ?? selectedVerifiedSkills.length} skills and ${Object.keys(cleanedEvidencePermissions).length} supporting evidences securely locked in for new share links.`
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);

      // 4. Pre-warm / synchronize with backend preview
      try {
        await sharingApi.getDraftPreview({
          permissions: persisted,
        });
      } catch (e) {
        console.warn("Notice during background preview sync:", e);
      }

      // 5. Navigate to Live Passport Preview if requested
      if (navigateImmediately) {
        router.push("/app/passport/preview");
      }
    } catch (err: any) {
      console.error("Failed to save sharing permissions to database:", err);
      setSaveError(err.message || "Failed to persist sharing preferences. The server may be busy or temporarily unreachable.");
    } finally {
      setIsFinalizing(false);
    }
  };

  const handleReset = async () => {
    if (confirm("Reset sharing permissions to secure default configuration?")) {
      try {
        setIsFinalizing(true);
        setSaveError(null);
        const resetPerms = { ...DEFAULT_SHARE_PERMISSIONS };
        const persisted = await sharingApi.saveSharingPermissions(resetPerms);
        setLocalConfig(persisted);
        setDraftPermissions(persisted);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("sp_finalized_permissions", JSON.stringify(persisted));
            localStorage.removeItem("sp_permissions_finalized_at");
          } catch {}
        }
        setIsFinalized(false);
        setSuccessMessage("Permissions reset to defaults and saved to server.");
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } catch (err: any) {
        setSaveError("Failed to reset permissions on server.");
      } finally {
        setIsFinalizing(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      <AppTopBar
        title="Sharing Permissions"
        description="Calibrate baseline data disclosure rules and finalize which skills and evidence will appear on your passport."
        badge="Domain 6 · Permissions"
        badgeColor="border-peach/40 text-ink bg-peach/20"
      >
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

          {/* Save Defaults Button */}
          <button
            onClick={() => finalizePermissions(false)}
            disabled={isFinalizing}
            className="pill-btn pill-btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 shrink-0"
            title="Save these permissions as your authoritative default configuration for future share links"
          >
            {isFinalizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5 text-ink/70" />
            )}
            <span>Save Preferences</span>
          </button>

          {/* Primary Finalize Button in TopBar */}
          <button
            onClick={() => finalizePermissions(true)}
            disabled={isFinalizing}
            className="pill-btn bg-[#000000] hover:bg-[#1A1918] text-[#FAF8F5] border border-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918] font-extrabold text-[11px] py-1.5 px-3.5 flex items-center gap-1.5 shrink-0 transition-transform active:translate-y-0.5"
            title="Finalize these permissions and content to be displayed on your passport and view in Live Preview"
          >
            {isFinalizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-800" />
            )}
            <span>Finalize & Preview Passport &rarr;</span>
          </button>
        </div>
      </AppTopBar>

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl w-full mx-auto pb-20">
        {saveError && (
          <div className="p-4 bg-rose-50 border border-rose-300 text-rose-900 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{saveError}</span>
            </div>
            <button
              onClick={() => finalizePermissions(false)}
              className="px-3 py-1 bg-rose-700 text-white rounded-xl text-[11px] font-bold hover:bg-rose-800 flex items-center gap-1"
            >
              <span>Retry Save</span>
            </button>
          </div>
        )}

        {savedSuccess && (
          <div className="p-4 bg-emerald-100 border border-emerald-400 text-emerald-950 rounded-2xl text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn shadow-sm">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{successMessage || "Permissions finalized successfully!"}</span>
            </div>
            <Link
              href="/app/passport/preview"
              className="px-3 py-1 bg-emerald-800 text-white rounded-xl text-[11px] font-bold hover:bg-emerald-900 flex items-center gap-1"
            >
              <span>View in Preview</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Group B: Verified Capabilities Disclosure
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  Only skills selected here will appear on your passport. Supporting evidence for unselected skills is strictly excluded.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSelectAllSkills}
                  className="text-[11px] font-bold text-ink hover:underline px-2 py-1 rounded bg-ink/5"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAllSkills}
                  className="text-[11px] font-bold text-ink hover:underline px-2 py-1 rounded bg-ink/5"
                >
                  Clear All
                </button>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  {selectedVerifiedSkills.length} of {verifiedSkills.length} Selected
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {verifiedSkills.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#FBF1CF]/50 border border-ink/10 text-center text-xs text-ink/60">
                  No verified skills available. Connect a source or run ingestion to verify capabilities.
                </div>
              ) : (
                verifiedSkills.map((s) => {
                  const isSelected = localConfig.selectedSkillIds.includes(s.id);
                  const skillEvidenceCount = (s.evidenceIds || []).length;
                  return (
                    <div
                      key={s.id}
                      onClick={() => handleToggleSkill(s.id)}
                      className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#DFE968]/20 border-ink shadow-sm"
                          : "bg-paper border-ink/10 opacity-70 hover:opacity-90"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-ink">
                          <span>{s.canonicalName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-ink/5 font-semibold">
                            {s.verifiedProficiency}
                          </span>
                          {skillEvidenceCount > 0 && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                              {skillEvidenceCount} proof{skillEvidenceCount > 1 ? "s" : ""}
                            </span>
                          )}
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
                })
              )}
            </div>
          </div>

          {/* Group C: Per-Evidence Permissions Matrix (Filtered strictly to selected skills!) */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-ink/10 pb-3">
              <div>
                <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-peach" />
                  Group C: Per-Evidence Access Matrix
                </h2>
                <p className="text-xs text-ink/70 mt-0.5">
                  Showing evidence supporting your selected skills. Granting visibility to a skill allows granular control over summary versus detailed inspection.
                </p>
              </div>
              <span className="text-xs font-bold text-ink/80 bg-ink/5 px-3 py-1 rounded-full shrink-0">
                {relevantEvidenceItems.length} Supporting Artifact{relevantEvidenceItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {selectedVerifiedSkills.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/15 text-center space-y-2">
                <AlertCircle className="w-6 h-6 text-[#1C1C1C]/60 mx-auto" />
                <p className="text-xs font-bold text-[#1C1C1C]">No Skills Selected in Group B</p>
                <p className="text-[11px] text-[#1C1C1C]/70 max-w-md mx-auto">
                  Select one or more verified capabilities above. Only evidence supporting your chosen skills will appear here and be eligible for your passport.
                </p>
              </div>
            ) : relevantEvidenceItems.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/15 text-center space-y-2">
                <Info className="w-6 h-6 text-[#1C1C1C]/60 mx-auto" />
                <p className="text-xs font-bold text-[#1C1C1C]">No Direct Work Artifacts Found for Selected Skills</p>
                <p className="text-[11px] text-[#1C1C1C]/70 max-w-md mx-auto">
                  The selected skills are verified through credentials or parent competencies. No raw workplace evidence files will be exposed.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {relevantEvidenceItems.map((ev) => {
                  const perm = localConfig.selectedEvidencePermissions[ev.id] || {
                    shareSummary: true,
                    allowDetail: false,
                  };
                  const supportingSkills = evidenceToSelectedSkillsMap.get(ev.id) || [];

                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-paper border border-ink/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-ink">{ev.title}</span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ink/5 text-ink/70">
                            {ev.sourceType}
                          </span>
                          {supportingSkills.map((skName) => (
                            <span
                              key={skName}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DFE968]/50 text-[#1C1C1C] border border-[#1C1C1C]/20"
                            >
                              Backs: {skName}
                            </span>
                          ))}
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
            )}
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

          {/* Group F: Excluded Internal Information (Non-editable Security Boundary) */}
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

          {/* DEDICATED FINALIZATION ACTION CARD (REQUIREMENT 2) */}
          <div className="gl-card p-6 md:p-8 border-2 border-[#1C1C1C] bg-[#DFE968]/25 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1C1C1C]/15 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-800" />
                  <h2 className="text-base font-black text-[#1C1C1C]">
                    Finalize Passport Content & Permissions
                  </h2>
                  {isFinalized && (
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Finalized for Passport
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#1C1C1C]/80 mt-1 max-w-2xl leading-relaxed">
                  Finalize this exact configuration on this screen. Only the <strong>{selectedVerifiedSkills.length} selected skills</strong> and their <strong>{relevantEvidenceItems.length} supporting evidence artifacts</strong> chosen here will appear on your passport and live preview. Evidence from any unselected skills is strictly excluded.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => finalizePermissions(false)}
                  disabled={isFinalizing}
                  className="pill-btn pill-btn-ghost text-xs py-2 px-4 border border-[#1C1C1C]/30 font-bold flex items-center gap-1.5 bg-white/80 hover:bg-white"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Sharing Preferences</span>
                </button>

                <button
                  type="button"
                  onClick={() => finalizePermissions(true)}
                  disabled={isFinalizing}
                  className="pill-btn bg-[#000000] hover:bg-[#1A1918] text-[#FAF8F5] border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] font-black text-xs py-2 px-5 flex items-center gap-2 transition-transform active:translate-y-0.5"
                >
                  {isFinalizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 text-[#FAF8F5]" />
                  )}
                  <span>Finalize & View Live Passport Preview &rarr;</span>
                </button>
              </div>
            </div>

            {/* Quick Summary of Finalized Payload */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
              <div className="p-3 bg-white/85 rounded-xl border border-[#1C1C1C]/10">
                <span className="text-[10px] font-bold text-[#1C1C1C]/60 uppercase block">Selected Skills</span>
                <span className="text-base font-black text-[#1C1C1C]">{selectedVerifiedSkills.length} Verified</span>
              </div>
              <div className="p-3 bg-white/85 rounded-xl border border-[#1C1C1C]/10">
                <span className="text-[10px] font-bold text-[#1C1C1C]/60 uppercase block">Supporting Proofs</span>
                <span className="text-base font-black text-[#1C1C1C]">{relevantEvidenceItems.length} Artifacts</span>
              </div>
              <div className="p-3 bg-white/85 rounded-xl border border-[#1C1C1C]/10">
                <span className="text-[10px] font-bold text-[#1C1C1C]/60 uppercase block">Identity Mode</span>
                <span className="text-base font-black text-[#1C1C1C]">
                  {localConfig.identity.showDisplayName ? "Disclosed" : "Anonymous"}
                </span>
              </div>
              <div className="p-3 bg-white/85 rounded-xl border border-[#1C1C1C]/10">
                <span className="text-[10px] font-bold text-[#1C1C1C]/60 uppercase block">Status</span>
                <span className="text-xs font-black text-emerald-800 flex items-center gap-1 mt-1">
                  <Check className="w-3.5 h-3.5" />
                  {isFinalized ? "Finalized & Active" : "Draft Pending"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
