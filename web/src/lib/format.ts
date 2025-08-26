/** Stable, locale-independent formatting — visual snapshots depend on it. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const month = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const time = `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
  return `${formatDate(iso)}, ${time}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}
