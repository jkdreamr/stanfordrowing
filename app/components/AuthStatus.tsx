'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getTeamById } from '@/lib/data';
import { getProfileByAuthId, Profile } from '@/lib/userProfile';
import Avatar from './Avatar';
import Icon from './Icon';

export default function AuthStatus() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const loadProfile = async (authId: string | undefined) => {
    if (!authId) { setProfile(null); setIsLoading(false); return; }
    const p = await getProfileByAuthId(authId);
    setProfile(p);
    setIsLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => loadProfile(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadProfile(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-container-high" />;
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="focus-ring inline-flex items-center rounded-full bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-ink-900"
      >
        Log in
      </Link>
    );
  }

  const team = getTeamById(profile.teamId);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
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
        <Avatar name={profile.name} color={team?.color ?? '#b51c00'} size={36} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="card absolute right-0 z-50 mt-2 w-60 rounded-2xl p-2 shadow-card-lg">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-ink">{profile.name}</p>
              <p className="truncate text-xs text-ink-muted">{profile.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              href={`/rowers/${profile.id}`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-container-low"
            >
              <Icon name="person" size={18} className="text-ink-soft" />
              My profile
            </Link>
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
