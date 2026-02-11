import { Link, Outlet, useParams } from 'react-router-dom';
import { useCurrentProject, useProjects } from '../lib/projects';
import { Spinner } from './Spinner';

export function ProjectNotFound({ projectKey }: { projectKey: string }) {
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

/**
 * Every project-scoped page asks the same question: does this key name a
 * project this person may see? Answering it once, here, means a wrong or
 * forbidden key shows the same page everywhere — instead of each page spinning
 * forever on a request that will never succeed.
 */
export function RequireProject() {
  const { projectKey = '' } = useParams();
  const { loading } = useProjects();
  const project = useCurrentProject();

  if (loading) return <Spinner label="Loading project" testId="project-loading" />;
  if (!project) return <ProjectNotFound projectKey={projectKey} />;

  return <Outlet />;
}
