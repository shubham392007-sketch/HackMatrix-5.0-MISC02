"use client";

import React from "react";
import { Loader2 } from "lucide-react";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "lime" | "dark" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function PillButton({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...props
}: PillButtonProps) {
  const variantStyles = {
    primary: "bg-[#F6BB84] text-[#1C1C1C] hover:brightness-105",
    secondary: "bg-[#FBF1CF] text-[#1C1C1C] hover:bg-[#F6C8D6]/40",
    lime: "bg-[#DFE968] text-[#1C1C1C] hover:brightness-105",
    dark: "bg-[#1C1C1C] text-[#FBF1CF] hover:bg-[#1C1C1C]/90",
    outline: "bg-transparent text-[#1C1C1C] hover:bg-[#1C1C1C]/5",
  };

  const sizeStyles = {
    sm: "py-1.5 px-3.5 text-[10px] tracking-[0.08em]",
    md: "py-2.5 px-5 text-xs tracking-[0.08em]",
    lg: "py-3 px-6 text-sm tracking-[0.1em]",
  };

  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full border-[1.5px] border-[#1C1C1C]
        font-extrabold uppercase select-none
        shadow-[2px_2px_0px_#1C1C1C]
        transition-all duration-150 ease-out
        hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#1C1C1C]
        active:translate-y-0.5 active:shadow-[1px_1px_0px_#1C1C1C]
        focus:outline-none focus:ring-2 focus:ring-[#1C1C1C] focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[2px_2px_0px_#1C1C1C]
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
