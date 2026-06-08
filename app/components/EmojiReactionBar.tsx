'use client';

import { useMemo, useState } from 'react';
import { LockerReaction, REACTION_EMOJIS } from '@/lib/types';
import Icon from './Icon';

interface EmojiReactionBarProps {
  reactions: LockerReaction[];
  currentUserId?: string;
  onToggle: (emoji: string) => void;
}

export default function EmojiReactionBar({ reactions, currentUserId, onToggle }: EmojiReactionBarProps) {
  const [open, setOpen] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, { count: number; mine: boolean }>();
    for (const r of reactions) {
      const g = map.get(r.emoji) ?? { count: 0, mine: false };
      g.count += 1;
      if (r.userId === currentUserId) g.mine = true;
      map.set(r.emoji, g);
    }
    return Array.from(map.entries())
      .map(([emoji, g]) => ({ emoji, ...g }))
      .sort((a, b) => b.count - a.count);
  }, [reactions, currentUserId]);

  const disabled = !currentUserId;

  const toggle = (emoji: string) => {
    if (disabled) return;
    onToggle(emoji);
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups.map((g) => (
        <button
          key={g.emoji}
          type="button"
          onClick={() => toggle(g.emoji)}
          disabled={disabled}
          aria-pressed={g.mine}
          className={`flex h-9 min-w-[44px] items-center justify-center gap-1 rounded-full border px-3 text-[14px] transition-colors active:scale-95 disabled:cursor-default touch-manipulation ${
            g.mine
              ? 'border-coral/50 bg-coral/15 text-charcoal'
              : 'border-white/10 bg-white/[0.04] text-charcoal-soft hover:bg-white/[0.07]'
          }`}
        >
          <span className="leading-none">{g.emoji}</span>
          <span className="tabular text-[12px] font-semibold">{g.count}</span>
        </button>
      ))}

      {!disabled && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Add a reaction"
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-charcoal-muted transition-colors hover:bg-white/[0.07] active:scale-95 touch-manipulation"
          >
            <Icon name="add_reaction" size={18} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} aria-hidden />
              <div className="card-solid absolute bottom-10 left-0 z-30 flex gap-1 rounded-2xl p-2 shadow-modal">
                {REACTION_EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => toggle(e)}
                    aria-label={`React ${e}`}
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-xl transition-transform hover:bg-white/10 hover:scale-110 active:scale-95 touch-manipulation"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
