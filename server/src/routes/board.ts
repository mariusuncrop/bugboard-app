import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { requireProjectAccess } from '../lib/projects.js';
import { asyncHandler } from '../lib/http.js';
import { issueDto } from '../lib/serialize.js';
import { store } from '../store.js';
import { STATUSES } from '../types.js';

const COLUMN_TITLES: Record<string, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  in_review: 'In review',
  done: 'Done',
};

export const boardRouter = Router({ mergeParams: true });

boardRouter.get(
  '/',
  requireAuth,
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const assigneeId = typeof req.query.assigneeId === 'string' ? req.query.assigneeId : undefined;
    const priority = typeof req.query.priority === 'string' ? req.query.priority : undefined;

    const visible = store.data.issues.filter((issue) => {
      if (issue.projectId !== req.project!.id) return false;
      if (assigneeId === 'unassigned' && issue.assigneeId !== null) return false;
      if (assigneeId && assigneeId !== 'unassigned' && issue.assigneeId !== assigneeId) return false;
      if (priority && issue.priority !== priority) return false;
      return true;
    });

    res.json({
      columns: STATUSES.map((status) => ({
        status,
        title: COLUMN_TITLES[status],
        issues: visible
          .filter((issue) => issue.status === status)
          .sort((a, b) => a.position - b.position)
          .map(issueDto),
      })),
    });
  }),
);
