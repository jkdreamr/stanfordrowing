'use client';

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
      <div className="pb-4 pt-6 sm:pt-8">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Rowers
        </h1>
        <p className="mt-1 text-[13px] text-charcoal-muted">The roster. Every name, every session.</p>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-light" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 py-2 pl-9 pr-4 text-[13px] text-charcoal placeholder:text-charcoal-light"
        />
      </div>

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
        <EmptyState icon="search_off" title="No match." message="Try a different name." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rowers.map(({ user, aggregate, spark, latestWorkout }) => (
            <RowerCard key={user.id} user={user} aggregate={aggregate} sparkValues={spark} latestWorkout={latestWorkout} />
          ))}
        </div>
      )}
    </div>
  );
}
