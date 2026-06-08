import { Team, User, Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from './types';

// Teams are reset for the fresh start — groupings will be defined later.
// Everyone is "unassigned" for now; team UI stays hidden until TEAMS is populated.
export const UNASSIGNED_TEAM_ID = 'unassigned';

export const TEAMS: Team[] = [];

// The roster (individuals). Kept independent of teams so we can regroup later
// without touching identities or the email→roster mapping.
export const ALL_USERS: User[] = [
  { id: 'scalfi', name: 'Scalfi', teamId: UNASSIGNED_TEAM_ID },
  { id: 'berwick', name: 'Berwick', teamId: UNASSIGNED_TEAM_ID },
  { id: 'wolfensberger', name: 'Wolfensberger', teamId: UNASSIGNED_TEAM_ID },
  { id: 'donovan-davis', name: 'Donovan-Davis', teamId: UNASSIGNED_TEAM_ID },
  { id: 'freijo', name: 'Freijo', teamId: UNASSIGNED_TEAM_ID },
  { id: 'corbett', name: 'Corbett', teamId: UNASSIGNED_TEAM_ID },
  { id: 'salvi', name: 'Salvi', teamId: UNASSIGNED_TEAM_ID },
  { id: 'george', name: 'George', teamId: UNASSIGNED_TEAM_ID },
  { id: 'hainlein', name: 'Hainlein', teamId: UNASSIGNED_TEAM_ID },
  { id: 'lorgen', name: 'Lorgen', teamId: UNASSIGNED_TEAM_ID },
  { id: 'harvey', name: 'Harvey', teamId: UNASSIGNED_TEAM_ID },
  { id: 'smith', name: 'Smith', teamId: UNASSIGNED_TEAM_ID },
  { id: 'ericson', name: 'Ericson', teamId: UNASSIGNED_TEAM_ID },
  { id: 'albrecht', name: 'Albrecht', teamId: UNASSIGNED_TEAM_ID },
  { id: 'muehl', name: 'Muehl', teamId: UNASSIGNED_TEAM_ID },
  { id: 'endicott', name: 'Endicott', teamId: UNASSIGNED_TEAM_ID },
  { id: 'c-griffin', name: 'C. Griffin', teamId: UNASSIGNED_TEAM_ID },
  { id: 'j-griffin', name: 'J. Griffin', teamId: UNASSIGNED_TEAM_ID },
  { id: 'orio', name: 'Orio', teamId: UNASSIGNED_TEAM_ID },
  { id: 'amodio', name: 'Amodio', teamId: UNASSIGNED_TEAM_ID },
  { id: 'murphy', name: 'Murphy', teamId: UNASSIGNED_TEAM_ID },
  { id: 'skottowe', name: 'Skottowe', teamId: UNASSIGNED_TEAM_ID },
  { id: 'pullinger', name: 'Pullinger', teamId: UNASSIGNED_TEAM_ID },
  { id: 'rivera', name: 'Rivera', teamId: UNASSIGNED_TEAM_ID },
  { id: 'vachris', name: 'Vachris', teamId: UNASSIGNED_TEAM_ID },
  { id: 'celli', name: 'Celli', teamId: UNASSIGNED_TEAM_ID },
  { id: 'routley', name: 'Routley', teamId: UNASSIGNED_TEAM_ID },
  { id: 'stephenson', name: 'Stephenson', teamId: UNASSIGNED_TEAM_ID },
  { id: 'koo', name: 'Koo', teamId: UNASSIGNED_TEAM_ID },
  { id: 'alford', name: 'Alford', teamId: UNASSIGNED_TEAM_ID },
  { id: 'bernstein', name: 'Bernstein', teamId: UNASSIGNED_TEAM_ID },
  { id: 'zammit', name: 'Zammit', teamId: UNASSIGNED_TEAM_ID },
  { id: 'herzog', name: 'Theo Herzog', teamId: UNASSIGNED_TEAM_ID },
];

export const USER_EMAILS: Record<string, string> = {
  'joskoo@stanford.edu': 'koo',
  'orio@stanford.edu': 'orio',
  'abfreijo@stanford.edu': 'freijo',
  'bcelli@stanford.edu': 'celli',
  'braun11@stanford.edu': 'endicott',
  'calber05@stanford.edu': 'berwick',
  'casparg@stanford.edu': 'c-griffin',
  'cvac05@stanford.edu': 'vachris',
  'cmuehl@stanford.edu': 'muehl',
  'dannys29@stanford.edu': 'stephenson',
  'elliott5@stanford.edu': 'donovan-davis',
  'florgen@stanford.edu': 'lorgen',
  'ggeorge8@stanford.edu': 'george',
  'zammit@stanford.edu': 'zammit',
  'vbern@stanford.edu': 'bernstein',
  'hylton@stanford.edu': 'harvey',
  'jacobriv@stanford.edu': 'rivera',
  'code@stanford.edu': 'j-griffin',
  'jamesp26@stanford.edu': 'pullinger',
  'jsalvi05@stanford.edu': 'salvi',
  'thebig0z@stanford.edu': 'routley',
  'herzogt@stanford.edu': 'herzog',
  'kjalford@stanford.edu': 'alford',
  'hainlein@stanford.edu': 'hainlein',
  'lsmith88@stanford.edu': 'smith',
  'marcus06@stanford.edu': 'albrecht',
  'amodio@stanford.edu': 'amodio',
  'mericson@stanford.edu': 'ericson',
  'pwolfens@stanford.edu': 'wolfensberger',
  'raph21@stanford.edu': 'skottowe',
  'sandrosc@stanford.edu': 'scalfi',
  'tcorbett@stanford.edu': 'corbett',
  'tmurphy6@stanford.edu': 'murphy',
  'nilesg@stanford.edu': 'coach-garratt',
  'pojednic@stanford.edu': 'coach-pojednic',
  'tsobolew@stanford.edu': 'coach-sobolewski',
};

export const ADMIN_EMAILS = [
  'joskoo@stanford.edu',
  'jamesp26@stanford.edu',
  'kjalford@stanford.edu',
  'vbern@stanford.edu',
  'zammit@stanford.edu',
  'nilesg@stanford.edu',
  'pojednic@stanford.edu',
  'tsobolew@stanford.edu',
];

export const APP_TIME_ZONE = 'America/Los_Angeles';
const PRECISE_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 5 });

export function getPstDateString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  let year = '';
  let month = '';
  let day = '';
  for (const part of parts) {
    if (part.type === 'year') year = part.value;
    if (part.type === 'month') month = part.value;
    if (part.type === 'day') day = part.value;
  }
  return `${year}-${month}-${day}`;
}

export function formatPstDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const safeDate = new Date(`${dateStr}T12:00:00Z`);
  return safeDate.toLocaleDateString('en-US', { timeZone: APP_TIME_ZONE, ...options });
}

export function formatPstTime(dateTime: string, options?: Intl.DateTimeFormatOptions): string {
  return new Date(dateTime).toLocaleTimeString('en-US', { timeZone: APP_TIME_ZONE, ...options });
}

export function formatPreciseNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const factor = 100000;
  const truncated = Math.trunc(value * factor) / factor;
  const normalized = Object.is(truncated, -0) ? 0 : truncated;
  return PRECISE_NUMBER_FORMATTER.format(normalized);
}

export function getUserByEmail(email: string | null | undefined): User | null {
  if (!email) return null;
  const userId = USER_EMAILS[email.toLowerCase()];
  if (!userId) return null;
  return ALL_USERS.find(user => user.id === userId) || null;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

// Summer challenge date range (adjust as needed)
export const SUMMER_CHALLENGE_START = '2026-06-01';
export const SUMMER_CHALLENGE_END = '2026-08-31';

// Plan mileages by date. Admins set these in the Admin panel; empty by default.
export const DEFAULT_PLAN_MILEAGES: Record<string, number> = {};

// Generate array of dates across the summer challenge window
export function getChallengeDates(): string[] {
  const dates: string[] = [];
  const start = new Date(SUMMER_CHALLENGE_START);
  const end = new Date(SUMMER_CHALLENGE_END);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split('T')[0]);
  }

  return dates;
}

// Days remaining in the challenge from today (clamped at 0)
export function getDaysRemaining(): number {
  const end = new Date(`${SUMMER_CHALLENGE_END}T23:59:59`);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Initials for avatar chips, e.g. "Donovan-Davis" -> "DD", "C. Griffin" -> "CG"
export function getInitials(name: string): string {
  const cleaned = name.replace(/\./g, ' ').replace(/[^a-zA-Z\s-]/g, ' ');
  const parts = cleaned.split(/[\s-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Local storage keys
export const STORAGE_KEYS = {
  WORKOUTS: 'rowing-workouts',
  CURRENT_USER: 'rowing-current-user',
  ADMIN_AUTH: 'rowing-admin-auth',
  WORKOUT_TYPE_MULTIPLIERS: 'rowing-workout-type-multipliers',
  TEAM_MULTIPLIERS: 'rowing-team-multipliers',
};

// Helper functions for local storage
export function getStoredWorkouts(): Workout[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
  return stored ? JSON.parse(stored) : [];
}

export function saveWorkout(workout: Workout): void {
  const workouts = getStoredWorkouts();
  workouts.push(workout);
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
}

export function updateWorkout(updatedWorkout: Workout): void {
  const workouts = getStoredWorkouts().map(workout =>
    workout.id === updatedWorkout.id ? updatedWorkout : workout
  );
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
}

export function deleteWorkout(workoutId: string): void {
  const workouts = getStoredWorkouts().filter(w => w.id !== workoutId);
  localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function clearCurrentUser(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getAdminAuth(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH) === 'true';
}

export function setAdminAuth(isAuthed: boolean): void {
  localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, isAuthed ? 'true' : 'false');
}

export function clearAdminAuth(): void {
  localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
}

export function getStoredWorkoutTypeMultipliers(): Partial<Record<WorkoutType, number>> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEYS.WORKOUT_TYPE_MULTIPLIERS);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveWorkoutTypeMultipliers(multipliers: Partial<Record<WorkoutType, number>>): void {
  localStorage.setItem(STORAGE_KEYS.WORKOUT_TYPE_MULTIPLIERS, JSON.stringify(multipliers));
}

export function getWorkoutTypeConfigs(): Record<WorkoutType, WorkoutTypeConfig> {
  const overrides = getStoredWorkoutTypeMultipliers();
  return Object.fromEntries(
    (Object.entries(WORKOUT_TYPES) as [WorkoutType, WorkoutTypeConfig][]).map(([type, config]) => [
      type,
      {
        ...config,
        multiplier: overrides[type] ?? config.multiplier,
      },
    ])
  ) as Record<WorkoutType, WorkoutTypeConfig>;
}

export function getStoredTeamMultipliers(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(STORAGE_KEYS.TEAM_MULTIPLIERS);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function saveTeamMultipliers(multipliers: Record<string, number>): void {
  localStorage.setItem(STORAGE_KEYS.TEAM_MULTIPLIERS, JSON.stringify(multipliers));
}

export function getTeamScoreMultiplierMap(): Record<string, number> {
  const overrides = getStoredTeamMultipliers();
  return TEAMS.reduce((acc, team) => {
    acc[team.id] = overrides[team.id] ?? team.scoreMultiplier;
    return acc;
  }, {} as Record<string, number>);
}

export function getWorkoutWeightedScore(
  workout: Workout,
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): number {
  const config = workoutTypeConfigs[workout.type];
  const multiplier = config?.multiplier ?? 1;
  const basis = config?.basis ?? 'minutes';
  const value = basis === 'distance' ? workout.distance ?? 0 : workout.minutes;
  return value * multiplier;
}

export function getWorkoutLabel(
  workout: Workout,
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): string {
  return workoutTypeConfigs[workout.type]?.label ?? workout.type.replace(/_/g, ' ');
}

export function getWorkoutPrimaryValue(
  workout: Workout,
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): { value: number; unit: 'mins' | 'km' | 'pts' } {
  if (workout.type === 'training_session') {
    return { value: workout.distance ?? 0, unit: 'pts' };
  }
  const config = workoutTypeConfigs[workout.type];
  if (config?.basis === 'distance') {
    return { value: workout.distance ?? 0, unit: 'km' };
  }
  return { value: workout.minutes, unit: 'mins' };
}

export function getTeamById(teamId: string): Team | undefined {
  return TEAMS.find(t => t.id === teamId);
}

export function getUserById(userId: string): User | undefined {
  return ALL_USERS.find(u => u.id === userId);
}
