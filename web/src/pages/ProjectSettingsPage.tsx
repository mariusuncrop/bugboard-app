import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, request } from '../lib/api';
import { useAuth } from '../lib/auth';
import { projectPath, useProjects } from '../lib/projects';
import { useToast } from '../lib/toast';
import type { Project, UserSummary } from '../lib/types';
import { Avatar } from '../components/Avatar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Spinner } from '../components/Spinner';

export function ProjectSettingsPage() {
  const { projectKey = '' } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const { reload } = useProjects();

  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const response = await request<{ project: Project }>(`/projects/${projectKey}`);
    setProject(response.project);
  }, [projectKey]);

  useEffect(() => {
    setProject(null);
    setNotFound(false);
    load().catch((error) => {
      if (error instanceof ApiError && error.status === 404) setNotFound(true);
      else notify('Could not load the project.', 'error');
    });
  }, [load, notify]);

  useEffect(() => {
    request<{ items: UserSummary[] }>('/users')
      .then((response) => setUsers(response.items))
      .catch(() => undefined);
  }, []);

  const isAdmin = user?.role === 'admin';

  const addMember = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await request<{ project: Project }>(`/projects/${projectKey}/members`, {
        method: 'POST',
        body: { userId: selected },
      });
      setProject(response.project);
      setSelected('');
      await reload();
      notify('Member added.');
    } catch (error) {
      notify(error instanceof ApiError ? error.detail : 'Could not add the member.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeMember = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      const response = await request<{ project: Project; unassignedIssues: number }>(
        `/projects/${projectKey}/members/${removing.id}`,
        { method: 'DELETE' },
      );
      setProject(response.project);
      await reload();
      notify(
        response.unassignedIssues > 0
          ? `${removing.name} removed. ${response.unassignedIssues} issue${
              response.unassignedIssues === 1 ? '' : 's'
            } left unassigned.`
          : `${removing.name} removed.`,
      );
    } catch (error) {
      notify(error instanceof ApiError ? error.detail : 'Could not remove the member.', 'error');
    } finally {
      setBusy(false);
      setRemoving(null);
    }
  };

  if (notFound) {
    return (
      <section className="page" data-testid="project-not-found">
        <h1>Project not found</h1>
        <p className="muted">
          No project matches <code>{projectKey}</code>, or you do not have access to it.
        </p>
        <Link to="/projects" className="button button--ghost">
          Back to projects
        </Link>
      </section>
    );
  }

  if (!project) return <Spinner label="Loading project" testId="project-loading" />;

  const candidates = users.filter((candidate) => !project.members.some((member) => member.id === candidate.id));

  return (
    <section className="page page--narrow" data-testid="project-settings-page">
      <header className="page__header">
        <div>
          <p className="breadcrumb">
            <Link to="/projects">Projects</Link> / <span data-testid="settings-project-key">{project.key}</span>
          </p>
          <h1>{project.name}</h1>
          <p className="muted">{project.description || 'No description.'}</p>
        </div>
        <Link to={projectPath(project.key, '/board')} className="button button--ghost">
          Open board
        </Link>
      </header>

      <div className="card">
        <h2>
          Members <span className="muted">({project.members.length})</span>
        </h2>

        <ul className="list" data-testid="member-list">
          {project.members.map((member) => (
            <li key={member.id} className="member" data-testid={`member-${member.id}`}>
              <Avatar user={member} />
              <span>{member.name}</span>
              <span className="muted"> · {member.email}</span>
              {member.role === 'admin' ? <span className="chip">admin</span> : null}
              {isAdmin ? (
                <button
                  type="button"
                  className="link link--danger"
                  data-testid={`remove-member-${member.id}`}
                  onClick={() => setRemoving({ id: member.id, name: member.name })}
                >
                  Remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {isAdmin ? (
          <div className="filters" data-testid="add-member">
            <label className="field field--inline field--grow">
              <span className="sr-only">Add a member</span>
              <select
                data-testid="member-select"
                value={selected}
                onChange={(event) => setSelected(event.target.value)}
              >
                <option value="">Choose someone to add…</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name} · {candidate.email}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button button--primary"
              data-testid="add-member-button"
              disabled={!selected || busy}
              onClick={() => void addMember()}
            >
              Add member
            </button>
          </div>
        ) : (
          <p className="muted" data-testid="manage-members-hint">
            Only admins can change who is on a project.
          </p>
        )}
      </div>

      {removing ? (
        <ConfirmDialog
          title={`Remove ${removing.name}?`}
          message="They will lose access to this project, and any issue assigned to them here becomes unassigned."
          confirmLabel="Remove"
          busy={busy}
          onConfirm={() => void removeMember()}
          onCancel={() => setRemoving(null)}
        />
      ) : null}
    </section>
  );
}
