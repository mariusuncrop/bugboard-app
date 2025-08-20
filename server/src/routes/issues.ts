import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { issueDto } from '../lib/serialize.js';
import { store } from '../store.js';
import { ISSUE_TYPES, PRIORITIES, STATUSES, type Issue, type Status } from '../types.js';

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
  status: z
    .enum(STATUSES, { errorMap: () => ({ message: 'Unknown status.' }) })
    .default('backlog'),
  assigneeId: z.string().nullable().default(null),
  labels: labelsSchema.default([]),
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
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'key', 'title']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(10),
});

const csv = (value: string | undefined): string[] =>
  value ? value.split(',').map((part) => part.trim()).filter(Boolean) : [];

function findIssue(idOrKey: string): Issue {
  const needle = idOrKey.toLowerCase();
  const issue = store.data.issues.find(
    (candidate) => candidate.id.toLowerCase() === needle || candidate.key.toLowerCase() === needle,
  );
  if (!issue) throw ApiError.notFound(`No issue matches "${idOrKey}".`);
  return issue;
}

function assertAssigneeExists(assigneeId: string | null | undefined): void {
  if (!assigneeId) return;
  if (!store.data.users.some((user) => user.id === assigneeId)) {
    throw ApiError.badRequest('The request body is invalid.', [
      { path: 'assigneeId', message: 'No user matches that id.' },
    ]);
  }
}

/** Rewrites `position` for one column so it is always a dense 0..n-1 sequence. */
function compact(status: Status): void {
  store.data.issues
    .filter((issue) => issue.status === status)
    .sort((a, b) => a.position - b.position)
    .forEach((issue, index) => {
      issue.position = index;
    });
}

export const issuesRouter = Router();

issuesRouter.use(requireAuth);

issuesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parse(listQuerySchema, req.query);
    const statuses = csv(query.status);
    const priorities = csv(query.priority);
    const types = csv(query.type);
    const labels = csv(query.label);
    const term = query.q?.toLowerCase();

    const filtered = store.data.issues.filter((issue) => {
      if (statuses.length && !statuses.includes(issue.status)) return false;
      if (priorities.length && !priorities.includes(issue.priority)) return false;
      if (types.length && !types.includes(issue.type)) return false;
      if (labels.length && !labels.some((label) => issue.labels.includes(label))) return false;
      if (query.assigneeId === 'unassigned' && issue.assigneeId !== null) return false;
      if (query.assigneeId && query.assigneeId !== 'unassigned' && issue.assigneeId !== query.assigneeId) {
        return false;
      }
      if (term && !`${issue.key} ${issue.title} ${issue.description}`.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });

    const direction = query.order === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
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

issuesRouter.get(
  '/:idOrKey',
  asyncHandler(async (req, res) => {
    res.json({ issue: issueDto(findIssue(req.params.idOrKey!)) });
  }),
);

issuesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = parse(createSchema, req.body);
    assertAssigneeExists(body.assigneeId);

    const issue = store.mutate((data) => {
      data.counters[body.type] += 1;
      const now = new Date().toISOString();
      const created: Issue = {
        id: store.id('iss'),
        key: `${body.type === 'bug' ? 'BUG' : 'TASK'}-${data.counters[body.type]}`,
        title: body.title,
        description: body.description,
        type: body.type,
        status: body.status,
        priority: body.priority,
        assigneeId: body.assigneeId,
        reporterId: req.user!.id,
        labels: body.labels,
        position: data.issues.filter((candidate) => candidate.status === body.status).length,
        createdAt: now,
        updatedAt: now,
      };
      data.issues.push(created);
      return created;
    });

    res.status(201).json({ issue: issueDto(issue) });
  }),
);

issuesRouter.patch(
  '/:idOrKey',
  asyncHandler(async (req, res) => {
    const issue = findIssue(req.params.idOrKey!);
    const body = parse(updateSchema, req.body);
    assertAssigneeExists(body.assigneeId);

    const previousStatus = issue.status;
    store.mutate(() => {
      Object.assign(issue, body, { updatedAt: new Date().toISOString() });
      if (body.status && body.status !== previousStatus) {
        issue.position = Number.MAX_SAFE_INTEGER;
        compact(body.status);
        compact(previousStatus);
      }
    });

    res.json({ issue: issueDto(issue) });
  }),
);

issuesRouter.post(
  '/:idOrKey/move',
  asyncHandler(async (req, res) => {
    const issue = findIssue(req.params.idOrKey!);
    const body = parse(moveSchema, req.body);
    const previousStatus = issue.status;

    store.mutate((data) => {
      const column = data.issues
        .filter((candidate) => candidate.status === body.status && candidate.id !== issue.id)
        .sort((a, b) => a.position - b.position);

      column.splice(Math.min(body.position, column.length), 0, issue);
      issue.status = body.status;
      issue.updatedAt = new Date().toISOString();
      column.forEach((candidate, index) => {
        candidate.position = index;
      });
      if (previousStatus !== body.status) compact(previousStatus);
    });

    res.json({ issue: issueDto(issue) });
  }),
);

issuesRouter.delete(
  '/:idOrKey',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const issue = findIssue(req.params.idOrKey!);

    store.mutate((data) => {
      data.issues = data.issues.filter((candidate) => candidate.id !== issue.id);
      data.comments = data.comments.filter((comment) => comment.issueId !== issue.id);
      data.attachments = data.attachments.filter((attachment) => attachment.issueId !== issue.id);
      compact(issue.status);
    });

    res.status(204).end();
  }),
);
