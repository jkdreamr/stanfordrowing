'use client';

import { Mentionable } from '@/lib/mentions';
import Avatar from './Avatar';

interface MentionDropdownProps {
  suggestions: Mentionable[];
  activeIndex: number;
  onHover: (index: number) => void;
  onPick: (m: Mentionable) => void;
  avatarById?: Record<string, string>;
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
            <span className="truncate text-[13px] font-medium text-charcoal">{m.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
