import { supabase } from '@/lib/supabaseClient';
import { LockerComment, LockerMediaType, LockerPost, LockerReaction, User } from '@/lib/types';

interface LockerPostRow {
  id: string;
  user_id: string;
  user_name: string;
  team_id: string;
  body: string;
  media_url: string | null;
  media_type: LockerMediaType;
  link_url: string | null;
  created_at: string;
  locker_room_reactions?: { user_id: string; emoji: string | null; created_at: string }[];
  locker_room_comments?: { id: string; user_id: string; user_name: string; body: string; created_at: string }[];
}

const SELECT =
  '*, locker_room_reactions(user_id, emoji, created_at), locker_room_comments(id, user_id, user_name, body, created_at)';

function mapRow(row: LockerPostRow): LockerPost {
  return {
    id: row.id,
    authorId: row.user_id,
    authorName: row.user_name,
    teamId: row.team_id,
    body: row.body ?? '',
    mediaUrl: row.media_url ?? undefined,
    mediaType: row.media_type ?? null,
    linkUrl: row.link_url ?? undefined,
    reactions: (row.locker_room_reactions ?? []).map((r) => ({
      userId: r.user_id,
      emoji: r.emoji ?? '🔥',
      createdAt: r.created_at,
    })) satisfies LockerReaction[],
    comments: (row.locker_room_comments ?? [])
      .map((c) => ({ id: c.id, userId: c.user_id, userName: c.user_name, body: c.body, createdAt: c.created_at }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)) satisfies LockerComment[],
    createdAt: row.created_at,
  };
}

export async function fetchLockerPosts(): Promise<LockerPost[]> {
  const { data, error } = await supabase
    .from('locker_room_posts')
    .select(SELECT)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as LockerPostRow[]).map(mapRow);
}

export async function createLockerPost(params: {
  user: User;
  body: string;
  mediaUrl?: string;
  mediaType?: LockerMediaType;
  linkUrl?: string;
}): Promise<LockerPost> {
  const payload = {
    user_id: params.user.id,
    user_name: params.user.name,
    team_id: params.user.teamId,
    body: params.body,
    media_url: params.mediaUrl ?? null,
    media_type: params.mediaType ?? null,
    link_url: params.linkUrl ?? null,
  };

  const { data, error } = await supabase.from('locker_room_posts').insert(payload).select(SELECT).single();
  if (error) throw error;
  return mapRow(data as LockerPostRow);
}

export async function deleteLockerPost(postId: string): Promise<void> {
  const { error } = await supabase.from('locker_room_posts').delete().eq('id', postId);
  if (error) throw error;
}

// ---- emoji reactions ----

export async function addLockerReaction(params: {
  postId: string;
  userId: string;
  emoji: string;
}): Promise<void> {
  const { error } = await supabase
    .from('locker_room_reactions')
    .insert({ post_id: params.postId, user_id: params.userId, emoji: params.emoji });
  if (error) throw error;
}

export async function removeLockerReaction(params: {
  postId: string;
  userId: string;
  emoji: string;
}): Promise<void> {
  const { error } = await supabase
    .from('locker_room_reactions')
    .delete()
    .eq('post_id', params.postId)
    .eq('user_id', params.userId)
    .eq('emoji', params.emoji);
  if (error) throw error;
}

// ---- comments ----

export async function addLockerComment(params: {
  postId: string;
  userId: string;
  userName: string;
  body: string;
}): Promise<LockerComment> {
  const { data, error } = await supabase
    .from('locker_room_comments')
    .insert({ post_id: params.postId, user_id: params.userId, user_name: params.userName, body: params.body })
    .select('id, user_id, user_name, body, created_at')
    .single();
  if (error) throw error;
  const row = data as { id: string; user_id: string; user_name: string; body: string; created_at: string };
  return { id: row.id, userId: row.user_id, userName: row.user_name, body: row.body, createdAt: row.created_at };
}

export async function removeLockerComment(params: { commentId: string }): Promise<void> {
  const { error } = await supabase.from('locker_room_comments').delete().eq('id', params.commentId);
  if (error) throw error;
}

const LOCKER_BUCKET = 'locker-media';

/** Upload an image to the locker-media bucket and return its public URL. */
export async function uploadLockerImage(file: File, ownerId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${ownerId}/${fileName}`;

  const { error } = await supabase.storage.from(LOCKER_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(LOCKER_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
