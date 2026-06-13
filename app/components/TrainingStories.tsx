'use client';

import { useRef } from 'react';
import { Story, User } from '@/lib/types';
import { isAuthorSeen } from '@/lib/storySeen';
import Avatar from './Avatar';
import Icon from './Icon';

interface TrainingStoriesProps {
  /** Stories from the last 24h, newest-first. */
  stories: Story[];
  currentUser: User | null;
  currentUserAvatarUrl?: string | null;
  /** authorId -> ISO timestamp the current user last viewed up to. */
  seenMap?: Record<string, string>;
  /** Open the viewer for a given author. */
  onView: (authorId: string) => void;
  /** Upload a new photo/video story. */
  onUpload?: (file: File) => void;
  uploading?: boolean;
  /** Locked preview (logged-out) — taps + upload disabled. */
  locked?: boolean;
}

interface AuthorEntry {
  authorId: string;
  authorName: string;
  latest: Story;
}

function StoryThumb({ story }: { story: Story }) {
  if (story.mediaType === 'video') {
    return <video src={story.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={story.mediaUrl} alt="" className="h-full w-full object-cover" />;
}

export default function TrainingStories({
  stories,
  currentUser,
  currentUserAvatarUrl,
  seenMap = {},
  onView,
  onUpload,
  uploading = false,
  locked = false,
}: TrainingStoriesProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  // One ring per author (their most recent story).
  const seenDedup = new Set<string>();
  const all: AuthorEntry[] = [];
  for (const s of stories) {
    if (seenDedup.has(s.userId)) continue;
    seenDedup.add(s.userId);
    all.push({ authorId: s.userId, authorName: s.userName, latest: s });
  }

  const ownLatest = currentUser ? all.find((a) => a.authorId === currentUser.id)?.latest : undefined;

  // Other authors, decorated with seen-state and sorted unseen-first.
  const others = all
    .filter((a) => a.authorId !== currentUser?.id)
    .map((a) => ({ ...a, seen: locked || isAuthorSeen(seenMap, a.authorId, a.latest.createdAt) }))
    .sort((x, y) => (x.seen === y.seen ? y.latest.createdAt.localeCompare(x.latest.createdAt) : x.seen ? 1 : -1));

  const canUpload = !locked && !!currentUser && !!onUpload;

  if (others.length === 0 && !canUpload && !locked) return null;

  const triggerUpload = () => fileRef.current?.click();
  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpload) onUpload(file);
    e.target.value = '';
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between px-1">
        <p className="label-caps text-charcoal-muted">Stories</p>
        {locked && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-charcoal-light">
            <Icon name="lock" size={12} /> Locked
          </span>
        )}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 sm:-mx-1 sm:px-1">
        {/* Your story — view own (if any) + add */}
        {currentUser && !locked && (
          <div className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
            <div className="relative">
              {ownLatest ? (
                <button
                  type="button"
                  onClick={() => onView(currentUser.id)}
                  aria-label="Your story"
                  className="story-ring-seen block rounded-full transition-transform active:scale-95"
                >
                  <span className="block rounded-full bg-bone p-0.5">
                    <span className="block h-14 w-14 overflow-hidden rounded-full bg-container">
                      <StoryThumb story={ownLatest} />
                    </span>
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={triggerUpload}
                  disabled={uploading}
                  aria-label="Add to your story"
                  className="block rounded-full transition-transform active:scale-95 disabled:opacity-60"
                >
                  <span className="block rounded-full border border-dashed border-white/20 bg-white/[0.04] p-0.5">
                    <span className="block rounded-full bg-bone p-0.5">
                      <Avatar name={currentUser.name} size={56} src={currentUserAvatarUrl} />
                    </span>
                  </span>
                </button>
              )}
              {canUpload && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); triggerUpload(); }}
                  disabled={uploading}
                  aria-label="Add to your story"
                  className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-coral text-white ring-2 ring-[#0d1110] transition-transform active:scale-90 disabled:opacity-60"
                >
                  <Icon name={uploading ? 'hourglass_empty' : 'add'} size={15} />
                </button>
              )}
            </div>
            <span className="mt-1 text-[11px] font-medium text-charcoal-soft">
              {uploading ? 'Posting…' : 'Your story'}
            </span>
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handlePick} />
          </div>
        )}

        {/* Author rings */}
        {others.map((a) => (
          <button
            key={a.authorId}
            type="button"
            onClick={() => !locked && onView(a.authorId)}
            disabled={locked}
            className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 transition-transform active:scale-95 disabled:cursor-default"
          >
            <span className={`relative ${a.seen ? 'story-ring-seen' : 'story-ring'}`}>
              <span className={`block rounded-full bg-bone p-0.5 ${a.seen ? 'opacity-80' : ''}`}>
                <span className="block h-14 w-14 overflow-hidden rounded-full bg-container">
                  <StoryThumb story={a.latest} />
                </span>
              </span>
              {locked && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-bone-dark ring-1 ring-white/10">
                  <Icon name="lock" size={11} className="text-charcoal-muted" />
                </span>
              )}
            </span>
            <span className="mt-1 max-w-[64px] truncate text-[11px] font-medium text-charcoal-soft">
              {a.authorName.split(' ')[0].split('-')[0]}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
