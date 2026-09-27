import type { Competency } from "@/lib/types";
import TrendBadge from "./TrendBadge";
import ConfidenceBadge from "./ConfidenceBadge";
import Link from "next/link";

interface Props {
  competency: Competency;
  learnerId: string;
}

export default function CompetencyCard({ competency, learnerId }: Props) {
  const c = competency;
  return (
    <Link
      href={`/employee/skills/${c.competency_id}?learner=${learnerId}`}
      className="gl-card p-5 block group"
      style={{ animationDelay: `var(--stagger, 0ms)` }}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-bold text-base tracking-tight">
          {c.competency_name}
        </h3>
        <TrendBadge trend={c.trend} size="sm" />
      </div>

      <div className="flex items-end gap-4 mb-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.08em] uppercase opacity-50 mb-0.5">
            CAPABILITY
          </p>
          <p className="text-3xl font-extrabold leading-none">
            {Number.isFinite(c.current_score) ? Math.round(c.current_score) : (Number.isFinite((c as any).score) ? Math.round((c as any).score) : 75)}
          </p>
        </div>
        <div className="flex-1">
          <ConfidenceBadge value={Number.isFinite(c.confidence) ? c.confidence : 75} size="sm" />
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] font-medium tracking-[0.04em] opacity-50">
        <span>{c.evidence_count ?? 0} evidence items</span>
        <span>
          Last: {(c.days_since_last ?? 0) <= 0 ? "today" : `${c.days_since_last}d ago`}
        </span>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--color-ink)]/10 text-[10px] font-semibold tracking-[0.06em] uppercase opacity-60 group-hover:opacity-100 transition-opacity">
        EXPLORE →
      </div>
    </Link>
  );
}
