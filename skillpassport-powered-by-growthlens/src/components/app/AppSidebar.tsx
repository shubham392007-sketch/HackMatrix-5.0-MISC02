"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  LayoutDashboard,
  Database,
  GitBranch,
  UploadCloud,
  Library,
  Activity,
  ShieldCheck,
  Brain,
  BrainCircuit,
  ScanSearch,
  Network,
  ClipboardCheck,
  SlidersHorizontal,
  GitMerge,
  GitCompare,
  ExternalLink,
  ShieldAlert,
  FileCode,
  FileCheck2,
  Shield,
  ClipboardList,
  BarChart3,
  ScrollText,
  BadgeCheck,
  Search,
  CheckCircle2,
  History,
  Compass,
  Globe,
  Briefcase,
  Scale,
  AlertTriangle,
  Target,
  FileSearch,
  GraduationCap,
  Map,
  BookOpen,
  CheckSquare,
  Layers,
  Code2,
  LineChart,
  Award,
  Share2,
  Eye,
  Download,
  Link2,
  Mail,
  Lock,
  User,
  FolderGit2,
  Archive,
  Bell,
  Settings as SettingsIcon,
  Clock,
  HelpCircle,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
  Pin,
  PinOff,
  LogOut,
  Sparkles,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: any;
  external?: boolean;
  restricted?: string;
}

export interface NavSection {
  category: string;
  items: NavItem[];
}

export const WORKSPACE_NAV: NavSection[] = [
  {
    category: "Skill Passport",
    items: [
      { label: "Public Home", href: "/", icon: Home, external: true },
      { label: "Passport Overview", href: "/app/passport", icon: LayoutDashboard },
    ],
  },
  {
    category: "Evidence Workspace",
    items: [
      { label: "Evidence Center", href: "/app/evidence", icon: Database },
      { label: "Onboarding Wizard", href: "/app/onboarding?mode=review", icon: Sparkles },
      { label: "Connected Sources", href: "/app/evidence/sources", icon: GitBranch },
      { label: "Upload Work & Docs", href: "/app/evidence/upload", icon: UploadCloud },
      { label: "Evidence Library", href: "/app/evidence/library", icon: Library },
      { label: "Ingestion Runs", href: "/app/evidence/runs", icon: Activity },
      { label: "Data & Permissions", href: "/app/evidence/permissions", icon: ShieldCheck },
    ],
  },
  {
    category: "AI Intelligence",
    items: [
      { label: "AI Overview", href: "/app/ai", icon: Brain },
      { label: "AI Work Analysis", href: "/app/ai/work-analysis", icon: BrainCircuit },
      { label: "Skill Extraction", href: "/app/ai/skill-extraction", icon: ScanSearch },
      { label: "Evidence Mapping", href: "/app/ai/evidence-mapping", icon: Network },
      { label: "Verification Review", href: "/app/ai/verification", icon: ClipboardCheck },
      { label: "Confidence & Uncertainty", href: "/app/ai/confidence", icon: SlidersHorizontal },
      { label: "Conflict Resolution", href: "/app/ai/conflicts", icon: GitMerge },
    ],
  },
  {
    category: "Trust & Governance",
    items: [
      { label: "Hallucination Guard", href: "/app/ai/guard", icon: ShieldAlert },
      { label: "Output Validation", href: "/app/ai/validation", icon: FileCode },
      { label: "Human Review Queue", href: "/app/ai/review-queue", icon: ClipboardList },
      { label: "Prompt-Injection Protection", href: "/app/ai/prompt-injection", icon: Shield },
      { label: "AI Evaluation Suite", href: "/app/ai/evaluation", icon: BarChart3 },
      { label: "AI Audit Trail", href: "/app/ai/audit", icon: ScrollText },
    ],
  },
  {
    category: "Skill Intelligence",
    items: [
      { label: "Verified Skills", href: "/app/passport/skills", icon: BadgeCheck },
      { label: "Skill Explorer", href: "/app/passport/explorer", icon: Search },
      { label: "Taxonomy & Ontology", href: "/app/passport/taxonomy", icon: Network },
      { label: "Candidate Review", href: "/app/passport/candidates", icon: CheckCircle2 },
      { label: "Evidence Coverage", href: "/app/passport/coverage", icon: FileCheck2 },
      { label: "Skill History", href: "/app/passport/history", icon: History },
    ],
  },
  {
    category: "Career Intelligence",
    items: [
      { label: "Role Overview", href: "/app/career", icon: Compass },
      { label: "Discover Jobs", href: "/app/career/discover", icon: Globe },
      { label: "Target Roles", href: "/app/career/roles", icon: Briefcase },
      { label: "Role Match", href: "/app/career/match", icon: Scale },
      { label: "Skill Gaps", href: "/app/career/gaps", icon: AlertTriangle },
      { label: "Gap Priorities", href: "/app/career/priorities", icon: Award },
      { label: "Career Readiness", href: "/app/career/readiness", icon: Target },
      { label: "Compare Roles", href: "/app/career/compare", icon: GitCompare },
      { label: "Job Description Parser", href: "/app/career/job-parser", icon: FileSearch },
    ],
  },
  {
    category: "Learn & Grow",
    items: [
      { label: "Learning Overview", href: "/app/learning", icon: GraduationCap },
      { label: "Personalized Roadmap", href: "/app/learning/roadmaps", icon: Map },
      { label: "Domain Blueprints", href: "/app/learning/domains", icon: BookOpen },
      { label: "Diagnostic Check", href: "/app/learning/domains/domain-data-preprocessing/diagnostic", icon: CheckSquare },
      { label: "Curated Resources", href: "/app/learning/resources", icon: Layers },
      { label: "Practice Exercises", href: "/app/learning/practice", icon: Code2 },
      { label: "Assessments", href: "/app/learning/assessments", icon: CheckCircle2 },
      { label: "Mini-Projects", href: "/app/learning/projects", icon: FileCode },
      { label: "Progress & Mastery", href: "/app/learning/progress", icon: LineChart },
      { label: "Learning History", href: "/app/learning/history", icon: History },
      { label: "Updated Capability", href: "/app/learning/capability", icon: Award },
    ],
  },
  {
    category: "Sharing & Recruiter",
    items: [
      { label: "Sharing Overview", href: "/app/passport/sharing", icon: Share2 },
      { label: "Passport Content Builder", href: "/app/passport/builder", icon: SlidersHorizontal },
      { label: "Sharing Permissions", href: "/app/passport/permissions", icon: Lock },
      { label: "Live Passport Preview", href: "/app/passport/preview", icon: Eye },
      { label: "Passport Export", href: "/app/passport/export", icon: Download },
      { label: "Create Share Link", href: "/app/passport/share", icon: Link2 },
      { label: "Recruiter Preview", href: "/app/passport/preview?view=recruiter", icon: ExternalLink },
      { label: "Recruiter Inquiries", href: "/app/passport/messages", icon: Mail },
      { label: "Manage Shared Access", href: "/app/passport/access", icon: Lock },
    ],
  },
  {
    category: "Settings & Access",
    items: [
      { label: "Profile", href: "/app/settings/profile", icon: User },
      { label: "Connected Accounts", href: "/app/settings/connections", icon: FolderGit2 },
      { label: "Evidence Vault", href: "/app/settings/vault", icon: Archive },
      { label: "Privacy & Consent", href: "/app/settings/privacy", icon: ShieldCheck },
      { label: "Notifications", href: "/app/notifications", icon: Bell },
      { label: "Preferences & Settings", href: "/app/settings", icon: SettingsIcon },
      { label: "Activity History", href: "/app/activity", icon: Clock },
      { label: "Help & Explanations", href: "/app/help", icon: HelpCircle },
    ],
  },
];

// Persistent module-level scroll tracking so sidebar scroll position survives route changes and renders
let globalSidebarScrollTop = 0;

interface SidebarContentProps {
  isExpanded?: boolean;
  isPinned?: boolean;
  onTogglePin?: () => void;
  onLinkClick?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

function SidebarContent({
  isExpanded = true,
  isPinned = false,
  onTogglePin,
  onLinkClick,
  showCloseButton,
  onClose,
}: SidebarContentProps) {
  const pathname = usePathname();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);
  const [currentSearch, setCurrentSearch] = useState<string>("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (category: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  useEffect(() => {
    const updateSearch = () => {
      if (typeof window !== "undefined") {
        setCurrentSearch(window.location.search || "");
      }
    };
    updateSearch();
    window.addEventListener("popstate", updateSearch);
    return () => window.removeEventListener("popstate", updateSearch);
  }, [pathname]);

  // Flatten all items across all navigation categories
  const allNavItems = useMemo(
    () => WORKSPACE_NAV.flatMap((sec) => sec.items),
    []
  );

  // Compute strictly single active href across the entire sidebar
  const activeHref = useMemo(() => {
    if (!pathname) return null;

    // 1. Check exact query match (e.g. /app/passport/preview?view=recruiter)
    const queryItem = allNavItems.find(
      (item) =>
        !item.external &&
        item.href.includes("?") &&
        pathname === item.href.split("?")[0] &&
        currentSearch.includes(item.href.split("?")[1])
    );
    if (queryItem) {
      return queryItem.href;
    }

    // 2. If viewing /app/passport/preview without view=recruiter query
    if (pathname === "/app/passport/preview" && !currentSearch.includes("view=recruiter")) {
      return "/app/passport/preview";
    }

    // 3. Exact pathname match against all non-external, non-query items
    const exactItem = allNavItems.find(
      (item) => !item.external && !item.href.includes("?") && item.href === pathname
    );
    if (exactItem) {
      return exactItem.href;
    }

    // 4. Longest prefix match for sub-routes without dedicated nav entries
    const prefixCandidates = allNavItems.filter(
      (item) =>
        !item.external &&
        !item.href.includes("?") &&
        pathname.startsWith(item.href + "/")
    );
    if (prefixCandidates.length > 0) {
      prefixCandidates.sort((a, b) => b.href.length - a.href.length);
      return prefixCandidates[0].href;
    }

    return null;
  }, [pathname, currentSearch, allNavItems]);

  // Clear navigating state when pathname updates
  useEffect(() => {
    setNavigatingHref(null);
  }, [pathname]);

  // Handle scroll and persist position in memory and session storage
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const top = e.currentTarget.scrollTop;
    globalSidebarScrollTop = top;
    try {
      sessionStorage.setItem("skillpassport_sidebar_scroll", String(top));
    } catch {}
  };

  // Restore scroll position on initial mount
  useEffect(() => {
    const saved =
      globalSidebarScrollTop ||
      (typeof window !== "undefined"
        ? Number(sessionStorage.getItem("skillpassport_sidebar_scroll") || "0")
        : 0);

    if (navScrollRef.current && saved > 0) {
      navScrollRef.current.scrollTop = saved;
    }
  }, []);

  // Ensure sidebar scroll position stays intact across route transitions
  useEffect(() => {
    if (navScrollRef.current && globalSidebarScrollTop > 0) {
      if (Math.abs(navScrollRef.current.scrollTop - globalSidebarScrollTop) > 2) {
        navScrollRef.current.scrollTop = globalSidebarScrollTop;
      }
    }
  }, [pathname]);

  const { userProfile } = useEvidence();
  const { user: authUser, profile: authProfile, signOut } = useAuth();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await signOut();
      router.push("/login");
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const realDisplayName =
    authProfile?.display_name ||
    (authUser?.user_metadata?.full_name as string) ||
    (authUser?.user_metadata?.name as string) ||
    (authUser?.email ? authUser.email.split("@")[0] : null) ||
    userProfile?.displayName ||
    "User";

  const realInitials = (() => {
    const parts = realDisplayName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return realDisplayName.slice(0, 2).toUpperCase();
  })();

  const realRole =
    authProfile?.job_title ||
    authProfile?.current_role ||
    userProfile?.currentRole ||
    "Software Developer";

  return (
    <div className="flex flex-col h-full w-full select-none overflow-hidden rounded-[22px]">
      {/* Workspace Brand Wordmark (Fluid crossfade, zero layout bounce) */}
      <div className="relative p-3.5 pb-3 shrink-0 border-b border-[#1A1918]/10 bg-[#FAF8F5] flex items-center min-h-[64px] rounded-t-[22px] overflow-hidden">
        {/* Collapsed Monogram SP (Fade & slight scale, stable anchor) */}
        <div
          className={`absolute inset-0 flex items-center justify-center transition-[opacity,transform] ${
            isExpanded
              ? "opacity-0 pointer-events-none scale-90 duration-150 ease-in"
              : "opacity-100 scale-100 duration-200 delay-150 ease-out"
          }`}
          style={{ willChange: "opacity, transform" }}
        >
          <Link
            href="/app/passport"
            scroll={false}
            className="group flex flex-col items-center"
            title="SkillPassport Overview"
          >
            <div className="w-10 h-10 rounded-2xl bg-[#171717] text-[#FAF8F5] flex items-center justify-center font-bold text-sm tracking-tight shadow-[1.5px_1.5px_0_0_#E6AC70] group-hover:scale-105 transition-transform duration-150">
              SP
            </div>
          </Link>
        </div>

        {/* Expanded Full Wordmark & Pin Button (Gradual fade-in with 200ms delay, tiny 4px translation) */}
        <div
          className={`w-full flex items-center justify-between min-w-0 pr-1 transition-[opacity,transform] ${
            isExpanded
              ? "opacity-100 translate-x-0 duration-350 delay-200 ease-out"
              : "opacity-0 pointer-events-none -translate-x-1 duration-140 delay-0 ease-in"
          }`}
          style={{ willChange: "opacity, transform" }}
        >
          <Link
            href="/app/passport"
            scroll={false}
            onClick={onLinkClick}
            className="block group select-none min-w-0"
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="text-2xl text-[#1A1918] leading-none whitespace-nowrap"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                SkillPassport
              </span>
              <span
                className="text-base text-[#1A1918] whitespace-nowrap"
                style={{ fontFamily: "'Yellowtail', cursive" }}
              >
                app
              </span>
            </div>
            <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-[#1A1918]/60 block mt-0.5 truncate whitespace-nowrap">
              VERIFIABLE TALENT PASSPORT
            </span>
          </Link>

          <div className="flex items-center gap-1 shrink-0 ml-1">
            {onTogglePin && (
              <button
                type="button"
                onClick={onTogglePin}
                title={isPinned ? "Unpin sidebar (auto-collapse on mouse leave)" : "Pin sidebar expanded"}
                className={`p-1.5 rounded-lg border transition-colors duration-150 ${
                  isPinned
                    ? "bg-[#171717] border-[#171717] text-[#FAF8F5] shadow-[1px_1px_0_0_#171717]"
                    : "border-[#171717]/20 text-[#171717]/70 hover:bg-[#171717]/5 hover:text-[#171717]"
                }`}
                aria-label={isPinned ? "Unpin sidebar" : "Pin sidebar"}
              >
                {isPinned ? (
                  <PinOff className="w-3.5 h-3.5" />
                ) : (
                  <Pin className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full border border-[#1A1918] bg-[#FAF8F5] hover:bg-[#000000] hover:text-[#FAF8F5] transition-colors duration-150 lg:hidden"
                aria-label="Close navigation"
              >
                <X className="w-4 h-4 text-[#1A1918]" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Categories (Scrolls Independently & Preserves Scroll Position) */}
      <div
        ref={navScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-2.5 py-3 space-y-3 custom-scrollbar bg-[#FAF8F5] overflow-x-hidden"
      >
        {WORKSPACE_NAV.map((section, idx) => {
          const sectionHasActive = section.items.some((item) => item.href === activeHref);
          const isCollapsed = collapsedSections[section.category] ?? false;

          return (
            <div key={section.category}>
              {/* Category Header (Smooth unfold, delay-staggered fade) */}
              <div
                className={`overflow-hidden transition-all ${
                  isExpanded
                    ? "max-h-12 opacity-100 duration-350 delay-180 ease-out mb-1"
                    : "max-h-0 opacity-0 duration-140 delay-0 ease-in mb-0 pointer-events-none"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.category)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded-lg text-left transition-colors duration-150 hover:bg-[#1A1918]/5 group select-none whitespace-nowrap"
                  aria-expanded={!isCollapsed}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full border border-[#1A1918] shrink-0 ${
                        sectionHasActive ? "bg-[#2D5A43]" : "bg-[#E6AC70]"
                      }`}
                    />
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-[#1A1918]/80 group-hover:text-[#1A1918] truncate">
                      {section.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] font-mono text-[#1A1918]/40">
                      {section.items.length}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-[#1A1918]/50 group-hover:text-[#1A1918] transition-transform duration-200 ${
                        isCollapsed ? "-rotate-90" : "rotate-0"
                      }`}
                    />
                  </div>
                </button>
              </div>

              {/* Nav Items (Icons remain visually locked in horizontal position throughout transition) */}
              {(!isCollapsed || !isExpanded) && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.href === activeHref;
                    const isNavigatingThis = navigatingHref === item.href && !isActive;

                    return (
                      <div key={item.label} className="relative group/rail py-0.5">
                        <Link
                          href={item.href}
                          scroll={false}
                          title={isExpanded ? item.label : undefined}
                          aria-label={item.label}
                          onClick={() => {
                            if (!item.external && item.href !== pathname) {
                              setNavigatingHref(item.href);
                            }
                            if (item.href.includes("?")) {
                              setCurrentSearch("?" + item.href.split("?")[1]);
                            } else {
                              setCurrentSearch("");
                            }
                            onLinkClick?.();
                          }}
                          className={`w-full flex items-center rounded-xl text-xs font-bold transition-colors duration-150 ${
                            isExpanded ? "px-2.5 py-1.5" : "px-2.5 py-1.5 justify-start"
                          } ${
                            isActive
                              ? "bg-[#171717] border border-[#171717] text-[#FAF8F5] shadow-[1.5px_1.5px_0_0_#171717]"
                              : isNavigatingThis
                              ? "bg-[#FAF8F5] border border-[#1A1918]/40 text-[#1A1918]"
                              : "text-[#1A1918]/80 hover:bg-[#1A1918]/5 hover:text-[#1A1918]"
                          }`}
                        >
                          {/* Stable Left Icon Target: 20px wide, exactly positioned in both states */}
                          <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            {isNavigatingThis && !isExpanded ? (
                              <Loader2 className="w-4 h-4 animate-spin text-[#171717]" />
                            ) : (
                              <Icon
                                className={`w-4 h-4 shrink-0 transition-colors duration-150 ${
                                  isActive ? "text-[#FAF8F5]" : "text-[#1A1918]/70"
                                }`}
                              />
                            )}
                          </div>

                          {/* Label Container: Subtle opacity & 4px translate, 200ms delay on expand */}
                          <div
                            className={`min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-[opacity,transform] ${
                              isExpanded
                                ? "opacity-100 max-w-[168px] translate-x-0 duration-350 delay-200 ease-out ml-2.5"
                                : "opacity-0 max-w-0 -translate-x-1 duration-120 delay-0 ease-in ml-0 pointer-events-none"
                            }`}
                            style={{ willChange: "opacity, transform" }}
                          >
                            <span className="truncate block">{item.label}</span>
                          </div>

                          {/* Right Indicators: Badge, Loader, Chevron */}
                          <div
                            className={`flex items-center gap-1 shrink-0 transition-opacity ${
                              isExpanded
                                ? "opacity-100 duration-250 delay-240 ease-out"
                                : "opacity-0 pointer-events-none duration-100 delay-0 ease-in"
                            }`}
                          >
                            {isNavigatingThis && (
                              <Loader2
                                className={`w-3.5 h-3.5 animate-spin shrink-0 ${
                                  isActive ? "text-[#FAF8F5]" : "text-[#1A1918]"
                                }`}
                              />
                            )}
                            {item.restricted && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#1A1918]/10 text-[#1A1918]">
                                {item.restricted}
                              </span>
                            )}
                            {isActive && !isNavigatingThis && (
                              <ChevronRight className="w-3 h-3 text-[#FAF8F5]" />
                            )}
                          </div>
                        </Link>

                        {/* Floating Tooltip Pill (Only active in collapsed mode) */}
                        {!isExpanded && (
                          <div
                            className="fixed left-[96px] z-50 pointer-events-none opacity-0 group-hover/rail:opacity-100 transition-opacity duration-150 delay-100 whitespace-nowrap bg-[#171717] text-[#FAF8F5] text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-[#171717] flex items-center gap-2"
                            style={{ transform: "translateY(2px)" }}
                          >
                            <span>{item.label}</span>
                            {item.restricted && (
                              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/20 text-[#FAF8F5]">
                                {item.restricted}
                              </span>
                            )}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#171717] rotate-45 border-l border-b border-[#171717]" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Dividing Line after each domain (except the last section) */}
              {idx < WORKSPACE_NAV.length - 1 && (
                <div className="pt-2 pb-0.5 px-1">
                  <hr className="border-t border-[#1A1918]/10" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Logout Action at Bottom (Changed from profile link per user feedback) */}
      <div className="p-3 border-t border-[#1A1918]/15 bg-[#FAF8F5] shrink-0 min-h-[58px] flex items-center rounded-b-[22px] overflow-hidden">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex items-center w-full group transition-colors duration-150 relative text-left"
          title={!isExpanded ? `Log Out (${realDisplayName})` : undefined}
          aria-label="Log Out"
        >
          {/* Stable Left Logout Icon Target (Identical horizontal anchor coordinate x=18px) */}
          <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-700 flex items-center justify-center shrink-0 shadow-[1px_1px_0_0_rgba(190,18,60,0.15)] group-hover:bg-rose-100 group-hover:scale-105 transition-all duration-150">
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin text-rose-700" />
            ) : (
              <LogOut className="w-4 h-4 text-rose-700" />
            )}
          </div>

          {/* Logout Label & User Name Attribution */}
          <div
            className={`min-w-0 flex-1 whitespace-nowrap overflow-hidden transition-[opacity,transform] ${
              isExpanded
                ? "opacity-100 max-w-[180px] translate-x-0 duration-350 delay-200 ease-out ml-2.5"
                : "opacity-0 max-w-0 -translate-x-1 duration-120 delay-0 ease-in ml-0 pointer-events-none"
            }`}
            style={{ willChange: "opacity, transform" }}
          >
            <span className="text-xs font-black truncate block text-rose-700 group-hover:underline">
              {isLoggingOut ? "Signing Out..." : "Log Out"}
            </span>
            <span className="text-[9px] font-bold text-[#1A1918]/50 uppercase tracking-wider block truncate">
              {realDisplayName}
            </span>
          </div>

          {/* Floating Tooltip Pill (Only active in collapsed mode) */}
          {!isExpanded && (
            <div
              className="fixed left-[96px] z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-100 whitespace-nowrap bg-[#171717] text-[#FAF8F5] text-xs font-bold px-2.5 py-1.5 rounded-lg shadow-xl border border-[#171717] flex items-center gap-2"
              style={{ transform: "translateY(2px)" }}
            >
              <span>Log Out</span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white/20 text-[#FAF8F5]">
                {realDisplayName}
              </span>
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-[#171717] rotate-45 border-l border-b border-[#171717]" />
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

export default function AppSidebar() {
  const {
    mobileSidebarOpen,
    setMobileSidebarOpen,
    desktopSidebarPinned,
    desktopSidebarHovered,
    desktopSidebarExpanded,
    setDesktopSidebarHovered,
    toggleDesktopSidebarPinned,
  } = useEvidence();

  return (
    <>
      {/* Desktop Dynamic Push Spacer: Synchronously reserves layout flow width with identical easing */}
      <div
        className="hidden lg:block shrink-0 pointer-events-none"
        style={{
          width: "var(--sidebar-offset, 104px)",
          transition: "width var(--sidebar-duration) var(--sidebar-easing)",
          willChange: "width",
        }}
        aria-hidden="true"
      />

      {/* Desktop Floating Collapsible Sidebar — Smooth macOS-like Continuous Motion */}
      <aside
        onMouseEnter={() => setDesktopSidebarHovered(true)}
        onMouseLeave={() => setDesktopSidebarHovered(false)}
        className={`hidden lg:flex fixed top-4 bottom-4 left-4 z-40 h-[calc(100dvh-32px)] max-h-[calc(100dvh-32px)] bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-[22px] flex-col select-none overflow-hidden ${
          desktopSidebarExpanded
            ? "shadow-[0_20px_45px_rgba(23,23,23,0.13),2px_2px_0_0_#171717]"
            : "shadow-[0_8px_24px_rgba(23,23,23,0.07),1.5px_1.5px_0_0_#171717]"
        }`}
        style={{
          width: "var(--sidebar-width, 72px)",
          transition:
            "width var(--sidebar-duration) var(--sidebar-easing), box-shadow var(--sidebar-duration) var(--sidebar-easing)",
          willChange: "width",
        }}
      >
        <SidebarContent
          isExpanded={desktopSidebarExpanded}
          isPinned={desktopSidebarPinned}
          onTogglePin={toggleDesktopSidebarPinned}
        />
      </aside>

      {/* Mobile Drawer (Visible on smaller screens <1024px when triggered — Detached Floating Modal) */}
      {mobileSidebarOpen && (
        <div className="lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-[#1A1918]/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Sliding Floating Drawer — Detached From Edges with 16px Clearance & 4-Corner Radius */}
          <aside className="fixed top-4 bottom-4 left-4 z-50 w-[280px] max-w-[calc(100vw-32px)] h-[calc(100dvh-32px)] max-h-[calc(100dvh-32px)] bg-[#FAF8F5] border-[1.5px] border-[#171717] rounded-[22px] flex flex-col overflow-hidden select-none shadow-[0_20px_50px_rgba(23,23,23,0.25),2px_2px_0_0_#171717] animate-in slide-in-from-left duration-300">
            <SidebarContent
              isExpanded={true}
              onLinkClick={() => setMobileSidebarOpen(false)}
              showCloseButton
              onClose={() => setMobileSidebarOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  );
}
