import { initials } from '../lib/format';
import type { UserSummary } from '../lib/types';

interface Props {
  user: UserSummary | null;
  size?: 'sm' | 'md';
}

export function Avatar({ user, size = 'sm' }: Props) {
  if (!user) {
    return (
      <span className={`avatar avatar--${size} avatar--empty`} data-testid="avatar-unassigned" title="Unassigned">
        ?
      </span>
    );
  }

  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: user.avatarColor }}
      data-testid="avatar"
      data-user-id={user.id}
      title={user.name}
      aria-label={user.name}
    >
      {initials(user.name)}
    </span>
  );
}
