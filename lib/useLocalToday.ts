'use client';

import { useEffect, useState } from 'react';
import { getLocalDateString, getPstDateString } from './data';

/**
 * Today's date on the rower's own wall.
 *
 * The squad trains all over the world in the summer, so "today" has to be the
 * rower's day, not California's — otherwise someone finishing a session at
 * 21:00 in Germany is offered a date picker that stops at yesterday.
 *
 * The first render returns the shared PST day so the server and the client
 * agree, then it settles to the device's own date on mount. That one-tick
 * correction lands before anyone can touch the form.
 *
 * Only ever use this for what the logging rower sees. Anything another rower
 * reads — streaks, badges, the board — stays on the shared day, or the numbers
 * would change depending on who was looking.
 */
export function useLocalToday(): string {
  const [today, setToday] = useState<string>(() => getPstDateString());
  useEffect(() => {
    setToday(getLocalDateString());
  }, []);
  return today;
}
