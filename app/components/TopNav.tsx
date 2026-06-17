'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId } from '@/lib/userProfile';
import { isAdminEmail } from '@/lib/data';
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
    <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-[10px] bg-coral text-white shadow-glow">
        <span className="material-symbols-outlined fill" style={{ fontSize: 19 }}>
          rowing
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-semibold tracking-editorial text-charcoal">
          Cardinal Row
        </span>
        <span className="label-caps mt-1 text-charcoal-light">Stanford Rowing</span>
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
      setIsAdmin(isAdminEmail(p?.email));
    };
    supabase.auth.getSession().then(({ data }) => checkAdmin(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      checkAdmin(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header
      className="glass fixed top-0 inset-x-0 z-40 border-b border-white/[0.06]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex h-16 max-w-container items-center justify-between gap-4 px-5 lg:px-8">
        <Wordmark />

        {/* Desktop nav — quiet pills */}
        <nav className="hidden items-center gap-0.5 rounded-pill border border-white/[0.06] bg-white/[0.03] p-1 sm:flex">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`focus-ring rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-white/[0.08] text-charcoal shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
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
              className={`focus-ring rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                isActive(pathname, '/admin')
                  ? 'bg-white/[0.08] text-charcoal'
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
