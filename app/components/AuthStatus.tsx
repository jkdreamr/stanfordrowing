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
    return <div className="h-8 w-8 animate-pulse rounded-full bg-stone-light" />;
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="focus-ring rounded-full bg-charcoal px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-charcoal/90"
      >
        Log in
      </Link>
    );
  }

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
        className="focus-ring rounded-full p-0.5 transition-transform active:scale-95"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Avatar name={profile.name} size={32} />
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
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-charcoal hover:bg-stone-light"
            >
              <Icon name="person" size={16} className="text-charcoal-muted" />
              Profile
            </Link>
            <Link
              href="/log"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium text-charcoal hover:bg-stone-light"
            >
              <Icon name="edit_note" size={16} className="text-charcoal-muted" />
              Log a workout
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-charcoal hover:bg-stone-light"
            >
              <Icon name="logout" size={16} className="text-charcoal-muted" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
