import { supabase } from '@/lib/supabaseClient';
import { Story, StoryMediaType, User } from '@/lib/types';

interface StoryRow {
  id: string;
  user_id: string;
  user_name: string;
  media_url: string;
  media_type: StoryMediaType;
  caption: string | null;
  created_at: string;
}

function mapRow(row: StoryRow): Story {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    mediaUrl: row.media_url,
    mediaType: row.media_type,
    caption: row.caption ?? undefined,
    createdAt: row.created_at,
  };
}

/** Stories from the last 48 hours, newest first (Instagram-style ephemerality). */
export async function fetchStories(): Promise<Story[]> {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as StoryRow[]).map(mapRow);
}

export async function createStory(params: {
  user: User;
  mediaUrl: string;
  mediaType: StoryMediaType;
  caption?: string;
}): Promise<Story> {
  const payload = {
    user_id: params.user.id,
    user_name: params.user.name,
    media_url: params.mediaUrl,
    media_type: params.mediaType,
    caption: params.caption?.trim() || null,
  };
  const { data, error } = await supabase.from('stories').insert(payload).select().single();
  if (error) throw error;
  return mapRow(data as StoryRow);
}

export async function deleteStory(storyId: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', storyId);
  if (error) throw error;
}

const STORY_BUCKET = 'story-media';
const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

/** Upload a photo or video to the story-media bucket; returns its public URL + type. */
export async function uploadStoryMedia(
  file: File,
  ownerId: string
): Promise<{ url: string; type: StoryMediaType }> {
  if (file.size > MAX_BYTES) {
    throw new Error('That file is too big — keep it under 50 MB.');
  }
  const isVideo = file.type.startsWith('video/');
  const type: StoryMediaType = isVideo ? 'video' : 'image';
  const ext = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const filePath = `${ownerId}/${fileName}`;

  const { error } = await supabase.storage.from(STORY_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    upsert: false,
  });
  if (error) throw error;

  const { data } = supabase.storage.from(STORY_BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, type };
}
