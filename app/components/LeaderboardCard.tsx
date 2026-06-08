import Link from 'next/link';
import { ReactNode } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';

interface LeaderboardCardProps {
  rank: number;
  title: string;
  subtitle?: string;
  href?: string;
  value: string;
  unit?: string;
  percentage: number;
  color?: string;
  avatarName?: string;
  badge?: ReactNode;
  highlight?: boolean;
}

export default function LeaderboardCard({
  rank,
  title,
  subtitle,
  href,
  value,
  unit,
  percentage,
  color = '#8c8680',
  avatarName,
  badge,
  highlight = false,
}: LeaderboardCardProps) {
  const inner = (
    <div
      className={`card flex items-center gap-3 p-3.5 transition-all ${
        highlight ? 'border-coral/30' : ''
      }`}
    >
      {/* Rank */}
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12px] font-bold tabular ${
          rank === 1
            ? 'bg-coral text-white'
            : rank === 2
              ? 'bg-taupe text-white'
              : rank === 3
                ? 'bg-stone-dark text-white'
                : 'bg-stone-light text-charcoal-muted'
        }`}
      >
        {rank}
      </span>

      {avatarName ? (
        <Avatar name={avatarName} size={36} />
      ) : (
        <span className="h-9 w-9 shrink-0 rounded-lg bg-stone-light" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <h3 className="truncate text-[13px] font-semibold text-charcoal">{title}</h3>
            {badge}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[15px] font-bold tabular text-charcoal">{value}</span>
            {unit && <span className="ml-0.5 text-[10px] text-charcoal-muted">{unit}</span>}
          </div>
        </div>

        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-stone-light">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, Math.min(100, percentage))}%`, backgroundColor: rank <= 3 ? '#c4704a' : '#a8a299' }}
          />
        </div>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="focus-ring block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
