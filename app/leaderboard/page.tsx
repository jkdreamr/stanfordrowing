'use client';

import { useEffect, useMemo, useState } from 'react';
import { ALL_USERS, formatPreciseNumber, getTeamById, getWorkoutWeightedScore } from '@/lib/data';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { getStreak, getWeeklySummary } from '@/lib/stats';
import LeaderboardCard from '../components/LeaderboardCard';
import FilterTabs, { FilterTab } from '../components/FilterTabs';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

type View = 'overall' | 'weekly' | 'respect' | 'consistent';

const TABS: FilterTab[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'respect', label: 'Respect' },
  { key: 'consistent', label: 'Consistent' },
];

// Team leaderboard intentionally omitted for the fresh start — teams come later.

export default function LeaderboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [view, setView] = useState<View>('overall');

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
      } catch {
        setSignedOut(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const byUser = useMemo(() => {
    const map = new Map<string, Workout[]>();
    for (const w of workouts) {
      const list = map.get(w.oderId) ?? [];
      list.push(w);
      map.set(w.oderId, list);
    }
    return map;
  }, [workouts]);

  const rows = useMemo(() => {
    return ALL_USERS.map((user) => {
      const uw = byUser.get(user.id) ?? [];
      const points = uw.reduce((s, w) => s + getWorkoutWeightedScore(w, configs), 0);
      const week = getWeeklySummary(uw, configs).points;
      const kudos = uw.reduce((s, w) => s + (w.reactions?.length ?? 0), 0);
      const streak = getStreak(uw);
      return { user, points, week, kudos, streak };
    });
  }, [byUser, configs]);

  const ranked = useMemo(() => {
    if (view === 'weekly') return [...rows].filter((r) => r.week > 0).sort((a, b) => b.week - a.week);
    if (view === 'respect') return [...rows].filter((r) => r.kudos > 0).sort((a, b) => b.kudos - a.kudos);
    if (view === 'consistent') return [...rows].filter((r) => r.streak > 0).sort((a, b) => b.streak - a.streak);
    return [...rows].filter((r) => r.points > 0).sort((a, b) => b.points - a.points);
  }, [rows, view]);

  const metricMax =
    view === 'weekly'
      ? ranked[0]?.week || 1
      : view === 'respect'
        ? ranked[0]?.kudos || 1
        : view === 'consistent'
          ? ranked[0]?.streak || 1
          : ranked[0]?.points || 1;

  function metricFor(r: (typeof ranked)[number]): { value: string; unit?: string; pct: number } {
    if (view === 'weekly') return { value: formatPreciseNumber(r.week), unit: 'pts', pct: (r.week / metricMax) * 100 };
    if (view === 'respect') return { value: String(r.kudos), unit: 'respect', pct: (r.kudos / metricMax) * 100 };
    if (view === 'consistent') return { value: String(r.streak), unit: 'days', pct: (r.streak / metricMax) * 100 };
    return { value: formatPreciseNumber(r.points), unit: 'pts', pct: (r.points / metricMax) * 100 };
  }

  const emptyMessage =
    view === 'weekly'
      ? 'No workouts in the last 7 days.'
      : view === 'respect'
        ? 'No respect handed out yet.'
        : view === 'consistent'
          ? 'No active streaks yet.'
          : 'No scores yet. Log the work to get on the board.';

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="pb-5 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Who&apos;s putting in the work. Teams join later.</p>
      </div>

      <FilterTabs tabs={TABS} active={view} onChange={(k) => setView(k as View)} className="mb-6" />

      {loading ? (
        <LoadingState count={5} variant="list" />
      ) : signedOut ? (
        <EmptyState icon="lock" title="Sign in to view the leaderboard" actionLabel="Log in" actionHref="/login" />
      ) : ranked.length === 0 ? (
        <EmptyState
          icon="leaderboard"
          title="Nothing here yet."
          message={emptyMessage}
          actionLabel={view === 'overall' ? 'Log a workout' : undefined}
          actionHref={view === 'overall' ? '/log' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {ranked.map((r, i) => {
            const team = getTeamById(r.user.teamId);
            const m = metricFor(r);
            return (
              <LeaderboardCard
                key={r.user.id}
                rank={i + 1}
                title={r.user.name}
                subtitle={team?.name}
                href={`/rowers/${r.user.id}`}
                value={m.value}
                unit={m.unit}
                percentage={m.pct}
                color={team?.color ?? '#b51c00'}
                avatarName={r.user.name}
                highlight={i === 0}
                badge={
                  i === 0 && view === 'weekly' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cardinal/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-cardinal">
                      <Icon name="trophy" size={12} fill /> King of the week
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
