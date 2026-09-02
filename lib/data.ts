import { Team, User, Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from './types';

// Summer training groups, per the coaches' sheet: four training groups plus the
// coxswains. A rower's live team is their `profiles.team_id`, set at signup from
// TEAM_BY_EMAIL below — TEAMS is the display metadata (name + colour) for it.
export const UNASSIGNED_TEAM_ID = 'unassigned';

// `members` is intentionally empty: membership is per-account and lives in the
// database (profiles.team_id), not in this static file.
export const TEAMS: Team[] = [
  { id: 'group-1', name: 'Group 1', color: '#c8202b', members: [], scoreMultiplier: 1 },
  { id: 'group-2', name: 'Group 2', color: '#9aa07e', members: [], scoreMultiplier: 1 },
  { id: 'group-3', name: 'Group 3', color: '#6f93a8', members: [], scoreMultiplier: 1 },
  { id: 'group-4', name: 'Group 4', color: '#cf9445', members: [], scoreMultiplier: 1 },
  { id: 'coxswains', name: 'Coxswains', color: '#c4c8c0', members: [], scoreMultiplier: 1 },
];

// The roster (individuals). Kept independent of teams so we can regroup later
// without touching identities or the email→roster mapping.
export const ALL_USERS: User[] = [
  { id: 'scalfi', name: 'Scalfi', teamId: 'group-2' },
  { id: 'berwick', name: 'Berwick', teamId: 'group-4' },
  { id: 'wolfensberger', name: 'Wolfensberger', teamId: 'group-1' },
  { id: 'donovan-davies', name: 'Donovan-Davies', teamId: 'group-1' },
  { id: 'freijo', name: 'Freijo', teamId: 'group-2' },
  { id: 'corbett', name: 'Corbett', teamId: 'group-4' },
  { id: 'salvi', name: 'Salvi', teamId: 'group-3' },
  { id: 'george', name: 'George', teamId: 'group-3' },
  { id: 'hainlein', name: 'Leo Hainlein', teamId: 'group-2' },
  { id: 'lorgen', name: 'Lorgen', teamId: 'group-1' },
  { id: 'harvey', name: 'Harvey', teamId: 'group-3' },
  { id: 'smith', name: 'Smith', teamId: 'group-1' },
  { id: 'ericson', name: 'Ericson', teamId: 'group-2' },
  { id: 'albrecht', name: 'Albrecht', teamId: 'group-2' },
  { id: 'muehl', name: 'Muehl', teamId: 'group-3' },
  { id: 'endicott', name: 'Endicott', teamId: 'group-3' },
  { id: 'j-griffin', name: 'Jack Griffin', teamId: 'group-1' },
  { id: 'orio', name: 'Orio', teamId: 'group-3' },
  { id: 'amodio', name: 'Hanna-Amodio', teamId: 'group-4' },
  { id: 'murphy', name: 'Murphy', teamId: 'group-2' },
  { id: 'skottowe', name: 'Skottowe', teamId: 'group-1' },
  { id: 'vachris', name: 'Vachris', teamId: 'group-4' },
  { id: 'celli', name: 'Celli', teamId: 'group-1' },
  { id: 'routley', name: 'Routley', teamId: 'group-4' },
  { id: 'stephenson', name: 'Stephenson', teamId: 'group-2' },
  { id: 'koo', name: 'Koo', teamId: 'coxswains' },
  { id: 'alford', name: 'Alford', teamId: 'coxswains' },
  { id: 'bernstein', name: 'Bernstein', teamId: 'coxswains' },
  { id: 'zammit', name: 'Zammit', teamId: 'coxswains' },
  { id: 'herzog', name: 'Theo Herzog', teamId: 'group-4' },
];

export const USER_EMAILS: Record<string, string> = {
  'joskoo@stanford.edu': 'koo',
  'orio@stanford.edu': 'orio',
  'abfreijo@stanford.edu': 'freijo',
  'bcelli@stanford.edu': 'celli',
  'braun11@stanford.edu': 'endicott',
  'calber05@stanford.edu': 'berwick',
  'cvac05@stanford.edu': 'vachris',
  'cmuehl@stanford.edu': 'muehl',
  'dannys29@stanford.edu': 'stephenson',
  'elliott5@stanford.edu': 'donovan-davies',
  'florgen@stanford.edu': 'lorgen',
  'ggeorge8@stanford.edu': 'george',
  'zammit@stanford.edu': 'zammit',
  'vbern@stanford.edu': 'bernstein',
  'hylton@stanford.edu': 'harvey',
  'code@stanford.edu': 'j-griffin',
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

export interface GroupMember {
  /** Name as written on the coaches' sheet. */
  name: string;
  /** Stanford email, when we know it. Blank for rowers we haven't got one for. */
  email?: string;
  teamId: string;
}

/**
 * The training-group sheet — the source of truth for team assignment and for
 * showing who is in which group (including teammates who haven't signed up).
 *
 * This is what every screen reads (see resolveTeamId): the group stored on a
 * profile is only a fallback for someone the sheet has never heard of. Correct
 * a name here and the whole app agrees on the next load.
 *
 * 36 rowers (nine per group) plus the four coxswains.
 */
export const GROUP_ROSTER: GroupMember[] = [
  // ── Group 1 ──
  { name: 'Smith', email: 'lsmith88@stanford.edu', teamId: 'group-1' },
  { name: 'Jack Griffin', email: 'code@stanford.edu', teamId: 'group-1' },
  { name: 'Donovan-Davies', email: 'elliott5@stanford.edu', teamId: 'group-1' },
  { name: 'Wolfensberger', email: 'pwolfens@stanford.edu', teamId: 'group-1' },
  { name: 'Celli', email: 'bcelli@stanford.edu', teamId: 'group-1' },
  { name: 'Lorgen', email: 'florgen@stanford.edu', teamId: 'group-1' },
  { name: 'Skottowe', email: 'raph21@stanford.edu', teamId: 'group-1' },
  { name: 'Ferdi Hainlein', email: 'ferdirfh@stanford.edu', teamId: 'group-1' },
  { name: 'Piersma', email: 'jpiersma@stanford.edu', teamId: 'group-1' },

  // ── Group 2 ──
  { name: 'Scalfi', email: 'sandrosc@stanford.edu', teamId: 'group-2' },
  { name: 'Ericson', email: 'mericson@stanford.edu', teamId: 'group-2' },
  { name: 'Leo Hainlein', email: 'hainlein@stanford.edu', teamId: 'group-2' },
  { name: 'Albrecht', email: 'marcus06@stanford.edu', teamId: 'group-2' },
  { name: 'Freijo', email: 'abfreijo@stanford.edu', teamId: 'group-2' },
  { name: 'Murphy', email: 'tmurphy6@stanford.edu', teamId: 'group-2' },
  { name: 'Stephenson', email: 'dannys29@stanford.edu', teamId: 'group-2' },
  { name: 'Madigan', email: 'mtm1@stanford.edu', teamId: 'group-2' },
  { name: 'Puccinelli', email: 'dompucc@stanford.edu', teamId: 'group-2' },

  // ── Group 3 ──
  { name: 'Salvi', email: 'jsalvi05@stanford.edu', teamId: 'group-3' },
  { name: 'Harvey', email: 'hylton@stanford.edu', teamId: 'group-3' },
  { name: 'George', email: 'ggeorge8@stanford.edu', teamId: 'group-3' },
  { name: 'Orio', email: 'orio@stanford.edu', teamId: 'group-3' },
  { name: 'Endicott', email: 'braun11@stanford.edu', teamId: 'group-3' },
  { name: 'Muehl', email: 'cmuehl@stanford.edu', teamId: 'group-3' },
  { name: 'Auth', email: 'auth@stanford.edu', teamId: 'group-3' },
  { name: 'Pakulis', email: 'tpakulis@stanford.edu', teamId: 'group-3' },
  { name: 'Tubidis', email: 'zorbalzr@stanford.edu', teamId: 'group-3' },

  // ── Group 4 ──
  { name: 'Corbett', email: 'tcorbett@stanford.edu', teamId: 'group-4' },
  { name: 'Berwick', email: 'calber05@stanford.edu', teamId: 'group-4' },
  { name: 'Herzog', email: 'herzogt@stanford.edu', teamId: 'group-4' },
  { name: 'Vachris', email: 'cvac05@stanford.edu', teamId: 'group-4' },
  { name: 'Hanna-Amodio', email: 'amodio@stanford.edu', teamId: 'group-4' },
  { name: 'Routley', email: 'thebig0z@stanford.edu', teamId: 'group-4' },
  { name: 'Frye', email: 'jackfrye@stanford.edu', teamId: 'group-4' },
  { name: 'Petrow', email: 'gzpetrow@stanford.edu', teamId: 'group-4' },
  { name: 'Kelly', email: 'tjkelly@stanford.edu', teamId: 'group-4' },

  // ── Coxswains ──
  { name: 'Koo', email: 'joskoo@stanford.edu', teamId: 'coxswains' },
  { name: 'Alford', email: 'kjalford@stanford.edu', teamId: 'coxswains' },
  { name: 'Zammit', email: 'zammit@stanford.edu', teamId: 'coxswains' },
  { name: 'Bernstein', email: 'vbern@stanford.edu', teamId: 'coxswains' },
];

/** Training group by email. Derived from GROUP_ROSTER so the two can't drift. */
export const TEAM_BY_EMAIL: Record<string, string> = Object.fromEntries(
  GROUP_ROSTER.filter((m) => m.email).map((m) => [m.email as string, m.teamId])
);

/**
 * Normalised surname keys for a name: the surname itself plus, for hyphenated
 * surnames, the trailing part ("Hanna-Amodio" → "hanna-amodio" and "amodio"),
 * so someone who signs up as just "Amodio" still matches.
 */
export function surnameKeys(name: string | null | undefined): string[] {
  if (!name) return [];
  const cleaned = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ') // drop periods, digits, punctuation
    .trim();
  const last = cleaned.split(/\s+/).filter(Boolean).pop();
  if (!last) return [];
  const keys = [last];
  const tail = last.split('-').filter(Boolean).pop();
  if (tail && tail !== last) keys.push(tail);
  return keys;
}

/** First name, normalised. Empty when the name is a bare surname. */
function firstNameKey(name: string | null | undefined): string {
  if (!name) return '';
  const parts = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.length > 1 ? parts[0] : '';
}

/** Training group for an email, or 'unassigned' when we don't know them yet. */
export function getTeamIdForEmail(email: string | null | undefined): string {
  if (!email) return UNASSIGNED_TEAM_ID;
  return TEAM_BY_EMAIL[email.trim().toLowerCase()] ?? UNASSIGNED_TEAM_ID;
}

/**
 * The roster entry whose name matches, by surname and — when a surname is
 * shared — by first name too. There are two Hainleins (Ferdi in Group 1, Leo
 * in Group 2), so "Ferdi Hainlein" and "Leopold Hainlein" both resolve while a
 * bare "Hainlein" stays unmatched rather than being guessed at. First names
 * match on either being a prefix of the other, so Leo also matches Leopold.
 */
function rosterEntryByName(name: string | null | undefined): GroupMember | undefined {
  const keys = surnameKeys(name);
  if (keys.length === 0) return undefined;
  const candidates = GROUP_ROSTER.filter((m) =>
    surnameKeys(m.name).some((k) => keys.includes(k))
  );
  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) return undefined;

  const first = firstNameKey(name);
  if (!first) return undefined; // shared surname with nothing to tell them apart
  const narrowed = candidates.filter((m) => {
    const theirs = firstNameKey(m.name);
    return !!theirs && (theirs.startsWith(first) || first.startsWith(theirs));
  });
  return narrowed.length === 1 ? narrowed[0] : undefined;
}

/**
 * Training group for someone signing up: their email if we have it, otherwise
 * their name against the sheet. Falls back to 'unassigned' rather than guessing
 * when a name could belong to more than one rower.
 */
export function getTeamIdForPerson(
  email: string | null | undefined,
  name: string | null | undefined
): string {
  const byEmail = getTeamIdForEmail(email);
  if (byEmail !== UNASSIGNED_TEAM_ID) return byEmail;
  return rosterEntryByName(name)?.teamId ?? UNASSIGNED_TEAM_ID;
}

/** The roster entry an account corresponds to — email first, then name. */
export function rosterEntryFor(
  email: string | null | undefined,
  name: string | null | undefined
): GroupMember | undefined {
  const e = email?.trim().toLowerCase();
  const byEmail = e ? GROUP_ROSTER.find((m) => m.email === e) : undefined;
  return byEmail ?? rosterEntryByName(name);
}

/**
 * The group an account belongs to.
 *
 * profiles.team_id is stamped once at sign-up and never revisited, so anyone
 * who joined before the sheet existed — or before we had their email — keeps a
 * stale group for good. That is how Kelly and Frye ended up 'unassigned' while
 * the sheet had them in Group 4 all along. Reading the sheet here instead means
 * a correction lands everywhere on the next load, with no data migration and no
 * way for the two to drift apart again.
 *
 * Someone the sheet has never heard of — a walk-on, a coach — keeps whatever
 * their profile was given.
 */
export function resolveTeamId(
  email: string | null | undefined,
  name: string | null | undefined,
  storedTeamId?: string | null
): string {
  // `||`, not `??`: team_id is NOT NULL in the database, so a missing group
  // arrives as an empty string rather than null.
  const stored = storedTeamId || UNASSIGNED_TEAM_ID;

  // An address on the sheet identifies someone outright, so it always wins.
  const byEmail = getTeamIdForEmail(email);
  if (byEmail !== UNASSIGNED_TEAM_ID) return byEmail;

  // A surname is only a guess. It is good enough to place a rower the sheet has
  // never assigned, and not good enough to move one who already has a group —
  // otherwise a walk-on who happens to be another Smith would be dragged into
  // Group 1 on sight.
  if (stored !== UNASSIGNED_TEAM_ID) return stored;
  return rosterEntryFor(email, name)?.teamId ?? UNASSIGNED_TEAM_ID;
}

export const ADMIN_EMAILS = [
  'joskoo@stanford.edu', // Koo
  'kjalford@stanford.edu', // Kannan Alford
  'sandrosc@stanford.edu', // Sandro Scalfi
];

export const APP_TIME_ZONE = 'America/Los_Angeles';
// Display rounds to 1 decimal — scoring/sorting still use the exact value,
// this only formats the rendered label (so pills read "+5.1", not "+5.06275").
const PRECISE_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });

/** YYYY-MM-DD for an instant, read in a particular zone. */
function dateStringInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
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

/**
 * The squad's shared calendar day. Anything every rower sees the same way —
 * streaks, the weekly card, badges — is anchored here on purpose, so the board
 * reads identically whether you open it in Palo Alto or in Athens.
 */
export function getPstDateString(date: Date = new Date()): string {
  return dateStringInZone(date, APP_TIME_ZONE);
}

/**
 * The date on the rower's own wall, from their device.
 *
 * Half the squad trains abroad over the summer, and their day is the one that
 * matters when they log: someone finishing a session at 21:00 in Germany is
 * eight hours into a day California has not started yet. Used for what a rower
 * may pick in the log form — never for anything another rower reads, which
 * would make the board depend on who is looking at it.
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The latest calendar date in progress anywhere on earth (UTC+14).
 *
 * The scorer needs a "nobody can have trained later than this" line that is the
 * same for every viewer. Reading it in the furthest-ahead zone means a rower in
 * Auckland is never told their Thursday session is in the future, while still
 * refusing a row dated next week.
 */
export function getLatestDateAnywhere(date: Date = new Date()): string {
  return dateStringInZone(date, 'Pacific/Kiritimati');
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

// Whole meters with thousands separators (e.g. 15382 -> "15,382"). Kept distinct
// from compact "K" notation so a meters total never reads as kilometers.
const METERS_FORMATTER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

export function formatMeters(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return METERS_FORMATTER.format(Math.round(value));
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

// Scoring lives in lib/scoring.ts now: every workout earns its volume points
// (type multiplier x value) and a completed plan session adds a flat bonus.

export function getWorkoutLabel(
  workout: Workout,
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): string {
  return workoutTypeConfigs[workout.type]?.label ?? workout.type.replace(/_/g, ' ');
}

export function getWorkoutPrimaryValue(
  workout: Workout,
  workoutTypeConfigs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): { value: number; unit: 'mins' | 'm' | 'pts' } {
  if (workout.type === 'training_session') {
    return { value: workout.distance ?? 0, unit: 'pts' };
  }
  const config = workoutTypeConfigs[workout.type];
  if (config?.basis === 'distance') {
    return { value: workout.distance ?? 0, unit: 'm' };
  }
  return { value: workout.minutes, unit: 'mins' };
}

export function getTeamById(teamId: string): Team | undefined {
  return TEAMS.find(t => t.id === teamId);
}

export function getUserById(userId: string): User | undefined {
  return ALL_USERS.find(u => u.id === userId);
}
