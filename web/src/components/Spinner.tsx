export function Spinner({ label = 'Loading', testId = 'loading' }: { label?: string; testId?: string }) {
  return (
    <div className="spinner" data-testid={testId} role="status" aria-live="polite">
      <span className="spinner__dot" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
