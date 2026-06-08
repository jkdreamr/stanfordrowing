'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getUserByEmail, getTeamById } from '@/lib/data';
import { User } from '@/lib/types';
import Avatar from './Avatar';
import Icon from './Icon';

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setEmail(data.session?.user.email ?? null);
      setIsLoading(false);
    };
    load();
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setUser(email ? getUserByEmail(email) : null);
  }, [email]);

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-container-high" />;
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="focus-ring inline-flex items-center rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-ink-900"
      >
        Log in
      </Link>
    );
  }

  const team = user ? getTeamById(user.teamId) : undefined;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex items-center gap-2 rounded-full p-0.5 transition-transform active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={user?.name ?? email} color={team?.color ?? '#b51c00'} size={36} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="card absolute right-0 z-50 mt-2 w-60 rounded-2xl p-2 shadow-card-lg">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-ink">{user?.name ?? 'Guest'}</p>
              <p className="truncate text-xs text-ink-muted">{email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            {user && (
              <Link
                href={`/rowers/${user.id}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-container-low"
              >
                <Icon name="person" size={18} className="text-ink-soft" />
                My profile
              </Link>
            )}
            <Link
              href="/log"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-container-low"
            >
              <Icon name="add" size={18} className="text-ink-soft" />
              Log a workout
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-ink hover:bg-container-low"
            >
              <Icon name="logout" size={18} className="text-ink-soft" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
