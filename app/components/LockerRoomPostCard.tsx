'use client';

import Link from 'next/link';
import { LockerPost, User } from '@/lib/types';
import { getTeamById } from '@/lib/data';
import { timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';
import RespectButton from './RespectButton';

interface LockerRoomPostCardProps {
  post: LockerPost;
  currentUser: User | null;
  isAdmin?: boolean;
  onToggleRespect: (post: LockerPost) => void;
  onDelete?: (post: LockerPost) => void;
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
  onToggleRespect,
  onDelete,
}: LockerRoomPostCardProps) {
  const team = getTeamById(post.teamId);
  const color = team?.color ?? '#b51c00';
  const reactions = post.reactions ?? [];
  const hasReacted = reactions.some((r) => r.userId === currentUser?.id);
  const canDelete = !!onDelete && (isAdmin || post.authorId === currentUser?.id);

  const embed = post.linkUrl ? getVideoEmbed(post.linkUrl) : null;

  return (
    <article className="card animate-fade-in overflow-hidden rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4">
        <Link href={`/rowers/${post.authorId}`} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <Avatar name={post.authorName} color={color} size={40} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-ink">{post.authorName}</p>
            <p className="label-caps mt-0.5 text-ink-muted">{timeAgo(post.createdAt)}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete?.(post)}
              aria-label="Delete post"
              className="focus-ring rounded-full p-1.5 text-ink-muted transition-colors hover:bg-container-low hover:text-cardinal"
            >
              <Icon name="delete" size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {post.body && (
        <div className="px-4 pb-4">
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{post.body}</p>
        </div>
      )}

      {/* Media */}
      {post.mediaType === 'image' && post.mediaUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" loading="lazy" className="w-full bg-container-low object-cover" />
      )}
      {post.linkUrl && embed && (
        <div className="aspect-video w-full bg-black">
          <iframe
            src={embed}
            title="Video"
            className="h-full w-full"
            allow="accelerated-rotation; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
      {post.linkUrl && !embed && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noreferrer"
          className="mx-4 mb-4 flex items-center gap-2 rounded-xl border border-line bg-container-low/60 px-4 py-3 text-sm font-medium text-ink transition-colors hover:border-cardinal hover:text-cardinal"
        >
          <Icon name="link" size={18} />
          <span className="truncate">{post.linkUrl}</span>
          <Icon name="open_in_new" size={16} className="ml-auto shrink-0" />
        </a>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <RespectButton
          count={reactions.length}
          active={hasReacted}
          disabled={!currentUser}
          onToggle={() => onToggleRespect(post)}
        />
      </div>
    </article>
  );
}
