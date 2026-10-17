"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
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
  ExternalLink,
  CheckCircle2,
  XCircle,
  X,
  Compass,
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
    currentRole,
    setDemoRole,
    userProfile,
    unreadNotificationsCount,
    notifications,
    markNotificationRead,
    toasts,
    removeToast,
    logoutDemo,
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

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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

  const latestUnread = notifications.filter((n) => !n.read).slice(0, 3);

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
      pathname.startsWith("/app/passport/preview") ||
      pathname.startsWith("/app/passport/share") ||
      pathname.startsWith("/app/passport/permissions") ||
      pathname.startsWith("/app/passport/access") ||
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
    <header className="sticky top-0 z-40 bg-[#FBF1CF] border-b-[1.5px] border-[#1C1C1C] px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden shadow-xs">
      {/* Left side: Breadcrumbs, Back, Title */}
      <div className="min-w-0 flex-1">
        {/* Breadcrumb Navigation */}
        {resolvedBreadcrumbs && resolvedBreadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[10.5px] font-bold text-ink/70 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
            {resolvedBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === resolvedBreadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-ink hover:underline transition-colors shrink-0"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={`truncate ${isLast ? "text-ink font-extrabold" : "shrink-0"}`}>
                      {crumb.label}
                    </span>
                  )}
                  {!isLast && <ChevronRight className="w-3 h-3 text-ink/40 shrink-0" />}
                </React.Fragment>
              );
            })}
          </nav>
        ) : backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 hover:text-[#1C1C1C] mb-0.5 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{backLabel || "Back"}</span>
          </Link>
        ) : null}

        <div className="flex items-center gap-2.5 min-w-0">
          <h1
            className="text-xl sm:text-2xl text-[#1C1C1C] leading-none font-normal whitespace-nowrap truncate"
            style={{ fontFamily: "'Yellowtail', cursive" }}
          >
            {title}
          </h1>
          {Boolean(badge) && badge !== "DEMO DATA" && (
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border border-[#1C1C1C] uppercase shadow-[1px_1px_0_0_#1C1C1C] shrink-0 whitespace-nowrap ${badgeColor || "bg-[#DFE968]"}`}>
              {badge}
            </span>
          )}
        </div>

        {description && (
          <p
            className="text-[11px] sm:text-xs font-medium text-[#1C1C1C]/75 mt-0.5 max-w-2xl line-clamp-1"
            title={description}
          >
            {description}
          </p>
        )}
      </div>

      {/* Right side: Global Actions & Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-nowrap">
        {/* Interactive Demo Role Switcher in Header */}
        <div className="hidden sm:inline-flex items-center gap-1 p-1 bg-white/90 rounded-full border border-ink/20 text-xs shadow-[1px_1px_0_0_#1C1C1C]">
          <span className="text-[9px] font-black uppercase text-ink/60 px-2">ROLE:</span>
          {(["employee", "reviewer", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDemoRole(r)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize transition-all ${
                currentRole === r
                  ? "bg-[#1C1C1C] text-white shadow-sm"
                  : "text-ink/70 hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {children}

        {/* Contextual Help Icon */}
        <Link
          href="/app/help"
          title="Product Help & Conceptual Guidance"
          className="w-8 h-8 rounded-full bg-white/80 border border-ink/20 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-white transition-all shadow-[1px_1px_0_0_#1C1C1C]"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen((prev) => !prev)}
            title="Notifications"
            className="relative w-8 h-8 rounded-full bg-white/80 border border-ink/20 flex items-center justify-center text-ink/70 hover:text-ink hover:bg-white transition-all shadow-[1px_1px_0_0_#1C1C1C]"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-mono font-bold text-[9px] flex items-center justify-center border border-white">
                {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border-2 border-ink shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-ink/10">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-ink">Notifications</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="px-2 py-0.2 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                      {unreadNotificationsCount} unread
                    </span>
                  )}
                </div>
                <Link
                  href="/app/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-[11px] font-semibold text-ink/70 hover:text-ink underline"
                >
                  View All
                </Link>
              </div>

              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {latestUnread.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink/60">
                    No unread notifications.
                  </div>
                ) : (
                  latestUnread.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => markNotificationRead(notif.id)}
                      className="p-2.5 rounded-xl bg-ink/5 hover:bg-[#DFE968]/20 border border-ink/10 text-xs space-y-1 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-ink">{notif.title}</span>
                        <span className="text-[10px] text-ink/50">{notif.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-ink/70 leading-relaxed line-clamp-2">
                        {notif.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-ink/10 text-center">
                <Link
                  href="/app/notifications"
                  onClick={() => setIsNotifOpen(false)}
                  className="inline-flex items-center justify-center w-full py-1.5 rounded-xl bg-ink text-[#FBF1CF] text-xs font-semibold hover:bg-ink/90 transition-all"
                >
                  Open Notification Center
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setIsProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-white/80 border border-ink/20 hover:bg-white transition-all shadow-[1px_1px_0_0_#1C1C1C]"
          >
            <div className="w-6 h-6 rounded-full bg-[#DFE968] border border-ink font-black text-[10px] flex items-center justify-center text-ink">
              {realInitials}
            </div>
            <span className="text-xs font-bold text-ink hidden sm:inline max-w-[120px] truncate">
              {realDisplayName}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border-2 border-ink shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="p-2.5 border-b border-ink/10 space-y-0.5">
                <div className="font-bold text-ink truncate">
                  {realDisplayName}
                </div>
                <div className="text-[10px] text-ink/60 truncate">
                  {realHeadline}
                </div>
              </div>

              <div className="py-1 space-y-0.5">
                <Link
                  href="/app/settings/profile"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-ink hover:bg-[#FBF1CF] font-medium transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-ink/60" />
                  <span>Profile Identity</span>
                </Link>
                <Link
                  href="/app/settings/connections"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-ink hover:bg-[#FBF1CF] font-medium transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-ink/60" />
                  <span>Connected Accounts</span>
                </Link>
                <Link
                  href="/app/settings/privacy"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-ink hover:bg-[#FBF1CF] font-medium transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-ink/60" />
                  <span>Privacy & Consent</span>
                </Link>
                <Link
                  href="/app/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-ink hover:bg-[#FBF1CF] font-medium transition-colors"
                >
                  <Settings className="w-3.5 h-3.5 text-ink/60" />
                  <span>Preferences & Settings</span>
                </Link>
              </div>

              <div className="pt-1 border-t border-ink/10">
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

      {/* Floating Toast Notification Container */}
      {toasts && toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-3.5 rounded-2xl border-2 border-ink shadow-2xl pointer-events-auto flex items-start justify-between gap-3 animate-in slide-in-from-bottom-2 duration-200 ${
                toast.type === "success"
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
                  <div className="text-[11px] opacity-90 leading-relaxed">
                    {toast.message}
                  </div>
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
    </header>
  );
}
