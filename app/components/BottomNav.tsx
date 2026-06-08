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
      <div className="flex items-stretch justify-around px-2 pt-2">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Log a workout"
                className="flex flex-1 items-center justify-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cardinal text-white shadow-cardinal transition-transform duration-200 active:scale-90">
                  <Icon name={item.icon} size={26} />
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors active:scale-95 ${
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
