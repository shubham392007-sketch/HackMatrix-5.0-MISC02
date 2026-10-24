"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import EvidenceHelpDrawer from "@/components/app/EvidenceHelpDrawer";
import AIHelpDrawer from "@/components/app/AIHelpDrawer";
import GovernanceHelpDrawer from "@/components/app/GovernanceHelpDrawer";
import SkillHelpDrawer from "@/components/app/SkillHelpDrawer";
import SettingsHelpDrawer from "@/components/app/SettingsHelpDrawer";
import {
  ArrowLeft,
  Bell,
  Info,
  HelpCircle,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  X,
  Compass,
  Briefcase,
  Menu,
} from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppTopBarProps {
  title: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export default function AppTopBar({
  title,
  description,
  badge,
  badgeColor,
  backHref,
  backLabel,
  breadcrumbs,
  children,
}: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    userProfile,
    unreadNotificationsCount,
    evidenceUnreadCount,
    evidenceNotifications,
    verificationUnreadCount,
    verificationNotifications,
    aiUnreadCount,
    aiNotifications,
    governanceUnreadCount,
    governanceNotifications,
    notifications,
    markNotificationRead,
    toasts,
    removeToast,
    toggleMobileSidebar,
  } = useEvidence();
  const { user: authUser, profile: authProfile, signOut } = useAuth();

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

  const realHeadline =
    authProfile?.headline ||
    authProfile?.job_title ||
    authProfile?.current_role ||
    userProfile?.headline ||
    "Software Developer";

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const headerRef = useRef<HTMLElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isEvidenceWorkspace = pathname?.startsWith("/app/evidence") ?? false;
  const isSkillPassport = pathname?.startsWith("/app/passport") ?? false;
  const isGovernanceWorkspace =
    pathname?.startsWith("/app/ai/guard") ||
    pathname?.startsWith("/app/ai/validation") ||
    pathname?.startsWith("/app/ai/review-queue") ||
    pathname?.startsWith("/app/ai/conflicts") ||
    pathname?.startsWith("/app/ai/prompt-injection") ||
    pathname?.startsWith("/app/ai/evaluation") ||
    pathname?.startsWith("/app/ai/audit") ||
    pathname?.startsWith("/app/ai/confidence") ||
    pathname?.startsWith("/app/governance");
  const isAIIntelligence = !isGovernanceWorkspace && (pathname?.startsWith("/app/ai") ?? false);
  const isSettingsWorkspace =
    (pathname?.startsWith("/app/settings") ||
      pathname?.startsWith("/app/notifications") ||
      pathname?.startsWith("/app/activity") ||
      pathname?.startsWith("/app/help")) ??
    false;
  const [feedMode, setFeedMode] = useState<"evidence" | "verification" | "ai" | "governance" | "all">(
    "all"
  );

  useEffect(() => {
    if (isGovernanceWorkspace) {
      setFeedMode("governance");
    } else if (isAIIntelligence) {
      setFeedMode("ai");
    } else if (isEvidenceWorkspace) {
      setFeedMode("evidence");
    } else if (isSkillPassport) {
      setFeedMode("verification");
    } else {
      setFeedMode("all");
    }
  }, [isEvidenceWorkspace, isSkillPassport, isAIIntelligence, isGovernanceWorkspace]);

  // Scroll detection on parent main scroll container
  useEffect(() => {
    const scrollContainer = headerRef.current?.closest("main") || window;
    const handleScroll = () => {
      const top = "scrollTop" in scrollContainer ? (scrollContainer as HTMLElement).scrollTop : window.scrollY;
      setIsScrolled(top > 12);
    };
    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => scrollContainer.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeUnreadCount = isGovernanceWorkspace
    ? governanceUnreadCount
    : isAIIntelligence
      ? aiUnreadCount
      : isEvidenceWorkspace
        ? evidenceUnreadCount
        : isSkillPassport
          ? verificationUnreadCount
          : unreadNotificationsCount;

  const displayList = useMemo(() => {
    const pool =
      feedMode === "governance"
        ? governanceNotifications
        : feedMode === "ai"
          ? aiNotifications
          : feedMode === "evidence"
            ? evidenceNotifications
            : feedMode === "verification"
              ? verificationNotifications
              : notifications;
    const unread = pool.filter((n) => !n.read);
    const read = pool.filter((n) => n.read);
    return [...unread, ...read].slice(0, 4);
  }, [
    feedMode,
    evidenceNotifications,
    verificationNotifications,
    aiNotifications,
    governanceNotifications,
    notifications,
  ]);

  // Auto-resolve breadcrumbs if not explicitly passed
  const resolvedBreadcrumbs = useMemo(() => {
    if (breadcrumbs && breadcrumbs.length > 0) return breadcrumbs;

    const crumbs: BreadcrumbItem[] = [
      { label: "SkillPassport", href: "/app/passport" }
    ];

    if (!pathname) return crumbs;

    if (pathname.startsWith("/app/evidence")) {
      crumbs.push({ label: "Evidence Workspace", href: "/app/evidence" });
    } else if (
      pathname.startsWith("/app/ai/guard") ||
      pathname.startsWith("/app/ai/validation") ||
      pathname.startsWith("/app/ai/review-queue") ||
      pathname.startsWith("/app/ai/prompt-injection") ||
      pathname.startsWith("/app/ai/evaluation") ||
      pathname.startsWith("/app/ai/audit")
    ) {
      crumbs.push({ label: "Trust & Governance", href: "/app/ai/guard" });
    } else if (pathname.startsWith("/app/ai")) {
      crumbs.push({ label: "AI Intelligence", href: "/app/ai" });
    } else if (
      pathname.startsWith("/app/passport/sharing") ||
      pathname.startsWith("/app/passport/builder") ||
      pathname.startsWith("/app/passport/preview") ||
      pathname.startsWith("/app/passport/share") ||
      pathname.startsWith("/app/passport/permissions") ||
      pathname.startsWith("/app/passport/access") ||
      pathname.startsWith("/app/passport/messages") ||
      pathname.startsWith("/app/passport/export")
    ) {
      crumbs.push({ label: "Sharing & Recruiter", href: "/app/passport/sharing" });
    } else if (
      pathname.startsWith("/app/passport/skills") ||
      pathname.startsWith("/app/passport/explorer") ||
      pathname.startsWith("/app/passport/taxonomy") ||
      pathname.startsWith("/app/passport/candidates") ||
      pathname.startsWith("/app/passport/coverage") ||
      pathname.startsWith("/app/passport/history")
    ) {
      crumbs.push({ label: "Skill Intelligence", href: "/app/passport/skills" });
    } else if (pathname.startsWith("/app/career")) {
      crumbs.push({ label: "Career Intelligence", href: "/app/career" });
    } else if (pathname.startsWith("/app/learning")) {
      crumbs.push({ label: "Learn & Grow", href: "/app/learning" });
    } else if (
      pathname.startsWith("/app/settings") ||
      pathname.startsWith("/app/notifications") ||
      pathname.startsWith("/app/activity") ||
      pathname.startsWith("/app/help")
    ) {
      crumbs.push({ label: "Settings & Access", href: "/app/settings" });
    }

    if (title) {
      const shortTitle = title.length > 26 ? title.slice(0, 24) + "…" : title;
      crumbs.push({ label: shortTitle });
    }
    return crumbs;
  }, [breadcrumbs, pathname, title]);

  return (
    <>
      {/* ── 1. Floating Capsule Navigation Bar (Sticky Island) ────── */}
      <header
        ref={headerRef}
        className="sticky top-3.5 sm:top-4 z-40 px-3.5 sm:px-6 lg:px-8 pointer-events-none print:hidden transition-all duration-300"
      >
        <div className="max-w-[1400px] mx-auto w-full pointer-events-auto">
          <div
            className={`floating-capsule-nav w-full flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-[#171717]/15 transition-all duration-200 select-none ${isScrolled
              ? "bg-[#FAF8F5]/95 backdrop-blur-md shadow-[0_12px_28px_-6px_rgba(23,23,23,0.12),0_2px_8px_-2px_rgba(23,23,23,0.06),1.5px_1.5px_0_0_#171717]"
              : "bg-[#FAF8F5] shadow-[0_4px_18px_-2px_rgba(23,23,23,0.06),0_1px_4px_rgba(23,23,23,0.03),1px_1px_0_0_#171717]"
              }`}
          >
            {/* Left section: Drawer Trigger, Back, Breadcrumbs & Title */}
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 max-w-[55%] sm:max-w-[60%]">
              {/* Mobile Drawer Trigger (Only shown on <1024px) */}
              <button
                type="button"
                onClick={toggleMobileSidebar}
                className="p-1.5 rounded-full border border-[#171717] bg-[#171717] text-[#FAF8F5] lg:hidden shrink-0 shadow-[1px_1px_0_0_#E6AC70] active:scale-95 transition-transform"
                aria-label="Toggle navigation drawer"
                title="Toggle menu"
              >
                <Menu className="w-3.5 h-3.5" />
              </button>

              {/* Back Link or Monogram */}
              {backHref ? (
                <Link
                  href={backHref}
                  className="inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-[#171717]/25 bg-white/70 hover:bg-[#171717] hover:text-[#FAF8F5] hover:border-[#171717] text-[#171717] shadow-[1px_1px_0_0_#171717] transition-all shrink-0 active:translate-x-0.5 active:translate-y-0.5"
                  title={backLabel || "Go back"}
                  aria-label={backLabel || "Go back"}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Link>
              ) : (
                <Link
                  href="/app/passport"
                  className="hidden sm:flex w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#171717] text-[#FAF8F5] items-center justify-center text-[10px] font-black tracking-tight shrink-0 shadow-[1px_1px_0_0_#E6AC70] hover:scale-105 transition-transform"
                  title="SkillPassport Overview"
                >
                  SP
                </Link>
              )}

              {/* Breadcrumb Navigation Trail & Page Title */}
              {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 ? (
                <nav
                  aria-label="Breadcrumb"
                  className="flex items-center gap-1.5 text-xs text-[#171717] min-w-0 overflow-hidden"
                >
                  {resolvedBreadcrumbs.map((crumb, idx) => {
                    const isLast = idx === resolvedBreadcrumbs.length - 1;
                    return (
                      <React.Fragment key={idx}>
                        {crumb.href && !isLast ? (
                          <Link
                            href={crumb.href}
                            className={`text-[11px] font-semibold text-[#171717]/60 hover:text-[#171717] hover:underline transition-colors shrink-0 ${idx > 0 && resolvedBreadcrumbs.length > 2 ? "hidden md:inline" : ""
                              }`}
                          >
                            {crumb.label}
                          </Link>
                        ) : (
                          <span
                            className={`truncate text-xs sm:text-[13px] font-bold text-[#171717] ${isLast ? "font-black" : "text-[#171717]/80"
                              }`}
                          >
                            {crumb.label}
                          </span>
                        )}
                        {!isLast && (
                          <ChevronRight
                            className={`w-3 h-3 text-[#171717]/35 shrink-0 ${idx > 0 && resolvedBreadcrumbs.length > 2 ? "hidden md:inline" : ""
                              }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>
              ) : (
                <span className="text-xs sm:text-[13px] font-black text-[#171717] truncate">
                  {title}
                </span>
              )}

              {/* Optional Status Badge */}
              {Boolean(badge) && badge !== "DEMO DATA" && (
                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border border-[#171717] uppercase shadow-[0.5px_0.5px_0_0_#171717] shrink-0 whitespace-nowrap ${badgeColor || "bg-[#E0A96D] text-[#171717]"
                    }`}
                >
                  {badge}
                </span>
              )}
            </div>

            {/* Right section: Primary Actions, Utilities, Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Primary Actions Passed Via Children */}
              {children && (
                <div className="flex items-center gap-1.5 sm:gap-2 header-action-group">
                  {children}
                </div>
              )}

              {/* Contextual Help Icon */}
              <button
                type="button"
                onClick={() => setIsHelpOpen(true)}
                title="Product Help & Conceptual Guidance"
                aria-label="Product Help & Conceptual Guidance"
                className="w-8 sm:w-8.5 h-8 sm:h-8.5 rounded-full bg-[#FAF8F5] border border-[#171717]/25 hover:border-[#171717] hover:bg-[#EAE5D9]/60 flex items-center justify-center text-[#171717] shadow-[1px_1px_0_0_#171717] transition-all cursor-pointer shrink-0 active:translate-x-0.5 active:translate-y-0.5"
              >
                <HelpCircle className="w-4 h-4 text-[#171717]/80" />
              </button>

              {/* Notifications Bell Dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifOpen((prev) => !prev)}
                  title="Notifications"
                  aria-label="Notifications"
                  aria-expanded={isNotifOpen}
                  className="relative w-8 sm:w-8.5 h-8 sm:h-8.5 rounded-full bg-[#FAF8F5] border border-[#171717]/25 hover:border-[#171717] hover:bg-[#EAE5D9]/60 flex items-center justify-center text-[#171717] shadow-[1px_1px_0_0_#171717] transition-all cursor-pointer shrink-0 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <Bell className="w-4 h-4 text-[#171717]/80" />
                  {activeUnreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-mono font-bold text-[9px] flex items-center justify-center border border-white shadow-xs">
                      {activeUnreadCount > 9 ? "9+" : activeUnreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border-2 border-ink shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-ink">Notifications</span>
                        {activeUnreadCount > 0 && (
                          <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                            {activeUnreadCount} unread
                          </span>
                        )}
                      </div>
                      <Link
                        href={
                          feedMode === "evidence"
                            ? "/app/notifications?category=evidence"
                            : feedMode === "verification"
                              ? "/app/notifications?category=verification"
                              : feedMode === "ai"
                                ? "/app/notifications?category=ai"
                                : "/app/notifications"
                        }
                        onClick={() => setIsNotifOpen(false)}
                        className="text-[11px] font-semibold text-ink/70 hover:text-ink underline"
                      >
                        View All
                      </Link>
                    </div>

                    {/* Feed Switcher Tabs */}
                    <div className="mt-2.5 flex items-center gap-1 p-1 bg-ink/5 rounded-xl text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setFeedMode("governance")}
                        className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${feedMode === "governance"
                          ? "bg-white text-ink shadow-sm border border-ink/10"
                          : "text-ink/60 hover:text-ink"
                          }`}
                      >
                        <span>Governance</span>
                        {governanceUnreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-mono font-bold">
                            {governanceUnreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedMode("verification")}
                        className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${feedMode === "verification"
                          ? "bg-white text-ink shadow-sm border border-ink/10"
                          : "text-ink/60 hover:text-ink"
                          }`}
                      >
                        <span>Passport</span>
                        {verificationUnreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-mono font-bold">
                            {verificationUnreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedMode("ai")}
                        className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${feedMode === "ai"
                          ? "bg-white text-ink shadow-sm border border-ink/10"
                          : "text-ink/60 hover:text-ink"
                          }`}
                      >
                        <span>AI</span>
                        {aiUnreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-mono font-bold">
                            {aiUnreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedMode("evidence")}
                        className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${feedMode === "evidence"
                          ? "bg-white text-ink shadow-sm border border-ink/10"
                          : "text-ink/60 hover:text-ink"
                          }`}
                      >
                        <span>Evidence</span>
                        {evidenceUnreadCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[9px] font-mono font-bold">
                            {evidenceUnreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedMode("all")}
                        className={`flex-1 py-1 px-1.5 rounded-lg transition-all text-center flex items-center justify-center gap-1 ${feedMode === "all"
                          ? "bg-white text-ink shadow-sm border border-ink/10"
                          : "text-ink/60 hover:text-ink"
                          }`}
                      >
                        <span>All</span>
                        {unreadNotificationsCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full bg-ink/10 text-ink text-[9px] font-mono font-bold">
                            {unreadNotificationsCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Notification Items List */}
                    <div className="py-2.5 space-y-2 max-h-72 overflow-y-auto">
                      {displayList.length === 0 ? (
                        <div className="py-6 text-center text-xs text-ink/60">
                          {feedMode === "governance"
                            ? "No Trust & Governance notifications."
                            : feedMode === "evidence"
                              ? "No Evidence Workspace notifications."
                              : feedMode === "verification"
                                ? "No Skill Intelligence notifications."
                                : feedMode === "ai"
                                  ? "No AI Intelligence notifications."
                                  : "No notifications recorded."}
                        </div>
                      ) : (
                        displayList.map((notif) => {
                          const isError = notif.severity === "error";
                          const isWarning = notif.severity === "warning";
                          return (
                            <div
                              key={notif.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${notif.read
                                ? "bg-ink/5 hover:bg-[#DFE968]/20 border-ink/10"
                                : isError
                                  ? "bg-rose-50/60 border-rose-300"
                                  : isWarning
                                    ? "bg-amber-50/60 border-amber-300"
                                    : "bg-white border-ink/30 border-l-4 border-l-ink"
                                }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-ink truncate flex-1">{notif.title}</span>
                                <span className="text-[10px] text-ink/50 shrink-0">{notif.timestamp}</span>
                              </div>
                              <p className="text-[11px] text-ink/75 leading-relaxed line-clamp-2">
                                {notif.description}
                              </p>
                              <div className="flex items-center justify-between pt-1 border-t border-ink/5">
                                {notif.actionRoute ? (
                                  <Link
                                    href={notif.actionRoute}
                                    onClick={() => {
                                      markNotificationRead(notif.id);
                                      setIsNotifOpen(false);
                                    }}
                                    className={`inline-flex items-center gap-1 font-semibold text-[10px] underline ${isError ? "text-rose-700 hover:text-rose-900" : "text-ink hover:text-ink/80"
                                      }`}
                                  >
                                    <span>{notif.actionLabel || (isError ? "Retry / Inspect" : "View Details")}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </Link>
                                ) : (
                                  <span className="text-[10px] text-ink/40 font-mono">{notif.relatedDomain}</span>
                                )}
                                {!notif.read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markNotificationRead(notif.id);
                                    }}
                                    className="text-[10px] text-ink/50 hover:text-ink font-semibold"
                                  >
                                    Mark read
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 border-t border-ink/10 text-center">
                      <Link
                        href={
                          feedMode === "governance"
                            ? "/app/notifications?category=governance"
                            : feedMode === "evidence"
                              ? "/app/notifications?category=evidence"
                              : feedMode === "verification"
                                ? "/app/notifications?category=verification"
                                : feedMode === "ai"
                                  ? "/app/notifications?category=ai"
                                  : "/app/notifications"
                        }
                        onClick={() => setIsNotifOpen(false)}
                        className="inline-flex items-center justify-center w-full py-1.5 rounded-xl bg-[#000000] text-[#FAF8F5] border border-[#1A1918] text-xs font-bold hover:bg-[#1A1918] transition-all shadow-[1px_1px_0_0_#1A1918]"
                      >
                        Open Notification Center
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Avatar Capsule Pill */}
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((prev) => !prev)}
                  title="User Account & Profile"
                  aria-label="User Account & Profile"
                  aria-expanded={isProfileOpen}
                  className="flex items-center gap-1.5 sm:gap-2 h-8 sm:h-8.5 pl-1 pr-2 sm:pr-2.5 rounded-full bg-[#FAF8F5] border border-[#171717]/25 hover:border-[#171717] hover:bg-[#EAE5D9]/60 shadow-[1px_1px_0_0_#171717] transition-all cursor-pointer shrink-0 active:translate-x-0.5 active:translate-y-0.5"
                >
                  <div className="w-6 h-6 rounded-full bg-[#E0A96D] border border-[#171717] font-black text-[10px] flex items-center justify-center text-[#171717] shrink-0">
                    {realInitials}
                  </div>
                  <span className="text-xs font-bold text-[#171717] hidden sm:inline max-w-[90px] md:max-w-[120px] truncate">
                    {realDisplayName}
                  </span>
                  <ChevronDown className="w-3 h-3 text-[#171717]/60 hidden sm:inline shrink-0" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 top-[calc(100%+10px)] w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#171717] shadow-[4px_4px_0_0_#171717] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                    <div className="p-2.5 border-b border-[#171717]/10 space-y-0.5">
                      <div className="font-bold text-[#171717] truncate">{realDisplayName}</div>
                      <div className="text-[10px] text-[#171717]/60 truncate">{realHeadline}</div>
                    </div>

                    <div className="py-1 space-y-0.5">
                      <Link
                        href="/app/settings/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-[#EAE5D9]/60 font-semibold transition-colors"
                      >
                        <User className="w-3.5 h-3.5 text-[#1A1918]/60" />
                        <span>Profile Identity</span>
                      </Link>
                      <Link
                        href="/app/settings/connections"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-[#EAE5D9]/60 font-semibold transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1A1918]/60" />
                        <span>Connected Accounts</span>
                      </Link>
                      <Link
                        href="/app/settings/privacy"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-[#EAE5D9]/60 font-semibold transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#1A1918]/60" />
                        <span>Privacy & Consent</span>
                      </Link>
                      <Link
                        href="/app/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-[#EAE5D9]/60 font-semibold transition-colors"
                      >
                        <Settings className="w-3.5 h-3.5 text-[#1A1918]/60" />
                        <span>Preferences & Settings</span>
                      </Link>
                      <Link
                        href="/recruiter/dashboard"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#C04832] hover:bg-[#C04832]/10 font-bold transition-colors"
                      >
                        <Briefcase className="w-3.5 h-3.5" />
                        <span>Recruiter Workspace &rarr;</span>
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-[#171717]/10">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileOpen(false);
                          await signOut();
                          router.push("/login");
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-bold transition-colors text-left"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── 2. Compact Editorial Page Heading Area (Scrolls Naturally) ── */}
      {description && (
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-1 print:hidden select-none">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl lg:text-[26px] font-serif font-black text-[#171717] tracking-tight leading-tight">
                {title}
              </h1>
              {Boolean(badge) && badge !== "DEMO DATA" && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black border border-[#171717] uppercase shadow-[1px_1px_0_0_#171717] shrink-0 whitespace-nowrap ${badgeColor || "bg-[#E0A96D] text-[#171717]"
                    }`}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs sm:text-[13px] font-medium text-[#171717]/75 max-w-3xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      )}

      {/* ── 3. Floating Toast Notification Container ───────────────── */}
      {toasts && toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl border-2 border-ink shadow-2xl pointer-events-auto flex items-start justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200 ${toast.type === "success"
                ? "bg-[#DFE968] text-ink"
                : toast.type === "error"
                  ? "bg-rose-100 text-rose-950"
                  : "bg-white text-ink"
                }`}
            >
              <div className="flex items-start gap-2.5">
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                ) : toast.type === "error" ? (
                  <XCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-ink shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 text-xs">
                  <div className="font-bold">{toast.title}</div>
                  <div className="text-[11px] opacity-90 leading-relaxed">{toast.message}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg hover:bg-black/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. Help Drawers ────────────────────────────────────────── */}
      {isEvidenceWorkspace && (
        <EvidenceHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentPathname={pathname || ""}
        />
      )}

      {isGovernanceWorkspace && (
        <GovernanceHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentPathname={pathname || ""}
        />
      )}

      {isSkillPassport && (
        <SkillHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentPathname={pathname || ""}
        />
      )}

      {isSettingsWorkspace && (
        <SettingsHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentPathname={pathname || ""}
        />
      )}

      {!isEvidenceWorkspace && !isGovernanceWorkspace && !isSkillPassport && !isSettingsWorkspace && (
        <AIHelpDrawer
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentPathname={pathname || ""}
        />
      )}
    </>
  );
}
