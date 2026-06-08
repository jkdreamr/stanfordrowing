'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ALL_USERS,
  DEFAULT_PLAN_MILEAGES,
  TEAMS,
  clearAdminAuth,
  formatPreciseNumber,
  formatPstDate,
  getAdminAuth,
  getChallengeDates,
  getWorkoutLabel,
  getWorkoutWeightedScore,
  isAdminEmail,
  setAdminAuth,
} from '@/lib/data';
import { Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { deleteWorkoutRow, fetchMultipliers, fetchWorkouts, saveMultipliers, updateWorkoutRow } from '@/lib/supabaseData';

const ADMIN_PASSWORD = 'rowing123';
const emptyEdit = {
  minutes: '',
  distance: '',
  notes: '',
};

export default function Admin() {
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [workoutTypeConfigs, setWorkoutTypeConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [workoutMultiplierInputs, setWorkoutMultiplierInputs] = useState<Record<WorkoutType, string>>({} as Record<WorkoutType, string>);
  const [teamMultiplierInputs, setTeamMultiplierInputs] = useState<Record<string, string>>({});
  const [planMileageInputs, setPlanMileageInputs] = useState<Record<string, string>>({});
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(emptyEdit);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (getAdminAuth()) {
      setIsAdmin(true);
    }
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user.email ?? null);
      setIsAuthLoading(false);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
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

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = adminPassword.trim();
    if (!normalized) {
      setAdminError('Enter the admin password to continue.');
      return;
    }
    if (normalized !== ADMIN_PASSWORD) {
      setAdminError('Incorrect admin password.');
      return;
    }
    setAdminError('');
    setAdminAuth(true);
    setAdminPassword('');
    setIsAdmin(true);
  };

  const handleLogout = () => {
    clearAdminAuth();
    setIsAdmin(false);
  };

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    clearAdminAuth();
    setIsAdmin(false);
    await supabase.auth.signOut();
    setSessionEmail(null);
  };

  const getUserName = (userId: string) => ALL_USERS.find(u => u.id === userId)?.name || 'Unknown';

  const getUserTeam = (userId: string) => {
    const user = ALL_USERS.find(u => u.id === userId);
    if (!user) return null;
    return TEAMS.find(team => team.id === user.teamId) || null;
  };

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

  const handleSaveMultipliers = () => {
    const nextWorkoutMultipliers = (Object.keys(WORKOUT_TYPES) as WorkoutType[]).reduce(
      (acc, type) => {
        const value = Number(workoutMultiplierInputs[type]);
        if (Number.isFinite(value)) {
          acc[type] = value;
        }
        return acc;
      },
      {} as Partial<Record<WorkoutType, number>>
    );

    const nextTeamMultipliers = TEAMS.reduce((acc, team) => {
      const value = Number(teamMultiplierInputs[team.id]);
      acc[team.id] = Number.isFinite(value) ? value : team.scoreMultiplier;
      return acc;
    }, {} as Record<string, number>);

    const nextPlanMileages = Object.entries(planMileageInputs).reduce((acc, [date, value]) => {
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric > 0) {
        acc[date] = numeric;
      }
      return acc;
    }, {} as Record<string, number>);

    saveMultipliers({ workoutMultipliers: nextWorkoutMultipliers, teamMultipliers: nextTeamMultipliers, planMileages: nextPlanMileages })
      .then(async () => {
        const multiplierData = await fetchMultipliers();
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
            acc[team.id] = (nextTeamMultipliers[team.id] ?? team.scoreMultiplier).toString();
            return acc;
          }, {} as Record<string, string>)
        );
      })
      .catch(() => {
        setLoadError('Unable to save multipliers.');
      });
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-[#5f5e5e]">Checking your session...</p>
          <div className="mt-4 h-10 w-10 animate-spin rounded-full border-2 border-[#b51c00] border-t-transparent mx-auto" />
        </div>
      </div>
    );
  }

  if (!sessionEmail) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] py-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="font-display text-2xl sm:text-3xl">Admin access</h1>
            <p className="mt-2 text-[#5f5e5e]">Sign in with Google to continue.</p>
          </div>

          <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 text-center shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
            <button
              onClick={handleGoogleSignIn}
              className="w-full rounded-full bg-[#191c1d] px-6 py-3 text-sm font-semibold text-[#f8f9fa] transition-colors duration-200 hover:bg-[#131315]"
            >
              Continue with Google
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-[#5f5e5e]">
            <Link href="/" className="font-semibold text-[#191c1d] transition-colors duration-200 hover:text-[#b51c00]">
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdminEmail(sessionEmail)) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] py-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="font-display text-2xl sm:text-3xl">Admin access</h1>
            <p className="mt-2 text-[#5f5e5e]">This Google account does not have admin access.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full rounded-full border border-[#191c1d] px-6 py-3 text-sm font-semibold text-[#191c1d] transition-colors duration-200 hover:bg-[#191c1d] hover:text-[#f8f9fa]"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] py-12">
        <div className="max-w-xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h1 className="font-display text-2xl sm:text-3xl">Admin access</h1>
            <p className="mt-2 text-[#5f5e5e]">Enter the admin password to view and manage the challenge.</p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
          >
            <label className="block text-sm font-semibold text-[#191c1d] mb-3">Admin password</label>
            <input
              type="password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              placeholder="Enter password"
              className="w-full rounded-2xl border border-[#e9ecef] bg-[#f3f4f5] px-4 py-3 text-[#191c1d] transition-all duration-200 focus-ring"
              required
            />
            {adminError && (
              <p className="mt-3 text-sm text-[#b42318]">{adminError}</p>
            )}
            <button
              type="submit"
              className="mt-5 w-full rounded-full bg-[#191c1d] px-6 py-3 text-base font-semibold text-[#f8f9fa] transition-colors duration-200 hover:bg-[#131315]"
            >
              Enter admin view
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#5f5e5e]">
            <Link href="/" className="font-semibold text-[#191c1d] transition-colors duration-200 hover:text-[#b51c00]">
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl">Admin dashboard</h1>
            <p className="mt-2 text-[#5f5e5e]">Review all workouts, notes, and scoring multipliers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#191c1d] px-4 py-2 text-xs font-semibold text-[#191c1d] transition-colors duration-200 hover:bg-[#191c1d] hover:text-[#f8f9fa]"
            >
              Log out of admin view
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-10">
          <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#5f5e5e]">Workouts logged</p>
            <p className="font-display mt-3 text-4xl">{workouts.length}</p>
            <p className="mt-4 text-sm text-[#5f5e5e]">Every entry across the challenge.</p>
          </div>
          <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#5f5e5e]">Total minutes</p>
            <p className="font-display mt-3 text-4xl">{totalMinutes.toLocaleString()}</p>
            <p className="mt-4 text-sm text-[#5f5e5e]">Sum of all logged effort.</p>
          </div>
          <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
            <p className="text-[11px] uppercase tracking-[0.3em] text-[#5f5e5e]">Total points</p>
            <p className="font-display mt-3 text-4xl">{formatPreciseNumber(totalPoints)}</p>
            <p className="mt-4 text-sm text-[#5f5e5e]">Based on current multipliers.</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 mb-10">
          <div className="lg:col-span-2 rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#191c1d]">Workout log</h2>
              <span className="text-xs text-[#5f5e5e]">Showing notes and optional fields</span>
            </div>
            {loadError && (
              <div className="mb-4 rounded-2xl border border-[#e9ecef] bg-white/70 p-3 text-sm text-[#5f5e5e]">
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
                    className="rounded-2xl border border-[#e9ecef] bg-[#f3f4f5] p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-3">
                        <div
                          className="mt-1 h-3 w-3 rounded-full"
                          style={{ backgroundColor: team?.color || '#b51c00' }}
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#191c1d]">{getUserName(workout.oderId)}</p>
                            <span className="text-xs text-[#5f5e5e]">{team?.name || 'Unknown team'}</span>
                            <span className="rounded-full border border-[#e9ecef] px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-[#5f5e5e]">
                              {getWorkoutLabel(workout, workoutTypeConfigs)}
                            </span>
                          </div>
                          <p className="text-xs text-[#8a8786]">{formatPstDate(workout.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[#b51c00]">
                          {formatPreciseNumber(getWorkoutWeightedScore(workout, workoutTypeConfigs))} pts
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a8786]">Time (mins)</p>
                        {isEditing ? (
                          <input
                            type="number"
                            min="1"
                            value={editValues.minutes}
                            onChange={(event) => setEditValues(prev => ({ ...prev, minutes: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-[#e9ecef] bg-white px-3 py-2 text-sm text-[#191c1d]"
                          />
                        ) : (
                          <p className="mt-2 text-base font-semibold text-[#191c1d]">{workout.minutes}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a8786]">Distance (km)</p>
                        {isEditing ? (
                          <input
                            type="number"
                            min="0"
                            value={editValues.distance}
                            onChange={(event) => setEditValues(prev => ({ ...prev, distance: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-[#e9ecef] bg-white px-3 py-2 text-sm text-[#191c1d]"
                          />
                        ) : (
                          <p className="mt-2 text-base font-semibold text-[#191c1d]">
                            {workout.distance ? workout.distance : '—'}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a8786]">Notes</p>
                        {isEditing ? (
                          <textarea
                            rows={2}
                            value={editValues.notes}
                            onChange={(event) => setEditValues(prev => ({ ...prev, notes: event.target.value }))}
                            className="mt-2 w-full rounded-2xl border border-[#e9ecef] bg-white px-3 py-2 text-sm text-[#191c1d]"
                          />
                        ) : (
                          <div className="mt-2 space-y-1 text-sm text-[#5f5e5e]">
                            <p>{workout.notes || '—'}</p>
                            {workout.proofUrl ? (
                              <a
                                href={workout.proofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-semibold text-[#191c1d] transition-colors duration-200 hover:text-[#b51c00]"
                              >
                                View proof
                              </a>
                            ) : (
                              <p className="text-xs text-[#8a8786]">No proof uploaded</p>
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
                            className="rounded-full bg-[#191c1d] px-4 py-2 text-xs font-semibold text-[#f8f9fa]"
                          >
                            Save changes
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-full border border-[#191c1d] px-4 py-2 text-xs font-semibold text-[#191c1d]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(workout)}
                            className="rounded-full border border-[#191c1d] px-4 py-2 text-xs font-semibold text-[#191c1d]"
                          >
                            Edit numbers
                          </button>
                          <button
                            onClick={() => handleDelete(workout.id)}
                            className="rounded-full border border-[#ef4444] px-4 py-2 text-xs font-semibold text-[#ef4444] transition-colors duration-200 hover:bg-[#ef4444] hover:text-white"
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
                <div className="rounded-2xl border border-dashed border-[#d7cdc2] bg-white/60 p-6 text-center text-sm text-[#5f5e5e]">
                  No workouts logged yet.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
              <h3 className="text-lg font-semibold text-[#191c1d] mb-4">Workout type multipliers</h3>
              <div className="space-y-3">
                {(Object.entries(workoutTypeConfigs) as [WorkoutType, WorkoutTypeConfig][]).map(([type, config]) => (
                  <div key={type} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#191c1d]">{config.label}</p>
                      <p className="text-xs text-[#5f5e5e]">{config.description}</p>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      value={workoutMultiplierInputs[type] || ''}
                      onChange={(event) =>
                        setWorkoutMultiplierInputs(prev => ({ ...prev, [type]: event.target.value }))
                      }
                      className="w-24 rounded-2xl border border-[#e9ecef] bg-[#f3f4f5] px-3 py-2 text-sm text-[#191c1d]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
              <h3 className="text-lg font-semibold text-[#191c1d] mb-2">Plan mileage by date</h3>
              <p className="mb-5 text-xs text-[#5f5e5e]">Set mileage for training sessions (points equal mileage).</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {getChallengeDates().map(date => (
                  <div key={date} className="rounded-2xl border border-[#e9ecef] bg-white/70 px-4 py-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.2em] text-[#8a8786]">Date</p>
                    <p className="mt-1 font-semibold text-[#191c1d] text-sm sm:text-base leading-tight break-words">
                      {formatPstDate(date, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <label className="mt-4 block text-xs font-semibold text-[#5f5e5e]">Mileage (pts)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={planMileageInputs[date] || ''}
                      onChange={(event) =>
                        setPlanMileageInputs(prev => ({ ...prev, [date]: event.target.value }))
                      }
                      className="mt-2 w-full rounded-2xl border border-[#e9ecef] bg-[#f3f4f5] px-3 py-2 text-sm text-[#191c1d]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]">
              <h3 className="text-lg font-semibold text-[#191c1d] mb-4">Team multipliers</h3>
              <div className="space-y-3">
                {TEAMS.map(team => (
                  <div key={team.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: team.color }} />
                      <span className="text-sm font-semibold text-[#191c1d]">{team.name}</span>
                    </div>
                    <input
                      type="number"
                      step="0.05"
                      value={teamMultiplierInputs[team.id] || ''}
                      onChange={(event) =>
                        setTeamMultiplierInputs(prev => ({ ...prev, [team.id]: event.target.value }))
                      }
                      className="w-24 rounded-2xl border border-[#e9ecef] bg-[#f3f4f5] px-3 py-2 text-sm text-[#191c1d]"
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={handleSaveMultipliers}
                className="mt-5 w-full rounded-full bg-[#b51c00] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(255,90,31,0.2)] transition-all duration-200 hover:-translate-y-0.5"
              >
                Save multipliers
              </button>

              <p className="mt-3 text-xs text-[#5f5e5e]">
                Updates apply to scoring across the dashboard and leaderboard.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-[#e9ecef] bg-white/80 p-6 text-sm text-[#5f5e5e]">
          <p>
            Tip: If you update multipliers, revisit the leaderboard to see the recalculated totals.
          </p>
        </div>
      </div>
    </div>
  );
}
