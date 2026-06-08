import { supabase } from './supabaseClient';
import { User } from './types';
import { isAdminEmail } from './data';

export interface Profile {
  id: string;
  email: string;
  name: string;
  teamId: string;
  isAdmin: boolean;
  avatarUrl?: string;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  team_id: string;
  is_admin: boolean;
  avatar_url: string | null;
  created_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    teamId: row.team_id,
    isAdmin: row.is_admin,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

export function profileToUser(profile: Profile): User {
  return {
    id: profile.id,
    name: profile.name,
    teamId: profile.teamId,
    avatarUrl: profile.avatarUrl,
  };
}

/** Upload a new avatar image and save it on the profile. Returns the public URL. */
export async function uploadAvatar(file: File, authId: string): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${authId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { cacheControl: '3600', contentType: file.type || 'image/jpeg', upsert: true });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const url = data.publicUrl;

  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', authId);
  if (error) throw error;
  return url;
}

export async function getProfileByAuthId(authId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function createProfile({
  authId,
  email,
  name,
}: {
  authId: string;
  email: string;
  name: string;
}): Promise<Profile | null> {
  const isAdmin = isAdminEmail(email);
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: authId,
      email: email.toLowerCase(),
      name: name.trim(),
      team_id: 'unassigned',
      is_admin: isAdmin,
    })
    .select()
    .single();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error || !data) return [];
  return (data as ProfileRow[]).map(rowToProfile);
}

export function isStanfordEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@stanford.edu');
}
