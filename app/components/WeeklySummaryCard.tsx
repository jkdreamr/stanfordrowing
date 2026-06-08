import { formatPreciseNumber } from '@/lib/data';
import { WeeklySummary } from '@/lib/stats';

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  className?: string;
}

export default function WeeklySummaryCard({ summary, className = '' }: WeeklySummaryCardProps) {
  const max = Math.max(...summary.perDayPoints, 1);

  return (
    <div className={`card p-5 ${className}`}>
      <p className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">This week</p>

      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <span className="text-2xl font-bold tabular text-charcoal">{formatPreciseNumber(summary.points)}</span>
          <span className="ml-1 text-[11px] text-charcoal-muted">pts</span>
        </div>
        <div className="text-[13px] text-charcoal-muted">
          {summary.workouts} sessions · {formatPreciseNumber(summary.km)} km
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mt-4 flex h-16 items-end justify-between gap-1">
        {summary.perDayPoints.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          const isToday = i === summary.perDayPoints.length - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-10 w-full items-end justify-center">
                <div
                  className={`w-full rounded-sm transition-all duration-500 ${isToday ? 'bg-coral' : 'bg-stone'}`}
                  style={{ height: `${Math.max(v > 0 ? 10 : 0, pct)}%` }}
                />
              </div>
              <span className="text-[9px] font-medium text-charcoal-light">{summary.dayLabels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
