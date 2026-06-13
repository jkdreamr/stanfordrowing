'use client';

import { ReactNode, useEffect, useRef } from 'react';
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
 * camera when already on the feed).
 *
 * Listeners are bound to `document` (not a wrapping element) so the gesture
 * registers across the WHOLE screen — including the area behind the fixed
 * bottom nav, which is a sibling of this component and otherwise swallows
 * touches that start near the bottom.
 *
 * Gestures are ignored when they start on horizontally scrollable rails,
 * inputs, media, open overlays (anything marked data-no-swipe), or within
 * 24px of the screen edges (reserved for the browser's back/forward gestures).
 */
export default function SwipeNav({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const start = useRef<SwipeState | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) {
        start.current = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      const skip =
        window.innerWidth >= 640 ||
        !!target?.closest?.('[data-no-swipe], input, textarea, select, video') ||
        touch.clientX < 24 ||
        touch.clientX > window.innerWidth - 24;
      start.current = { x: touch.clientX, y: touch.clientY, t: Date.now(), skip };
    };

    const onEnd = (e: TouchEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.skip) return;

      const idx = SECTIONS.indexOf(pathname ?? '');
      if (idx < 0) return; // only top-level sections page horizontally

      const touch = e.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - s.x;
      const dy = touch.clientY - s.y;
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

    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [pathname, router]);

  return <>{children}</>;
}
