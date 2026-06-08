'use client';

import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import { getWorkoutPrimaryValue, getWorkoutWeightedScore, formatPreciseNumber } from '@/lib/data';
import { formatPrimary, workoutIcon, timeAgo } from '@/lib/stats';
import Icon from './Icon';

interface WorkoutShareCardProps {
  workout: Workout;
  configs: Record<WorkoutType, WorkoutTypeConfig>;
}

/** A designed vertical share card for a workout — viewable in-app. */
export default function WorkoutShareCard({ workout, configs }: WorkoutShareCardProps) {
  const primary = getWorkoutPrimaryValue(workout, configs);
  const points = getWorkoutWeightedScore(workout, configs);
  const displayName = workout.userName || workout.oderId;
  const config = configs[workout.type];

  return (
    <div className="relative w-72 overflow-hidden rounded-2xl shadow-story">
      <div className="flex min-h-[400px] flex-col justify-between bg-gradient-to-br from-charcoal via-olive/60 to-stone-dark p-5">
        {/* Header */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
            Cardinal Row
          </p>
          <p className="mt-1 text-sm font-medium text-white/70">{displayName}</p>
        </div>

        {/* Main stat */}
        <div className="py-6 text-center">
          <div className="mb-2 inline-flex items-center gap-1 text-white/50">
            <Icon name={workoutIcon(workout.type)} size={14} />
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {config?.label || workout.type.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="font-display text-6xl font-bold tracking-tightest text-white tabular">
              {formatPrimary(primary.value, primary.unit)}
            </span>
            <span className="text-lg font-medium text-white/50">{primary.unit}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-end justify-between">
          <span className="text-[10px] text-white/30">{timeAgo(workout.createdAt)}</span>
          <span className="text-[10px] font-medium tabular text-white/30">
            +{formatPreciseNumber(points)} pts
          </span>
        </div>
      </div>
    </div>
  );
}
