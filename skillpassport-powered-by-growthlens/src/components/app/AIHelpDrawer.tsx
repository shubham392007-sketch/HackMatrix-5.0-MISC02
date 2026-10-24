"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  X,
  Search,
  Cpu,
  Sparkles,
  Fingerprint,
  Layers,
  Scale,
  Percent,
  GitCompare,
  BookOpen,
  Compass,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  AI_HELP_TOPICS,
  AI_GUIDED_WORKFLOWS,
  AI_CONCEPTUAL_GLOSSARY,
  AIHelpTopicId,
  AIHelpTopic,
  getAIHelpTopicIdFromPathname,
} from "@/data/aiHelpContent";

interface AIHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: AIHelpTopicId;
  currentPathname?: string;
}

const AI_TOPIC_NAVIGATION_ITEMS: Array<{
  id: AIHelpTopicId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "ai-overview", label: "AI Overview", icon: Cpu },
  { id: "ai-work-analysis", label: "AI Work Analysis", icon: Sparkles },
  { id: "skill-extraction", label: "Skill Extraction", icon: Fingerprint },
  { id: "evidence-mapping", label: "Evidence Mapping", icon: Layers },
  { id: "verification-review", label: "Verification Review", icon: Scale },
  { id: "confidence-uncertainty", label: "Confidence & Uncertainty", icon: Percent },
  { id: "conflict-resolution", label: "Conflict Resolution", icon: GitCompare },
  { id: "workflows", label: "Guided Workflows (4)", icon: Compass },
  { id: "glossary", label: "Trust Glossary (14)", icon: BookOpen },
];

export default function AIHelpDrawer({
  isOpen,
  onClose,
  initialTopicId,
  currentPathname = "",
}: AIHelpDrawerProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine initial active topic
  const defaultTopic = useMemo(() => {
    if (initialTopicId) return initialTopicId;
    if (currentPathname) return getAIHelpTopicIdFromPathname(currentPathname);
    return "ai-overview";
  }, [initialTopicId, currentPathname]);

  const [activeTopic, setActiveTopic] = useState<AIHelpTopicId>(defaultTopic);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purpose: true,
    whenToUse: true,
    prerequisites: true,
    steps: true,
    example: true,
    inputsOutputs: true,
    trust: true,
    troubleshooting: true,
    whatNext: true,
    status: true,
  });

  // Keep active topic synchronized when drawer opens or path changes
  useEffect(() => {
    if (isOpen) {
      const topic = initialTopicId || (currentPathname ? getAIHelpTopicIdFromPathname(currentPathname) : "ai-overview");
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

  // Search filtering
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();

    // Search topics
    const matchingTopics = Object.values(AI_HELP_TOPICS).filter((t) => {
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
    const matchingWorkflows = AI_GUIDED_WORKFLOWS.filter((wf) => {
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
    const matchingGlossary = AI_CONCEPTUAL_GLOSSARY.filter((g) => {
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

  const currentTopicData: AIHelpTopic | undefined =
    activeTopic !== "workflows" && activeTopic !== "glossary"
      ? AI_HELP_TOPICS[activeTopic as keyof typeof AI_HELP_TOPICS]
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="AI Intelligence Help & Conceptual Guidance"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-[#1C1C1C]/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        ref={drawerRef}
        className="relative z-10 w-full max-w-2xl bg-[#FBF6DF] text-[#1C1C1C] h-full shadow-2xl border-l-2 border-[#1C1C1C] flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 bg-[#DFE968]/30 border-b-2 border-[#1C1C1C] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1C1C1C] text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-[#DFE968]" />
                Domain Guide
              </span>
              <span className="text-[11px] font-mono text-[#1C1C1C]/60 font-semibold">
                Policy v2026.1
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1C1C1C] tracking-tight">
              AI Intelligence Help
            </h2>
            <p className="text-xs text-[#1C1C1C]/80 font-medium leading-relaxed">
              Understand AI analysis, skill extraction, evidence mapping, verification, uncertainty, and conflict resolution.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Intelligence Help"
            className="p-2 rounded-xl bg-white border border-[#1C1C1C] text-[#1C1C1C] hover:bg-[#1C1C1C] hover:text-white transition-all shadow-[1.5px_1.5px_0_0_#1C1C1C] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-[#1C1C1C]/15 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#1C1C1C]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search AI features, steps, errors, or terms (e.g. 'Ollama fallback', 'uncertainty flags', 'verification gates')..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#1C1C1C]/25 text-xs text-[#1C1C1C] placeholder:text-[#1C1C1C]/40 bg-[#FBF6DF]/30 font-medium focus:outline-none focus:border-[#1C1C1C] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#1C1C1C]/10 text-[#1C1C1C]/60"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Topic Navigation Tabs */}
        {!searchQuery && (
          <div className="px-4 py-2.5 bg-[#FBF1CF]/60 border-b border-[#1C1C1C]/15 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 min-w-max">
              {AI_TOPIC_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTopic === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTopic(item.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                      isActive
                        ? "bg-[#1C1C1C] text-[#FBF6DF] border-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : "bg-white/80 text-[#1C1C1C]/80 border-[#1C1C1C]/15 hover:bg-white hover:text-[#1C1C1C]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DFE968]" : "text-[#1C1C1C]/60"}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* ───────────────────────────────────────────────────────────── */}
          {/* SEARCH RESULTS VIEW */}
          {/* ───────────────────────────────────────────────────────────── */}
          {searchResults ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-[#1C1C1C]/15">
                <span className="text-xs font-bold text-[#1C1C1C]/70">
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-[#1C1C1C] underline hover:opacity-75"
                >
                  Clear Results
                </button>
              </div>

              {searchResults.topics.length === 0 &&
              searchResults.workflows.length === 0 &&
              searchResults.glossary.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white border border-[#1C1C1C]/15 space-y-2">
                  <AlertCircle className="w-8 h-8 text-[#1C1C1C]/40 mx-auto" />
                  <h4 className="text-sm font-bold text-[#1C1C1C]">No Matching AI Guidance Found</h4>
                  <p className="text-xs text-[#1C1C1C]/60 max-w-sm mx-auto">
                    Try searching for broader terms like &ldquo;work analysis&rdquo;, &ldquo;extraction&rdquo;, &ldquo;verification&rdquo;, &ldquo;conflict&rdquo;, or &ldquo;confidence&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Topic Matches */}
                  {searchResults.topics.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/50">
                        AI Feature Guides ({searchResults.topics.length})
                      </h4>
                      {searchResults.topics.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveTopic(t.id);
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1C1C1C] hover:bg-[#DFE968]/20 transition-all cursor-pointer shadow-[2px_2px_0_0_#1C1C1C] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#1C1C1C]" />
                              {t.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#DFE968] text-[#1C1C1C] px-2 py-0.5 rounded">
                              View Guide →
                            </span>
                          </div>
                          <p className="text-xs text-[#1C1C1C]/70 line-clamp-2">{t.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Workflow Matches */}
                  {searchResults.workflows.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/50">
                        Guided AI Workflows ({searchResults.workflows.length})
                      </h4>
                      {searchResults.workflows.map((wf) => (
                        <div
                          key={wf.id}
                          onClick={() => {
                            setActiveTopic("workflows");
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1C1C1C] hover:bg-[#DFE968]/20 transition-all cursor-pointer shadow-[2px_2px_0_0_#1C1C1C] space-y-1.5"
                        >
                          <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#1C1C1C]" />
                            {wf.title}
                          </span>
                          <p className="text-xs text-[#1C1C1C]/70 line-clamp-2">{wf.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Glossary Matches */}
                  {searchResults.glossary.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1C1C1C]/50">
                        Trust Glossary ({searchResults.glossary.length})
                      </h4>
                      {searchResults.glossary.map((g) => (
                        <div
                          key={g.term}
                          className="p-4 rounded-xl bg-white border border-[#1C1C1C]/20 shadow-sm space-y-1"
                        >
                          <h5 className="text-xs font-bold text-[#1C1C1C]">{g.term}</h5>
                          <p className="text-xs text-[#1C1C1C]/80 leading-relaxed">{g.definition}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : activeTopic === "workflows" ? (
            /* ───────────────────────────────────────────────────────────── */
            /* GUIDED WORKFLOWS TAB */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#DFE968]/20 border border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-1">
                <h3 className="text-sm font-black text-[#1C1C1C] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#1C1C1C]" />
                  4 Core AI Intelligence Workflows
                </h3>
                <p className="text-xs text-[#1C1C1C]/75">
                  End-to-end operational execution paths showing how evidence passes from analysis to taxonomy extraction, citation auditing, and human verification.
                </p>
              </div>

              <div className="space-y-6">
                {AI_GUIDED_WORKFLOWS.map((wf) => (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-4"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1C1C1C] text-white px-2 py-0.5 rounded">
                        {wf.id.replace("workflow-", "Guide: ")}
                      </span>
                      <h4 className="text-base font-black text-[#1C1C1C] mt-1.5">{wf.title}</h4>
                      <p className="text-xs text-[#1C1C1C]/75 mt-1 leading-relaxed">{wf.summary}</p>
                    </div>

                    {/* Step-by-step phases */}
                    <div className="space-y-2.5 pt-2 border-t border-[#1C1C1C]/10">
                      {wf.phases.map((phase) => (
                        <div
                          key={phase.phaseNumber}
                          className="p-3 rounded-xl bg-[#FBF6DF] border border-[#1C1C1C]/15 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#1C1C1C] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#1C1C1C] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                {phase.phaseNumber}
                              </span>
                              {phase.featureTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleNavigate(phase.route)}
                              className="text-[10px] font-bold text-[#1C1C1C] hover:underline flex items-center gap-0.5"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="text-xs space-y-1 pl-6">
                            <p className="text-[#1C1C1C]/80">
                              <strong className="text-[#1C1C1C]">Action:</strong> {phase.action}
                            </p>
                            <p className="text-[#1C1C1C]/70">
                              <strong className="text-[#1C1C1C]">Outcome:</strong> {phase.outcome}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Key takeaway */}
                    <div className="p-3 rounded-xl bg-[#DFE968]/30 border border-[#1C1C1C]/20 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-[#1C1C1C] leading-relaxed">
                        <strong className="font-bold">Key Architectural Takeaway:</strong> {wf.keyTakeaway}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTopic === "glossary" ? (
            /* ───────────────────────────────────────────────────────────── */
            /* TRUST GLOSSARY TAB */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#DFE968]/20 border border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-1">
                <h3 className="text-sm font-black text-[#1C1C1C] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1C1C1C]" />
                  Trust Glossary &amp; Conceptual Distinctions ({AI_CONCEPTUAL_GLOSSARY.length} Terms)
                </h3>
                <p className="text-xs text-[#1C1C1C]/75">
                  Essential definitions clarifying the boundary between model hypotheses, observed code facts, and empirical human verification.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {AI_CONCEPTUAL_GLOSSARY.map((item) => (
                  <div
                    key={item.term}
                    className="p-4 rounded-2xl bg-white border border-[#1C1C1C] shadow-[2px_2px_0_0_#1C1C1C] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-[#1C1C1C]">{item.term}</h4>
                      {item.relatedRoute && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(item.relatedRoute!)}
                          className="text-[10px] font-bold text-[#1C1C1C] bg-[#DFE968] px-2 py-0.5 rounded border border-[#1C1C1C] hover:opacity-85 flex items-center gap-1 shrink-0"
                        >
                          <span>{item.relatedRouteLabel || "Open"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#1C1C1C] leading-relaxed font-medium">
                      {item.definition}
                    </p>
                    <p className="text-[11px] text-[#1C1C1C]/70 leading-relaxed italic bg-[#FBF6DF] p-2.5 rounded-xl border border-[#1C1C1C]/10">
                      Context: {item.context}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : currentTopicData ? (
            /* ───────────────────────────────────────────────────────────── */
            /* INDIVIDUAL FEATURE GUIDANCE (ALL 9 SECTIONS) */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Feature Header Card */}
              <div className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#DFE968] text-[#1C1C1C] px-2 py-0.5 rounded border border-[#1C1C1C]">
                        {currentTopicData.badgeLabel}
                      </span>
                      <span className="text-[11px] font-mono text-[#1C1C1C]/50">
                        {currentTopicData.canonicalRoute}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#1C1C1C]">
                      {currentTopicData.title}
                    </h3>
                  </div>

                  {currentTopicData.canonicalRoute && (
                    <button
                      type="button"
                      onClick={() => handleNavigate(currentTopicData.canonicalRoute)}
                      className="pill-btn pill-btn-primary text-xs py-2 px-3.5 flex items-center gap-1.5 shrink-0"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-[#1C1C1C]/80 font-medium leading-relaxed">
                  {currentTopicData.summary}
                </p>
              </div>

              {/* ── 1. Purpose ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("purpose")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      1
                    </span>
                    What is this feature for?
                  </span>
                  {expandedSections.purpose ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.purpose && (
                  <div className="p-5 text-xs text-[#1C1C1C]/85 leading-relaxed space-y-3 border-t border-[#1C1C1C]/15">
                    <p className="font-medium text-sm text-[#1C1C1C]">{currentTopicData.purpose}</p>
                  </div>
                )}
              </div>

              {/* ── 2. When should I use it? ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("whenToUse")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      2
                    </span>
                    When should I use it?
                  </span>
                  {expandedSections.whenToUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whenToUse && (
                  <div className="p-5 text-xs space-y-2 border-t border-[#1C1C1C]/15">
                    <p className="text-[#1C1C1C]/70 font-medium pb-1">
                      Target moments and trigger situations to use this screen:
                    </p>
                    <ul className="space-y-2">
                      {currentTopicData.whenToUse.map((moment, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1C1C1C]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{moment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 3. Prerequisites ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("prerequisites")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      3
                    </span>
                    What must be available before starting?
                  </span>
                  {expandedSections.prerequisites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.prerequisites && (
                  <div className="p-5 text-xs space-y-2 border-t border-[#1C1C1C]/15">
                    <ul className="space-y-2">
                      {currentTopicData.prerequisites.map((prereq, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1C1C1C]">
                          <Info className="w-4 h-4 text-[#1C1C1C]/60 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 4. How to use it (Step-by-Step) ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("steps")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      4
                    </span>
                    How do I use it, step by step?
                  </span>
                  {expandedSections.steps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.steps && (
                  <div className="p-5 space-y-3.5 border-t border-[#1C1C1C]/15">
                    {currentTopicData.stepByStep.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-3.5 rounded-xl bg-[#FBF6DF] border border-[#1C1C1C]/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-[#1C1C1C] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#1C1C1C] text-white text-[11px] font-mono font-bold flex items-center justify-center">
                              {step.stepNumber}
                            </span>
                            {step.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#1C1C1C] font-semibold pl-7">{step.action}</p>
                        <div className="pl-7 flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-[#DFE968] text-[#1C1C1C] px-2 py-0.5 rounded border border-[#1C1C1C]/30">
                            {step.buttonOrPath}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1C1C1C]/75 pl-7 leading-relaxed">{step.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 5. Practical Example (Illustrative) ── */}
              <div className="rounded-2xl bg-[#DFE968]/20 border-2 border-[#1C1C1C] shadow-[3px_3px_0_0_#1C1C1C] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1C1C1C] text-[#DFE968] px-2 py-0.5 rounded">
                    Practical Example
                  </span>
                  <span className="text-[10px] font-mono text-[#1C1C1C]/60 italic font-bold">
                    Illustrative Scenario (Not Live Data)
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#1C1C1C]">
                  {currentTopicData.practicalExample.title}
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-[#1C1C1C]/80">
                    <strong className="text-[#1C1C1C]">Starting State:</strong>{" "}
                    {currentTopicData.practicalExample.startingState}
                  </p>
                  <p className="text-[#1C1C1C]/80">
                    <strong className="text-[#1C1C1C]">Action Performed:</strong>{" "}
                    {currentTopicData.practicalExample.actionTaken}
                  </p>
                  <p className="text-emerald-900 bg-white/80 p-2.5 rounded-xl border border-[#1C1C1C]/20 leading-relaxed">
                    <strong className="text-[#1C1C1C]">Resulting Outcome:</strong>{" "}
                    {currentTopicData.practicalExample.resultingOutcome}
                  </p>
                  <p className="text-[#1C1C1C]/80 bg-[#FBF6DF] p-2.5 rounded-xl border border-[#1C1C1C]/15">
                    <strong className="text-[#1C1C1C]">How to Inspect:</strong>{" "}
                    {currentTopicData.practicalExample.inspectionGuide}
                  </p>
                  {currentTopicData.practicalExample.recoveryNote && (
                    <p className="text-[11px] text-[#1C1C1C]/70 italic">
                      Recovery Note: {currentTopicData.practicalExample.recoveryNote}
                    </p>
                  )}
                </div>
              </div>

              {/* ── 6. Inputs & Outputs ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("inputsOutputs")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      6
                    </span>
                    Inputs, Outputs &amp; Persistence
                  </span>
                  {expandedSections.inputsOutputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.inputsOutputs && (
                  <div className="p-5 space-y-4 border-t border-[#1C1C1C]/15 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                        Required Inputs:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {currentTopicData.inputsAndOutputs.requiredInputs.map((inp, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1C1C1C]/80">
                            <span className="text-[#1C1C1C] font-bold">•</span>
                            <span>{inp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#1C1C1C]/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                        Produced Output Artifacts:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {currentTopicData.inputsAndOutputs.outputArtifacts.map((out, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-900">
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                            <span>{out}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-2 border-t border-[#1C1C1C]/10 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1C1C]/70">
                        Origin &amp; Processing Pipeline:
                      </span>
                      <p className="text-[11px] text-[#1C1C1C]/80 leading-relaxed font-mono bg-[#1C1C1C]/5 p-2 rounded-lg">
                        {currentTopicData.inputsAndOutputs.originAndProcessing}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1C1C1C]/70">
                        Generated vs. Persisted State:
                      </span>
                      <p className="text-[11px] text-[#1C1C1C]/80 leading-relaxed">
                        {currentTopicData.inputsAndOutputs.generatedVsPersisted}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 7. Interpretation & Trust ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("trust")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      7
                    </span>
                    Interpretation, Trust &amp; Confidence
                  </span>
                  {expandedSections.trust ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.trust && (
                  <div className="p-5 space-y-4 border-t border-[#1C1C1C]/15 text-xs">
                    {/* Status Badges */}
                    <div className="space-y-2.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C]">
                        Status Indicators &amp; Badges:
                      </span>
                      {currentTopicData.interpretationAndTrust.statusBadges.map((badge) => (
                        <div
                          key={badge.status}
                          className="p-3 rounded-xl bg-[#FBF6DF] border border-[#1C1C1C]/15 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold bg-[#1C1C1C] text-white px-2 py-0.5 rounded">
                              {badge.badgeLabel}
                            </span>
                            {badge.nextAction && (
                              <span className="text-[10px] text-[#1C1C1C]/70 font-semibold italic">
                                Action: {badge.nextAction}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1C1C1C]/80 leading-relaxed pt-1 font-medium">
                            {badge.meaning}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Trust Principles */}
                    <div className="space-y-2 pt-2 border-t border-[#1C1C1C]/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1C1C1C] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        Architectural Trust Principles:
                      </span>
                      <ul className="space-y-1.5 pl-1">
                        {currentTopicData.interpretationAndTrust.trustPrinciples.map((principle, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1C1C1C]/85">
                            <span className="text-emerald-700 font-bold">✓</span>
                            <span>{principle}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Non-Negotiable Confidence Caveat */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-800/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-[#1C1C1C] leading-relaxed">
                        <strong className="font-bold">Model Confidence Caveat:</strong>{" "}
                        {currentTopicData.interpretationAndTrust.confidenceCaveat}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 8. Troubleshooting ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("troubleshooting")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2 text-amber-950">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-mono flex items-center justify-center">
                      8
                    </span>
                    Troubleshooting &amp; Recovery (What can go wrong?)
                  </span>
                  {expandedSections.troubleshooting ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.troubleshooting && (
                  <div className="p-4 space-y-3 border-t border-[#1C1C1C]/15">
                    {currentTopicData.troubleshooting.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-800/30 space-y-2 text-xs"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <h5 className="font-bold text-[#1C1C1C] leading-snug">
                            {item.symptom}
                          </h5>
                        </div>
                        <p className="text-[#1C1C1C]/75 pl-6">
                          <strong className="text-[#1C1C1C]">Probable Cause:</strong>{" "}
                          {item.probableCause}
                        </p>
                        <p className="text-emerald-900 bg-white/90 p-2.5 rounded-lg border border-emerald-800/30 pl-3 leading-relaxed">
                          <strong className="text-[#1C1C1C]">Verified Remedy:</strong>{" "}
                          {item.verifiedRemedy}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 9. What happens next? ── */}
              <div className="rounded-2xl bg-white border border-[#1C1C1C] shadow-[2.5px_2.5px_0_0_#1C1C1C] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("whatNext")}
                  className="w-full p-4 bg-[#FBF1CF]/60 hover:bg-[#FBF1CF] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1C1C1C]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1C1C1C] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      9
                    </span>
                    What happens next? (Downstream Workflow)
                  </span>
                  {expandedSections.whatNext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whatNext && (
                  <div className="p-5 space-y-3 border-t border-[#1C1C1C]/15 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#1C1C1C]">
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
                    <p className="text-[#1C1C1C]/80 leading-relaxed">
                      {currentTopicData.whatHappensNext.nextStepAction}
                    </p>
                  </div>
                )}
              </div>

              {/* Implementation Status Card */}
              <div className="p-4 rounded-xl bg-white/80 border border-[#1C1C1C]/20 shadow-sm space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1C1C1C]/60">
                    Implementation Integrity Status
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {currentTopicData.implementationStatus.state === "fully_implemented" ? "Fully Implemented" : "Partially Implemented"}
                  </span>
                </div>
                <p className="text-[11px] text-[#1C1C1C]/70">
                  {currentTopicData.implementationStatus.notes}
                </p>
              </div>

              {/* Related Live Links */}
              {currentTopicData.relatedLinks && currentTopicData.relatedLinks.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#1C1C1C]/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-[#1C1C1C]/70 font-bold">Related Destinations:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentTopicData.relatedLinks.map((link, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleNavigate(link.href)}
                        className="px-3 py-1.5 rounded-xl bg-[#1C1C1C] text-white hover:bg-[#1C1C1C]/80 font-semibold flex items-center gap-1.5 shadow-[1px_1px_0_0_#1C1C1C] transition-all"
                      >
                        <span>{link.label}</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Drawer Sticky Footer */}
        <div className="p-4 bg-white border-t-2 border-[#1C1C1C] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/app/help"
              onClick={onClose}
              className="text-xs font-bold text-[#1C1C1C]/80 hover:text-[#1C1C1C] flex items-center gap-1.5 underline underline-offset-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Architecture</span>
            </Link>
            <button
              type="button"
              onClick={() => handleNavigate("/app/evidence")}
              className="text-xs font-bold text-[#1C1C1C]/80 hover:text-[#1C1C1C] flex items-center gap-1.5 underline underline-offset-2"
            >
              <Layers className="w-3.5 h-3.5 text-[#1C1C1C]" />
              <span>Switch to Evidence Workspace Guide →</span>
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
