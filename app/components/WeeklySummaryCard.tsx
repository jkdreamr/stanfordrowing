import { formatPreciseNumber } from '@/lib/data';
import { WeeklySummary } from '@/lib/stats';

interface WeeklySummaryCardProps {
  summary: WeeklySummary;
  className?: string;
}

/** This-week snapshot with a 7-day mini bar chart. */
export default function WeeklySummaryCard({ summary, className = '' }: WeeklySummaryCardProps) {
  const max = Math.max(...summary.perDayPoints, 1);

  return (
    <div className={`card rounded-2xl p-5 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="label-caps text-ink">This week</h3>
        <span className="label-caps text-ink-muted">Last 7 days</span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <div>
          <p className="text-2xl font-bold tabular text-cardinal">{formatPreciseNumber(summary.points)}</p>
          <p className="label-caps mt-0.5 text-ink-muted">Points</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular text-ink">{summary.workouts}</p>
          <p className="label-caps mt-0.5 text-ink-muted">Workouts</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular text-ink">{formatPreciseNumber(summary.km)}</p>
          <p className="label-caps mt-0.5 text-ink-muted">Km</p>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mt-5 flex h-20 items-end justify-between gap-1.5">
        {summary.perDayPoints.map((v, i) => {
          const pct = Math.round((v / max) * 100);
          const isToday = i === summary.perDayPoints.length - 1;
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-14 w-full items-end justify-center rounded-md bg-container-low">
                <div
                  className={`w-full rounded-md transition-all duration-500 ${isToday ? 'bg-coral' : 'bg-cardinal'}`}
                  style={{ height: `${Math.max(v > 0 ? 8 : 0, pct)}%` }}
                  title={`${formatPreciseNumber(v)} pts`}
                />
              </div>
              <span className="label-caps text-ink-muted">{summary.dayLabels[i]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
