'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId, isStanfordEmail, Profile } from '@/lib/userProfile';
import Avatar from '../components/Avatar';
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
      // supabase-js exchanges the PKCE code automatically on client load.
      // Poll getSession until the exchange completes (usually <1s).
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

    // No code — check existing session, then listen for changes
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
    <div className="mx-auto max-w-md px-4 pb-10 pt-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cardinal text-lg font-extrabold text-white">
          S
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welcome to Cardinal Row</h1>
        <p className="mt-1 text-sm text-ink-soft">Stanford rowing, summer miles.</p>
      </div>

      <div className="space-y-4">
        {state === 'not_stanford' && (
          <div className="card rounded-2xl border-cardinal/30 bg-cardinal/5 p-5 text-center">
            <p className="text-sm font-semibold text-cardinal">Stanford accounts only</p>
            <p className="mt-1 text-xs text-ink-soft">Sign in with your @stanford.edu Google account.</p>
          </div>
        )}

        <div className="card rounded-2xl p-6">
          <label className="label-caps mb-3 block text-ink-soft">Google sign-in</label>
          {state === 'loading' ? (
            <div className="flex items-center gap-3 text-sm text-ink-muted">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-cardinal border-t-transparent" />
              Signing you in…
            </div>
          ) : email ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-container-low/60 px-4 py-3 text-sm text-ink">
                Signed in as <span className="font-semibold">{email}</span>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="focus-ring rounded-full border border-line px-4 py-2 text-xs font-semibold text-ink transition-colors hover:border-ink/30"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="focus-ring flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink-900"
            >
              <Icon name="login" size={18} />
              Continue with Google
            </button>
          )}
        </div>

        {profile && (
          <div className="card rounded-2xl p-6">
            <label className="label-caps mb-3 block text-ink-soft">Profile</label>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-container-low/60 px-4 py-3">
              <Avatar name={profile.name} size={40} />
              <div>
                <p className="text-sm font-semibold text-ink">{profile.name}</p>
                <p className="text-xs text-ink-muted">Redirecting…</p>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-ink-soft">
          Just looking?{' '}
          <Link href="/" className="font-semibold text-cardinal hover:underline">
            Go to the feed
          </Link>
        </p>
      </div>
    </div>
  );
}
