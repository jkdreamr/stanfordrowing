import { supabase } from '@/lib/supabaseClient';

export type NotificationKind =
  | 'respect'
  | 'workout_comment'
  | 'workout_reply'
  | 'locker_reaction'
  | 'locker_comment'
  | 'locker_reply'
  | 'mention';

export type NotificationTargetType = 'workout' | 'locker_post';

export interface AppNotification {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: NotificationKind;
  targetType: NotificationTargetType;
  targetId: string;
  targetOwnerId?: string;
  emoji?: string;
  preview?: string;
  read: boolean;
  createdAt: string;
}

export interface NewNotification {
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: NotificationKind;
  targetType: NotificationTargetType;
  targetId: string;
  targetOwnerId?: string;
  emoji?: string;
  preview?: string;
}

interface NotificationRow {
  id: string;
  recipient_id: string;
  actor_id: string;
  actor_name: string;
  kind: NotificationKind;
  target_type: NotificationTargetType;
  target_id: string;
  target_owner_id: string | null;
  emoji: string | null;
  preview: string | null;
  read: boolean;
  created_at: string;
}

const PREVIEW_MAX = 120;

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    actorId: row.actor_id,
    actorName: row.actor_name,
    kind: row.kind,
    targetType: row.target_type,
    targetId: row.target_id,
    targetOwnerId: row.target_owner_id ?? undefined,
    emoji: row.emoji ?? undefined,
    preview: row.preview ?? undefined,
    read: row.read,
    createdAt: row.created_at,
  };
}

/**
 * Insert notifications, best-effort. Drops self-notifications and empty
 * recipients, and dedupes so one event sends a person at most one row (callers
 * pass rows in precedence order — reply before comment before mention). Any
 * failure is swallowed so it can never break the reaction/comment/log that
 * triggered it.
 */
export async function createNotifications(rows: NewNotification[]): Promise<void> {
  try {
    const seen = new Set<string>();
    const payload = [];
    for (const r of rows) {
      if (!r.recipientId || !r.actorId || r.recipientId === r.actorId) continue;
      if (seen.has(r.recipientId)) continue;
      seen.add(r.recipientId);
      payload.push({
        recipient_id: r.recipientId,
        actor_id: r.actorId,
        actor_name: r.actorName,
        kind: r.kind,
        target_type: r.targetType,
        target_id: r.targetId,
        target_owner_id: r.targetOwnerId ?? null,
        emoji: r.emoji ?? null,
        preview: r.preview ? r.preview.slice(0, PREVIEW_MAX) : null,
      });
    }
    if (payload.length === 0) return;
    await supabase.from('notifications').insert(payload);
  } catch {
    /* best-effort — notifications never block the action that created them */
  }
}

export async function fetchNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as NotificationRow[]).map(mapRow);
  } catch {
    return [];
  }
}

export async function markAllRead(userId: string): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('recipient_id', userId)
      .eq('read', false);
  } catch {
    /* best-effort */
  }
}
