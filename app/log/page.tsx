'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_PLAN_MILEAGES, formatPreciseNumber, getPstDateString } from '@/lib/data';
import { getProfileByAuthId, isStanfordEmail, profileToUser } from '@/lib/userProfile';
import { User, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { createWorkout, fetchMultipliers } from '@/lib/supabaseData';
import { getWorkoutWeightedScore } from '@/lib/data';
import Icon from '../components/Icon';

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

export default function LogWorkout() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [hasPieces, setHasPieces] = useState(false);
  const [liftPlan, setLiftPlan] = useState(true);
  const [bikeOutdoor, setBikeOutdoor] = useState(false);
  const [sessionDate, setSessionDate] = useState<string>(getPstDateString());
  const [minutes, setMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>('');
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
  const [planMileages, setPlanMileages] = useState<Record<string, number>>({});
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [notStanford, setNotStanford] = useState(false);

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
        const { workoutTypeConfigs: configs, planMileages: planData } = await fetchMultipliers();
        setWorkoutTypeConfigs(configs);
        setPlanMileages({ ...DEFAULT_PLAN_MILEAGES, ...planData });
      } catch {
        setWorkoutTypeConfigs(WORKOUT_TYPES);
        setPlanMileages(DEFAULT_PLAN_MILEAGES);
      }
    };
    loadMultipliers();
    supabase.auth.getSession().then(({ data }) =>
      resolveUser(data.session?.user.id, data.session?.user.email)
    );
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      resolveUser(session?.user.id, session?.user.email);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

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
    const distanceValue = parseFloat(distanceKm) || 0;
    const planMileage = planMileages[sessionDate] ?? 0;

    // Validate with visible feedback — never fail silently (a dead-looking button).
    if (category === 'session') {
      if (planMileage <= 0) { setFormError('No session mileage is set for this date yet.'); return; }
    } else if (category === 'other' && !activityName.trim()) {
      setFormError('Name the activity first.'); return;
    } else if (basis === 'minutes' && minutes <= 0) {
      setFormError('Enter how many minutes you did.'); return;
    } else if (basis === 'distance' && distanceValue <= 0) {
      setFormError('Enter your distance in meters.'); return;
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

      const createdWorkout = await createWorkout({
        user: selectedUser,
        type,
        minutes: category === 'session' ? 0 : basis === 'minutes' ? minutes : 0,
        distance: category === 'session' ? planMileage : distanceValue > 0 ? distanceValue : undefined,
        notes: notes || undefined,
        proofUrl: proofUrlValue,
        proofUrls: uploadedUrls.length > 1 ? uploadedUrls : undefined,
        activityName: activityName.trim() || undefined,
        date,
      });

      setLastScore(getWorkoutWeightedScore(createdWorkout, workoutTypeConfigs));
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
    setMinutes(0);
    setDistanceKm('');
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
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Distance (m)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={distanceKm}
                  onChange={(e) => { setDistanceKm(e.target.value); setFormError(''); }}
                  placeholder="0"
                  step="1"
                  min="0"
                  className={inputClass}
                />
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
                  inputMode="numeric"
                  enterKeyHint="next"
                  value={distanceKm}
                  onChange={(e) => { setDistanceKm(e.target.value); setFormError(''); }}
                  placeholder="0"
                  step="1"
                  min="0"
                  className={inputClass}
                />
              </div>
            )}
          </div>
        )}

        {category === 'session' && (
          <div>
            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Session date</label>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className={inputClass}
            />
            {(planMileages[sessionDate] ?? 0) > 0 ? (
              <p className="mt-1.5 text-[11px] text-charcoal-muted">
                Plan: {formatPreciseNumber(planMileages[sessionDate] ?? 0)} pts
              </p>
            ) : (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg border border-coral/30 bg-coral/10 px-3 py-2 text-[12px] font-medium text-coral">
                <Icon name="event_busy" size={15} />
                Unavailable for this date — no session mileage set.
              </div>
            )}
          </div>
        )}

        {/* Notes + Proof — collapsible feel */}
        {category && (
          <>
            <div>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it feel?"
                rows={2}
                className={inputClass}
              />
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
              const sessionUnavailable = category === 'session' && (planMileages[sessionDate] ?? 0) <= 0;
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
                    'Unavailable for this date'
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
