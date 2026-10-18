import React from "react";
import { Loader2 } from "lucide-react";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "lime" | "dark";
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: string;
}

export default function PillButton({
  variant = "primary",
  children,
  className = "",
  loading = false,
  isLoading = false,
  loadingText,
  disabled,
  ...props
}: PillButtonProps) {
  const isCurrentlyLoading = loading || isLoading;

  const variantClass =
    variant === "primary"
      ? "pill-btn-primary"
      : variant === "secondary"
      ? "pill-btn-secondary"
      : variant === "lime"
      ? "pill-btn-lime"
      : "pill-btn-dark";

  return (
    <button
      className={`pill-btn ${variantClass} ${className} ${
        isCurrentlyLoading ? "opacity-85 cursor-wait select-none" : ""
      }`}
      disabled={disabled || isCurrentlyLoading}
      aria-busy={isCurrentlyLoading}
      {...props}
    >
      {isCurrentlyLoading ? (
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>{loadingText || children}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
