import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { ancestorsOf, findVisibleIssue, projectOf, requireProjectAccess } from '../lib/projects.js';
import { dueState } from '../lib/dates.js';
import { issueDto } from '../lib/serialize.js';
import { store } from '../store.js';
import { ISSUE_TYPES, PRIORITIES, STATUSES, type Issue, type Project, type Status } from '../types.js';

const PRIORITY_RANK: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
const MAX_PAGE_SIZE = 100;

const labelsSchema = z
  .array(z.string().trim().min(1, 'Labels cannot be empty.').max(24, 'Labels are limited to 24 characters.'))
  .max(5, 'An issue can carry at most 5 labels.');

const createSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters.')
    .max(120, 'Title must be 120 characters or fewer.'),
  description: z.string().trim().max(5000, 'Description must be 5000 characters or fewer.').default(''),
  type: z.enum(ISSUE_TYPES, { errorMap: () => ({ message: 'Type must be "bug" or "task".' }) }),
  priority: z
    .enum(PRIORITIES, { errorMap: () => ({ message: 'Priority must be low, medium, high or critical.' }) })
    .default('medium'),
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'Unknown status.' }) }).default('backlog'),
  assigneeId: z.string().nullable().default(null),
  labels: labelsSchema.default([]),
  parentId: z.string().nullable().default(null),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a calendar date, as YYYY-MM-DD.')
    .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), 'That is not a real date.')
    .nullable()
    .default(null),
});

const updateSchema = createSchema.partial();

const moveSchema = z.object({
  status: z.enum(STATUSES, { errorMap: () => ({ message: 'Unknown status.' }) }),
  position: z.number().int().min(0).default(0),
});

const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  assigneeId: z.string().optional(),
  label: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'key', 'title', 'dueOn']).default('createdAt'),
  /** 'overdue' | 'soon' | 'none' — see dueState in lib/dates. */
  due: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

const csv = (value: string | undefined): string[] =>
  value ? value.split(',').map((part) => part.trim()).filter(Boolean) : [];

/** An assignee has to be able to see the project they are being assigned work in. */
function assertAssignable(project: Project, assigneeId: string | null | undefined): void {
  if (!assigneeId) return;
  const user = store.data.users.find((candidate) => candidate.id === assigneeId);
  if (!user) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'assigneeId', message: 'No user matches that id.' },
    ]);
  }
  if (user.role !== 'admin' && !project.memberIds.includes(user.id)) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'assigneeId', message: `${user.name} is not a member of ${project.key}.` },
    ]);
  }
}

/**
 * A parent has to be a real issue, in the same project, and not the issue
 * itself or anything already beneath it — otherwise the tree closes into a loop
 * that every walk up it would spin on.
 */
function assertParentAllowed(issue: Issue | null, project: Project, parentId: string | null | undefined): void {
  if (!parentId) return;

  const parent = store.data.issues.find((candidate) => candidate.id === parentId || candidate.key === parentId);
  if (!parent) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'parentId', message: 'No issue matches that parent.' },
    ]);
  }
  if (parent.projectId !== project.id) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'parentId', message: `${parent.key} is in another project.` },
    ]);
  }
  if (issue && parent.id === issue.id) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'parentId', message: 'An issue cannot be its own parent.' },
    ]);
  }
  if (issue && ancestorsOf(parent).some((ancestor) => ancestor.id === issue.id)) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'parentId', message: `${parent.key} already sits beneath ${issue.key}.` },
    ]);
  }
}

/** Rewrites `position` for one column of one project as a dense 0..n-1 sequence. */
function compact(projectId: string, status: Status): void {
  store.data.issues
    .filter((issue) => issue.projectId === projectId && issue.status === status)
    .sort((a, b) => a.position - b.position)
    .forEach((issue, index) => {
      issue.position = index;
    });
}

// --- collection routes, scoped to one project -------------------------------

export const projectIssuesRouter = Router({ mergeParams: true });

projectIssuesRouter.use(requireAuth, requireProjectAccess);

projectIssuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parse(listQuerySchema, req.query);
    const statuses = csv(query.status);
    const priorities = csv(query.priority);
    const types = csv(query.type);
    const labels = csv(query.label);
    const dueStates = csv(query.due);
    const assignees = csv(query.assigneeId);
    const term = query.q?.toLowerCase();

    const filtered = store.data.issues.filter((issue) => {
      if (issue.projectId !== req.project!.id) return false;
      if (statuses.length && !statuses.includes(issue.status)) return false;
      if (priorities.length && !priorities.includes(issue.priority)) return false;
      if (types.length && !types.includes(issue.type)) return false;
      if (labels.length && !labels.some((label) => issue.labels.includes(label))) return false;
      if (assignees.length) {
        const matches = assignees.some((id) =>
          id === 'unassigned' ? issue.assigneeId === null : issue.assigneeId === id,
        );
        if (!matches) return false;
      }
      if (dueStates.length && !dueStates.includes(dueState(issue.dueOn))) return false;
      if (term && !`${issue.key} ${issue.title} ${issue.description}`.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });

    const direction = query.order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      // Issues with no deadline sort last whichever way the column is pointed.
      if (query.sort === 'dueOn') {
        if (a.dueOn === b.dueOn) return 0;
        if (!a.dueOn) return 1;
        if (!b.dueOn) return -1;
        return a.dueOn.localeCompare(b.dueOn) * direction;
      }
      if (query.sort === 'priority') return (PRIORITY_RANK[a.priority]! - PRIORITY_RANK[b.priority]!) * direction;
      if (query.sort === 'title') return a.title.localeCompare(b.title) * direction;
      if (query.sort === 'key') return a.key.localeCompare(b.key, undefined, { numeric: true }) * direction;
      return a[query.sort].localeCompare(b[query.sort]) * direction;
    });

    const total = filtered.length;
    const start = (query.page - 1) * query.pageSize;

    res.json({
      items: filtered.slice(start, start + query.pageSize).map(issueDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    });
  }),
);

projectIssuesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = parse(createSchema, req.body);
    const project = req.project!;
    assertAssignable(project, body.assigneeId);
    assertParentAllowed(null, project, body.parentId);

    const issue = store.mutate((data) => {
      project.counter += 1;
      const now = new Date().toISOString();
      const created: Issue = {
        id: store.id('iss'),
        projectId: project.id,
        key: `${project.key}-${project.counter}`,
        title: body.title,
        description: body.description,
        type: body.type,
        status: body.status,
        priority: body.priority,
        assigneeId: body.assigneeId,
        reporterId: req.user!.id,
        labels: body.labels,
        dueOn: body.dueOn,
        parentId: body.parentId
          ? (data.issues.find((c) => c.id === body.parentId || c.key === body.parentId)?.id ?? null)
          : null,
        position: data.issues.filter(
          (candidate) => candidate.projectId === project.id && candidate.status === body.status,
        ).length,
        createdAt: now,
        updatedAt: now,
      };
      data.issues.push(created);
      return created;
    });

    res.status(201).json({ issue: issueDto(issue) });
  }),
);

// --- item routes, addressed by key, project implied -------------------------

export const issuesRouter = Router();

issuesRouter.use(requireAuth);

issuesRouter.get(
  '/:idOrKey',
  asyncHandler(async (req, res) => {
    res.json({ issue: issueDto(findVisibleIssue(req.user!, req.params.idOrKey!)) });
  }),
);

issuesRouter.patch(
  '/:idOrKey',
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);
    const body = parse(updateSchema, req.body);
    assertAssignable(projectOf(issue), body.assigneeId);
    assertParentAllowed(issue, projectOf(issue), body.parentId);
    if (body.parentId) {
      body.parentId =
        store.data.issues.find((c) => c.id === body.parentId || c.key === body.parentId)?.id ?? null;
    }

    const previousStatus = issue.status;
    store.mutate(() => {
      Object.assign(issue, body, { updatedAt: new Date().toISOString() });
      if (body.status && body.status !== previousStatus) {
        issue.position = Number.MAX_SAFE_INTEGER;
        compact(issue.projectId, body.status);
        compact(issue.projectId, previousStatus);
      }
    });

    res.json({ issue: issueDto(issue) });
  }),
);

issuesRouter.get(
  '/:idOrKey/children',
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);
    res.json({
      items: store.data.issues
        .filter((candidate) => candidate.parentId === issue.id)
        .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }))
        .map(issueDto),
    });
  }),
);

issuesRouter.post(
  '/:idOrKey/move',
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);
    const body = parse(moveSchema, req.body);
    const previousStatus = issue.status;

    store.mutate((data) => {
      const column = data.issues
        .filter(
          (candidate) =>
            candidate.projectId === issue.projectId &&
            candidate.status === body.status &&
            candidate.id !== issue.id,
        )
        .sort((a, b) => a.position - b.position);

      column.splice(Math.min(body.position, column.length), 0, issue);
      issue.status = body.status;
      issue.updatedAt = new Date().toISOString();
      column.forEach((candidate, index) => {
        candidate.position = index;
      });
      if (previousStatus !== body.status) compact(issue.projectId, previousStatus);
    });

    res.json({ issue: issueDto(issue) });
  }),
);

issuesRouter.delete(
  '/:idOrKey',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);

    store.mutate((data) => {
      data.issues = data.issues.filter((candidate) => candidate.id !== issue.id);
      data.comments = data.comments.filter((comment) => comment.issueId !== issue.id);
      data.attachments = data.attachments.filter((attachment) => attachment.issueId !== issue.id);
      data.links = data.links.filter(
        (link) => link.fromIssueId !== issue.id && link.toIssueId !== issue.id,
      );
      // Children outlive their parent; they just stop being subtasks.
      for (const child of data.issues) {
        if (child.parentId === issue.id) child.parentId = null;
      }
      compact(issue.projectId, issue.status);
    });

    res.status(204).end();
  }),
);
