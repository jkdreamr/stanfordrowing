'use client';

import { useEffect, useState } from 'react';
import { Story } from '@/lib/types';
import { timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

interface StoryViewerProps {
  /** One author's stories, newest-first. */
  stories: Story[];
  currentUserId?: string;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function TrainingStoryModal({
  stories,
  currentUserId,
  onDelete,
  onClose,
}: StoryViewerProps) {
  // Play oldest → newest for a natural sequence.
  const ordered = [...stories].reverse();
  const [index, setIndex] = useState(0);
  const story = ordered[index];

  const next = () => {
    setIndex((i) => {
      if (i + 1 >= ordered.length) {
        onClose();
        return i;
      }
      return i + 1;
    });
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
  const isOwn = currentUserId && story.userId === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />

      <div
        className="animate-story-in relative flex h-dvh w-full max-w-sm flex-col overflow-hidden bg-black sm:h-[88dvh] sm:rounded-[28px] sm:shadow-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress segments */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-3">
          {ordered.map((_, i) => (
            <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className={`block h-full bg-white/90 transition-all ${i <= index ? 'w-full' : 'w-0'}`} />
            </span>
          ))}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-6">
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

          {/* Tap zones (only over images / non-control areas) */}
          {story.mediaType === 'image' && (
            <>
              <button type="button" aria-label="Previous" onClick={prev} className="absolute inset-y-0 left-0 w-1/3" />
              <button type="button" aria-label="Next" onClick={next} className="absolute inset-y-0 right-0 w-2/3" />
            </>
          )}
        </div>

        {/* Caption */}
        {story.caption && (
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-5 pt-10">
            <p className="text-[14px] leading-relaxed text-white/90">{story.caption}</p>
          </div>
        )}
      </div>
    </div>
  );
}
