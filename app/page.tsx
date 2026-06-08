'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  ALL_USERS,
  formatPreciseNumber,
  getDaysRemaining,
  getWorkoutWeightedScore,
} from '@/lib/data';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { User, Workout, WorkoutComment, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import {
  addWorkoutComment,
  addWorkoutReaction,
  fetchMultipliers,
  fetchWorkouts,
  removeWorkoutComment,
  removeWorkoutReaction,
} from '@/lib/supabaseData';
import { getWeeklySummary } from '@/lib/stats';
import FeedList from './components/FeedList';
import WeeklySummaryCard from './components/WeeklySummaryCard';
import TrainingStories from './components/TrainingStories';
import TrainingStoryModal from './components/TrainingStoryModal';
import LoadingState from './components/LoadingState';
import LoggedOutFeed from './components/LoggedOutFeed';
import Avatar from './components/Avatar';
import Icon from './components/Icon';

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

  const updateComments = (id: string, updater: (c: WorkoutComment[]) => WorkoutComment[]) => {
    setWorkouts((prev) =>
      prev.map((w) => (w.id === id ? { ...w, comments: updater(w.comments ?? []) } : w))
    );
  };

  const addComment = async (workout: Workout, body: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const comment = await addWorkoutComment({
        workoutId: workout.id,
        userId: currentUser.id,
        userName: currentUser.name,
        body,
      });
      updateComments(workout.id, (c) => [...c, comment]);
      return true;
    } catch {
      return false;
    }
  };

  const deleteComment = async (workout: Workout, commentId: string) => {
    const previous = workout.comments ?? [];
    updateComments(workout.id, (c) => c.filter((x) => x.id !== commentId));
    try {
      await removeWorkoutComment({ commentId });
    } catch {
      updateComments(workout.id, () => previous);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addStoryComment = useCallback(
    (body: string) => (storyWorkout ? addComment(storyWorkout, body) : Promise.resolve(false)),
    [storyWorkout, currentUser]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const deleteStoryComment = useCallback(
    (commentId: string) => {
      if (storyWorkout) void deleteComment(storyWorkout, commentId);
    },
    [storyWorkout, currentUser]
  );

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

  // For the story modal — find the current version of storyWorkout in workouts
  const activeStory = storyWorkout
    ? workouts.find((w) => w.id === storyWorkout.id) ?? storyWorkout
    : null;

  const daysLeft = getDaysRemaining();

  // Signed-out visitors get a cinematic product preview, not a dead empty state.
  if (signedOut && !loading) {
    return <LoggedOutFeed configs={configs} />;
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Header — editorial and quiet */}
        <div className="pb-2 pt-6 sm:pt-8">
          <h1 className="font-display text-2xl font-semibold tracking-editorial text-charcoal sm:text-[28px]">
            Latest from the squad
          </h1>
          <p className="mt-1 text-[13px] text-charcoal-muted">
            {daysLeft > 0 ? `${daysLeft} days of summer left.` : 'Summer miles, done.'}
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Main feed column */}
          <div className="mx-auto w-full max-w-feed flex-1">
            {/* Training Stories */}
            {!loading && workouts.length > 0 && (
              <div className="mb-6">
                <TrainingStories
                  workouts={workouts}
                  configs={configs}
                  onTap={(w) => setStoryWorkout(w)}
                />
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
                onAddComment={addComment}
                onDeleteComment={deleteComment}
              />
            )}
          </div>

          {/* Right rail — desktop only */}
          <aside className="hidden w-72 shrink-0 space-y-5 lg:block">
            {myWeek && <WeeklySummaryCard summary={myWeek} />}

            {/* Top rowers */}
            <div className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label-caps text-charcoal-muted">Top rowers</p>
                <Link href="/leaderboard" className="text-[11px] font-medium text-coral hover:underline">
                  All
                </Link>
              </div>
              <div className="mt-4 space-y-3">
                {topRowers.map(({ user, total }, i) => (
                  <Link key={user.id} href={`/rowers/${user.id}`} className="focus-ring flex items-center gap-2.5 rounded-lg">
                    <span className={`w-4 text-[12px] font-bold tabular ${i === 0 ? 'text-coral' : 'text-charcoal-light'}`}>{i + 1}</span>
                    <Avatar name={user.name} size={28} />
                    <span className="flex-1 truncate text-[12.5px] font-medium text-charcoal">{user.name}</span>
                    <span className="text-[12.5px] font-semibold tabular text-charcoal-soft">{formatPreciseNumber(total)}</span>
                  </Link>
                ))}
                {topRowers.length === 0 && <p className="text-[12px] text-charcoal-muted">No scores yet.</p>}
              </div>
            </div>

            {/* Locker highlight */}
            <Link href="/locker-room" className="panel-cinematic focus-ring group block p-5">
              <div className="relative">
                <p className="label-caps text-charcoal-muted">Locker Room</p>
                <p className="mt-2 font-display text-[15px] font-semibold tracking-editorial text-charcoal">For when you need a push.</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-coral">
                  Open the wall <Icon name="arrow_forward" size={14} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>

            {/* Squad total */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <p className="label-caps text-charcoal-muted">All rowers, all summer</p>
              <p className="mt-2 font-display text-3xl font-bold tracking-tightest tabular text-charcoal">{formatPreciseNumber(totalPoints)}</p>
              <p className="mt-0.5 text-[12px] text-charcoal-muted">{workouts.length} workouts logged</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Story modal */}
      {activeStory && (
        <TrainingStoryModal
          workout={activeStory}
          configs={configs}
          currentUser={currentUser}
          hasReacted={(activeStory.reactions ?? []).some((r) => r.userId === currentUser?.id)}
          respectCount={(activeStory.reactions ?? []).length}
          onToggleRespect={toggleStoryRespect}
          onAddComment={addStoryComment}
          onDeleteComment={deleteStoryComment}
          onClose={() => setStoryWorkout(null)}
        />
      )}
    </>
  );
}
