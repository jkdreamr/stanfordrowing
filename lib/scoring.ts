import { Workout, WorkoutType, WorkoutTypeConfig } from './types';
import { getLatestDateAnywhere, getWorkoutTypeConfigs } from './data';
import {
  decodeSlots,
  isLegacyDate,
  PlanSession,
  REFERENCE_PACE_M_PER_MIN,
  SESSION_BONUS,
  SessionSlot,
  sessionsFor,
} from './trainingPlan';

/**
 * Every workout earns points for what it is, exactly as before: its value
 * (metres or minutes) times that type's multiplier. On top of that, completing
 * a session the training plan prescribes pays a flat {@link SESSION_BONUS}.
 *
 * So doing the plan is always worth strictly more than the same work logged
 * outside it, and it is the easiest way to score — the bonus is free points on
 * work you were going to do anyway. Everything else still counts.
 *
 * Work logged before the plan started is LEGACY: still visible, worth nothing.
 */

/** Legacy marker type: plan logs used to be stored under this before the reset. */
export const LEGACY_PLAN_TYPE: WorkoutType = 'training_session';

export interface WorkoutScore {
  /** What the work itself was worth, by type and volume. */
  volume: number;
  /** Bonus for the prescribed session(s) this log completed. */
  bonus: number;
  /** volume + bonus. */
  points: number;
  /** Logged before the plan began — visible, but not scored. */
  legacy: boolean;
  /** Plan slots this log successfully claimed. */
  slots: SessionSlot[];
  /** A plan log that claimed nothing (duplicate, or no such session). */
  duplicate: boolean;
}

export interface SessionProgress {
  session: PlanSession;
  done: boolean;
  /** 0–1 of the session's target that was met. */
  fraction: number;
}

export interface DayResult {
  perWorkout: Map<string, WorkoutScore>;
  /** One entry per prescribed session for the day, in sheet order. */
  sessions: SessionProgress[];
  total: number;
}

/**
 * Points for the work itself. A plan log is scored as the discipline the sheet
 * prescribes for that session (an erg session by metres, a lift by minutes),
 * since its own row type is only a marker.
 */
export function volumePoints(
  workout: Workout,
  configs: Record<WorkoutType, WorkoutTypeConfig>,
  scoreAs?: WorkoutType
): number {
  // A plan log stores the discipline it was actually done as, so its own type is
  // what counts. Rows still under the old marker type are rescued by scoreAs, or
  // score nothing: their `distance` held plan points, not metres, so scoring it
  // as a distance would be wildly wrong.
  if (workout.type === LEGACY_PLAN_TYPE) {
    if (!scoreAs) return 0;
    const legacyConfig = configs[scoreAs];
    if (!legacyConfig) return 0;
    const legacyValue =
      legacyConfig.basis === 'distance' ? workout.distance ?? 0 : workout.minutes;
    return legacyValue * legacyConfig.multiplier;
  }
  const config = configs[workout.type];
  if (!config) return 0;
  const value = config.basis === 'distance' ? workout.distance ?? 0 : workout.minutes;
  return value * config.multiplier;
}

/**
 * How much of a session's target the logged work covers, 0–1. The target is in
 * whatever unit the sheet states it in — metres for the k-piece days, minutes
 * everywhere else.
 *
 * When the row is missing that measure but carries the other one, the session is
 * read through {@link REFERENCE_PACE_M_PER_MIN} rather than scored as nothing.
 * A rower who logs 15,000 m and no minutes did the morning session, and an edit
 * that drops a field must never quietly cost them the bonus.
 */
export function sessionFraction(workout: Workout, session: PlanSession): number {
  const required = session.minMeters ?? session.minMinutes ?? 0;
  if (required <= 0) return 1;

  const pace = REFERENCE_PACE_M_PER_MIN[workout.type];
  const meters = workout.distance ?? 0;
  const minutes = workout.minutes;

  const achieved = session.minMeters
    ? meters > 0
      ? meters
      : pace
        ? minutes * pace
        : 0
    : minutes > 0
      ? minutes
      : pace
        ? meters / pace
        : 0;

  return Math.max(0, Math.min(1, achieved / required));
}

/** Score one rower's workouts for one date. A slot can only be claimed once. */
export function scoreDay(
  date: string,
  workouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): DayResult {
  const perWorkout = new Map<string, WorkoutScore>();
  const legacy = isLegacyDate(date);
  // Nobody can have trained tomorrow. The log form blocks future dates, but the
  // client isn't the authority — a row written straight to the API would
  // otherwise let someone claim the whole plan on day one.
  //
  // The line is drawn at the furthest-ahead zone rather than California's date,
  // for two reasons: a rower training in Australia would otherwise have an
  // honest session zeroed for being "tomorrow", and every viewer has to agree on
  // the score regardless of where they open the app.
  const future = date > getLatestDateAnywhere();

  if (legacy || future) {
    for (const w of workouts) {
      perWorkout.set(w.id, {
        volume: 0, bonus: 0, points: 0, legacy: true, slots: [], duplicate: false,
      });
    }
    return { perWorkout, sessions: [], total: 0 };
  }

  const planned = sessionsFor(date);
  const bySlot = new Map<SessionSlot, PlanSession>(planned.map((s) => [s.slot, s]));
  const claimed = new Set<SessionSlot>();
  const fractionBySlot = new Map<SessionSlot, number>();

  const ordered = [...workouts].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  // 1. Plan logs first, earliest wins, so a later duplicate is the one rejected.
  const claimsSlot = (w: Workout) => decodeSlots(w.activityName).length > 0;
  for (const w of ordered) {
    if (!claimsSlot(w)) continue;
    // A claim only counts if the work is something that session could be: you
    // can't tick the morning erg with a game of basketball. Sessions the sheet
    // leaves open ("Your Choice") accept anything.
    const got = decodeSlots(w.activityName).filter((slot) => {
      const session = bySlot.get(slot);
      if (!session || claimed.has(slot)) return false;
      return session.types.length === 0 || session.types.includes(w.type);
    });
    got.forEach((slot) => claimed.add(slot));
    // The work is scored as the first session it covered.
    const scoreAs = got.length > 0 ? bySlot.get(got[0])?.scoreAs : undefined;
    const volume = volumePoints(w, configs, scoreAs);
    // Pro-rated: hitting the sheet's target pays the full bonus, falling short
    // pays that share of it.
    const bonus = got.reduce((sum, slot) => {
      const session = bySlot.get(slot);
      return sum + (session ? SESSION_BONUS * sessionFraction(w, session) : 0);
    }, 0);
    got.forEach((slot) => {
      const session = bySlot.get(slot);
      if (session) fractionBySlot.set(slot, sessionFraction(w, session));
    });
    perWorkout.set(w.id, {
      volume, bonus, points: volume + bonus, legacy: false, slots: got, duplicate: got.length === 0,
    });
  }

  // 2. Everything else earns what the work is worth.
  for (const w of ordered) {
    if (claimsSlot(w)) continue;
    const volume = volumePoints(w, configs);
    perWorkout.set(w.id, {
      volume, bonus: 0, points: volume, legacy: false, slots: [], duplicate: false,
    });
  }

  let total = 0;
  perWorkout.forEach((s) => {
    total += s.points;
  });

  return {
    perWorkout,
    sessions: planned.map((session) => ({
      session,
      done: claimed.has(session.slot),
      fraction: fractionBySlot.get(session.slot) ?? 0,
    })),
    total,
  };
}

/** Score every workout, grouped by rower and date. */
export function scoreWorkouts(
  workouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): Map<string, WorkoutScore> {
  const byUserDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    const key = `${w.oderId}|${w.date}`;
    const list = byUserDate.get(key) ?? [];
    list.push(w);
    byUserDate.set(key, list);
  }
  const out = new Map<string, WorkoutScore>();
  byUserDate.forEach((list, key) => {
    const date = key.slice(key.indexOf('|') + 1);
    scoreDay(date, list, configs).perWorkout.forEach((score, id) => out.set(id, score));
  });
  return out;
}

/** Total points for a set of workouts (legacy work contributes nothing). */
export function totalPoints(
  workouts: Workout[],
  configs: Record<WorkoutType, WorkoutTypeConfig> = getWorkoutTypeConfigs()
): number {
  let sum = 0;
  scoreWorkouts(workouts, configs).forEach((s) => {
    sum += s.points;
  });
  return sum;
}

/** Workouts that count toward the board — everything from the plan onward. */
export function scoringWorkouts(workouts: Workout[]): Workout[] {
  return workouts.filter((w) => !isLegacyDate(w.date));
}

/** How a rower stands against the plan on a date. */
export function planProgress(
  date: string,
  workouts: Workout[],
  configs?: Record<WorkoutType, WorkoutTypeConfig>
): DayResult {
  return scoreDay(date, workouts.filter((w) => w.date === date), configs);
}

/** Slots already logged for a date — used to stop double-claiming. */
export function claimedSlots(date: string, workouts: Workout[]): SessionSlot[] {
  const slots: SessionSlot[] = [];
  planProgress(date, workouts).perWorkout.forEach((s) =>
    s.slots.forEach((slot) => slots.push(slot))
  );
  return slots;
}
