"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ArrowRight, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { useEvidence } from "@/context/EvidenceContext";

const publicNav = [
  { label: "HOME", href: "/" },
  { label: "FEATURES", href: "/features" },
  { label: "GROWTHLENS", href: "/growthlens" },
  { label: "ABOUT", href: "/about" },
  { label: "DEVELOPERS", href: "/developers" },
];

export default function SPHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useEvidence();

  return (
    <header className="sticky top-0 z-50 bg-[#FBF1CF] border-b-[1.5px] border-[#1C1C1C]">
      <div className="max-w-[1400px] mx-auto px-5 md:px-10 flex items-center justify-between h-16">
        {/* Brand Logo & Wordmark */}
        <Link href="/" className="flex flex-col justify-center group select-none">
          <div className="flex items-center gap-2">
            <span
              className="text-2xl sm:text-3xl text-[#1C1C1C] leading-none"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              SkillPassport
            </span>
            <span
              className="text-lg sm:text-xl text-[#1C1C1C] opacity-90 hidden sm:inline"
              style={{ fontFamily: "'Yellowtail', cursive" }}
            >
              by GrowthLens
            </span>
          </div>
          <span className="text-[9px] font-black tracking-[0.14em] uppercase text-[#1C1C1C]/60 -mt-0.5 block sm:hidden">
            POWERED BY GROWTHLENS
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-8">
          {publicNav.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href || pathname.startsWith(item.href);
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

        {/* Right CTA Area */}
        <div className="hidden sm:flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              href="/app/evidence"
              className="bg-[#DFE968] hover:bg-[#d6e058] border-[1.5px] border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-black tracking-[0.08em] uppercase px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_#1C1C1C]"
            >
              <span>ENTER WORKSPACE</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="bg-transparent border border-[#1C1C1C] text-[#1C1C1C] text-[11px] font-bold tracking-[0.08em] uppercase px-4 py-2 rounded-full hover:bg-[#1C1C1C]/5 transition-all"
              >
                SIGN IN
              </Link>
              <Link
                href="/signup"
                className="bg-[#1C1C1C] text-[#FBF1CF] text-[11px] font-bold tracking-[0.08em] uppercase px-5 py-2.5 rounded-full inline-flex items-center gap-1.5 hover:opacity-90 transition-all shadow-[2px_2px_0px_#1C1C1C]"
              >
                GET STARTED
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
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
        <div className="lg:hidden bg-[#FBF1CF] border-t border-[#1C1C1C] px-5 py-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="pb-2 border-b border-[#1C1C1C]/15 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#1C1C1C]/60 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#4A7A4E]" />
              VERIFIABLE TALENT PASSPORT
            </span>
          </div>

          {publicNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-xs font-bold tracking-[0.1em] uppercase text-[#1C1C1C]"
            >
              {item.label}
            </Link>
          ))}

          <div className="pt-3 border-t border-[#1C1C1C]/20 flex gap-2">
            {isAuthenticated ? (
              <Link
                href="/app/evidence"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center py-2.5 text-xs font-black uppercase bg-[#DFE968] border border-[#1C1C1C] rounded-full flex items-center justify-center gap-1.5"
              >
                Enter Workspace <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-black uppercase border border-[#1C1C1C] rounded-full"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-black uppercase bg-[#1C1C1C] text-[#FBF1CF] rounded-full"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
