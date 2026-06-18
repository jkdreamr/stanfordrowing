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
    return <div className="skeleton h-9 w-9 animate-shimmer rounded-full" />;
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="focus-ring inline-flex min-h-[36px] items-center justify-center rounded-pill bg-coral px-5 py-2 text-[13px] font-semibold text-white shadow-glow transition-colors hover:bg-coral-dark touch-manipulation"
      >
        Log in
      </Link>
    );
  }

  const handleSignOut = async () => {
    setOpen(false);
    try {
      // 'local' clears this device immediately without a server round-trip, so a
      // flaky mobile connection can't leave sign-out half-done (the global default
      // calls the server first and, on failure, never clears the local session).
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      /* clear locally regardless of network */
    }
    setProfile(null);
    // Hard reload to fully reset app state and drop any already-loaded data.
    window.location.href = '/';
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="focus-ring flex h-10 w-10 items-center justify-center rounded-full p-0.5 transition-transform active:scale-95 touch-manipulation"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={profile.name} size={32} src={profile.avatarUrl} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className="card-solid absolute right-0 z-50 mt-2 w-56 p-2 shadow-modal" style={{borderRadius: '14px'}}>
            <div className="px-3 py-2">
              <p className="text-[13px] font-semibold text-charcoal">{profile.name}</p>
              <p className="truncate text-[11px] text-charcoal-muted">{profile.email}</p>
            </div>
            <div className="my-1 h-px bg-stone/40" />
            <Link
              href={`/rowers/${profile.id}`}
              onClick={() => setOpen(false)}
              className="flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium text-charcoal hover:bg-stone-light touch-manipulation"
            >
              <Icon name="person" size={18} className="text-charcoal-muted" />
              Profile
            </Link>
            <Link
              href="/log"
              onClick={() => setOpen(false)}
              className="flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2.5 text-[14px] font-medium text-charcoal hover:bg-stone-light touch-manipulation"
            >
              <Icon name="edit_note" size={18} className="text-charcoal-muted" />
              Log a workout
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-[40px] w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[14px] font-medium text-charcoal hover:bg-stone-light touch-manipulation"
            >
              <Icon name="logout" size={18} className="text-charcoal-muted" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
