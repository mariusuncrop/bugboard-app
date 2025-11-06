import type { RequestHandler } from 'express';
import { store } from '../store.js';
import type { Issue, Project, PublicUser } from '../types.js';
import { ApiError } from './http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      project?: Project;
    }
  }
}

export function findProject(keyOrId: string): Project {
  const needle = keyOrId.toLowerCase();
  const project = store.data.projects.find(
    (candidate) => candidate.key.toLowerCase() === needle || candidate.id.toLowerCase() === needle,
  );
  if (!project) throw ApiError.notFound(`No project matches "${keyOrId}".`);
  return project;
}

/** Admins see every project; everyone else sees the ones they belong to. */
export const canSee = (user: PublicUser, project: Project): boolean =>
  user.role === 'admin' || project.memberIds.includes(user.id);

export const visibleProjects = (user: PublicUser): Project[] =>
  store.data.projects.filter((project) => canSee(user, project));

export function assertCanSee(user: PublicUser, project: Project): void {
  if (!canSee(user, project)) {
    // Say "not found" rather than "forbidden": confirming a project exists to
    // someone with no access to it is itself a small leak.
    throw ApiError.notFound(`No project matches "${project.key}".`);
  }
}

/** Resolves :projectKey, checks access, and hands the project to the route. */
export const requireProjectAccess: RequestHandler = (req, _res, next) => {
  try {
    if (!req.user) throw ApiError.unauthorized('A valid session token is required.');
    const project = findProject(req.params.projectKey ?? '');
    assertCanSee(req.user, project);
    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

export function projectOf(issue: Issue): Project {
  const project = store.data.projects.find((candidate) => candidate.id === issue.projectId);
  if (!project) throw ApiError.notFound('The issue belongs to a project that no longer exists.');
  return project;
}

/** For routes addressed by issue key, where the project is implied. */
export function assertCanSeeIssue(user: PublicUser, issue: Issue): void {
  assertCanSee(user, projectOf(issue));
}

/** Walks up the parent chain, nearest first. */
export function ancestorsOf(issue: Issue): Issue[] {
  const chain: Issue[] = [];
  const seen = new Set<string>([issue.id]);
  let current = issue.parentId;

  while (current && !seen.has(current)) {
    const parent = store.data.issues.find((candidate) => candidate.id === current);
    if (!parent) break;
    chain.push(parent);
    seen.add(parent.id);
    current = parent.parentId;
  }

  return chain;
}

export function findIssue(idOrKey: string): Issue {
  const needle = idOrKey.toLowerCase();
  const issue = store.data.issues.find(
    (candidate) => candidate.id.toLowerCase() === needle || candidate.key.toLowerCase() === needle,
  );
  if (!issue) throw ApiError.notFound(`No issue matches "${idOrKey}".`);
  return issue;
}

/** Resolves an issue by id or key and checks the caller may see its project. */
export function findVisibleIssue(user: PublicUser, idOrKey: string): Issue {
  const issue = findIssue(idOrKey);
  try {
    assertCanSeeIssue(user, issue);
  } catch {
    throw ApiError.notFound(`No issue matches "${idOrKey}".`);
  }
  return issue;
}
