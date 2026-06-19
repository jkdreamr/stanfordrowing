'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabaseClient';
import { getAllProfiles } from '@/lib/userProfile';
import { AppNotification, fetchNotifications, markAllRead } from '@/lib/notifications';
import { timeAgo } from '@/lib/stats';
import Avatar from './Avatar';
import Icon from './Icon';

function describe(n: AppNotification): string {
  switch (n.kind) {
    case 'respect':
      return 'respected your workout';
    case 'workout_comment':
      return 'commented on your workout';
    case 'workout_reply':
    case 'locker_reply':
      return 'replied to your comment';
    case 'locker_reaction':
      return `reacted ${n.emoji ?? ''} to your locker post`.trim();
    case 'locker_comment':
      return 'commented on your locker post';
    case 'mention':
      return n.targetType === 'locker_post' ? 'mentioned you in the locker room' : 'mentioned you in a workout';
    default:
      return 'interacted with your post';
  }
}

function targetHref(n: AppNotification): string {
  if (n.targetType === 'locker_post') return '/locker-room';
  return n.targetOwnerId ? `/rowers/${n.targetOwnerId}` : '/';
}

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [avatarById, setAvatarById] = useState<Record<string, string>>({});
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const refresh = useCallback(async (uid: string) => {
    const list = await fetchNotifications(uid);
    setItems(list);
    setLoading(false);
  }, []);

  // Resolve the signed-in user (recipient_id == auth uid).
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
      if (!session) {
        setItems([]);
        setOpen(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load notifications + actor avatars; refetch on focus and on an interval.
  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh(userId);
    getAllProfiles()
      .then((profiles) => {
        const map: Record<string, string> = {};
        for (const p of profiles) if (p.avatarUrl) map[p.id] = p.avatarUrl;
        setAvatarById(map);
      })
      .catch(() => {});
    const onFocus = () => refresh(userId);
    window.addEventListener('focus', onFocus);
    const interval = window.setInterval(() => refresh(userId), 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(interval);
    };
  }, [userId, refresh]);

  const unread = items.reduce((n, i) => n + (i.read ? 0 : 1), 0);

  const openPanel = () => {
    setOpen(true);
    if (userId && unread > 0) {
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      markAllRead(userId);
    }
  };

  // Lock body scroll + Escape close while the mobile sheet is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!userId) return null;

  const rows =
    loading ? (
      <div className="space-y-3 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="skeleton h-9 w-9 shrink-0 animate-shimmer rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="skeleton h-3 w-2/3 animate-shimmer rounded" />
              <div className="skeleton h-2.5 w-1/3 animate-shimmer rounded" />
            </div>
          </div>
        ))}
      </div>
    ) : items.length === 0 ? (
      <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
        <Icon name="notifications" size={26} className="text-charcoal-light" />
        <p className="text-[13px] font-medium text-charcoal-soft">No notifications yet</p>
        <p className="text-[11px] text-charcoal-muted">Respects, comments, and mentions show up here.</p>
      </div>
    ) : (
      <ul className="py-1">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={targetHref(n)}
              onClick={() => setOpen(false)}
              className={`flex items-start gap-3 px-3 py-2.5 transition-colors hover:bg-white/[0.05] ${
                n.read ? '' : 'bg-coral/[0.06]'
              }`}
            >
              <Avatar name={n.actorName} size={36} src={avatarById[n.actorId]} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] leading-snug text-charcoal">
                  <span className="font-semibold">{n.actorName}</span>{' '}
                  <span className="text-charcoal-soft">{describe(n)}</span>
                </p>
                {n.preview && (
                  <p className="mt-0.5 truncate text-[12px] text-charcoal-muted">&ldquo;{n.preview}&rdquo;</p>
                )}
                <p className="mt-0.5 text-[11px] text-charcoal-light">{timeAgo(n.createdAt)}</p>
              </div>
              {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" aria-hidden />}
            </Link>
          </li>
        ))}
      </ul>
    );

  const header = (
    <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
      <h2 className="font-display text-[15px] font-semibold tracking-editorial text-charcoal">Notifications</h2>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Close"
        className="focus-ring -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-muted hover:bg-white/[0.06] hover:text-charcoal"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="focus-ring relative flex h-10 w-10 items-center justify-center rounded-full text-charcoal-muted transition-colors hover:text-charcoal active:scale-95 touch-manipulation"
      >
        <Icon name="notifications" size={22} fill={open} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[#0d1110]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Desktop: dropdown anchored under the bell */}
          <div className="hidden sm:block">
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
            <div className="card-solid absolute right-0 z-50 mt-2 max-h-[70vh] w-80 overflow-hidden shadow-modal" style={{ borderRadius: '16px' }}>
              {header}
              <div className="max-h-[calc(70vh-49px)] overflow-y-auto">{rows}</div>
            </div>
          </div>

          {/* Mobile: bottom sheet portaled to body */}
          {mounted &&
            createPortal(
              <div className="fixed inset-0 z-[90] sm:hidden" role="dialog" aria-modal="true" aria-label="Notifications">
                <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={() => setOpen(false)} aria-hidden />
                <div className="absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col rounded-t-[28px] border border-white/10 bg-[#161c1a] shadow-[0_-24px_60px_rgba(0,0,0,0.55)] animate-sheet-up">
                  <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-white/15" aria-hidden />
                  {header}
                  <div className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">{rows}</div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}
