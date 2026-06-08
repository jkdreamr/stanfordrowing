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
        // No code — maybe already has a session (e.g. navigated back)
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const profile = await getProfileByAuthId(data.session.user.id);
          if (!cancelled) router.replace(profile ? '/' : '/onboarding');
        } else {
          if (!cancelled) setError('No sign-in code found. Please try again.');
        }
        return;
      }

      // PKCE flow: explicitly exchange the code for a session
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
