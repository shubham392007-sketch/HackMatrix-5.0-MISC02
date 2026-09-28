"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ArrowRight, LogOut, User as UserIcon, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

const publicNav = [
  { label: "HOME", href: "/" },
  { label: "FEATURES", href: "/features" },
  { label: "ABOUT", href: "/about" },
];

const employeeNav = [
  { label: "OVERVIEW", href: "/employee/dashboard" },
  { label: "EVIDENCE", href: "/employee/evidence" },
  { label: "SKILLS", href: "/employee/skills" },
  { label: "SIMULATOR", href: "/employee/simulator" },
  { label: "ACTIONS", href: "/employee/recommendations" },
  { label: "INTELLIGENCE", href: "/employee/narrative" },
];

const managerNav = [
  { label: "DASHBOARD", href: "/manager/dashboard" },
  { label: "TEAM GROWTH", href: "/manager/growth" },
  { label: "TEAM HEATMAP", href: "/manager/heatmap" },
  { label: "SKILLS", href: "/employee/skills" },
  { label: "SIMULATOR", href: "/employee/simulator" },
  { label: "INTELLIGENCE", href: "/employee/narrative" },
];

export default function GlobalHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { authenticated, profile, role, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = authenticated
    ? (!profile?.onboarding_completed
        ? [{ label: "SETUP PROFILE & INTEGRATIONS", href: "/onboarding" }]
        : (role === "MANAGER" ? managerNav : employeeNav))
    : publicNav;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FBF1CF] border-b-[1.5px] border-[#1C1C1C]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <Link
          href={
            authenticated
              ? (!profile?.onboarding_completed
                  ? "/onboarding"
                  : (role === "MANAGER" ? "/manager/dashboard" : "/employee/dashboard"))
              : "/"
          }
          className="flex items-center gap-1 group"
        >
          <span
            className="text-3xl md:text-4xl leading-none text-[#1C1C1C] select-none tracking-tight font-normal"
            style={{ fontFamily: "'Yellowtail', cursive" }}
          >
            GrowthLens
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || (item.href.startsWith("/#") && pathname === "/");
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`text-[11px] font-extrabold tracking-[0.12em] uppercase transition-all py-1 relative ${
                  isActive
                    ? "text-[#1C1C1C] border-b-2 border-[#1C1C1C]"
                    : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right CTA Button & Profile State */}
        <div className="hidden sm:flex items-center gap-3">
          {authenticated && profile ? (
            <div className="flex items-center gap-3">
              {/* User Identity Pill - Clickable link to Profile */}
              <Link
                href="/employee/profile"
                className="flex items-center gap-2 bg-[#FBF6DF] border-[1.5px] border-[#1C1C1C] rounded-full px-3 py-1 shadow-[2px_2px_0_0_#1C1C1C] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_0_#1C1C1C] transition-all cursor-pointer group"
                title="View & Edit Profile / Integrations"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-[#1C1C1C] ${role === 'MANAGER' ? 'bg-[#F6C8D6]' : 'bg-[#DFE968]'}`}>
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left pr-1">
                  <p className="text-[11px] font-black leading-tight truncate max-w-[120px] group-hover:underline">
                    {profile.full_name?.split(" ")[0]}
                  </p>
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#1C1C1C]/60 block leading-none">
                    {role || "EMPLOYEE"}
                  </span>
                </div>
              </Link>

              {/* View Switcher if Manager */}
              {role === "MANAGER" && (
                <Link
                  href={pathname.startsWith("/manager") ? "/employee/dashboard" : "/manager/dashboard"}
                  className="bg-[#DFE968] border border-[#1C1C1C] text-[#1C1C1C] text-[10px] font-black tracking-[0.08em] uppercase px-3.5 py-2 rounded-full hover:opacity-90 transition-all shadow-[2px_2px_0_0_#1C1C1C]"
                >
                  {pathname.startsWith("/manager") ? "LEARNER VIEW" : "MANAGER VIEW"}
                </Link>
              )}

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="bg-transparent border border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-extrabold tracking-[0.08em] uppercase px-3.5 py-2 rounded-full hover:bg-[#1C1C1C]/5 transition-all flex items-center gap-1.5"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>EXIT</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="bg-transparent border border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold tracking-[0.08em] uppercase px-4 py-2 rounded-full hover:bg-[#1C1C1C]/5 transition-all"
              >
                LOG IN
              </Link>
              <Link
                href="/signup"
                className="bg-[#1C1C1C] text-[#FBF1CF] text-[11px] font-bold tracking-[0.08em] uppercase px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 hover:opacity-90 transition-all shadow-[2px_2px_0px_#1C1C1C]"
              >
                SIGN UP
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden p-2 rounded-full border border-[#1C1C1C] bg-[#FBF6DF]"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#FBF1CF] border-t border-[#1C1C1C] px-5 py-4 space-y-2">
          {authenticated && profile && (
            <div className="pb-3 mb-2 border-b border-[#1C1C1C]/20 flex items-center justify-between">
              <Link
                href="/employee/profile"
                onClick={() => setMobileOpen(false)}
                className="hover:underline flex items-center gap-2"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border border-[#1C1C1C] ${role === 'MANAGER' ? 'bg-[#F6C8D6]' : 'bg-[#DFE968]'}`}>
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="text-xs font-black">{profile.full_name}</p>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{role} • Settings</span>
                </div>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs font-black uppercase text-red-600 flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> LOGOUT
              </button>
            </div>
          )}
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-xs font-bold tracking-[0.1em] uppercase text-[#1C1C1C]"
            >
              {item.label}
            </Link>
          ))}
          {!authenticated && (
            <div className="pt-2 border-t border-[#1C1C1C]/20 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2 text-xs font-black uppercase border border-[#1C1C1C] rounded-full"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2 text-xs font-black uppercase bg-[#1C1C1C] text-white rounded-full"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
