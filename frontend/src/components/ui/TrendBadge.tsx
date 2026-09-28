import type { TrendDirection } from "@/lib/types";

const config: Record<
  string,
  { glyph: string; label: string; bg: string; text: string }
> = {
  improving: { glyph: "↑", label: "IMPROVING", bg: "bg-[#DFE968]", text: "text-[#1C1C1C]" },
  stagnating: { glyph: "→", label: "STAGNATING", bg: "bg-[#FBF1CF]", text: "text-[#1C1C1C]" },
  declining: { glyph: "↓", label: "DECLINING", bg: "bg-[#F6C8D6]", text: "text-[#C85A54]" },
  insufficient: { glyph: "?", label: "NEED EVIDENCE", bg: "bg-neutral-200", text: "text-[#1C1C1C]/80" },
  insufficient_evidence: { glyph: "?", label: "NEED EVIDENCE", bg: "bg-neutral-200", text: "text-[#1C1C1C]/80" },
};

interface Props {
  trend: TrendDirection | "insufficient_evidence" | string;
  size?: "sm" | "md" | "lg";
}

export default function TrendBadge({ trend, size = "md" }: Props) {
  const norm = (trend || "insufficient").toLowerCase();
  const c = config[norm] ?? config.insufficient;
  const sizeClasses = {
    sm: "text-[9px] px-2.5 py-1 gap-1.5",
    md: "text-[10px] px-3 py-1.5 gap-1.5",
    lg: "text-xs px-4 py-2 gap-2",
  };

  return (
    <span
      className={`inline-flex items-center justify-center font-black tracking-[0.08em] uppercase rounded-full border-[1.5px] border-[#1C1C1C] ${c.bg} ${c.text} ${sizeClasses[size]} shadow-[1.5px_1.5px_0px_#1C1C1C] leading-none whitespace-nowrap select-none`}
    >
      <span className="font-mono font-black leading-none">{c.glyph}</span>
      <span className="leading-none">{c.label}</span>
    </span>
  );
}
