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
    const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
    const csv = (value: string | undefined): string[] =>
      value ? value.split(',').map((part) => part.trim()).filter(Boolean) : [];

    // The board takes the same filters as the issue list, so a view set up in
    // one reads the same in the other.
    const assignees = csv(asString(req.query.assigneeId));
    const priorities = csv(asString(req.query.priority));
    const types = csv(asString(req.query.type));
    const labels = csv(asString(req.query.label));
    const term = asString(req.query.q)?.trim().toLowerCase();

    const visible = store.data.issues.filter((issue) => {
      if (issue.projectId !== req.project!.id) return false;
      if (assignees.length) {
        const matches = assignees.some((id) =>
          id === 'unassigned' ? issue.assigneeId === null : issue.assigneeId === id,
        );
        if (!matches) return false;
      }
      if (priorities.length && !priorities.includes(issue.priority)) return false;
      if (types.length && !types.includes(issue.type)) return false;
      if (labels.length && !labels.some((label) => issue.labels.includes(label))) return false;
      if (term && !`${issue.key} ${issue.title} ${issue.description}`.toLowerCase().includes(term)) return false;
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
