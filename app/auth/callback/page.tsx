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

    const run = async () => {
      const code = new URLSearchParams(window.location.search).get('code');

      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const profile = await getProfileByAuthId(data.session.user.id);
          if (!cancelled) router.replace(profile ? '/' : '/onboarding');
        } else {
          if (!cancelled) setError('No sign-in code found. Please try again.');
        }
        return;
      }

      const { data, error: exchError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchError || !data.session) {
        if (!cancelled) setError(exchError?.message ?? 'Sign-in failed. Please try again.');
        return;
      }

      if (cancelled) return;

      const email = data.session.user.email ?? '';
      if (!isStanfordEmail(email)) {
        await supabase.auth.signOut();
        router.replace('/login?error=not_stanford');
        return;
      }

      const profile = await getProfileByAuthId(data.session.user.id);
      router.replace(profile ? '/' : '/onboarding');
    };

    run();
    return () => { cancelled = true; };
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
