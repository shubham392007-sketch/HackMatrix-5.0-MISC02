"use client";

import React, { useState } from "react";
import { Developer, SocialLink } from "@/data/developers";
import {
  Code2,
  Layers,
  Brain,
  Sparkles,
  Mail,
  Copy,
  Check,
  ArrowUpRight,
} from "lucide-react";

// Pixel-perfect accessible SVG brand icons for social buttons
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9h2.79v8.37H6.46v-8.37M7.86 6.54a1.63 1.63 0 1 0 0 3.26 1.63 1.63 0 0 0 0-3.26z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XTwitterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

interface DeveloperCardProps {
  developer: Developer;
  index?: number;
}

export default function DeveloperCard({ developer, index = 0 }: DeveloperCardProps) {
  const [copied, setCopied] = useState(false);

  const copyEmail = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let success = false;
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(developer.email);
        success = true;
      }
    } catch {
      // Fallback below
    }

    if (!success) {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = developer.email;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.top = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        success = document.execCommand("copy");
        document.body.removeChild(textarea);
      } catch {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const renderIcon = () => {
    switch (developer.iconType) {
      case "code":
        return <Code2 className="w-5 h-5 text-[#1C1C1C]" />;
      case "layers":
        return <Layers className="w-5 h-5 text-[#1C1C1C]" />;
      case "brain":
        return <Brain className="w-5 h-5 text-[#1C1C1C]" />;
      case "sparkles":
      default:
        return <Sparkles className="w-5 h-5 text-[#1C1C1C]" />;
    }
  };

  const renderSocialIcon = (link: SocialLink) => {
    switch (link.platform) {
      case "github":
        return <GitHubIcon className="w-4 h-4" />;
      case "linkedin":
        return <LinkedInIcon className="w-4 h-4" />;
      case "instagram":
        return <InstagramIcon className="w-4 h-4" />;
      case "x":
        return <XTwitterIcon className="w-3.5 h-3.5" />;
      default:
        return <ArrowUpRight className="w-4 h-4" />;
    }
  };

  return (
    <div
      className="parent dev-card-container w-full h-full relative"
      style={{
        animationDelay: `${index * 120}ms`,
      }}
    >
      <div className="card dev-card-surface flex flex-col justify-between p-5 sm:p-5 pb-5 relative">
        {/* ── 3D CURVED GLASS PANEL ── */}
        <div className="glass dev-glass" />

        {/* ── 3D CORNER TELESCOPING LOGO / BUBBLE CLUSTER ── */}
        <div className="logo select-none pointer-events-none">
          <span className="circle circle1" />
          <span className="circle circle2" />
          <span className="circle circle3" />
          <span className="circle circle4" />
          <div className="circle circle5">
            {renderIcon()}
          </div>
        </div>

        {/* ── 3D CARD CONTENT ── */}
        <div className="content dev-content relative flex-1 flex flex-col justify-between">
          {/* Top Section: Avatar + Eyebrow on the left, completely separated from corner bubbles */}
          <div>
            <div className="flex items-center gap-2 mb-2 pr-24">
              {/* Initials Avatar */}
              <div
                className="w-10 h-10 rounded-xl border-[1.5px] border-[#1C1C1C] flex items-center justify-center text-sm font-black shadow-[1.5px_1.5px_0px_#1C1C1C] shrink-0"
                style={{
                  backgroundColor: developer.accentColor,
                  color: "#1C1C1C",
                }}
                aria-label={`Initials ${developer.initials} for ${developer.name}`}
              >
                {developer.initials}
              </div>

              {/* Eyebrow Label — fully visible without truncate */}
              <span className="px-2 py-0.5 rounded-full border border-[#1C1C1C] bg-[#FBF1CF]/95 text-[8.5px] font-black uppercase tracking-wider text-[#1C1C1C] shadow-[1px_1px_0px_#1C1C1C] whitespace-nowrap">
                {developer.eyebrow}
              </span>
            </div>

            {/* Developer Name & Role — 100% visible and sharp */}
            <h3 className="text-xl sm:text-2xl font-black text-[#1C1C1C] tracking-tight leading-snug break-words">
              {developer.name}
            </h3>

            <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#1C1C1C]/80 mt-0.5">
              {developer.role}
            </p>

            {/* Biography */}
            <p className="text-[11px] sm:text-xs font-medium text-[#1C1C1C]/85 leading-relaxed mt-2 line-clamp-3">
              {developer.bio}
            </p>
          </div>

          {/* Middle: Email Pill with Working Copy Action */}
          <div className="my-3">
            <div className="flex items-center justify-between gap-2 p-1.5 px-2 rounded-xl border border-[#1C1C1C] bg-[#FBF1CF]/95 shadow-[1px_1px_0px_#1C1C1C]">
              <a
                href={`mailto:${developer.email}`}
                className="text-[10.5px] font-bold text-[#1C1C1C] truncate hover:underline flex items-center gap-1.5 min-w-0"
                title={`Send email to ${developer.email}`}
              >
                <Mail className="w-3.5 h-3.5 text-[#1C1C1C] shrink-0" />
                <span className="truncate">{developer.email}</span>
              </a>

              <button
                onClick={copyEmail}
                type="button"
                className="p-1 px-2 rounded-lg border border-[#1C1C1C] bg-white text-[#1C1C1C] hover:bg-[#DFE968] active:scale-95 transition-all shrink-0 flex items-center gap-1 text-[9px] font-extrabold shadow-[1px_1px_0px_#1C1C1C] cursor-pointer relative z-30 select-none"
                title="Copy email to clipboard"
                aria-label={`Copy email for ${developer.name}`}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-[#4A7A4E]" />
                    <span className="text-[#4A7A4E] font-black text-[8.5px]">COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span className="text-[8.5px] font-bold text-[#1C1C1C]/70">COPY</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* ── BOTTOM SECTION: CONTACT LOGOS & PRIMARY ACTION ── */}
          <div className="bottom dev-bottom space-y-3 pt-2 border-t border-[#1C1C1C]/15">
            {/* Social Profile Buttons Row */}
            <div>
              <p className="text-[8.5px] font-black uppercase tracking-[0.12em] text-[#1C1C1C]/60 mb-1.5">
                VERIFIED PROFILES
              </p>
              <div className="social-buttons-container">
                {developer.socials.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    className="social-button"
                  >
                    {renderSocialIcon(link)}
                  </a>
                ))}
              </div>
            </div>

            {/* Primary Action Button — strictly bounded inside card */}
            <a
              href={`mailto:${developer.email}?subject=Connecting%20via%20GrowthLens&body=Hello%20${encodeURIComponent(developer.name)},%0A%0AI%20came%20across%20GrowthLens%20and%20wanted%20to%20connect%20regarding...`}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-full border-[1.5px] border-[#1C1C1C] bg-[#1C1C1C] text-[#FBF1CF] text-[10.5px] font-black tracking-wider uppercase shadow-[1.5px_1.5px_0px_#1C1C1C] hover:bg-[#DFE968] hover:text-[#1C1C1C] transition-all focus-visible:outline-2 focus-visible:outline-[#1C1C1C]"
            >
              <span>CONNECT VIA EMAIL</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
