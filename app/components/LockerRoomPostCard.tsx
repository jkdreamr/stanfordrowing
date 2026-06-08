'use client';

import Link from 'next/link';
import { LockerPost, User } from '@/lib/types';
import { timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';
import EmojiReactionBar from './EmojiReactionBar';
import CommentSection from './CommentSection';

interface LockerRoomPostCardProps {
  post: LockerPost;
  currentUser: User | null;
  isAdmin?: boolean;
  onToggleReaction: (post: LockerPost, emoji: string) => void;
  onAddComment: (post: LockerPost, body: string, parentId?: string) => Promise<boolean>;
  onDeleteComment: (post: LockerPost, commentId: string) => void;
  onDelete?: (post: LockerPost) => void;
  onTogglePin?: (post: LockerPost) => void;
}

function getVideoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') && u.searchParams.get('v')) {
      return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
    }
    if (u.hostname === 'youtu.be') {
      return `https://www.youtube.com/embed${u.pathname}`;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
  return null;
}

export default function LockerRoomPostCard({
  post,
  currentUser,
  isAdmin = false,
  onToggleReaction,
  onAddComment,
  onDeleteComment,
  onDelete,
  onTogglePin,
}: LockerRoomPostCardProps) {
  const canDelete = !!onDelete && (isAdmin || post.authorId === currentUser?.id);
  const canPin = !!onTogglePin && isAdmin;
  const embed = post.linkUrl ? getVideoEmbed(post.linkUrl) : null;

  return (
    <article
      className={`card animate-fade-in overflow-hidden ${
        post.pinned ? 'ring-1 ring-coral/40' : ''
      }`}
    >
      {/* Media first — full bleed */}
      {post.mediaType === 'image' && post.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" loading="lazy" className="w-full bg-stone-light object-cover" />
      )}
      {post.linkUrl && embed && (
        <div className="aspect-video w-full bg-charcoal">
          <iframe
            src={embed}
            title="Video"
            className="h-full w-full"
            allow="accelerated-rotation; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      <div className="p-4">
        {/* Pinned chip */}
        {post.pinned && (
          <div className="mb-2 flex items-center gap-1 text-coral">
            <Icon name="push_pin" size={13} fill />
            <span className="label-caps">Pinned</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <Link href={`/rowers/${post.authorId}`} className="focus-ring flex min-w-0 items-center gap-2.5 rounded-lg">
            <Avatar name={post.authorName} size={32} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-charcoal">{post.authorName}</p>
              <p className="text-[10px] text-charcoal-muted">{timeAgo(post.createdAt)}</p>
            </div>
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            {canPin && (
              <button
                type="button"
                onClick={() => onTogglePin?.(post)}
                aria-label={post.pinned ? 'Unpin post' : 'Pin post'}
                aria-pressed={post.pinned}
                title={post.pinned ? 'Unpin' : 'Pin to top'}
                className={`focus-ring flex h-9 w-9 items-center justify-center rounded-lg transition-colors touch-manipulation ${
                  post.pinned ? 'text-coral' : 'text-charcoal-light hover:text-charcoal'
                }`}
              >
                <Icon name="push_pin" size={18} fill={post.pinned} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={() => onDelete?.(post)}
                aria-label="Delete post"
                className="focus-ring flex h-9 w-9 items-center justify-center rounded-lg text-charcoal-light transition-colors hover:text-coral touch-manipulation"
              >
                <Icon name="delete" size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        {post.body && (
          <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-charcoal">{post.body}</p>
        )}

        {/* Link (non-embed) */}
        {post.linkUrl && !embed && (
          <a
            href={post.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl border border-stone/50 bg-bone-dark/40 px-3 py-3 text-[13px] font-medium text-charcoal-soft transition-colors hover:border-coral hover:text-coral touch-manipulation"
          >
            <Icon name="link" size={16} />
            <span className="truncate">{post.linkUrl}</span>
            <Icon name="open_in_new" size={14} className="ml-auto shrink-0 text-charcoal-light" />
          </a>
        )}

        {/* Reactions */}
        <div className="mt-3.5">
          <EmojiReactionBar
            reactions={post.reactions ?? []}
            currentUserId={currentUser?.id}
            onToggle={(emoji) => onToggleReaction(post, emoji)}
          />
        </div>

        {/* Comments */}
        <div className="mt-3 border-t border-stone/30 pt-3">
          <CommentSection
            comments={post.comments ?? []}
            currentUser={currentUser}
            onAdd={(body, parentId) => onAddComment(post, body, parentId)}
            onDelete={(commentId) => onDeleteComment(post, commentId)}
            tone="card"
          />
        </div>
      </div>
    </article>
  );
}
