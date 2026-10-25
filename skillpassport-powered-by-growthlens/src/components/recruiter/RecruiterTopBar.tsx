"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import SharingHelpDrawer from "@/components/app/SharingHelpDrawer";
import {
  Briefcase,
  Users,
  MessageSquare,
  Building,
  LogOut,
  Compass,
  ChevronDown,
  ShieldCheck,
  PlusCircle,
  Menu,
  X,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import {
  getStoredRecruiterUser,
  clearRecruiterAuthSession,
  getCurrentRecruiterProfile,
  logoutRecruiter,
  RecruiterProfile,
} from "@/lib/recruiterApi";

export default function RecruiterTopBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<RecruiterProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch authoritative profile from API
    getCurrentRecruiterProfile()
      .then((p) => setProfile(p))
      .catch((err) => {
        console.warn("Could not retrieve recruiter profile in topbar:", err);
      });
  }, [pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await logoutRecruiter();
    router.push("/recruiter/login");
  };

  const navLinks = [
    { label: "Dashboard", href: "/recruiter/dashboard", icon: Compass },
    { label: "Jobs", href: "/recruiter/jobs", icon: Briefcase },
    { label: "Candidates", href: "/recruiter/candidates", icon: Users },
    { label: "Inbox", href: "/recruiter/inbox", icon: MessageSquare },
    { label: "Organization", href: "/recruiter/organization", icon: Building },
  ];

  const displayName = profile?.full_name || "Recruiter";
  const orgName = profile?.organization?.name || "Organization";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase() || "RC";

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5] border-b-[1.5px] border-[#1A1918] shadow-[0_2px_0_0_#1A1918]/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand & Portal Badge */}
          <div className="flex items-center gap-4">
            <Link href="/recruiter/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1A1918] text-[#FAF8F5] flex items-center justify-center font-black text-sm shadow-[1.5px_1.5px_0_0_#1A1918]">
                SP
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-[#1A1918] tracking-tight flex items-center gap-1.5">
                  Skill Passport
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#E0533C] font-bold">
                  Recruiter Workspace
                </span>
              </div>
            </Link>

            {/* Organization Tag */}
            {profile && (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sand/30 border border-[#1A1918]/20 text-xs font-semibold text-[#1A1918]">
                <Building className="w-3.5 h-3.5 text-stone-600" />
                <span className="max-w-[150px] truncate">{orgName}</span>
                {profile.organization.is_verified && (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </div>
            )}
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/recruiter/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#1A1918] text-[#FAF8F5] shadow-[1.5px_1.5px_0_0_#1A1918]"
                      : "text-[#1A1918]/70 hover:text-[#1A1918] hover:bg-stone-200/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action & Profile Area */}
          <div className="flex items-center gap-3">
            <Link
              href="/recruiter/jobs/create"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#DFE968] hover:bg-[#d6e05a] border border-[#1A1918] text-xs font-black text-[#1A1918] shadow-[1.5px_1.5px_0_0_#1A1918] transition-transform active:translate-y-0.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Post Job</span>
            </Link>

            {/* Candidate Portal Switcher */}
            <Link
              href="/app/passport"
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-bold text-[#1A1918]/60 hover:text-[#1A1918] px-2.5 py-1 rounded-full border border-stone-300 hover:border-[#1A1918] transition-colors"
              title="Switch to Candidate Workspace"
            >
              <span>Candidate View</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {/* Help Button */}
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="p-1.5 rounded-full bg-white border border-[#1A1918] text-[#1A1918] hover:bg-[#1A1918] hover:text-[#FAF8F5] transition-all shadow-[1.5px_1.5px_0_0_#1A1918] flex items-center justify-center cursor-pointer"
              title="Product Help & Conceptual Guidance"
              aria-label="Product Help & Conceptual Guidance"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-[#FAF8F5] border border-[#1A1918] hover:bg-stone-100 transition-all shadow-[1.5px_1.5px_0_0_#1A1918] cursor-pointer"
              >
                <div className="w-6 h-6 rounded-full bg-[#E0A96D] border border-[#1A1918] font-black text-[10px] flex items-center justify-center text-[#1A1918]">
                  {initials}
                </div>
                <span className="text-xs font-bold text-[#1A1918] hidden sm:inline max-w-[120px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="w-3 h-3 text-stone-600" />
              </button>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1A1918] shadow-[4px_4px_0_0_#1A1918] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
                  <div className="p-2.5 border-b border-[#1A1918]/10 space-y-0.5">
                    <div className="font-bold text-[#1A1918] truncate">{displayName}</div>
                    <div className="text-[10px] text-stone-500 truncate">{profile?.email}</div>
                    <div className="text-[10px] font-mono text-[#E0533C] capitalize font-semibold">
                      {orgName} &bull; {profile?.role?.replace("_", " ")}
                    </div>
                  </div>

                  <div className="py-1 space-y-0.5">
                    <Link
                      href="/recruiter/organization"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-stone-100 font-semibold transition-colors"
                    >
                      <Building className="w-3.5 h-3.5 text-stone-600" />
                      <span>Organization Settings</span>
                    </Link>
                    <Link
                      href="/app/passport"
                      onClick={() => setIsDropdownOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#1A1918] hover:bg-stone-100 font-semibold transition-colors"
                    >
                      <Compass className="w-3.5 h-3.5 text-stone-600" />
                      <span>Switch to Candidate App</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-[#1A1918]/10">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 hover:bg-rose-50 font-bold transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className="md:hidden p-2 rounded-xl border border-[#1A1918] bg-white text-[#1A1918]"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#1A1918]/10 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== "/recruiter/dashboard" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#1A1918] text-[#FAF8F5]"
                      : "text-[#1A1918] hover:bg-stone-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            <div className="pt-2">
              <Link
                href="/recruiter/jobs/create"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#DFE968] border border-[#1A1918] text-xs font-bold text-[#1A1918]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Post Job Opening</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <SharingHelpDrawer
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        currentPathname={pathname || ""}
      />
    </header>
  );
}
