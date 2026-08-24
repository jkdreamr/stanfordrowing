import { WorkoutType } from './types';

/**
 * SMC preseason training outline — the coaches' four-week plan.
 *
 * Scoring is built on this: every prescribed session is worth the same, and it
 * is earned by meeting that session's minimum. Doing more than the minimum
 * earns nothing extra — the premium is on doing the training and reporting it,
 * not on piling up volume.
 */

/** First day of the plan, in PST. Anything logged before this is LEGACY. */
export const PLAN_START = '2026-08-24';
/** Last day of the plan. After this there is nothing left to score. */
export const PLAN_END = '2026-09-20';

/**
 * Bonus for completing one prescribed session, paid on top of what the work
 * itself is worth. Every workout still earns its normal points by type, so
 * doing the plan is always the best — and the easiest — way to score.
 */
export const SESSION_BONUS = 10;

/** Minimum for a "Lift" session — the lift itself plus core and mobility. */
export const LIFT_MIN_MINUTES = 45;
/** Minimum for a "Your Choice" session, which the sheet leaves open. */
export const CHOICE_MIN_MINUTES = 30;

// ---- session categories ----

/** "E (erg or berg)" — steady state on the rowing erg or the bike. */
const ERG_OR_BIKE: WorkoutType[] = [
  'rowing_no_pieces',
  'rowing_with_pieces',
  'cross_bike_stationary',
  'cross_bike_outdoor',
];
/** Erg-specific pieces (3 x 5k, 4 x 4k, 5 x 2k, the 1:40 on/20" off set). */
const ERG_ONLY: WorkoutType[] = ['rowing_no_pieces', 'rowing_with_pieces'];
const RUN: WorkoutType[] = ['cross_run'];
const LIFT: WorkoutType[] = ['lifting_plan', 'lifting_own'];

export type SessionSlot = 'am' | 'pm';

export interface PlanSession {
  slot: SessionSlot;
  /** As written on the sheet. */
  label: string;
  /** Types that can satisfy this session. Empty means anything counts. */
  types: WorkoutType[];
  /** Discipline this session is normally done as; the log form preselects it.
   *  Unset for "Your Choice", where the rower picks. */
  scoreAs?: WorkoutType;
  /** What the sheet asks for — shown as a target, not a gate. */
  minMinutes?: number;
  minMeters?: number;
}

export interface PlanDay {
  date: string;
  week: number;
  /** Empty on an Off day. */
  sessions: PlanSession[];
}

// ---- session builders ----

const steady = (label: string, minMinutes: number): PlanSession => ({
  slot: 'am',
  label,
  types: ERG_OR_BIKE,
  scoreAs: 'rowing_no_pieces',
  minMinutes,
});
const run = (label: string, minMinutes: number): PlanSession => ({
  slot: 'am',
  label,
  types: RUN,
  scoreAs: 'cross_run',
  minMinutes,
});
const ergMeters = (label: string, minMeters: number): PlanSession => ({
  slot: 'am',
  label,
  types: ERG_ONLY,
  scoreAs: 'rowing_with_pieces',
  minMeters,
});
const ergMinutes = (label: string, minMinutes: number): PlanSession => ({
  slot: 'am',
  label,
  types: ERG_ONLY,
  scoreAs: 'rowing_with_pieces',
  minMinutes,
});
const choice = (): PlanSession => ({
  slot: 'am',
  label: 'Your Choice',
  types: [],
  minMinutes: CHOICE_MIN_MINUTES,
});
const lift = (which: 1 | 2 | 3): PlanSession => ({
  slot: 'pm',
  label: `Lift ${which}`,
  types: LIFT,
  scoreAs: 'lifting_plan',
  minMinutes: LIFT_MIN_MINUTES,
});

/**
 * The plan, Monday → Sunday for each of the four weeks. Lifts fall on Monday,
 * Wednesday and Friday every week; Sunday is fully off.
 */
const WEEKS: PlanSession[][][] = [
  // ── Week 1: 8/24 – 8/30 ──
  [
    [steady("60 – 90' E (erg or berg)", 60), lift(1)],
    [steady("60 – 90' E (erg or berg)", 60)],
    [choice(), lift(2)],
    [steady("60 – 90' E (erg or berg)", 60)],
    [run("30 – 60' E RUN", 30), lift(3)],
    [steady("100 – 120' E (erg or berg)", 100)],
    [],
  ],
  // ── Week 2: 8/31 – 9/6 ──
  [
    [steady("60 – 90' E (erg or berg)", 60), lift(1)],
    [steady("100 – 120' E (erg or berg)", 100)],
    [choice(), lift(2)],
    [steady("100 – 120' E (erg or berg)", 100)],
    [run("30 – 60' E/D RUN", 30), lift(3)],
    [steady("120' E (erg or berg)", 120)],
    [],
  ],
  // ── Week 3: 9/7 – 9/13 ──
  [
    [steady("100 – 120' E (erg or berg)", 100), lift(1)],
    [ergMeters('3 x 5k D (3 min rest) erg', 15000)],
    [choice(), lift(2)],
    [steady("100 – 120' E (erg or berg)", 100)],
    [run("30 – 60' E/D RUN", 30), lift(3)],
    [ergMinutes('20 x (1:40 on / 20" off) C (erg)', 40)],
    [],
  ],
  // ── Week 4: 9/14 – 9/20 ──
  [
    [steady("100 – 120' E (erg or berg)", 100), lift(1)],
    [ergMeters('4 x 4k D (2 min rest) erg', 16000)],
    [choice(), lift(2)],
    [steady("100 – 120' E (erg or berg)", 100)],
    [run("30 – 60' E/D RUN", 30), lift(3)],
    [ergMeters('5 x 2k (6k + 4-6), 2 min rest erg', 10000)],
    [],
  ],
];

/** Add `days` days to a YYYY-MM-DD date, staying in plain-date arithmetic. */
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Every day of the plan, keyed by date. */
export const PLAN_DAYS: PlanDay[] = WEEKS.flatMap((week, w) =>
  week.map((sessions, dayIndex) => ({
    date: addDays(PLAN_START, w * 7 + dayIndex),
    week: w + 1,
    sessions,
  }))
);

const BY_DATE = new Map(PLAN_DAYS.map((d) => [d.date, d]));

/** The plan for a date, or undefined when the date is outside the plan. */
export function getPlanDay(date: string): PlanDay | undefined {
  return BY_DATE.get(date);
}

/** Work logged before the plan started — kept visible, but worth nothing. */
export function isLegacyDate(date: string): boolean {
  return date < PLAN_START;
}

/** After the plan's last day there is nothing left to score. */
export function isAfterPlan(date: string): boolean {
  return date > PLAN_END;
}

/** Sessions the plan asks for on a date (empty on Off days and outside it). */
export function sessionsFor(date: string): PlanSession[] {
  return getPlanDay(date)?.sessions ?? [];
}

/**
 * How a plan log records which prescribed session it covered, e.g. "plan:am".
 * The prefix keeps it from ever colliding with an activity name a rower typed.
 */
export const PLAN_CLAIM_PREFIX = 'plan:';

export function encodeSlots(slots: SessionSlot[]): string {
  const order: SessionSlot[] = ['am', 'pm'];
  return PLAN_CLAIM_PREFIX + order.filter((s) => slots.includes(s)).join('+');
}

/** Read the slots back off a logged plan session. Anything else yields none. */
export function decodeSlots(value: string | null | undefined): SessionSlot[] {
  if (!value) return [];
  const trimmed = value.trim().toLowerCase();
  if (!trimmed.startsWith(PLAN_CLAIM_PREFIX)) return [];
  const parts = trimmed.slice(PLAN_CLAIM_PREFIX.length).split('+').map((p) => p.trim());
  const order: SessionSlot[] = ['am', 'pm'];
  return order.filter((s) => parts.includes(s));
}

/** The prescribed session for a slot on a date, if the plan has one. */
export function sessionAt(date: string, slot: SessionSlot): PlanSession | undefined {
  return sessionsFor(date).find((s) => s.slot === slot);
}

/** What a session asks for, as a short human string ("60 min", "15,000 m"). */
export function sessionRequirement(session: PlanSession): string {
  if (session.minMeters) return `${session.minMeters.toLocaleString('en-US')} m`;
  return `${session.minMinutes} min`;
}
