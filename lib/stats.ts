import { Workout, WorkoutType, WorkoutTypeConfig } from './types';
import {
  APP_TIME_ZONE,
  getPstDateString,
  getWorkoutPrimaryValue,
  getWorkoutWeightedScore,
} from './data';

// ---- date helpers ----

/** YYYY-MM-DD (PST) for N days before today. offset 0 = today. */
function pstDateNDaysAgo(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return getPstDateString(d);
}

/** Last 7 calendar dates (PST), oldest first. */
export function last7Dates(): string[] {
  return Array.from({ length: 7 }, (_, i) => pstDateNDaysAgo(6 - i));
}

/** Short weekday labels for the last 7 days, oldest first (e.g. M T W ...). */
export function last7DayLabels(): string[] {
  return last7Dates().map((dateStr) =>
    new Date(`${dateStr}T12:00:00Z`)
      .toLocaleDateString('en-US', { timeZone: APP_TIME_ZONE, weekday: 'narrow' })
  );
}

// ---- aggregates ----

export interface RowerAggregate {
  totalWorkouts: number;
  totalPoints: number; // weighted score
  totalMeters: number; // sum of distance-basis raw values (meters)
  totalMinutes: number;
  streak: number;
  lastActiveDate: string | null;
}

export function aggregateRower(
  workouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig>
): RowerAggregate {
  let totalPoints = 0;
  let totalMeters = 0;
  let totalMinutes = 0;
  let lastActiveDate: string | null = null;

  for (const w of workouts) {
    totalPoints += getWorkoutWeightedScore(w, configs);
    totalMinutes += w.minutes;
    const primary = getWorkoutPrimaryValue(w, configs);
    if (primary.unit === 'm') totalMeters += primary.value;
    if (!lastActiveDate || w.date > lastActiveDate) lastActiveDate = w.date;
  }

  return {
    totalWorkouts: workouts.length,
    totalPoints,
    totalMeters,
    totalMinutes,
    streak: getStreak(workouts),
    lastActiveDate,
  };
}

/** Consecutive-day streak (PST) counting back from today or yesterday. */
export function getStreak(workouts: Workout[]): number {
  if (workouts.length === 0) return 0;
  const days = new Set(workouts.map((w) => w.date));
  const today = getPstDateString();
  const yesterday = pstDateNDaysAgo(1);

  // Streak is alive only if there is activity today or yesterday.
  let cursor: string;
  if (days.has(today)) cursor = today;
  else if (days.has(yesterday)) cursor = yesterday;
  else return 0;

  let streak = 0;
  const d = new Date(`${cursor}T12:00:00Z`);
  // walk backwards while each day has activity
  while (days.has(getPstDateString(d))) {
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export interface WeeklySummary {
  points: number;
  workouts: number;
  meters: number;
  perDayPoints: number[]; // length 7, oldest first
  dayLabels: string[];
}

export function getWeeklySummary(
  workouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig>
): WeeklySummary {
  const dates = last7Dates();
  const index = new Map(dates.map((d, i) => [d, i]));
  const perDayPoints = new Array(7).fill(0);
  let points = 0;
  let meters = 0;
  let count = 0;

  for (const w of workouts) {
    const i = index.get(w.date);
    if (i === undefined) continue;
    const score = getWorkoutWeightedScore(w, configs);
    perDayPoints[i] += score;
    points += score;
    count += 1;
    const primary = getWorkoutPrimaryValue(w, configs);
    if (primary.unit === 'm') meters += primary.value;
  }

  return { points, workouts: count, meters, perDayPoints, dayLabels: last7DayLabels() };
}

/** Per-day workout counts over the last 7 days (for sparklines). */
export function last7Counts(workouts: Workout[]): number[] {
  const dates = last7Dates();
  const index = new Map(dates.map((d, i) => [d, i]));
  const counts = new Array(7).fill(0);
  for (const w of workouts) {
    const i = index.get(w.date);
    if (i !== undefined) counts[i] += 1;
  }
  return counts;
}

// ---- badges ----

export type BadgeKind = 'pr' | 'long' | 'early' | 'big_week';

export interface Badge {
  kind: BadgeKind;
  label: string;
}

/**
 * Derive badges for a single workout, given that author's full workout list.
 * Heuristics are intentionally conservative so badges stay meaningful.
 */
export function getWorkoutBadges(
  workout: Workout,
  authorWorkouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig>
): Badge[] {
  const badges: Badge[] = [];
  const primary = getWorkoutPrimaryValue(workout, configs);

  // PR — strictly the author's best value for this workout type (needs history)
  const sameType = authorWorkouts.filter((w) => w.type === workout.type);
  if (sameType.length >= 2) {
    const best = Math.max(
      ...sameType.map((w) => getWorkoutPrimaryValue(w, configs).value)
    );
    if (primary.value > 0 && primary.value >= best) {
      badges.push({ kind: 'pr', label: 'PR' });
    }
  }

  // Long one — a notably big single session
  const isLong =
    (primary.unit === 'm' && primary.value >= 15000) ||
    (primary.unit === 'mins' && primary.value >= 90) ||
    (primary.unit === 'pts' && primary.value >= 20);
  if (isLong) badges.push({ kind: 'long', label: 'Long one' });

  // Early — logged before 7am local time
  if (workout.createdAt) {
    const hour = Number(
      new Date(workout.createdAt).toLocaleTimeString('en-US', {
        timeZone: APP_TIME_ZONE,
        hour: '2-digit',
        hour12: false,
      })
    );
    if (Number.isFinite(hour) && hour < 7) {
      badges.push({ kind: 'early', label: 'Early' });
    }
  }

  // Big week — author has stacked serious volume in the last 7 days,
  // attached only to their most recent workout to avoid spamming the feed.
  const week = getWeeklySummary(authorWorkouts, configs);
  const mostRecent = authorWorkouts.reduce<string>(
    (acc, w) => ((w.createdAt || '') > acc ? w.createdAt || '' : acc),
    ''
  );
  if (week.points >= 60 && workout.createdAt === mostRecent && mostRecent !== '') {
    badges.push({ kind: 'big_week', label: 'Big week' });
  }

  return badges;
}

/** Relative time like "just now", "2h ago", "3d ago". */
export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Material Symbols glyph for a workout type. */
export function workoutIcon(type: string): string {
  if (type.startsWith('rowing')) return 'rowing';
  if (type === 'training_session') return 'event_available';
  if (type.startsWith('lifting')) return 'fitness_center';
  if (type === 'cross_run') return 'directions_run';
  if (type.startsWith('cross_bike')) return 'directions_bike';
  if (type === 'cross_swim') return 'pool';
  if (type === 'cross_ball_sports') return 'sports_basketball';
  if (type.startsWith('cross_ski')) return 'downhill_skiing';
  return 'bolt';
}

/** Pretty-print the primary value of a workout. */
export function formatPrimary(value: number, unit: 'mins' | 'm' | 'pts'): string {
  if (unit === 'mins') return value.toFixed(0);
  if (unit === 'm') return Math.round(value).toLocaleString('en-US');
  // pts
  return value.toFixed(value >= 100 ? 0 : 1);
}

/** Build an SVG polyline path string from values, normalized to a viewbox. */
export function sparklinePath(
  values: number[],
  width = 100,
  height = 30,
  pad = 2
): string {
  if (values.length === 0) return '';
  const max = Math.max(...values, 1);
  const innerH = height - pad * 2;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = +(i * step).toFixed(2);
      const y = +(height - pad - (v / max) * innerH).toFixed(2);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');
}
