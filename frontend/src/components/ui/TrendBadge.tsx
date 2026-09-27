import type { TrendDirection } from "@/lib/types";

const config: Record<
  TrendDirection,
  { glyph: string; label: string; bg: string; text: string }
> = {
  improving: { glyph: "↑", label: "IMPROVING", bg: "bg-[#DFE968]/70", text: "text-[#1C1C1C]" },
  stagnating: { glyph: "→", label: "STAGNATING", bg: "bg-[#FBF1CF]", text: "text-[#1C1C1C]" },
  declining: { glyph: "↓", label: "DECLINING", bg: "bg-[#F6C8D6]", text: "text-[#C85A54]" },
  insufficient: { glyph: "?", label: "INSUFFICIENT", bg: "bg-gray-200/70", text: "text-[#1C1C1C]/60" },
};

interface Props {
  trend: TrendDirection;
  size?: "sm" | "md" | "lg";
}

export default function TrendBadge({ trend, size = "md" }: Props) {
  const c = config[trend] ?? config.insufficient;
  const sizeClasses = {
    sm: "text-[9px] px-2.5 py-0.5",
    md: "text-[11px] px-3 py-1",
    lg: "text-xs px-4 py-1.5",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-extrabold tracking-[0.08em] uppercase rounded-full border border-[#1C1C1C] ${c.bg} ${c.text} ${sizeClasses[size]} shadow-[1px_1px_0px_#1C1C1C]`}
    >
      <span className="text-sm font-black leading-none">{c.glyph}</span>
      <span>{c.label}</span>
    </span>
  );
}
