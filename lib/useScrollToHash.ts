'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * When the URL carries a `#<prefix>-<id>` hash (e.g. `#workout-abc` from a
 * notification deep link), scroll that element into view and return its id so
 * the page can briefly highlight it. The target often renders a beat after the
 * page reports "ready" (data + profile resolve separately), so we poll for the
 * element and only mark the hash handled once we actually find it. Also re-runs
 * on `hashchange` so tapping a second notification still works.
 */
export function useScrollToHash(prefix: string, ready: boolean): string | null {
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const handled = useRef('');

  const run = useCallback(() => {
    if (!ready || typeof window === 'undefined') return;
    const hash = window.location.hash;
    const match = hash.match(new RegExp(`^#${prefix}-(.+)$`));
    if (!match || hash === handled.current) return;
    const id = match[1];
    let attempts = 0;
    const tryScroll = () => {
      const el = document.getElementById(`${prefix}-${id}`);
      if (el) {
        handled.current = hash;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setHighlightId(id);
        window.setTimeout(() => setHighlightId((cur) => (cur === id ? null : cur)), 2600);
      } else if (attempts++ < 30) {
        window.setTimeout(tryScroll, 80); // content may still be rendering
      }
    };
    tryScroll();
  }, [prefix, ready]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    const onHash = () => {
      handled.current = '';
      run();
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [run]);

  return highlightId;
}
