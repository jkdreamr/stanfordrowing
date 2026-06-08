'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DEFAULT_PLAN_MILEAGES, formatPreciseNumber, getPstDateString } from '@/lib/data';
import { getProfileByAuthId, isStanfordEmail, profileToUser } from '@/lib/userProfile';
import { User, WorkoutType, WorkoutTypeConfig, WORKOUT_TYPES } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { createWorkout, fetchMultipliers, updateWorkoutRow } from '@/lib/supabaseData';
import Icon from '../components/Icon';

type Category = 'training_session' | 'rowing_erging' | 'cross_training' | 'lifting';

const CATEGORIES: { value: Category; label: string; icon: string; sub: string }[] = [
  { value: 'rowing_erging', label: 'Row / Erg', icon: 'rowing', sub: 'On water or erg' },
  { value: 'lifting', label: 'Lift', icon: 'fitness_center', sub: 'Weights' },
  { value: 'cross_training', label: 'Cross', icon: 'directions_run', sub: 'Run, bike, swim…' },
  { value: 'training_session', label: 'Session', icon: 'event_available', sub: 'Full team practice' },
];

const inputClass =
  'focus-ring w-full rounded-xl border border-line bg-container-low/60 px-4 py-3 text-ink placeholder:text-ink-muted transition-colors disabled:opacity-50';

function Pills<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`focus-ring rounded-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              active ? 'bg-ink text-white' : 'border border-line bg-surface text-ink-soft hover:border-ink/30'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function LogWorkout() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [category, setCategory] = useState<Category>('rowing_erging');
  const [rowingPieces, setRowingPieces] = useState<'yes' | 'no'>('no');
  const [liftingSource, setLiftingSource] = useState<'plan' | 'own'>('plan');
  const [crossType, setCrossType] = useState<'bike' | 'run' | 'swim' | 'ball_sports' | 'skiing'>('run');
  const [bikeType, setBikeType] = useState<'stationary' | 'outdoor'>('stationary');
  const [skiType, setSkiType] = useState<'downhill' | 'cross_country'>('downhill');
  const [sessionDate, setSessionDate] = useState<string>(getPstDateString());
  const [minutes, setMinutes] = useState<number>(0);
  const [distanceKm, setDistanceKm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [proofUrl, setProofUrl] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofFileInputKey, setProofFileInputKey] = useState(0);
  const [proofUploadError, setProofUploadError] = useState('');
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [activityName, setActivityName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
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
    if (category === 'training_session') return 'training_session';
    if (category === 'rowing_erging') return rowingPieces === 'yes' ? 'rowing_with_pieces' : 'rowing_no_pieces';
    if (category === 'lifting') return liftingSource === 'plan' ? 'lifting_plan' : 'lifting_own';
    if (crossType === 'bike') return bikeType === 'stationary' ? 'cross_bike_stationary' : 'cross_bike_outdoor';
    if (crossType === 'run') return 'cross_run';
    if (crossType === 'swim') return 'cross_swim';
    if (crossType === 'ball_sports') return 'cross_ball_sports';
    return skiType === 'downhill' ? 'cross_ski_downhill' : 'cross_ski_cross_country';
  };

  const calculateWeightedScore = (): number => {
    const type = resolveWorkoutType();
    const config = workoutTypeConfigs[type] ?? WORKOUT_TYPES[type];
    const multiplier = config?.multiplier ?? 1;
    const basis = config?.basis ?? 'minutes';
    const value =
      category === 'training_session'
        ? planMileages[sessionDate] ?? 0
        : basis === 'distance'
          ? parseFloat(distanceKm) || 0
          : minutes;
    return value * multiplier;
  };

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setProofFile(event.target.files?.[0] ?? null);
    setProofUploadError('');
  };

  const clearProofFile = () => {
    setProofFile(null);
    setProofFileInputKey((p) => p + 1);
    setProofUploadError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const type = resolveWorkoutType();
    const config = workoutTypeConfigs[type] ?? WORKOUT_TYPES[type];
    const basis = config?.basis ?? 'minutes';
    const distanceValue = parseFloat(distanceKm) || 0;
    const needsMinutes = basis === 'minutes' && minutes > 0;
    const needsDistance = basis === 'distance' && distanceValue > 0;
    const planMileage = planMileages[sessionDate] ?? 0;

    if (category === 'training_session' && planMileage <= 0) return;
    if (
      category !== 'training_session' &&
      ((basis === 'minutes' && !needsMinutes) || (basis === 'distance' && !needsDistance))
    )
      return;
    if (type === 'cross_ball_sports' && !activityName.trim()) return;

    setIsSubmitting(true);
    setProofUploadError('');

    const date = category === 'training_session' ? sessionDate : getPstDateString();
    const fileToUpload = proofFile;
    const initialProofUrl = fileToUpload ? undefined : proofUrl || undefined;

    try {
      const createdWorkout = await createWorkout({
        user: selectedUser,
        type,
        minutes: category === 'training_session' ? 0 : basis === 'minutes' ? minutes : 0,
        distance: category === 'training_session' ? planMileage : distanceValue > 0 ? distanceValue : undefined,
        notes: notes || undefined,
        proofUrl: initialProofUrl,
        activityName: activityName.trim() || undefined,
        date,
      });

      if (fileToUpload) {
        setIsUploadingProof(true);
        const fileExtension = fileToUpload.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExtension}`;
        const ownerId = selectedUser.id;
        const filePath = `${ownerId}/${fileName}`;
        void (async () => {
          try {
            const { error: uploadError } = await supabase.storage
              .from('workout-proofs')
              .upload(filePath, fileToUpload, {
                cacheControl: '3600',
                contentType: fileToUpload.type || 'image/jpeg',
                upsert: false,
              });
            if (uploadError) throw uploadError;
            const { data } = supabase.storage.from('workout-proofs').getPublicUrl(filePath);
            await updateWorkoutRow({ ...createdWorkout, proofUrl: data.publicUrl });
          } catch {
            setProofUploadError('Proof upload failed. You can add a link by editing the workout.');
          } finally {
            setIsUploadingProof(false);
          }
        })();
      }
    } catch {
      setProofUploadError('Couldn’t log that right now. Try again.');
      setIsSubmitting(false);
      setIsUploadingProof(false);
      return;
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setMinutes(0);
      setDistanceKm('');
      setNotes('');
      setProofUrl('');
      clearProofFile();
      setActivityName('');
    }, 2200);
    setIsSubmitting(false);
  };

  const isLoggedIn = !!selectedUser;
  const selectedType = resolveWorkoutType();
  const selectedBasis = (workoutTypeConfigs[selectedType] ?? WORKOUT_TYPES[selectedType])?.basis ?? 'minutes';
  const distanceValue = parseFloat(distanceKm) || 0;
  const planMileage = planMileages[sessionDate] ?? 0;
  const isFormReady =
    isLoggedIn &&
    (category === 'training_session'
      ? planMileage > 0
      : selectedBasis === 'minutes'
        ? minutes > 0
        : distanceValue > 0) &&
    (selectedType !== 'cross_ball_sports' || activityName.trim().length > 0);

  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-6 sm:px-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Log the work</h1>
        <p className="mt-1 text-sm text-ink-soft">Under 30 seconds. Then it&apos;s on the feed.</p>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="animate-slide-up fixed bottom-24 left-1/2 z-50 w-[min(92vw,360px)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-4 shadow-card-lg sm:bottom-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cardinal/10">
              <Icon name="check" className="text-cardinal" size={22} />
            </span>
            <div>
              <p className="font-semibold text-ink">Logged it.</p>
              <p className="text-sm text-ink-soft">+{formatPreciseNumber(calculateWeightedScore())} points</p>
            </div>
          </div>
          {isUploadingProof && <p className="mt-2 text-xs text-ink-muted">Uploading proof in the background…</p>}
        </div>
      )}

      <form id="log-form" onSubmit={handleSubmit} className="space-y-5 pb-32 sm:pb-0">
        {!isLoggedIn && (
          <div className="card rounded-2xl p-6 text-center">
            <p className="font-semibold text-ink">Sign in to log a workout</p>
            <p className="mt-1 text-sm text-ink-soft">Pick your roster name after signing in with Google.</p>
            <Link
              href="/login"
              className="focus-ring mt-4 inline-flex items-center justify-center rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ink-900"
            >
              Go to login
            </Link>
            {isAuthLoading && <p className="mt-3 text-xs text-ink-muted">Checking your session…</p>}
            {notStanford && <p className="mt-3 text-xs text-cardinal">Stanford accounts only (@stanford.edu).</p>}
          </div>
        )}

        {/* Category */}
        <div className="card rounded-2xl p-4">
          <label className="label-caps mb-3 block text-ink-soft">What did you do?</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  disabled={!isLoggedIn}
                  onClick={() => setCategory(c.value)}
                  className={`focus-ring flex items-center gap-3 rounded-xl px-4 py-4 text-left transition-all disabled:opacity-50 ${
                    active
                      ? 'bg-cardinal text-white shadow-cardinal'
                      : 'border border-line bg-surface hover:border-ink/20'
                  }`}
                >
                  <Icon name={c.icon} size={22} fill={active} className={active ? 'text-white' : 'text-ink-muted'} />
                  <div>
                    <p className={`text-sm font-bold leading-tight ${active ? 'text-white' : 'text-ink'}`}>{c.label}</p>
                    <p className={`mt-0.5 text-[11px] leading-tight ${active ? 'text-white/70' : 'text-ink-muted'}`}>{c.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Training session */}
        {category === 'training_session' && (
          <div className="card space-y-4 rounded-2xl p-5">
            <div>
              <label className="label-caps mb-2 block text-ink-soft">Training date</label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                disabled={!isLoggedIn}
                className={inputClass}
                required
              />
            </div>
            <div className="rounded-xl border border-line bg-container-low/60 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="label-caps text-ink-muted">Plan mileage</span>
                <span className="font-semibold text-ink">
                  {planMileage > 0 ? `${formatPreciseNumber(planMileage)} pts` : 'Not set yet'}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-ink-muted">
                {planMileage > 0 ? 'Points come from the plan for this date.' : 'Ask an admin to set mileage for this date.'}
              </p>
            </div>
          </div>
        )}

        {/* Rowing / erg */}
        {category === 'rowing_erging' && (
          <div className="card space-y-4 rounded-2xl p-5">
            <div>
              <label className="label-caps mb-2 block text-ink-soft">Distance (km)</label>
              <input
                type="number" inputMode="decimal" min="0" step="0.1"
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
                placeholder="e.g. 12"
                disabled={!isLoggedIn}
                className={`${inputClass} text-lg`}
                required
              />
            </div>
            <div>
              <p className="label-caps mb-2 text-ink-soft">With pieces?</p>
              <Pills
                options={[{ value: 'no', label: 'No' }, { value: 'yes', label: 'Yes' }]}
                value={rowingPieces}
                onChange={setRowingPieces}
                disabled={!isLoggedIn}
              />
            </div>
          </div>
        )}

        {/* Cross training */}
        {category === 'cross_training' && (
          <div className="card space-y-4 rounded-2xl p-5">
            <div>
              <p className="label-caps mb-2 text-ink-soft">Type</p>
              <Pills
                options={[
                  { value: 'run', label: 'Run' },
                  { value: 'bike', label: 'Bike' },
                  { value: 'swim', label: 'Swim' },
                  { value: 'ball_sports', label: 'Ball sports' },
                  { value: 'skiing', label: 'Skiing' },
                ]}
                value={crossType}
                onChange={setCrossType}
                disabled={!isLoggedIn}
              />
            </div>

            {crossType === 'bike' && (
              <>
                <div>
                  <p className="label-caps mb-2 text-ink-soft">Bike</p>
                  <Pills
                    options={[{ value: 'stationary', label: 'Stationary' }, { value: 'outdoor', label: 'Outdoor' }]}
                    value={bikeType}
                    onChange={setBikeType}
                    disabled={!isLoggedIn}
                  />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-ink-soft">Time (mins, no rest)</label>
                  <input type="number" inputMode="numeric" min="1" value={minutes || ''} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-ink-soft">Distance (km) — optional</label>
                  <input type="number" inputMode="decimal" min="0" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="e.g. 20" disabled={!isLoggedIn} className={inputClass} />
                </div>
              </>
            )}

            {crossType === 'run' && (
              <div>
                <label className="label-caps mb-2 block text-ink-soft">Distance (km)</label>
                <input type="number" inputMode="decimal" min="0" step="0.1" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} placeholder="e.g. 5" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
              </div>
            )}

            {crossType === 'swim' && (
              <div>
                <label className="label-caps mb-2 block text-ink-soft">Time (mins, no rest)</label>
                <input type="number" inputMode="numeric" min="1" value={minutes || ''} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
              </div>
            )}

            {crossType === 'ball_sports' && (
              <>
                <div>
                  <label className="label-caps mb-2 block text-ink-soft">Sport</label>
                  <input type="text" value={activityName} onChange={(e) => setActivityName(e.target.value)} placeholder="e.g. soccer, basketball" disabled={!isLoggedIn} className={inputClass} required />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-ink-soft">Time (mins)</label>
                  <input type="number" inputMode="numeric" min="1" value={minutes || ''} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
                </div>
              </>
            )}

            {crossType === 'skiing' && (
              <>
                <div>
                  <p className="label-caps mb-2 text-ink-soft">Style</p>
                  <Pills
                    options={[{ value: 'downhill', label: 'Downhill' }, { value: 'cross_country', label: 'Cross country' }]}
                    value={skiType}
                    onChange={setSkiType}
                    disabled={!isLoggedIn}
                  />
                </div>
                <div>
                  <label className="label-caps mb-2 block text-ink-soft">Time (mins moving)</label>
                  <input type="number" inputMode="numeric" min="1" value={minutes || ''} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
                </div>
              </>
            )}
          </div>
        )}

        {/* Lifting */}
        {category === 'lifting' && (
          <div className="card space-y-4 rounded-2xl p-5">
            <div>
              <p className="label-caps mb-2 text-ink-soft">Source</p>
              <Pills
                options={[{ value: 'plan', label: 'From plan' }, { value: 'own', label: 'Own lifting' }]}
                value={liftingSource}
                onChange={setLiftingSource}
                disabled={!isLoggedIn}
              />
            </div>
            <div>
              <label className="label-caps mb-2 block text-ink-soft">Time (mins)</label>
              <input type="number" inputMode="numeric" min="1" value={minutes || ''} onChange={(e) => setMinutes(parseInt(e.target.value) || 0)} placeholder="Minutes" disabled={!isLoggedIn} className={`${inputClass} text-lg`} required />
            </div>
          </div>
        )}

        {/* Proof + notes */}
        <div className="card space-y-4 rounded-2xl p-5">
          <div>
            <label className="label-caps mb-2 block text-ink-soft">Proof link — optional</label>
            <input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="Strava, Drive, or a screenshot link" disabled={!isLoggedIn} className={inputClass} />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="label-caps text-ink-soft">Upload proof — optional</label>
              {proofFile && (
                <button type="button" onClick={clearProofFile} className="text-xs font-semibold text-cardinal">Remove</button>
              )}
            </div>
            <input
              key={`${proofFileInputKey}-upload`}
              type="file"
              accept="image/*"
              onChange={handleProofFileChange}
              disabled={!isLoggedIn || isUploadingProof}
              className="focus-ring w-full rounded-xl border border-dashed border-line bg-container-low/40 px-4 py-3 text-sm text-ink file:mr-4 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-ink-900 disabled:opacity-50"
            />
            {proofFile && <p className="mt-2 text-xs text-ink-muted">Attached: {proofFile.name} — replaces the link.</p>}
            {proofUploadError && <p className="mt-2 text-xs text-cardinal">{proofUploadError}</p>}
          </div>
          <div>
            <label className="label-caps mb-2 block text-ink-soft">Notes — optional</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Big session. Glassy water. Whatever." rows={3} disabled={!isLoggedIn} className={`${inputClass} resize-none`} />
          </div>
        </div>

      </form>

      {/* Sticky submit — mobile (sits above bottom nav ~72px) */}
      <div className="glass fixed inset-x-0 bottom-[72px] z-30 border-t border-line px-4 pb-3 pt-3 sm:hidden">
        <button
          type="submit"
          form="log-form"
          disabled={!isFormReady || isSubmitting}
          className="focus-ring w-full rounded-full bg-cardinal px-6 py-4 text-base font-semibold text-white shadow-cardinal transition-all duration-200 hover:bg-cardinal-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Logging…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="check" size={20} />
              Log it{isFormReady ? ` · +${formatPreciseNumber(calculateWeightedScore())} pts` : ''}
            </span>
          )}
        </button>
      </div>

      {/* Desktop submit (inline) */}
      <div className="hidden sm:block">
        <button
          type="submit"
          form="log-form"
          disabled={!isFormReady || isSubmitting}
          className="focus-ring w-full rounded-full bg-cardinal px-6 py-4 text-base font-semibold text-white shadow-cardinal transition-all duration-200 hover:bg-cardinal-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Logging…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="check" size={20} />
              Log it{isFormReady ? ` · +${formatPreciseNumber(calculateWeightedScore())} pts` : ''}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
