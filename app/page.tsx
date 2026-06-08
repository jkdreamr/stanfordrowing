'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { formatPreciseNumber, getDaysRemaining, getWorkoutWeightedScore } from '@/lib/data';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { Story, User, Workout, WorkoutComment, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import {
  addWorkoutComment,
  addWorkoutReaction,
  fetchMultipliers,
  fetchWorkouts,
  removeWorkoutComment,
  removeWorkoutReaction,
} from '@/lib/supabaseData';
import { createStory, deleteStory, fetchStories, uploadStoryMedia } from '@/lib/stories';
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
  const [stories, setStories] = useState<Story[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [viewerAuthor, setViewerAuthor] = useState<string | null>(null);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [storyError, setStoryError] = useState('');

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
      // Stories load independently — a missing table shouldn't break the feed.
      try {
        setStories(await fetchStories());
      } catch {
        /* no stories backend yet */
      }
    };
    load();
    supabase.auth.getSession().then(({ data }) => loadUser(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadUser(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ---- reactions ----
  const updateReactions = (id: string, updater: (r: WorkoutReaction[]) => WorkoutReaction[]) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, reactions: updater(w.reactions ?? []) } : w)));
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

  // ---- comments ----
  const updateComments = (id: string, updater: (c: WorkoutComment[]) => WorkoutComment[]) => {
    setWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, comments: updater(w.comments ?? []) } : w)));
  };

  const addComment = async (workout: Workout, body: string, parentId?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const comment = await addWorkoutComment({ workoutId: workout.id, userId: currentUser.id, userName: currentUser.name, body, parentId });
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

  // ---- stories ----
  const handleUploadStory = async (file: File) => {
    if (!currentUser) return;
    setStoryError('');
    setUploadingStory(true);
    try {
      const { url, type } = await uploadStoryMedia(file, currentUser.id);
      const story = await createStory({ user: currentUser, mediaUrl: url, mediaType: type });
      setStories((prev) => [story, ...prev]);
    } catch (e) {
      setStoryError((e as Error)?.message || 'Could not post your story.');
    } finally {
      setUploadingStory(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    const author = stories.find((s) => s.id === storyId)?.userId;
    const previous = stories;
    setStories((prev) => prev.filter((s) => s.id !== storyId));
    if (author && previous.filter((s) => s.userId === author && s.id !== storyId).length === 0) {
      setViewerAuthor(null);
    }
    try {
      await deleteStory(storyId);
    } catch {
      setStories(previous);
    }
  };

  // ---- derived ----
  const totalPoints = useMemo(
    () => workouts.reduce((sum, w) => sum + getWorkoutWeightedScore(w, configs), 0),
    [workouts, configs]
  );

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

  const viewerStories = useMemo(
    () => (viewerAuthor ? stories.filter((s) => s.userId === viewerAuthor) : []),
    [viewerAuthor, stories]
  );

  const daysLeft = getDaysRemaining();

  // Signed-out visitors get a cinematic product preview, not a dead empty state.
  if (signedOut && !loading) {
    return <LoggedOutFeed configs={configs} />;
  }

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
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
            {/* Stories */}
            {!loading && (currentUser || stories.length > 0) && (
              <div className="mb-6">
                <TrainingStories
                  stories={stories}
                  currentUser={currentUser}
                  onView={(authorId) => setViewerAuthor(authorId)}
                  onUpload={handleUploadStory}
                  uploading={uploadingStory}
                />
                {storyError && <p className="mt-2 px-1 text-[12px] text-coral">{storyError}</p>}
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
                <Link href="/leaderboard" className="text-[11px] font-medium text-coral hover:underline">All</Link>
              </div>
              <div className="mt-4 space-y-3">
                {topRowers.map((r, i) => (
                  <Link key={r.id} href={`/rowers/${r.id}`} className="focus-ring flex items-center gap-2.5 rounded-lg">
                    <span className={`w-4 text-[12px] font-bold tabular ${i === 0 ? 'text-coral' : 'text-charcoal-light'}`}>{i + 1}</span>
                    <Avatar name={r.name} size={28} />
                    <span className="flex-1 truncate text-[12.5px] font-medium text-charcoal">{r.name}</span>
                    <span className="text-[12.5px] font-semibold tabular text-charcoal-soft">{formatPreciseNumber(r.total)}</span>
                  </Link>
                ))}
                {topRowers.length === 0 && <p className="text-[12px] text-charcoal-muted">No scores yet.</p>}
              </div>
            </div>

            {/* Locker highlight */}
            <Link href="/locker-room" className="panel-cinematic focus-ring group block p-5">
              <div className="relative">
                <p className="label-caps text-charcoal-muted">Locker Room</p>
                <p className="mt-2 font-display text-[15px] font-semibold tracking-editorial text-charcoal">Get some motivation</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-coral">
                  Enter <Icon name="arrow_forward" size={14} className="transition-transform group-hover:translate-x-0.5" />
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

      {/* Story viewer */}
      {viewerStories.length > 0 && (
        <TrainingStoryModal
          stories={viewerStories}
          currentUser={currentUser}
          onDelete={handleDeleteStory}
          onClose={() => setViewerAuthor(null)}
        />
      )}
    </>
  );
}
