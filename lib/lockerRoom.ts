import { supabase } from '@/lib/supabaseClient';
import { LockerMediaType, LockerPost, LockerReaction, LockerTag, User } from '@/lib/types';

interface LockerPostRow {
  id: string;
  user_id: string;
  user_name: string;
  team_id: string;
  body: string;
  tag: LockerTag;
  media_url: string | null;
  media_type: LockerMediaType;
  link_url: string | null;
  created_at: string;
  locker_room_reactions?: { user_id: string; created_at: string }[];
}

function mapRow(row: LockerPostRow): LockerPost {
  return {
    id: row.id,
    authorId: row.user_id,
    authorName: row.user_name,
    teamId: row.team_id,
    body: row.body ?? '',
    tag: row.tag,
    mediaUrl: row.media_url ?? undefined,
    mediaType: row.media_type ?? null,
    linkUrl: row.link_url ?? undefined,
    reactions: (row.locker_room_reactions ?? []).map((r) => ({
      userId: r.user_id,
      createdAt: r.created_at,
    })) satisfies LockerReaction[],
    createdAt: row.created_at,
  };
}

export async function fetchLockerPosts(): Promise<LockerPost[]> {
  const { data, error } = await supabase
    .from('locker_room_posts')
    .select('*, locker_room_reactions(user_id, created_at)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as LockerPostRow[]).map(mapRow);
}

export async function createLockerPost(params: {
  user: User;
  body: string;
  tag: LockerTag;
  mediaUrl?: string;
  mediaType?: LockerMediaType;
  linkUrl?: string;
}): Promise<LockerPost> {
  const payload = {
    user_id: params.user.id,
    user_name: params.user.name,
    team_id: params.user.teamId,
    body: params.body,
    tag: params.tag,
    media_url: params.mediaUrl ?? null,
    media_type: params.mediaType ?? null,
    link_url: params.linkUrl ?? null,
  };

  const { data, error } = await supabase
    .from('locker_room_posts')
    .insert(payload)
    .select('*, locker_room_reactions(user_id, created_at)')
    .single();

  if (error) throw error;
  return mapRow(data as LockerPostRow);
}

export async function deleteLockerPost(postId: string): Promise<void> {
  const { error } = await supabase.from('locker_room_posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function addLockerReaction(params: {
  postId: string;
  userId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('locker_room_reactions')
    .insert({ post_id: params.postId, user_id: params.userId });
  if (error) throw error;
}

export async function removeLockerReaction(params: {
  postId: string;
  userId: string;
}): Promise<void> {
  const { error } = await supabase
    .from('locker_room_reactions')
    .delete()
    .eq('post_id', params.postId)
    .eq('user_id', params.userId);
  if (error) throw error;
}

const LOCKER_BUCKET = 'locker-media';

/** Upload an image to the locker-media bucket and return its public URL. */
export async function uploadLockerImage(file: File, ownerId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${ownerId}/${fileName}`;

  const { error } = await supabase.storage
    .from(LOCKER_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType: file.type || 'image/jpeg',
      upsert: false,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(LOCKER_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
