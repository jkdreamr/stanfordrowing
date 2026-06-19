-- In-app notifications (respect / reactions / comments / replies / @mentions)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).
--
-- Rows are created client-side, best-effort, after the action that triggers
-- them (a respect, comment, reaction, reply, or @mention). Recipient-scoped so
-- a rower only ever sees their own notifications.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null,         -- who is notified (= profiles.id = auth.uid())
  actor_id uuid not null,             -- who triggered it
  actor_name text not null,           -- denormalized for display
  kind text not null,                 -- respect | workout_comment | workout_reply | locker_reaction | locker_comment | locker_reply | mention
  target_type text not null,          -- workout | locker_post
  target_id uuid not null,
  target_owner_id uuid,               -- owner of the target, for navigation
  emoji text,                         -- for locker_reaction
  preview text,                       -- truncated comment/notes snippet
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, read);

alter table public.notifications enable row level security;

-- Policies: you read/update/delete only your own; you insert only as yourself
-- (so anyone may notify anyone, but never spoof the actor).

drop policy if exists "notifications: read own" on public.notifications;
create policy "notifications: read own" on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists "notifications: insert as actor" on public.notifications;
create policy "notifications: insert as actor" on public.notifications
  for insert with check (actor_id = auth.uid());

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications
  for delete using (recipient_id = auth.uid());
