'use client';

import { useEffect, useMemo, useState } from 'react';
import { ALL_USERS, TEAMS, formatPreciseNumber, getTeamById } from '@/lib/data';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { getWorkoutWeightedScore } from '@/lib/data';
import { getStreak, getWeeklySummary } from '@/lib/stats';
import LeaderboardCard from '../components/LeaderboardCard';
import FilterTabs, { FilterTab } from '../components/FilterTabs';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

type View = 'teams' | 'individuals' | 'weekly' | 'respect' | 'consistent';

const TABS: FilterTab[] = [
  { key: 'teams', label: 'Teams' },
  { key: 'individuals', label: 'Individuals' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'respect', label: 'Respect' },
  { key: 'consistent', label: 'Consistent' },
];

export default function LeaderboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [teamMultipliers, setTeamMultipliers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [view, setView] = useState<View>('teams');

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
        setTeamMultipliers(m.teamMultipliers);
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

  const teamRows = useMemo(() => {
    return TEAMS.map((team) => {
      const tw = workouts.filter((w) => team.members.some((m) => m.id === w.oderId));
      const raw = tw.reduce((s, w) => s + getWorkoutWeightedScore(w, configs), 0);
      const mult = teamMultipliers[team.id] ?? team.scoreMultiplier;
      return { team, total: raw * mult, raw, workouts: tw.length, mult };
    }).sort((a, b) => b.total - a.total);
  }, [workouts, configs, teamMultipliers]);

  const individualRows = useMemo(() => {
    return ALL_USERS.map((user) => {
      const uw = byUser.get(user.id) ?? [];
      const points = uw.reduce((s, w) => s + getWorkoutWeightedScore(w, configs), 0);
      const week = getWeeklySummary(uw, configs).points;
      const kudos = uw.reduce((s, w) => s + (w.reactions?.length ?? 0), 0);
      const streak = getStreak(uw);
      return { user, points, week, kudos, streak, workouts: uw.length };
    });
  }, [byUser, configs]);

  const ranked = useMemo(() => {
    if (view === 'weekly') return [...individualRows].filter((r) => r.week > 0).sort((a, b) => b.week - a.week);
    if (view === 'respect') return [...individualRows].filter((r) => r.kudos > 0).sort((a, b) => b.kudos - a.kudos);
    if (view === 'consistent') return [...individualRows].filter((r) => r.streak > 0).sort((a, b) => b.streak - a.streak);
    return [...individualRows].sort((a, b) => b.points - a.points);
  }, [individualRows, view]);

  const maxTeam = teamRows[0]?.total || 1;
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

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="pb-5 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-soft">Who&apos;s putting in the work.</p>
      </div>

      <FilterTabs
        tabs={TABS}
        active={view}
        onChange={(k) => setView(k as View)}
        className="mb-6"
      />

      {loading ? (
        <LoadingState count={5} variant="list" />
      ) : signedOut ? (
        <EmptyState icon="lock" title="Sign in to view the leaderboard" actionLabel="Log in" actionHref="/login" />
      ) : view === 'teams' ? (
        teamRows.every((t) => t.total === 0) ? (
          <EmptyState icon="trophy" title="No scores yet." message="Log the work to put your team on the board." actionLabel="Log a workout" actionHref="/log" />
        ) : (
          <div className="space-y-3">
            {teamRows.map((row, i) => (
              <LeaderboardCard
                key={row.team.id}
                rank={i + 1}
                title={row.team.name}
                subtitle={`${formatPreciseNumber(row.raw)} km · ${row.workouts} workouts · ${row.team.members.length} members`}
                value={formatPreciseNumber(row.total)}
                unit="pts"
                percentage={(row.total / maxTeam) * 100}
                color={row.team.color}
                highlight={i === 0}
                badge={
                  row.mult > 1 ? (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                      {row.mult.toFixed(2)}×
                    </span>
                  ) : undefined
                }
              />
            ))}
          </div>
        )
      ) : ranked.length === 0 ? (
        <EmptyState
          icon="leaderboard"
          title="Nothing here yet."
          message={
            view === 'weekly'
              ? 'No workouts in the last 7 days.'
              : view === 'respect'
                ? 'No respect handed out yet.'
                : 'No active streaks yet.'
          }
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
