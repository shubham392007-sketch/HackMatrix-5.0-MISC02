"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  HelpCircle,
  X,
  Search,
  User,
  FolderGit2,
  ShieldCheck,
  Bell,
  Sliders,
  Archive,
  Clock,
  BookOpen,
  Compass,
  ArrowRight,
  ExternalLink,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Lock,
  Database,
  Sparkles,
  Layers,
  Shield,
  FileText,
} from "lucide-react";
import {
  SETTINGS_HELP_TOPICS,
  SETTINGS_GUIDED_WORKFLOWS,
  SETTINGS_CONCEPTUAL_GLOSSARY,
  SettingsHelpTopicId,
  SettingsHelpTopic,
  getSettingsHelpTopicIdFromPathname,
} from "@/data/settingsHelpContent";

interface SettingsHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: SettingsHelpTopicId;
  currentPathname?: string;
}

const SETTINGS_NAVIGATION_ITEMS: Array<{
  id: SettingsHelpTopicId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "overview", label: "Overview", icon: Sliders },
  { id: "profile", label: "Profile", icon: User },
  { id: "connections", label: "Connected Accounts", icon: FolderGit2 },
  { id: "vault", label: "Evidence Vault", icon: Archive },
  { id: "privacy", label: "Privacy & Consent", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "preferences", label: "Preferences & Settings", icon: Sliders },
  { id: "activity", label: "Activity History", icon: Clock },
  { id: "help", label: "Help & Explanations", icon: HelpCircle },
  { id: "workflows", label: "Guided Workflows (4)", icon: Compass },
  { id: "glossary", label: "Settings Glossary (8)", icon: BookOpen },
];

export default function SettingsHelpDrawer({
  isOpen,
  onClose,
  initialTopicId,
  currentPathname = "",
}: SettingsHelpDrawerProps) {
  const router = useRouter();
  const { currentRole } = useEvidence();
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine initial active topic
  const defaultTopic = useMemo(() => {
    if (initialTopicId) return initialTopicId;
    if (currentPathname) return getSettingsHelpTopicIdFromPathname(currentPathname);
    return "overview";
  }, [initialTopicId, currentPathname]);

  const [activeTopic, setActiveTopic] = useState<SettingsHelpTopicId>(defaultTopic);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purpose: true,
    whenToUse: true,
    whoCanUse: true,
    prerequisites: true,
    steps: true,
    example: true,
    inputsOutputs: true,
    status: true,
    troubleshooting: true,
    whatNext: true,
  });

  // Keep active topic synchronized when drawer opens or path changes
  useEffect(() => {
    if (isOpen) {
      const topic =
        initialTopicId ||
        (currentPathname ? getSettingsHelpTopicIdFromPathname(currentPathname) : "overview");
      setActiveTopic(topic);
      setSearchQuery("");
    }
  }, [isOpen, initialTopicId, currentPathname]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const handleNavigate = (route: string) => {
    onClose();
    router.push(route);
  };

  // Search filtering across topics, workflows, and glossary
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();

    // Search topics
    const matchingTopics = Object.values(SETTINGS_HELP_TOPICS).filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.whenToUse.some((w) => w.toLowerCase().includes(q)) ||
        t.stepByStep.some(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.action.toLowerCase().includes(q) ||
            s.details.toLowerCase().includes(q)
        ) ||
        t.troubleshooting.some(
          (tb) =>
            tb.symptom.toLowerCase().includes(q) ||
            tb.verifiedRemedy.toLowerCase().includes(q)
        )
      );
    });

    // Search workflows
    const matchingWorkflows = SETTINGS_GUIDED_WORKFLOWS.filter((wf) => {
      return (
        wf.title.toLowerCase().includes(q) ||
        wf.summary.toLowerCase().includes(q) ||
        wf.phases.some(
          (p) =>
            p.action.toLowerCase().includes(q) ||
            p.outcome.toLowerCase().includes(q)
        )
      );
    });

    // Search glossary
    const matchingGlossary = SETTINGS_CONCEPTUAL_GLOSSARY.filter((g) => {
      return (
        g.term.toLowerCase().includes(q) ||
        g.definition.toLowerCase().includes(q) ||
        g.context.toLowerCase().includes(q)
      );
    });

    return {
      topics: matchingTopics,
      workflows: matchingWorkflows,
      glossary: matchingGlossary,
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const currentTopicData: SettingsHelpTopic | undefined =
    activeTopic !== "workflows" && activeTopic !== "glossary"
      ? SETTINGS_HELP_TOPICS[activeTopic as keyof typeof SETTINGS_HELP_TOPICS]
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Settings & Access Product Help & Conceptual Guidance"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-[#1A1918]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-w-2xl bg-[#FAF8F5] text-[#1A1918] h-full shadow-2xl border-l-2 border-[#1A1918] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 bg-[#1E3A5F]/30 border-b-2 border-[#1A1918] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A1918] text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                <Sliders className="w-3 h-3 text-[#DFE968]" />
                Settings &amp; Access Guide
              </span>
              <span className="text-[11px] font-mono text-[#1A1918]/60 font-semibold">
                Catalog v2026.1
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] tracking-tight">
              Settings &amp; Access Help
            </h2>
            <p className="text-xs text-[#1A1918]/80 font-medium leading-relaxed">
              Manage your verified profile, connect external deliverable sources, configure privacy defaults, review persistent activity, and understand core platform invariants.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Settings & Access Help"
            className="p-2 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1A1918] hover:text-white transition-all shadow-[1.5px_1.5px_0_0_#1A1918] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 bg-white/70 border-b border-[#1A1918]/15 shrink-0">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1A1918]/40" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search across all 7 features, 4 workflows, or glossary terms..."
              className="w-full pl-9 pr-9 py-2 rounded-xl bg-white border border-[#1A1918] text-xs font-medium placeholder-[#1A1918]/40 focus:outline-none focus:ring-2 focus:ring-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/10"
              >
                <X className="w-3.5 h-3.5 text-[#1A1918]/60" />
              </button>
            )}
          </div>
        </div>

        {/* Feature Navigation Pills */}
        <div className="px-4 py-2.5 bg-[#FAF8F5]/60 border-b border-[#1A1918]/15 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5 min-w-max">
            {SETTINGS_NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTopic === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveTopic(item.id);
                    setSearchQuery("");
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                    isActive
                      ? "bg-[#1A1918] text-white shadow-[2px_2px_0_0_#DFE968]"
                      : "bg-white/80 hover:bg-white text-[#1A1918] border border-[#1A1918]/30 shadow-[1px_1px_0_0_#1A1918]/20"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DFE968]" : "text-[#1A1918]/70"}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content Area (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SEARCH RESULTS VIEW */}
          {searchResults ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#1A1918]/20">
                <h3 className="font-black text-sm uppercase tracking-wider text-[#1A1918]">
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </h3>
                <span className="text-xs font-mono font-bold bg-[#1A1918] text-white px-2 py-0.5 rounded-full">
                  {searchResults.topics.length +
                    searchResults.workflows.length +
                    searchResults.glossary.length}{" "}
                  matches
                </span>
              </div>

              {/* Matching Topics */}
              {searchResults.topics.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1918]/70">
                    Feature Guides ({searchResults.topics.length})
                  </h4>
                  <div className="grid gap-2.5">
                    {searchResults.topics.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          setActiveTopic(t.id);
                          setSearchQuery("");
                        }}
                        className="p-3.5 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1E3A5F]/20 cursor-pointer shadow-[2px_2px_0_0_#1A1918] transition-all space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-[#1A1918]">
                            {t.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A1918]/10 font-bold">
                            {t.badgeLabel}
                          </span>
                        </div>
                        <p className="text-xs text-[#1A1918]/75 line-clamp-2">
                          {t.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Workflows */}
              {searchResults.workflows.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1918]/70">
                    Guided Workflows ({searchResults.workflows.length})
                  </h4>
                  <div className="grid gap-2.5">
                    {searchResults.workflows.map((wf) => (
                      <div
                        key={wf.id}
                        onClick={() => {
                          setActiveTopic("workflows");
                          setSearchQuery("");
                        }}
                        className="p-3.5 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1E3A5F]/20 cursor-pointer shadow-[2px_2px_0_0_#1A1918] transition-all space-y-1"
                      >
                        <span className="font-black text-sm text-[#1A1918] flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-emerald-700" />
                          {wf.title}
                        </span>
                        <p className="text-xs text-[#1A1918]/75 line-clamp-2">
                          {wf.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Matching Glossary Terms */}
              {searchResults.glossary.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1918]/70">
                    Glossary Terms ({searchResults.glossary.length})
                  </h4>
                  <div className="grid gap-2.5">
                    {searchResults.glossary.map((g, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveTopic("glossary");
                          setSearchQuery("");
                        }}
                        className="p-3.5 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1E3A5F]/20 cursor-pointer shadow-[2px_2px_0_0_#1A1918] transition-all space-y-1"
                      >
                        <span className="font-black text-xs text-[#1A1918]">
                          {g.term}
                        </span>
                        <p className="text-xs text-[#1A1918]/80 line-clamp-2">
                          {g.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.topics.length === 0 &&
                searchResults.workflows.length === 0 &&
                searchResults.glossary.length === 0 && (
                  <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-[#1A1918]/30 space-y-2">
                    <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                    <p className="font-bold text-sm text-[#1A1918]">
                      No documentation matches &ldquo;{searchQuery}&rdquo;
                    </p>
                    <p className="text-xs text-[#1A1918]/60">
                      Try searching for terms like &ldquo;profile&rdquo;, &ldquo;GitHub&rdquo;, &ldquo;privacy&rdquo;, &ldquo;sync&rdquo;, or &ldquo;audit&rdquo;.
                    </p>
                  </div>
                )}
            </div>
          ) : activeTopic === "workflows" ? (
            /* ──────────────── GUIDED WORKFLOWS VIEW ──────────────── */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#1E3A5F]/20 border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-2">
                <div className="flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#1A1918]" />
                  <h3 className="text-lg font-black text-[#1A1918]">
                    Settings &amp; Access Guided Workflows
                  </h3>
                </div>
                <p className="text-xs text-[#1A1918]/80 leading-relaxed font-medium">
                  Follow these 4 canonical operational procedures to configure your identity, link deliverable sources, enforce privacy boundaries, and audit account mutations.
                </p>
              </div>

              <div className="space-y-5">
                {SETTINGS_GUIDED_WORKFLOWS.map((wf) => (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4"
                  >
                    <div className="space-y-1">
                      <h4 className="font-black text-sm text-[#1A1918]">
                        {wf.title}
                      </h4>
                      <p className="text-xs text-[#1A1918]/75 leading-relaxed">
                        {wf.summary}
                      </p>
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-[#1A1918]/15">
                      {wf.phases.map((phase) => (
                        <div
                          key={phase.phaseNumber}
                          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/20 flex flex-col gap-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1A1918] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#1A1918] text-[#DFE968] font-mono text-[10px] flex items-center justify-center font-black">
                                {phase.phaseNumber}
                              </span>
                              {phase.featureTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleNavigate(phase.route)}
                              className="text-[10px] font-mono font-bold text-[#1A1918] hover:underline flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-[#1A1918]/30"
                            >
                              <span>{phase.route}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <p className="text-[#1A1918]/80 pl-6">
                            <strong className="text-[#1A1918]">Action:</strong> {phase.action}
                          </p>
                          <p className="text-emerald-900 bg-emerald-50/80 p-2 rounded-lg border border-emerald-800/20 pl-2 leading-relaxed ml-6">
                            <strong className="text-emerald-950 font-bold">Outcome:</strong> {phase.outcome}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTopic === "glossary" ? (
            /* ──────────────── SETTINGS GLOSSARY VIEW ──────────────── */
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-[#1E3A5F]/20 border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#1A1918]" />
                  <h3 className="text-lg font-black text-[#1A1918]">
                    Settings &amp; Access Conceptual Glossary
                  </h3>
                </div>
                <p className="text-xs text-[#1A1918]/80 leading-relaxed font-medium">
                  Authoritative definitions of architectural boundaries, privacy invariants, least-privilege tokens, and session pool limits governing your account.
                </p>
              </div>

              <div className="grid gap-3.5">
                {SETTINGS_CONCEPTUAL_GLOSSARY.map((term, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-[#1A1918]">
                        {term.term}
                      </h4>
                      <button
                        type="button"
                        onClick={() => handleNavigate(term.relatedRoute)}
                        className="text-[10px] font-mono font-bold text-[#1A1918] hover:underline flex items-center gap-1 bg-[#FAF8F5] px-2 py-0.5 rounded border border-[#1A1918]/30"
                      >
                        <span>{term.relatedRouteLabel}</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#1A1918]/85 leading-relaxed font-medium">
                      {term.definition}
                    </p>
                    <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 text-[11px] text-[#1A1918]/75">
                      <strong className="text-[#1A1918]">Practical Application:</strong> {term.context}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentTopicData ? (
            /* ──────────────── TOPIC DETAIL VIEW (10 SECTIONS) ──────────────── */
            <div className="space-y-5">
              {/* Feature Title Card */}
              <div className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black bg-[#1A1918] text-[#DFE968] px-2.5 py-0.5 rounded-full">
                      {currentTopicData.badgeLabel}
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#1A1918]/70">
                      {currentTopicData.requiredRole}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleNavigate(currentTopicData.canonicalRoute)}
                    className="pill-btn pill-btn-primary text-xs py-1 px-3 flex items-center gap-1"
                  >
                    <span>Open {currentTopicData.shortTitle}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

                <h3 className="text-xl font-black text-[#1A1918] tracking-tight">
                  {currentTopicData.title}
                </h3>
                <p className="text-xs text-[#1A1918]/80 leading-relaxed font-medium">
                  {currentTopicData.summary}
                </p>
                <div className="text-[11px] font-mono text-[#1A1918]/60 flex items-center gap-1.5 pt-1">
                  <span className="font-bold">Canonical Route:</span>
                  <code className="bg-[#1A1918]/5 px-1.5 py-0.5 rounded border border-[#1A1918]/10">
                    {currentTopicData.canonicalRoute}
                  </code>
                </div>
              </div>

              {/* ── 1. Purpose & Role ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("purpose")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      1
                    </span>
                    Purpose &amp; Objective
                  </span>
                  {expandedSections.purpose ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.purpose && (
                  <div className="p-5 border-t border-[#1A1918]/15 text-xs text-[#1A1918]/85 leading-relaxed font-medium">
                    {currentTopicData.purpose}
                  </div>
                )}
              </div>

              {/* ── 2. When to Use ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("whenToUse")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      2
                    </span>
                    When to Use This Feature
                  </span>
                  {expandedSections.whenToUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whenToUse && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-2">
                    <ul className="space-y-2">
                      {currentTopicData.whenToUse.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#1A1918]/85 font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 3. Who Can Use & Permissions ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("whoCanUse")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      3
                    </span>
                    Who Can Use &amp; RBAC Access Tiers
                  </span>
                  {expandedSections.whoCanUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whoCanUse && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#1E3A5F]/20 border border-[#1A1918]/20">
                      <strong className="text-[#1A1918] font-bold">Authorized Personas:</strong>{" "}
                      <span className="text-[#1A1918]/85 font-medium">{currentTopicData.whoCanUse}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#1A1918]/70 font-mono">
                      <Lock className="w-3.5 h-3.5 text-[#1A1918]" />
                      <span>Current Active Session Role: </span>
                      <strong className="text-[#1A1918] uppercase font-bold">{currentRole}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 4. Prerequisites ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("prerequisites")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      4
                    </span>
                    Prerequisites &amp; Prior Conditions
                  </span>
                  {expandedSections.prerequisites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.prerequisites && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-2">
                    <ul className="space-y-1.5">
                      {currentTopicData.prerequisites.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-[#1A1918]/85 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1A1918] shrink-0 mt-2" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 5. Step-by-Step Instructions ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("steps")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      5
                    </span>
                    Step-by-Step Usage Instructions ({currentTopicData.stepByStep.length} Steps)
                  </span>
                  {expandedSections.steps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.steps && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-3.5">
                    {currentTopicData.stepByStep.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-[#1A1918] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#1A1918] text-[#DFE968] font-mono text-[10px] flex items-center justify-center font-black">
                              {step.stepNumber}
                            </span>
                            {step.title}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-[#1A1918]/30 text-[#1A1918]">
                            {step.buttonOrPath}
                          </span>
                        </div>
                        <p className="text-[#1A1918]/80 font-medium pl-7">
                          {step.action}
                        </p>
                        <p className="text-[11px] text-[#1A1918]/65 font-normal pl-7">
                          {step.details}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 6. Concrete Practical Example ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("example")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      6
                    </span>
                    Practical Real-World Example
                  </span>
                  {expandedSections.example ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.example && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-3 text-xs">
                    <h5 className="font-black text-sm text-[#1A1918]">
                      {currentTopicData.practicalExample.title}
                    </h5>

                    <div className="space-y-2">
                      <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <strong className="text-gray-900 font-bold block mb-0.5">Starting State:</strong>
                        <span className="text-gray-700">{currentTopicData.practicalExample.startingState}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200">
                        <strong className="text-blue-950 font-bold block mb-0.5">Action Taken:</strong>
                        <span className="text-blue-900">{currentTopicData.practicalExample.actionTaken}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                        <strong className="text-emerald-950 font-bold block mb-0.5">Resulting Outcome:</strong>
                        <span className="text-emerald-900">{currentTopicData.practicalExample.resultingOutcome}</span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <strong className="text-amber-950 font-bold block mb-0.5">How to Inspect:</strong>
                        <span className="text-amber-900">{currentTopicData.practicalExample.inspectionGuide}</span>
                      </div>

                      {currentTopicData.practicalExample.recoveryNote && (
                        <div className="p-2.5 rounded-lg bg-purple-50 border border-purple-200">
                          <strong className="text-purple-950 font-bold block mb-0.5">Recovery Note:</strong>
                          <span className="text-purple-900">{currentTopicData.practicalExample.recoveryNote}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── 7. Inputs & Outputs ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("inputsOutputs")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      7
                    </span>
                    Data Inputs, Outputs &amp; Persistence
                  </span>
                  {expandedSections.inputsOutputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.inputsOutputs && (
                  <div className="p-5 border-t border-[#1A1918]/15 space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Required Inputs:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {currentTopicData.inputsAndOutputs.requiredInputs.map((inp, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1A1918]/85">
                            <span className="text-[#1A1918] font-bold">•</span>
                            <span>{inp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#1A1918]/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Output Artifacts &amp; State Changes:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {currentTopicData.inputsAndOutputs.outputArtifacts.map((out, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1A1918]/85">
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{out}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#1A1918]/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/70">
                        Origin &amp; Processing Pipeline:
                      </span>
                      <p className="text-[11px] text-[#1A1918]/80 leading-relaxed font-mono bg-[#1A1918]/5 p-2 rounded-lg">
                        {currentTopicData.inputsAndOutputs.originAndProcessing}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1918]/70">
                        Generated vs. Persisted State:
                      </span>
                      <p className="text-[11px] text-[#1A1918]/80 leading-relaxed">
                        {currentTopicData.inputsAndOutputs.generatedVsPersisted}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 8. Status Indicators & Trust Principles ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("status")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      8
                    </span>
                    Status Indicators &amp; Core Invariants
                  </span>
                  {expandedSections.status ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.status && (
                  <div className="p-5 space-y-4 border-t border-[#1A1918]/15 text-xs">
                    {/* Status Badges */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Status Indicators &amp; Badges:
                      </span>
                      {currentTopicData.understandingStatus.statusBadges.map((badge) => (
                        <div
                          key={badge.status}
                          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold bg-[#1A1918] text-white px-2 py-0.5 rounded">
                              {badge.badgeLabel}
                            </span>
                            {badge.nextAction && (
                              <span className="text-[10px] text-[#1A1918]/70 font-semibold italic">
                                Action: {badge.nextAction}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1A1918]/80 leading-relaxed pt-1 font-medium">
                            {badge.meaning}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Trust Principles */}
                    <div className="space-y-2 pt-2 border-t border-[#1A1918]/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        Trust &amp; Architectural Invariants:
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {currentTopicData.understandingStatus.trustPrinciples.map((principle, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1A1918]/85">
                            <span className="text-emerald-700 font-bold">✓</span>
                            <span>{principle}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Privacy Caveat */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-800/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-[#1A1918] leading-relaxed">
                        <strong className="font-bold">Privacy Guarantee:</strong>{" "}
                        {currentTopicData.understandingStatus.privacyCaveat}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 9. Troubleshooting & Recovery ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("troubleshooting")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2 text-amber-950">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-mono flex items-center justify-center">
                      9
                    </span>
                    Troubleshooting &amp; Recovery (What can go wrong?)
                  </span>
                  {expandedSections.troubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.troubleshooting && (
                  <div className="p-4 space-y-3 border-t border-[#1A1918]/15">
                    {currentTopicData.troubleshooting.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-800/30 space-y-2 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <h5 className="font-bold text-[#1A1918] leading-snug">
                            {item.symptom}
                          </h5>
                        </div>
                        <p className="text-[#1A1918]/75 pl-6">
                          <strong className="text-[#1A1918]">Probable Cause:</strong>{" "}
                          {item.probableCause}
                        </p>
                        <p className="text-emerald-900 bg-white/90 p-2.5 rounded-lg border border-emerald-800/30 pl-3 leading-relaxed">
                          <strong className="text-[#1A1918]">Verified Remedy:</strong>{" "}
                          {item.verifiedRemedy}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 10. What happens next? ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("whatNext")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      10
                    </span>
                    What happens next? (Downstream Workflow)
                  </span>
                  {expandedSections.whatNext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whatNext && (
                  <div className="p-5 space-y-3 border-t border-[#1A1918]/15 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#1A1918]">
                        {currentTopicData.whatHappensNext.downstreamFeature}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleNavigate(currentTopicData.whatHappensNext.targetRoute)}
                        className="pill-btn pill-btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <span>Open Feature</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-[#1A1918]/80 leading-relaxed font-medium">
                      {currentTopicData.whatHappensNext.nextStepAction}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Drawer Sticky Footer */}
        <div className="p-4 bg-white border-t-2 border-[#1A1918] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/app/help"
              onClick={onClose}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Truth Standard</span>
            </Link>
            <button
              type="button"
              onClick={() => handleNavigate("/app/settings/profile")}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <User className="w-3.5 h-3.5 text-[#1A1918]" />
              <span>Profile →</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/app/settings/privacy")}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#1A1918]" />
              <span>Privacy →</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="pill-btn pill-btn-secondary text-xs py-1.5 px-4"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
