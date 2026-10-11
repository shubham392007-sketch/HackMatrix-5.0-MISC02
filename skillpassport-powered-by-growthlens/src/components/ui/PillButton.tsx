import React from "react";

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "lime" | "dark";
  children: React.ReactNode;
  className?: string;
}

export default function PillButton({
  variant = "primary",
  children,
  className = "",
  ...props
}: PillButtonProps) {
  const variantClass =
    variant === "primary"
      ? "pill-btn-primary"
      : variant === "secondary"
      ? "pill-btn-secondary"
      : variant === "lime"
      ? "pill-btn-lime"
      : "pill-btn-dark";

  return (
    <button className={`pill-btn ${variantClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
