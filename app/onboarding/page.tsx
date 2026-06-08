'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { createProfile, getProfileByAuthId, isStanfordEmail } from '@/lib/userProfile';
import Icon from '../components/Icon';

export default function OnboardingPage() {
  const router = useRouter();
  const [authId, setAuthId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        router.replace('/login');
        return;
      }
      const userEmail = session.user.email ?? '';
      if (!isStanfordEmail(userEmail)) {
        await supabase.auth.signOut();
        router.replace('/login?error=not_stanford');
        return;
      }
      const existing = await getProfileByAuthId(session.user.id);
      if (existing) {
        router.replace('/');
        return;
      }
      setAuthId(session.user.id);
      setEmail(userEmail);
      setIsLoading(false);
    };
    init();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authId || !email || !name.trim()) return;
    setIsSubmitting(true);
    setError('');
    const profile = await createProfile({ authId, email, name });
    if (!profile) {
      setError('Something went wrong. Try again.');
      setIsSubmitting(false);
      return;
    }
    router.replace('/');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cardinal border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cardinal text-lg font-extrabold text-white">
          S
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Set up your profile</h1>
        <p className="mt-1 text-sm text-ink-soft">One step. You&apos;re on the team.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="card rounded-2xl p-6">
          <div className="mb-4 rounded-xl border border-line bg-container-low/60 px-4 py-3 text-sm text-ink-soft">
            Signed in as <span className="font-semibold text-ink">{email}</span>
          </div>

          <label className="label-caps mb-2 block text-ink-soft">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Josh Koo"
            autoFocus
            required
            className="focus-ring w-full rounded-xl border border-line bg-container-low/60 px-4 py-3 text-ink placeholder:text-ink-muted"
          />
          <p className="mt-2 text-xs text-ink-muted">This is how you&apos;ll appear on the feed and leaderboard.</p>
        </div>

        {error && <p className="text-sm text-cardinal">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || isSubmitting}
          className="focus-ring w-full rounded-full bg-cardinal px-6 py-4 text-base font-semibold text-white shadow-cardinal transition-all duration-200 hover:bg-cardinal-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              Setting up…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Icon name="check" size={20} />
              Join the squad
            </span>
          )}
        </button>
      </form>
    </div>
  );
}
