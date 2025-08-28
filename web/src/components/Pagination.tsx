interface Props {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, onChange }: Props) {
  return (
    <nav className="pagination" data-testid="pagination" aria-label="Pagination">
      <button
        type="button"
        className="button button--ghost"
        data-testid="pagination-prev"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span data-testid="pagination-info">
        Page {page} of {totalPages} · {total} issue{total === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        className="button button--ghost"
        data-testid="pagination-next"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
