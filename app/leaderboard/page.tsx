'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPreciseNumber, getWorkoutWeightedScore, TEAMS } from '@/lib/data';
import { User, Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { getAllProfiles, profileToUser } from '@/lib/userProfile';
import { getStreak, getWeeklySummary } from '@/lib/stats';
import LeaderboardCard from '../components/LeaderboardCard';
import FilterTabs, { FilterTab } from '../components/FilterTabs';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

type View = 'overall' | 'teams' | 'weekly' | 'respect' | 'consistent';

const TABS: FilterTab[] = [
  { key: 'overall', label: 'Overall' },
  { key: 'teams', label: 'Teams' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'respect', label: 'Most Respected' },
  { key: 'consistent', label: 'Streaks' },
];

export default function LeaderboardPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [rowerUsers, setRowerUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [view, setView] = useState<View>('overall');

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m, profiles] = await Promise.all([
          fetchWorkouts(),
          fetchMultipliers(),
          getAllProfiles(),
        ]);
        setWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
        setRowerUsers(profiles.map(profileToUser));
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
    return rowerUsers.map((user) => {
      const uw = byUser.get(user.id) ?? [];
      const points = uw.reduce((s, w) => s + getWorkoutWeightedScore(w, configs), 0);
      const week = getWeeklySummary(uw, configs).points;
      const kudos = uw.reduce((s, w) => s + (w.reactions?.length ?? 0), 0);
      const streak = getStreak(uw);
      return { user, points, week, kudos, streak };
    });
  }, [rowerUsers, byUser, configs]);

  // Team standings — total points of everyone in the group (not per-member
  // average), so a group's combined work is what puts it on top.
  const teamRows = useMemo(() => {
    return TEAMS.map((team) => {
      const members = rows.filter((r) => r.user.teamId === team.id);
      return {
        team,
        points: members.reduce((s, r) => s + r.points, 0),
        memberCount: members.length,
      };
    })
      .filter((t) => t.memberCount > 0)
      .sort((a, b) => b.points - a.points);
  }, [rows]);

  const teamMax = teamRows[0]?.points || 1;

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

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="pb-4 pt-6 sm:pt-8">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Board
        </h1>
        <p className="mt-1 text-[13px] text-charcoal-muted">The work shows up here.</p>
      </div>

      <FilterTabs tabs={TABS} active={view} onChange={(k) => setView(k as View)} className="mb-5" />

      {loading ? (
        <LoadingState count={5} variant="list" />
      ) : signedOut ? (
        <EmptyState icon="lock" title="Sign in to see the board" actionLabel="Log in" actionHref="/login" />
      ) : view === 'teams' ? (
        teamRows.length === 0 ? (
          <EmptyState icon="groups" title="No groups yet." message="Rowers join their group when they sign in." />
        ) : (
          <div className="space-y-2.5">
            {teamRows.map((t, i) => (
              <LeaderboardCard
                key={t.team.id}
                rank={i + 1}
                title={t.team.name}
                subtitle={`${t.memberCount} rower${t.memberCount === 1 ? '' : 's'} signed up`}
                value={formatPreciseNumber(t.points)}
                unit="pts"
                percentage={(t.points / teamMax) * 100}
                color={t.team.color}
                highlight={i === 0}
              />
            ))}
          </div>
        )
      ) : ranked.length === 0 ? (
        <EmptyState
          icon="leaderboard"
          title="Nothing here yet."
          message={view === 'overall' ? 'Log the work to get on the board.' : undefined}
          actionLabel={view === 'overall' ? 'Log a workout' : undefined}
          actionHref={view === 'overall' ? '/log' : undefined}
        />
      ) : (
        <div className="space-y-2.5">
          {ranked.map((r, i) => {
            const m = metricFor(r);
            return (
              <LeaderboardCard
                key={r.user.id}
                rank={i + 1}
                title={r.user.name}
                href={`/rowers/${r.user.id}`}
                value={m.value}
                unit={m.unit}
                percentage={m.pct}
                avatarName={r.user.name}
                avatarUrl={r.user.avatarUrl}
                highlight={i === 0}
                badge={
                  i === 0 && view === 'weekly' ? (
                    <span className="rounded-md bg-coral-soft px-1.5 py-0.5 text-[9px] font-semibold text-coral">
                      Top this week
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
