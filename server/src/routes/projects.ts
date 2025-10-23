import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { findProject, requireProjectAccess, visibleProjects } from '../lib/projects.js';
import { projectDto, projectWithMembersDto } from '../lib/serialize.js';
import { store } from '../store.js';
import type { Project } from '../types.js';

const createSchema = z.object({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'A project key needs at least 2 characters.')
    .max(6, 'A project key may be at most 6 characters.')
    .regex(/^[A-Z][A-Z0-9]*$/, 'Use letters and digits only, starting with a letter.'),
  name: z
    .string()
    .trim()
    .min(3, 'Name must be at least 3 characters.')
    .max(60, 'Name must be 60 characters or fewer.'),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer.').default(''),
  memberIds: z.array(z.string()).max(50).default([]),
});

const memberSchema = z.object({
  userId: z.string().min(1, 'A user id is required.'),
});

export const projectsRouter = Router();

projectsRouter.use(requireAuth);

projectsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({ items: visibleProjects(req.user!).map(projectDto) });
  }),
);

projectsRouter.post(
  '/',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const body = parse(createSchema, req.body);

    if (store.data.projects.some((project) => project.key === body.key)) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'key', message: `The key "${body.key}" is already in use.` },
      ]);
    }

    const unknown = body.memberIds.filter((id) => !store.data.users.some((user) => user.id === id));
    if (unknown.length > 0) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'memberIds', message: `No user matches ${unknown.join(', ')}.` },
      ]);
    }

    const project = store.mutate((data) => {
      const created: Project = {
        id: store.id('prj'),
        key: body.key,
        name: body.name,
        description: body.description,
        // Whoever creates a project is in it; an admin with a project they
        // cannot reach from the switcher is a confusing place to land.
        memberIds: Array.from(new Set([req.user!.id, ...body.memberIds])),
        counter: 0,
        createdAt: new Date().toISOString(),
      };
      data.projects.push(created);
      return created;
    });

    res.status(201).json({ project: projectWithMembersDto(project) });
  }),
);

projectsRouter.get(
  '/:projectKey',
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    res.json({ project: projectWithMembersDto(req.project!) });
  }),
);

projectsRouter.get(
  '/:projectKey/labels',
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const counts = new Map<string, number>();
    for (const issue of store.data.issues.filter((candidate) => candidate.projectId === req.project!.id)) {
      for (const label of issue.labels) counts.set(label, (counts.get(label) ?? 0) + 1);
    }

    res.json({
      items: [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    });
  }),
);

projectsRouter.get(
  '/:projectKey/members',
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    res.json({ items: projectWithMembersDto(req.project!).members });
  }),
);

projectsRouter.post(
  '/:projectKey/members',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const project = findProject(req.params.projectKey!);
    const body = parse(memberSchema, req.body);

    if (!store.data.users.some((user) => user.id === body.userId)) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'userId', message: 'No user matches that id.' },
      ]);
    }
    if (project.memberIds.includes(body.userId)) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'userId', message: 'That user is already a member.' },
      ]);
    }

    store.mutate(() => {
      project.memberIds.push(body.userId);
    });

    res.status(201).json({ project: projectWithMembersDto(project) });
  }),
);

projectsRouter.delete(
  '/:projectKey/members/:userId',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const project = findProject(req.params.projectKey!);
    const { userId } = req.params;

    if (!project.memberIds.includes(userId!)) {
      throw ApiError.notFound('That user is not a member of this project.');
    }

    const orphaned = store.data.issues.filter(
      (issue) => issue.projectId === project.id && issue.assigneeId === userId,
    );

    store.mutate(() => {
      project.memberIds = project.memberIds.filter((id) => id !== userId);
      // Someone removed from a project should not stay assigned to its work.
      for (const issue of orphaned) issue.assigneeId = null;
    });

    res.json({ project: projectWithMembersDto(project), unassignedIssues: orphaned.length });
  }),
);
