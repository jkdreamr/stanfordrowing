-- Performance indexes for scale (the workouts table only had its PK).
-- Already applied to the live project (lmvdgfzsplvoebcvsekq); kept here so the
-- repo schema stays in sync. Run in the Supabase SQL Editor. Safe to re-run.

-- Feed / profile / leaderboard all order by created_at desc.
create index if not exists workouts_created_at_idx on public.workouts (created_at desc);

-- Per-rower lookups (profiles, aggregation).
create index if not exists workouts_user_id_idx on public.workouts (user_id);

-- Admin's retroactive plan-mileage rewrite filters by (type, date).
create index if not exists workouts_type_date_idx on public.workouts (type, date);
