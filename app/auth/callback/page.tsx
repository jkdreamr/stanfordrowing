'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, clearLocalAuth } from '@/lib/supabaseClient';
import { getProfileByAuthId, isStanfordEmail } from '@/lib/userProfile';

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let finished = false;

    // The Supabase client auto-applies the session from the redirect URL
    // (implicit flow). Route as soon as it's available — whether it's already
    // set on mount or arrives via the auth event.
    const finish = async (session: { user: { id: string; email?: string } }) => {
      if (finished) return;
      finished = true;
      const email = session.user.email ?? '';
      if (!isStanfordEmail(email)) {
        clearLocalAuth();
        router.replace('/login?error=not_stanford');
        return;
      }
      const profile = await getProfileByAuthId(session.user.id);
      router.replace(profile ? '/' : '/onboarding');
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(data.session);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(session);
    });

    const timeout = setTimeout(() => {
      if (!finished) setError('Sign-in timed out. Please try again.');
    }, 10000);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="card-solid p-6 text-center shadow-modal" style={{borderRadius: '16px'}}>
          <p className="text-[13px] font-semibold text-charcoal">Couldn&apos;t sign you in</p>
          <p className="mt-1 text-[11px] text-charcoal-muted">{error}</p>
          <button
            onClick={() => router.replace('/login')}
            className="focus-ring mt-4 rounded-full bg-charcoal px-4 py-1.5 text-[11px] font-semibold text-bone hover:bg-charcoal/90"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        <p className="text-[13px] text-charcoal-muted">Signing you in...</p>
      </div>
    </div>
  );
}
