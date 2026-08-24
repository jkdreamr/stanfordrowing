'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { formatMeters, formatPreciseNumber, formatPstDate, getPstDateString } from '@/lib/data';
import { getAllProfiles, getProfileByAuthId, isStanfordEmail, profileToUser } from '@/lib/userProfile';
import { createNotifications } from '@/lib/notifications';
import { Mentionable, parseMentions, useMentionAutocomplete } from '@/lib/mentions';
import { User, Workout, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { createWorkout, fetchMultipliers, fetchWorkouts } from '@/lib/supabaseData';
import { claimedSlots, scoreDay } from '@/lib/scoring';
import {
  encodeSlots,
  isAfterPlan,
  isLegacyDate,
  PLAN_CLAIM_PREFIX,
  PLAN_END,
  PLAN_START,
  SESSION_BONUS,
  SessionSlot,
  sessionRequirement,
  sessionsFor,
} from '@/lib/trainingPlan';
import Icon from '../components/Icon';
import MentionDropdown from '../components/MentionDropdown';

/** Simplified category for the big-button picker. */
type Category = 'erg' | 'row' | 'lift' | 'run' | 'bike' | 'swim' | 'other' | 'session';

const CATEGORIES: { value: Category; label: string; icon: string }[] = [
  { value: 'erg', label: 'Erg', icon: 'rowing' },
  { value: 'row', label: 'Row', icon: 'kayaking' },
  { value: 'lift', label: 'Lift', icon: 'fitness_center' },
  { value: 'run', label: 'Run', icon: 'directions_run' },
  { value: 'bike', label: 'Bike', icon: 'directions_bike' },
  { value: 'swim', label: 'Swim', icon: 'pool' },
  { value: 'other', label: 'Other', icon: 'bolt' },
  { value: 'session', label: 'Session', icon: 'event_available' },
];

const inputClass =
  'focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-4 py-3 text-charcoal text-[14px] placeholder:text-charcoal-light transition-colors disabled:opacity-40';

// Exact international mile, so a run logged in miles converts to meters with no
// rounding — points are scored on the precise meters, only the display rounds.
const METERS_PER_MILE = 1609.344;

export default function LogWorkout() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [hasPieces, setHasPieces] = useState(false);
  const [liftPlan, setLiftPlan] = useState(true);
  const [bikeOutdoor, setBikeOutdoor] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(getPstDateString());
  const [minutes, setMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>('');
  // Runners can log in miles; we convert to meters on save so the feed/board stay in meters.
  const [runUnit, setRunUnit] = useState<'m' | 'mi'>('m');
  const [notes, setNotes] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofFileInputKey, setProofFileInputKey] = useState(0);
  const [proofUploadError, setProofUploadError] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [activityName, setActivityName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastScore, setLastScore] = useState(0);
  const [workoutTypeConfigs, setWorkoutTypeConfigs] = useState<Record<WorkoutType, WorkoutTypeConfig>>(WORKOUT_TYPES);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  /** Which of the day's prescribed sessions the rower is logging. */
  const [selectedSlots, setSelectedSlots] = useState<SessionSlot[]>([]);
  /** What they actually did for each ticked session — metres or minutes. */
  const [sessionWork, setSessionWork] = useState<Record<string, string>>({});
  /** For a "Your Choice" session, the discipline they actually did. */
  const [choiceType, setChoiceType] = useState<Record<string, WorkoutType>>({});
  /** Time on a session scored by distance — recorded, not scored. */
  const [sessionMinutes, setSessionMinutes] = useState<Record<string, string>>({});
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [notStanford, setNotStanford] = useState(false);
  const [mentionables, setMentionables] = useState<Mentionable[]>([]);
  const [notesFocused, setNotesFocused] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const notesMention = useMentionAutocomplete(notes, setNotes, mentionables, notesRef);

  const resolveUser = async (authId: string | undefined, email: string | undefined) => {
    if (!authId || !email) { setSelectedUser(null); setIsAuthLoading(false); return; }
    if (!isStanfordEmail(email)) { setNotStanford(true); setIsAuthLoading(false); return; }
    const profile = await getProfileByAuthId(authId);
    setSelectedUser(profile ? profileToUser(profile) : null);
    setIsAuthLoading(false);
  };

  useEffect(() => {
    const loadMultipliers = async () => {
      try {
        const { workoutTypeConfigs: configs } = await fetchMultipliers();
        setWorkoutTypeConfigs(configs);
      } catch {
        setWorkoutTypeConfigs(WORKOUT_TYPES);
      }
    };
    loadMultipliers();
    // The rower's own log, so we know which sessions they've already ticked off.
    fetchWorkouts().then(setAllWorkouts).catch(() => {});
    getAllProfiles()
      .then((profiles) => setMentionables(profiles.map((p) => ({ id: p.id, name: p.name }))))
      .catch(() => {});
    supabase.auth.getSession().then(({ data }) =>
      resolveUser(data.session?.user.id, data.session?.user.email)
    );
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUser(session?.user.id, session?.user.email);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  const myWorkouts = useMemo(
    () => (selectedUser ? allWorkouts.filter((w) => w.oderId === selectedUser.id) : []),
    [allWorkouts, selectedUser]
  );
  /** What the sheet prescribes for the chosen date. */
  const daySessions = useMemo(() => sessionsFor(sessionDate), [sessionDate]);
  /** Sessions already logged for that date — can't be claimed twice. */
  const alreadyClaimed = useMemo(
    () => claimedSlots(sessionDate, myWorkouts),
    [sessionDate, myWorkouts]
  );
  const beforePlan = isLegacyDate(sessionDate);
  const afterPlan = isAfterPlan(sessionDate);
  const openSlots = daySessions.filter((s) => !alreadyClaimed.includes(s.slot));

  const toggleSlot = (slot: SessionSlot) => {
    setFormError('');
    setSelectedSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  /**
   * The discipline a session is logged as. Fixed for prescribed sessions; for
   * "Your Choice" the rower picks, so their work is scored like any other.
   */
  const typeForSession = (session: { slot: SessionSlot; scoreAs?: WorkoutType }): WorkoutType =>
    choiceType[session.slot] ?? session.scoreAs ?? 'rowing_no_pieces';

  /** Disciplines a session may be logged as; more than one means the rower picks. */
  const optionsForSession = (session: { types: WorkoutType[] }): WorkoutType[] =>
    session.types.length > 0
      ? session.types
      : (Object.keys(WORKOUT_TYPES) as WorkoutType[]).filter((x) => x !== 'training_session');

  /** Whether a session's work is measured in metres rather than minutes. */
  const sessionBasis = (session: { slot: SessionSlot; scoreAs?: WorkoutType }): 'minutes' | 'distance' => {
    const t = typeForSession(session);
    return (workoutTypeConfigs[t] ?? WORKOUT_TYPES[t]).basis;
  };

  const resolveWorkoutType = (): WorkoutType => {
    if (category === 'session') return 'training_session';
    if (category === 'erg') return hasPieces ? 'rowing_with_pieces' : 'rowing_no_pieces';
    if (category === 'row') return hasPieces ? 'rowing_with_pieces' : 'rowing_no_pieces';
    if (category === 'lift') return liftPlan ? 'lifting_plan' : 'lifting_own';
    if (category === 'run') return 'cross_run';
    if (category === 'bike') return bikeOutdoor ? 'cross_bike_outdoor' : 'cross_bike_stationary';
    if (category === 'swim') return 'cross_swim';
    return 'cross_ball_sports';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !category) return;

    const type = resolveWorkoutType();
    const config = workoutTypeConfigs[type] ?? WORKOUT_TYPES[type];
    const basis = config?.basis ?? 'minutes';
    const loggingMiles = category === 'run' && runUnit === 'mi';
    const enteredDistance = parseFloat(distanceKm) || 0;
    // Store meters always — convert from miles exactly so points stay precise.
    const distanceValue = loggingMiles ? enteredDistance * METERS_PER_MILE : enteredDistance;
    // Never let a typed activity name look like a plan claim.
    const safeActivityName = activityName.trim().toLowerCase().startsWith(PLAN_CLAIM_PREFIX)
      ? activityName.trim().slice(PLAN_CLAIM_PREFIX.length).trim()
      : activityName.trim();

    // Validate with visible feedback — never fail silently (a dead-looking button).
    if (category === 'session') {
      if (sessionDate > getPstDateString()) {
        setFormError("You can't log a session before you've done it."); return;
      }
      const validSlots = selectedSlots.filter((slot) => daySessions.some((x) => x.slot === slot));
      if (validSlots.length === 0) { setFormError('Pick which session you completed.'); return; }
    } else if (category === 'other' && !activityName.trim()) {
      setFormError('Name the activity first.'); return;
    } else if (basis === 'minutes' && minutes <= 0) {
      setFormError('Enter how many minutes you did.'); return;
    } else if (basis === 'distance' && distanceValue <= 0) {
      setFormError(loggingMiles ? 'Enter your distance in miles.' : 'Enter your distance in meters.'); return;
    }

    setFormError('');
    setProofUploadError('');
    setIsSubmitting(true);

    const date = category === 'session' ? sessionDate : getPstDateString();

    try {
      // Upload proof files FIRST so the workout is never saved without its proof,
      // and so a failed upload can't leave the button stuck (everything is awaited).
      const uploadedUrls: string[] = [];
      if (proofFiles.length > 0) {
        setIsUploadingProof(true);
        const ownerId = selectedUser.id;
        for (const file of proofFiles) {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const filePath = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('workout-proofs')
            .upload(filePath, file, { cacheControl: '3600', contentType: file.type || undefined });
          if (uploadError) throw new Error(uploadError.message);
          uploadedUrls.push(supabase.storage.from('workout-proofs').getPublicUrl(filePath).data.publicUrl);
        }
        setIsUploadingProof(false);
      }

      const proofUrlValue = uploadedUrls[0] ?? (proofUrl.trim() || undefined);

      // A plan log is one row per prescribed session, so each carries its own
      // work and earns its own bonus.
      const created: Workout[] = [];
      if (category === 'session') {
        for (const session of daySessions.filter((x) => selectedSlots.includes(x.slot))) {
          const raw = Number(sessionWork[session.slot] ?? '');
          const value = Number.isFinite(raw) && raw > 0 ? raw : 0;
          const asDistance = sessionBasis(session) === 'distance';
          created.push(
            await createWorkout({
              user: selectedUser,
              type: typeForSession(session),
              minutes: asDistance ? Math.max(0, Number(sessionMinutes[session.slot] ?? '') || 0) : value,
              distance: asDistance && value > 0 ? value : undefined,
              notes: notes || undefined,
              proofUrl: proofUrlValue,
              proofUrls: uploadedUrls.length > 1 ? uploadedUrls : undefined,
              // Records which prescribed session this row covered.
              activityName: encodeSlots([session.slot]),
              date,
            })
          );
        }
      } else {
        created.push(
          await createWorkout({
            user: selectedUser,
            type,
            minutes: basis === 'minutes' ? minutes : 0,
            distance: distanceValue > 0 ? distanceValue : undefined,
            notes: notes || undefined,
            proofUrl: proofUrlValue,
            proofUrls: uploadedUrls.length > 1 ? uploadedUrls : undefined,
            activityName: safeActivityName || undefined,
            date,
          })
        );
      }
      const createdWorkout = created[0];

      const mentioned = notes.trim() ? parseMentions(notes, mentionables) : [];
      if (mentioned.length > 0) {
        void createNotifications(
          mentioned.map((id) => ({
            recipientId: id,
            actorId: selectedUser.id,
            actorName: selectedUser.name,
            kind: 'mention' as const,
            targetType: 'workout' as const,
            targetId: createdWorkout.id,
            targetOwnerId: selectedUser.id,
            preview: notes,
          }))
        );
      }

      const sameDay = [...myWorkouts.filter((w) => w.date === date), ...created];
      const dayScores = scoreDay(date, sameDay, workoutTypeConfigs).perWorkout;
      setLastScore(created.reduce((sum, w) => sum + (dayScores.get(w.id)?.points ?? 0), 0));
      setAllWorkouts((prev) => [...prev, ...created]);
      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); resetForm(); }, 2500);
    } catch (err) {
      const msg = (err as Error)?.message;
      setProofUploadError(msg ? `Upload failed: ${msg}` : '');
      setFormError('Could not log it. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
      setIsUploadingProof(false);
    }
  };

  const resetForm = () => {
    setCategory(null);
    setHasPieces(false);
    setLiftPlan(true);
    setBikeOutdoor(false);
    setSessionDate(getPstDateString());
    setSelectedSlots([]);
    setSessionWork({});
    setSessionMinutes({});
    setChoiceType({});
    setMinutes(0);
    setDistanceKm('');
    setRunUnit('m');
    setNotes('');
    setProofUrl('');
    setProofFiles([]);
    setProofFileInputKey((p) => p + 1);
    setProofUploadError('');
    setActivityName('');
    setIsSubmitting(false);
    setFormError('');
  };

  if (isAuthLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  if (notStanford) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-[14px] font-semibold text-charcoal">Stanford accounts only</p>
        <p className="mt-1 text-[12px] text-charcoal-muted">Sign in with your @stanford.edu account.</p>
        <Link href="/login" className="focus-ring mt-4 inline-block rounded-full bg-coral px-4 py-2 text-[12px] font-semibold text-white">
          Back to login
        </Link>
      </div>
    );
  }

  if (!selectedUser) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <p className="text-[14px] font-semibold text-charcoal">Sign in to log a workout</p>
        <Link href="/login" className="focus-ring mt-4 inline-block rounded-full bg-coral px-4 py-2 text-[12px] font-semibold text-white">
          Log in
        </Link>
      </div>
    );
  }

  // Success state
  if (showSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10">
          <Icon name="check" size={28} className="text-success" />
        </div>
        <p className="text-lg font-semibold text-charcoal">Logged.</p>
        <p className="mt-1 text-[13px] text-charcoal-muted">
          +{formatPreciseNumber(lastScore)} pts for the squad.
        </p>
      </div>
    );
  }

  // Resolve which fields to show based on category
  const type = category ? resolveWorkoutType() : null;
  const config = type ? workoutTypeConfigs[type] ?? WORKOUT_TYPES[type] : null;
  const basis = config?.basis ?? 'minutes';
  const needsDistance = basis === 'distance';
  // Miles is a logging convenience for runs only; everything else is meters.
  const distUnit = category === 'run' ? runUnit : 'm';
  const milesPreviewMeters =
    distUnit === 'mi' ? (parseFloat(distanceKm) || 0) * METERS_PER_MILE : 0;

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Log the work
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category buttons — big, physical */}
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">What did you do?</p>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => { setCategory(cat.value); setFormError(''); }}
                className={`focus-ring flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-xl border py-3 transition-all active:scale-95 touch-manipulation ${
                  category === cat.value
                    ? 'border-coral bg-coral-soft text-coral'
                    : 'border-stone/40 bg-bone-dark/30 text-charcoal-soft hover:border-stone'
                }`}
              >
                <Icon name={cat.icon} size={24} />
                <span className="text-[11px] font-semibold">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-options — only when relevant */}
        {category && (category === 'erg' || category === 'row') && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setHasPieces(false)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${!hasPieces ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              Steady state
            </button>
            <button type="button" onClick={() => setHasPieces(true)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${hasPieces ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              With pieces
            </button>
          </div>
        )}

        {category === 'lift' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setLiftPlan(true)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${liftPlan ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              Team plan
            </button>
            <button type="button" onClick={() => setLiftPlan(false)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${!liftPlan ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              Own workout
            </button>
          </div>
        )}

        {category === 'bike' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => setBikeOutdoor(false)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${!bikeOutdoor ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              Stationary
            </button>
            <button type="button" onClick={() => setBikeOutdoor(true)} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${bikeOutdoor ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
              Outdoor
            </button>
          </div>
        )}

        {category === 'run' && (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Log distance in</label>
            <div className="flex gap-2" role="group" aria-label="Distance unit">
              <button type="button" onClick={() => { setRunUnit('m'); setFormError(''); }} aria-pressed={runUnit === 'm'} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${runUnit === 'm' ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
                Meters
              </button>
              <button type="button" onClick={() => { setRunUnit('mi'); setFormError(''); }} aria-pressed={runUnit === 'mi'} className={`focus-ring flex-1 min-h-[44px] rounded-lg py-3 text-[13px] font-semibold transition-colors touch-manipulation ${runUnit === 'mi' ? 'bg-charcoal text-bone' : 'border border-stone/40 text-charcoal-muted'}`}>
                Miles
              </button>
            </div>
          </div>
        )}

        {category === 'other' && (
          <input
            type="text"
            value={activityName}
            onChange={(e) => { setActivityName(e.target.value); setFormError(''); }}
            placeholder="What was it? e.g. Basketball"
            className={inputClass}
          />
        )}

        {/* Fields — only show what's needed */}
        {category && category !== 'session' && (
          <div className="space-y-3">
            {needsDistance ? (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">
                  Distance ({distUnit === 'mi' ? 'miles' : 'm'})
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="next"
                  value={distanceKm}
                  onChange={(e) => { setDistanceKm(e.target.value); setFormError(''); }}
                  placeholder={distUnit === 'mi' ? 'e.g. 3.1' : '0'}
                  step="any"
                  min="0"
                  className={inputClass}
                />
                {distUnit === 'mi' && milesPreviewMeters > 0 && (
                  <p className="mt-1.5 text-[11px] text-charcoal-muted">
                    Logs as <span className="font-semibold text-charcoal-soft tabular">≈ {formatMeters(milesPreviewMeters)} m</span> · scored on the exact distance
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Minutes</label>
                <input
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={minutes || ''}
                  onChange={(e) => { setMinutes(Math.max(0, Number(e.target.value))); setFormError(''); }}
                  placeholder="0"
                  min="0"
                  className={inputClass}
                />
              </div>
            )}

            {/* Optional distance for time-based workouts */}
            {!needsDistance && (
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Distance (m, optional)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  enterKeyHint="next"
                  value={distanceKm}
                  onChange={(e) => { setDistanceKm(e.target.value); setFormError(''); }}
                  placeholder="0"
                  step="any"
                  min="0"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}

        {category === 'session' && (
          <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <label className="block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">
                Session date
              </label>
              <Link href="/plan" className="text-[11px] font-semibold text-coral hover:underline">
                See the full plan
              </Link>
            </div>
            <input
              type="date"
              value={sessionDate}
              min={PLAN_START}
              max={getPstDateString()}
              onChange={(e) => {
                // A different day has a different plan — start its ticks clean.
                setSessionDate(e.target.value);
                setSelectedSlots([]);
                setSessionWork({});
                setSessionMinutes({});
                setChoiceType({});
                setFormError('');
              }}
              className={inputClass}
            />
            {beforePlan ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-charcoal-muted">
                <Icon name="history" size={15} className="mt-px shrink-0" />
                The plan starts {formatPstDate(PLAN_START, { month: 'short', day: 'numeric' })}. Anything
                logged before then is kept as legacy and isn&apos;t scored.
              </div>
            ) : afterPlan ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-charcoal-muted">
                <Icon name="flag" size={15} className="mt-px shrink-0" />
                Preseason finished on {formatPstDate(PLAN_END, { month: 'short', day: 'numeric' })}.
              </div>
            ) : daySessions.length === 0 ? (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-charcoal-muted">
                <Icon name="bedtime" size={15} className="mt-px shrink-0" />
                Rest day — nothing scheduled. Log it under another category if you trained.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">
                  What did you complete?
                </p>
                {daySessions.map((session) => {
                  const claimed = alreadyClaimed.includes(session.slot);
                  const picked = selectedSlots.includes(session.slot);
                  const asDistance = sessionBasis(session) === 'distance';
                  return (
                    <div key={session.slot}>
                      <button
                        type="button"
                        onClick={() => toggleSlot(session.slot)}
                        disabled={claimed}
                        aria-pressed={picked}
                        className={`focus-ring flex w-full min-h-[56px] items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors touch-manipulation ${
                          claimed
                            ? 'cursor-default border-white/[0.06] bg-white/[0.02] opacity-60'
                            : picked
                              ? 'border-coral/60 bg-coral/10'
                              : 'border-stone/40 bg-bone-dark/40 hover:border-stone-dark'
                        }`}
                      >
                        <Icon
                          name={claimed ? 'task_alt' : picked ? 'check_circle' : 'radio_button_unchecked'}
                          size={22}
                          fill={picked || claimed}
                          className={`shrink-0 ${picked ? 'text-coral' : 'text-charcoal-light'}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-semibold leading-snug text-charcoal">
                            <span className="uppercase tracking-wider text-charcoal-muted">
                              {session.slot}
                            </span>{' '}
                            {session.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-charcoal-muted">
                            {claimed
                              ? 'Already logged'
                              : `Target ${sessionRequirement(session)} · +${SESSION_BONUS} bonus`}
                          </span>
                        </span>
                      </button>

                      {picked && !claimed && optionsForSession(session).length > 1 && (
                        <div className="mt-2 pl-3">
                          <label
                            htmlFor={`what-${session.slot}`}
                            className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted"
                          >
                            What did you do?
                          </label>
                          <select
                            id={`what-${session.slot}`}
                            value={typeForSession(session)}
                            onChange={(e) =>
                              setChoiceType((prev) => ({
                                ...prev,
                                [session.slot]: e.target.value as WorkoutType,
                              }))
                            }
                            className={inputClass}
                          >
                            {optionsForSession(session).map((value) => (
                              <option key={value} value={value}>
                                {(workoutTypeConfigs[value] ?? WORKOUT_TYPES[value]).label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1.5 text-[11px] text-charcoal-muted">
                            Scored like any workout of that kind — plus the bonus.
                          </p>
                        </div>
                      )}

                      {picked && !claimed && (
                        <div className="mt-2 space-y-2.5 pl-3">
                          <div>
                            <label
                              htmlFor={`work-${session.slot}`}
                              className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted"
                            >
                              {asDistance ? 'Distance (m)' : 'Minutes'}
                            </label>
                            <input
                              id={`work-${session.slot}`}
                              type="number"
                              inputMode="decimal"
                              step="any"
                              min="0"
                              value={sessionWork[session.slot] ?? ''}
                              onChange={(e) =>
                                setSessionWork((prev) => ({ ...prev, [session.slot]: e.target.value }))
                              }
                              placeholder={asDistance ? 'e.g. 15000' : String(session.minMinutes ?? '')}
                              className={inputClass}
                            />
                            <p className="mt-1.5 text-[11px] text-charcoal-muted">
                              {asDistance
                                ? `Scored on metres. The sheet asks for ${sessionRequirement(session)}.`
                                : 'Earns its normal points on top of the bonus.'}
                            </p>
                          </div>

                          {asDistance && (
                            <div>
                              <label
                                htmlFor={`mins-${session.slot}`}
                                className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted"
                              >
                                Minutes (optional)
                              </label>
                              <input
                                id={`mins-${session.slot}`}
                                type="number"
                                inputMode="numeric"
                                min="0"
                                value={sessionMinutes[session.slot] ?? ''}
                                onChange={(e) =>
                                  setSessionMinutes((prev) => ({ ...prev, [session.slot]: e.target.value }))
                                }
                                placeholder={String(session.minMinutes ?? '')}
                                className={inputClass}
                              />
                            </div>
                          )}
                        </div>
                      )}

                    </div>
                  );
                })}
                {openSlots.length === 0 && (
                  <p className="text-[11px] text-charcoal-muted">
                    Both of today&apos;s sessions are logged. Nice.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes + Proof — collapsible feel */}
        {category && (
          <>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Notes (optional)</label>
              <div className="relative">
                {notesMention.open && notesFocused && (
                  <MentionDropdown
                    suggestions={notesMention.suggestions}
                    activeIndex={notesMention.activeIndex}
                    onHover={notesMention.setActiveIndex}
                    onPick={notesMention.select}
                    query={notesMention.query}
                  />
                )}
                <textarea
                  ref={notesRef}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={notesMention.onKeyDown}
                  onKeyUp={notesMention.onSelectionChange}
                  onClick={notesMention.onSelectionChange}
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setTimeout(() => setNotesFocused(false), 120)}
                  placeholder="How did it feel? Tag a teammate with @"
                  rows={2}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Proof (optional)</label>
              {proofFiles.length === 0 && (
                <input
                  type="text"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="Strava link, screenshot URL..."
                  className={`${inputClass} mb-2`}
                />
              )}
              <input
                key={proofFileInputKey}
                type="file"
                multiple
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  const tooBig = picked.find((f) => f.size > 50 * 1024 * 1024);
                  if (tooBig) {
                    setProofUploadError('Each file must be under 50 MB.');
                    setProofFileInputKey((p) => p + 1);
                    return;
                  }
                  setProofUploadError('');
                  setProofFiles((prev) => [...prev, ...picked]);
                  setProofFileInputKey((p) => p + 1);
                }}
                accept="image/*,video/*"
                className="w-full text-[12px] text-charcoal-muted file:mr-2 file:rounded-full file:border-0 file:bg-stone-light file:px-3 file:py-1.5 file:text-[11px] file:font-medium file:text-charcoal"
              />
              {proofFiles.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {proofFiles.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-[12px]">
                      <span className="min-w-0 flex items-center gap-1.5 text-charcoal-soft">
                        <Icon name={f.type.startsWith('video/') ? 'videocam' : 'image'} size={14} className="shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofFiles((prev) => prev.filter((_, idx) => idx !== i))}
                        className="shrink-0 text-coral text-[11px] font-medium"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {proofUploadError && <p className="mt-1 text-[11px] text-coral">{proofUploadError}</p>}
            </div>
          </>
        )}

        {/* Submit — sits at the bottom of the form; scroll down to reach it. */}
        {category && (
          <div className="pt-2">
            {formError && (
              <p role="alert" className="mb-2 rounded-lg bg-coral/10 px-3 py-2 text-center text-[12px] font-medium text-coral">
                {formError}
              </p>
            )}
            {(() => {
              const sessionUnavailable =
                category === 'session' && (daySessions.length === 0 || beforePlan || afterPlan);
              return (
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingProof || sessionUnavailable}
                  className="focus-ring w-full min-h-[52px] rounded-full bg-coral py-4 text-[15px] font-semibold text-white transition-all hover:bg-coral-dark active:scale-[0.99] disabled:opacity-40 touch-manipulation"
                >
                  {isSubmitting || isUploadingProof ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      {isUploadingProof ? 'Uploading...' : 'Logging...'}
                    </span>
                  ) : sessionUnavailable ? (
                    'Nothing scheduled for this date'
                  ) : (
                    'Log this workout'
                  )}
                </button>
              );
            })()}
          </div>
        )}
      </form>
    </div>
  );
}
