'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  TEAMS,
  formatPreciseNumber,
  formatPstDate,
  getTeamById,
  getWorkoutLabel,
  isAdminEmail,
  getLatestDateAnywhere,
} from '@/lib/data';
import { getAllProfiles, getProfileByAuthId, Profile } from '@/lib/userProfile';
import { scoreWorkouts, totalPoints as sumPoints } from '@/lib/scoring';
import { decodeSlots, PLAN_END, PLAN_START, sessionAt, sessionsFor } from '@/lib/trainingPlan';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase, clearLocalAuth } from '@/lib/supabaseClient';
import {
  deleteWorkoutRow,
  fetchMultipliers,
  fetchWorkouts,
  saveMultipliers,
  updateWorkoutRow,
} from '@/lib/supabaseData';

const emptyEdit = {
  type: 'rowing_no_pieces' as WorkoutType,
  date: '',
  minutes: '',
  distance: '',
  notes: '',
};

export default function Admin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutTypeConfigs, setWorkoutTypeConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [workoutMultiplierInputs, setWorkoutMultiplierInputs] = useState<Record<WorkoutType, string>>({} as Record<WorkoutType, string>);
  const [teamMultiplierInputs, setTeamMultiplierInputs] = useState<Record<string, string>>({});
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(emptyEdit);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Refs mirror the latest inputs so debounced autosave never reads stale state.
  const workoutInputsRef = useRef(workoutMultiplierInputs);
  const teamInputsRef = useRef(teamMultiplierInputs);
  useEffect(() => { workoutInputsRef.current = workoutMultiplierInputs; }, [workoutMultiplierInputs]);
  useEffect(() => { teamInputsRef.current = teamMultiplierInputs; }, [teamMultiplierInputs]);

  const multTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkAdmin = async (authId: string | undefined) => {
      if (!authId) {
        setSignedIn(false);
        setIsAdmin(false);
        setIsAuthLoading(false);
        return;
      }
      setSignedIn(true);
      const p = await getProfileByAuthId(authId);
      setIsAdmin(isAdminEmail(p?.email));
      setIsAuthLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session?.user.id));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkAdmin(session?.user.id);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const loadAdminData = async () => {
      try {
        const [workoutsData, multiplierData, profileData] = await Promise.all([
          fetchWorkouts(),
          fetchMultipliers(),
          getAllProfiles(),
        ]);
        setWorkouts(workoutsData);
        setProfiles(profileData);
        setWorkoutTypeConfigs(multiplierData.workoutTypeConfigs);
        setWorkoutMultiplierInputs(
          (Object.entries(multiplierData.workoutTypeConfigs) as [WorkoutType, WorkoutTypeConfig][]).reduce((acc, [type, config]) => {
            acc[type] = config.multiplier.toString();
            return acc;
          }, {} as Record<WorkoutType, string>)
        );
        setTeamMultiplierInputs(
          TEAMS.reduce((acc, team) => {
            acc[team.id] = (multiplierData.teamMultipliers[team.id] ?? team.scoreMultiplier).toString();
            return acc;
          }, {} as Record<string, string>)
        );
        setLoadError('');
      } catch {
        setLoadError('Unable to load admin data. Confirm you are signed in.');
      }
    };

    loadAdminData();
  }, [isAdmin]);

  const sortedWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [workouts]);

  const totalMinutes = useMemo(() => workouts.reduce((sum, workout) => sum + workout.minutes, 0), [workouts]);
  /** Scored against the plan, so the log always agrees with the board. */
  const scores = useMemo(() => scoreWorkouts(workouts, workoutTypeConfigs), [workouts, workoutTypeConfigs]);
  const totalPoints = useMemo(() => sumPoints(workouts, workoutTypeConfigs), [workouts, workoutTypeConfigs]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { prompt: 'select_account' },
      },
    });
  };

  const handleSignOut = () => {
    setIsAdmin(false);
    setSignedIn(false);
    clearLocalAuth();
    window.location.href = '/';
  };

  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);

  const getUserName = (userId: string) =>
    profileById.get(userId)?.name ||
    workouts.find((w) => w.oderId === userId)?.userName ||
    'Unknown';

  const getUserTeam = (userId: string) => {
    const teamId = profileById.get(userId)?.teamId;
    return teamId ? getTeamById(teamId) : undefined;
  };

  const startEdit = (workout: Workout) => {
    setEditingWorkoutId(workout.id);
    setEditValues({
      type: workout.type,
      date: workout.date,
      minutes: workout.minutes.toString(),
      distance: workout.distance?.toString() || '',
      notes: workout.notes || '',
    });
  };

  const cancelEdit = () => {
    setEditingWorkoutId(null);
    setEditValues(emptyEdit);
  };

  const saveEdit = (workout: Workout) => {
    const distanceValue = editValues.distance ? Number(editValues.distance) : undefined;
    const minutesValue = Number(editValues.minutes);
    const hasDistance = Number.isFinite(distanceValue) && (distanceValue ?? 0) > 0;
    if (!editValues.date) {
      setLoadError('A workout needs a date.');
      return;
    }
    // The scorer refuses to score a day that hasn't happened, so dating a
    // workout forward would silently zero everything that rower logged that day.
    if (editValues.date > getLatestDateAnywhere()) {
      setLoadError('That date is in the future — the day would score nothing.');
      return;
    }

    // Editing must not quietly break a plan claim. A claim survives only while
    // the row still sits on its session's date and stays a discipline that
    // session allows, and its bonus is pro-rated against the measure the sheet
    // states — so an edit that drops any of those has to say so first.
    const claimed = decodeSlots(workout.activityName);
    if (claimed.length > 0) {
      const stillPrescribed = sessionsFor(editValues.date).filter((s) => claimed.includes(s.slot));
      if (stillPrescribed.length < claimed.length) {
        setLoadError(
          `${formatPstDate(editValues.date)} has no ${claimed.join(' or ').toUpperCase()} session — moving this there would drop its plan bonus.`
        );
        return;
      }
      // A slot goes to the earliest claim on the day, so moving an older row
      // onto a date the rower has already covered would quietly demote the row
      // that was counting and cost them the bonus.
      const conflict = workouts.find(
        (other) =>
          other.id !== workout.id &&
          other.oderId === workout.oderId &&
          other.date === editValues.date &&
          decodeSlots(other.activityName).some((slot) => claimed.includes(slot))
      );
      if (conflict) {
        setLoadError(
          `That rower already has a ${claimed.join('/').toUpperCase()} session on ${formatPstDate(editValues.date)} — only one can count.`
        );
        return;
      }
      const disallowed = stillPrescribed.find(
        (s) => s.types.length > 0 && !s.types.includes(editValues.type)
      );
      if (disallowed) {
        setLoadError(`"${disallowed.label}" cannot be logged as that type — the plan bonus would be lost.`);
        return;
      }
      // The bonus is pro-rated against whichever measure the sheet states, so
      // whichever one that is has to survive the edit.
      const needsMeters = stillPrescribed.some((s) => !!s.minMeters);
      if (needsMeters && !hasDistance) {
        setLoadError('This plan session is measured in metres — clearing the distance would wipe its bonus.');
        return;
      }
      const needsMinutes = stillPrescribed.some((s) => !s.minMeters && !!s.minMinutes);
      if (needsMinutes && !(minutesValue > 0)) {
        setLoadError('This is a plan session — it needs minutes, or its bonus is pro-rated to nothing.');
        return;
      }
    }
    const updatedWorkout: Workout = {
      ...workout,
      type: editValues.type,
      date: editValues.date,
      minutes: Number.isFinite(minutesValue) && minutesValue > 0 ? minutesValue : 0,
      // activity_name (and with it any plan claim) rides along on the spread above.
      distance: hasDistance ? distanceValue : undefined,
      notes: editValues.notes ? editValues.notes.trim() : undefined,
    };

    updateWorkoutRow(updatedWorkout)
      .then(() => {
        setWorkouts(prev => prev.map(item => (item.id === workout.id ? updatedWorkout : item)));
        setLoadError('');
      })
      .catch(() => setLoadError('Unable to save that change.'));
    cancelEdit();
  };

  const handleDelete = async (workoutId: string) => {
    if (!window.confirm('Delete this workout?')) return;
    try {
      await deleteWorkoutRow(workoutId);
      setWorkouts(prev => prev.filter(item => item.id !== workoutId));
    } catch {
      setLoadError('Unable to delete workout.');
    }
  };

  // Clear any pending autosave timers on unmount.
  const multTimerForCleanup = multTimer;
  const savedTimerForCleanup = savedResetTimer;
  useEffect(() => {
    const mult = multTimerForCleanup;
    const saved = savedTimerForCleanup;
    return () => {
      if (mult.current) clearTimeout(mult.current);
      if (saved.current) clearTimeout(saved.current);
    };
  }, [multTimerForCleanup, savedTimerForCleanup]);

  const buildPayload = () => {
    const workoutMultipliers = (Object.keys(WORKOUT_TYPES) as WorkoutType[]).reduce((acc, type) => {
      const raw = workoutInputsRef.current[type];
      const value = Number(raw);
      if (raw !== undefined && raw !== '' && Number.isFinite(value)) acc[type] = value;
      return acc;
    }, {} as Partial<Record<WorkoutType, number>>);

    const teamMultipliers = TEAMS.reduce((acc, team) => {
      const value = Number(teamInputsRef.current[team.id]);
      acc[team.id] = Number.isFinite(value) ? value : team.scoreMultiplier;
      return acc;
    }, {} as Record<string, number>);

    return { workoutMultipliers, teamMultipliers };
  };

  const flashSaved = () => {
    setSaveStatus('saved');
    if (savedResetTimer.current) clearTimeout(savedResetTimer.current);
    savedResetTimer.current = setTimeout(() => setSaveStatus('idle'), 1600);
  };

  /** Persist all multiplier inputs, then refresh the live config (inputs untouched). */
  /**
   * Multipliers rescore every workout in the app the moment they save, and the
   * box autosaves on a debounce with no confirm step, so a half-typed number is
   * a live change to the whole board. Anything outside this range is a slip.
   */
  const isSaneMultiplier = (value: string): boolean => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 && n <= 10;
  };

  const persistMultipliers = async () => {
    // A blank workout box is skipped by buildPayload, so it changes nothing and
    // is fine to leave. Anything actually typed has to be a real multiplier.
    const badWorkout = (Object.entries(workoutInputsRef.current) as [WorkoutType, string][])
      .find(([, v]) => v !== undefined && v.trim() !== '' && !isSaneMultiplier(v));
    if (badWorkout) {
      setSaveStatus('idle');
      setLoadError(`"${badWorkout[1]}" isn't a usable multiplier — it needs to be a number above 0 and no more than 10.`);
      return;
    }
    // A blank team box is not harmless: Number('') is 0, which buildPayload
    // accepts as finite and would wipe that group's score to nothing.
    const badTeam = Object.entries(teamInputsRef.current)
      .find(([, v]) => v === undefined || v.trim() === '' || !isSaneMultiplier(v));
    if (badTeam) {
      setSaveStatus('idle');
      setLoadError(`"${badTeam[1]}" isn't a usable team multiplier — it needs to be a number above 0 and no more than 10.`);
      return;
    }
    setSaveStatus('saving');
    setLoadError('');
    try {
      await saveMultipliers(buildPayload());
      const data = await fetchMultipliers();
      setWorkoutTypeConfigs(data.workoutTypeConfigs);
      flashSaved();
    } catch {
      setSaveStatus('error');
      setLoadError('Unable to save. Check your connection.');
    }
  };

  const handleWorkoutMultiplierChange = (type: WorkoutType, value: string) => {
    setWorkoutMultiplierInputs((prev) => ({ ...prev, [type]: value }));
    if (multTimer.current) clearTimeout(multTimer.current);
    multTimer.current = setTimeout(() => { void persistMultipliers(); }, 700);
  };

  const handleTeamMultiplierChange = (teamId: string, value: string) => {
    setTeamMultiplierInputs((prev) => ({ ...prev, [teamId]: value }));
    if (multTimer.current) clearTimeout(multTimer.current);
    multTimer.current = setTimeout(() => { void persistMultipliers(); }, 700);
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center px-4">
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-8 text-center shadow-card">
          <p className="text-sm text-charcoal-muted">Checking your session...</p>
          <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-coral border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-bone py-16">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="panel-cinematic p-8 text-center">
            <div className="absolute inset-0 bg-grain opacity-[0.05]" />
            <div className="relative">
              <span className="label-caps text-charcoal-muted">Cardinal Row · Admin</span>
              {signedIn ? (
                <>
                  <h1 className="mt-4 font-display text-2xl font-bold tracking-tightest text-charcoal">Not your wall.</h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
                    This account doesn&rsquo;t have admin access. Switch to an admin account to manage the squad.
                  </p>
                  <button
                    onClick={handleSignOut}
                    className="focus-ring mt-6 w-full rounded-pill border border-white/15 px-6 py-3 text-sm font-semibold text-charcoal transition-colors hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <h1 className="mt-4 font-display text-2xl font-bold tracking-tightest text-charcoal">Admins only.</h1>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-charcoal-muted">
                    Sign in with your Stanford Google account to manage workouts and scoring.
                  </p>
                  <button
                    onClick={handleGoogleSignIn}
                    className="focus-ring mt-6 w-full rounded-pill bg-coral px-6 py-3 text-sm font-semibold text-white shadow-glow transition-colors hover:bg-coral-dark active:scale-95"
                  >
                    Sign in with Google
                  </button>
                </>
              )}
              <div className="mt-5 text-[12px]">
                <Link href="/" className="font-semibold text-charcoal-muted transition-colors hover:text-coral">
                  Back to the feed
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bone py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Admin dashboard</h1>
            <p className="mt-2 text-charcoal-muted">Review all workouts, notes, and scoring multipliers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSignOut}
              className="focus-ring rounded-pill border border-white/15 px-4 py-2 text-xs font-semibold text-charcoal transition-colors hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.3em] text-charcoal-muted">Workouts logged</p>
            <p className="font-display mt-3 text-4xl">{workouts.length}</p>
            <p className="mt-4 text-sm text-charcoal-muted">Every entry across the challenge.</p>
          </div>
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.3em] text-charcoal-muted">Total minutes</p>
            <p className="font-display mt-3 text-4xl">{totalMinutes.toLocaleString()}</p>
            <p className="mt-4 text-sm text-charcoal-muted">Sum of all logged effort.</p>
          </div>
          <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.3em] text-charcoal-muted">Total points</p>
            <p className="font-display mt-3 text-4xl">{formatPreciseNumber(totalPoints)}</p>
            <p className="mt-4 text-sm text-charcoal-muted">Based on current multipliers.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-10">
          <div className="lg:col-span-2 rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-charcoal">Workout log</h2>
              <span className="text-xs text-charcoal-muted">Showing notes and optional fields</span>
            </div>
            {loadError && (
              <div className="mb-4 rounded-2xl border border-white/[0.07] bg-white/[0.04] p-3 text-sm text-charcoal-muted">
                {loadError}
              </div>
            )}

            <div className="space-y-3">
              {sortedWorkouts.map(workout => {
                const team = getUserTeam(workout.oderId);
                const score = scores.get(workout.id);
                const planSlots = decodeSlots(workout.activityName)
                  .map((slot) => sessionAt(workout.date, slot))
                  .filter((x): x is NonNullable<typeof x> => !!x);
                const isEditing = editingWorkoutId === workout.id;
                return (
                  <div
                    key={workout.id}
                    className="rounded-2xl border border-white/[0.07] bg-bone-dark/40 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-1 h-3 w-3 rounded-full"
                          style={{ backgroundColor: team?.color || '#b51c00' }}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-charcoal">{getUserName(workout.oderId)}</p>
                            <span className="text-xs text-charcoal-muted">{team?.name || 'Unknown team'}</span>
                            <span className="rounded-full border border-white/[0.07] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-charcoal-muted">
                              {getWorkoutLabel(workout, workoutTypeConfigs)}
                            </span>
                          </div>
                          <p className="text-xs text-charcoal-light">{formatPstDate(workout.date)}</p>
                          {planSlots.length > 0 && (
                            <p className="mt-0.5 text-xs text-charcoal-muted">
                              {planSlots.map((ps) => `${ps.slot.toUpperCase()} · ${ps.label}`).join('  |  ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        {score?.legacy ? (
                          <span
                            className="rounded-full border border-white/[0.08] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-charcoal-light"
                            title={`Logged before the plan started on ${formatPstDate(PLAN_START, { month: 'short', day: 'numeric' })} — not counted`}
                          >
                            Legacy
                          </span>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-coral">
                              {formatPreciseNumber(score?.points ?? 0)} pts
                            </p>
                            {(score?.bonus ?? 0) > 0 && (
                              <p className="text-[10px] text-charcoal-muted">
                                {formatPreciseNumber(score?.volume ?? 0)} work + {score?.bonus} plan
                              </p>
                            )}
                            {score?.duplicate && (
                              <p className="text-[10px] text-coral">Session already claimed</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {isEditing && (
                        <>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal-light">Type</p>
                            <select
                              value={editValues.type}
                              onChange={(event) =>
                                setEditValues(prev => ({ ...prev, type: event.target.value as WorkoutType }))
                              }
                              className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-charcoal"
                            >
                              {(Object.entries(workoutTypeConfigs) as [WorkoutType, WorkoutTypeConfig][])
                                .filter(([value]) => value !== 'training_session')
                                .map(([value, config]) => (
                                  <option key={value} value={value}>{config.label}</option>
                                ))}
                            </select>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal-light">Date</p>
                            <input
                              type="date"
                              value={editValues.date}
                              onChange={(event) => setEditValues(prev => ({ ...prev, date: event.target.value }))}
                              className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-charcoal"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal-light">Time (mins)</p>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editValues.minutes}
                            onChange={(event) => setEditValues(prev => ({ ...prev, minutes: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-charcoal"
                          />
                        ) : (
                          <p className="mt-2 text-base font-semibold text-charcoal">{workout.minutes}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal-light">Distance (m)</p>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.distance}
                            onChange={(event) => setEditValues(prev => ({ ...prev, distance: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-charcoal"
                          />
                        ) : (
                          <p className="mt-2 text-base font-semibold text-charcoal">
                            {workout.distance ? workout.distance : '—'}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-charcoal-light">Notes</p>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editValues.notes}
                            onChange={(event) => setEditValues(prev => ({ ...prev, notes: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3 py-2 text-sm text-charcoal"
                          />
                        ) : (
                          <div className="mt-2 space-y-1 text-sm text-charcoal-muted">
                            <p>{workout.notes || '—'}</p>
                            {workout.proofUrl ? (
                              <a
                                href={workout.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-charcoal transition-colors duration-200 hover:text-coral"
                              >
                                View proof
                              </a>
                            ) : (
                              <p className="text-xs text-charcoal-light">No proof uploaded</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => saveEdit(workout)}
                            className="rounded-full bg-coral px-4 py-2 text-xs font-semibold text-white"
                          >
                            Save changes
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-charcoal"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(workout)}
                            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-charcoal"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(workout.id)}
                            className="rounded-full border border-coral px-4 py-2 text-xs font-semibold text-coral transition-colors duration-200 hover:bg-coral hover:text-white"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {sortedWorkouts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center text-sm text-charcoal-muted">
                  No workouts logged yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Workout type multipliers</h3>
              <div className="space-y-3">
                {(Object.entries(workoutTypeConfigs) as [WorkoutType, WorkoutTypeConfig][]).map(([type, config]) => (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{config.label}</p>
                      <p className="text-xs text-charcoal-muted">{config.description}</p>
                    </div>
                    <input
                      type="number"
                      step="any"
                      value={workoutMultiplierInputs[type] || ''}
                      onChange={(event) => handleWorkoutMultiplierChange(type, event.target.value)}
                      className="w-24 rounded-2xl border border-white/[0.07] bg-bone-dark/40 px-3 py-2 text-sm text-charcoal"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 shadow-card">
              <h3 className="text-lg font-semibold text-charcoal mb-4">Team multipliers</h3>
              <div className="space-y-3">
                {TEAMS.map(team => (
                  <div key={team.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="text-sm font-semibold text-charcoal">{team.name}</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      value={teamMultiplierInputs[team.id] || ''}
                      onChange={(event) => handleTeamMultiplierChange(team.id, event.target.value)}
                      className="w-24 rounded-2xl border border-white/[0.07] bg-bone-dark/40 px-3 py-2 text-sm text-charcoal"
                    />
                  </div>
                ))}
              </div>

              {TEAMS.length === 0 && (
                <p className="text-xs text-charcoal-muted">No teams yet — groupings come later.</p>
              )}

              <div className="mt-5 flex items-center gap-2 text-xs font-medium" aria-live="polite">
                <span
                  className={`h-2 w-2 rounded-full ${
                    saveStatus === 'saving'
                      ? 'animate-pulse bg-charcoal-light'
                      : saveStatus === 'error'
                        ? 'bg-coral'
                        : 'bg-success'
                  }`}
                />
                <span className={saveStatus === 'error' ? 'text-coral' : 'text-charcoal-muted'}>
                  {saveStatus === 'saving'
                    ? 'Saving…'
                    : saveStatus === 'error'
                      ? 'Couldn’t save — change again to retry.'
                      : saveStatus === 'saved'
                        ? 'All changes saved'
                        : 'Changes save automatically'}
                </span>
              </div>

              <p className="mt-3 text-xs text-charcoal-muted">
                Editing a date&apos;s mileage updates points for every session logged that day.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.04] p-6 text-sm text-charcoal-muted">
          <p>
            Tip: If you update multipliers, revisit the leaderboard to see the recalculated totals.
          </p>
        </div>
      </div>
    </div>
  );
}
