import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { useToast } from '../lib/toast';
import {
  ISSUE_TYPES,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Issue,
  type UserSummary,
} from '../lib/types';

export function NewIssuePage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'bug',
    priority: 'medium',
    status: 'backlog',
    assigneeId: '',
    labels: '',
  });

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (form.title.trim().length < 5) next.title = 'Title must be at least 5 characters.';
    if (form.title.trim().length > 120) next.title = 'Title must be 120 characters or fewer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await request<{ issue: Issue }>('/issues', {
        method: 'POST',
        body: {
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          priority: form.priority,
          status: form.status,
          assigneeId: form.assigneeId || null,
          labels: form.labels
            .split(',')
            .map((label) => label.trim())
            .filter(Boolean),
        },
      });
      notify(`${response.issue.key} created.`);
      navigate(`/issues/${response.issue.key}`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Could not reach the server.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page page--narrow" data-testid="new-issue-page">
      <header className="page__header">
        <div>
          <h1>New issue</h1>
          <p className="muted">
            <Link to="/issues" data-testid="back-to-issues">
              ← Back to issues
            </Link>
          </p>
        </div>
      </header>

      <form className="form card" data-testid="issue-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="alert alert--error" role="alert" data-testid="form-error">
            {formError}
          </p>
        ) : null}

        <div className="field">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            data-testid="issue-title"
            value={form.title}
            aria-invalid={Boolean(errors.title)}
            onChange={(event) => set('title', event.target.value)}
          />
          {errors.title ? (
            <p className="field__error" data-testid="error-title">
              {errors.title}
            </p>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            rows={6}
            data-testid="issue-description"
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
          {errors.description ? (
            <p className="field__error" data-testid="error-description">
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="grid grid--3">
          <div className="field">
            <label htmlFor="type">Type</label>
            <select id="type" data-testid="issue-type" value={form.type} onChange={(e) => set('type', e.target.value)}>
              {ISSUE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type === 'bug' ? 'Bug' : 'Task'}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              data-testid="issue-priority"
              value={form.priority}
              onChange={(e) => set('priority', e.target.value)}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>
                  {PRIORITY_LABELS[priority]}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              data-testid="issue-status"
              value={form.status}
              onChange={(e) => set('status', e.target.value)}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid--2">
          <div className="field">
            <label htmlFor="assignee">Assignee</label>
            <select
              id="assignee"
              data-testid="issue-assignee"
              value={form.assigneeId}
              onChange={(e) => set('assigneeId', e.target.value)}
            >
              <option value="">Unassigned</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="labels">Labels</label>
            <input
              id="labels"
              placeholder="api, regression"
              data-testid="issue-labels"
              value={form.labels}
              onChange={(event) => set('labels', event.target.value)}
            />
            <p className="field__hint">Comma separated, up to 5.</p>
            {errors.labels ? (
              <p className="field__error" data-testid="error-labels">
                {errors.labels}
              </p>
            ) : null}
          </div>
        </div>

        <div className="form__actions">
          <Link to="/issues" className="button button--ghost" data-testid="issue-cancel">
            Cancel
          </Link>
          <button type="submit" className="button button--primary" data-testid="issue-submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create issue'}
          </button>
        </div>
      </form>
    </section>
  );
}
