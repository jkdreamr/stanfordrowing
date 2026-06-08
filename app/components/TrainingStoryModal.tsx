'use client';

import { useEffect } from 'react';
import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import {
  getUserById,
  getWorkoutPrimaryValue,
  getWorkoutWeightedScore,
  formatPreciseNumber,
} from '@/lib/data';
import { formatPrimary, timeAgo, workoutIcon } from '@/lib/stats';
import Avatar from './Avatar';
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

const UNIT_LABEL: Record<string, string> = { km: 'km', mins: 'min', pts: 'pts' };

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
  const displayName = getUserById(workout.oderId)?.name || workout.userName || workout.oderId;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="animate-story-in relative flex h-dvh w-full max-w-sm flex-col overflow-hidden sm:h-auto sm:min-h-[560px] sm:rounded-[28px] sm:shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background */}
        {hasProofImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={workout.proofUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#26302b] via-[#161c1a] to-[#0d1110]" />
            <div className="absolute inset-0 bg-grain opacity-[0.04]" />
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-coral/20 blur-3xl" />
          </>
        )}

        {/* Story progress bar */}
        <div className="relative z-10 flex gap-1 p-3">
          <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
            <span className="block h-full w-full bg-white/90" />
          </span>
        </div>

        <div className="relative z-10 flex flex-1 flex-col justify-between p-6">
          {/* Top — author */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar name={displayName} size={40} />
              <div>
                <p className="text-sm font-semibold text-white">{displayName}</p>
                <p className="mt-0.5 text-[11px] text-white/50">{timeAgo(workout.createdAt)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
            >
              <Icon name="close" size={18} />
            </button>
          </div>

          {/* Center — dominant stat */}
          <div className="py-8 text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-pill bg-white/12 px-3 py-1.5 backdrop-blur-sm">
              <Icon name={workoutIcon(workout.type)} size={14} className="text-white/80" />
              <span className="text-[11px] font-medium tracking-wide text-white/85">
                {config?.label || workout.type.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display text-[88px] font-bold leading-[0.85] tracking-tightest text-white tabular">
                {formatPrimary(primary.value, primary.unit)}
              </span>
              <span className="text-2xl font-medium text-white/55">{UNIT_LABEL[primary.unit] ?? primary.unit}</span>
            </div>
            {workout.notes && (
              <p className="mx-auto mt-5 max-w-[280px] text-sm leading-relaxed text-white/75">
                &ldquo;{workout.notes}&rdquo;
              </p>
            )}
          </div>

          {/* Bottom — actions */}
          <div className="flex items-center justify-between rounded-2xl bg-black/30 px-4 py-3 backdrop-blur-sm">
            <RespectButton
              count={respectCount}
              active={hasReacted}
              disabled={!currentUserId || workout.oderId === currentUserId}
              onToggle={onToggleRespect}
              className="[&_span]:text-white/70 [&_.material-symbols-outlined]:text-white"
            />
            <span className="text-[11px] font-semibold tabular text-white/50">
              +{formatPreciseNumber(points)} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
