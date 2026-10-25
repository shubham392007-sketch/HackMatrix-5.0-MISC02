"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppTopBar from "@/components/app/AppTopBar";
import { useEvidence } from "@/context/EvidenceContext";
import { NotificationCategory, AppNotification } from "@/types/account";
import { EmptyState } from "@/components/app/AppStates";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  ExternalLink,
  Layers,
  Scale,
  GraduationCap,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Filter,
  Sparkles,
} from "lucide-react";

function NotificationsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const {
    notifications,
    unreadNotificationsCount,
    markNotificationRead,
    markAllNotificationsRead,
    dismissNotification,
  } = useEvidence();

  const [selectedCategory, setSelectedCategory] = useState<
    "all" | NotificationCategory
  >(() => {
    if (categoryParam && ["evidence", "verification", "ai", "governance", "learning", "sharing", "system"].includes(categoryParam)) {
      return categoryParam as NotificationCategory;
    }
    return "all";
  });

  useEffect(() => {
    if (categoryParam && ["evidence", "verification", "ai", "governance", "learning", "sharing", "system"].includes(categoryParam)) {
      setSelectedCategory(categoryParam as NotificationCategory);
    }
  }, [categoryParam]);

  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  // Filter notifications
  const filteredNotifications = notifications.filter((notif) => {
    if (selectedCategory !== "all" && notif.category !== selectedCategory) {
      return false;
    }
    if (filterUnreadOnly && notif.read) {
      return false;
    }
    return true;
  });

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "evidence":
        return Layers;
      case "verification":
        return Scale;
      case "ai":
        return Sparkles;
      case "governance":
        return ShieldCheck;
      case "learning":
        return GraduationCap;
      case "sharing":
        return Share2;
      case "system":
        return ShieldAlert;
      default:
        return Bell;
    }
  };

  const getSeverityBadge = (severity: AppNotification["severity"]) => {
    switch (severity) {
      case "success":
        return {
          icon: CheckCircle2,
          color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        };
      case "warning":
        return {
          icon: AlertTriangle,
          color: "text-amber-800 bg-amber-50 border-amber-200",
        };
      case "error":
        return {
          icon: XCircle,
          color: "text-rose-700 bg-rose-50 border-rose-200",
        };
      default:
        return {
          icon: Info,
          color: "text-blue-700 bg-blue-50 border-blue-200",
        };
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <AppTopBar
        title="Notification Center"
        description="Operational alerts, verification milestones, and sharing access events across all SkillPassport domains."
        breadcrumbs={[
          { label: "Settings & Access", href: "/app/settings" },
          { label: "Notifications" },
        ]}
      />

      <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl w-full mx-auto pb-16">
        {/* Header Controls */}
        <div className="p-6 rounded-2xl bg-white border border-ink/15 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-ink/10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#DFE968] border border-ink/20 flex items-center justify-center font-bold text-ink">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-ink">
                  Application Notifications
                </h2>
                <p className="text-xs text-ink/60">
                  {unreadNotificationsCount} unread alert
                  {unreadNotificationsCount === 1 ? "" : "s"} across active domains
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {unreadNotificationsCount > 0 && (
                <button
                  type="button"
                  onClick={markAllNotificationsRead}
                  className="px-3.5 py-1.5 rounded-xl border border-ink/20 bg-white hover:bg-ink/5 text-ink text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-ink/70" />
                  <span>Mark All as Read</span>
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Events" },
                  { id: "governance", label: "Trust & Governance" },
                  { id: "evidence", label: "Evidence" },
                  { id: "verification", label: "Verification" },
                  { id: "ai", label: "AI Intelligence" },
                  { id: "learning", label: "Learning" },
                  { id: "sharing", label: "Sharing" },
                  { id: "system", label: "System" },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-semibold transition-all border ${
                    selectedCategory === cat.id
                      ? "bg-ink text-[#FBF1CF] border-ink"
                      : "bg-white text-ink/70 border-ink/15 hover:bg-ink/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-semibold text-xs text-ink select-none">
              <input
                type="checkbox"
                checked={filterUnreadOnly}
                onChange={(e) => setFilterUnreadOnly(e.target.checked)}
                className="w-4 h-4 rounded border-ink/30 text-ink focus:ring-0"
              />
              <span>Unread Only</span>
            </label>
          </div>
        </div>

        {/* Notification Feed List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No Notifications Found"
              description={
                filterUnreadOnly
                  ? "You have no unread notifications matching the selected category filter."
                  : "No notifications have been recorded for this category."
              }
              actionLabel="Reset Notification Filters"
              onAction={() => {
                setSelectedCategory("all");
                setFilterUnreadOnly(false);
              }}
            />
          ) : (
            filteredNotifications.map((notif) => {
              const CategoryIcon = getCategoryIcon(notif.category);
              const severity = getSeverityBadge(notif.severity);
              const SeverityIcon = severity.icon;

              return (
                <div
                  key={notif.id}
                  className={`p-5 rounded-2xl border transition-all space-y-3 shadow-sm ${
                    notif.read
                      ? "bg-white/80 border-ink/10 hover:border-ink/20"
                      : "bg-white border-ink/30 border-l-4 border-l-ink"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-ink/5 border border-ink/10 flex items-center justify-center text-ink shrink-0 mt-0.5">
                        <CategoryIcon className="w-4 h-4" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-ink">
                            {notif.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-md font-mono text-[10px] font-bold border ${severity.color}`}
                          >
                            <SeverityIcon className="w-3 h-3" />
                            {notif.severity.toUpperCase()}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                          )}
                        </div>

                        <p className="text-xs text-ink/75 leading-relaxed">
                          {notif.description}
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px] text-ink/50 shrink-0">
                      {notif.timestamp}
                    </div>
                  </div>

                  {/* Metadata and Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ink/10 text-xs">
                    <span className="text-[11px] font-mono text-ink/60">
                      {notif.relatedDomain}
                    </span>

                    <div className="flex items-center gap-2">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={() => markNotificationRead(notif.id)}
                          className="px-2.5 py-1 rounded-lg hover:bg-ink/5 text-ink/70 hover:text-ink text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Read</span>
                        </button>
                      )}

                      {notif.actionRoute && (
                        <Link
                          href={notif.actionRoute}
                          onClick={() => markNotificationRead(notif.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-ink text-[#FBF1CF] hover:bg-ink/90 text-[11px] font-semibold transition-all shadow-sm"
                        >
                          <span>{notif.actionLabel || "Inspect Record"}</span>
                          <ExternalLink className="w-3 h-3 opacity-80" />
                        </Link>
                      )}

                      <button
                        type="button"
                        onClick={() => dismissNotification(notif.id)}
                        title="Dismiss notification"
                        className="p-1 rounded-lg hover:bg-rose-50 text-ink/40 hover:text-rose-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex flex-col min-w-0">
          <AppTopBar
            title="Notification Center"
            description="Loading notifications..."
            breadcrumbs={[
              { label: "Settings & Access", href: "/app/settings" },
              { label: "Notifications" },
            ]}
          />
          <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto pb-16">
            <div className="p-8 text-center text-xs text-ink/60 bg-white rounded-2xl border border-ink/10">
              Loading notifications...
            </div>
          </div>
        </div>
      }
    >
      <NotificationsContent />
    </Suspense>
  );
}
