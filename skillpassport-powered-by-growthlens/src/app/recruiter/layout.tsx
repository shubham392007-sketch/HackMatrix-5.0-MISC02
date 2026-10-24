"use client";

import React from "react";
import { usePathname } from "next/navigation";
import RecruiterTopBar from "@/components/recruiter/RecruiterTopBar";

export default function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuthPage = pathname.includes("/recruiter/login") || pathname.includes("/recruiter/register");

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1918] flex flex-col font-sans selection:bg-[#DFE968] selection:text-[#1A1918]">
      {!isAuthPage && <RecruiterTopBar />}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
