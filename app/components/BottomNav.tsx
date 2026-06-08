'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const ITEMS = [
  { href: '/', label: 'Feed', icon: 'dynamic_feed' },
  { href: '/log', label: 'Log', icon: 'edit_note', primary: true },
  { href: '/rowers', label: 'Rowers', icon: 'groups' },
  { href: '/locker-room', label: 'Locker', icon: 'bolt' },
  { href: '/leaderboard', label: 'Board', icon: 'leaderboard' },
];

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-stone/40 bg-bone/90 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-around px-2 pt-1.5">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Log the work"
                className="flex flex-col items-center gap-0.5 pb-1"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-90 ${
                  active
                    ? 'bg-coral text-white shadow-sm'
                    : 'bg-coral/90 text-white'
                }`}>
                  <Icon name={item.icon} size={22} />
                </span>
                <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-coral' : 'text-charcoal-muted'}`}>
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
              className={`flex flex-col items-center gap-0.5 pb-1 pt-1 transition-colors active:scale-95 ${
                active ? 'text-charcoal' : 'text-charcoal-muted'
              }`}
            >
              <Icon name={item.icon} size={22} fill={active} />
              <span className={`text-[9px] font-semibold tracking-wide ${active ? 'text-charcoal' : 'text-charcoal-muted'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
