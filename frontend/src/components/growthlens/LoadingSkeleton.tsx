"use client";

import React from "react";

interface LoadingSkeletonProps {
  type?: "card" | "chart" | "feed" | "stats" | "timeline";
  count?: number;
  className?: string;
}

export default function LoadingSkeleton({
  type = "card",
  count = 3,
  className = "",
}: LoadingSkeletonProps) {
  if (type === "stats") {
    return (
      <div className={`p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 shadow-[3px_3px_0px_#1C1C1C] ${className}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-[#1C1C1C]/15 rounded-full" />
              <div className="h-8 w-20 bg-[#1C1C1C]/25 rounded-md" />
              <div className="h-2 w-24 bg-[#1C1C1C]/10 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === "chart") {
    return (
      <div className={`p-6 rounded-[32px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 shadow-[3px_3px_0px_#1C1C1C] animate-pulse ${className}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="h-5 w-48 bg-[#1C1C1C]/20 rounded-full" />
          <div className="h-5 w-24 bg-[#1C1C1C]/15 rounded-full" />
        </div>
        <div className="h-[280px] w-full flex items-end gap-3 pt-6 border-b border-l border-[#1C1C1C]/20 pb-2 pl-2">
          {[40, 65, 55, 80, 70, 90, 85].map((h, i) => (
            <div
              key={i}
              className="flex-1 bg-[#1C1C1C]/10 rounded-t-md transition-all duration-300"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (type === "feed") {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-5 rounded-[24px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 shadow-[2px_2px_0px_#1C1C1C] animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#1C1C1C]/20" />
                <div className="h-4 w-20 bg-[#1C1C1C]/20 rounded-full" />
              </div>
              <div className="h-3 w-20 bg-[#1C1C1C]/15 rounded-full" />
            </div>
            <div className="h-5 w-3/4 bg-[#1C1C1C]/25 rounded-md" />
            <div className="h-3 w-full bg-[#1C1C1C]/15 rounded-full" />
            <div className="h-3 w-5/6 bg-[#1C1C1C]/10 rounded-full" />
            <div className="pt-2 border-t border-[#1C1C1C]/10 flex gap-2">
              <div className="h-5 w-16 bg-[#1C1C1C]/10 rounded-full" />
              <div className="h-5 w-20 bg-[#1C1C1C]/10 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Cards grid skeleton
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-6 rounded-[28px] border-[1.5px] border-[#1C1C1C] bg-[#FBF6DF]/80 shadow-[3px_3px_0px_#1C1C1C] animate-pulse space-y-4"
        >
          <div className="flex justify-between items-start">
            <div className="h-5 w-36 bg-[#1C1C1C]/25 rounded-md" />
            <div className="h-5 w-16 bg-[#1C1C1C]/15 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-10 w-20 bg-[#1C1C1C]/30 rounded-md" />
            <div className="h-2 w-full bg-[#1C1C1C]/15 rounded-full" />
          </div>
          <div className="pt-3 border-t border-[#1C1C1C]/10 flex justify-between">
            <div className="h-3 w-20 bg-[#1C1C1C]/15 rounded-full" />
            <div className="h-3 w-16 bg-[#1C1C1C]/15 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
