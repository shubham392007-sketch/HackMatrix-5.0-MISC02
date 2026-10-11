"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
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
} from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface AppTopBarProps {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  children?: React.ReactNode;
}

export default function AppTopBar({
  title,
  description,
  backHref,
  backLabel,
  breadcrumbs,
  children,
}: AppTopBarProps) {
  const {
    userProfile,
    unreadNotificationsCount,
    notifications,
    markNotificationRead,
    toasts,
    removeToast,
  } = useEvidence();

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

  return (
    <header className="sticky top-0 z-40 bg-[#FBF1CF]/95 backdrop-blur-sm border-b-[1.5px] border-[#1C1C1C] px-4 sm:px-6 lg:px-10 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      {/* Left side: Breadcrumbs, Back, Title */}
      <div className="min-w-0">
        {/* Breadcrumbs if provided */}
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-bold text-ink/60 mb-1">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  {crumb.href && !isLast ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-ink hover:underline transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={isLast ? "text-ink font-extrabold" : ""}>
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
            className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 hover:text-[#1C1C1C] mb-1 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>{backLabel || "Back"}</span>
          </Link>
        ) : null}

        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1C1C1C] truncate">
            {title}
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black bg-[#DFE968] border border-[#1C1C1C] uppercase shadow-[1px_1px_0_0_#1C1C1C] shrink-0">
            DEMO DATA
          </span>
        </div>

        {description && (
          <p className="text-xs font-medium text-[#1C1C1C]/75 mt-0.5 max-w-2xl line-clamp-1 sm:line-clamp-none">
            {description}
          </p>
        )}
      </div>

      {/* Right side: Global Actions & Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 flex-wrap">
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
              {userProfile?.avatarInitials || "AR"}
            </div>
            <span className="text-xs font-bold text-ink hidden sm:inline max-w-[100px] truncate">
              {userProfile?.displayName || "Alex Rivera"}
            </span>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] rounded-2xl bg-white border-2 border-ink shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
              <div className="p-2.5 border-b border-ink/10 space-y-0.5">
                <div className="font-bold text-ink truncate">
                  {userProfile?.displayName || "Alex Rivera"}
                </div>
                <div className="text-[10px] text-ink/60 truncate">
                  {userProfile?.headline || "Software Developer"}
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
                <Link
                  href="/"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-medium transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Exit to Public Portal</span>
                </Link>
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
