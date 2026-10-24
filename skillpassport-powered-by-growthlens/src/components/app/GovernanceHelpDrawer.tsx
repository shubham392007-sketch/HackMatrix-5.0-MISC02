"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import {
  HelpCircle,
  X,
  Search,
  ShieldAlert,
  FileCode,
  ClipboardList,
  Shield,
  BarChart3,
  ScrollText,
  ShieldCheck,
  BookOpen,
  Compass,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Lock,
  UserCheck,
  Sparkles,
  Layers,
} from "lucide-react";
import {
  GOVERNANCE_HELP_TOPICS,
  GOVERNANCE_GUIDED_WORKFLOWS,
  GOVERNANCE_CONCEPTUAL_GLOSSARY,
  GovernanceHelpTopicId,
  GovernanceHelpTopic,
  getGovernanceHelpTopicIdFromPathname,
} from "@/data/governanceHelpContent";

interface GovernanceHelpDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTopicId?: GovernanceHelpTopicId;
  currentPathname?: string;
}

const GOVERNANCE_NAVIGATION_ITEMS: Array<{
  id: GovernanceHelpTopicId;
  label: string;
  icon: React.ElementType;
}> = [
  { id: "overview", label: "Overview", icon: ShieldCheck },
  { id: "hallucination-guard", label: "Hallucination Guard", icon: ShieldAlert },
  { id: "output-validation", label: "Output Validation", icon: FileCode },
  { id: "review-queue", label: "Review Queue", icon: ClipboardList },
  { id: "prompt-injection", label: "Injection Defense", icon: Shield },
  { id: "evaluation-suite", label: "Evaluation Suite", icon: BarChart3 },
  { id: "audit-trail", label: "Audit Trail", icon: ScrollText },
  { id: "workflows", label: "Guided Workflows (4)", icon: Compass },
  { id: "glossary", label: "Trust Glossary (14)", icon: BookOpen },
];

export default function GovernanceHelpDrawer({
  isOpen,
  onClose,
  initialTopicId,
  currentPathname = "",
}: GovernanceHelpDrawerProps) {
  const router = useRouter();
  const { currentRole } = useEvidence();
  const drawerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine initial active topic
  const defaultTopic = useMemo(() => {
    if (initialTopicId) return initialTopicId;
    if (currentPathname) return getGovernanceHelpTopicIdFromPathname(currentPathname);
    return "overview";
  }, [initialTopicId, currentPathname]);

  const [activeTopic, setActiveTopic] = useState<GovernanceHelpTopicId>(defaultTopic);
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
        (currentPathname ? getGovernanceHelpTopicIdFromPathname(currentPathname) : "overview");
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
    const matchingTopics = Object.values(GOVERNANCE_HELP_TOPICS).filter((t) => {
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
    const matchingWorkflows = GOVERNANCE_GUIDED_WORKFLOWS.filter((wf) => {
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
    const matchingGlossary = GOVERNANCE_CONCEPTUAL_GLOSSARY.filter((g) => {
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

  const currentTopicData: GovernanceHelpTopic | undefined =
    activeTopic !== "workflows" && activeTopic !== "glossary"
      ? GOVERNANCE_HELP_TOPICS[activeTopic as keyof typeof GOVERNANCE_HELP_TOPICS]
      : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Trust & Governance Help & Conceptual Guidance"
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
                <ShieldCheck className="w-3 h-3 text-[#DFE968]" />
                Trust &amp; Governance Guide
              </span>
              <span className="text-[11px] font-mono text-[#1A1918]/60 font-semibold">
                Audit Policy v2026.1
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#1A1918] tracking-tight">
              Trust &amp; Governance Help
            </h2>
            <p className="text-xs text-[#1A1918]/80 font-medium leading-relaxed">
              Deterministic verification gates, schema validation, human oversight, injection defense, benchmark evals, and audit traceability.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Trust & Governance Help"
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
              placeholder="Search governance features, gates, roles, errors, or terms (e.g. '7-Point Gate', 'ALLOW vs BLOCK', 'Jailbreak')..."
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
              {GOVERNANCE_NAVIGATION_ITEMS.map((item) => {
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
                  <h4 className="text-sm font-bold text-[#1A1918]">No Matching Governance Guidance Found</h4>
                  <p className="text-xs text-[#1A1918]/60 max-w-sm mx-auto">
                    Try searching for broader terms like &ldquo;hallucination&rdquo;, &ldquo;validation&rdquo;, &ldquo;review&rdquo;, &ldquo;injection&rdquo;, &ldquo;evaluation&rdquo;, or &ldquo;audit&rdquo;.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Topic Matches */}
                  {searchResults.topics.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1A1918]/50">
                        Governance Feature Guides ({searchResults.topics.length})
                      </h4>
                      {searchResults.topics.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => {
                            setActiveTopic(t.id);
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1E3A5F]/20 transition-all cursor-pointer shadow-[2px_2px_0_0_#1A1918] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-[#1A1918]" />
                              {t.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-[#1E3A5F] text-[#FAF8F5] px-2 py-0.5 rounded">
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
                        Guided Governance Workflows ({searchResults.workflows.length})
                      </h4>
                      {searchResults.workflows.map((wf) => (
                        <div
                          key={wf.id}
                          onClick={() => {
                            setActiveTopic("workflows");
                            setSearchQuery("");
                          }}
                          className="p-4 rounded-xl bg-white border border-[#1A1918] hover:bg-[#1E3A5F]/20 transition-all cursor-pointer shadow-[2px_2px_0_0_#1A1918] space-y-1.5"
                        >
                          <span className="text-xs font-bold text-[#1A1918] flex items-center gap-1.5">
                            <Compass className="w-3.5 h-3.5 text-[#1A1918]" />
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
                        Trust Glossary ({searchResults.glossary.length})
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
              <div className="p-4 rounded-2xl bg-[#1E3A5F]/20 border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] space-y-1">
                <h3 className="text-sm font-black text-[#1A1918] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#1A1918]" />
                  4 Core Trust &amp; Governance Workflows
                </h3>
                <p className="text-xs text-[#1A1918]/75">
                  End-to-end execution paths showing how unsupported claims get quarantined, injection attacks are sanitized, benchmarks are evaluated, and audit trails trace authoritative decisions.
                </p>
              </div>

              <div className="space-y-6">
                {GOVERNANCE_GUIDED_WORKFLOWS.map((wf) => (
                  <div
                    key={wf.id}
                    className="p-5 rounded-2xl bg-white border-[1.5px] border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-4"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1A1918] text-white px-2 py-0.5 rounded">
                        {wf.id.replace("workflow-", "Guide: ")}
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
                              className="text-[10px] font-bold text-[#1A1918] hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <span>Navigate</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                          <p className="text-xs text-[#1A1918] font-semibold pl-6.5">
                            {phase.action}
                          </p>
                          <p className="text-[11px] text-emerald-900 bg-white/70 p-2 rounded-lg border border-[#1A1918]/10 pl-6.5">
                            <strong>Outcome:</strong> {phase.outcome}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-[#1E3A5F]/30 border border-[#1A1918]/20 text-xs">
                      <strong className="font-black text-[#1A1918]">Key Architectural Takeaway:</strong>{" "}
                      <span className="text-[#1A1918]/85">{wf.keyTakeaway}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTopic === "glossary" ? (
            /* ───────────────────────────────────────────────────────────── */
            /* GLOSSARY TAB */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-[#1E3A5F]/20 border border-[#1A1918] shadow-[2px_2px_0_0_#1A1918] space-y-1">
                <h3 className="text-sm font-black text-[#1A1918] flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#1A1918]" />
                  Trust &amp; Governance Conceptual Glossary (14 Core Terms)
                </h3>
                <p className="text-xs text-[#1A1918]/75">
                  Precise architectural definitions of verification gates, schemas, sanitization, and audit invariants implemented in Skill Passport.
                </p>
              </div>

              <div className="space-y-3">
                {GOVERNANCE_CONCEPTUAL_GLOSSARY.map((item) => (
                  <div
                    key={item.term}
                    className="p-4 rounded-xl bg-white border border-[#1A1918]/20 shadow-sm space-y-2 hover:border-[#1A1918] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-[#1A1918]">{item.term}</h4>
                      {item.relatedRoute && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(item.relatedRoute!)}
                          className="text-[10px] font-bold text-[#1A1918] bg-[#1E3A5F] px-2 py-0.5 rounded border border-[#1A1918]/30 hover:opacity-80 flex items-center gap-1"
                        >
                          <span>{item.relatedRouteLabel || "View"}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-[#1A1918]/85 leading-relaxed font-medium">
                      {item.definition}
                    </p>
                    <div className="text-[11px] text-[#1A1918]/70 bg-[#FAF8F5] p-2 rounded-lg border border-[#1A1918]/10 leading-relaxed font-mono">
                      <strong>Concrete Usage:</strong> {item.context}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : currentTopicData ? (
            /* ───────────────────────────────────────────────────────────── */
            /* SINGLE TOPIC VIEW (Overview or 1 of 6 Features) */
            /* ───────────────────────────────────────────────────────────── */
            <div className="space-y-6">
              {/* Feature Hero Card */}
              <div className="p-5 rounded-2xl bg-white border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#1E3A5F] text-[#FAF8F5] border border-[#1A1918] uppercase shadow-[1px_1px_0_0_#1A1918]">
                      {currentTopicData.badgeLabel}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border uppercase ${
                      currentTopicData.requiredRole.includes("All Roles")
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : currentTopicData.requiredRole.includes("Admin Only")
                        ? "bg-purple-50 text-purple-800 border-purple-300"
                        : "bg-blue-50 text-blue-800 border-blue-300"
                    }`}>
                      {currentTopicData.requiredRole}
                    </span>
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

                <h3 className="text-lg font-black text-[#1A1918] tracking-tight">
                  {currentTopicData.title}
                </h3>

                <p className="text-xs text-[#1A1918]/80 font-medium leading-relaxed">
                  {currentTopicData.summary}
                </p>

                {/* Role Switcher Note for Restricted Features */}
                {!currentTopicData.requiredRole.includes("All Roles") && currentRole === "employee" && (
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                    <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Restricted Role Access</p>
                      <p className="text-[11px] leading-relaxed opacity-90">
                        You are currently viewing as an <strong>Employee</strong>. In the live system, access requires <strong>{currentTopicData.requiredRole}</strong>. In this demo workspace, you can switch your active role to <strong>Reviewer</strong> or <strong>Admin</strong> anytime using the role switcher in the top navigation bar.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── 1. Purpose & Scope ── */}
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
                    What is this feature for? (Purpose &amp; Scope)
                  </span>
                  {expandedSections.purpose ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.purpose && (
                  <div className="p-5 text-xs text-[#1A1918]/85 leading-relaxed space-y-3 border-t border-[#1A1918]/15">
                    <p className="font-medium text-sm text-[#1A1918]">{currentTopicData.purpose}</p>
                  </div>
                )}
              </div>

              {/* ── 2. When should I use it? ── */}
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
                    When should I use it? (Trigger Moments)
                  </span>
                  {expandedSections.whenToUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whenToUse && (
                  <div className="p-5 text-xs space-y-2 border-t border-[#1A1918]/15">
                    <p className="text-[#1A1918]/70 font-medium pb-1">
                      Key operational triggers and scenarios:
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

              {/* ── 3. Who can use it? ── */}
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
                    Who can use it? (Role Permissions)
                  </span>
                  {expandedSections.whoCanUse ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.whoCanUse && (
                  <div className="p-5 text-xs space-y-3 border-t border-[#1A1918]/15">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-sm text-[#1A1918]">
                        {currentTopicData.requiredRole}
                      </span>
                    </div>
                    <p className="text-xs text-[#1A1918]/85 leading-relaxed font-medium">
                      {currentTopicData.whoCanUse}
                    </p>
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
                    What must be available before starting?
                  </span>
                  {expandedSections.prerequisites ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.prerequisites && (
                  <div className="p-5 text-xs space-y-2 border-t border-[#1A1918]/15">
                    <ul className="space-y-2">
                      {currentTopicData.prerequisites.map((prereq, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#1A1918]">
                          <Info className="w-4 h-4 text-[#1A1918]/60 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{prereq}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* ── 5. How to use it (Step-by-Step) ── */}
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
                          <span className="text-[10px] font-mono font-bold bg-[#1E3A5F] text-[#FAF8F5] px-2 py-0.5 rounded border border-[#1A1918]/30">
                            {step.buttonOrPath}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#1A1918]/75 pl-7 leading-relaxed">{step.details}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 6. Practical Example (Illustrative) ── */}
              <div className="rounded-2xl bg-[#1E3A5F]/20 border-2 border-[#1A1918] shadow-[3px_3px_0_0_#1A1918] p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1A1918] text-[#DFE968] px-2 py-0.5 rounded">
                    Practical Example
                  </span>
                  <span className="text-[10px] font-mono text-[#1A1918]/60 italic font-bold">
                    Illustrative Scenario (Not Live Data)
                  </span>
                </div>
                <h4 className="text-sm font-black text-[#1A1918]">
                  {currentTopicData.practicalExample.title}
                </h4>
                <div className="space-y-2 text-xs">
                  <p className="text-[#1A1918]/80">
                    <strong className="text-[#1A1918]">Starting State:</strong>{" "}
                    {currentTopicData.practicalExample.startingState}
                  </p>
                  <p className="text-[#1A1918]/80">
                    <strong className="text-[#1A1918]">Action Performed:</strong>{" "}
                    {currentTopicData.practicalExample.actionTaken}
                  </p>
                  <p className="text-emerald-900 bg-white/80 p-2.5 rounded-xl border border-[#1A1918]/20 leading-relaxed">
                    <strong className="text-[#1A1918]">Resulting Outcome:</strong>{" "}
                    {currentTopicData.practicalExample.resultingOutcome}
                  </p>
                  <p className="text-[#1A1918]/80 bg-[#FAF8F5] p-2.5 rounded-xl border border-[#1A1918]/15">
                    <strong className="text-[#1A1918]">How to Inspect:</strong>{" "}
                    {currentTopicData.practicalExample.inspectionGuide}
                  </p>
                  {currentTopicData.practicalExample.recoveryNote && (
                    <p className="text-[11px] text-[#1A1918]/70 italic">
                      Recovery Note: {currentTopicData.practicalExample.recoveryNote}
                    </p>
                  )}
                </div>
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
                    Inputs, Outputs &amp; Persistence
                  </span>
                  {expandedSections.inputsOutputs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {expandedSections.inputsOutputs && (
                  <div className="p-5 space-y-4 border-t border-[#1A1918]/15 text-xs">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-[#1A1918]">
                        Required Inputs:
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

              {/* ── 8. Status Meanings & Governance Principles ── */}
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
                    Status Indicators &amp; Decision Meanings
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
                        Deterministic Invariants:
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

                    {/* Governance Caveat */}
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-800/30 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                      <p className="text-xs font-medium text-[#1A1918] leading-relaxed">
                        <strong className="font-bold">Governance Invariant:</strong>{" "}
                        {currentTopicData.understandingStatus.governanceCaveat}
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
                    <p className="text-[#1A1918]/80 leading-relaxed">
                      {currentTopicData.whatHappensNext.nextStepAction}
                    </p>
                  </div>
                )}
              </div>

              {/* ── 11. Known Limitations & Integrity Status ── */}
              <div className="p-4 rounded-xl bg-white/80 border border-[#1A1918]/20 shadow-sm space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#1A1918]/60">
                    Implementation Integrity Status
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                    {currentTopicData.knownLimitations.status === "fully_implemented"
                      ? "Fully Implemented"
                      : "Partially Implemented"}
                  </span>
                </div>
                <p className="text-[11px] text-[#1A1918]/70">
                  {currentTopicData.knownLimitations.notes}
                </p>
              </div>

              {/* Related Live Links */}
              {currentTopicData.relatedLinks && currentTopicData.relatedLinks.length > 0 && (
                <div className="p-4 rounded-2xl bg-white border border-[#1A1918]/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <span className="text-[#1A1918]/70 font-bold">Related Destinations:</span>
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
          <div className="flex items-center gap-3">
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
              <span>AI Guide →</span>
            </button>
            <button
              type="button"
              onClick={() => handleNavigate("/app/evidence")}
              className="text-xs font-bold text-[#1A1918]/80 hover:text-[#1A1918] flex items-center gap-1.5 underline underline-offset-2"
            >
              <Layers className="w-3.5 h-3.5 text-[#1A1918]" />
              <span>Evidence Guide →</span>
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
