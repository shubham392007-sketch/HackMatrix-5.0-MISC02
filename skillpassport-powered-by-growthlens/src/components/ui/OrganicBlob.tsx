import React from "react";

interface OrganicBlobProps {
  children?: React.ReactNode;
  className?: string;
  gradient?: string;
}

export default function OrganicBlob({
  children,
  className = "",
  gradient = "bg-gradient-to-tr from-[#DFE968] via-[#FBF1CF] to-[#F3A878]",
}: OrganicBlobProps) {
  return (
    <div
      className={`border-[1.5px] border-[#1C1C1C] flex flex-col items-center justify-center p-8 text-center overflow-hidden shadow-[4px_4px_0_0_#1C1C1C] ${gradient} ${className}`}
      style={{ borderRadius: "58% 42% 55% 45% / 45% 55% 45% 55%" }}
    >
      {children}
    </div>
  );
}
