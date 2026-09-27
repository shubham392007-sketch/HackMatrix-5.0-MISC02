interface Props {
  value: number; // 0 to 100
  size?: "sm" | "md";
}

export default function ConfidenceBadge({ value, size = "md" }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100) / 100));
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;

  const label =
    pct >= 80 ? "High" : pct >= 50 ? "Medium" : pct >= 25 ? "Low" : "Very Low";

  const sizeClasses = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium ${sizeClasses}`}>
      <span className="font-mono tracking-tight" aria-label={`Confidence: ${pct}%`}>
        {"█".repeat(filled)}
        {"░".repeat(empty)}
      </span>
      <span className="font-semibold">{pct}%</span>
      <span className="opacity-50">({label})</span>
    </span>
  );
}
