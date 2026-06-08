-- Workout comments (replies under a workout post)
-- Run this in the Supabase SQL Editor. Safe to re-run (idempotent).

create table if not exists public.workout_comments (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id text not null,
  user_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists workout_comments_workout_id_idx
  on public.workout_comments (workout_id, created_at);

alter table public.workout_comments enable row level security;

-- Policies: any authenticated user may read and comment; authenticated users
-- may delete. (Mirrors the existing workouts/workout_reactions policies.)

drop policy if exists "workout comments read" on public.workout_comments;
create policy "workout comments read" on public.workout_comments
  for select using (auth.role() = 'authenticated');

drop policy if exists "workout comments insert" on public.workout_comments;
create policy "workout comments insert" on public.workout_comments
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "workout comments delete" on public.workout_comments;
create policy "workout comments delete" on public.workout_comments
  for delete using (auth.role() = 'authenticated');
