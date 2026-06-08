'use client';

import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import { getUserById, getWorkoutPrimaryValue } from '@/lib/data';
import { formatPrimary } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

interface TrainingStoriesProps {
  /** All workouts, sorted newest-first. We pick the latest per rower. */
  workouts: Workout[];
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  onTap: (workout: Workout) => void;
  /** Render as a locked preview (logged-out) — taps disabled, lock shown. */
  locked?: boolean;
}

interface StoryEntry {
  rowerName: string;
  rowerId: string;
  workout: Workout;
}

const UNIT_LABEL: Record<string, string> = { km: 'km', mins: 'min', pts: 'pts' };

export default function TrainingStories({ workouts, configs, onTap, locked = false }: TrainingStoriesProps) {
  // Deduplicate: one story per rower (their most recent workout)
  const seen = new Set<string>();
  const stories: StoryEntry[] = [];
  for (const w of workouts) {
    if (seen.has(w.oderId)) continue;
    seen.add(w.oderId);
    stories.push({
      rowerName: getUserById(w.oderId)?.name || w.userName || w.oderId,
      rowerId: w.oderId,
      workout: w,
    });
    if (stories.length >= 24) break;
  }

  if (stories.length === 0) return null;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="label-caps text-charcoal-muted">Training Stories</p>
        {locked && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-charcoal-light">
            <Icon name="lock" size={12} /> Locked
          </span>
        )}
      </div>
      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:-mx-1 sm:px-1">
        {stories.map((s) => {
          const primary = getWorkoutPrimaryValue(s.workout, configs);
          return (
            <button
              key={s.rowerId}
              type="button"
              onClick={() => !locked && onTap(s.workout)}
              disabled={locked}
              className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95 disabled:cursor-default"
            >
              <span className="relative story-ring">
                <span className={`block rounded-full bg-bone p-0.5 ${locked ? 'opacity-70' : ''}`}>
                  <Avatar name={s.rowerName} size={56} />
                </span>
                {locked ? (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-bone-dark ring-1 ring-white/10">
                    <Icon name="lock" size={11} className="text-charcoal-muted" />
                  </span>
                ) : (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-pill bg-coral px-1.5 py-0.5 text-[8px] font-bold tabular text-white shadow-glow">
                    {formatPrimary(primary.value, primary.unit)}
                    <span className="ml-0.5 font-medium opacity-80">{UNIT_LABEL[primary.unit] ?? primary.unit}</span>
                  </span>
                )}
              </span>
              <span className="mt-1 max-w-[64px] truncate text-[11px] font-medium text-charcoal-soft">
                {s.rowerName.split(' ')[0].split('-')[0]}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
