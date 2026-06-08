'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig, User } from '@/lib/types';
import {
  formatPreciseNumber,
  getTeamById,
  getUserById,
  getWorkoutLabel,
  getWorkoutPrimaryValue,
  getWorkoutWeightedScore,
} from '@/lib/data';
import { Badge, formatPrimary, timeAgo, workoutIcon } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';
import RespectButton from './RespectButton';
import ProofPreview from './ProofPreview';

interface WorkoutPostCardProps {
  workout: Workout;
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  badges?: Badge[];
  currentUser: User | null;
  onToggleRespect: (workout: Workout) => void;
  actions?: ReactNode;
}

const BADGE_LABELS: Record<string, string> = {
  pr: 'PR',
  long: 'Big session',
  early: 'Early',
  big_week: 'Big week',
};

export default function WorkoutPostCard({
  workout,
  configs,
  badges = [],
  currentUser,
  onToggleRespect,
  actions,
}: WorkoutPostCardProps) {
  const author = getUserById(workout.oderId);
  const displayName = author?.name ?? workout.userName ?? 'Unknown';
  const primary = getWorkoutPrimaryValue(workout, configs);
  const points = getWorkoutWeightedScore(workout, configs);
  const reactions = workout.reactions ?? [];
  const hasReacted = reactions.some((r) => r.userId === currentUser?.id);
  const isOwn = workout.oderId === currentUser?.id;

  return (
    <article className="card animate-fade-in overflow-hidden">
      {/* Proof image — full bleed at top if available */}
      {workout.proofUrl && (
        <ProofPreview url={workout.proofUrl} aspect="aspect-[16/9]" />
      )}

      <div className="p-4">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Link href={`/rowers/${workout.oderId}`} className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-lg">
            <Avatar name={displayName} size={34} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-charcoal">{displayName}</p>
              <div className="flex items-center gap-2 text-[11px] text-charcoal-muted">
                <span>{timeAgo(workout.createdAt)}</span>
                <span className="text-stone-dark">·</span>
                <span className="flex items-center gap-0.5">
                  <Icon name={workoutIcon(workout.type)} size={12} />
                  {getWorkoutLabel(workout, configs)}
                </span>
              </div>
            </div>
          </Link>
        </div>

        {/* Main stat */}
        <div className="mt-4 flex items-baseline gap-1.5">
          <span className="font-display text-4xl font-bold tracking-tightest text-charcoal tabular">
            {formatPrimary(primary.value, primary.unit)}
          </span>
          <span className="text-sm font-medium text-charcoal-muted">{primary.unit}</span>
        </div>

        {/* Badges — quiet tags */}
        {badges.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.kind}
                className="rounded-md bg-olive-bg px-2 py-0.5 text-[10px] font-medium text-olive"
              >
                {BADGE_LABELS[b.kind] ?? b.label}
              </span>
            ))}
          </div>
        )}

        {/* Caption */}
        {(workout.notes || workout.activityName) && (
          <p className="mt-3 text-[13px] leading-relaxed text-charcoal-soft">
            {workout.activityName ? <span className="font-medium text-charcoal">{workout.activityName} — </span> : null}
            {workout.notes}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-stone/30 pt-3">
          <RespectButton
            count={reactions.length}
            active={hasReacted}
            disabled={isOwn || !currentUser}
            onToggle={() => onToggleRespect(workout)}
          />
          <div className="flex items-center gap-2">
            {actions}
            <span className="text-[10px] font-medium tabular text-charcoal-light">
              +{formatPreciseNumber(points)} pts
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
