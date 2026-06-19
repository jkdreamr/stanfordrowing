'use client';

import { useMemo, useRef, useState } from 'react';
import { User, WorkoutComment } from '@/lib/types';
import { getUserById } from '@/lib/data';
import { timeAgo } from '@/lib/stats';
import { Mentionable, useMentionAutocomplete } from '@/lib/mentions';
import Avatar from './Avatar';
import Icon from './Icon';
import MentionText from './MentionText';
import MentionDropdown from './MentionDropdown';

interface CommentSectionProps {
  comments: WorkoutComment[];
  currentUser: User | null;
  /** parentId is set when replying to a thread. */
  onAdd: (body: string, parentId?: string) => Promise<boolean>;
  onDelete: (commentId: string) => void;
  /** 'card' for the dark feed card; 'overlay' for the story modal over media. */
  tone?: 'card' | 'overlay';
  avatarById?: Record<string, string>;
  /** People who can be @-mentioned (enables autocomplete + highlighting). */
  mentionables?: Mentionable[];
}

const MAX_LENGTH = 280;

function commentName(comment: WorkoutComment): string {
  return getUserById(comment.userId)?.name ?? comment.userName ?? 'Rower';
}

export default function CommentSection({
  comments,
  currentUser,
  onAdd,
  onDelete,
  tone = 'card',
  avatarById,
  mentionables = [],
}: CommentSectionProps) {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<{ parentId: string; name: string } | null>(null);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const applyDraft = (v: string) => setDraft(v.slice(0, MAX_LENGTH));
  const mention = useMentionAutocomplete(draft, applyDraft, mentionables, inputRef);

  const overlay = tone === 'overlay';
  const nameClass = overlay ? 'text-white' : 'text-charcoal';
  const bodyClass = overlay ? 'text-white/80' : 'text-charcoal-soft';
  const metaClass = overlay ? 'text-white/45' : 'text-charcoal-light';
  const replyBtnClass = overlay ? 'text-white/55 hover:text-white' : 'text-charcoal-muted hover:text-charcoal';
  const inputClass = overlay
    ? 'bg-white/10 text-white placeholder:text-white/40 border-white/15'
    : 'bg-bone-dark/40 text-charcoal placeholder:text-charcoal-light border-white/[0.08]';

  // One-level threads: top-level comments + replies grouped by parent.
  const { topLevel, repliesByParent } = useMemo(() => {
    const tops: WorkoutComment[] = [];
    const map = new Map<string, WorkoutComment[]>();
    for (const c of comments) {
      if (c.parentId) {
        const list = map.get(c.parentId) ?? [];
        list.push(c);
        map.set(c.parentId, list);
      } else {
        tops.push(c);
      }
    }
    return { topLevel: tops, repliesByParent: map };
  }, [comments]);

  const startReply = (parentId: string, name: string) => {
    setReplyTo({ parentId, name });
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError('');
    const ok = await onAdd(body, replyTo?.parentId);
    setSending(false);
    if (ok) {
      setDraft('');
      setReplyTo(null);
    } else {
      setError('Could not post. Try again.');
    }
  };

  const renderComment = (c: WorkoutComment, isReply: boolean, threadParentId: string) => {
    const name = commentName(c);
    const mine = currentUser?.id === c.userId;
    return (
      <li key={c.id} className="group flex items-start gap-2.5">
        <Avatar name={name} size={isReply ? 24 : 28} src={avatarById?.[c.userId]} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`text-[12.5px] font-semibold tracking-editorial ${nameClass}`}>{name}</span>
            <span className={`text-[10.5px] ${metaClass}`}>{timeAgo(c.createdAt)}</span>
          </div>
          <p className={`mt-0.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed ${bodyClass}`}>
            <MentionText
              text={c.body}
              mentionables={mentionables}
              mentionClassName={overlay ? 'font-semibold text-white' : 'font-semibold text-coral'}
            />
          </p>
          {currentUser && (
            <button
              type="button"
              onClick={() => startReply(threadParentId, name)}
              className={`mt-1 text-[11px] font-semibold ${replyBtnClass}`}
            >
              Reply
            </button>
          )}
        </div>
        {mine && (
          <button
            type="button"
            onClick={() => onDelete(c.id)}
            aria-label="Delete comment"
            className={`shrink-0 rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100 ${
              overlay ? 'text-white/50 hover:text-white' : 'text-charcoal-light hover:text-coral'
            }`}
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-3">
      {topLevel.length > 0 && (
        <ul className="space-y-3">
          {topLevel.map((c) => {
            const replies = repliesByParent.get(c.id) ?? [];
            return (
              <li key={c.id}>
                <ul>{renderComment(c, false, c.id)}</ul>
                {replies.length > 0 && (
                  <ul className="ml-9 mt-2.5 space-y-2.5 border-l border-white/[0.06] pl-3">
                    {replies.map((r) => renderComment(r, true, c.id))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {currentUser ? (
        <div className="space-y-1.5">
          {replyTo && (
            <div className={`flex items-center gap-1.5 text-[11px] ${metaClass}`}>
              <Icon name="reply" size={13} />
              <span>
                Replying to <span className={`font-semibold ${nameClass}`}>{replyTo.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                aria-label="Cancel reply"
                className="ml-0.5 hover:text-coral"
              >
                <Icon name="close" size={13} />
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
            {mention.open && focused && (
              <MentionDropdown
                suggestions={mention.suggestions}
                activeIndex={mention.activeIndex}
                onHover={mention.setActiveIndex}
                onPick={mention.select}
                avatarById={avatarById}
                query={mention.query}
              />
            )}
            <input
              ref={inputRef}
              type="text"
              enterKeyHint="send"
              value={draft}
              onChange={(e) => applyDraft(e.target.value)}
              onKeyDown={mention.onKeyDown}
              onKeyUp={mention.onSelectionChange}
              onClick={mention.onSelectionChange}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              placeholder={replyTo ? `Reply to ${replyTo.name}…` : 'Add a comment…'}
              disabled={sending}
              className={`focus-ring min-w-0 flex-1 rounded-pill border px-3.5 py-2.5 text-[14px] transition-colors disabled:opacity-50 ${inputClass}`}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              aria-label="Post comment"
              className="focus-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-white transition-colors hover:bg-coral-dark disabled:opacity-40 active:scale-95"
            >
              <Icon name="send" size={18} />
            </button>
          </form>
        </div>
      ) : (
        <p className={`text-[12px] ${metaClass}`}>Sign in to comment.</p>
      )}
      {error && <p className="text-[11px] text-coral">{error}</p>}
    </div>
  );
}
