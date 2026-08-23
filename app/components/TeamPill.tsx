import { Team } from '@/lib/types';

interface TeamPillProps {
  team: Team;
  /** 'sm' for dense rows (leaderboard, rower cards), 'md' for the profile. */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * A rower's training group. Always shows the group's name alongside its colour
 * dot, so the group never has to be read from colour alone.
 */
export default function TeamPill({ team, size = 'sm', className = '' }: TeamPillProps) {
  const sm = size === 'sm';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border border-white/[0.08] bg-white/[0.04] font-medium text-charcoal-soft ${
        sm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${className}`}
    >
      <span
        className={`shrink-0 rounded-full ${sm ? 'h-1.5 w-1.5' : 'h-2 w-2'}`}
        style={{ backgroundColor: team.color }}
        aria-hidden
      />
      {team.name}
    </span>
  );
}
