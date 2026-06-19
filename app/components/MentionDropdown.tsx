'use client';

import { Fragment, ReactNode } from 'react';
import { Mentionable } from '@/lib/mentions';
import Avatar from './Avatar';

interface MentionDropdownProps {
  suggestions: Mentionable[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (m: Mentionable) => void;
  avatarById?: Record<string, string>;
  /** Current `@query` — its first occurrence in each name is bolded. */
  query?: string;
}

/** Render `name` with the first case-insensitive occurrence of `query` bolded. */
function highlightMatch(name: string, query: string): ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return name;
  const idx = name.toLowerCase().indexOf(q);
  if (idx < 0) return name;
  return (
    <Fragment>
      {name.slice(0, idx)}
      <span className="font-semibold text-charcoal">{name.slice(idx, idx + q.length)}</span>
      {name.slice(idx + q.length)}
    </Fragment>
  );
}

/**
 * Autocomplete list for @-mentions, anchored above the field. The parent renders
 * this only when there are suggestions and wraps the field in a `relative` box.
 */
export default function MentionDropdown({
  suggestions,
  activeIndex,
  onHover,
  onPick,
  avatarById,
  query = '',
}: MentionDropdownProps) {
  return (
    <ul
      role="listbox"
      className="card-solid absolute bottom-full left-0 z-30 mb-2 max-h-56 w-full overflow-y-auto py-1 shadow-modal sm:w-72"
      style={{ borderRadius: '14px' }}
    >
      {suggestions.map((m, i) => (
        <li key={m.id}>
          <button
            type="button"
            role="option"
            aria-selected={i === activeIndex}
            // mousedown (not click) + preventDefault keeps the field focused so the insert lands.
            onMouseDown={(e) => {
              e.preventDefault();
              onPick(m);
            }}
            onMouseEnter={() => onHover(i)}
            className={`flex min-h-[44px] w-full items-center gap-2.5 px-3 text-left transition-colors touch-manipulation ${
              i === activeIndex ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]'
            }`}
          >
            <Avatar name={m.name} size={26} src={avatarById?.[m.id]} />
            <span className="truncate text-[13px] text-charcoal-soft">{highlightMatch(m.name, query)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
