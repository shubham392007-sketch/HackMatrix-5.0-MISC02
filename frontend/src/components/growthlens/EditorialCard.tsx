"use client";

import React from "react";

interface EditorialCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "cream" | "translucent" | "solid" | "peach";
  hoverEffect?: boolean;
  borderRad?: "md" | "lg" | "xl";
  className?: string;
}

export default function EditorialCard({
  children,
  variant = "cream",
  hoverEffect = true,
  borderRad = "lg",
  className = "",
  ...props
}: EditorialCardProps) {
  const bgStyles = {
    cream: "bg-[#FBF6DF]/90 backdrop-blur-sm",
    translucent: "bg-[#FBF6DF]/70 backdrop-blur-md",
    solid: "bg-[#FBF6DF]",
    peach: "bg-[#F6BB84]/20 backdrop-blur-sm",
  };

  const radStyles = {
    md: "rounded-[20px]",
    lg: "rounded-[28px]",
    xl: "rounded-[34px]",
  };

  return (
    <div
      className={`
        border-[1.5px] border-[#1C1C1C]
        shadow-[3px_3px_0px_#1C1C1C]
        ${bgStyles[variant]}
        ${radStyles[borderRad]}
        ${hoverEffect ? "transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1C1C1C]" : ""}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
