'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId, isStanfordEmail } from '@/lib/userProfile';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    const finish = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        attempts++;
        if (attempts < 30 && !cancelled) {
          setTimeout(finish, 200);
        } else {
          setError('Sign-in timed out. Please try again.');
        }
        return;
      }

      if (cancelled) return;

      const email = session.user.email ?? '';
      if (!isStanfordEmail(email)) {
        await supabase.auth.signOut();
        router.replace('/login?error=not_stanford');
        return;
      }

      const profile = await getProfileByAuthId(session.user.id);
      if (!profile) {
        router.replace('/onboarding');
      } else {
        router.replace('/');
      }
    };

    finish();
    return () => { cancelled = true; };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card rounded-2xl p-8 text-center">
          <p className="text-sm font-semibold text-ink">Couldn&apos;t sign you in</p>
          <p className="mt-1 text-xs text-ink-muted">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="focus-ring mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink-900"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cardinal border-t-transparent" />
        <p className="text-sm text-ink-soft">Signing you in…</p>
      </div>
    </div>
  );
}
