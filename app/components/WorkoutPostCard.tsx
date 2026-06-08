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
  /** owner-only controls (edit/delete) shown in the footer */
  actions?: ReactNode;
}

const BADGE_ICON: Record<string, string> = {
  pr: 'trophy',
  long: 'timeline',
  early: 'wb_twilight',
  big_week: 'local_fire_department',
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
  const team = author ? getTeamById(author.teamId) : undefined;
  const teamColor = team?.color ?? '#b51c00';
  const primary = getWorkoutPrimaryValue(workout, configs);
  const points = getWorkoutWeightedScore(workout, configs);
  const reactions = workout.reactions ?? [];
  const hasReacted = reactions.some((r) => r.userId === currentUser?.id);
  const isOwn = workout.oderId === currentUser?.id;

  return (
    <article className="card animate-fade-in overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <Link href={`/rowers/${workout.oderId}`} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <Avatar name={author?.name ?? 'Unknown'} color={teamColor} size={42} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-tight text-ink">
              {author?.name ?? 'Unknown'}
            </p>
            <p className="label-caps mt-0.5 flex items-center gap-1.5 text-ink-muted">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: teamColor }} />
              <span className="truncate normal-case tracking-normal">{team?.name ?? 'Unaffiliated'}</span>
            </p>
          </div>
        </Link>
        <span className="label-caps shrink-0 text-ink-muted">{timeAgo(workout.createdAt)}</span>
      </div>

      {/* Main stat */}
      <div className="px-4 pb-4">
        <p className="label-caps mb-1 text-ink-muted">{getWorkoutLabel(workout, configs)}</p>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold tracking-tightest text-ink tabular">
            {formatPrimary(primary.value, primary.unit)}
          </span>
          <span className="text-lg font-semibold text-ink-muted">{primary.unit}</span>
          <Icon name={workoutIcon(workout.type)} className="ml-auto text-cardinal" size={26} />
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {badges.map((b) => (
              <span
                key={b.kind}
                className="inline-flex items-center gap-1 rounded-full bg-cardinal/8 px-2.5 py-1 text-[11px] font-semibold text-cardinal"
              >
                <Icon name={BADGE_ICON[b.kind] ?? 'bolt'} size={14} fill />
                {b.label}
              </span>
            ))}
          </div>
        )}

        {/* Caption */}
        {workout.notes && (
          <p className="mt-3 text-[15px] leading-relaxed text-ink">
            {workout.activityName ? <span className="font-semibold">{workout.activityName} · </span> : null}
            {workout.notes}
          </p>
        )}
        {!workout.notes && workout.activityName && (
          <p className="mt-3 text-[15px] font-semibold text-ink">{workout.activityName}</p>
        )}
      </div>

      {/* Proof image (full-bleed) */}
      {workout.proofUrl && <ProofPreview url={workout.proofUrl} />}

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
        <RespectButton
          count={reactions.length}
          active={hasReacted}
          disabled={isOwn || !currentUser}
          onToggle={() => onToggleRespect(workout)}
        />
        <div className="flex items-center gap-2">
          {actions}
          <span className="inline-flex items-center gap-1 rounded-full border border-cardinal/30 bg-cardinal/8 px-3 py-1 text-xs font-semibold text-cardinal">
            +{formatPreciseNumber(points)} pts
          </span>
        </div>
      </div>
    </article>
  );
}
