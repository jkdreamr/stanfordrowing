'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ALL_USERS,
  formatPreciseNumber,
  getDaysRemaining,
  getUserByEmail,
  getWorkoutWeightedScore,
} from '@/lib/data';
import Avatar from './components/Avatar';
import { User, Workout, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { addWorkoutReaction, fetchMultipliers, fetchWorkouts, removeWorkoutReaction } from '@/lib/supabaseData';
import { getWeeklySummary } from '@/lib/stats';
import FeedList from './components/FeedList';
import WeeklySummaryCard from './components/WeeklySummaryCard';
import LoadingState from './components/LoadingState';
import Icon from './components/Icon';

export default function FeedPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [workoutsData, multiplierData] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setWorkouts(
          [...workoutsData].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        );
        setConfigs(multiplierData.workoutTypeConfigs);
      } catch {
        setSignedOut(true);
      } finally {
        setLoading(false);
      }
    };
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user.email ?? null);
    };
    load();
    loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setCurrentUser(sessionEmail ? getUserByEmail(sessionEmail) : null);
  }, [sessionEmail]);

  const updateReactions = (id: string, updater: (r: WorkoutReaction[]) => WorkoutReaction[]) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, reactions: updater(w.reactions ?? []) } : w))
    );
  };

  const toggleRespect = async (workout: Workout) => {
    if (!currentUser || workout.oderId === currentUser.id) return;
    const hasReacted = (workout.reactions ?? []).some((r) => r.userId === currentUser.id);
    try {
      if (hasReacted) {
        updateReactions(workout.id, (r) => r.filter((x) => x.userId !== currentUser.id));
        await removeWorkoutReaction({ workoutId: workout.id, userId: currentUser.id });
      } else {
        updateReactions(workout.id, (r) => [...r, { userId: currentUser.id, createdAt: new Date().toISOString() }]);
        await addWorkoutReaction({ workoutId: workout.id, userId: currentUser.id });
      }
    } catch {
      // revert on failure
      updateReactions(workout.id, (r) =>
        hasReacted
          ? [...r, { userId: currentUser.id, createdAt: new Date().toISOString() }]
          : r.filter((x) => x.userId !== currentUser.id)
      );
    }
  };

  // ---- derived rail data ----
  const totalPoints = useMemo(
    () => workouts.reduce((sum, w) => sum + getWorkoutWeightedScore(w, configs), 0),
    [workouts, configs]
  );

  const topRowers = useMemo(() => {
    const byUser = new Map<string, number>();
    for (const w of workouts) {
      byUser.set(w.oderId, (byUser.get(w.oderId) ?? 0) + getWorkoutWeightedScore(w, configs));
    }
    return ALL_USERS.map((u) => ({ user: u, total: byUser.get(u.id) ?? 0 }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [workouts, configs]);

  const myWeek = useMemo(() => {
    if (!currentUser) return null;
    return getWeeklySummary(
      workouts.filter((w) => w.oderId === currentUser.id),
      configs
    );
  }, [workouts, currentUser, configs]);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3 pb-6 pt-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Latest from the squad
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Summer miles count. Keep them coming.</p>
        </div>
        <span className="label-caps inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-ink-soft">
          <span className="h-2 w-2 rounded-full bg-coral" />
          {getDaysRemaining()} days left
        </span>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Feed column */}
        <div className="mx-auto w-full max-w-feed flex-1">
          {signedOut && !loading && (
            <div className="card mb-4 rounded-2xl p-5 text-sm text-ink-soft">
              Sign in to see the latest workouts.{' '}
              <Link href="/login" className="font-semibold text-cardinal hover:underline">
                Log in
              </Link>
            </div>
          )}
          {loading ? (
            <LoadingState count={3} />
          ) : (
            <FeedList
              workouts={workouts}
              configs={configs}
              currentUser={currentUser}
              onToggleRespect={toggleRespect}
            />
          )}
        </div>

        {/* Right rail (desktop) */}
        <aside className="hidden w-80 shrink-0 space-y-4 lg:block">
          {myWeek && <WeeklySummaryCard summary={myWeek} />}

          <div className="card rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="label-caps text-ink">Top rowers</h3>
              <Link href="/leaderboard" className="label-caps text-cardinal hover:underline">
                All
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {topRowers.map(({ user, total }, i) => (
                <Link key={user.id} href={`/rowers/${user.id}`} className="flex items-center gap-3">
                  <span className="w-4 text-sm font-bold tabular text-ink-muted">{i + 1}</span>
                  <Avatar name={user.name} size={28} />
                  <span className="flex-1 truncate text-sm font-medium text-ink">{user.name}</span>
                  <span className="text-sm font-bold tabular text-ink">{formatPreciseNumber(total)}</span>
                </Link>
              ))}
              {topRowers.length === 0 && <p className="text-sm text-ink-muted">No scores yet. Be the first.</p>}
            </div>
          </div>

          <div className="card rounded-2xl p-5">
            <p className="label-caps text-ink-muted">All rowers · all summer</p>
            <p className="mt-1 text-3xl font-bold tabular text-ink">{formatPreciseNumber(totalPoints)}</p>
            <p className="mt-0.5 text-sm text-ink-soft">{workouts.length} workouts logged</p>
          </div>

          <Link
            href="/locker-room"
            className="card group flex items-center gap-3 rounded-2xl bg-ink-900 p-5 text-white transition-transform hover:-translate-y-0.5"
          >
            <Icon name="bolt" size={28} className="text-coral" fill />
            <div>
              <p className="font-semibold">Locker Room</p>
              <p className="text-sm text-white/60">For when you need a push.</p>
            </div>
            <Icon name="chevron_right" size={20} className="ml-auto text-white/40" />
          </Link>
        </aside>
      </div>
    </div>
  );
}
