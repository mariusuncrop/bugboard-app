export type DueState = 'overdue' | 'today' | 'soon' | 'later' | 'none';

/** Today as YYYY-MM-DD in UTC, so the answer does not depend on the server's clock zone. */
export const todayIso = (now: Date = new Date()): string => now.toISOString().slice(0, 10);

export const daysUntil = (dueOn: string, now: Date = new Date()): number =>
  Math.round((Date.parse(`${dueOn}T00:00:00Z`) - Date.parse(`${todayIso(now)}T00:00:00Z`)) / 86_400_000);

/**
 * How urgent a deadline is. The server decides this rather than the browser so
 * that every client draws the same colour, and so it can be filtered on.
 */
export function dueState(dueOn: string | null, now: Date = new Date()): DueState {
  if (!dueOn) return 'none';
  const days = daysUntil(dueOn, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'today';
  if (days <= 3) return 'soon';
  return 'later';
}
