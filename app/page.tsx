'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  formatPreciseNumber,
  getDaysRemaining,
  getWorkoutLabel,
  getWorkoutPrimaryValue,
  getWorkoutWeightedScore,
} from '@/lib/data';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { User, Workout, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { addWorkoutReaction, fetchMultipliers, fetchWorkouts, removeWorkoutReaction } from '@/lib/supabaseData';
import { formatPrimary, getWeeklySummary, timeAgo } from '@/lib/stats';
import HeroVideoSection from './components/HeroVideoSection';
import FeedList from './components/FeedList';
import WeeklySummaryCard from './components/WeeklySummaryCard';
import TrainingStories from './components/TrainingStories';
import TrainingStoryModal from './components/TrainingStoryModal';
import LoadingState from './components/LoadingState';
import Avatar from './components/Avatar';

export default function FeedPage() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [storyWorkout, setStoryWorkout] = useState<Workout | null>(null);

  const loadUser = async (authId: string | undefined) => {
    if (!authId) { setCurrentUser(null); return; }
    const p = await getProfileByAuthId(authId);
    setCurrentUser(p ? profileToUser(p) : null);
  };

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
    load();
    supabase.auth.getSession().then(({ data }) => loadUser(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadUser(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
      updateReactions(workout.id, (r) =>
        hasReacted
          ? [...r, { userId: currentUser.id, createdAt: new Date().toISOString() }]
          : r.filter((x) => x.userId !== currentUser.id)
      );
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const toggleStoryRespect = useCallback(() => {
    if (storyWorkout) toggleRespect(storyWorkout);
  }, [storyWorkout, currentUser]);

  const totalPoints = useMemo(
    () => workouts.reduce((sum, w) => sum + getWorkoutWeightedScore(w, configs), 0),
    [workouts, configs]
  );

  // Derive top rowers straight from workouts (names come from the workout rows,
  // so this works regardless of how rowers map to auth profiles).
  const topRowers = useMemo(() => {
    const map = new Map<string, { name: string; total: number }>();
    for (const w of workouts) {
      const cur = map.get(w.oderId) ?? { name: w.userName ?? 'Rower', total: 0 };
      cur.total += getWorkoutWeightedScore(w, configs);
      if (w.userName) cur.name = w.userName;
      map.set(w.oderId, cur);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v }))
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [workouts, configs]);

  const myWeek = useMemo(() => {
    if (!currentUser) return null;
    return getWeeklySummary(workouts.filter((w) => w.oderId === currentUser.id), configs);
  }, [workouts, currentUser, configs]);

  const squadWeek = useMemo(() => getWeeklySummary(workouts, configs), [workouts, configs]);

  const heroRecent = useMemo(() => {
    const w = workouts[0];
    if (!w) return null;
    const primary = getWorkoutPrimaryValue(w, configs);
    return {
      name: w.userName ?? 'The squad',
      type: getWorkoutLabel(w, configs),
      stat: `${formatPrimary(primary.value, primary.unit)} ${primary.unit}`,
      meta: timeAgo(w.createdAt) || 'Latest',
      respect: (w.reactions ?? []).length,
    };
  }, [workouts, configs]);

  const activeStory = storyWorkout
    ? workouts.find((w) => w.id === storyWorkout.id) ?? storyWorkout
    : null;

  const daysLeft = getDaysRemaining();

  return (
    <>
      <HeroVideoSection
        recent={heroRecent}
        squadValue={formatPreciseNumber(squadWeek.points)}
        squadWorkouts={squadWeek.workouts}
        topRowerName={topRowers[0]?.name}
      />

      <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="pb-2">
          <h2 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
            Latest from the squad
          </h2>
          <p className="mt-1 text-[13px] text-charcoal-muted">
            {daysLeft > 0 ? `${daysLeft} days of summer left.` : 'Summer miles, done.'}
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Main feed column */}
          <div className="mx-auto w-full max-w-feed flex-1">
            {!loading && workouts.length > 0 && (
              <div className="mb-6">
                <TrainingStories workouts={workouts} configs={configs} onTap={(w) => setStoryWorkout(w)} />
              </div>
            )}

            {signedOut && !loading && (
              <div className="card mb-5 p-4 text-[13px] text-charcoal-muted">
                Sign in to see the latest workouts.{' '}
                <Link href="/login" className="font-semibold text-coral hover:underline">
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

          {/* Right rail — desktop only */}
          <aside className="hidden w-72 shrink-0 space-y-5 lg:block">
            {myWeek && <WeeklySummaryCard summary={myWeek} />}

            <div className="card p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Top rowers</p>
                <Link href="/leaderboard" className="text-[11px] font-medium text-coral hover:underline">All</Link>
              </div>
              <div className="mt-3 space-y-2.5">
                {topRowers.map((r, i) => (
                  <Link key={r.id} href={`/rowers/${r.id}`} className="flex items-center gap-2.5">
                    <span className="w-3 text-[11px] font-bold tabular text-charcoal-light">{i + 1}</span>
                    <Avatar name={r.name} size={26} />
                    <span className="flex-1 truncate text-[12px] font-medium text-charcoal">{r.name}</span>
                    <span className="text-[12px] font-semibold tabular text-charcoal-soft">{formatPreciseNumber(r.total)}</span>
                  </Link>
                ))}
                {topRowers.length === 0 && <p className="text-[12px] text-charcoal-muted">No scores yet.</p>}
              </div>
            </div>

            <div className="rounded-xl bg-bone-dark/60 p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-charcoal-muted">All rowers, all summer</p>
              <p className="mt-1 text-2xl font-bold tabular text-charcoal">{formatPreciseNumber(totalPoints)}</p>
              <p className="mt-0.5 text-[12px] text-charcoal-muted">{workouts.length} workouts logged</p>
            </div>

            <Link
              href="/locker-room"
              className="group flex items-center gap-3 rounded-xl bg-night p-4 text-bone transition-transform hover:-translate-y-0.5"
            >
              <span className="font-display text-sm font-semibold">Locker Room</span>
              <span className="ml-auto text-[12px] text-bone/60 group-hover:text-bone/90">For when you need a push →</span>
            </Link>
          </aside>
        </div>
      </div>

      {activeStory && (
        <TrainingStoryModal
          workout={activeStory}
          configs={configs}
          currentUserId={currentUser?.id}
          hasReacted={(activeStory.reactions ?? []).some((r) => r.userId === currentUser?.id)}
          respectCount={(activeStory.reactions ?? []).length}
          onToggleRespect={toggleStoryRespect}
          onClose={() => setStoryWorkout(null)}
        />
      )}
    </>
  );
}
