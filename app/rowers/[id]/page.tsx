'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getTeamById,
  getWorkoutLabel,
} from '@/lib/data';
import { getAllProfiles, getProfileByAuthId, profileToUser, uploadAvatar } from '@/lib/userProfile';
import { User, Workout, WorkoutComment, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import {
  addWorkoutComment,
  addWorkoutReaction,
  deleteWorkoutRow,
  fetchMultipliers,
  fetchWorkouts,
  removeWorkoutComment,
  removeWorkoutReaction,
  updateWorkoutRow,
} from '@/lib/supabaseData';
import { aggregateRower, getWeeklySummary } from '@/lib/stats';
import RowerProfileHeader from '../../components/RowerProfileHeader';
import WeeklySummaryCard from '../../components/WeeklySummaryCard';
import WorkoutPostCard from '../../components/WorkoutPostCard';
import FilterTabs, { FilterTab } from '../../components/FilterTabs';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';

function categoryOf(type: WorkoutType): string {
  if (type.startsWith('rowing')) return 'row';
  if (type === 'training_session') return 'session';
  if (type.startsWith('lifting')) return 'lift';
  if (type === 'cross_run') return 'run';
  if (type.startsWith('cross_bike')) return 'bike';
  if (type === 'cross_swim') return 'swim';
  return 'other';
}

const CATEGORY_TABS: FilterTab[] = [
  { key: 'all', label: 'All' },
  { key: 'row', label: 'Erg/Row' },
  { key: 'lift', label: 'Lift' },
  { key: 'run', label: 'Run' },
  { key: 'bike', label: 'Bike' },
  { key: 'swim', label: 'Swim' },
  { key: 'other', label: 'Other' },
];

export default function RowerProfilePage() {
  const params = useParams<{ id: string }>();
  const rowerId = params?.id;
  const [loadedProfile, setLoadedProfile] = useState<User | null>(null);

  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Workout | null>(null);
  const [editValues, setEditValues] = useState({ type: 'rowing_no_pieces' as WorkoutType, minutes: '', distance: '', notes: '' });
  const [editError, setEditError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarById, setAvatarById] = useState<Record<string, string>>({});
  const [usersById, setUsersById] = useState<Record<string, { name: string; avatarUrl?: string }>>({});

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setAllWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
        if (rowerId) {
          const rp = await getProfileByAuthId(rowerId);
          if (rp) setLoadedProfile(profileToUser(rp));
        }
      } catch {
        setSignedOut(true);
      } finally {
        setLoading(false);
      }
      // Names + avatars for reaction lists and comments on this profile's posts.
      try {
        const profiles = await getAllProfiles();
        const map: Record<string, string> = {};
        const dir: Record<string, { name: string; avatarUrl?: string }> = {};
        for (const p of profiles) {
          if (p.avatarUrl) map[p.id] = p.avatarUrl;
          dir[p.id] = { name: p.name, avatarUrl: p.avatarUrl ?? undefined };
        }
        setAvatarById(map);
        setUsersById(dir);
      } catch {
        /* no profiles yet */
      }
    };
    const loadSession = async (authId: string | undefined) => {
      if (!authId) { setCurrentUser(null); return; }
      const p = await getProfileByAuthId(authId);
      setCurrentUser(p ? profileToUser(p) : null);
    };
    load();
    supabase.auth.getSession().then(({ data }) => loadSession(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadSession(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const userWorkouts = useMemo(
    () =>
      allWorkouts
        .filter((w) => w.oderId === rowerId)
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [allWorkouts, rowerId]
  );

  // Resolve the rower from their profile; fall back to the name on their workouts.
  const profileUser = useMemo<User | null>(() => {
    if (loadedProfile) return loadedProfile;
    const wn = userWorkouts[0]?.userName;
    if (rowerId && wn) return { id: rowerId, name: wn, teamId: 'unassigned' };
    return null;
  }, [loadedProfile, userWorkouts, rowerId]);

  const aggregate = useMemo(() => aggregateRower(userWorkouts, configs), [userWorkouts, configs]);
  const weekly = useMemo(() => getWeeklySummary(userWorkouts, configs), [userWorkouts, configs]);

  const filtered = useMemo(
    () => (filter === 'all' ? userWorkouts : userWorkouts.filter((w) => categoryOf(w.type) === filter)),
    [userWorkouts, filter]
  );

  const isSelf = currentUser?.id === rowerId;
  const team = profileUser ? getTeamById(profileUser.teamId) : undefined;

  const updateReactions = (id: string, updater: (r: WorkoutReaction[]) => WorkoutReaction[]) => {
    setAllWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, reactions: updater(w.reactions ?? []) } : w)));
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

  const updateComments = (id: string, updater: (c: WorkoutComment[]) => WorkoutComment[]) => {
    setAllWorkouts((prev) => prev.map((w) => (w.id === id ? { ...w, comments: updater(w.comments ?? []) } : w)));
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

  const startEdit = (w: Workout) => {
    setEditing(w);
    setEditValues({
      type: w.type,
      minutes: w.minutes ? String(w.minutes) : '',
      distance: w.distance ? String(w.distance) : '',
      notes: w.notes ?? '',
    });
    setEditError('');
  };

  const saveEdit = async () => {
    if (!editing) return;
    const config = configs[editValues.type] ?? WORKOUT_TYPES[editValues.type];
    const basis = config?.basis ?? 'minutes';
    const minutes = Number(editValues.minutes) || 0;
    const distance = editValues.distance ? Number(editValues.distance) : undefined;
    if (basis === 'minutes' && minutes <= 0) { setEditError('Enter minutes greater than 0.'); return; }
    if (basis === 'distance' && (!distance || distance <= 0)) { setEditError('Enter a distance greater than 0.'); return; }
    setEditError('');
    const updated: Workout = {
      ...editing,
      type: editValues.type,
      minutes: basis === 'minutes' ? minutes : 0,
      distance: distance && distance > 0 ? distance : undefined,
      notes: editValues.notes.trim() || undefined,
    };
    try {
      await updateWorkoutRow(updated);
      setAllWorkouts((prev) => prev.map((w) => (w.id === updated.id ? { ...w, ...updated } : w)));
      setEditing(null);
    } catch {
      setEditError('Could not save. Please try again.');
    }
  };

  const handleDelete = async (w: Workout) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;
    try {
      await deleteWorkoutRow(w.id);
      setAllWorkouts((prev) => prev.filter((x) => x.id !== w.id));
    } catch { /* no-op */ }
  };

  const handleAvatarSelected = async (file: File) => {
    if (!currentUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(file, currentUser.id);
      setLoadedProfile((prev) => (prev ? { ...prev, avatarUrl: url } : { id: currentUser.id, name: currentUser.name, teamId: currentUser.teamId, avatarUrl: url }));
      setCurrentUser((prev) => (prev ? { ...prev, avatarUrl: url } : prev));
    } catch {
      window.alert('Could not update your photo. Please try a different image.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!profileUser) {
    return (
      <div className="mx-auto max-w-feed px-4 py-16 sm:px-6">
        <EmptyState icon="person_off" title="Rower not found" actionLabel="Back to rowers" actionHref="/rowers" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
      <div className="pt-5">
        <Link href="/rowers" className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-charcoal-muted hover:text-charcoal">
          <Icon name="arrow_back" size={14} /> Rowers
        </Link>
      </div>

      <div className="mt-4">
        <RowerProfileHeader
          user={profileUser}
          team={team}
          aggregate={aggregate}
          isSelf={isSelf}
          onAvatarSelected={isSelf ? handleAvatarSelected : undefined}
          uploadingAvatar={uploadingAvatar}
        />
      </div>

      <div className="mt-6">
        <WeeklySummaryCard summary={weekly} />
      </div>

      <div className="mb-3 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-charcoal">Training log</h2>
        {isSelf && (
          <Link
            href="/log"
            className="focus-ring inline-flex items-center gap-1 rounded-full bg-coral px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-coral-dark"
          >
            <Icon name="edit_note" size={14} /> Log
          </Link>
        )}
      </div>

      <FilterTabs tabs={CATEGORY_TABS} active={filter} onChange={setFilter} className="mb-5" />

      {loading ? (
        <LoadingState count={3} />
      ) : signedOut ? (
        <EmptyState icon="lock" title="Sign in to view training logs" actionLabel="Log in" actionHref="/login" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="rowing"
          title={userWorkouts.length === 0 ? 'No workouts yet.' : 'Nothing in this filter.'}
          message={
            userWorkouts.length === 0
              ? isSelf ? 'Log your first one.' : 'Waiting on the first session.'
              : 'Try a different filter.'
          }
          actionLabel={isSelf && userWorkouts.length === 0 ? 'Log the work' : undefined}
          actionHref={isSelf && userWorkouts.length === 0 ? '/log' : undefined}
        />
      ) : (
        <div className="space-y-5">
          {filtered.map((w) => (
            <WorkoutPostCard
              key={w.id}
              workout={w}
              configs={configs}
              currentUser={currentUser}
              avatarById={{
                ...(profileUser.avatarUrl ? { [profileUser.id]: profileUser.avatarUrl } : {}),
                ...avatarById,
              }}
              usersById={usersById}
              onToggleRespect={toggleRespect}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              actions={
                isSelf ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => startEdit(w)} className="focus-ring rounded-lg p-1 text-charcoal-light hover:text-charcoal">
                      <Icon name="edit" size={15} />
                    </button>
                    <button type="button" onClick={() => handleDelete(w)} className="focus-ring rounded-lg p-1 text-charcoal-light hover:text-coral">
                      <Icon name="delete" size={15} />
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-charcoal/60 backdrop-blur-sm" />
          <div className="card-solid relative z-10 w-full max-w-md p-6 shadow-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-charcoal">Edit workout</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Type</label>
                <select
                  value={editValues.type}
                  onChange={(e) => setEditValues((v) => ({ ...v, type: e.target.value as WorkoutType }))}
                  className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[13px] text-charcoal"
                >
                  {(Object.entries(WORKOUT_TYPES) as [WorkoutType, WorkoutTypeConfig][]).map(([k, c]) => (
                    <option key={k} value={k}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Minutes</label>
                  <input type="number" inputMode="numeric" value={editValues.minutes} onChange={(e) => setEditValues((v) => ({ ...v, minutes: e.target.value }))} className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[13px] text-charcoal" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Distance (m)</label>
                  <input type="number" inputMode="decimal" value={editValues.distance} onChange={(e) => setEditValues((v) => ({ ...v, distance: e.target.value }))} step="any" className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[13px] text-charcoal" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Notes</label>
                <textarea value={editValues.notes} onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))} rows={2} className="focus-ring w-full resize-none rounded-xl border border-stone/40 bg-bone-dark/40 px-3 py-2 text-[13px] text-charcoal" />
              </div>
            </div>
            {editError && <p role="alert" className="mt-4 text-[12px] font-medium text-coral">{editError}</p>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-charcoal-muted hover:text-charcoal">Cancel</button>
              <button type="button" onClick={saveEdit} className="rounded-full bg-coral px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-coral-dark">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
