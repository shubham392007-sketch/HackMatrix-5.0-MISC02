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
  ScrollText,
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
];

export default function AppSidebar() {
  const pathname = usePathname();
  const { currentRole, setDemoRole } = useEvidence();

  return (
    <aside className="w-64 shrink-0 bg-[#FBF6DF] border-r-[1.5px] border-[#1C1C1C] flex flex-col justify-between min-h-screen">
      <div className="p-5">
        {/* Workspace Brand Wordmark */}
        <Link href="/app/passport" className="block mb-6 group select-none">
          <div className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-[#1C1C1C]">
              SkillPassport
            </span>
            <span
              className="text-base text-[#1C1C1C]"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              app
            </span>
          </div>
          <span className="text-[8.5px] font-black uppercase tracking-[0.16em] text-[#1C1C1C]/60 block -mt-0.5">
            VERIFIABLE TALENT PASSPORT
          </span>
        </Link>

        {/* Navigation Categories */}
        <div className="space-y-4">
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
      </div>

      {/* Simulated User Profile & Role Switcher at Bottom */}
      <div className="p-3.5 border-t border-[#1C1C1C]/15 bg-[#FBF1CF]/70 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-black text-xs shadow-[1px_1px_0_0_#1C1C1C]">
            AR
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black truncate text-[#1C1C1C]">Alex Rivera</p>
            <span className="text-[9px] font-bold text-[#1C1C1C]/60 uppercase tracking-wider block truncate">
              {currentRole === "admin"
                ? "Demo Administrator"
                : currentRole === "reviewer"
                ? "Authorized Reviewer"
                : "Software Developer"}
            </span>
          </div>
        </div>

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
