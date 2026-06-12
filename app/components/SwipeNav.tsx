'use client';

import { ReactNode, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/** Section order matches the bottom nav, left → right. */
const SECTIONS = ['/', '/rowers', '/log', '/locker-room', '/leaderboard'];

/** Fired when the user swipes right on the feed (Instagram: camera lives left of feed). */
export const OPEN_CAMERA_EVENT = 'cardinal:open-camera';

interface SwipeState {
  x: number;
  y: number;
  t: number;
  skip: boolean;
}

/**
 * Instagram-style horizontal navigation between top-level sections on mobile.
 * Swipe left → next section; swipe right → previous section (or the story
 * camera when already on the feed). Ignores gestures that start on
 * horizontally scrollable rails, media, inputs, overlays, or screen edges
 * (those belong to the browser's back/forward gestures).
 */
export default function SwipeNav({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const state = useRef<SwipeState | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const target = e.target as HTMLElement;
    const skip =
      window.innerWidth >= 640 ||
      !!target.closest?.('[data-no-swipe], input, textarea, select, video') ||
      t.clientX < 24 ||
      t.clientX > window.innerWidth - 24;
    state.current = { x: t.clientX, y: t.clientY, t: Date.now(), skip };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const s = state.current;
    state.current = null;
    if (!s || s.skip) return;

    const idx = SECTIONS.indexOf(pathname ?? '');
    if (idx < 0) return; // only top-level sections page horizontally

    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    const fast = Date.now() - s.t < 600;
    if (!fast || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;

    if (dx < 0) {
      if (idx + 1 < SECTIONS.length) router.push(SECTIONS[idx + 1]);
    } else if (idx === 0) {
      window.dispatchEvent(new CustomEvent(OPEN_CAMERA_EVENT));
    } else {
      router.push(SECTIONS[idx - 1]);
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} className="min-h-full">
      {children}
    </div>
  );
}
