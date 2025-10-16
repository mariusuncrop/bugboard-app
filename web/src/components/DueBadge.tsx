import { formatDate } from '../lib/format';
import type { DueState } from '../lib/types';

interface Props {
  dueOn: string | null;
  state: DueState;
  daysUntil: number | null;
}

const wording = (state: DueState, days: number | null): string => {
  if (days === null) return '';
  if (state === 'overdue') return `${Math.abs(days)}d late`;
  if (state === 'today') return 'Due today';
  return `${days}d left`;
};

/**
 * The urgency is decided by the server, not recomputed here, so every client
 * colours a deadline the same way and the same states can be filtered on.
 */
export function DueBadge({ dueOn, state, daysUntil }: Props) {
  if (!dueOn || state === 'none') return null;

  return (
    <span
      className={`badge badge--due badge--due-${state}`}
      data-testid="due-badge"
      data-due-state={state}
      data-due-on={dueOn}
      title={`Due ${formatDate(dueOn)}`}
    >
      {wording(state, daysUntil)}
    </span>
  );
}
