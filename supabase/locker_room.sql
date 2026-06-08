-- Locker Room (team motivation wall)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists public.locker_room_posts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  team_id text not null,
  body text not null default '',
  tag text,
  media_url text,
  media_type text,          -- 'image' | 'video' | 'link' | null
  link_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.locker_room_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.locker_room_posts (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create index if not exists locker_room_posts_created_at_idx
  on public.locker_room_posts (created_at desc);

alter table public.locker_room_posts enable row level security;
alter table public.locker_room_reactions enable row level security;

-- Policies: any authenticated user may read; authenticated users may write.
-- (Mirrors the existing workouts/workout_reactions policies.)

drop policy if exists "locker posts read" on public.locker_room_posts;
create policy "locker posts read" on public.locker_room_posts
  for select using (auth.role() = 'authenticated');

drop policy if exists "locker posts insert" on public.locker_room_posts;
create policy "locker posts insert" on public.locker_room_posts
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "locker posts delete" on public.locker_room_posts;
create policy "locker posts delete" on public.locker_room_posts
  for delete using (auth.role() = 'authenticated');

drop policy if exists "locker reactions read" on public.locker_room_reactions;
create policy "locker reactions read" on public.locker_room_reactions
  for select using (auth.role() = 'authenticated');

drop policy if exists "locker reactions insert" on public.locker_room_reactions;
create policy "locker reactions insert" on public.locker_room_reactions
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "locker reactions delete" on public.locker_room_reactions;
create policy "locker reactions delete" on public.locker_room_reactions
  for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- STORAGE BUCKET (for Locker Room image uploads)
-- ---------------------------------------------------------------------------
-- The app uploads images to a public bucket named "locker-media".
-- Create it once (Dashboard → Storage → New bucket → name: locker-media, Public: on)
-- OR run the statement below:

insert into storage.buckets (id, name, public)
values ('locker-media', 'locker-media', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload, and anyone to read (public bucket).
drop policy if exists "locker media read" on storage.objects;
create policy "locker media read" on storage.objects
  for select using (bucket_id = 'locker-media');

drop policy if exists "locker media insert" on storage.objects;
create policy "locker media insert" on storage.objects
  for insert with check (bucket_id = 'locker-media' and auth.role() = 'authenticated');
