"use client";

import React, { useMemo } from "react";
import { ExternalLink } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
}

interface ListItemNode {
  id: string;
  level: number;
  text: string;
  children: ListItemNode[];
}

type BlockElement =
  | { type: "ul" | "ol"; items: ListItemNode[] }
  | { type: "section-header"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "h4"; text: string }
  | { type: "quote"; text: string }
  | { type: "p"; text: string };

export default function MarkdownContent({
  content,
  className = "",
}: MarkdownContentProps) {
  // Safe inline text formatter for links, bold, italic, and inline code
  const renderInlineFormatted = (text: string): React.ReactNode => {
    if (!text) return null;
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
          className="text-ink underline font-bold inline-flex items-center gap-0.5 hover:text-ink/80"
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
    if (!str) return null;
    // Clean residual HTML tags from scraped postings
    const sanitized = str
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<\/?(?:b|strong|span|div|p)\b[^>]*>/gi, "");

    const segments = sanitized.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return segments.map((seg, i) => {
      if (seg.startsWith("`") && seg.endsWith("`") && seg.length > 2) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-sand/40 border border-ink/20 font-mono text-[11px] text-ink font-semibold"
          >
            {seg.slice(1, -1)}
          </code>
        );
      }
      if (seg.startsWith("**") && seg.endsWith("**") && seg.length > 4) {
        return (
          <strong key={i} className="font-bold text-ink">
            {seg.slice(2, -2)}
          </strong>
        );
      }
      if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) {
        return (
          <em key={i} className="italic text-ink">
            {seg.slice(1, -1)}
          </em>
        );
      }
      return seg;
    });
  };

  const renderedBlocks = useMemo(() => {
    if (!content) return null;
    const lines = content.split(/\r?\n/);
    const blocks: BlockElement[] = [];

    let currentListItems: ListItemNode[] = [];
    let isNumbered = false;
    let activeParentNode: ListItemNode | null = null;

    const flushList = () => {
      if (currentListItems.length > 0) {
        blocks.push({
          type: isNumbered ? "ol" : "ul",
          items: currentListItems,
        });
        currentListItems = [];
        activeParentNode = null;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        // Look ahead: does the next non-empty line continue the list?
        let nextIsListItem = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextTrim = lines[j].trim();
          if (nextTrim) {
            if (/^([-*]|\d+\.)\s+/.test(nextTrim)) {
              nextIsListItem = true;
            }
            break;
          }
        }
        // Only flush if the list has truly ended
        if (!nextIsListItem) {
          flushList();
        }
        continue;
      }

      // Check if line is a bullet or numbered list item
      const listMatch = line.match(/^(\s*)([-*]|\d+\.)\s+(.+)$/);
      if (listMatch) {
        const indentStr = listMatch[1];
        const marker = listMatch[2];
        const itemText = listMatch[3].trim();
        const lineIsNumbered = /^\d+\./.test(marker);

        if (!itemText) continue;

        if (currentListItems.length > 0 && isNumbered !== lineIsNumbered) {
          flushList();
        }
        isNumbered = lineIsNumbered;

        const explicitLevel = Math.floor(indentStr.replace(/\t/g, "  ").length / 2);
        const isParentIntro = /:(\s*|\s*\*\*)$/.test(itemText);

        let level = 0;
        if (explicitLevel > 0) {
          level = Math.min(explicitLevel, 2);
        } else if (activeParentNode !== null) {
          if (isParentIntro) {
            level = 0;
          } else if (itemText.endsWith(".") && itemText.length > 35) {
            level = 0;
          } else {
            level = 1;
          }
        } else {
          level = 0;
        }

        const node: ListItemNode = {
          id: `item-${i}-${currentListItems.length}`,
          level,
          text: itemText,
          children: [],
        };

        if (level === 0) {
          currentListItems.push(node);
          activeParentNode = isParentIntro ? node : null;
        } else if (level === 1) {
          const lastRoot = currentListItems[currentListItems.length - 1];
          if (lastRoot) {
            lastRoot.children.push(node);
          } else {
            currentListItems.push(node);
          }
        } else {
          // level >= 2
          const lastRoot = currentListItems[currentListItems.length - 1];
          if (lastRoot && lastRoot.children.length > 0) {
            const lastChild = lastRoot.children[lastRoot.children.length - 1];
            lastChild.children.push(node);
          } else if (lastRoot) {
            lastRoot.children.push(node);
          } else {
            currentListItems.push(node);
          }
        }
        continue;
      }

      // Non-list line: flush any pending list
      flushList();

      if (trimmed.startsWith("### ")) {
        blocks.push({ type: "h4", text: trimmed.slice(4) });
      } else if (trimmed.startsWith("## ")) {
        blocks.push({ type: "h3", text: trimmed.slice(3) });
      } else if (trimmed.startsWith("# ")) {
        blocks.push({ type: "h2", text: trimmed.slice(2) });
      } else if (trimmed.startsWith(">")) {
        blocks.push({ type: "quote", text: trimmed.replace(/^>\s*/, "") });
      } else if (trimmed.startsWith("**") && trimmed.endsWith("**") && trimmed.length > 4) {
        blocks.push({ type: "section-header", text: trimmed.slice(2, -2) });
      } else {
        blocks.push({ type: "p", text: trimmed });
      }
    }

    flushList();
    return blocks;
  }, [content]);

  // Hierarchical list renderer with list-outside and hanging indentation
  const renderListTree = (
    nodes: ListItemNode[],
    isNumberedList: boolean,
    depth: number = 0,
    keyPrefix: string = ""
  ): React.ReactNode => {
    if (!nodes || nodes.length === 0) return null;

    if (depth === 0) {
      if (isNumberedList) {
        return (
          <ol
            key={`${keyPrefix}-ol`}
            className="my-2 space-y-1 list-decimal list-outside pl-5 text-xs text-ink/85 w-full"
          >
            {nodes.map((node, idx) =>
              renderListItem(node, isNumberedList, depth, `${keyPrefix}-${idx}`)
            )}
          </ol>
        );
      }
      return (
        <ul
          key={`${keyPrefix}-ul`}
          className="my-2 space-y-1 list-disc list-outside pl-5 text-xs text-ink/85 w-full"
        >
          {nodes.map((node, idx) =>
            renderListItem(node, isNumberedList, depth, `${keyPrefix}-${idx}`)
          )}
        </ul>
      );
    }

    // Nested list (depth >= 1) with circle markers and extra indentation
    return (
      <ul
        key={`${keyPrefix}-nested`}
        className="mt-1 space-y-0.5 list-outside pl-5 text-xs text-ink/80 w-full"
        style={{ listStyleType: depth === 1 ? "circle" : "square" }}
      >
        {nodes.map((node, idx) =>
          renderListItem(node, isNumberedList, depth, `${keyPrefix}-${idx}`)
        )}
      </ul>
    );
  };

  const renderListItem = (
    node: ListItemNode,
    isNumberedList: boolean,
    depth: number,
    key: string
  ): React.ReactNode => {
    return (
      <li key={key} className="leading-relaxed">
        <span>{renderInlineFormatted(node.text)}</span>
        {node.children.length > 0 &&
          renderListTree(node.children, false, depth + 1, `${key}-sub`)}
      </li>
    );
  };

  if (!renderedBlocks || renderedBlocks.length === 0) {
    return null;
  }

  return (
    <div className={`w-full ${className}`}>
      {renderedBlocks.map((block, idx) => {
        switch (block.type) {
          case "ul":
          case "ol":
            return renderListTree(
              block.items,
              block.type === "ol",
              0,
              `block-${idx}`
            );
          case "section-header":
            return (
              <p
                key={`h-sec-${idx}`}
                className="text-xs sm:text-sm font-bold text-ink uppercase tracking-wide mt-3.5 mb-1.5 w-full"
              >
                {renderInlineFormatted(block.text)}
              </p>
            );
          case "h2":
            return (
              <h2
                key={`h2-${idx}`}
                className="text-base font-bold text-ink mt-4 mb-2 w-full"
              >
                {renderInlineFormatted(block.text)}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={`h3-${idx}`}
                className="text-sm font-bold text-ink mt-3.5 mb-1.5 w-full"
              >
                {renderInlineFormatted(block.text)}
              </h3>
            );
          case "h4":
            return (
              <h4
                key={`h4-${idx}`}
                className="text-xs font-bold uppercase tracking-wider text-ink mt-3 mb-1 w-full"
              >
                {renderInlineFormatted(block.text)}
              </h4>
            );
          case "quote":
            return (
              <blockquote
                key={`quote-${idx}`}
                className="my-2 pl-3 py-1.5 border-l-2 border-ink/40 bg-sand/20 text-xs italic text-ink/80 rounded-r w-full"
              >
                {renderInlineFormatted(block.text)}
              </blockquote>
            );
          case "p":
          default:
            return (
              <p
                key={`p-${idx}`}
                className="text-xs text-ink/85 leading-relaxed my-1.5 w-full"
              >
                {renderInlineFormatted("text" in block ? block.text : "")}
              </p>
            );
        }
      })}
    </div>
  );
}
