"use client";

import React from "react";
import Link from "next/link";
import { useEvidence } from "@/context/EvidenceContext";
import { useAuth } from "@/context/AuthContext";
import { Menu, Bell, ShieldCheck } from "lucide-react";

export default function MobileTopNav() {
  const {
    toggleMobileSidebar,
    unreadNotificationsCount,
    userProfile,
    currentRole,
  } = useEvidence();
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

  return (
    <div className="lg:hidden sticky top-0 z-30 bg-[#FBF6DF] border-b-[1.5px] border-[#1C1C1C] px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
      {/* Left: Mobile Drawer Trigger + Brand */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggleMobileSidebar}
          className="p-1.5 rounded-xl border border-[#1C1C1C] bg-[#DFE968] text-[#1C1C1C] shadow-[1.5px_1.5px_0_0_#1C1C1C] hover:bg-[#DFE968]/80 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          aria-label="Toggle navigation drawer"
        >
          <Menu className="w-4 h-4" />
        </button>

        <Link href="/app/passport" className="flex items-center gap-1.5 select-none">
          <span
            className="text-xl leading-none text-[#1C1C1C]"
            style={{ fontFamily: "'Yellowtail', cursive" }}
          >
            SkillPassport
          </span>
          <span
            className="text-xs text-[#1C1C1C]"
            style={{ fontFamily: "'Yellowtail', cursive" }}
          >
            app
          </span>
        </Link>
      </div>

      {/* Right: Role indicator badge, Notifications, and Avatar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-[#1C1C1C]/10 text-[#1C1C1C] border border-[#1C1C1C]/15 hidden xs:inline-block">
          {currentRole}
        </span>

        <Link
          href="/app/notifications"
          className="p-1.5 rounded-xl border border-[#1C1C1C]/20 bg-white/70 relative text-[#1C1C1C] hover:bg-white transition-colors"
          aria-label="View notifications"
        >
          <Bell className="w-3.5 h-3.5" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#C85A54] border border-[#FBF6DF]" />
          )}
        </Link>

        <Link
          href="/app/settings/profile"
          className="w-7 h-7 rounded-full bg-[#DFE968] border border-[#1C1C1C] flex items-center justify-center font-black text-[10px] shadow-[1px_1px_0_0_#1C1C1C] hover:opacity-90 transition-opacity"
          aria-label="User profile"
        >
          {realInitials}
        </Link>
      </div>
    </div>
  );
}
