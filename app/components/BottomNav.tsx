'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const ITEMS = [
  { href: '/', label: 'Feed', icon: 'dynamic_feed' },
  { href: '/rowers', label: 'Rowers', icon: 'groups' },
  { href: '/log', label: 'Log', icon: 'add', primary: true },
  { href: '/locker-room', label: 'Locker', icon: 'bolt' },
  { href: '/leaderboard', label: 'Ranks', icon: 'leaderboard' },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line shadow-nav sm:hidden">
      <div className="flex items-end justify-around px-1 pt-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Log a workout"
                className="flex flex-1 flex-col items-center pb-1"
              >
                <span className="mb-0.5 flex h-14 w-14 -translate-y-3 items-center justify-center rounded-2xl bg-cardinal text-white shadow-cardinal transition-transform duration-150 active:scale-90">
                  <Icon name={item.icon} size={28} />
                </span>
                <span className={`-mt-3 text-[10px] font-semibold leading-none ${active ? 'text-cardinal' : 'text-ink-muted'}`}>
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center gap-1 pb-1 pt-0.5 transition-colors active:scale-95 ${
                active ? 'text-cardinal' : 'text-ink-muted'
              }`}
            >
              <Icon name={item.icon} size={24} fill={active} />
              <span className="text-[10px] font-semibold leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
