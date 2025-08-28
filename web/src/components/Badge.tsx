import { PRIORITY_LABELS, STATUS_LABELS, type IssueType, type Priority, type Status } from '../lib/types';

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`badge badge--status badge--${status}`} data-testid="status-badge" data-status={status}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={`badge badge--priority badge--${priority}`} data-testid="priority-badge" data-priority={priority}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function TypeBadge({ type }: { type: IssueType }) {
  return (
    <span className={`badge badge--type badge--${type}`} data-testid="type-badge" data-type={type}>
      {type === 'bug' ? 'Bug' : 'Task'}
    </span>
  );
}

export function Label({ value }: { value: string }) {
  return (
    <span className="chip" data-testid="issue-label" data-label={value}>
      {value}
    </span>
  );
}
