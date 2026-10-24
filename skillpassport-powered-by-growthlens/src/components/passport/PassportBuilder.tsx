"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Briefcase,
  GraduationCap,
  FolderGit2,
  Award,
  BookOpen,
  Trophy,
  Plus,
  Trash2,
  Edit2,
  Save,
  CheckCircle,
  Eye,
  ArrowUp,
  ArrowDown,
  Sparkles,
  ExternalLink,
  Layers,
  Calendar,
  Building2,
  MapPin,
  Loader2,
  SlidersHorizontal,
  Check,
  AlertCircle,
  X,
} from "lucide-react";
import { sharingApi } from "@/lib/sharingApi";
import {
  UserMasterPassport,
  WorkExperienceEntry,
  EducationEntry,
  PortfolioProjectEntry,
  CertificationEntry,
  PublicationEntry,
  AchievementEntry,
  CustomSectionEntry,
  SectionConfigItem,
  PassportTemplateId,
} from "@/types/sharing";
import TemplateSelector from "./TemplateSelector";

type BuilderTab =
  | "layout"
  | "experience"
  | "education"
  | "projects"
  | "certifications"
  | "publications"
  | "achievements"
  | "custom";

interface PassportBuilderProps {
  onSaved?: (master: UserMasterPassport) => void;
}

export default function PassportBuilder({ onSaved }: PassportBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("layout");
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [finalized, setFinalized] = useState<boolean>(false);
  const [finalizing, setFinalizing] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isFin = localStorage.getItem("sp_master_content_finalized") === "true";
      if (isFin) setFinalized(true);
    }
  }, []);

  const [master, setMaster] = useState<UserMasterPassport>({
    title: "Master Skill Passport",
    templateId: "verified-competency",
    sectionsConfig: [
      { id: "work_experience", title: "Work Experience", enabled: true, orderIndex: 0 },
      { id: "education", title: "Education & Academics", enabled: true, orderIndex: 1 },
      { id: "projects", title: "Portfolio Projects", enabled: true, orderIndex: 2 },
      { id: "certifications", title: "Certifications & Credentials", enabled: true, orderIndex: 3 },
      { id: "publications", title: "Publications & Research", enabled: true, orderIndex: 4 },
      { id: "achievements", title: "Honors & Achievements", enabled: true, orderIndex: 5 },
      { id: "custom_sections", title: "Custom Candidate Sections", enabled: true, orderIndex: 6 },
    ],
    workExperiences: [],
    educationEntries: [],
    portfolioProjects: [],
    certifications: [],
    publications: [],
    achievements: [],
    customSections: [],
  });

  // Modal / Form states for editing items
  const [editingExperience, setEditingExperience] = useState<WorkExperienceEntry | null>(null);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);

  const [editingEducation, setEditingEducation] = useState<EducationEntry | null>(null);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);

  const [editingProject, setEditingProject] = useState<PortfolioProjectEntry | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  const [editingCertification, setEditingCertification] = useState<CertificationEntry | null>(null);
  const [isCertificationModalOpen, setIsCertificationModalOpen] = useState(false);

  const [editingPublication, setEditingPublication] = useState<PublicationEntry | null>(null);
  const [isPublicationModalOpen, setIsPublicationModalOpen] = useState(false);

  const [editingAchievement, setEditingAchievement] = useState<AchievementEntry | null>(null);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);

  const [editingCustomSection, setEditingCustomSection] = useState<CustomSectionEntry | null>(null);
  const [isCustomSectionModalOpen, setIsCustomSectionModalOpen] = useState(false);

  useEffect(() => {
    async function loadMaster() {
      setLoading(true);
      try {
        const data = await sharingApi.getMasterPassport();
        if (data) {
          setMaster(data);
        }
      } catch (err: any) {
        console.warn("Using local defaults for master passport:", err);
        setErrorMessage("Using local defaults (could not load remote record).");
      } finally {
        setLoading(false);
      }
    }
    loadMaster();
  }, []);

  const handleConfirmAndFinalize = async () => {
    setFinalizing(true);
    setErrorMessage(null);
    try {
      await handleSaveAll();
      if (typeof window !== "undefined") {
        localStorage.setItem("sp_master_content_finalized", "true");
        localStorage.setItem("sp_master_content_finalized_at", new Date().toISOString());
      }
      setFinalized(true);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error("Error finalizing passport content:", err);
      setErrorMessage("Failed to finalize passport content. Please try again.");
    } finally {
      setFinalizing(false);
    }
  };

  const handleSaveAll = async (updatedData?: Partial<UserMasterPassport>) => {
    setSaving(true);
    setErrorMessage(null);
    try {
      const payload = { ...master, ...(updatedData || {}) };
      const saved = await sharingApi.updateMasterPassport(payload);
      setMaster(saved);
      setSaveSuccess(true);
      if (onSaved) onSaved(saved);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to persist master passport:", err);
      setErrorMessage(err.message || "Failed to save passport configuration.");
    } finally {
      setSaving(false);
    }
  };

  // Section Ordering and Toggles
  const handleToggleSection = (sectionId: string) => {
    const nextSections = master.sectionsConfig.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    const updated = { ...master, sectionsConfig: nextSections };
    setMaster(updated);
    handleSaveAll({ sectionsConfig: nextSections });
  };

  const handleMoveSection = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= master.sectionsConfig.length) return;

    const newSections = [...master.sectionsConfig];
    const [moved] = newSections.splice(index, 1);
    newSections.splice(targetIndex, 0, moved);

    // Re-index orderIndex
    const reordered = newSections.map((s, idx) => ({ ...s, orderIndex: idx }));
    const updated = { ...master, sectionsConfig: reordered };
    setMaster(updated);
    handleSaveAll({ sectionsConfig: reordered });
  };

  // 1. Work Experience Handlers
  const handleSaveExperience = (exp: WorkExperienceEntry) => {
    const list = [...master.workExperiences];
    const existingIndex = list.findIndex((e) => e.id === exp.id);
    if (existingIndex >= 0) {
      list[existingIndex] = exp;
    } else {
      list.push(exp);
    }
    const updated = { ...master, workExperiences: list };
    setMaster(updated);
    setIsExperienceModalOpen(false);
    setEditingExperience(null);
    handleSaveAll({ workExperiences: list });
  };

  const handleDeleteExperience = (id: string) => {
    if (!confirm("Are you sure you want to remove this work experience?")) return;
    const list = master.workExperiences.filter((e) => e.id !== id);
    const updated = { ...master, workExperiences: list };
    setMaster(updated);
    handleSaveAll({ workExperiences: list });
  };

  // 2. Education Handlers
  const handleSaveEducation = (edu: EducationEntry) => {
    const list = [...master.educationEntries];
    const existingIndex = list.findIndex((e) => e.id === edu.id);
    if (existingIndex >= 0) {
      list[existingIndex] = edu;
    } else {
      list.push(edu);
    }
    const updated = { ...master, educationEntries: list };
    setMaster(updated);
    setIsEducationModalOpen(false);
    setEditingEducation(null);
    handleSaveAll({ educationEntries: list });
  };

  const handleDeleteEducation = (id: string) => {
    if (!confirm("Are you sure you want to remove this education entry?")) return;
    const list = master.educationEntries.filter((e) => e.id !== id);
    const updated = { ...master, educationEntries: list };
    setMaster(updated);
    handleSaveAll({ educationEntries: list });
  };

  // 3. Project Handlers
  const handleSaveProject = (proj: PortfolioProjectEntry) => {
    const list = [...master.portfolioProjects];
    const existingIndex = list.findIndex((p) => p.id === proj.id);
    if (existingIndex >= 0) {
      list[existingIndex] = proj;
    } else {
      list.push(proj);
    }
    const updated = { ...master, portfolioProjects: list };
    setMaster(updated);
    setIsProjectModalOpen(false);
    setEditingProject(null);
    handleSaveAll({ portfolioProjects: list });
  };

  const handleDeleteProject = (id: string) => {
    if (!confirm("Are you sure you want to remove this project?")) return;
    const list = master.portfolioProjects.filter((p) => p.id !== id);
    const updated = { ...master, portfolioProjects: list };
    setMaster(updated);
    handleSaveAll({ portfolioProjects: list });
  };

  // 4. Certification Handlers
  const handleSaveCertification = (cert: CertificationEntry) => {
    const list = [...master.certifications];
    const existingIndex = list.findIndex((c) => c.id === cert.id);
    if (existingIndex >= 0) {
      list[existingIndex] = cert;
    } else {
      list.push(cert);
    }
    const updated = { ...master, certifications: list };
    setMaster(updated);
    setIsCertificationModalOpen(false);
    setEditingCertification(null);
    handleSaveAll({ certifications: list });
  };

  const handleDeleteCertification = (id: string) => {
    if (!confirm("Are you sure you want to remove this certification?")) return;
    const list = master.certifications.filter((c) => c.id !== id);
    const updated = { ...master, certifications: list };
    setMaster(updated);
    handleSaveAll({ certifications: list });
  };

  // 5. Publication Handlers
  const handleSavePublication = (pub: PublicationEntry) => {
    const list = [...master.publications];
    const existingIndex = list.findIndex((p) => p.id === pub.id);
    if (existingIndex >= 0) {
      list[existingIndex] = pub;
    } else {
      list.push(pub);
    }
    const updated = { ...master, publications: list };
    setMaster(updated);
    setIsPublicationModalOpen(false);
    setEditingPublication(null);
    handleSaveAll({ publications: list });
  };

  const handleDeletePublication = (id: string) => {
    if (!confirm("Are you sure you want to remove this publication?")) return;
    const list = master.publications.filter((p) => p.id !== id);
    const updated = { ...master, publications: list };
    setMaster(updated);
    handleSaveAll({ publications: list });
  };

  // 6. Achievement Handlers
  const handleSaveAchievement = (ach: AchievementEntry) => {
    const list = [...master.achievements];
    const existingIndex = list.findIndex((a) => a.id === ach.id);
    if (existingIndex >= 0) {
      list[existingIndex] = ach;
    } else {
      list.push(ach);
    }
    const updated = { ...master, achievements: list };
    setMaster(updated);
    setIsAchievementModalOpen(false);
    setEditingAchievement(null);
    handleSaveAll({ achievements: list });
  };

  const handleDeleteAchievement = (id: string) => {
    if (!confirm("Are you sure you want to remove this achievement?")) return;
    const list = master.achievements.filter((a) => a.id !== id);
    const updated = { ...master, achievements: list };
    setMaster(updated);
    handleSaveAll({ achievements: list });
  };

  // 7. Custom Section Handlers
  const handleSaveCustomSection = (sec: CustomSectionEntry) => {
    const list = [...master.customSections];
    const existingIndex = list.findIndex((s) => s.id === sec.id);
    if (existingIndex >= 0) {
      list[existingIndex] = sec;
    } else {
      list.push(sec);
    }
    const updated = { ...master, customSections: list };
    setMaster(updated);
    setIsCustomSectionModalOpen(false);
    setEditingCustomSection(null);
    handleSaveAll({ customSections: list });
  };

  const handleDeleteCustomSection = (id: string) => {
    if (!confirm("Are you sure you want to remove this custom section?")) return;
    const list = master.customSections.filter((s) => s.id !== id);
    const updated = { ...master, customSections: list };
    setMaster(updated);
    handleSaveAll({ customSections: list });
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#1C1C1C]/60" />
        <p className="text-xs text-[#1C1C1C]/60">Loading your master passport configuration...</p>
      </div>
    );
  }

  const tabs: Array<{ id: BuilderTab; label: string; icon: React.ElementType; count?: number }> = [
    { id: "layout", label: "Layout & Sections", icon: SlidersHorizontal },
    { id: "experience", label: "Experience", icon: Briefcase, count: master.workExperiences.length },
    { id: "education", label: "Education", icon: GraduationCap, count: master.educationEntries.length },
    { id: "projects", label: "Projects", icon: FolderGit2, count: master.portfolioProjects.length },
    { id: "certifications", label: "Certifications", icon: Award, count: master.certifications.length },
    { id: "publications", label: "Publications", icon: BookOpen, count: master.publications.length },
    { id: "achievements", label: "Honors & Awards", icon: Trophy, count: master.achievements.length },
    { id: "custom", label: "Custom Sections", icon: Layers, count: master.customSections.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header Actions & Notifications */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#1C1C1C]/15 shadow-sm">
        <div>
          <h2 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Passport Content Builder & Customizer
          </h2>
          <p className="text-xs text-[#1C1C1C]/70">
            Control optional sections, add professional experiences, and organize your passport story.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fadeIn">
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              Saved to Server
            </span>
          )}

          <Link
            href="/app/passport/preview"
            className="pill-btn pill-btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </Link>

          <button
            onClick={() => handleSaveAll()}
            disabled={saving || finalizing}
            className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? "Saving..." : "Save All"}</span>
          </button>

          <button
            onClick={handleConfirmAndFinalize}
            disabled={saving || finalizing}
            className={`pill-btn text-xs py-1.5 px-3.5 flex items-center gap-1.5 border border-[#1C1C1C] transition-all cursor-pointer font-extrabold ${
              finalized
                ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-800 shadow-[1px_1px_0_0_#065f46]"
                : "bg-[#DFE968] hover:bg-[#d4de58] text-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] active:translate-x-[1px] active:translate-y-[1px]"
            }`}
          >
            {finalizing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle className={`w-3.5 h-3.5 ${finalized ? "text-emerald-700" : "text-[#1C1C1C]"}`} />
            )}
            <span>{finalized ? "Flow Finalized ✓" : "Finalize & Confirm Content Flow"}</span>
          </button>
        </div>
      </div>

      {finalized && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-600 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0_0_#065f46] animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-200 border border-emerald-700 rounded-lg shrink-0">
              <CheckCircle className="w-4 h-4 text-emerald-900" />
            </div>
            <div>
              <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                Passport Content Selection Finalized
              </h4>
              <p className="text-[11px] text-emerald-800">
                This customized section flow and portfolio content are finalized and will be rendered on your Live Passport and recruiter shares.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/app/passport/preview"
              className="pill-btn bg-white hover:bg-stone-50 text-emerald-950 border border-emerald-700 text-xs py-1 px-3 flex items-center gap-1.5 font-bold shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-700" />
              <span>View in Live Preview &rarr;</span>
            </Link>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-[#1C1C1C]/15 scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                isActive
                  ? "bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]"
                  : "bg-white/80 hover:bg-stone-100 text-[#1C1C1C]/70 hover:text-[#1C1C1C] border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#1C1C1C]/10 font-mono font-bold">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Layout & Section Controls */}
      {activeTab === "layout" && (
        <div className="space-y-6">
          {/* Template Selection */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <div className="border-b border-[#1C1C1C]/10 pb-3">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">Default Presentation Template</h3>
              <p className="text-xs text-[#1C1C1C]/70">
                Choose the visual archetype used when recruiters access your passport.
              </p>
            </div>
            <TemplateSelector
              selectedTemplate={master.templateId}
              onSelectTemplate={(tplId: PassportTemplateId) => {
                const updated = { ...master, templateId: tplId };
                setMaster(updated);
                handleSaveAll({ templateId: tplId });
              }}
            />
          </div>

          {/* Section Ordering & Visibility */}
          <div className="gl-card p-6 md:p-8 space-y-4">
            <div className="border-b border-[#1C1C1C]/10 pb-3">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">Section Ordering & Visibility</h3>
              <p className="text-xs text-[#1C1C1C]/70">
                Enable or disable sections and rearrange their appearance in your shared passport.
              </p>
            </div>

            <div className="space-y-2">
              {master.sectionsConfig.map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-3.5 rounded-xl bg-white border border-[#1C1C1C]/15 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-[#1C1C1C]/40">#{idx + 1}</span>
                    <div>
                      <span className="text-xs font-bold text-[#1C1C1C] block">{sec.title}</span>
                      <span className="text-[10px] text-[#1C1C1C]/50">
                        {sec.enabled ? "Visible when populated" : "Hidden from preview & share"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleMoveSection(idx, "up")}
                      disabled={idx === 0}
                      className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 text-[#1C1C1C]/70"
                      title="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleMoveSection(idx, "down")}
                      disabled={idx === master.sectionsConfig.length - 1}
                      className="p-1 rounded hover:bg-stone-100 disabled:opacity-20 text-[#1C1C1C]/70"
                      title="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <label className="relative inline-flex items-center cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={sec.enabled}
                        onChange={() => handleToggleSection(sec.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1C1C1C]"></div>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Finalize Confirmation Card */}
            <div className="mt-6 p-5 rounded-2xl bg-amber-50/80 border-2 border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-md bg-[#DFE968] border border-[#1C1C1C]">
                    <CheckCircle className="w-4 h-4 text-[#1C1C1C]" />
                  </span>
                  <h4 className="text-sm font-extrabold text-[#1C1C1C]">
                    Finalize Content Flow for Live Passport
                  </h4>
                </div>
                <p className="text-xs text-[#1C1C1C]/80 max-w-xl">
                  Confirm that the enabled sections, ordering, and portfolio entries customized here are finalized to render directly on your Live Passport and recruiter shares.
                </p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleConfirmAndFinalize}
                  disabled={saving || finalizing}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#DFE968] hover:bg-[#d4de58] text-[#1C1C1C] border-2 border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
                >
                  {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  <span>{finalized ? "Flow Finalized ✓" : "Finalize & Confirm Content"}</span>
                </button>
                <Link
                  href="/app/passport/preview"
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-50 text-[#1C1C1C] border-2 border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] text-xs font-bold flex items-center justify-center gap-1.5 whitespace-nowrap"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Live &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Work Experience */}
      {activeTab === "experience" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                Work Experience ({master.workExperiences.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Add authentic workplace roles and link demonstrated responsibilities.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingExperience({
                  id: `exp-${Date.now()}`,
                  jobTitle: "",
                  organization: "",
                  startDate: "",
                  isCurrent: true,
                  description: "",
                  achievements: [],
                  techStack: [],
                });
                setIsExperienceModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Role</span>
            </button>
          </div>

          {master.workExperiences.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <Briefcase className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No work experience added yet.</p>
              <p className="text-[11px] text-[#1C1C1C]/50 max-w-sm mx-auto">
                Sections with zero entries are automatically omitted from public passports to maintain verified integrity.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.workExperiences.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-[#1C1C1C]">{exp.jobTitle}</h4>
                      <span className="text-xs font-semibold text-[#1C1C1C]/70">@ {exp.organization}</span>
                      {exp.isCurrent && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[#1C1C1C]/60 flex items-center gap-3">
                      <span>
                        {exp.startDate} – {exp.isCurrent ? "Present" : exp.endDate || "Present"}
                      </span>
                      {exp.location && <span>· {exp.location}</span>}
                      {exp.employmentType && <span>· {exp.employmentType}</span>}
                    </div>
                    {exp.description && (
                      <p className="text-xs text-[#1C1C1C]/80 leading-relaxed pt-1">{exp.description}</p>
                    )}
                    {exp.achievements && exp.achievements.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-[#1C1C1C]/70 pt-1 space-y-0.5">
                        {exp.achievements.map((ach, i) => (
                          <li key={i}>{ach}</li>
                        ))}
                      </ul>
                    )}
                    {exp.techStack && exp.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {exp.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-[#1C1C1C]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      onClick={() => {
                        setEditingExperience(exp);
                        setIsExperienceModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Education */}
      {activeTab === "education" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-sky-700" />
                Education & Academics ({master.educationEntries.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Add university degrees, formal academic coursework, and honors.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingEducation({
                  id: `edu-${Date.now()}`,
                  institution: "",
                  degree: "",
                  fieldOfStudy: "",
                  startYear: "",
                });
                setIsEducationModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Education</span>
            </button>
          </div>

          {master.educationEntries.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <GraduationCap className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No education entries added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.educationEntries.map((edu) => (
                <div
                  key={edu.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-sm font-extrabold text-[#1C1C1C]">
                      {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                    </h4>
                    <div className="text-xs font-semibold text-[#1C1C1C]/70">{edu.institution}</div>
                    <div className="text-xs text-[#1C1C1C]/50">
                      {edu.startYear} – {edu.endYear || "Present"}
                    </div>
                    {edu.coursework && edu.coursework.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {edu.coursework.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      onClick={() => {
                        setEditingEducation(edu);
                        setIsEducationModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Portfolio Projects */}
      {activeTab === "projects" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-purple-700" />
                Portfolio Projects ({master.portfolioProjects.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Highlight open-source repositories, client deliveries, and technical case studies.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingProject({
                  id: `proj-${Date.now()}`,
                  title: "",
                  description: "",
                  techStack: [],
                  outcomes: [],
                });
                setIsProjectModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Project</span>
            </button>
          </div>

          {master.portfolioProjects.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <FolderGit2 className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No portfolio projects added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.portfolioProjects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex flex-col md:flex-row md:items-start justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-extrabold text-[#1C1C1C]">{proj.title}</h4>
                      {proj.role && <span className="text-xs text-[#1C1C1C]/60 font-medium">({proj.role})</span>}
                    </div>
                    <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">{proj.description}</p>
                    {proj.techStack && proj.techStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.techStack.map((tech, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-900 border border-purple-200"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-4 text-xs font-semibold pt-1">
                      {proj.projectUrl && (
                        <a
                          href={proj.projectUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-purple-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Live Project
                        </a>
                      )}
                      {proj.repoUrl && (
                        <a
                          href={proj.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-stone-700 hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Repository
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <button
                      onClick={() => {
                        setEditingProject(proj);
                        setIsProjectModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Certifications */}
      {activeTab === "certifications" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Certifications & Credentials ({master.certifications.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Add verified certifications, cloud badges, and exam credentials.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCertification({
                  id: `cert-${Date.now()}`,
                  name: "",
                  issuer: "",
                });
                setIsCertificationModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Certification</span>
            </button>
          </div>

          {master.certifications.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <Award className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No certifications added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.certifications.map((cert) => (
                <div
                  key={cert.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-[#1C1C1C]">{cert.name}</h4>
                    <div className="text-xs font-semibold text-[#1C1C1C]/70">Issued by {cert.issuer}</div>
                    <div className="text-xs text-[#1C1C1C]/50 flex items-center gap-3">
                      {cert.issueDate && <span>Issued: {cert.issueDate}</span>}
                      {cert.credentialId && <span>ID: {cert.credentialId}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCertification(cert);
                        setIsCertificationModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCertification(cert.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Publications */}
      {activeTab === "publications" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-800" />
                Publications & Papers ({master.publications.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Research papers, technical articles, and conference proceedings.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingPublication({
                  id: `pub-${Date.now()}`,
                  title: "",
                });
                setIsPublicationModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Publication</span>
            </button>
          </div>

          {master.publications.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No publications added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.publications.map((pub) => (
                <div
                  key={pub.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-[#1C1C1C]">{pub.title}</h4>
                    <div className="text-xs text-[#1C1C1C]/70">
                      {pub.venue && <span className="font-semibold">{pub.venue} · </span>}
                      {pub.date}
                    </div>
                    {pub.summary && <p className="text-xs text-[#1C1C1C]/80 pt-1">{pub.summary}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingPublication(pub);
                        setIsPublicationModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePublication(pub.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: Achievements */}
      {activeTab === "achievements" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-600" />
                Honors & Achievements ({master.achievements.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Hackathon awards, patents, recognitions, and competitive distinctions.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingAchievement({
                  id: `ach-${Date.now()}`,
                  title: "",
                });
                setIsAchievementModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Honor</span>
            </button>
          </div>

          {master.achievements.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No achievements added yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-[#1C1C1C]">{ach.title}</h4>
                    <div className="text-xs text-[#1C1C1C]/70">
                      {ach.organization && <span className="font-semibold">{ach.organization} · </span>}
                      {ach.date}
                    </div>
                    {ach.description && <p className="text-xs text-[#1C1C1C]/80 pt-1">{ach.description}</p>}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingAchievement(ach);
                        setIsAchievementModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAchievement(ach.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Custom Sections */}
      {activeTab === "custom" && (
        <div className="gl-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1C1C1C]/10 pb-4">
            <div>
              <h3 className="text-sm font-extrabold text-[#1C1C1C] flex items-center gap-2">
                <Layers className="w-4 h-4 text-peach" />
                Custom Sections ({master.customSections.length})
              </h3>
              <p className="text-xs text-[#1C1C1C]/70 mt-0.5">
                Create tailored categories such as Volunteering, Open Source Leadership, or Speaking Engagements.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingCustomSection({
                  id: `sec-${Date.now()}`,
                  title: "",
                  enabled: true,
                  items: [],
                });
                setIsCustomSectionModalOpen(true);
              }}
              className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Custom Section</span>
            </button>
          </div>

          {master.customSections.length === 0 ? (
            <div className="p-8 text-center rounded-2xl border border-dashed border-[#1C1C1C]/20 bg-stone-50/50 space-y-2">
              <Layers className="w-8 h-8 mx-auto text-[#1C1C1C]/30" />
              <p className="text-xs font-bold text-[#1C1C1C]/70">No custom sections created yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {master.customSections.map((sec) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl bg-white border border-[#1C1C1C]/15 hover:border-[#1C1C1C] transition-all flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-[#1C1C1C]">{sec.title}</h4>
                    {sec.content && <p className="text-xs text-[#1C1C1C]/80">{sec.content}</p>}
                    {sec.items && sec.items.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {sec.items.map((item, i) => (
                          <div key={i} className="text-xs text-[#1C1C1C]/70">
                            • <strong className="text-[#1C1C1C]">{item.title}</strong>: {item.description}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setEditingCustomSection(sec);
                        setIsCustomSectionModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg border border-[#1C1C1C]/20 hover:bg-stone-100 text-[#1C1C1C]"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomSection(sec.id)}
                      className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Work Experience */}
      {isExperienceModalOpen && editingExperience && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingExperience.jobTitle ? "Edit Role" : "Add Work Experience"}
              </h3>
              <button
                onClick={() => setIsExperienceModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Job Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Software Architect"
                  value={editingExperience.jobTitle}
                  onChange={(e) => setEditingExperience({ ...editingExperience, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Company / Organization *</label>
                <input
                  type="text"
                  placeholder="e.g. TechCorp Solutions"
                  value={editingExperience.organization}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, organization: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Start Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022"
                    value={editingExperience.startDate || ""}
                    onChange={(e) =>
                      setEditingExperience({ ...editingExperience, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">End Date</label>
                  <input
                    type="text"
                    disabled={editingExperience.isCurrent}
                    placeholder="e.g. Present"
                    value={editingExperience.endDate || ""}
                    onChange={(e) =>
                      setEditingExperience({ ...editingExperience, endDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs disabled:opacity-50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={editingExperience.isCurrent ?? false}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, isCurrent: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#1C1C1C]"
                />
                <span>I currently work here</span>
              </label>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Description / Summary</label>
                <textarea
                  rows={3}
                  placeholder="Describe your core responsibilities and deliverables..."
                  value={editingExperience.description || ""}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs resize-none"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">
                  Technologies / Tech Stack (comma separated)
                </label>
                <input
                  type="text"
                  placeholder="Python, FastAPI, TypeScript, PostgreSQL"
                  value={(editingExperience.techStack || []).join(", ")}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      techStack: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsExperienceModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingExperience.jobTitle.trim() || !editingExperience.organization.trim()}
                onClick={() => handleSaveExperience(editingExperience)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Education */}
      {isEducationModalOpen && editingEducation && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingEducation.institution ? "Edit Education" : "Add Education"}
              </h3>
              <button
                onClick={() => setIsEducationModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Institution / University *</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University"
                  value={editingEducation.institution}
                  onChange={(e) =>
                    setEditingEducation({ ...editingEducation, institution: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Degree *</label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor of Science"
                  value={editingEducation.degree}
                  onChange={(e) => setEditingEducation({ ...editingEducation, degree: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Field of Study</label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science"
                  value={editingEducation.fieldOfStudy || ""}
                  onChange={(e) =>
                    setEditingEducation({ ...editingEducation, fieldOfStudy: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Start Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2018"
                    value={editingEducation.startYear || ""}
                    onChange={(e) =>
                      setEditingEducation({ ...editingEducation, startYear: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">End Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2022"
                    value={editingEducation.endYear || ""}
                    onChange={(e) =>
                      setEditingEducation({ ...editingEducation, endYear: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsEducationModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingEducation.institution.trim() || !editingEducation.degree.trim()}
                onClick={() => handleSaveEducation(editingEducation)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Education
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Portfolio Project */}
      {isProjectModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingProject.title ? "Edit Project" : "Add Portfolio Project"}
              </h3>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Distributed Consensus Engine"
                  value={editingProject.title}
                  onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Your Role / Responsibility</label>
                <input
                  type="text"
                  placeholder="e.g. Lead Architect & Core Contributor"
                  value={editingProject.role || ""}
                  onChange={(e) => setEditingProject({ ...editingProject, role: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Description *</label>
                <textarea
                  rows={3}
                  placeholder="Explain the project objectives, architecture, and outcomes..."
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Live URL</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={editingProject.projectUrl || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, projectUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Repository URL</label>
                  <input
                    type="text"
                    placeholder="https://github.com/..."
                    value={editingProject.repoUrl || ""}
                    onChange={(e) => setEditingProject({ ...editingProject, repoUrl: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  placeholder="Rust, Tokio, Raft, Docker, GitHub Actions"
                  value={(editingProject.techStack || []).join(", ")}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      techStack: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingProject.title.trim() || !editingProject.description.trim()}
                onClick={() => handleSaveProject(editingProject)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Certification */}
      {isCertificationModalOpen && editingCertification && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingCertification.name ? "Edit Certification" : "Add Certification"}
              </h3>
              <button
                onClick={() => setIsCertificationModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Certification Name *</label>
                <input
                  type="text"
                  placeholder="e.g. AWS Certified Solutions Architect Professional"
                  value={editingCertification.name}
                  onChange={(e) =>
                    setEditingCertification({ ...editingCertification, name: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Issuing Authority *</label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Web Services"
                  value={editingCertification.issuer}
                  onChange={(e) =>
                    setEditingCertification({ ...editingCertification, issuer: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Issue Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023"
                    value={editingCertification.issueDate || ""}
                    onChange={(e) =>
                      setEditingCertification({ ...editingCertification, issueDate: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Credential ID</label>
                  <input
                    type="text"
                    placeholder="e.g. AWS-PSA-12345"
                    value={editingCertification.credentialId || ""}
                    onChange={(e) =>
                      setEditingCertification({
                        ...editingCertification,
                        credentialId: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsCertificationModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingCertification.name.trim() || !editingCertification.issuer.trim()}
                onClick={() => handleSaveCertification(editingCertification)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Credential
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Publication */}
      {isPublicationModalOpen && editingPublication && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingPublication.title ? "Edit Publication" : "Add Publication"}
              </h3>
              <button
                onClick={() => setIsPublicationModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Publication Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Evaluating Grounded Factuality in Large Language Models"
                  value={editingPublication.title}
                  onChange={(e) =>
                    setEditingPublication({ ...editingPublication, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Venue / Journal</label>
                <input
                  type="text"
                  placeholder="e.g. IEEE Transactions / NeurIPS Workshop"
                  value={editingPublication.venue || ""}
                  onChange={(e) =>
                    setEditingPublication({ ...editingPublication, venue: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">Date</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024"
                    value={editingPublication.date || ""}
                    onChange={(e) =>
                      setEditingPublication({ ...editingPublication, date: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#1C1C1C] block mb-1">URL</label>
                  <input
                    type="text"
                    placeholder="https://doi.org/..."
                    value={editingPublication.url || ""}
                    onChange={(e) =>
                      setEditingPublication({ ...editingPublication, url: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsPublicationModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingPublication.title.trim()}
                onClick={() => handleSavePublication(editingPublication)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Publication
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Achievement */}
      {isAchievementModalOpen && editingAchievement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingAchievement.title ? "Edit Honor" : "Add Honor & Achievement"}
              </h3>
              <button
                onClick={() => setIsAchievementModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Title *</label>
                <input
                  type="text"
                  placeholder="e.g. 1st Place Global Hackathon"
                  value={editingAchievement.title}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Organization / Issuer</label>
                <input
                  type="text"
                  placeholder="e.g. Google Cloud / HackMatrix"
                  value={editingAchievement.organization || ""}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, organization: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Details of the recognition..."
                  value={editingAchievement.description || ""}
                  onChange={(e) =>
                    setEditingAchievement({ ...editingAchievement, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsAchievementModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingAchievement.title.trim()}
                onClick={() => handleSaveAchievement(editingAchievement)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Honor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Custom Section */}
      {isCustomSectionModalOpen && editingCustomSection && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border-2 border-[#1C1C1C] shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 border-[#1C1C1C]/10">
              <h3 className="text-sm font-extrabold text-[#1C1C1C]">
                {editingCustomSection.title ? "Edit Custom Section" : "New Custom Section"}
              </h3>
              <button
                onClick={() => setIsCustomSectionModalOpen(false)}
                className="p-1 hover:bg-stone-100 rounded-lg text-[#1C1C1C]/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Section Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Open Source Contributions"
                  value={editingCustomSection.title}
                  onChange={(e) =>
                    setEditingCustomSection({ ...editingCustomSection, title: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-[#1C1C1C] block mb-1">Section Overview</label>
                <textarea
                  rows={3}
                  placeholder="Summary text for this custom section..."
                  value={editingCustomSection.content || ""}
                  onChange={(e) =>
                    setEditingCustomSection({ ...editingCustomSection, content: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-[#1C1C1C]/20 focus:outline-none text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1C1C1C]/10">
              <button
                onClick={() => setIsCustomSectionModalOpen(false)}
                className="pill-btn pill-btn-ghost text-xs py-1.5 px-3"
              >
                Cancel
              </button>
              <button
                disabled={!editingCustomSection.title.trim()}
                onClick={() => handleSaveCustomSection(editingCustomSection)}
                className="pill-btn pill-btn-primary text-xs py-1.5 px-4 disabled:opacity-40"
              >
                Save Section
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
