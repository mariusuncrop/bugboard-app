import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { projectPath, useProjects } from '../lib/projects';
import { Spinner } from '../components/Spinner';

export function ProjectsPage() {
  const { user } = useAuth();
  const { projects, loading } = useProjects();

  if (loading) return <Spinner label="Loading projects" testId="projects-loading" />;

  return (
    <section className="page" data-testid="projects-page">
      <header className="page__header">
        <div>
          <h1>Projects</h1>
          <p className="muted">
            {user?.role === 'admin'
              ? 'Every project on this instance.'
              : 'The projects you have been added to.'}
          </p>
        </div>
        {user?.role === 'admin' ? (
          <Link to="/projects/new" className="button button--primary" data-testid="new-project-button">
            New project
          </Link>
        ) : null}
      </header>

      {projects.length === 0 ? (
        <p className="empty" data-testid="projects-empty">
          You are not a member of any project yet. An admin can add you to one.
        </p>
      ) : (
        <div className="grid grid--2" data-testid="project-list">
          {projects.map((project) => (
            <article className="card project-card" key={project.id} data-testid={`project-card-${project.key}`}>
              <header className="project-card__top">
                <span className="project-card__key" data-testid="project-card-key">
                  {project.key}
                </span>
                <span className="muted" data-testid="project-card-counts">
                  {project.issueCount} issue{project.issueCount === 1 ? '' : 's'} · {project.memberCount} member
                  {project.memberCount === 1 ? '' : 's'}
                </span>
              </header>

              <h2>
                <Link to={projectPath(project.key, '/board')} data-testid="project-card-name">
                  {project.name}
                </Link>
              </h2>
              <p className="muted">{project.description || 'No description.'}</p>

              <footer className="project-card__actions">
                <Link to={projectPath(project.key, '/board')} className="button button--ghost">
                  Board
                </Link>
                <Link to={projectPath(project.key, '/issues')} className="button button--ghost">
                  Issues
                </Link>
                {user?.role === 'admin' ? (
                  <Link
                    to={projectPath(project.key, '/settings')}
                    className="button button--ghost"
                    data-testid={`project-settings-${project.key}`}
                  >
                    Members
                  </Link>
                ) : null}
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
