'use client';

import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import { getWorkoutPrimaryValue } from '@/lib/data';
import { formatPrimary, workoutIcon } from '@/lib/stats';
import Avatar from './Avatar';

interface TrainingStoriesProps {
  /** All workouts, sorted newest-first. We pick the latest per rower. */
  workouts: Workout[];
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  onTap: (workout: Workout) => void;
}

interface StoryEntry {
  rowerName: string;
  rowerId: string;
  workout: Workout;
}

export default function TrainingStories({ workouts, configs, onTap }: TrainingStoriesProps) {
  // Deduplicate: one story per rower (their most recent workout)
  const seen = new Set<string>();
  const stories: StoryEntry[] = [];
  for (const w of workouts) {
    if (seen.has(w.oderId)) continue;
    seen.add(w.oderId);
    stories.push({
      rowerName: w.userName || w.oderId,
      rowerId: w.oderId,
      workout: w,
    });
    if (stories.length >= 20) break;
  }

  if (stories.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 py-2 sm:-mx-0 sm:px-0">
      {stories.map((s) => {
        const primary = getWorkoutPrimaryValue(s.workout, configs);
        return (
          <button
            key={s.rowerId}
            type="button"
            onClick={() => onTap(s.workout)}
            className="flex shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <Avatar
              name={s.rowerName}
              size={52}
              ring
            />
            <span className="max-w-[56px] truncate text-[10px] font-medium text-charcoal-soft">
              {s.rowerName.split(' ')[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
