import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { useAuth } from '../lib/auth';
import { projectPath, useProjects } from '../lib/projects';
import { useToast } from '../lib/toast';
import type { Project, UserSummary } from '../lib/types';

export function NewProjectPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { reload } = useProjects();

  const [users, setUsers] = useState<UserSummary[]>([]);
  const [form, setForm] = useState({ key: '', name: '', description: '' });
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  // Only admins may create projects, so the route is closed rather than the
  // button merely hidden.
  if (user && user.role !== 'admin') return <Navigate to="/projects" replace />;

  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const toggleMember = (id: string) =>
    setMemberIds((current) => (current.includes(id) ? current.filter((each) => each !== id) : [...current, id]));

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!/^[A-Za-z][A-Za-z0-9]{1,5}$/.test(form.key.trim())) {
      next.key = 'Use 2 to 6 letters or digits, starting with a letter.';
    }
    if (form.name.trim().length < 3) next.name = 'Name must be at least 3 characters.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      const response = await request<{ project: Project }>('/projects', {
        method: 'POST',
        body: {
          key: form.key.trim().toUpperCase(),
          name: form.name.trim(),
          description: form.description.trim(),
          memberIds,
        },
      });
      await reload();
      notify(`${response.project.key} created.`);
      navigate(projectPath(response.project.key, '/board'));
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
    <section className="page page--narrow" data-testid="new-project-page">
      <header className="page__header">
        <div>
          <h1>New project</h1>
          <p className="muted">
            <Link to="/projects" data-testid="back-to-projects">
              ← Back to projects
            </Link>
          </p>
        </div>
      </header>

      <form className="form card" data-testid="project-form" onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className="alert alert--error" role="alert" data-testid="project-form-error">
            {formError}
          </p>
        ) : null}

        <div className="grid grid--2">
          <div className="field">
            <label htmlFor="project-key">Key</label>
            <input
              id="project-key"
              data-testid="project-key"
              placeholder="OPS"
              value={form.key}
              onChange={(event) => set('key', event.target.value.toUpperCase())}
            />
            <p className="field__hint">Prefixes every issue in the project, e.g. OPS-1.</p>
            {errors.key ? (
              <p className="field__error" data-testid="error-key">
                {errors.key}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label htmlFor="project-name">Name</label>
            <input
              id="project-name"
              data-testid="project-name"
              value={form.name}
              onChange={(event) => set('name', event.target.value)}
            />
            {errors.name ? (
              <p className="field__error" data-testid="error-name">
                {errors.name}
              </p>
            ) : null}
          </div>
        </div>

        <div className="field">
          <label htmlFor="project-description">Description</label>
          <textarea
            id="project-description"
            rows={3}
            data-testid="project-description"
            value={form.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </div>

        <fieldset className="field" data-testid="project-members">
          <legend>Members</legend>
          <p className="field__hint">You are added automatically. Everyone else has to be chosen.</p>
          {users.map((candidate) => (
            <label className="checkbox" key={candidate.id}>
              <input
                type="checkbox"
                data-testid={`member-option-${candidate.id}`}
                checked={memberIds.includes(candidate.id)}
                onChange={() => toggleMember(candidate.id)}
              />
              <span>{candidate.name}</span>
              <span className="muted"> · {candidate.email}</span>
            </label>
          ))}
        </fieldset>

        <div className="form__actions">
          <Link to="/projects" className="button button--ghost" data-testid="project-cancel">
            Cancel
          </Link>
          <button type="submit" className="button button--primary" data-testid="project-submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </section>
  );
}
