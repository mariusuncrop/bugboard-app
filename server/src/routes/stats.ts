import { Router } from 'express';
import { config } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { requireProjectAccess } from '../lib/projects.js';
import { asyncHandler } from '../lib/http.js';
import { store } from '../store.js';
import { PRIORITIES, STATUSES } from '../types.js';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export const statsRouter = Router({ mergeParams: true });

statsRouter.get(
  '/',
  requireAuth,
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    // Deliberately slow: the dashboard needs a loading state worth asserting on.
    await sleep(config.statsDelayMs);

    const project = req.project!;
    const issues = store.data.issues.filter((issue) => issue.projectId === project.id);
    // Only people who can actually be assigned work here belong in the workload.
    const users = store.data.users.filter((user) => project.memberIds.includes(user.id));
    const count = <T extends string>(keys: readonly T[], pick: (issue: (typeof issues)[number]) => string) =>
      Object.fromEntries(keys.map((key) => [key, issues.filter((issue) => pick(issue) === key).length])) as Record<
        T,
        number
      >;

    res.json({
      total: issues.length,
      open: issues.filter((issue) => issue.status !== 'done').length,
      done: issues.filter((issue) => issue.status === 'done').length,
      unassigned: issues.filter((issue) => issue.assigneeId === null).length,
      byStatus: count(STATUSES, (issue) => issue.status),
      byPriority: count(PRIORITIES, (issue) => issue.priority),
      byType: { bug: issues.filter((i) => i.type === 'bug').length, task: issues.filter((i) => i.type === 'task').length },
      byAssignee: users.map((user) => ({
        id: user.id,
        name: user.name,
        avatarColor: user.avatarColor,
        open: issues.filter((issue) => issue.assigneeId === user.id && issue.status !== 'done').length,
      })),
    });
  }),
);
