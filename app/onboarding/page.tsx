'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clearLocalAuth } from '@/lib/supabaseClient';
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
        clearLocalAuth();
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal">
            Set up your profile
          </h1>
          <p className="mt-1 text-[13px] text-charcoal-muted">One step. You&apos;re on the team.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="card-solid p-5">
            <div className="mb-4 rounded-lg bg-bone-dark/60 px-3 py-2.5 text-[13px] text-charcoal-soft">
              Signed in as <span className="font-medium text-charcoal">{email}</span>
            </div>

            <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-charcoal-muted">Your name</label>
            <input
              type="text"
              enterKeyHint="done"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Josh Koo"
              autoFocus
              required
              className="focus-ring w-full rounded-xl border border-stone/40 bg-bone-dark/40 px-4 py-3.5 text-[15px] text-charcoal placeholder:text-charcoal-light"
            />
            <p className="mt-1.5 text-[11px] text-charcoal-muted">How you appear on the feed.</p>
          </div>

          {error && <p className="text-[12px] text-coral">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="focus-ring min-h-[52px] w-full rounded-full bg-coral py-4 text-[15px] font-semibold text-white transition-all hover:bg-coral-dark active:scale-[0.99] disabled:opacity-40 touch-manipulation"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Setting up...
              </span>
            ) : (
              'Join the squad'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
