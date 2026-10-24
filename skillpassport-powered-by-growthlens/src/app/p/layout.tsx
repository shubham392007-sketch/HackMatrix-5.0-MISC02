import React from "react";

export default function RecruiterPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1A1918] font-sans antialiased selection:bg-[#1E3A5F] selection:text-white">
      {children}
    </div>
  );
}
