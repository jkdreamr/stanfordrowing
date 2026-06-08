-- Profile avatars: a profile photo per rower + the public bucket it lives in.
-- Run once in the Supabase SQL editor. Idempotent.

alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars read" on storage.objects;
create policy "avatars read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars insert" on storage.objects;
create policy "avatars insert" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "avatars update" on storage.objects;
create policy "avatars update" on storage.objects
  for update using (bucket_id = 'avatars' and auth.role() = 'authenticated');
