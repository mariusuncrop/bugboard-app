import type { ReactNode } from 'react';

export interface InlineOption {
  value: string;
  label: string;
}

interface Props {
  /** Accessible name. The control has no visible label of its own. */
  label: string;
  testId: string;
  value: string;
  options: InlineOption[];
  busy?: boolean;
  /** Rendered before the select — an avatar or a badge. */
  adornment?: ReactNode;
  onChange: (value: string) => void;
}

/**
 * A compact select for editing one field in place, on a board card or a table
 * row. A real <select> rather than a bespoke menu: it is keyboard and screen
 * reader accessible for free, and works the same on touch.
 */
export function InlineSelect({ label, testId, value, options, busy, adornment, onChange }: Props) {
  return (
    <span className="inline-select" data-testid={`${testId}-control`}>
      {adornment}
      <select
        className="inline-select__input"
        data-testid={testId}
        aria-label={label}
        aria-busy={busy || undefined}
        disabled={busy}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}
