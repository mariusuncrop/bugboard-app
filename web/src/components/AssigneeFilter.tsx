import { initials } from '../lib/format';
import type { UserSummary } from '../lib/types';

interface Props {
  members: UserSummary[];
  /** Selected user ids, plus the literal "unassigned". */
  selected: string[];
  onToggle: (value: string) => void;
}

/**
 * Avatars you press rather than a dropdown. Several people can be selected at
 * once, which a single select could not express, and each avatar carries a
 * visible name so identity is never colour alone.
 */
export function AssigneeFilter({ members, selected, onToggle }: Props) {
  const entries = [
    { id: 'unassigned', name: 'Unassigned', avatarColor: null as string | null },
    ...members.map((member) => ({ id: member.id, name: member.name, avatarColor: member.avatarColor })),
  ];

  return (
    <div className="assignee-filter" data-testid="assignee-filter" role="group" aria-label="Filter by assignee">
      {entries.map((entry) => {
        const active = selected.includes(entry.id);
        return (
          <button
            key={entry.id}
            type="button"
            className={`assignee-chip${active ? ' assignee-chip--on' : ''}`}
            data-testid={`assignee-chip-${entry.id}`}
            data-active={active}
            aria-pressed={active}
            title={entry.name}
            onClick={() => onToggle(entry.id)}
          >
            <span
              className={`avatar avatar--sm${entry.avatarColor ? '' : ' avatar--empty'}`}
              style={entry.avatarColor ? { backgroundColor: entry.avatarColor } : undefined}
              aria-hidden="true"
            >
              {entry.avatarColor ? initials(entry.name) : '?'}
            </span>
            <span className="assignee-chip__name">{entry.name}</span>
          </button>
        );
      })}
    </div>
  );
}
