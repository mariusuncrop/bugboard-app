import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { request } from '../lib/api';
import { useAuth } from '../lib/auth';
import { projectPath } from '../lib/projects';
import { useToast } from '../lib/toast';
import type { Issue, ProjectSummary } from '../lib/types';
import { DueBadge } from '../components/DueBadge';
import { PriorityBadge, StatusBadge, TypeBadge } from '../components/Badge';
import { Spinner } from '../components/Spinner';

interface HomeProject extends ProjectSummary {
  openIssues: number;
  assignedToMe: number;
}

interface Summary {
  projects: HomeProject[];
  assigned: { open: number; overdue: number; done: number; items: Issue[] };
}

export function HomePage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    request<Summary>('/me/summary')
      .then(setSummary)
      .catch(() => notify('Could not load your work.', 'error'));
  }, [notify]);

  if (!summary) return <Spinner label="Gathering your work" testId="home-loading" />;

  const { projects, assigned } = summary;

  return (
    <section className="page" data-testid="home-page">
      <header className="page__header">
        <div>
          <h1>Hello, {user?.name?.split(' ')[0]}</h1>
          <p className="muted">Everything assigned to you, across the projects you are on.</p>
        </div>
      </header>

      <div className="stat-grid">
        <article className="card stat" data-testid="home-stat-open">
          <p className="stat__label">Assigned and open</p>
          <p className="stat__value">{assigned.open}</p>
        </article>
        <article className="card stat" data-testid="home-stat-overdue">
          <p className="stat__label">Past their due date</p>
          <p className="stat__value">{assigned.overdue}</p>
        </article>
        <article className="card stat" data-testid="home-stat-done">
          <p className="stat__label">Finished by you</p>
          <p className="stat__value">{assigned.done}</p>
        </article>
        <article className="card stat" data-testid="home-stat-projects">
          <p className="stat__label">Your projects</p>
          <p className="stat__value">{projects.length}</p>
        </article>
      </div>

      <div className="grid grid--2">
        <article className="card" data-testid="home-projects">
          <h2>Your projects</h2>
          {projects.length === 0 ? (
            <p className="muted" data-testid="home-projects-empty">
              You are not on any project yet. An admin can add you to one.
            </p>
          ) : (
            <ul className="list">
              {projects.map((project) => (
                <li key={project.id} className="home-project" data-testid={`home-project-${project.key}`}>
                  <Link to={projectPath(project.key, '/board')} className="project-card__key">
                    {project.key}
                  </Link>
                  <Link to={projectPath(project.key, '/board')} data-testid="home-project-name">
                    {project.name}
                  </Link>
                  <span className="muted" data-testid="home-project-counts">
                    {project.openIssues} open · {project.assignedToMe} yours
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p>
            <Link to="/projects" data-testid="home-all-projects">
              All projects →
            </Link>
          </p>
        </article>

        <article className="card" data-testid="home-assigned">
          <h2>
            Assigned to you <span className="muted">({assigned.open})</span>
          </h2>

          {assigned.items.length === 0 ? (
            <p className="muted" data-testid="home-assigned-empty">
              Nothing is assigned to you right now.
            </p>
          ) : (
            <ul className="list" data-testid="home-assigned-list">
              {assigned.items.map((issue) => (
                <li key={issue.id} className="home-issue" data-testid={`home-issue-${issue.key}`}>
                  <Link
                    to={projectPath(issue.project?.key ?? '', `/issues/${issue.key}`)}
                    className="home-issue__key"
                    data-testid="home-issue-key"
                  >
                    {issue.key}
                  </Link>
                  <Link
                    to={projectPath(issue.project?.key ?? '', `/issues/${issue.key}`)}
                    className="home-issue__title"
                  >
                    {issue.title}
                  </Link>
                  <span className="home-issue__meta">
                    <TypeBadge type={issue.type} />
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                    <DueBadge dueOn={issue.dueOn} state={issue.dueState} daysUntil={issue.daysUntilDue} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
