'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_PLAN_MILEAGES,
  TEAMS,
  formatPreciseNumber,
  formatPstDate,
  getChallengeDates,
  getWorkoutLabel,
  getWorkoutWeightedScore,
  isAdminEmail,
} from '@/lib/data';
import { getProfileByAuthId } from '@/lib/userProfile';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase, clearLocalAuth } from '@/lib/supabaseClient';
import {
  deleteWorkoutRow,
  fetchMultipliers,
  fetchWorkouts,
  saveMultipliers,
  updateTrainingSessionDistanceForDate,
  updateWorkoutRow,
} from '@/lib/supabaseData';

const emptyEdit = {
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
  const [planMileageInputs, setPlanMileageInputs] = useState<Record<string, string>>({});
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(emptyEdit);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Refs mirror the latest inputs so debounced autosave never reads stale state.
  const workoutInputsRef = useRef(workoutMultiplierInputs);
  const teamInputsRef = useRef(teamMultiplierInputs);
  const planInputsRef = useRef(planMileageInputs);
  useEffect(() => { workoutInputsRef.current = workoutMultiplierInputs; }, [workoutMultiplierInputs]);
  useEffect(() => { teamInputsRef.current = teamMultiplierInputs; }, [teamMultiplierInputs]);
  useEffect(() => { planInputsRef.current = planMileageInputs; }, [planMileageInputs]);

  const multTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
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
        const [workoutsData, multiplierData] = await Promise.all([fetchWorkouts(), fetchMultipliers()]);
        setWorkouts(workoutsData);
        setWorkoutTypeConfigs(multiplierData.workoutTypeConfigs);
        setWorkoutMultiplierInputs(
          (Object.entries(multiplierData.workoutTypeConfigs) as [WorkoutType, WorkoutTypeConfig][]).reduce((acc, [type, config]) => {
            acc[type] = config.multiplier.toString();
            return acc;
          }, {} as Record<WorkoutType, string>)
        );
        const mergedPlanMileages = { ...DEFAULT_PLAN_MILEAGES, ...multiplierData.planMileages };
        setPlanMileageInputs(
          getChallengeDates().reduce((acc, date) => {
            acc[date] = mergedPlanMileages[date]?.toString() || '';
            return acc;
          }, {} as Record<string, string>)
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
  const totalPoints = useMemo(
    () => workouts.reduce((sum, workout) => sum + getWorkoutWeightedScore(workout, workoutTypeConfigs), 0),
    [workouts, workoutTypeConfigs]
  );

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

  const getUserName = (userId: string) =>
    workouts.find((w) => w.oderId === userId)?.userName || 'Unknown';

  const getUserTeam = (_userId: string): { color: string; name: string } | null => null;

  const startEdit = (workout: Workout) => {
    setEditingWorkoutId(workout.id);
    setEditValues({
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
    const config = workoutTypeConfigs[workout.type] ?? WORKOUT_TYPES[workout.type];
    const basis = config?.basis ?? 'minutes';
    const hasMinutes = Number.isFinite(minutesValue) && minutesValue > 0;
    const hasDistance = Number.isFinite(distanceValue) && (distanceValue ?? 0) > 0;
    if ((basis === 'minutes' && !hasMinutes) || (basis === 'distance' && !hasDistance)) {
      return;
    }
    const updatedWorkout: Workout = {
      ...workout,
      minutes: basis === 'minutes' && hasMinutes ? minutesValue : 0,
      distance: hasDistance ? distanceValue : undefined,
      notes: editValues.notes ? editValues.notes.trim() : undefined,
    };
    updatedWorkout.weightedScore = getWorkoutWeightedScore(updatedWorkout, workoutTypeConfigs);

    updateWorkoutRow(updatedWorkout).then(() => {
      setWorkouts(prev => prev.map(item => (item.id === workout.id ? updatedWorkout : item)));
    });
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
  const planTimersForCleanup = planTimers;
  useEffect(() => {
    const mult = multTimerForCleanup;
    const saved = savedTimerForCleanup;
    const plans = planTimersForCleanup;
    return () => {
      if (mult.current) clearTimeout(mult.current);
      if (saved.current) clearTimeout(saved.current);
      Object.values(plans.current).forEach((t) => clearTimeout(t));
    };
  }, [multTimerForCleanup, savedTimerForCleanup, planTimersForCleanup]);

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

    const planMileages = Object.entries(planInputsRef.current).reduce((acc, [date, value]) => {
      const numeric = Number(value);
      if (value !== '' && Number.isFinite(numeric) && numeric > 0) acc[date] = numeric;
      return acc;
    }, {} as Record<string, number>);

    return { workoutMultipliers, teamMultipliers, planMileages };
  };

  const flashSaved = () => {
    setSaveStatus('saved');
    if (savedResetTimer.current) clearTimeout(savedResetTimer.current);
    savedResetTimer.current = setTimeout(() => setSaveStatus('idle'), 1600);
  };

  /** Persist all multiplier inputs, then refresh the live config (inputs untouched). */
  const persistMultipliers = async () => {
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

  // Editing a date's plan mileage autosaves AND retroactively updates the
  // points of every training session logged on that date.
  const handlePlanMileageChange = (date: string, value: string) => {
    setPlanMileageInputs((prev) => ({ ...prev, [date]: value }));
    if (planTimers.current[date]) clearTimeout(planTimers.current[date]);
    planTimers.current[date] = setTimeout(async () => {
      setSaveStatus('saving');
      setLoadError('');
      try {
        await saveMultipliers(buildPayload());
        const numeric = Number(planInputsRef.current[date]);
        if (planInputsRef.current[date] !== '' && Number.isFinite(numeric) && numeric > 0) {
          await updateTrainingSessionDistanceForDate(date, numeric);
          setWorkouts((prev) =>
            prev.map((w) =>
              w.type === 'training_session' && w.date === date ? { ...w, distance: numeric } : w
            )
          );
        }
        const data = await fetchMultipliers();
        setWorkoutTypeConfigs(data.workoutTypeConfigs);
        flashSaved();
      } catch {
        setSaveStatus('error');
        setLoadError('Unable to update plan mileage for that date.');
      }
    }, 800);
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
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-coral">
                          {formatPreciseNumber(getWorkoutWeightedScore(workout, workoutTypeConfigs))} pts
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
                            Edit numbers
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
              <h3 className="text-lg font-semibold text-charcoal mb-2">Plan mileage by date</h3>
              <p className="mb-5 text-xs text-charcoal-muted">Set mileage for training sessions (points equal mileage).</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {getChallengeDates().map(date => (
                  <div key={date} className="rounded-2xl border border-white/[0.07] bg-white/[0.04] px-4 py-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-charcoal-light">Date</p>
                    <p className="mt-1 font-semibold text-charcoal text-sm sm:text-base leading-tight break-words">
                      {formatPstDate(date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <label className="mt-4 block text-xs font-semibold text-charcoal-muted">Mileage (pts)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={planMileageInputs[date] || ''}
                      onChange={(event) => handlePlanMileageChange(date, event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-white/[0.07] bg-bone-dark/40 px-3 py-2 text-sm text-charcoal"
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
