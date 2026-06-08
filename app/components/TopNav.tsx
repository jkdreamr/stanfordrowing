'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId } from '@/lib/userProfile';
import AuthStatus from './AuthStatus';

const NAV = [
  { href: '/', label: 'Feed' },
  { href: '/rowers', label: 'Rowers' },
  { href: '/log', label: 'Log' },
  { href: '/locker-room', label: 'Locker' },
  { href: '/leaderboard', label: 'Board' },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Wordmark() {
  return (
    <Link href="/" className="focus-ring flex items-center gap-2 rounded-md">
      <span className="font-display text-[15px] font-semibold tracking-editorial text-charcoal">
        Cardinal Row
      </span>
    </Link>
  );
}

export default function TopNav() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async (authId: string | undefined) => {
      if (!authId) { setIsAdmin(false); return; }
      const p = await getProfileByAuthId(authId);
      setIsAdmin(p?.isAdmin ?? false);
    };
    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      checkAdmin(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-14 border-b border-stone/30 bg-bone/80 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-container items-center justify-between gap-4 px-5 lg:px-8">
        <Wordmark />

        {/* Desktop nav — quiet pills */}
        <nav className="hidden items-center gap-0.5 sm:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-charcoal/8 text-charcoal'
                    : 'text-charcoal-muted hover:text-charcoal'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={isActive(pathname, '/admin') ? 'page' : undefined}
              className={`focus-ring rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                isActive(pathname, '/admin')
                  ? 'bg-charcoal/8 text-charcoal'
                  : 'text-charcoal-muted hover:text-charcoal'
              }`}
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <AuthStatus />
        </div>
      </div>
    </header>
  );
}
