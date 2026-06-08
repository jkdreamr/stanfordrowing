'use client';

import { useMemo } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig, User } from '@/lib/types';
import { getWorkoutBadges } from '@/lib/stats';
import WorkoutPostCard from './WorkoutPostCard';
import EmptyState from './EmptyState';

interface FeedListProps {
  workouts: Workout[]; // already sorted newest-first
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  currentUser: User | null;
  onToggleRespect: (workout: Workout) => void;
  /** all workouts (used to derive badges accurately); defaults to `workouts` */
  allWorkouts?: Workout[];
  emptyTitle?: string;
  emptyMessage?: string;
}

export default function FeedList({
  workouts,
  configs,
  currentUser,
  onToggleRespect,
  allWorkouts,
  emptyTitle = 'No workouts yet.',
  emptyMessage = 'Someone has to start. Log the work.',
}: FeedListProps) {
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
        actionLabel="Log the work"
        actionHref="/log"
      />
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((w) => (
        <WorkoutPostCard
          key={w.id}
          workout={w}
          configs={configs}
          badges={getWorkoutBadges(w, byAuthor.get(w.oderId) ?? [w], configs)}
          currentUser={currentUser}
          onToggleRespect={onToggleRespect}
        />
      ))}
    </div>
  );
}
