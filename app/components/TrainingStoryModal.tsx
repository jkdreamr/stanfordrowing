'use client';

import { useEffect, useState } from 'react';
import { Story, StoryComment, User } from '@/lib/types';
import { timeAgo } from '@/lib/stats';
import { addStoryComment, deleteStoryComment, fetchStoryComments } from '@/lib/stories';
import Avatar from './Avatar';
import Icon from './Icon';

interface StoryViewerProps {
  /** One author's stories, newest-first. */
  stories: Story[];
  currentUser: User | null;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function TrainingStoryModal({ stories, currentUser, onDelete, onClose }: StoryViewerProps) {
  // Play oldest → newest for a natural sequence.
  const ordered = [...stories].reverse();
  const [index, setIndex] = useState(0);
  const story = ordered[index];

  const [comments, setComments] = useState<StoryComment[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const next = () => setIndex((i) => (i + 1 >= ordered.length ? (onClose(), i) : i + 1));
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  // Load comments whenever the visible story changes.
  useEffect(() => {
    if (!story) return;
    let active = true;
    setComments([]);
    fetchStoryComments(story.id)
      .then((c) => active && setComments(c))
      .catch(() => active && setComments([]));
    return () => {
      active = false;
    };
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA';
      if (e.key === 'Escape') onClose();
      if (typing) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered.length]);

  if (!story) return null;
  const isOwn = currentUser?.id && story.userId === currentUser.id;
  const recent = comments.slice(-4);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !currentUser || sending) return;
    setSending(true);
    try {
      const c = await addStoryComment({ storyId: story.id, userId: currentUser.id, userName: currentUser.name, body });
      setComments((prev) => [...prev, c]);
      setDraft('');
    } catch {
      /* keep the draft so the user can retry */
    } finally {
      setSending(false);
    }
  };

  const removeComment = async (id: string) => {
    const previous = comments;
    setComments((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteStoryComment(id);
    } catch {
      setComments(previous);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      <div
        className="animate-story-in relative flex h-[100svh] w-full max-w-sm flex-col overflow-hidden bg-black sm:h-[90dvh] sm:rounded-[28px] sm:shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress segments */}
        <div className="absolute inset-x-0 top-0 z-30 flex gap-1 p-3">
          {ordered.map((_, i) => (
            <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className={`block h-full bg-white/90 transition-all ${i <= index ? 'w-full' : 'w-0'}`} />
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between p-4 pt-6">
          <div className="flex items-center gap-2.5">
            <Avatar name={story.userName} size={36} />
            <div>
              <p className="text-sm font-semibold text-white">{story.userName}</p>
              <p className="mt-0.5 text-[11px] text-white/55">{timeAgo(story.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwn && onDelete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(story.id); }}
                aria-label="Delete story"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              >
                <Icon name="delete" size={17} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>

        {/* Media */}
        <div className="relative flex flex-1 items-center justify-center">
          {story.mediaType === 'video' ? (
            <video
              key={story.id}
              src={story.mediaUrl}
              className="max-h-full w-full object-contain"
              autoPlay
              playsInline
              controls
              onEnded={next}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={story.mediaUrl} alt={story.caption || 'Story'} className="max-h-full w-full object-contain" />
          )}

          {/* Tap zones for images — leave the bottom clear for comments/input */}
          {story.mediaType === 'image' && (
            <>
              <button type="button" aria-label="Previous" onClick={prev} className="absolute left-0 top-16 bottom-40 w-1/3" />
              <button type="button" aria-label="Next" onClick={next} className="absolute right-0 top-16 bottom-40 w-2/3" />
            </>
          )}
        </div>

        {/* Bottom: caption + comments (bottom-left) + input */}
        <div className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-14">
          {story.caption && (
            <p className="mb-2 px-1 text-[14px] leading-relaxed text-white/90">{story.caption}</p>
          )}

          {recent.length > 0 && (
            <div className="mb-2 space-y-1.5">
              {recent.map((c) => {
                const canDelete = currentUser?.id === c.userId || isOwn;
                return (
                  <div key={c.id} className="group flex w-fit max-w-[88%] items-start gap-1.5 rounded-2xl bg-black/45 px-3 py-1.5 backdrop-blur-sm">
                    <p className="text-[12.5px] leading-snug text-white/90">
                      <span className="font-semibold text-white">{c.userName ?? 'Rower'}</span>{' '}
                      {c.body}
                    </p>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => removeComment(c.id)}
                        aria-label="Delete comment"
                        className="mt-0.5 shrink-0 text-white/40 transition-colors hover:text-white"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {currentUser ? (
            <form onSubmit={submit} className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={280}
                enterKeyHint="send"
                placeholder="Add a comment…"
                className="h-12 flex-1 rounded-full border border-white/15 bg-white/12 px-4 text-[15px] text-white placeholder-white/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label="Post comment"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-coral text-white transition-transform active:scale-95 disabled:opacity-40 touch-manipulation"
              >
                <Icon name="send" size={18} />
              </button>
            </form>
          ) : (
            <p className="px-1 pb-1 text-[12px] text-white/55">Sign in to comment.</p>
          )}
        </div>
      </div>
    </div>
  );
}
