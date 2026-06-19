'use client';

import Link from 'next/link';
import { Fragment } from 'react';
import { findMentionSpans, Mentionable } from '@/lib/mentions';

interface MentionTextProps {
  text: string;
  mentionables?: Mentionable[];
  /** Tailwind classes for the highlighted @mention. */
  mentionClassName?: string;
}

/**
 * Renders body text with any `@Name` highlighted and linked to that rower's
 * profile. Falls back to plain text when there are no resolvable mentions.
 */
export default function MentionText({
  text,
  mentionables = [],
  mentionClassName = 'font-semibold text-coral hover:underline',
}: MentionTextProps) {
  const spans = findMentionSpans(text, mentionables);
  if (spans.length === 0) return <>{text}</>;

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((s, i) => {
    if (s.start > cursor) nodes.push(<Fragment key={`t${i}`}>{text.slice(cursor, s.start)}</Fragment>);
    nodes.push(
      <Link key={`m${i}`} href={`/rowers/${s.id}`} className={mentionClassName}>
        {text.slice(s.start, s.end)}
      </Link>
    );
    cursor = s.end;
  });
  if (cursor < text.length) nodes.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);

  return <>{nodes}</>;
}
