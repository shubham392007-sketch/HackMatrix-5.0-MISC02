import React from "react";

export default function RecruiterPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-[#1C1C1C] font-sans antialiased selection:bg-[#DFE968] selection:text-[#1C1C1C]">
      {children}
    </div>
  );
}
