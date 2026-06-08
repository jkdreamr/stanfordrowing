'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getTeamById,
  getUserById,
  getWorkoutLabel,
} from '@/lib/data';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { User, Workout, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import {
  addWorkoutReaction,
  deleteWorkoutRow,
  fetchMultipliers,
  fetchWorkouts,
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
  return 'cross';
}

const CATEGORY_TABS: FilterTab[] = [
  { key: 'all', label: 'All' },
  { key: 'row', label: 'Rowing' },
  { key: 'lift', label: 'Lifting' },
  { key: 'cross', label: 'Cross' },
  { key: 'session', label: 'Sessions' },
];

export default function RowerProfilePage() {
  const params = useParams<{ id: string }>();
  const rowerId = params?.id;
  const profileUser = rowerId ? getUserById(rowerId) : undefined;

  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [configs, setConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Workout | null>(null);
  const [editValues, setEditValues] = useState({ type: 'rowing_no_pieces' as WorkoutType, minutes: '', distance: '', notes: '' });

  useEffect(() => {
    const load = async () => {
      try {
        const [w, m] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setAllWorkouts(w);
        setConfigs(m.workoutTypeConfigs);
      } catch {
        setSignedOut(true);
      } finally {
        setLoading(false);
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

  const startEdit = (w: Workout) => {
    setEditing(w);
    setEditValues({
      type: w.type,
      minutes: w.minutes ? String(w.minutes) : '',
      distance: w.distance ? String(w.distance) : '',
      notes: w.notes ?? '',
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    const config = configs[editValues.type] ?? WORKOUT_TYPES[editValues.type];
    const basis = config?.basis ?? 'minutes';
    const minutes = Number(editValues.minutes) || 0;
    const distance = editValues.distance ? Number(editValues.distance) : undefined;
    if (basis === 'minutes' && minutes <= 0) return;
    if (basis === 'distance' && (!distance || distance <= 0)) return;
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
      /* keep modal open on failure */
    }
  };

  const handleDelete = async (w: Workout) => {
    if (!window.confirm('Delete this workout? This cannot be undone.')) return;
    try {
      await deleteWorkoutRow(w.id);
      setAllWorkouts((prev) => prev.filter((x) => x.id !== w.id));
    } catch {
      /* no-op */
    }
  };

  // ---- render guards ----
  if (!profileUser) {
    return (
      <div className="mx-auto max-w-feed px-4 py-16 sm:px-6">
        <EmptyState icon="person_off" title="Rower not found" message="That profile doesn’t exist." actionLabel="Back to rowers" actionHref="/rowers" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
      <div className="pt-6">
        <Link href="/rowers" className="label-caps inline-flex items-center gap-1 text-ink-muted hover:text-ink">
          <Icon name="arrow_back" size={16} /> Rowers
        </Link>
      </div>

      <div className="mt-4">
        <RowerProfileHeader user={profileUser} team={team} aggregate={aggregate} isSelf={isSelf} />
      </div>

      <div className="mt-6">
        <WeeklySummaryCard summary={weekly} />
      </div>

      <div className="mb-4 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-ink">Training log</h2>
        {isSelf && (
          <Link
            href="/log"
            className="focus-ring inline-flex items-center gap-1.5 rounded-full bg-cardinal px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-cardinal-dark"
          >
            <Icon name="add" size={16} /> Log
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
              ? isSelf
                ? 'Log your first one. It starts now.'
                : 'Nothing logged here yet.'
              : 'Try another category.'
          }
          actionLabel={isSelf && userWorkouts.length === 0 ? 'Log the work' : undefined}
          actionHref={isSelf && userWorkouts.length === 0 ? '/log' : undefined}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((w) => (
            <WorkoutPostCard
              key={w.id}
              workout={w}
              configs={configs}
              currentUser={currentUser}
              onToggleRespect={toggleRespect}
              actions={
                isSelf ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(w)}
                      className="focus-ring rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink transition-colors hover:border-ink/30"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(w)}
                      aria-label="Delete workout"
                      className="focus-ring rounded-full border border-line p-1.5 text-ink-muted transition-colors hover:border-cardinal hover:text-cardinal"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={() => setEditing(null)}>
          <div className="card w-full max-w-md rounded-t-3xl p-5 sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink">Edit workout</h3>
              <button onClick={() => setEditing(null)} className="focus-ring rounded-full p-1 text-ink-muted hover:text-ink" aria-label="Close">
                <Icon name="close" size={22} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="label-caps mb-1.5 block text-ink-soft">Type</label>
                <select
                  value={editValues.type}
                  onChange={(e) => setEditValues((v) => ({ ...v, type: e.target.value as WorkoutType }))}
                  className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-3 py-2.5 text-sm text-ink"
                >
                  {(Object.entries(configs) as [WorkoutType, WorkoutTypeConfig][]).map(([t, c]) => (
                    <option key={t} value={t}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label-caps mb-1.5 block text-ink-soft">Minutes</label>
                  <input
                    type="number" inputMode="numeric" min="0"
                    value={editValues.minutes}
                    onChange={(e) => setEditValues((v) => ({ ...v, minutes: e.target.value }))}
                    className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-3 py-2.5 text-sm text-ink"
                  />
                </div>
                <div>
                  <label className="label-caps mb-1.5 block text-ink-soft">Distance (km)</label>
                  <input
                    type="number" inputMode="decimal" min="0" step="0.1"
                    value={editValues.distance}
                    onChange={(e) => setEditValues((v) => ({ ...v, distance: e.target.value }))}
                    className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-3 py-2.5 text-sm text-ink"
                  />
                </div>
              </div>
              <div>
                <label className="label-caps mb-1.5 block text-ink-soft">Notes</label>
                <textarea
                  rows={2}
                  value={editValues.notes}
                  onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))}
                  className="focus-ring w-full resize-none rounded-xl border border-line bg-container-low/60 px-3 py-2.5 text-sm text-ink"
                />
              </div>
              <p className="text-xs text-ink-muted">{getWorkoutLabel(editing, configs)}</p>
              <div className="flex gap-2">
                <button onClick={saveEdit} className="focus-ring flex-1 rounded-full bg-cardinal px-4 py-2.5 text-sm font-semibold text-white hover:bg-cardinal-dark">
                  Save changes
                </button>
                <button onClick={() => setEditing(null)} className="focus-ring rounded-full border border-line px-4 py-2.5 text-sm font-semibold text-ink hover:border-ink/30">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
