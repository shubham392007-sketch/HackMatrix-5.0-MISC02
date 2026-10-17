"use client";

import { useMemo } from "react";
import { LanguageBreakdownItem } from "@/lib/evidenceApi";
import { Code2, AlertCircle, RefreshCw } from "lucide-react";

// Standard GitHub language palette mappings
const GITHUB_LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  HTML: "#e34c26",
  CSS: "#563d7c",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  Shell: "#89e051",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Dart: "#00B4AB",
  Scala: "#c22d40",
  R: "#198CE7",
  Vue: "#41b883",
  Jupyter: "#DA5B0B",
  "Jupyter Notebook": "#DA5B0B",
  SCSS: "#c6538c",
  Dockerfile: "#384d54",
  Makefile: "#427819",
};

const FALLBACK_COLORS = [
  "#2b5b84",
  "#c85a54",
  "#4a7a4e",
  "#b07219",
  "#6b5b95",
  "#feb236",
  "#d64161",
  "#86af49",
];

export function getLanguageColor(languageName: string, index = 0): string {
  if (GITHUB_LANGUAGE_COLORS[languageName]) {
    return GITHUB_LANGUAGE_COLORS[languageName];
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface RepositoryLanguageBarProps {
  languages: LanguageBreakdownItem[];
  totalBytes?: number;
  syncStatus?: string;
  repoName?: string;
  lastRetrievedAt?: string | null;
  errorSummary?: string | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
  showTitle?: boolean;
}

export default function RepositoryLanguageBar({
  languages,
  totalBytes,
  syncStatus = "success",
  repoName,
  lastRetrievedAt,
  errorSummary,
  onRefresh,
  isRefreshing = false,
  compact = false,
  showTitle = true,
}: RepositoryLanguageBarProps) {
  const calculatedTotal = useMemo(() => {
    if (typeof totalBytes === "number" && totalBytes > 0) return totalBytes;
    return languages.reduce((acc, l) => acc + (l.bytes || 0), 0);
  }, [languages, totalBytes]);

  const hasLanguages = languages && languages.length > 0 && calculatedTotal > 0;

  return (
    <div className={`space-y-3 ${compact ? "text-xs" : ""}`}>
      {/* Title / Header */}
      {showTitle && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-[#1C1C1C]" />
            <h4 className="font-black text-sm text-[#1C1C1C]">
              {repoName ? `Repository Languages • ${repoName}` : "Repository Language Analysis"}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {lastRetrievedAt && (
              <span className="text-[10px] font-mono text-[#1C1C1C]/60">
                Retrieved: {new Date(lastRetrievedAt).toLocaleDateString()}
              </span>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRefresh();
                }}
                disabled={isRefreshing}
                className="pill-btn pill-btn-secondary text-[10px] py-1 px-2.5 flex items-center gap-1"
                title="Refresh language statistics from GitHub"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>{isRefreshing ? "FETCHING ···" : "REFRESH"}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {syncStatus === "failed" && (
        <div className="p-3 rounded-xl bg-[#F6C8D6] border border-[#1C1C1C] text-xs font-bold text-[#C85A54] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorSummary || "Language statistics retrieval failed."}</span>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="pill-btn pill-btn-primary text-[10px] py-1 px-2.5 shrink-0"
            >
              RETRY
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasLanguages && syncStatus !== "failed" && (
        <div className="p-4 rounded-xl bg-[#FBF1CF]/60 border border-[#1C1C1C]/30 text-xs text-[#1C1C1C]/70 flex items-center justify-between">
          <span>
            {syncStatus === "empty"
              ? "No language statistics reported for this repository."
              : "Language statistics pending synchronization."}
          </span>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="pill-btn pill-btn-secondary text-[10px] py-1 px-2"
            >
              SYNC LANGUAGES
            </button>
          )}
        </div>
      )}

      {/* Horizontal Multi-color Proportion Bar */}
      {hasLanguages && (
        <>
          <div className="w-full h-3 rounded-full overflow-hidden border border-[#1C1C1C] flex bg-[#1C1C1C]/10 shadow-[1px_1px_0_0_#1C1C1C]">
            {languages.map((lang, idx) => {
              const color = getLanguageColor(lang.name, idx);
              const widthPct = Math.max(lang.percentage, 0.5); // min width for visibility
              return (
                <div
                  key={lang.name}
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: color,
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                  title={`${lang.name}: ${lang.percentage.toFixed(1)}% (${formatBytes(lang.bytes)})`}
                />
              );
            })}
          </div>

          {/* Language Breakdown Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs">
            {languages.map((lang, idx) => {
              const color = getLanguageColor(lang.name, idx);
              return (
                <div key={lang.name} className="flex items-center gap-1.5 font-medium text-[#1C1C1C]">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-[#1C1C1C]/30 shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold">{lang.name}</span>
                  <span className="text-[#1C1C1C]/75 font-mono text-[11px]">
                    {lang.percentage.toFixed(1)}%
                  </span>
                  {!compact && (
                    <span className="text-[10px] text-[#1C1C1C]/50 font-mono">
                      ({formatBytes(lang.bytes)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Context Notice */}
          <p className="text-[10px] text-[#1C1C1C]/55 italic pt-0.5">
            * Repository technology signals indicate the codebase environment and do not infer individual contributor proficiency.
          </p>
        </>
      )}
    </div>
  );
}
