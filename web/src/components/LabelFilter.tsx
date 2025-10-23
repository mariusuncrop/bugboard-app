export interface LabelCount {
  label: string;
  count: number;
}

interface Props {
  labels: LabelCount[];
  selected: string[];
  onToggle: (label: string) => void;
  onClear: () => void;
}

/**
 * Toggle chips rather than a multi-select: the API combines labels with OR, and
 * chips make that obvious — each one you press widens the result.
 */
export function LabelFilter({ labels, selected, onToggle, onClear }: Props) {
  if (labels.length === 0) return null;

  return (
    <div className="label-filter" data-testid="label-filter">
      <span className="label-filter__caption">Labels</span>
      {labels.map(({ label, count }) => {
        const active = selected.includes(label);
        return (
          <button
            key={label}
            type="button"
            className={`chip chip--toggle${active ? ' chip--on' : ''}`}
            data-testid={`label-filter-${label}`}
            data-active={active}
            aria-pressed={active}
            onClick={() => onToggle(label)}
          >
            {label}
            <span className="chip__count">{count}</span>
          </button>
        );
      })}
      {selected.length > 0 ? (
        <button type="button" className="link" data-testid="label-filter-clear" onClick={onClear}>
          Clear labels
        </button>
      ) : null}
    </div>
  );
}
