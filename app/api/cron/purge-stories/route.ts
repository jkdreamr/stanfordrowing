import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const BUCKET = 'story-media';
const MAX_AGE_HOURS = 24;
const CHUNK = 100;

/** Storage path within the bucket, derived from a public media URL. */
function pathFromUrl(url: string): string | null {
  const marker = `/${BUCKET}/`;
  const i = url.indexOf(marker);
  if (i < 0) return null;
  const path = url.slice(i + marker.length);
  return path.length > 0 ? path : null;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Deletes stories older than 24h — both the DB rows (their comments cascade)
 * and the media files in the story-media bucket. Triggered daily by Vercel Cron.
 *
 * Safety:
 *  - Requires the CRON_SECRET bearer token (Vercel adds it automatically); fails
 *    closed if the secret or service role isn't configured.
 *  - `?dryRun=1` reports what would be removed without deleting anything.
 *  - Idempotent and chunked, so a partial run is simply finished by the next one.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 503 });
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 60 * 60 * 1000).toISOString();

  let admin;
  try {
    admin = getAdminClient();
  } catch {
    return NextResponse.json({ error: 'Service role is not configured.' }, { status: 503 });
  }

  const { data: expired, error: selErr } = await admin
    .from('stories')
    .select('id, media_url')
    .lt('created_at', cutoff);
  if (selErr) return NextResponse.json({ error: selErr.message }, { status: 500 });

  const rows = (expired ?? []) as { id: string; media_url: string }[];
  if (rows.length === 0) {
    return NextResponse.json({ purged: 0, filesRemoved: 0, dryRun });
  }

  const ids = rows.map((r) => r.id);
  const paths = rows.map((r) => pathFromUrl(r.media_url)).filter((p): p is string => !!p);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      wouldPurgeRows: ids.length,
      wouldRemoveFiles: paths.length,
      samplePaths: paths.slice(0, 3),
    });
  }

  // 1) Remove media files first (so we never orphan files we can't find later).
  let filesRemoved = 0;
  for (const batch of chunk(paths, CHUNK)) {
    const { data: removed, error: rmErr } = await admin.storage.from(BUCKET).remove(batch);
    if (rmErr) return NextResponse.json({ error: `storage: ${rmErr.message}`, filesRemoved }, { status: 500 });
    filesRemoved += removed?.length ?? 0;
  }

  // 2) Delete the rows (story_comments cascade via FK).
  let purged = 0;
  for (const batch of chunk(ids, CHUNK)) {
    const { error: delErr } = await admin.from('stories').delete().in('id', batch);
    if (delErr) return NextResponse.json({ error: delErr.message, purged, filesRemoved }, { status: 500 });
    purged += batch.length;
  }

  return NextResponse.json({ purged, filesRemoved, dryRun: false });
}
