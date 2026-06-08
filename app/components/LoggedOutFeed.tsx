'use client';

import Link from 'next/link';
import { Workout, WorkoutType, WorkoutTypeConfig } from '@/lib/types';
import { getUserById, getWorkoutLabel, getWorkoutPrimaryValue } from '@/lib/data';
import { formatPrimary, workoutIcon } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

const UNIT_LABEL: Record<string, string> = { km: 'km', mins: 'min', pts: 'pts' };

// Preview data — real rower names, plausible work, used only to make the
// signed-out page feel alive. Never persisted, never editable.
const SAMPLE: Array<Pick<Workout, 'id' | 'oderId' | 'type' | 'minutes' | 'distance' | 'notes' | 'createdAt'>> = [
  { id: 's1', oderId: 'scalfi', type: 'rowing_no_pieces', minutes: 92, distance: 18.4, notes: 'Long steady before the heat. Kept it honest.', createdAt: new Date().toISOString() },
  { id: 's2', oderId: 'freijo', type: 'cross_run', minutes: 58, distance: 12.1, notes: 'Trail loop. Legs are cooked.', createdAt: new Date().toISOString() },
  { id: 's3', oderId: 'berwick', type: 'rowing_with_pieces', minutes: 74, distance: 15.2, notes: '6 x 1k. Negative split the last three.', createdAt: new Date().toISOString() },
  { id: 's4', oderId: 'corbett', type: 'lifting_plan', minutes: 65, createdAt: new Date().toISOString() },
  { id: 's5', oderId: 'harvey', type: 'rowing_no_pieces', minutes: 80, distance: 16.6, createdAt: new Date().toISOString() },
  { id: 's6', oderId: 'george', type: 'cross_bike_outdoor', minutes: 95, createdAt: new Date().toISOString() },
  { id: 's7', oderId: 'salvi', type: 'cross_swim', minutes: 50, createdAt: new Date().toISOString() },
  { id: 's8', oderId: 'donovan-davis', type: 'rowing_with_pieces', minutes: 70, distance: 14.8, createdAt: new Date().toISOString() },
  { id: 's9', oderId: 'lorgen', type: 'cross_run', minutes: 45, distance: 9.2, createdAt: new Date().toISOString() },
];

const PREVIEW_BADGE: Record<string, string> = {
  s1: 'Long steady',
  s2: 'Back at it.',
  s3: 'Big session',
};

function LockedCard({ workout, configs }: { workout: (typeof SAMPLE)[number]; configs: Record<WorkoutType, WorkoutTypeConfig> }) {
  const w = workout as unknown as Workout;
  const name = getUserById(workout.oderId)?.name ?? workout.oderId;
  const primary = getWorkoutPrimaryValue(w, configs);
  return (
    <article className="card relative overflow-hidden">
      <div className="select-none p-5" aria-hidden>
        <div className="flex items-center gap-3">
          <Avatar name={name} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold tracking-editorial text-charcoal">{name}</p>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-charcoal-muted">
              <Icon name={workoutIcon(workout.type)} size={13} />
              {getWorkoutLabel(w, configs)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <span className="font-display text-[52px] font-bold leading-[0.9] tracking-tightest text-charcoal tabular">
            {formatPrimary(primary.value, primary.unit)}
          </span>
          <span className="pb-1 text-base font-medium text-charcoal-muted">{UNIT_LABEL[primary.unit] ?? primary.unit}</span>
        </div>
        {PREVIEW_BADGE[workout.id] && (
          <div className="mt-3">
            <span className="rounded-pill bg-olive-bg px-2.5 py-1 text-[10px] font-semibold tracking-wide text-olive-soft">
              {PREVIEW_BADGE[workout.id]}
            </span>
          </div>
        )}
        {workout.notes && (
          <p className="mt-3 text-[13.5px] leading-relaxed text-charcoal-soft blur-[3px]">{workout.notes}</p>
        )}
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.06] pt-3.5">
          <Icon name="favorite" size={18} className="text-charcoal-light blur-[2px]" />
          <span className="text-[11px] text-charcoal-muted blur-[2px]">Respect</span>
        </div>
      </div>
    </article>
  );
}

export default function LoggedOutFeed({ configs }: { configs: Record<WorkoutType, WorkoutTypeConfig> }) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 pt-6 sm:pt-8 lg:flex-row lg:items-start">
        {/* Main column */}
        <div className="mx-auto w-full max-w-feed flex-1">
          {/* Cinematic hero */}
          <section className="panel-cinematic p-7 sm:p-9">
            <div className="absolute inset-0 bg-grain opacity-[0.05]" />
            <div className="relative">
              <span className="label-caps inline-flex items-center gap-1.5 rounded-pill border border-white/10 bg-white/[0.04] px-2.5 py-1 text-charcoal-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-coral" /> Stanford Rowing
              </span>
              <h1 className="mt-5 font-display text-[34px] font-bold leading-[1.02] tracking-tightest text-charcoal sm:text-[42px]">
                Summer work,<br />kept honest.
              </h1>
              <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-charcoal-soft">
                Log sessions, respect the work, and keep up with the squad.
              </p>
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href="/login"
                  className="focus-ring rounded-pill bg-coral px-6 py-3 text-[14px] font-semibold text-white shadow-glow transition-colors hover:bg-coral-dark active:scale-95"
                >
                  Log in
                </Link>
                <span className="text-[12px] font-medium text-charcoal-muted">Built for the team.</span>
              </div>
            </div>
          </section>

          {/* Locked sample cards */}
          <div className="mt-6 space-y-5">
            <p className="px-1 label-caps text-charcoal-muted">A taste of the feed</p>
            {SAMPLE.slice(0, 3).map((w) => (
              <LockedCard key={w.id} workout={w} configs={configs} />
            ))}
          </div>

          {/* Closing nudge */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4">
            <p className="text-[13px] text-charcoal-soft">See the whole squad&rsquo;s work.</p>
            <Link href="/login" className="text-[13px] font-semibold text-coral hover:underline">
              Log in →
            </Link>
          </div>
        </div>

        {/* Right rail — premium dark preview */}
        <aside className="hidden w-72 shrink-0 space-y-5 lg:block">
          <div className="card p-5">
            <p className="label-caps text-charcoal-muted">This week</p>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tracking-tightest text-charcoal/40 blur-[5px] tabular">412</span>
              <span className="text-[12px] text-charcoal-muted">pts</span>
            </div>
            <p className="mt-1 text-[12px] text-charcoal-muted blur-[3px]">28 sessions · 318 km</p>
            <div className="mt-4 flex h-16 items-end justify-between gap-1.5 opacity-50 blur-[2px]">
              {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-10 w-full items-end justify-center">
                    <div className={`w-full rounded-[3px] ${i === 6 ? 'bg-coral' : 'bg-white/[0.12]'}`} style={{ height: `${h}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-[11px] text-charcoal-muted">
              <Icon name="lock" size={14} /> Sign in to track your week
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
            <p className="label-caps text-charcoal-muted">The squad</p>
            <p className="mt-2 text-[13px] leading-relaxed text-charcoal-soft">
              Every erg, every row, every lift — kept in one place. No noise, just the work.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
