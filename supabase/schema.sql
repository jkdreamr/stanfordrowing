create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  user_name text not null,
  team_id text not null,
  date date not null,
  type text not null,
  minutes integer not null,
  distance numeric,
  notes text,
  proof_url text,
  activity_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.multipliers (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  key text not null,
  value numeric not null,
  updated_at timestamptz not null default now(),
  unique (scope, key)
);

create table if not exists public.workout_reactions (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  unique (workout_id, user_id)
);

alter table public.workouts enable row level security;
alter table public.multipliers enable row level security;
alter table public.workout_reactions enable row level security;

create policy "workouts read" on public.workouts
  for select
  using (auth.role() = 'authenticated');

create policy "workouts insert" on public.workouts
  for insert
  with check (auth.role() = 'authenticated');

create policy "workouts update" on public.workouts
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "workouts delete" on public.workouts
  for delete
  using (auth.role() = 'authenticated');

create policy "multipliers read" on public.multipliers
  for select
  using (auth.role() = 'authenticated');

create policy "multipliers write" on public.multipliers
  for insert
  with check (auth.role() = 'authenticated');

create policy "multipliers update" on public.multipliers
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "workout reactions read" on public.workout_reactions
  for select
  using (auth.role() = 'authenticated');

create policy "workout reactions insert" on public.workout_reactions
  for insert
  with check (auth.role() = 'authenticated');

create policy "workout reactions delete" on public.workout_reactions
  for delete
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
