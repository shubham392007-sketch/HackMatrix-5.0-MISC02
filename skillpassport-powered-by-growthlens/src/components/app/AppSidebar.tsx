"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
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
    category: "SKILLPASSPORT",
    items: [
      { label: "Public Home", href: "/", icon: ExternalLink, external: true },
      { label: "Passport Overview", href: "/app/passport", icon: Award },
    ],
  },
  {
    category: "SHARING & RECRUITER",
    items: [
      { label: "Sharing Overview", href: "/app/passport/sharing", icon: Share2 },
      { label: "Live Passport Preview", href: "/app/passport/preview", icon: Eye },
      { label: "Create Share Link", href: "/app/passport/share", icon: Link2 },
      { label: "Sharing Permissions", href: "/app/passport/permissions", icon: SlidersHorizontal },
      { label: "Manage Shared Access", href: "/app/passport/access", icon: Lock },
      { label: "Passport Export", href: "/app/passport/export", icon: Download },
      { label: "Demo Recruiter View", href: "/p/share-recruiter-demo", icon: ExternalLink, external: true },
    ],
  },
  {
    category: "CAREER INTELLIGENCE",
    items: [
      { label: "Role Overview", href: "/app/career", icon: Compass },
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
    category: "LEARN & GROW",
    items: [
      { label: "Learning Overview", href: "/app/learning", icon: GraduationCap },
      { label: "Personalized Roadmap", href: "/app/learning/roadmaps/roadmap-domain-data-preprocessing", icon: Map },
      { label: "Domain Blueprints", href: "/app/learning/domains/domain-data-preprocessing", icon: BookOpen },
      { label: "Diagnostic Check", href: "/app/learning/domains/domain-data-preprocessing/diagnostic", icon: CheckSquare },
      { label: "Curated Resources", href: "/app/learning/resources", icon: Layers },
      { label: "Practice Exercises", href: "/app/learning/practice", icon: Code2 },
      { label: "Assessments", href: "/app/learning/assessments/assessment-domain-data-preprocessing", icon: CheckCircle2 },
      { label: "Mini-Projects", href: "/app/learning/projects", icon: FileCode },
      { label: "Progress & Mastery", href: "/app/learning/progress", icon: LineChart },
      { label: "Learning History", href: "/app/learning/history", icon: History },
      { label: "Updated Capability", href: "/app/learning/capability", icon: Award },
    ],
  },
  {
    category: "SKILL INTELLIGENCE",
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
    category: "AI INTELLIGENCE",
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
    category: "TRUST & GOVERNANCE",
    items: [
      { label: "Hallucination Guard", href: "/app/ai/guard", icon: ShieldAlert },
      { label: "Output Validation", href: "/app/ai/validation", icon: FileCode },
      { label: "Human Review Queue", href: "/app/ai/review-queue", icon: ClipboardList, restricted: "Reviewer" },
      { label: "Prompt-Injection Guard", href: "/app/ai/prompt-injection", icon: Shield, restricted: "Reviewer" },
      { label: "AI Evaluation Suite", href: "/app/ai/evaluation", icon: BarChart3, restricted: "Admin" },
      { label: "AI Audit Trail", href: "/app/ai/audit", icon: ScrollText },
    ],
  },
  {
    category: "EVIDENCE WORKSPACE",
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
    category: "SETTINGS & ACCESS",
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

export default function AppSidebar() {
  const pathname = usePathname();
  const { currentRole, setDemoRole, userProfile } = useEvidence();

  return (
    <aside className="w-64 shrink-0 bg-[#FBF6DF] border-r-[1.5px] border-[#1C1C1C] flex flex-col h-screen max-h-screen overflow-hidden select-none">
      {/* Workspace Brand Wordmark (Fixed Top) */}
      <div className="p-5 pb-3.5 shrink-0 border-b border-[#1C1C1C]/10 bg-[#FBF6DF]">
        <Link href="/app/passport" className="block group select-none">
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
      </div>

      {/* Navigation Categories (Scrolls Independently) */}
      <div className="flex-1 overflow-y-auto px-3.5 py-3 space-y-4 custom-scrollbar">
        {WORKSPACE_NAV.map((section) => (
          <div key={section.category}>
            <p className="text-[8.5px] font-black uppercase tracking-[0.15em] text-[#1C1C1C]/50 px-2 mb-1.5">
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

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C]"
                        : "text-[#1C1C1C]/75 hover:bg-[#FBF1CF] hover:text-[#1C1C1C]"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-1">
                      <Icon className="w-3.5 h-3.5 text-[#1C1C1C] flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.restricted && (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C]">
                          {item.restricted}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-3 h-3 text-[#1C1C1C]" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Simulated User Profile & Role Switcher at Bottom (Fixed Bottom) */}
      <div className="p-3.5 border-t border-[#1C1C1C]/15 bg-[#FBF1CF]/70 space-y-2.5 shrink-0">
        <Link
          href="/app/settings/profile"
          className="flex items-center gap-2.5 group hover:opacity-85 transition-opacity"
        >
          <div className="w-8 h-8 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-black text-xs shadow-[1px_1px_0_0_#1C1C1C]">
            {userProfile?.avatarInitials || "AR"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate text-[#1C1C1C] group-hover:underline">
              {userProfile?.displayName || "Alex Rivera"}
            </p>
            <span className="text-[9px] font-bold text-[#1C1C1C]/60 uppercase tracking-wider block truncate">
              {currentRole === "admin"
                ? "Demo Administrator"
                : currentRole === "reviewer"
                ? "Authorized Reviewer"
                : userProfile?.currentRole || "Software Developer"}
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
    </aside>
  );
}
