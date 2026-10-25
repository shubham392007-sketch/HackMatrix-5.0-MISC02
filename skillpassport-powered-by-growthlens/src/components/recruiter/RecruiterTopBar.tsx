"use client";



import React, { useState, useEffect, useRef } from "react";

import Link from "next/link";

import { usePathname, useRouter } from "next/navigation";

import {

  LayoutDashboard,

  Briefcase,

  Users,

  Mail,

  Building2,

  LogOut,

  ChevronDown,

  ShieldCheck,

  PlusCircle,

  Menu,

  X,

} from "lucide-react";

import {

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

  const dropdownRef = useRef<HTMLDivElement>(null);



  useEffect(() => {

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

    router.push("/login");

  };



  const navLinks = [

    { label: "Dashboard", href: "/recruiter/dashboard", icon: LayoutDashboard },

    { label: "Jobs", href: "/recruiter/jobs", icon: Briefcase },

    { label: "Candidates", href: "/recruiter/candidates", icon: Users },

    { label: "Inbox", href: "/recruiter/inbox", icon: Mail },

    { label: "Organization", href: "/recruiter/organization", icon: Building2 },

  ];



  const displayName = profile?.full_name || "Manager";

  const orgName = profile?.organization?.name || "Organization";

  const initials = displayName

    .split(/\s+/)

    .slice(0, 2)

    .map((s) => s[0])

    .join("")

    .toUpperCase() || "MG";



  return (

    <div className="sticky top-3.5 sm:top-4 z-50 w-full px-4 sm:px-6 lg:px-8 pointer-events-none">

      <header className="pointer-events-auto max-w-7xl mx-auto w-full bg-[#FAF8F5]/92 backdrop-blur-md border-[1.5px] border-[#1C1C1C] rounded-full shadow-[3px_3px_0_0_#1C1C1C] px-3.5 sm:px-5 py-2 flex items-center justify-between transition-all">

        {/* Left: Brand / Logo Capsule */}

        <Link

          href="/recruiter/dashboard"

          className="flex items-center gap-2 group shrink-0"

        >

          <div className="w-8 h-8 rounded-full bg-[#1C1C1C] text-[#FAF8F5] flex items-center justify-center font-black text-xs shadow-[1px_1px_0_0_#1C1C1C] group-hover:scale-105 transition-transform">

            SP

          </div>

          <div className="flex flex-col">

            <span

              className="text-lg leading-tight text-[#1C1C1C] hidden sm:inline"

              style={{ fontFamily: "'Yellowtail', cursive" }}

            >

              SkillPassport

            </span>

            <span className="text-[9px] font-mono uppercase tracking-wider text-[#E0533C] font-bold -mt-0.5">

              Manager

            </span>

          </div>

        </Link>



        {/* Center: Recruiter Tabs (Capsule Island) */}

        <nav className="hidden md:flex items-center gap-1 bg-[#1C1C1C]/5 p-1 rounded-full border border-[#1C1C1C]/10">

          {navLinks.map((link) => {

            const Icon = link.icon;

            const isActive =

              pathname === link.href ||

              (link.href !== "/recruiter/dashboard" && pathname.startsWith(link.href));

            return (

              <Link

                key={link.href}

                href={link.href}

                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${

                  isActive

                    ? "bg-[#1C1C1C] text-[#FAF8F5] shadow-[1.5px_1.5px_0_0_#1C1C1C]"

                    : "text-[#1C1C1C]/75 hover:text-[#1C1C1C] hover:bg-white/80"

                }`}

              >

                <Icon className="w-3.5 h-3.5 shrink-0" />

                <span>{link.label}</span>

              </Link>

            );

          })}

        </nav>



        {/* Right: Quick Action & Profile */}

        <div className="flex items-center gap-2 shrink-0">

          <Link

            href="/recruiter/jobs/create"

            className="pill-btn pill-btn-primary hidden sm:inline-flex items-center gap-1.5 py-1.5 px-3 text-xs shadow-[1.5px_1.5px_0_0_#1C1C1C]"

          >

            <PlusCircle className="w-3.5 h-3.5" />

            <span>Post Job</span>

          </Link>





          {/* Profile Dropdown */}

          <div className="relative" ref={dropdownRef}>

            <button

              type="button"

              onClick={() => setIsDropdownOpen((prev) => !prev)}

              className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 h-8 rounded-full bg-white border-[1.5px] border-[#1C1C1C] hover:bg-stone-50 shadow-[1.5px_1.5px_0_0_#1C1C1C] cursor-pointer"

            >

              <div className="w-6 h-6 rounded-full bg-[#DFE968] border border-[#1C1C1C] font-black text-[10px] flex items-center justify-center text-[#1C1C1C]">

                {initials}

              </div>

              <span className="text-xs font-bold text-[#1C1C1C] hidden sm:inline max-w-[90px] truncate">

                {displayName}

              </span>

              <ChevronDown className="w-3 h-3 text-stone-600" />

            </button>



            {isDropdownOpen && (

              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] shadow-[4px_4px_0_0_#1C1C1C] p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">

                <div className="p-2.5 border-b border-[#1C1C1C]/10 space-y-0.5">

                  <div className="font-black text-[#1C1C1C] truncate">{displayName}</div>

                  <div className="text-[10px] text-stone-500 truncate font-mono">{profile?.email}</div>

                  <div className="text-[10px] font-mono text-[#E0533C] capitalize font-bold pt-0.5">

                    {orgName} &bull; {profile?.role?.replace("_", " ")}

                  </div>

                </div>



                <div className="py-1 space-y-0.5">

                  <Link

                    href="/recruiter/organization"

                    onClick={() => setIsDropdownOpen(false)}

                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[#1C1C1C] hover:bg-stone-200/60 font-bold transition-colors"

                  >

                    <Building2 className="w-3.5 h-3.5 text-stone-600" />

                    <span>Organization Settings</span>

                  </Link>

                </div>



                <div className="pt-1 border-t border-[#1C1C1C]/10">

                  <button

                    type="button"

                    onClick={handleSignOut}

                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-rose-700 hover:bg-rose-50 font-black transition-colors text-left"

                  >

                    <LogOut className="w-3.5 h-3.5" />

                    <span>Sign Out</span>

                  </button>

                </div>

              </div>

            )}

          </div>



          {/* Mobile Menu Button */}

          <button

            type="button"

            onClick={() => setIsMobileMenuOpen((prev) => !prev)}

            className="md:hidden p-1.5 rounded-full border-[1.5px] border-[#1C1C1C] bg-white text-[#1C1C1C] shadow-[1px_1px_0_0_#1C1C1C]"

          >

            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}

          </button>

        </div>

      </header>



      {/* Mobile Drawer (Capsule dropdown) */}

      {isMobileMenuOpen && (

        <div className="pointer-events-auto max-w-7xl mx-auto w-full mt-2 p-3 bg-[#FAF8F5] border-[1.5px] border-[#1C1C1C] rounded-2xl shadow-[3px_3px_0_0_#1C1C1C] space-y-1 md:hidden">

          {navLinks.map((link) => {

            const Icon = link.icon;

            const isActive =

              pathname === link.href ||

              (link.href !== "/recruiter/dashboard" && pathname.startsWith(link.href));

            return (

              <Link

                key={link.href}

                href={link.href}

                onClick={() => setIsMobileMenuOpen(false)}

                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${

                  isActive

                    ? "bg-[#1C1C1C] text-[#FAF8F5]"

                    : "text-[#1C1C1C] hover:bg-stone-100"

                }`}

              >

                <Icon className="w-4 h-4" />

                <span>{link.label}</span>

              </Link>

            );

          })}

          <div className="pt-2 flex flex-col gap-2">

            <Link

              href="/recruiter/jobs/create"

              onClick={() => setIsMobileMenuOpen(false)}

              className="pill-btn pill-btn-primary flex items-center justify-center gap-1 py-1.5 text-xs"

            >

              <PlusCircle className="w-3.5 h-3.5" />

              <span>Post Job</span>

            </Link>

          </div>

        </div>

      )}

    </div>

  );

}

