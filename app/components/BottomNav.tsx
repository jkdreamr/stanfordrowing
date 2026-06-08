'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

const ITEMS = [
  { href: '/', label: 'Feed', icon: 'dynamic_feed' },
  { href: '/rowers', label: 'Rowers', icon: 'groups' },
  { href: '/log', label: 'Log', icon: 'add', primary: true },
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
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#0d1110]/90 sm:hidden">
      <div className="flex items-end justify-around px-2 pb-safe">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);

          if (item.primary) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label="Log the work"
                className="flex min-h-[64px] flex-col items-center justify-center gap-1 px-2 touch-manipulation"
              >
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-white shadow-glow transition-all duration-200 active:scale-90 ${
                    active ? 'ring-2 ring-white/20' : ''
                  }`}
                >
                  <Icon name={item.icon} size={26} />
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
              className={`flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 px-2 transition-colors active:scale-95 touch-manipulation ${
                active ? 'text-charcoal' : 'text-charcoal-muted'
              }`}
            >
              <Icon name={item.icon} size={23} fill={active} />
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
