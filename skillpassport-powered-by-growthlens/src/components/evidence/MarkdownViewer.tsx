"use client";

import React, { useState, useMemo } from "react";
import { Copy, Check, Eye, Code, FileText, ExternalLink } from "lucide-react";

interface MarkdownViewerProps {
  content: string;
  repoName?: string;
  fileName?: string;
  sections?: Array<{ level: number; title: string }>;
  className?: string;
}

export default function MarkdownViewer({
  content,
  repoName,
  fileName = "README.md",
  sections = [],
  className = "",
}: MarkdownViewerProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "raw">("preview");
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedBlockIdx, setCopiedBlockIdx] = useState<number | null>(null);

  const handleCopyFull = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFull(true);
      setTimeout(() => setCopiedFull(false), 2000);
    } catch (err) {
      console.warn("Failed to copy content:", err);
    }
  };

  const handleCopyBlock = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedBlockIdx(idx);
      setTimeout(() => setCopiedBlockIdx(null), 2000);
    } catch (err) {
      console.warn("Failed to copy code block:", err);
    }
  };

  // Safe inline text formatter for bold, italic, inline code, and links
  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Split by markdown link pattern [label](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderBasicTokens(text.substring(lastIndex, match.index)));
      }
      const label = match[1];
      const url = match[2];
      parts.push(
        <a
          key={`link-${match.index}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#1C1C1C] underline font-bold inline-flex items-center gap-0.5 hover:text-[#4A7A4E] decoration-[#1C1C1C]/40 hover:decoration-[#4A7A4E]"
        >
          <span>{label}</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </a>
      );
      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(renderBasicTokens(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : text;
  };

  const renderBasicTokens = (str: string): React.ReactNode => {
    // Process inline code `code`, bold **text**, and italic *text*
    const segments = str.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return segments.map((seg, i) => {
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[#FBF1CF] border border-[#1C1C1C]/20 font-mono text-[11px] text-[#1C1C1C] font-semibold"
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
        return (
          <strong key={i} className="font-black text-[#1C1C1C]">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
        return (
          <em key={i} className="italic text-[#1C1C1C]">
            {seg.slice(1, -1)}
          </em>
        );
      }
      return seg;
    });
  };

  // Structured block parser for markdown lines
  const renderedElements = useMemo(() => {
    if (!content) return null;
    const lines = content.split(/\r?\n/);
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeBlockLang = "";
    let codeBlockLines: string[] = [];
    let codeBlockIdx = 0;

    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const bodyRows = tableRows.slice(1);
        elements.push(
          <div key={`table-${elements.length}`} className="my-3 overflow-x-auto rounded-xl border border-[#1C1C1C]/25 bg-white">
            <table className="min-w-full divide-y divide-[#1C1C1C]/20 text-left text-xs">
              <thead className="bg-[#FBF1CF]">
                <tr>
                  {headerRow.map((cell, cIdx) => (
                    <th key={cIdx} className="px-3.5 py-2 font-black text-[#1C1C1C] uppercase tracking-wider text-[10px]">
                      {renderInlineFormatted(cell.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1C]/10 font-medium text-[#1C1C1C]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-stone-50">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3.5 py-2 text-xs">
                        {renderInlineFormatted(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
      }
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Fenced code block start/end
      if (trimmed.startsWith("```")) {
        if (!inCodeBlock) {
          if (inTable) flushTable();
          inCodeBlock = true;
          codeBlockLang = trimmed.slice(3).trim();
          codeBlockLines = [];
        } else {
          // Flush code block
          const blockText = codeBlockLines.join("\n");
          const curIdx = codeBlockIdx++;
          const isCopied = copiedBlockIdx === curIdx;
          elements.push(
            <div
              key={`code-${elements.length}`}
              className="my-3 rounded-xl border-[1.5px] border-[#1C1C1C] bg-[#1C1C1C] text-stone-100 overflow-hidden shadow-[2px_2px_0_0_#1C1C1C]"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#2A2A2A] border-b border-[#3A3A3A] text-[10px] font-mono text-stone-300">
                <span className="font-bold uppercase tracking-wider text-[#DFE968]">
                  {codeBlockLang || "text"}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyBlock(blockText, curIdx)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-stone-700 text-stone-200 transition-colors"
                  title="Copy code block"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-[#DFE968]" />
                      <span className="text-[#DFE968] font-bold">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>COPY</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 text-xs font-mono overflow-x-auto leading-relaxed text-stone-100 selection:bg-[#000000] selection:text-[#FAF8F5]">
                <code>{blockText}</code>
              </pre>
            </div>
          );
          inCodeBlock = false;
          codeBlockLines = [];
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        continue;
      }

      // Markdown Tables (| cell | cell |)
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        // Check if separator row like |---|---|
        const isSeparator = cells.every((c) => /^:?-+:?$/.test(c));
        if (!isSeparator) {
          inTable = true;
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (trimmed.startsWith("# ")) {
        elements.push(
          <h1
            key={`h1-${elements.length}`}
            className="text-lg md:text-xl font-black text-[#1C1C1C] mt-5 mb-2 pb-1 border-b border-[#1C1C1C]/20"
          >
            {renderInlineFormatted(trimmed.slice(2))}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        elements.push(
          <h2
            key={`h2-${elements.length}`}
            className="text-base md:text-lg font-black text-[#1C1C1C] mt-4 mb-2 pb-1 border-b border-[#1C1C1C]/15"
          >
            {renderInlineFormatted(trimmed.slice(3))}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        elements.push(
          <h3
            key={`h3-${elements.length}`}
            className="text-sm md:text-base font-black text-[#1C1C1C] mt-3 mb-1.5"
          >
            {renderInlineFormatted(trimmed.slice(4))}
          </h3>
        );
      } else if (trimmed.startsWith("#### ")) {
        elements.push(
          <h4
            key={`h4-${elements.length}`}
            className="text-xs md:text-sm font-black text-[#1C1C1C] mt-2 mb-1"
          >
            {renderInlineFormatted(trimmed.slice(5))}
          </h4>
        );
      }
      // Blockquote (> quote)
      else if (trimmed.startsWith(">")) {
        elements.push(
          <blockquote
            key={`quote-${elements.length}`}
            className="my-2 pl-3 py-1 border-l-4 border-[#DFE968] bg-[#FBF1CF]/60 text-xs italic text-[#1C1C1C]/80 rounded-r-lg"
          >
            {renderInlineFormatted(trimmed.replace(/^>\s*/, ""))}
          </blockquote>
        );
      }
      // Bullet list (- item or * item)
      else if (/^[-*]\s+/.test(trimmed)) {
        elements.push(
          <li
            key={`li-${elements.length}`}
            className="ml-5 list-disc text-xs text-[#1C1C1C] my-0.5 leading-relaxed"
          >
            {renderInlineFormatted(trimmed.replace(/^[-*]\s+/, ""))}
          </li>
        );
      }
      // Numbered list (1. item)
      else if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(
          <li
            key={`oli-${elements.length}`}
            className="ml-5 list-decimal text-xs text-[#1C1C1C] my-0.5 leading-relaxed"
          >
            {renderInlineFormatted(trimmed.replace(/^\d+\.\s+/, ""))}
          </li>
        );
      }
      // Horizontal Rule (--- or ***)
      else if (/^[-*_]{3,}$/.test(trimmed)) {
        elements.push(
          <hr key={`hr-${elements.length}`} className="my-4 border-[#1C1C1C]/20" />
        );
      }
      // Normal Paragraph
      else if (trimmed.length > 0) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-xs text-[#1C1C1C]/90 my-1.5 leading-relaxed">
            {renderInlineFormatted(trimmed)}
          </p>
        );
      } else {
        // Empty line spacing
        elements.push(<div key={`sp-${elements.length}`} className="h-1.5" />);
      }
    }

    if (inTable) flushTable();
    if (inCodeBlock && codeBlockLines.length > 0) {
      elements.push(
        <pre
          key={`code-end-${elements.length}`}
          className="my-3 p-3.5 rounded-xl bg-[#1C1C1C] text-stone-100 font-mono text-xs overflow-x-auto leading-relaxed"
        >
          <code>{codeBlockLines.join("\n")}</code>
        </pre>
      );
    }

    return elements;
  }, [content, copiedBlockIdx]);

  return (
    <div className={`flex flex-col rounded-2xl border-[1.5px] border-[#1C1C1C] bg-white overflow-hidden shadow-[2px_2px_0_0_#1C1C1C] ${className}`}>
      {/* Top Header Bar with Tabs and Copy Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-[#FBF1CF] border-b border-[#1C1C1C]/20 text-xs">
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-[#1C1C1C]" />
          <span className="font-black text-[#1C1C1C]">{fileName}</span>
          {repoName && (
            <span className="text-[10px] text-[#1C1C1C]/60 font-mono">({repoName})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Switcher */}
          <div className="flex items-center bg-white p-0.5 rounded-full border border-[#1C1C1C]/30 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                activeTab === "preview"
                  ? "bg-[#000000] text-[#FAF8F5] font-black shadow-[1px_1px_0_0_#1A1918]"
                  : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
              }`}
            >
              <Eye className="w-3 h-3" />
              <span>PREVIEW</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("raw")}
              className={`px-3 py-1 rounded-full flex items-center gap-1 transition-all ${
                activeTab === "raw"
                  ? "bg-[#000000] text-[#FAF8F5] font-black shadow-[1px_1px_0_0_#1A1918]"
                  : "text-[#1C1C1C]/70 hover:text-[#1C1C1C]"
              }`}
            >
              <Code className="w-3 h-3" />
              <span>RAW MARKDOWN</span>
            </button>
          </div>

          {/* Copy Full Button */}
          <button
            type="button"
            onClick={handleCopyFull}
            className="pill-btn bg-white border border-[#1C1C1C] text-[10px] font-black uppercase py-1 px-2.5 flex items-center gap-1 hover:bg-[#DFE968]"
            title="Copy full markdown content to clipboard"
          >
            {copiedFull ? (
              <>
                <Check className="w-3 h-3 text-[#4A7A4E]" />
                <span className="text-[#4A7A4E]">COPIED</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-[#1C1C1C]" />
                <span>COPY FULL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sections pill chips if available */}
      {sections.length > 0 && activeTab === "preview" && (
        <div className="px-4 py-2 bg-[#FBF6DF]/60 border-b border-[#1C1C1C]/10 flex items-center gap-1.5 overflow-x-auto text-[10px]">
          <span className="font-black text-[#1C1C1C]/50 uppercase tracking-wider shrink-0">
            SECTIONS:
          </span>
          {sections.map((sec, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded-md bg-white border border-[#1C1C1C]/20 font-bold text-[#1C1C1C] shrink-0"
            >
              {"#".repeat(sec.level)} {sec.title}
            </span>
          ))}
        </div>
      )}

      {/* Content Area */}
      <div className="p-5 max-h-[60vh] overflow-y-auto selection:bg-[#000000] selection:text-[#FAF8F5]">
        {activeTab === "preview" ? (
          <div className="space-y-1">{renderedElements}</div>
        ) : (
          <div className="font-mono text-xs text-[#1C1C1C] whitespace-pre-wrap leading-relaxed select-text bg-stone-50 p-4 rounded-xl border border-[#1C1C1C]/15">
            {content}
          </div>
        )}
      </div>

      {/* Footer bar with character count */}
      <div className="px-4 py-1.5 bg-[#FBF1CF] border-t border-[#1C1C1C]/15 flex items-center justify-between text-[10px] font-mono text-[#1C1C1C]/60">
        <span>{content ? `${content.length.toLocaleString()} characters` : "0 characters"}</span>
        <span>Rendered with Moonwood Markdown Engine</span>
      </div>
    </div>
  );
}
