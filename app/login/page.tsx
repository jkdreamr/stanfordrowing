'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TEAMS, getUserByEmail } from '@/lib/data';
import { User } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';

export default function Login() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailWarning, setEmailWarning] = useState('');

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data.session?.user.email ?? null);
      setIsLoading(false);
    };
    loadSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sessionEmail) {
      setSelectedUser(null);
      setEmailWarning('');
      return;
    }
    const mappedUser = getUserByEmail(sessionEmail);
    setSelectedUser(mappedUser);
    setEmailWarning(mappedUser ? '' : 'Your Google email isn’t mapped to a roster name yet. Ask an admin.');
  }, [sessionEmail]);

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/login` },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSessionEmail(null);
    setSelectedUser(null);
    setEmailWarning('');
  };

  const team = selectedUser ? TEAMS.find((t) => t.id === selectedUser.teamId) : undefined;

  return (
    <div className="mx-auto max-w-md px-4 pb-10 pt-10 sm:px-6">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-cardinal text-lg font-extrabold text-white">
          S
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Welcome to Cardinal Row</h1>
        <p className="mt-1 text-sm text-ink-soft">Sign in with Google to link your roster profile.</p>
      </div>

      <div className="space-y-4">
        <div className="card rounded-2xl p-6">
          <label className="label-caps mb-3 block text-ink-soft">Google sign-in</label>
          {isLoading ? (
            <p className="text-sm text-ink-muted">Checking your session…</p>
          ) : sessionEmail ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-line bg-container-low/60 px-4 py-3 text-sm text-ink">
                Signed in as <span className="font-semibold">{sessionEmail}</span>
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

        <div className="card rounded-2xl p-6">
          <label className="label-caps mb-3 block text-ink-soft">Roster profile</label>
          {selectedUser ? (
            <div className="flex items-center gap-3 rounded-xl border border-line bg-container-low/60 px-4 py-3">
              <Avatar name={selectedUser.name} color={team?.color} size={40} />
              <div>
                <p className="text-sm font-semibold text-ink">{selectedUser.name}</p>
                {team ? (
                  <p className="text-xs text-ink-muted">{team.name}</p>
                ) : (
                  <p className="text-xs text-ink-muted">Roster linked</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              {sessionEmail ? 'No roster match yet.' : 'Sign in to match your name.'}
            </p>
          )}
          {emailWarning && <p className="mt-3 text-xs text-cardinal">{emailWarning}</p>}
        </div>

        <button
          type="button"
          onClick={() => router.push('/')}
          disabled={!selectedUser || !sessionEmail}
          className="focus-ring w-full rounded-full bg-cardinal px-6 py-4 text-base font-semibold text-white shadow-cardinal transition-all duration-200 hover:bg-cardinal-dark active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Enter the squad
        </button>

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
