import { supabase } from './supabaseClient';
import { User } from './types';
import { ADMIN_EMAILS } from './data';

export interface Profile {
  id: string;
  email: string;
  name: string;
  teamId: string;
  isAdmin: boolean;
  createdAt: string;
}

interface ProfileRow {
  id: string;
  email: string;
  name: string;
  team_id: string;
  is_admin: boolean;
  created_at: string;
}

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    teamId: row.team_id,
    isAdmin: row.is_admin,
    createdAt: row.created_at,
  };
}

export function profileToUser(profile: Profile): User {
  return {
    id: profile.id,
    name: profile.name,
    teamId: profile.teamId,
  };
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
  const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());
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
