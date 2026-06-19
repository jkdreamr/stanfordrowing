'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

export interface Mentionable {
  id: string;
  name: string;
}

export interface MentionSpan {
  start: number;
  end: number;
  id: string;
  name: string;
}

const WORD_CHAR = /[a-zA-Z0-9]/;

/**
 * Find every `@Name` in `text` that resolves to a known person. Greedy
 * longest-name match so names with spaces ("Joshua Koo") win over prefixes,
 * and the `@` must start the text or follow whitespace (so emails don't match).
 */
export function findMentionSpans(text: string, mentionables: Mentionable[]): MentionSpan[] {
  if (!text || mentionables.length === 0) return [];
  const sorted = [...mentionables].sort((a, b) => b.name.length - a.name.length);
  const lower = text.toLowerCase();
  const spans: MentionSpan[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === '@' && (i === 0 || /\s/.test(text[i - 1]))) {
      let matched: Mentionable | null = null;
      for (const m of sorted) {
        const name = m.name.toLowerCase();
        if (name && lower.startsWith(name, i + 1)) {
          const endChar = text[i + 1 + m.name.length];
          if (endChar === undefined || !WORD_CHAR.test(endChar)) {
            matched = m;
            break;
          }
        }
      }
      if (matched) {
        spans.push({ start: i, end: i + 1 + matched.name.length, id: matched.id, name: matched.name });
        i = i + 1 + matched.name.length;
        continue;
      }
    }
    i++;
  }
  return spans;
}

/** Unique ids of people mentioned in `text`. */
export function parseMentions(text: string, mentionables: Mentionable[]): string[] {
  return Array.from(new Set(findMentionSpans(text, mentionables).map((s) => s.id)));
}

/** The in-progress `@query` immediately before the caret, if any. */
function getActiveMentionQuery(
  text: string,
  caret: number,
  mentionables: Mentionable[]
): { atIndex: number; query: string } | null {
  const stop = Math.max(0, caret - 50);
  for (let i = caret - 1; i >= stop; i--) {
    const ch = text[i];
    if (ch === '\n') return null;
    if (ch === '@') {
      if (i !== 0 && !/\s/.test(text[i - 1])) return null;
      const query = text.slice(i + 1, caret);
      if (query.includes('\n')) return null;
      const q = query.toLowerCase();
      const matches = mentionables.some((m) => m.name.toLowerCase().startsWith(q));
      return matches ? { atIndex: i, query } : null;
    }
  }
  return null;
}

type Field = HTMLInputElement | HTMLTextAreaElement;

/**
 * Drives an @-mention autocomplete over a controlled input/textarea. The
 * consumer owns `value`/`onChange` and renders the dropdown from the returned
 * `suggestions`/`open`/`activeIndex`, wiring `onKeyDown` and `onSelectionChange`.
 */
export function useMentionAutocomplete(
  value: string,
  onChange: (next: string) => void,
  mentionables: Mentionable[],
  fieldRef: React.RefObject<Field>
) {
  const [active, setActive] = useState<{ atIndex: number; query: string } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const recompute = useCallback(() => {
    const el = fieldRef.current;
    if (!el) {
      setActive(null);
      return;
    }
    const caret = el.selectionStart ?? value.length;
    setActive(getActiveMentionQuery(value, caret, mentionables));
    setActiveIndex(0);
  }, [value, mentionables, fieldRef]);

  useEffect(() => {
    recompute();
  }, [recompute]);

  const suggestions = useMemo(() => {
    if (!active) return [];
    const q = active.query.toLowerCase();
    return mentionables.filter((m) => m.name.toLowerCase().startsWith(q)).slice(0, 6);
  }, [active, mentionables]);

  const open = !!active && suggestions.length > 0;

  const select = useCallback(
    (m: Mentionable) => {
      const el = fieldRef.current;
      if (!active || !el) return;
      const caret = el.selectionStart ?? value.length;
      const before = value.slice(0, active.atIndex);
      const after = value.slice(caret);
      const insert = `@${m.name} `;
      onChange(before + insert + after);
      setActive(null);
      const pos = (before + insert).length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [active, value, onChange, fieldRef]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        select(suggestions[activeIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActive(null);
      }
    },
    [open, suggestions, activeIndex, select]
  );

  return { open, suggestions, activeIndex, setActiveIndex, select, onKeyDown, onSelectionChange: recompute };
}
