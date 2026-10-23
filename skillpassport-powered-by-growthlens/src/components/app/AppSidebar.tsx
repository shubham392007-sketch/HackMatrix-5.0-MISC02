"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import {
  ShieldCheck,
  FolderSync,
  UploadCloud,
  Library,
  Sparkles,
  CheckCircle2,
  Activity,
  Lock,
  ChevronRight,
  ExternalLink,
  Layers,
  Award,
  Search,
  Network,
  History,
  FileCheck2,
  Cpu,
  Fingerprint,
  Scale,
  Percent,
  GitCompare,
  ShieldAlert,
  FileCode,
  Shield,
  ClipboardList,
  BarChart3,
  Compass,
  Briefcase,
  AlertTriangle,
  Target,
  FileSearch,
  ScrollText,
  GraduationCap,
  Map,
  Code2,
  CheckSquare,
  LineChart,
  Globe,
  BookOpen,
  Share2,
  Eye,
  Link2,
  Download,
  SlidersHorizontal,
  User,
  FolderGit2,
  Bell,
  Settings as SettingsIcon,
  Clock,
  HelpCircle,
  X,
  Loader2,
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
      { label: "Public Home", href: "/", icon: ExternalLink, external: true },
      { label: "Passport Overview", href: "/app/passport", icon: Award },
    ],
  },
  {
    category: "Evidence Workspace",
    items: [
      { label: "Evidence Center", href: "/app/evidence", icon: Layers },
      { label: "Connected Sources", href: "/app/evidence/sources", icon: FolderSync },
      { label: "Upload Work & Docs", href: "/app/evidence/upload", icon: UploadCloud },
      { label: "Evidence Library", href: "/app/evidence/library", icon: Library },
      { label: "Ingestion Runs", href: "/app/evidence/runs", icon: Activity },
      { label: "Data & Permissions", href: "/app/evidence/permissions", icon: Lock },
    ],
  },
  {
    category: "AI Intelligence",
    items: [
      { label: "AI Overview", href: "/app/ai", icon: Cpu },
      { label: "AI Work Analysis", href: "/app/ai/work-analysis", icon: Sparkles },
      { label: "Skill Extraction", href: "/app/ai/skill-extraction", icon: Fingerprint },
      { label: "Evidence Mapping", href: "/app/ai/evidence-mapping", icon: Layers },
      { label: "Verification Review", href: "/app/ai/verification", icon: Scale },
      { label: "Confidence & Uncertainty", href: "/app/ai/confidence", icon: Percent },
      { label: "Conflict Resolution", href: "/app/ai/conflicts", icon: GitCompare },
    ],
  },
  {
    category: "Trust & Governance",
    items: [
      { label: "Hallucination Guard", href: "/app/ai/guard", icon: ShieldAlert },
      { label: "Output Validation", href: "/app/ai/validation", icon: FileCode },
      { label: "Human Review Queue", href: "/app/ai/review-queue", icon: ClipboardList, restricted: "Reviewer" },
      { label: "Prompt-Injection Protection", href: "/app/ai/prompt-injection", icon: Shield, restricted: "Reviewer" },
      { label: "AI Evaluation Suite", href: "/app/ai/evaluation", icon: BarChart3, restricted: "Admin" },
      { label: "AI Audit Trail", href: "/app/ai/audit", icon: ScrollText },
    ],
  },
  {
    category: "Skill Intelligence",
    items: [
      { label: "Verified Skills", href: "/app/passport/skills", icon: ShieldCheck },
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
      { label: "Gap Priorities", href: "/app/career/priorities", icon: Sparkles },
      { label: "Career Readiness", href: "/app/career/readiness", icon: Target },
      { label: "Compare Roles", href: "/app/career/compare", icon: GitCompare },
      { label: "Job Description Parser", href: "/app/career/job-parser", icon: FileSearch },
    ],
  },
  {
    category: "Learn & Grow",
    items: [
      { label: "Learning Overview", href: "/app/learning", icon: GraduationCap },
      { label: "Personalized Roadmap", href: "/app/learning/roadmaps/roadmap-domain-data-preprocessing", icon: Map },
      { label: "Domain Blueprints", href: "/app/learning/domains/domain-data-preprocessing", icon: BookOpen },
      { label: "Diagnostic Check", href: "/app/learning/domains/domain-data-preprocessing/diagnostic", icon: CheckSquare },
      { label: "Curated Resources", href: "/app/learning/resources", icon: Layers },
      { label: "Practice Exercises", href: "/app/learning/practice", icon: Code2 },
      { label: "Assessments", href: "/app/learning/assessments/domain-data-preprocessing", icon: CheckCircle2 },
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
      { label: "Live Passport Preview", href: "/app/passport/preview", icon: Eye },
      { label: "Create Share Link", href: "/app/passport/share", icon: Link2 },
      { label: "Sharing Permissions", href: "/app/passport/permissions", icon: SlidersHorizontal },
      { label: "Manage Shared Access", href: "/app/passport/access", icon: Lock },
      { label: "Passport Export", href: "/app/passport/export", icon: Download },
      { label: "Recruiter View", href: "/p/share-recruiter-demo", icon: ExternalLink, external: true },
    ],
  },
  {
    category: "Settings & Access",
    items: [
      { label: "Profile", href: "/app/settings/profile", icon: User },
      { label: "Connected Accounts", href: "/app/settings/connections", icon: FolderGit2 },
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
  onLinkClick?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
}

function SidebarContent({ onLinkClick, showCloseButton, onClose }: SidebarContentProps) {
  const pathname = usePathname();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);
  const navScrollRef = useRef<HTMLDivElement>(null);

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

  const { currentRole, setDemoRole, userProfile } = useEvidence();
  const { user: authUser, profile: authProfile } = useAuth();

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
    <>
      {/* Workspace Brand Wordmark (Fixed Top) */}
      <div className="p-4 sm:p-5 pb-3.5 shrink-0 border-b border-[#1C1C1C]/10 bg-[#FBF6DF] flex items-center justify-between">
        <Link
          href="/app/passport"
          scroll={false}
          onClick={onLinkClick}
          className="block group select-none"
        >
          <div className="flex items-center gap-2">
            <span
              className="text-2xl text-[#1C1C1C] leading-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              SkillPassport
            </span>
            <span
              className="text-base text-[#1C1C1C]"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              app
            </span>
          </div>
          <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-[#1C1C1C]/60 block mt-0.5">
            VERIFIABLE TALENT PASSPORT
          </span>
        </Link>

        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF] hover:bg-[#DFE968] transition-colors lg:hidden"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4 text-[#1C1C1C]" />
          </button>
        )}
      </div>

      {/* Navigation Categories (Scrolls Independently & Preserves Scroll Position) */}
      <div
        ref={navScrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 custom-scrollbar"
      >
        {WORKSPACE_NAV.map((section, idx) => (
          <div key={section.category}>
            <p
              className="text-[17px] text-[#1C1C1C] px-2 mb-1 leading-tight select-none font-normal"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              {section.category}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  !item.external &&
                  (item.href === "/app/passport"
                    ? pathname === "/app/passport"
                    : item.href === "/app/evidence"
                    ? pathname === "/app/evidence"
                    : item.href === "/app/ai"
                    ? pathname === "/app/ai"
                    : pathname === item.href || pathname.startsWith(item.href + "/"));

                const isNavigatingThis = navigatingHref === item.href && !isActive;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    scroll={false}
                    onClick={() => {
                      if (!item.external && item.href !== pathname) {
                        setNavigatingHref(item.href);
                      }
                      onLinkClick?.();
                    }}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : isNavigatingThis
                        ? "bg-[#FBF1CF] border border-[#1C1C1C]/40 text-[#1C1C1C]"
                        : "text-[#1C1C1C]/75 hover:bg-[#FBF1CF] hover:text-[#1C1C1C]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <Icon className="w-3.5 h-3.5 text-[#1C1C1C] flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isNavigatingThis && (
                        <Loader2 className="w-3.5 h-3.5 text-[#1C1C1C] animate-spin flex-shrink-0" />
                      )}
                      {item.restricted && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C]">
                          {item.restricted}
                        </span>
                      )}
                      {isActive && !isNavigatingThis && <ChevronRight className="w-3 h-3 text-[#1C1C1C]" />}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Dividing Line after each domain (except the last section) */}
            {idx < WORKSPACE_NAV.length - 1 && (
              <div className="pt-3.5 pb-0.5 px-2">
                <hr className="border-t border-[#1C1C1C]/15" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Simulated User Profile & Role Switcher at Bottom (Fixed Bottom) */}
      <div className="p-3.5 border-t border-[#1C1C1C]/15 bg-[#FBF1CF]/70 space-y-2.5 shrink-0">
        <Link
          href="/app/settings/profile"
          scroll={false}
          onClick={onLinkClick}
          className="flex items-center gap-2.5 group hover:opacity-85 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-black text-xs shadow-[1px_1px_0_0_#1C1C1C]">
            {realInitials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate text-[#1C1C1C] group-hover:underline">
              {realDisplayName}
            </p>
            <span className="text-[9px] font-bold text-[#1C1C1C]/60 uppercase tracking-wider block truncate">
              {currentRole === "admin"
                ? "Demo Administrator"
                : currentRole === "reviewer"
                ? "Authorized Reviewer"
                : realRole}
            </span>
          </div>
        </Link>

        {/* Quick Role Switcher Pill */}
        <div className="flex items-center justify-between bg-white/80 p-1 rounded-xl border border-[#1C1C1C]/15 text-[10px]">
          <span className="font-bold text-[#1C1C1C]/60 pl-1">Role:</span>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setDemoRole("employee")}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                currentRole === "employee"
                  ? "bg-[#1C1C1C] text-white"
                  : "text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
              }`}
            >
              Dev
            </button>
            <button
              type="button"
              onClick={() => setDemoRole("reviewer")}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                currentRole === "reviewer"
                  ? "bg-[#DFE968] text-[#1C1C1C] border border-[#1C1C1C]"
                  : "text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
              }`}
            >
              Review
            </button>
            <button
              type="button"
              onClick={() => setDemoRole("admin")}
              className={`px-1.5 py-0.5 rounded-lg font-bold transition-all ${
                currentRole === "admin"
                  ? "bg-[#1C1C1C] text-white"
                  : "text-[#1C1C1C]/60 hover:text-[#1C1C1C]"
              }`}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default function AppSidebar() {
  const { mobileSidebarOpen, setMobileSidebarOpen } = useEvidence();

  return (
    <>
      {/* Desktop Persistent Sidebar (Only visible on lg and wider) */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#FBF6DF] border-r-[1.5px] border-[#1C1C1C] flex-col h-screen max-h-screen overflow-hidden select-none">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer (Visible on smaller screens when open) */}
      {mobileSidebarOpen && (
        <div className="lg:hidden">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 z-50 bg-[#1C1C1C]/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Sliding Drawer */}
          <aside className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#FBF6DF] border-r-[1.5px] border-[#1C1C1C] flex flex-col h-screen max-h-screen overflow-hidden select-none shadow-2xl animate-in slide-in-from-left duration-300">
            <SidebarContent
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
