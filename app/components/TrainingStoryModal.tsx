'use client';

import { useEffect } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import { getWorkoutPrimaryValue, getWorkoutWeightedScore, formatPreciseNumber } from '@/lib/data';
import { formatPrimary, timeAgo, workoutIcon } from '@/lib/stats';
import Icon from './Icon';
import RespectButton from './RespectButton';

interface TrainingStoryModalProps {
  workout: Workout;
  configs: Record<WorkoutType, WorkoutTypeConfig>;
  currentUserId?: string;
  hasReacted: boolean;
  respectCount: number;
  onToggleRespect: () => void;
  onClose: () => void;
}

export default function TrainingStoryModal({
  workout,
  configs,
  currentUserId,
  hasReacted,
  respectCount,
  onToggleRespect,
  onClose,
}: TrainingStoryModalProps) {
  const primary = getWorkoutPrimaryValue(workout, configs);
  const points = getWorkoutWeightedScore(workout, configs);
  const displayName = workout.userName || workout.oderId;
  const config = configs[workout.type];
  const hasProofImage = workout.proofUrl && /\.(png|jpe?g|gif|webp|avif)/i.test(workout.proofUrl);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal/70 backdrop-blur-sm" />

      {/* Story card */}
      <div
        className="animate-story-in relative w-full max-w-sm overflow-hidden rounded-3xl shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background */}
        <div className="relative flex min-h-[520px] flex-col justify-between p-6">
          {hasProofImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={workout.proofUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-charcoal/60 via-charcoal/30 to-charcoal/80" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-stone-dark via-olive/40 to-charcoal/90" />
          )}

          {/* Top section */}
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">{displayName}</p>
              <p className="mt-0.5 text-[11px] text-white/50">{timeAgo(workout.createdAt)}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Center — dominant stat */}
          <div className="relative z-10 py-8 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 backdrop-blur-sm">
              <Icon name={workoutIcon(workout.type)} size={14} className="text-white/80" />
              <span className="text-[11px] font-medium text-white/80">
                {config?.label || workout.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display text-7xl font-bold tracking-tightest text-white tabular">
                {formatPrimary(primary.value, primary.unit)}
              </span>
              <span className="text-xl font-medium text-white/60">{primary.unit}</span>
            </div>
            {workout.notes && (
              <p className="mx-auto mt-4 max-w-[260px] text-sm leading-relaxed text-white/70">
                {workout.notes}
              </p>
            )}
          </div>

          {/* Bottom actions */}
          <div className="relative z-10 flex items-center justify-between">
            <RespectButton
              count={respectCount}
              active={hasReacted}
              disabled={!currentUserId || workout.oderId === currentUserId}
              onToggle={onToggleRespect}
              className="[&_span]:text-white/60 [&_.material-symbols-outlined]:text-white/80"
            />
            <span className="text-[11px] font-medium tabular text-white/40">
              +{formatPreciseNumber(points)} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
