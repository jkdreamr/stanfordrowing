'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { LockerComment, LockerPost, LockerReaction, User } from '@/lib/types';
import {
  addLockerComment,
  addLockerReaction,
  deleteLockerPost,
  fetchLockerPosts,
  removeLockerComment,
  removeLockerReaction,
} from '@/lib/lockerRoom';
import LockerRoomComposer from '../components/LockerRoomComposer';
import LockerRoomPostCard from '../components/LockerRoomPostCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function LockerRoomPage() {
  const [posts, setPosts] = useState<LockerPost[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsSchema, setNeedsSchema] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setPosts(await fetchLockerPosts());
      } catch (e) {
        const msg = (e as { message?: string })?.message ?? '';
        if (/relation|does not exist|schema/i.test(msg)) setNeedsSchema(true);
        else setError('Sign in to see the Locker Room.');
      } finally {
        setLoading(false);
      }
    };
    const loadSession = async (authId: string | undefined) => {
      if (!authId) { setCurrentUser(null); setIsAdmin(false); return; }
      const profile = await getProfileByAuthId(authId);
      setCurrentUser(profile ? profileToUser(profile) : null);
      setIsAdmin(profile?.isAdmin ?? false);
    };
    load();
    supabase.auth.getSession().then(({ data }) => loadSession(data.session?.user.id));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadSession(session?.user.id);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ---- reactions ----
  const updateReactions = (id: string, updater: (r: LockerReaction[]) => LockerReaction[]) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, reactions: updater(p.reactions) } : p)));
  };

  const toggleReaction = async (post: LockerPost, emoji: string) => {
    if (!currentUser) return;
    const uid = currentUser.id;
    const mine = post.reactions.some((r) => r.userId === uid && r.emoji === emoji);
    updateReactions(post.id, (r) =>
      mine
        ? r.filter((x) => !(x.userId === uid && x.emoji === emoji))
        : [...r, { userId: uid, emoji, createdAt: new Date().toISOString() }]
    );
    try {
      if (mine) await removeLockerReaction({ postId: post.id, userId: uid, emoji });
      else await addLockerReaction({ postId: post.id, userId: uid, emoji });
    } catch {
      updateReactions(post.id, (r) =>
        mine
          ? [...r, { userId: uid, emoji, createdAt: new Date().toISOString() }]
          : r.filter((x) => !(x.userId === uid && x.emoji === emoji))
      );
    }
  };

  // ---- comments ----
  const updateComments = (id: string, updater: (c: LockerComment[]) => LockerComment[]) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, comments: updater(p.comments) } : p)));
  };

  const addComment = async (post: LockerPost, body: string, parentId?: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const c = await addLockerComment({ postId: post.id, userId: currentUser.id, userName: currentUser.name, body, parentId });
      updateComments(post.id, (cs) => [...cs, c]);
      return true;
    } catch {
      return false;
    }
  };

  const deleteComment = async (post: LockerPost, commentId: string) => {
    const previous = post.comments;
    updateComments(post.id, (cs) => cs.filter((c) => c.id !== commentId));
    try {
      await removeLockerComment({ commentId });
    } catch {
      updateComments(post.id, () => previous);
    }
  };

  const handleDelete = async (post: LockerPost) => {
    if (!window.confirm('Delete this post?')) return;
    const prev = posts;
    setPosts((p) => p.filter((x) => x.id !== post.id));
    try {
      await deleteLockerPost(post.id);
    } catch {
      setPosts(prev);
    }
  };

  return (
    <div className="mx-auto max-w-feed px-4 sm:px-6">
      <div className="pb-2 pt-6 sm:pt-8">
        <h1 className="font-display text-xl font-semibold tracking-editorial text-charcoal sm:text-2xl">
          Locker Room
        </h1>
        <p className="mt-1 text-[13px] text-charcoal-muted">Get some motivation.</p>
      </div>

      {currentUser && !needsSchema && (
        <div className="mb-5 mt-3">
          <LockerRoomComposer user={currentUser} onCreated={(p) => setPosts((prev) => [p, ...prev])} />
        </div>
      )}

      {needsSchema ? (
        <EmptyState
          icon="database"
          title="Locker Room needs setup"
          message="Run the locker_room.sql migration in Supabase, then refresh."
        />
      ) : loading ? (
        <LoadingState count={3} />
      ) : error ? (
        <EmptyState icon="lock" title="Sign in to see the Locker Room" actionLabel="Log in" actionHref="/login" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="bolt"
          title="Nothing on the wall yet."
          message={currentUser ? 'Post something that fires up the squad.' : 'Sign in to start the wall.'}
        >
          {!currentUser && (
            <Link
              href="/login"
              className="focus-ring mt-5 rounded-full bg-coral px-4 py-2 text-[13px] font-semibold text-white hover:bg-coral-dark"
            >
              Log in
            </Link>
          )}
        </EmptyState>
      ) : (
        <div className="space-y-4 pb-6">
          {posts.map((post) => (
            <LockerRoomPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              isAdmin={isAdmin}
              onToggleReaction={toggleReaction}
              onAddComment={addComment}
              onDeleteComment={deleteComment}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
