"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  X,
  Search,
  Layers,
  FolderSync,
  UploadCloud,
  Library,
  Activity,
  Lock,
  BookOpen,
  GitBranch,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Sparkles,
  Info,
  Check,
  Compass,
} from "lucide-react";
import {
  EVIDENCE_HELP_TOPICS,
  GUIDED_WORKFLOWS,
  CONCEPTUAL_GLOSSARY,
  HelpTopicId,
  EvidenceHelpTopic,
  getHelpTopicIdFromPathname,
} from "@/data/evidenceHelpContent";

interface EvidenceHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: HelpTopicId;
  currentPathname?: string;
}

const TOPIC_NAVIGATION_ITEMS: Array<{
  id: HelpTopicId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "overview", label: "Overview", icon: Layers },
  { id: "evidence-center", label: "Evidence Center", icon: Layers },
  { id: "connected-sources", label: "Connected Sources", icon: FolderSync },
  { id: "upload-work", label: "Upload Work & Docs", icon: UploadCloud },
  { id: "evidence-library", label: "Evidence Library", icon: Library },
  { id: "ingestion-runs", label: "Ingestion Runs", icon: Activity },
  { id: "data-permissions", label: "Data & Permissions", icon: Lock },
  { id: "workflows", label: "Guided Workflows (4)", icon: GitBranch },
  { id: "glossary", label: "Glossary (13+)", icon: BookOpen },
];

export default function EvidenceHelpDrawer({
  isOpen,
  onClose,
  initialTopicId,
  currentPathname = "",
}: EvidenceHelpDrawerProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine initial active topic
  const defaultTopic = useMemo(() => {
    if (initialTopicId) return initialTopicId;
    if (currentPathname) return getHelpTopicIdFromPathname(currentPathname);
    return "overview";
  }, [initialTopicId, currentPathname]);

  const [activeTopic, setActiveTopic] = useState<HelpTopicId>(defaultTopic);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    purpose: true,
    whenToUse: true,
    steps: true,
    inputsOutputs: true,
    example: true,
    statuses: true,
    troubleshooting: true,
  });

  // Keep active topic synchronized when drawer opens or path changes
  useEffect(() => {
    if (isOpen) {
      const topic = initialTopicId || (currentPathname ? getHelpTopicIdFromPathname(currentPathname) : "overview");
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
    const matchingTopics = Object.values(EVIDENCE_HELP_TOPICS).filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q) ||
        t.whenToUse.some((w) => w.toLowerCase().includes(q)) ||
        t.stepByStep.some((s) => s.title.toLowerCase().includes(q) || s.action.toLowerCase().includes(q) || s.details.toLowerCase().includes(q)) ||
        t.troubleshooting.some((tb) => tb.symptom.toLowerCase().includes(q) || tb.verifiedRemedy.toLowerCase().includes(q))
      );
    });

    // Search workflows
    const matchingWorkflows = GUIDED_WORKFLOWS.filter((wf) => {
      return (
        wf.title.toLowerCase().includes(q) ||
        wf.summary.toLowerCase().includes(q) ||
        wf.phases.some((p) => p.action.toLowerCase().includes(q) || p.outcome.toLowerCase().includes(q))
      );
    });

    // Search glossary
    const matchingGlossary = CONCEPTUAL_GLOSSARY.filter((g) => {
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

  const currentTopicData: EvidenceHelpTopic | undefined =
    activeTopic !== "workflows" && activeTopic !== "glossary"
      ? EVIDENCE_HELP_TOPICS[activeTopic as keyof typeof EVIDENCE_HELP_TOPICS]
      : undefined;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Product Help & Conceptual Guidance">
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
        <div className="p-5 sm:p-6 bg-[#FAF8F5] border-b-2 border-[#1A1918] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1A1918] text-white font-mono text-[10px] font-bold uppercase tracking-wider">
                <HelpCircle className="w-3 h-3 text-[#DFE968]" />
                Evidence Workspace Guide
              </span>
              <span className="text-[11px] font-mono text-[#1A1918]/60 font-semibold">
                v1.4 Interactive
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] tracking-tight">
              Product Help &amp; Conceptual Guidance
            </h2>
            <p className="text-xs text-[#1A1918]/80 font-medium leading-relaxed">
              Domain documentation, step-by-step feature walkthroughs, and error recovery for Evidence Workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Product Help"
            className="p-2 rounded-xl bg-white border border-[#1A1918] text-[#1A1918] hover:bg-[#1A1918] hover:text-white transition-all shadow-[1.5px_1.5px_0_0_#1A1918] shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-5 py-3.5 bg-white border-b border-[#1A1918]/15 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-[#1A1918]/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search help topics, steps, errors, or glossary (e.g. 'GitHub PAT', 'retry run', 'provenance')..."
              className="w-full pl-10 pr-9 py-2 rounded-xl border border-[#1A1918]/25 text-xs text-[#1A1918] placeholder:text-[#1A1918]/40 bg-[#FAF8F5]/30 font-medium focus:outline-none focus:border-[#1A1918] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-[#1A1918]/10 text-[#1A1918]/60"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Topic Navigation Tabs */}
        {!searchQuery && (
          <div className="px-4 py-2.5 bg-[#FAF8F5]/60 border-b border-[#1A1918]/15 overflow-x-auto no-scrollbar shrink-0">
            <div className="flex items-center gap-1.5 min-w-max">
              {TOPIC_NAVIGATION_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTopic === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTopic(item.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all border ${
                      isActive
                        ? "bg-[#1A1918] text-[#FBF6DF] border-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918]"
                        : "bg-white/80 text-[#1A1918]/80 border-[#1A1918]/15 hover:bg-white hover:text-[#1A1918]"
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#DFE968]" : "text-[#1A1918]/60"}`} />
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
              <div className="flex items-center justify-between pb-2 border-b border-[#1A1918]/15">
                <span className="text-xs font-bold text-[#1A1918]/70">
                  Search Results for &ldquo;{searchQuery}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-bold text-[#1A1918] underline hover:opacity-75"
                >
                  Clear Results
                </button>
              </div>

              {searchResults.topics.length === 0 &&
              searchResults.workflows.length === 0 &&
              searchResults.glossary.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-white border border-[#1A1918]/15 space-y-2">
                  <AlertCircle className="w-8 h-8 text-[#1A1918]/40 mx-auto" />
                  <h4 className="text-sm font-bold text-[#1A1918]">No Matching Guidance Found</h4>
                  <p className="text-xs text-[#1A1918]/60 max-w-sm mx-auto">
                    Try searching for broader terms like &ldquo;github&rdquo;, &ldquo;upload&rdquo;, &ldquo;retry&rdquo;, &ldquo;verification&rdquo;, or &ldquo;evidence&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Topic Matches */}
                  {searchResults.topics.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918]/50">
                        Feature Guides ({searchResults.topics.length})
                      </h4>
                      {searchResults.topics.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveTopic(t.id);
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1A1918] hover:bg-[#000000]/5 transition-all cursor-pointer shadow-[2px_2px_0_0_#1A1918] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5">
                              <Layers className="w-3.5 h-3.5 text-[#1A1918]" />
                              {t.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#000000] text-[#FAF8F5] px-2 py-0.5 rounded">
                              View Guide →
                            </span>
                          </div>
                          <p className="text-xs text-[#1A1918]/70 line-clamp-2">{t.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Workflow Matches */}
                  {searchResults.workflows.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918]/50">
                        Guided Workflows ({searchResults.workflows.length})
                      </h4>
                      {searchResults.workflows.map((wf) => (
                        <div
                          key={wf.id}
                          onClick={() => {
                            setActiveTopic("workflows");
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1A1918] hover:bg-[#000000]/5 transition-all cursor-pointer shadow-[2px_2px_0_0_#1A1918] space-y-1.5"
                        >
                          <span className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5">
                            <GitBranch className="w-3.5 h-3.5 text-[#1A1918]" />
                            {wf.title}
                          </span>
                          <p className="text-xs text-[#1A1918]/70 line-clamp-2">{wf.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Glossary Matches */}
                  {searchResults.glossary.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918]/50">
                        Glossary Terms ({searchResults.glossary.length})
                      </h4>
                      {searchResults.glossary.map((g) => (
                        <div
                          key={g.term}
                          className="p-4 rounded-xl bg-white border border-[#1A1918]/20 shadow-sm space-y-1"
                        >
                          <h5 className="text-xs font-bold text-[#1A1918]">{g.term}</h5>
                          <p className="text-xs text-[#1A1918]/80 leading-relaxed">{g.definition}</p>
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
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] space-y-1">
                <h3 className="text-sm font-black text-[#1A1918] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#1A1918]" />
                  4 Core Guided Workflows
                </h3>
                <p className="text-xs text-[#1A1918]/75">
                  End-to-end execution paths showing how evidence traverses the workspace from ingestion to verified credential.
                </p>
              </div>

              <div className="space-y-6">
                {GUIDED_WORKFLOWS.map((wf, idx) => (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1A1918] text-white px-2 py-0.5 rounded">
                        Workflow {idx + 1}
                      </span>
                      <h4 className="text-base font-black text-[#1A1918] mt-1.5">{wf.title}</h4>
                      <p className="text-xs text-[#1A1918]/75 mt-1 leading-relaxed">{wf.summary}</p>
                    </div>

                    {/* Step-by-step phases */}
                    <div className="space-y-2.5 pt-2 border-t border-[#1A1918]/10">
                      {wf.phases.map((phase) => (
                        <div
                          key={phase.phaseNumber}
                          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-[#1A1918] text-white text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                                {phase.phaseNumber}
                              </span>
                              {phase.featureTitle}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleNavigate(phase.route)}
                              className="text-[10px] font-bold text-[#1A1918] hover:underline flex items-center gap-0.5"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          </div>
                          <div className="text-xs space-y-1 pl-6">
                            <p className="text-[#1A1918]/80">
                              <strong className="text-[#1A1918]">Action:</strong> {phase.action}
                            </p>
                            <p className="text-[#1A1918]/70">
                              <strong className="text-[#1A1918]">Outcome:</strong> {phase.outcome}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Key takeaway */}
                    <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/20 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-[#1A1918] leading-relaxed">
                        <strong className="font-bold">Key Architectural Takeaway:</strong> {wf.keyTakeaway}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTopic === "glossary" ? (
            /* ───────────────────────────────────────────────────────────── */
            /* CONCEPTUAL GLOSSARY TAB */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] space-y-1">
                <h3 className="text-sm font-black text-[#1A1918] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1A1918]" />
                  Conceptual Glossary ({CONCEPTUAL_GLOSSARY.length} Terms)
                </h3>
                <p className="text-xs text-[#1A1918]/75">
                  Core domain terminology, mathematical definitions, and architectural principles governing Skill Passport.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {CONCEPTUAL_GLOSSARY.map((item) => (
                  <div
                    key={item.term}
                    className="p-4 rounded-2xl bg-white border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-black text-[#1A1918]">{item.term}</h4>
                      {item.relatedRoute && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(item.relatedRoute!)}
                          className="text-[10px] font-bold text-[#FAF8F5] bg-[#000000] px-2 py-0.5 rounded border border-[#1A1918] hover:opacity-85 flex items-center gap-1 shrink-0"
                        >
                          <span>{item.relatedRouteLabel || "Open"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#1A1918] leading-relaxed font-medium">
                      {item.definition}
                    </p>
                    <p className="text-[11px] text-[#1A1918]/70 leading-relaxed italic bg-[#FAF8F5] p-2.5 rounded-xl border border-[#1A1918]/10">
                      Context: {item.context}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : currentTopicData ? (
            /* ───────────────────────────────────────────────────────────── */
            /* INDIVIDUAL FEATURE GUIDANCE (ANSWERS THE 5 QUESTIONS) */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Feature Header Card */}
              <div className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#000000] text-[#FAF8F5] px-2 py-0.5 rounded border border-[#1A1918]">
                        {currentTopicData.badgeLabel}
                      </span>
                      <span className="text-[11px] font-mono text-[#1A1918]/50">
                        {currentTopicData.canonicalRoute}
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-[#1A1918]">
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

                <p className="text-xs text-[#1A1918]/80 font-medium leading-relaxed">
                  {currentTopicData.summary}
                </p>
              </div>

              {/* ── QUESTION 1: What is this feature for? ── */}
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
                    What is this feature for?
                  </span>
                  {expandedSections.purpose ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.purpose && (
                  <div className="p-5 text-xs text-[#1A1918]/85 leading-relaxed space-y-3 border-t border-[#1A1918]/15">
                    <p className="font-medium text-sm text-[#1A1918]">{currentTopicData.purpose}</p>
                    {currentTopicData.prerequisites && currentTopicData.prerequisites.length > 0 && (
                      <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#1A1918] flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-[#1A1918]" />
                          Prerequisites &amp; Access Requirements:
                        </span>
                        <ul className="list-disc list-inside space-y-1 text-xs text-[#1A1918]/80">
                          {currentTopicData.prerequisites.map((prereq, i) => (
                            <li key={i}>{prereq}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── QUESTION 2: When should I use it? ── */}
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
                    When should I use it?
                  </span>
                  {expandedSections.whenToUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whenToUse && (
                  <div className="p-5 text-xs space-y-2 border-t border-[#1A1918]/15">
                    <p className="text-[#1A1918]/70 font-medium pb-1">
                      Recommended moments and trigger situations to use this screen:
                    </p>
                    <ul className="space-y-2">
                      {currentTopicData.whenToUse.map((moment, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1A1918]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{moment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── QUESTION 3: How do I use it, step by step? ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("steps")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      3
                    </span>
                    How do I use it, step by step?
                  </span>
                  {expandedSections.steps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.steps && (
                  <div className="p-5 space-y-3.5 border-t border-[#1A1918]/15">
                    {currentTopicData.stepByStep.map((step) => (
                      <div
                        key={step.stepNumber}
                        className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/20 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-[#1A1918] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-[#1A1918] text-white text-[11px] font-mono font-bold flex items-center justify-center">
                              {step.stepNumber}
                            </span>
                            {step.title}
                          </span>
                        </div>
                        <p className="text-xs text-[#1A1918] font-semibold pl-7">{step.action}</p>
                        <div className="pl-7 flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-[#000000] text-[#FAF8F5] px-2 py-0.5 rounded border border-[#1A1918]/30">
                            {step.buttonOrPath}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1A1918]/75 pl-7 leading-relaxed">{step.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── QUESTION 4: What inputs do I need, and what outputs are expected? ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("inputsOutputs")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#1A1918] text-[#DFE968] text-xs font-mono flex items-center justify-center">
                      4
                    </span>
                    What inputs do I need &amp; what outputs should I expect?
                  </span>
                  {expandedSections.inputsOutputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.inputsOutputs && (
                  <div className="p-5 space-y-4 border-t border-[#1A1918]/15 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Required Inputs &amp; Credentials:
                      </span>
                      <ul className="space-y-1 pl-1">
                        {currentTopicData.inputsAndOutputs.requiredInputs.map((inp, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-[#1A1918]/80">
                            <span className="text-[#1A1918] font-bold">•</span>
                            <span>{inp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-[#1A1918]/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Expected Result Artifacts:
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

                    {currentTopicData.inputsAndOutputs.supportedFormatsOrSources && (
                      <div className="pt-2 border-t border-[#1A1918]/10 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#1A1918]/60">Supported:</span>
                        {currentTopicData.inputsAndOutputs.supportedFormatsOrSources.map((fmt, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono font-bold bg-[#1A1918]/5 text-[#1A1918] px-2 py-0.5 rounded border border-[#1A1918]/15"
                          >
                            {fmt}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── CONCRETE PRACTICAL EXAMPLE (ILLUSTRATIVE) ── */}
              <div className="rounded-2xl bg-[#FAF8F5] border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1A1918] text-[#DFE968] px-2 py-0.5 rounded">
                    Concrete Practical Example
                  </span>
                  <span className="text-[10px] font-mono text-[#1A1918]/60 italic font-bold">
                    Illustrative Scenario
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#1A1918]">
                  {currentTopicData.concreteExample.title}
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-[#1A1918]/80">
                    <strong className="text-[#1A1918]">Starting State:</strong>{" "}
                    {currentTopicData.concreteExample.startingState}
                  </p>
                  <p className="text-[#1A1918]/80">
                    <strong className="text-[#1A1918]">Action Taken:</strong>{" "}
                    {currentTopicData.concreteExample.actionTaken}
                  </p>
                  <p className="text-emerald-900 bg-white/80 p-2.5 rounded-xl border border-[#1A1918]/20 leading-relaxed">
                    <strong className="text-[#1A1918]">Resulting Outcome:</strong>{" "}
                    {currentTopicData.concreteExample.resultingOutcome}
                  </p>
                  {currentTopicData.concreteExample.notes && (
                    <p className="text-[11px] text-[#1A1918]/70 italic">
                      Note: {currentTopicData.concreteExample.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* ── STATUS DEFINITIONS ── */}
              {currentTopicData.statusDefinitions && currentTopicData.statusDefinitions.length > 0 && (
                <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection("statuses")}
                    className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#1A1918]" />
                      Status Indicators &amp; Meanings
                    </span>
                    {expandedSections.statuses ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {expandedSections.statuses && (
                    <div className="p-4 space-y-2.5 border-t border-[#1A1918]/15">
                      {currentTopicData.statusDefinitions.map((st) => (
                        <div
                          key={st.status}
                          className="p-3 rounded-xl bg-[#FAF8F5] border border-[#1A1918]/15 space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold bg-[#1A1918] text-white px-2 py-0.5 rounded">
                              {st.badgeLabel}
                            </span>
                            {st.nextAction && (
                              <span className="text-[10px] text-[#1A1918]/70 font-semibold italic">
                                Action: {st.nextAction}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#1A1918]/80 leading-relaxed pt-1 font-medium">
                            {st.meaning}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── QUESTION 5: Troubleshooting & Failure Scenarios ── */}
              <div className="rounded-2xl bg-white border border-[#1A1918] shadow-[2.5px_2.5px_0_0_#1A1918] overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleSection("troubleshooting")}
                  className="w-full p-4 bg-[#FAF8F5]/60 hover:bg-[#FAF8F5] transition-colors flex items-center justify-between text-left font-black text-sm text-[#1A1918]"
                >
                  <span className="flex items-center gap-2 text-amber-950">
                    <span className="w-6 h-6 rounded-full bg-amber-700 text-white text-xs font-mono flex items-center justify-center">
                      5
                    </span>
                    Troubleshooting &amp; Recovery (What if something fails?)
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

              {/* Related Live Links */}
              {currentTopicData.relatedLinks && currentTopicData.relatedLinks.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#1A1918]/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-[#1A1918]/70 font-bold">Jump directly to workspace:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {currentTopicData.relatedLinks.map((link, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleNavigate(link.href)}
                        className="px-3 py-1.5 rounded-xl bg-[#1A1918] text-white hover:bg-[#1A1918]/80 font-semibold flex items-center gap-1.5 shadow-[1px_1px_0_0_#1A1918] transition-all"
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
        <div className="p-4 bg-white border-t-2 border-[#1A1918] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4">
            <Link
              href="/app/help"
              onClick={onClose}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Full Architecture</span>
            </Link>
            <button
              type="button"
              onClick={() => handleNavigate("/app/ai")}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1A1918]" />
              <span>Switch to AI Intelligence Guide →</span>
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
