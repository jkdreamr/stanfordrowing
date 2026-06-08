import { supabase } from '@/lib/supabaseClient';
import { User, Workout, WorkoutReaction, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';

interface SupabaseWorkoutRow {
  id: string;
  user_id: string;
  user_name: string;
  team_id: string;
  date: string;
  type: WorkoutType;
  minutes: number;
  distance: number | null;
  notes: string | null;
  proof_url: string | null;
  activity_name: string | null;
  workout_reactions?: { user_id: string; created_at: string }[];
  created_at: string;
}

interface SupabaseMultiplierRow {
  scope: 'workout_type' | 'team' | 'plan_mileage';
  key: string;
  value: number;
}

export async function fetchWorkouts(): Promise<Workout[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select('*, workout_reactions(user_id, created_at)')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as SupabaseWorkoutRow[]).map(row => ({
    id: row.id,
    oderId: row.user_id,
    date: row.date,
    type: row.type,
    minutes: row.minutes,
    distance: row.distance ?? undefined,
    notes: row.notes ?? undefined,
    proofUrl: row.proof_url ?? undefined,
    activityName: row.activity_name ?? undefined,
    reactions: (row.workout_reactions ?? []).map(reaction => ({
      userId: reaction.user_id,
      createdAt: reaction.created_at,
    })) satisfies WorkoutReaction[],
    createdAt: row.created_at,
  }));
}

export async function createWorkout(params: {
  user: User;
  type: WorkoutType;
  minutes: number;
  distance?: number;
  notes?: string;
  proofUrl?: string;
  activityName?: string;
  date: string;
}): Promise<Workout> {
  const payload = {
    user_id: params.user.id,
    user_name: params.user.name,
    team_id: params.user.teamId,
    date: params.date,
    type: params.type,
    minutes: params.minutes,
    distance: params.distance ?? null,
    notes: params.notes ?? null,
    proof_url: params.proofUrl ?? null,
    activity_name: params.activityName ?? null,
  };

  const { data, error } = await supabase
    .from('workouts')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  const row = data as SupabaseWorkoutRow;

  return {
    id: row.id,
    oderId: row.user_id,
    date: row.date,
    type: row.type,
    minutes: row.minutes,
    distance: row.distance ?? undefined,
    notes: row.notes ?? undefined,
    proofUrl: row.proof_url ?? undefined,
    activityName: row.activity_name ?? undefined,
    reactions: [],
    createdAt: row.created_at,
  };
}

export async function updateWorkoutRow(workout: Workout): Promise<void> {
  const payload = {
    type: workout.type,
    minutes: workout.minutes,
    distance: workout.distance ?? null,
    notes: workout.notes ?? null,
    proof_url: workout.proofUrl ?? null,
    activity_name: workout.activityName ?? null,
  };

  const { error } = await supabase
    .from('workouts')
    .update(payload)
    .eq('id', workout.id);

  if (error) {
    throw error;
  }
}

export async function deleteWorkoutRow(workoutId: string): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId);

  if (error) {
    throw error;
  }
}

export async function addWorkoutReaction(params: { workoutId: string; userId: string }): Promise<void> {
  const { error } = await supabase
    .from('workout_reactions')
    .insert({ workout_id: params.workoutId, user_id: params.userId });

  if (error) {
    throw error;
  }
}

export async function removeWorkoutReaction(params: { workoutId: string; userId: string }): Promise<void> {
  const { error } = await supabase
    .from('workout_reactions')
    .delete()
    .eq('workout_id', params.workoutId)
    .eq('user_id', params.userId);

  if (error) {
    throw error;
  }
}

export async function fetchMultipliers(): Promise<{
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig>;
  teamMultipliers: Record<string, number>;
  planMileages: Record<string, number>;
}> {
  const { data, error } = await supabase.from('multipliers').select('*');

  if (error) {
    throw error;
  }

  const rows = (data as SupabaseMultiplierRow[]) || [];
  const workoutOverrides: Partial<Record<WorkoutType, number>> = {};
  const teamMultipliers: Record<string, number> = {};
  const planMileages: Record<string, number> = {};

  rows.forEach(row => {
    if (row.scope === 'workout_type') {
      workoutOverrides[row.key as WorkoutType] = row.value;
    } else if (row.scope === 'team') {
      teamMultipliers[row.key] = row.value;
    } else if (row.scope === 'plan_mileage') {
      planMileages[row.key] = row.value;
    }
  });

  const workoutTypeConfigs = Object.fromEntries(
    (Object.entries(WORKOUT_TYPES) as [WorkoutType, WorkoutTypeConfig][]).map(([type, config]) => [
      type,
      {
        ...config,
        multiplier: workoutOverrides[type] ?? config.multiplier,
      },
    ])
  ) as Record<WorkoutType, WorkoutTypeConfig>;

  return { workoutTypeConfigs, teamMultipliers, planMileages };
}

export async function saveMultipliers(params: {
  workoutMultipliers: Partial<Record<WorkoutType, number>>;
  teamMultipliers: Record<string, number>;
  planMileages?: Record<string, number>;
}): Promise<void> {
  const workoutRows = Object.entries(params.workoutMultipliers).map(([key, value]) => ({
    scope: 'workout_type' as const,
    key,
    value,
  }));

  const teamRows = Object.entries(params.teamMultipliers).map(([key, value]) => ({
    scope: 'team' as const,
    key,
    value,
  }));

  const planRows = Object.entries(params.planMileages ?? {}).map(([key, value]) => ({
    scope: 'plan_mileage' as const,
    key,
    value,
  }));

  const { error } = await supabase
    .from('multipliers')
    .upsert([...workoutRows, ...teamRows, ...planRows], { onConflict: 'scope,key' });

  if (error) {
    throw error;
  }
}
