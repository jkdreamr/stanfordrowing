'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId, isStanfordEmail, Profile } from '@/lib/userProfile';
import Icon from '../components/Icon';

type State = 'loading' | 'signed_out' | 'not_stanford' | 'needs_profile' | 'ready';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams.get('error') === 'not_stanford') {
      setState('not_stanford');
      return;
    }

    const handleSession = async (sessionEmail: string | undefined, authId: string | undefined) => {
      if (!sessionEmail || !authId) {
        setState('signed_out');
        return;
      }
      if (!isStanfordEmail(sessionEmail)) {
        await supabase.auth.signOut();
        setState('not_stanford');
        return;
      }
      setEmail(sessionEmail);
      const existing = await getProfileByAuthId(authId);
      if (!existing) {
        setState('needs_profile');
      } else {
        setProfile(existing);
        setState('ready');
      }
    };

    const hasCode = new URLSearchParams(window.location.search).has('code');

    if (hasCode) {
      let attempts = 0;
      const poll = async () => {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await handleSession(data.session.user.email, data.session.user.id);
          return;
        }
        attempts++;
        if (attempts < 20) {
          setTimeout(poll, 300);
        } else {
          setState('signed_out');
        }
      };
      poll();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      handleSession(data.session?.user.email, data.session?.user.id);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user.email, session?.user.id);
    });

    return () => authListener.subscription.unsubscribe();
  }, [searchParams]);

  useEffect(() => {
    if (state === 'needs_profile') router.replace('/onboarding');
    if (state === 'ready') router.replace('/');
  }, [state, router]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setEmail(null);
    setState('signed_out');
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold tracking-editorial text-charcoal">
            Cardinal Row
          </h1>
          <p className="mt-1 text-[13px] text-charcoal-muted">Summer work, kept honest.</p>
        </div>

        <div className="space-y-4">
          {state === 'not_stanford' && (
            <div className="rounded-xl bg-coral-soft p-4 text-center">
              <p className="text-[13px] font-medium text-coral">Stanford accounts only</p>
              <p className="mt-0.5 text-[11px] text-charcoal-muted">Sign in with @stanford.edu.</p>
            </div>
          )}

          <div className="card-solid p-5">
            {state === 'loading' ? (
              <div className="flex items-center justify-center gap-2 py-4 text-[13px] text-charcoal-muted">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-coral border-t-transparent" />
                Signing you in...
              </div>
            ) : email ? (
              <div className="space-y-3">
                <div className="rounded-lg bg-bone-dark/60 px-3 py-2.5 text-[13px] text-charcoal">
                  Signed in as <span className="font-medium">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="focus-ring rounded-lg border border-stone/40 px-3 py-1.5 text-[11px] font-medium text-charcoal-muted hover:text-charcoal"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-charcoal px-5 py-3 text-[13px] font-semibold text-bone transition-colors hover:bg-charcoal/90"
              >
                <Icon name="login" size={18} />
                Continue with Google
              </button>
            )}
          </div>

          <p className="text-center text-[12px] text-charcoal-muted">
            Just looking?{' '}
            <Link href="/" className="font-medium text-coral hover:underline">
              Go to the feed
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
