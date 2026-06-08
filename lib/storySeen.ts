// Tracks which authors' stories the current user has already viewed, so rings
// go gray (and sort to the back) until that author posts a newer story.
// Persisted in localStorage, namespaced per signed-in user.

const KEY = (uid: string) => `cardinalrow:storySeen:${uid}`;

export function getSeenMap(uid: string | undefined): Record<string, string> {
  if (!uid || typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY(uid)) || '{}') as Record<string, string>;
  } catch {
    return {};
  }
}

/** Record that `uid` has viewed `authorId`'s stories up to `latestCreatedAt`. */
export function markSeen(
  uid: string | undefined,
  authorId: string,
  latestCreatedAt: string
): Record<string, string> {
  const map = getSeenMap(uid);
  // Only advance the marker forward.
  if (!map[authorId] || map[authorId] < latestCreatedAt) {
    map[authorId] = latestCreatedAt;
    if (uid && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(KEY(uid), JSON.stringify(map));
      } catch {
        /* storage full / unavailable — non-fatal */
      }
    }
  }
  return { ...map };
}

/** An author is "seen" when the user has viewed at or past their latest story. */
export function isAuthorSeen(
  seenMap: Record<string, string>,
  authorId: string,
  latestCreatedAt: string
): boolean {
  const seenAt = seenMap[authorId];
  return !!seenAt && seenAt >= latestCreatedAt;
}
