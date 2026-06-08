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
      <p className="label-caps text-charcoal-muted">This week</p>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-3xl font-bold tracking-tightest text-charcoal tabular">
          {formatPreciseNumber(summary.points)}
        </span>
        <span className="text-[12px] text-charcoal-muted">pts</span>
      </div>
      <p className="mt-1 text-[12px] text-charcoal-muted">
        {summary.workouts} sessions · {formatPreciseNumber(summary.km)} km
      </p>

      {/* Mini bar chart */}
      <div className="mt-4 flex h-16 items-end justify-between gap-1.5">
        {summary.perDayPoints.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          const isToday = i === summary.perDayPoints.length - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-10 w-full items-end justify-center">
                <div
                  className={`w-full rounded-[3px] transition-all duration-500 ${
                    isToday ? 'bg-coral shadow-glow' : 'bg-white/[0.12]'
                  }`}
                  style={{ height: `${Math.max(v > 0 ? 12 : 4, pct)}%` }}
                />
              </div>
              <span className={`text-[9px] font-medium ${isToday ? 'text-coral' : 'text-charcoal-light'}`}>
                {summary.dayLabels[i]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
