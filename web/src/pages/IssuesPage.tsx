import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { request } from '../lib/api';
import { formatDate } from '../lib/format';
import { useToast } from '../lib/toast';
import {
  ISSUE_TYPES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Issue,
  type Page,
  type UserSummary,
} from '../lib/types';
import { Avatar } from '../components/Avatar';
import { PriorityBadge, StatusBadge, TypeBadge } from '../components/Badge';
import { Pagination } from '../components/Pagination';
import { Spinner } from '../components/Spinner';

const PAGE_SIZE = 10;

export function IssuesPage() {
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState<Page<Issue> | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [search, setSearch] = useState(params.get('q') ?? '');

  // Filters live in the query string so the back button and a shared link both
  // restore the same view.
  const query = useMemo(
    () => ({
      q: params.get('q') ?? '',
      status: params.get('status') ?? '',
      priority: params.get('priority') ?? '',
      type: params.get('type') ?? '',
      assigneeId: params.get('assigneeId') ?? '',
      sort: params.get('sort') ?? 'createdAt',
      order: params.get('order') ?? 'desc',
      page: Number(params.get('page') ?? '1'),
    }),
    [params],
  );

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== query.q) update({ q: search });
    }, 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPage(null);
    request<Page<Issue>>('/issues', { query: { ...query, pageSize: PAGE_SIZE } })
      .then((response) => {
        if (!cancelled) setPage(response);
      })
      .catch(() => notify('Could not load issues.', 'error'));
    return () => {
      cancelled = true;
    };
  }, [query, notify]);

  const toggleSort = (field: string) => {
    const order = query.sort === field && query.order === 'desc' ? 'asc' : 'desc';
    update({ sort: field, order });
  };

  return (
    <section className="page" data-testid="issues-page">
      <header className="page__header">
        <div>
          <h1>Issues</h1>
          <p className="muted">Search, filter and page through every bug and task.</p>
        </div>
        <Link to="/issues/new" className="button button--primary" data-testid="issues-new-button">
          New issue
        </Link>
      </header>

      <div className="filters filters--wrap" data-testid="issue-filters">
        <label className="field field--inline field--grow">
          <span className="sr-only">Search issues</span>
          <input
            type="search"
            placeholder="Search by key, title or description"
            data-testid="issues-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field field--inline">
          <span>Status</span>
          <select data-testid="filter-status" value={query.status} onChange={(e) => update({ status: e.target.value })}>
            <option value="">Any</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span>Priority</span>
          <select
            data-testid="filter-priority"
            value={query.priority}
            onChange={(e) => update({ priority: e.target.value })}
          >
            <option value="">Any</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span>Type</span>
          <select data-testid="filter-type" value={query.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">Any</option>
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type === 'bug' ? 'Bug' : 'Task'}
              </option>
            ))}
          </select>
        </label>

        <label className="field field--inline">
          <span>Assignee</span>
          <select
            data-testid="filter-assignee"
            value={query.assigneeId}
            onChange={(e) => update({ assigneeId: e.target.value })}
          >
            <option value="">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="button button--ghost" data-testid="filters-clear" onClick={() => setParams(new URLSearchParams())}>
          Clear
        </button>
      </div>

      {!page ? (
        <Spinner label="Loading issues" testId="issues-loading" />
      ) : page.items.length === 0 ? (
        <p className="empty" data-testid="issues-empty">
          No issues match these filters.
        </p>
      ) : (
        <>
          <table className="table" data-testid="issues-table">
            <thead>
              <tr>
                <th scope="col">
                  <button type="button" className="link" data-testid="sort-key" onClick={() => toggleSort('key')}>
                    Key
                  </button>
                </th>
                <th scope="col">
                  <button type="button" className="link" data-testid="sort-title" onClick={() => toggleSort('title')}>
                    Title
                  </button>
                </th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">
                  <button
                    type="button"
                    className="link"
                    data-testid="sort-priority"
                    onClick={() => toggleSort('priority')}
                  >
                    Priority
                  </button>
                </th>
                <th scope="col">Assignee</th>
                <th scope="col">
                  <button
                    type="button"
                    className="link"
                    data-testid="sort-createdAt"
                    onClick={() => toggleSort('createdAt')}
                  >
                    Created
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {page.items.map((issue) => (
                <tr key={issue.id} data-testid={`issue-row-${issue.key}`} data-issue-key={issue.key}>
                  <td>
                    <Link to={`/issues/${issue.key}`} data-testid="row-key">
                      {issue.key}
                    </Link>
                  </td>
                  <td data-testid="row-title">
                    <Link to={`/issues/${issue.key}`}>{issue.title}</Link>
                  </td>
                  <td>
                    <TypeBadge type={issue.type} />
                  </td>
                  <td>
                    <StatusBadge status={issue.status} />
                  </td>
                  <td>
                    <PriorityBadge priority={issue.priority} />
                  </td>
                  <td>
                    <span className="assignee" data-testid="row-assignee">
                      <Avatar user={issue.assignee} />
                      <span>{issue.assignee?.name ?? 'Unassigned'}</span>
                    </span>
                  </td>
                  <td data-testid="row-created">{formatDate(issue.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            page={page.page}
            totalPages={page.totalPages}
            total={page.total}
            onChange={(next) => update({ page: String(next) })}
          />
        </>
      )}
    </section>
  );
}
