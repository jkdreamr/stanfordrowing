'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ALL_USERS } from '@/lib/data';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { aggregateRower, last7Counts } from '@/lib/stats';
import RowerCard from '../components/RowerCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';

export default function RowersPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [query, setQuery] = useState('');

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

  const rowers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ALL_USERS.map((user) => {
      const userWorkouts = byUser.get(user.id) ?? [];
      const sorted = [...userWorkouts].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      return {
        user,
        aggregate: aggregateRower(userWorkouts, configs),
        spark: last7Counts(userWorkouts),
        latestWorkout: sorted[0],
      };
    })
      .filter((r) => (q ? r.user.name.toLowerCase().includes(q) : true))
      .sort((a, b) => b.aggregate.totalPoints - a.aggregate.totalPoints);
  }, [byUser, configs, query]);

  return (
    <div className="mx-auto max-w-container px-4 sm:px-6 lg:px-8">
      <div className="pb-6 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Rowers</h1>
        <p className="mt-1 text-sm text-ink-soft">Every name. Every session. Find your people.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Icon name="search" size={20} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the roster…"
          className="focus-ring w-full rounded-full border border-line bg-surface py-2.5 pl-11 pr-4 text-sm text-ink placeholder:text-ink-muted"
        />
      </div>

      <div className="mb-6" />

      {loading ? (
        <LoadingState count={6} variant="list" />
      ) : signedOut ? (
        <EmptyState
          icon="lock"
          title="Sign in to see the roster"
          message="The rower directory is for the team."
          actionLabel="Log in"
          actionHref="/login"
        />
      ) : rowers.length === 0 ? (
        <EmptyState icon="search_off" title="No rowers match that." message="Try a different name or team." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rowers.map(({ user, aggregate, spark, latestWorkout }) => (
            <RowerCard key={user.id} user={user} aggregate={aggregate} sparkValues={spark} latestWorkout={latestWorkout} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center">
        <Link href="/leaderboard" className="text-sm font-semibold text-cardinal hover:underline">
          See the full leaderboard →
        </Link>
      </p>
    </div>
  );
}
