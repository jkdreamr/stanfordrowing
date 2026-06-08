import Link from 'next/link';
import { ReactNode } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';

interface LeaderboardCardProps {
  rank: number;
  title: string;
  subtitle?: string;
  href?: string;
  /** main metric, already formatted */
  value: string;
  unit?: string;
  /** 0–100 progress relative to the leader */
  percentage: number;
  color?: string;
  avatarName?: string; // when present, render an avatar instead of a color chip
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
  color = '#b51c00',
  avatarName,
  badge,
  highlight = false,
}: LeaderboardCardProps) {
  const inner = (
    <div
      className={`card flex items-center gap-4 rounded-2xl p-4 transition-colors ${
        highlight ? 'border-cardinal/40 ring-1 ring-cardinal/20' : 'hover:border-ink/15'
      }`}
    >
      {/* Rank */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular ${
          rank === 1
            ? 'bg-cardinal text-white'
            : rank === 2
              ? 'bg-[#c0a96e] text-white'
              : rank === 3
                ? 'bg-[#a07855] text-white'
                : 'bg-container-low text-ink-muted'
        }`}
      >
        {rank}
      </div>

      {avatarName ? (
        <Avatar name={avatarName} color={color} size={40} />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded-xl border border-black/5" style={{ backgroundColor: color }} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h3 className="truncate font-semibold text-ink">{title}</h3>
            {badge}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold tabular text-ink">{value}</span>
            {unit && <span className="ml-1 text-xs text-ink-muted">{unit}</span>}
          </div>
        </div>

        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-container-low">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.max(2, Math.min(100, percentage))}%`, backgroundColor: color }}
          />
        </div>

        {subtitle && <p className="mt-2 truncate text-xs text-ink-soft">{subtitle}</p>}
      </div>

      {href && <Icon name="chevron_right" size={20} className="shrink-0 text-ink-muted" />}
    </div>
  );

  return href ? (
    <Link href={href} className="focus-ring block rounded-2xl">
      {inner}
    </Link>
  ) : (
    inner
  );
}
