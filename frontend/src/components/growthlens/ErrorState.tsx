"use client";

import React from "react";
import { AlertCircle, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import PillButton from "./PillButton";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showSettingsLink?: boolean;
  className?: string;
}

export default function ErrorState({
  title = "Something interrupted the intelligence pipeline.",
  message = "We encountered a temporary issue retrieving this evidence stream. Your records remain safe in PostgreSQL.",
  onRetry,
  showSettingsLink = true,
  className = "",
}: ErrorStateProps) {
  return (
    <div
      className={`p-8 md:p-10 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6]/40 backdrop-blur-sm shadow-[4px_4px_0px_#1C1C1C] text-center max-w-xl mx-auto my-8 ${className}`}
    >
      <div className="w-12 h-12 rounded-full border-[1.5px] border-[#1C1C1C] bg-[#F6C8D6] flex items-center justify-center mx-auto mb-4 shadow-[2px_2px_0px_#1C1C1C]">
        <AlertCircle className="w-6 h-6 text-[#C85A54]" />
      </div>

      <h3 className="text-xl md:text-2xl font-black text-[#1C1C1C] tracking-tight mb-2">
        {title}
      </h3>

      <p className="text-xs md:text-sm font-medium text-[#1C1C1C]/80 leading-relaxed mb-6">
        {message}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <PillButton
            variant="primary"
            onClick={onRetry}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            RETRY PIPELINE
          </PillButton>
        )}

        {showSettingsLink && (
          <Link href="/onboarding">
            <PillButton
              variant="secondary"
              icon={<Settings className="w-3.5 h-3.5" />}
            >
              INTEGRATION SETTINGS
            </PillButton>
          </Link>
        )}
      </div>
    </div>
  );
}
