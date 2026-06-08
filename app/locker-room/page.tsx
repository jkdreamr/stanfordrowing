'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { getProfileByAuthId, profileToUser } from '@/lib/userProfile';
import { LockerPost, LockerReaction, User } from '@/lib/types';
import {
  addLockerReaction,
  deleteLockerPost,
  fetchLockerPosts,
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
        // table missing or not signed in
        const msg = (e as { message?: string })?.message ?? '';
        if (/relation|does not exist|schema/i.test(msg)) setNeedsSchema(true);
        else setError('Sign in to see the Locker Room.');
      } finally {
        setLoading(false);
      }
    };
    const loadSession = async (authId: string | undefined, isAdm: boolean) => {
      if (!authId) { setCurrentUser(null); setIsAdmin(false); return; }
      const profile = await getProfileByAuthId(authId);
      setCurrentUser(profile ? profileToUser(profile) : null);
      setIsAdmin(isAdm || (profile?.isAdmin ?? false));
    };
    load();
    supabase.auth.getSession().then(({ data }) =>
      loadSession(data.session?.user.id, false)
    );
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      loadSession(session?.user.id, false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const updateReactions = (id: string, updater: (r: LockerReaction[]) => LockerReaction[]) => {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, reactions: updater(p.reactions) } : p)));
  };

  const toggleRespect = async (post: LockerPost) => {
    if (!currentUser) return;
    const hasReacted = post.reactions.some((r) => r.userId === currentUser.id);
    try {
      if (hasReacted) {
        updateReactions(post.id, (r) => r.filter((x) => x.userId !== currentUser.id));
        await removeLockerReaction({ postId: post.id, userId: currentUser.id });
      } else {
        updateReactions(post.id, (r) => [...r, { userId: currentUser.id, createdAt: new Date().toISOString() }]);
        await addLockerReaction({ postId: post.id, userId: currentUser.id });
      }
    } catch {
      updateReactions(post.id, (r) =>
        hasReacted
          ? [...r, { userId: currentUser.id, createdAt: new Date().toISOString() }]
          : r.filter((x) => x.userId !== currentUser.id)
      );
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
      <div className="pb-4 pt-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">Locker Room</h1>
        <p className="mt-1 text-sm text-ink-soft">Race clips, race goals, whatever fires you up.</p>
      </div>

      {currentUser && !needsSchema && (
        <div className="mb-5 mt-1">
          <LockerRoomComposer user={currentUser} onCreated={(p) => setPosts((prev) => [p, ...prev])} />
        </div>
      )}

      {needsSchema ? (
        <EmptyState
          icon="database"
          title="Locker Room needs a quick setup"
          message="Run supabase/locker_room.sql in your Supabase SQL editor (creates the tables + media bucket), then refresh."
        />
      ) : loading ? (
        <LoadingState count={3} />
      ) : error ? (
        <EmptyState icon="lock" title="Sign in to see the Locker Room" actionLabel="Log in" actionHref="/login" />
      ) : posts.length === 0 ? (
        <EmptyState
          icon="bolt"
          title="Nothing on the wall yet."
          message={
            posts.length === 0
              ? currentUser
                ? 'Post the first thing that fires up the squad.'
                : 'Sign in to start the wall.'
              : ''
          }
        >
          {!currentUser && (
            <Link
              href="/login"
              className="focus-ring mt-5 inline-flex items-center justify-center rounded-full bg-cardinal px-5 py-2.5 text-sm font-semibold text-white hover:bg-cardinal-dark"
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
              onToggleRespect={toggleRespect}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
