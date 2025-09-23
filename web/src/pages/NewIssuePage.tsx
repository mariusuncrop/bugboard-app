import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, request, upload } from '../lib/api';
import { formatBytes } from '../lib/format';
import { useToast } from '../lib/toast';
import { fetchUploadRules, rejectionReason, type UploadRules } from '../lib/uploads';
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

  // Files are held here until the issue exists — attachments hang off an issue
  // id, so there is nothing to attach them to until it has been created.
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadRules, setUploadRules] = useState<UploadRules | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

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
    fetchUploadRules()
      .then(setUploadRules)
      .catch(() => undefined);
  }, []);

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const chosen = Array.from(event.target.files ?? []);
    if (fileInput.current) fileInput.current.value = '';
    if (chosen.length === 0 || !uploadRules) return;

    const rejected = chosen.map((file) => rejectionReason(file, uploadRules)).filter(Boolean);
    const accepted = chosen.filter((file) => !rejectionReason(file, uploadRules));

    setPendingFiles((current) => [
      ...current,
      ...accepted.filter((file) => !current.some((existing) => existing.name === file.name)),
    ]);
    setErrors((current) => ({ ...current, attachments: rejected.join(' ') }));
  };

  const removeFile = (name: string) =>
    setPendingFiles((current) => current.filter((file) => file.name !== name));

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
    let issueKey: string | null = null;
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
      issueKey = response.issue.key;
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fieldErrors);
        setFormError(error.message);
      } else {
        setFormError('Could not reach the server.');
      }
      setSubmitting(false);
      return;
    }

    // The issue now exists. An upload that fails from here must not look like a
    // failed creation, so say what happened and still open the issue.
    const failures: string[] = [];
    for (const [index, file] of pendingFiles.entries()) {
      setProgress({ current: index + 1, total: pendingFiles.length });
      try {
        await upload(`/issues/${issueKey}/attachments`, file);
      } catch (error) {
        failures.push(error instanceof ApiError ? error.detail : `${file.name} could not be uploaded.`);
      }
    }
    setProgress(null);
    setSubmitting(false);

    if (failures.length > 0) {
      notify(`${issueKey} created, but ${failures.length} file could not be attached.`, 'error');
    } else if (pendingFiles.length > 0) {
      const count = pendingFiles.length;
      notify(`${issueKey} created with ${count} file${count === 1 ? '' : 's'} attached.`);
    } else {
      notify(`${issueKey} created.`);
    }

    navigate(`/issues/${issueKey}`);
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

        <div className="field">
          <label htmlFor="attachments">Attachments</label>
          {uploadRules ? (
            <>
              <input
                ref={fileInput}
                id="attachments"
                type="file"
                multiple
                data-testid="issue-attachment-input"
                onChange={addFiles}
              />
              <p className="field__hint">
                Up to {formatBytes(uploadRules.maxBytes)} each, attached once the issue is created.
              </p>
            </>
          ) : (
            <p className="field__hint" data-testid="attachments-loading">
              Checking the upload limits…
            </p>
          )}
          {errors.attachments ? (
            <p className="field__error" data-testid="error-attachments">
              {errors.attachments}
            </p>
          ) : null}

          <ul className="list" data-testid="pending-attachments">
            {pendingFiles.map((file) => (
              <li key={file.name} data-testid={`pending-attachment-${file.name}`}>
                {file.name}
                <span className="muted"> · {formatBytes(file.size)}</span>
                <button
                  type="button"
                  className="link link--danger"
                  data-testid={`remove-pending-${file.name}`}
                  onClick={() => removeFile(file.name)}
                >
                  Remove
                </button>
              </li>
            ))}
            {pendingFiles.length === 0 ? (
              <li className="muted" data-testid="pending-attachments-empty">
                No files chosen.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="form__actions">
          <Link to="/issues" className="button button--ghost" data-testid="issue-cancel">
            Cancel
          </Link>
          <button type="submit" className="button button--primary" data-testid="issue-submit" disabled={submitting}>
            {progress ? `Uploading ${progress.current} of ${progress.total}…` : submitting ? 'Creating…' : 'Create issue'}
          </button>
        </div>
      </form>
    </section>
  );
}
