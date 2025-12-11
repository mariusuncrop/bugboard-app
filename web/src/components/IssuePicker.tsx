import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { request } from '../lib/api';
import type { Issue, Page } from '../lib/types';

interface Found {
  key: string;
  title: string;
  status: string;
  type: string;
}

interface Props {
  projectKey: string;
  /** Keys never to offer — the issue itself, and anything already chosen. */
  exclude: string[];
  testId: string;
  placeholder?: string;
  onPick: (issue: Found) => void;
}

const MAX_RESULTS = 8;

/**
 * Type a key or part of a title, pick from what comes back. A combobox rather
 * than a bare text field: it means never having to know an issue's key, and it
 * cannot offer something that does not exist.
 */
export function IssuePicker({ projectKey, exclude, testId, placeholder, onPick }: Props) {
  const listId = useId();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Found[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term === '') {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      const ticket = ++latest.current;
      setSearching(true);
      try {
        const response = await request<Page<Issue>>(`/projects/${projectKey}/issues`, {
          query: { q: term, pageSize: MAX_RESULTS + exclude.length },
        });
        // A slower earlier request must not overwrite a newer one's results.
        if (ticket !== latest.current) return;
        setResults(
          response.items.map((issue) => ({
            key: issue.key,
            title: issue.title,
            status: issue.status,
            type: issue.type,
          })),
        );
        setActive(0);
        setOpen(true);
      } catch {
        if (ticket === latest.current) setResults([]);
      } finally {
        if (ticket === latest.current) setSearching(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query, projectKey]);

  // Filtered at render rather than at fetch, so the list stays correct as links
  // are added without re-running the search.
  const visible = results.filter((issue) => !exclude.includes(issue.key)).slice(0, MAX_RESULTS);

  const choose = (issue: Found) => {
    onPick(issue);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!open || visible.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % visible.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current - 1 + visible.length) % visible.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      choose(visible[active]!);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="issue-picker" data-testid={`${testId}-picker`}>
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && visible[active] ? `${testId}-option-${visible[active]!.key}` : undefined}
        placeholder={placeholder ?? 'Search by key or title'}
        data-testid={testId}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(visible.length > 0)}
      />

      {open ? (
        <ul className="issue-picker__results" id={listId} role="listbox" data-testid={`${testId}-results`}>
          {visible.map((issue, index) => (
            <li key={issue.key} role="option" aria-selected={index === active} id={`${testId}-option-${issue.key}`}>
              <button
                type="button"
                className={`issue-picker__option${index === active ? ' issue-picker__option--active' : ''}`}
                data-testid={`${testId}-option-${issue.key}`}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(issue)}
              >
                <span className="issue-picker__key">{issue.key}</span>
                <span className="issue-picker__title">{issue.title}</span>
              </button>
            </li>
          ))}
          {visible.length === 0 && !searching ? (
            <li className="issue-picker__empty" data-testid={`${testId}-empty`}>
              Nothing matches “{query.trim()}”.
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
