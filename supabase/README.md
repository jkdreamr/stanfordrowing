Run this SQL in Supabase (SQL Editor) to create tables and policies:

1. `supabase/schema.sql` — workouts, multipliers, workout_reactions (existing).
2. `supabase/locker_room.sql` — Locker Room posts + reactions + the `locker-media` storage bucket (new).
3. `supabase/workout_comments.sql` — comments on workout posts. Until this runs, the app
   simply shows zero comments (it never breaks the feed), and the composer surfaces an error.

Storage buckets used by the app:

- `workout-proofs` — proof photos attached to workouts (create as a public bucket if it doesn't exist).
- `locker-media` — images attached to Locker Room posts (created by `locker_room.sql`).

Notes:
- Policies allow any authenticated user to read/write workouts, multipliers, and Locker Room posts.
- Admin controls are gated in the app by admin emails + password.
- Locker Room supports image upload + external image/video links out of the box. Direct video
  *uploads* can be added later by extending `uploadLockerImage` in `lib/lockerRoom.ts` and the
  composer's accepted file types — the schema's `media_type` already allows `'video'`.
