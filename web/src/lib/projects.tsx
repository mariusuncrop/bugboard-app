import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { request } from './api';
import { useAuth } from './auth';
import type { ProjectSummary } from './types';

interface ProjectsValue {
  /** Only the projects this user may see. Admins get all of them. */
  projects: ProjectSummary[];
  loading: boolean;
  reload: () => Promise<void>;
}

const ProjectsContext = createContext<ProjectsValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { user, restoring } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const response = await request<{ items: ProjectSummary[] }>('/projects');
    setProjects(response.items);
  }, []);

  // Keyed on the signed-in user, not just on mount. The provider is above the
  // router, so it also mounts on the login page: fetching once there would 401
  // and leave an empty list that never refilled once the visitor signed in.
  useEffect(() => {
    if (restoring) return;

    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    reload()
      .catch(() => setProjects([]))
      .finally(() => setLoading(false));
  }, [user, restoring, reload]);

  const value = useMemo(() => ({ projects, loading, reload }), [projects, loading, reload]);

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>;
}

export function useProjects(): ProjectsValue {
  const value = useContext(ProjectsContext);
  if (!value) throw new Error('useProjects must be used inside a ProjectsProvider.');
  return value;
}

/**
 * The project named in the URL. Undefined on routes that are not scoped to one,
 * and null while the list is still loading or when the key matches nothing the
 * user can see.
 */
export function useCurrentProject(): ProjectSummary | null {
  const { projectKey } = useParams();
  const { projects } = useProjects();
  if (!projectKey) return null;
  return projects.find((project) => project.key.toLowerCase() === projectKey.toLowerCase()) ?? null;
}

/** Builds a path inside a project, so links do not hand-assemble URLs. */
export const projectPath = (projectKey: string, suffix = ''): string =>
  `/projects/${projectKey.toLowerCase()}${suffix}`;
