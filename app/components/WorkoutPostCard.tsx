'use client';

import Link from 'next/link';
import { ReactNode, useState } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig, User } from '@/lib/types';
import {
  formatPreciseNumber,
  getUserById,
  getWorkoutLabel,
  getWorkoutPrimaryValue,
  getWorkoutWeightedScore,
} from '@/lib/data';
import { Badge, formatPrimary, timeAgo, workoutIcon } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';
import RespectButton from './RespectButton';
import ProofPreview, { proofKind } from './ProofPreview';
import CommentSection from './CommentSection';

interface WorkoutPostCardProps {
  workout: Workout;
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  badges?: Badge[];
  currentUser: User | null;
  avatarById?: Record<string, string>;
  onToggleRespect: (workout: Workout) => void;
  onAddComment?: (workout: Workout, body: string, parentId?: string) => Promise<boolean>;
  onDeleteComment?: (workout: Workout, commentId: string) => void;
  actions?: ReactNode;
}

const BADGE_LABELS: Record<string, string> = {
  pr: 'PR',
  long: 'Big session',
  early: 'Early',
  big_week: 'Big week',
};

const UNIT_LABEL: Record<string, string> = { km: 'km', mins: 'min', pts: 'pts' };

export default function WorkoutPostCard({
  workout,
  configs,
  badges = [],
  currentUser,
  avatarById,
  onToggleRespect,
  onAddComment,
  onDeleteComment,
  actions,
}: WorkoutPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const author = getUserById(workout.oderId);
  const displayName = author?.name ?? workout.userName ?? 'Unknown';
  const primary = getWorkoutPrimaryValue(workout, configs);
  const points = getWorkoutWeightedScore(workout, configs);
  const reactions = workout.reactions ?? [];
  const comments = workout.comments ?? [];
  const hasReacted = reactions.some((r) => r.userId === currentUser?.id);
  const isOwn = workout.oderId === currentUser?.id;
  const caption = workout.notes?.trim();
  const commentsEnabled = Boolean(onAddComment && onDeleteComment);

  return (
    <article className="card group animate-fade-in overflow-hidden">
      {/* Proof image — full bleed at top if available */}
      {workout.proofUrl && (
        <div className="relative">
          <ProofPreview url={workout.proofUrl} aspect="aspect-[16/10]" />
          {proofKind(workout.proofUrl) === 'image' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#141a18] to-transparent" />
          )}
        </div>
      )}

      <div className="p-5">
        {/* Author row */}
        <div className="flex items-center gap-3">
          <Link href={`/rowers/${workout.oderId}`} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded-lg">
            <Avatar name={displayName} size={40} src={avatarById?.[workout.oderId]} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold tracking-editorial text-charcoal">{displayName}</p>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-charcoal-muted">
                <span className="flex min-w-0 items-center gap-1 text-charcoal-soft">
                  <Icon name={workoutIcon(workout.type)} size={13} className="shrink-0" />
                  <span className="truncate">{getWorkoutLabel(workout, configs)}</span>
                </span>
                <span className="shrink-0 text-charcoal-light">·</span>
                <span className="shrink-0">{timeAgo(workout.createdAt)}</span>
              </div>
            </div>
          </Link>
          <span className="shrink-0 rounded-pill border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold tabular text-charcoal-muted">
            +{formatPreciseNumber(points)}
          </span>
        </div>

        {/* Main stat — one dominant number */}
        <div className="mt-4 flex max-w-full items-end gap-2 overflow-hidden">
          <span className="font-display text-[40px] xs:text-[46px] sm:text-[52px] font-bold leading-[0.9] tracking-tightest text-charcoal tabular">
            {formatPrimary(primary.value, primary.unit)}
          </span>
          <span className="shrink-0 pb-1 text-base font-medium text-charcoal-muted">{UNIT_LABEL[primary.unit] ?? primary.unit}</span>
        </div>

        {/* Badges — quiet tags */}
        {badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.kind}
                className={`rounded-pill px-2.5 py-1 text-[10px] font-semibold tracking-wide ${
                  b.kind === 'pr'
                    ? 'bg-coral-soft text-coral'
                    : 'bg-olive-bg text-olive-soft'
                }`}
              >
                {BADGE_LABELS[b.kind] ?? b.label}
              </span>
            ))}
          </div>
        )}

        {/* Caption */}
        {(caption || workout.activityName) && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-charcoal-soft">
            {workout.activityName ? <span className="font-semibold text-charcoal">{workout.activityName} — </span> : null}
            {caption}
          </p>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3.5">
          <div className="flex items-center gap-4">
            <RespectButton
              count={reactions.length}
              active={hasReacted}
              disabled={isOwn || !currentUser}
              onToggle={() => onToggleRespect(workout)}
            />
            {commentsEnabled && (
              <button
                type="button"
                onClick={() => setShowComments((s) => !s)}
                aria-expanded={showComments}
                className="group inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1.5 rounded-lg transition-all duration-150 active:scale-90 touch-manipulation"
              >
                <Icon
                  name="mode_comment"
                  fill={showComments}
                  size={18}
                  className={`transition-colors ${showComments ? 'text-coral' : 'text-charcoal-light group-hover:text-coral'}`}
                />
                <span className="text-[12px] font-medium tabular text-charcoal-muted">
                  {comments.length > 0 ? comments.length : ''} Comment{comments.length === 1 ? '' : 's'}
                </span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </div>

        {commentsEnabled && showComments && (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <CommentSection
              comments={comments}
              currentUser={currentUser}
              avatarById={avatarById}
              onAdd={(body, parentId) => onAddComment!(workout, body, parentId)}
              onDelete={(commentId) => onDeleteComment!(workout, commentId)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
