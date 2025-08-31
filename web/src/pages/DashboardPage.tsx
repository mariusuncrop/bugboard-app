import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../lib/api';
import { useToast } from '../lib/toast';
import { PRIORITIES, PRIORITY_LABELS, STATUSES, STATUS_LABELS, type Stats } from '../lib/types';
import { Spinner } from '../components/Spinner';

export function DashboardPage() {
  const { notify } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    request<Stats>('/stats')
      .then(setStats)
      .catch(() => notify('Could not load the dashboard.', 'error'));
  }, [notify]);

  return (
    <section className="page" data-testid="dashboard-page">
      <header className="page__header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">This endpoint is deliberately slow, so the loading state is real.</p>
        </div>
      </header>

      {!stats ? (
        <Spinner label="Crunching numbers" testId="stats-loading" />
      ) : (
        <div className="dashboard" data-testid="dashboard">
          <div className="stat-grid">
            <article className="card stat" data-testid="stat-total">
              <p className="stat__label">Total issues</p>
              <p className="stat__value">{stats.total}</p>
            </article>
            <article className="card stat" data-testid="stat-open">
              <p className="stat__label">Open</p>
              <p className="stat__value">{stats.open}</p>
            </article>
            <article className="card stat" data-testid="stat-done">
              <p className="stat__label">Done</p>
              <p className="stat__value">{stats.done}</p>
            </article>
            <article className="card stat" data-testid="stat-unassigned">
              <p className="stat__label">Unassigned</p>
              <p className="stat__value">{stats.unassigned}</p>
            </article>
          </div>

          <div className="grid grid--2">
            <article className="card" data-testid="chart-by-status">
              <h2>By status</h2>
              <ul className="bars">
                {STATUSES.map((status) => (
                  <li key={status} data-testid={`bar-status-${status}`}>
                    <span className="bars__label">{STATUS_LABELS[status]}</span>
                    <span className="bars__track">
                      <span
                        className={`bars__fill bars__fill--${status}`}
                        style={{ width: `${Math.round((stats.byStatus[status] / Math.max(stats.total, 1)) * 100)}%` }}
                      />
                    </span>
                    <span className="bars__value" data-testid={`count-status-${status}`}>
                      {stats.byStatus[status]}
                    </span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="card" data-testid="chart-by-priority">
              <h2>By priority</h2>
              <ul className="bars">
                {PRIORITIES.map((priority) => (
                  <li key={priority} data-testid={`bar-priority-${priority}`}>
                    <span className="bars__label">{PRIORITY_LABELS[priority]}</span>
                    <span className="bars__track">
                      <span
                        className={`bars__fill bars__fill--${priority}`}
                        style={{
                          width: `${Math.round((stats.byPriority[priority] / Math.max(stats.total, 1)) * 100)}%`,
                        }}
                      />
                    </span>
                    <span className="bars__value" data-testid={`count-priority-${priority}`}>
                      {stats.byPriority[priority]}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          </div>

          <article className="card" data-testid="workload">
            <h2>Open issues per person</h2>
            <ul className="list">
              {stats.byAssignee.map((person) => (
                <li key={person.id} data-testid={`workload-${person.id}`}>
                  <span className="dot" style={{ backgroundColor: person.avatarColor }} aria-hidden="true" />
                  {person.name}
                  <span className="muted"> · {person.open} open</span>
                </li>
              ))}
            </ul>
            <p>
              <Link to="/issues?status=backlog" data-testid="dashboard-backlog-link">
                Review the backlog →
              </Link>
            </p>
          </article>
        </div>
      )}
    </section>
  );
}
