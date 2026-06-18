'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Avatar from './Avatar';
import Icon from './Icon';

export interface Reactor {
  userId: string;
  /** Present for emoji reactions (locker room); absent for feed respects. */
  emoji?: string;
}

interface ReactionsSheetProps {
  reactors: Reactor[];
  usersById?: Record<string, { name: string; avatarUrl?: string }>;
  currentUserId?: string;
  title?: string;
  onClose: () => void;
}

/**
 * Bottom sheet listing who reacted to a post. Groups multiple emoji from the
 * same person into one row, links each reactor to their profile, and dismisses
 * via scrim tap, the close button, or Escape.
 */
export default function ReactionsSheet({
  reactors,
  usersById,
  currentUserId,
  title = 'Reactions',
  onClose,
}: ReactionsSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Portal to <body> so the sheet escapes the feed card's stacking context
  // and overflow-hidden — otherwise it renders behind the post it belongs to.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // One row per person; collect any emoji they used (dedup, order preserved).
  const people = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, string[]>();
    for (const r of reactors) {
      if (!map.has(r.userId)) {
        map.set(r.userId, []);
        order.push(r.userId);
      }
      if (r.emoji && !map.get(r.userId)!.includes(r.emoji)) {
        map.get(r.userId)!.push(r.emoji);
      }
    }
    // Surface the current user first — people look for themselves.
    order.sort((a, b) => (a === currentUserId ? -1 : b === currentUserId ? 1 : 0));
    return order.map((userId) => ({ userId, emojis: map.get(userId) ?? [] }));
  }, [reactors, currentUserId]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} aria-hidden />

      <div className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[82dvh] max-w-lg animate-sheet-up flex-col rounded-t-[28px] border border-white/10 bg-[#161c1a] shadow-[0_-24px_60px_rgba(0,0,0,0.55)]">
        {/* Drag affordance */}
        <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-3">
          <h2 className="font-display text-[17px] font-semibold tracking-editorial text-charcoal">
            {title}
            <span className="ml-2 tabular text-[14px] font-medium text-charcoal-muted">{people.length}</span>
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="focus-ring -mr-1.5 flex h-11 w-11 items-center justify-center rounded-full text-charcoal-muted transition-colors hover:bg-white/[0.06] hover:text-charcoal touch-manipulation"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-[calc(env(safe-area-inset-bottom,0px)+14px)]">
          {people.map(({ userId, emojis }) => {
            const person = usersById?.[userId];
            const name = person?.name ?? 'Teammate';
            const isYou = userId === currentUserId;
            return (
              <Link
                key={userId}
                href={`/rowers/${userId}`}
                onClick={onClose}
                className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.05] active:bg-white/[0.07]"
              >
                <Avatar name={name} size={40} src={person?.avatarUrl} />
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-charcoal">
                  {name}
                  {isYou && (
                    <span className="ml-1.5 rounded-pill bg-white/[0.08] px-1.5 py-0.5 text-[10px] font-medium text-charcoal-muted">
                      You
                    </span>
                  )}
                </span>
                {emojis.length > 0 ? (
                  <span className="flex shrink-0 items-center gap-0.5 text-[18px] leading-none">
                    {emojis.map((e) => (
                      <span key={e}>{e}</span>
                    ))}
                  </span>
                ) : (
                  <Icon name="favorite" size={16} fill className="shrink-0 text-coral" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
}
