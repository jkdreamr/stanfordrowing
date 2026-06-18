'use client';

import { useMemo, useState } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig, User } from '@/lib/types';
import { getWorkoutBadges } from '@/lib/stats';
import WorkoutPostCard from './WorkoutPostCard';
import EmptyState from './EmptyState';

interface FeedListProps {
  workouts: Workout[];
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  currentUser: User | null;
  avatarById?: Record<string, string>;
  usersById?: Record<string, { name: string; avatarUrl?: string }>;
  onToggleRespect: (workout: Workout) => void;
  onAddComment?: (workout: Workout, body: string, parentId?: string) => Promise<boolean>;
  onDeleteComment?: (workout: Workout, commentId: string) => void;
  allWorkouts?: Workout[];
  emptyTitle?: string;
  emptyMessage?: string;
}

/** Cards rendered up front; more mount on demand so long feeds stay smooth. */
const PAGE_SIZE = 15;

export default function FeedList({
  workouts,
  configs,
  currentUser,
  avatarById,
  usersById,
  onToggleRespect,
  onAddComment,
  onDeleteComment,
  allWorkouts,
  emptyTitle = 'No work logged yet.',
  emptyMessage = 'Someone has to start.',
}: FeedListProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const byAuthor = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of allWorkouts ?? workouts) {
      const list = map.get(w.oderId) ?? [];
      list.push(w);
      map.set(w.oderId, list);
    }
    return map;
  }, [allWorkouts, workouts]);

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon="rowing"
        title={emptyTitle}
        message={emptyMessage}
        actionLabel="Log the first session"
        actionHref="/log"
      />
    );
  }

  const visible = workouts.slice(0, visibleCount);
  const remaining = workouts.length - visible.length;

  return (
    <div className="space-y-5">
      {visible.map((w) => (
        <WorkoutPostCard
          key={w.id}
          workout={w}
          configs={configs}
          badges={getWorkoutBadges(w, byAuthor.get(w.oderId) ?? [w], configs)}
          currentUser={currentUser}
          avatarById={avatarById}
          usersById={usersById}
          onToggleRespect={onToggleRespect}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
        />
      ))}

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="focus-ring flex min-h-[48px] w-full items-center justify-center rounded-xl border border-stone/40 bg-white/[0.03] text-[13px] font-semibold text-charcoal-soft transition-colors hover:bg-white/[0.06] active:scale-[0.99] touch-manipulation"
        >
          Show {Math.min(remaining, PAGE_SIZE)} more
        </button>
      )}
    </div>
  );
}
