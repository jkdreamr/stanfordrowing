-- Stories (Instagram-style photo/video posts)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  media_url text not null,
  media_type text not null,          -- 'image' | 'video'
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists stories_created_at_idx on public.stories (created_at desc);

alter table public.stories enable row level security;

drop policy if exists "stories read" on public.stories;
create policy "stories read" on public.stories
  for select using (auth.role() = 'authenticated');

drop policy if exists "stories insert" on public.stories;
create policy "stories insert" on public.stories
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "stories delete" on public.stories;
create policy "stories delete" on public.stories
  for delete using (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- STORAGE BUCKET for story photos/videos
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

drop policy if exists "story media read" on storage.objects;
create policy "story media read" on storage.objects
  for select using (bucket_id = 'story-media');

drop policy if exists "story media insert" on storage.objects;
create policy "story media insert" on storage.objects
  for insert with check (bucket_id = 'story-media' and auth.role() = 'authenticated');

drop policy if exists "story media delete" on storage.objects;
create policy "story media delete" on storage.objects
  for delete using (bucket_id = 'story-media' and auth.role() = 'authenticated');
