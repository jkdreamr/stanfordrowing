'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<'working' | 'error'>('working');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const exchange = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace('/login');
          return;
        }
        setStatus('error');
        setErrorMessage('No authorization code returned.');
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
      if (error) {
        setStatus('error');
        setErrorMessage(error.message);
        return;
      }
      router.replace('/login');
    };

    exchange();
  }, [router]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="card rounded-2xl p-8 text-center">
        {status === 'working' ? (
          <>
            <p className="text-sm text-ink-soft">Signing you in with Google…</p>
            <div className="mx-auto mt-4 h-10 w-10 animate-spin rounded-full border-2 border-cardinal border-t-transparent" />
          </>
        ) : (
          <>
            <p className="text-sm text-ink-soft">Couldn’t complete sign in. Please try again.</p>
            {errorMessage && <p className="mt-2 text-xs text-ink-muted">{errorMessage}</p>}
            <button
              onClick={() => router.replace('/login')}
              className="focus-ring mt-4 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white hover:bg-ink-900"
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
