'use client';

import { useMemo, useState } from 'react';
import Avatar from './Avatar';
import ReactionsSheet, { Reactor } from './ReactionsSheet';

interface ReactionsSummaryProps {
  reactors: Reactor[];
  usersById?: Record<string, { name: string; avatarUrl?: string }>;
  currentUserId?: string;
  title?: string;
  className?: string;
}

/**
 * Compact face-pile of who reacted. Tapping opens a sheet with the full list.
 * Renders nothing when there are no reactions.
 */
export default function ReactionsSummary({
  reactors,
  usersById,
  currentUserId,
  title,
  className = '',
}: ReactionsSummaryProps) {
  const [open, setOpen] = useState(false);

  // Unique people (a person may react with several emoji in the locker room).
  const people = useMemo(() => {
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const r of reactors) {
      if (!seen.has(r.userId)) {
        seen.add(r.userId);
        ids.push(r.userId);
      }
    }
    return ids;
  }, [reactors]);

  if (people.length === 0) return null;

  const shown = people.slice(0, 3);
  const overflow = people.length - shown.length;
  const label = `${people.length} ${people.length === 1 ? 'person' : 'people'} reacted — see who`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        title="See who reacted"
        className={`group inline-flex min-h-[44px] items-center rounded-full pr-1 transition-opacity hover:opacity-90 active:scale-95 touch-manipulation ${className}`}
      >
        <span className="flex items-center -space-x-2">
          {shown.map((id) => {
            const person = usersById?.[id];
            return (
              <span key={id} className="rounded-full ring-2 ring-[#141a18]">
                <Avatar name={person?.name ?? 'Teammate'} size={22} src={person?.avatarUrl} />
              </span>
            );
          })}
          {overflow > 0 && (
            <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-white/[0.1] px-1 text-[10px] font-semibold tabular text-charcoal-soft ring-2 ring-[#141a18]">
              +{overflow}
            </span>
          )}
        </span>
      </button>

      {open && (
        <ReactionsSheet
          reactors={reactors}
          usersById={usersById}
          currentUserId={currentUserId}
          title={title}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
