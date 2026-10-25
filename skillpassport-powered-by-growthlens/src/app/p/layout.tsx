import React from "react";

export default function RecruiterPublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#1A1918] font-sans antialiased selection:bg-[#000000] selection:text-[#FAF8F5]">
      {children}
    </div>
  );
}
