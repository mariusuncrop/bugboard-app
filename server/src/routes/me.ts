import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { asyncHandler } from '../lib/http.js';
import { visibleProjects } from '../lib/projects.js';
import { issueDto, projectDto } from '../lib/serialize.js';
import { store } from '../store.js';

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export const meRouter = Router();

meRouter.use(requireAuth);

/**
 * Everything the landing page needs, in one request: the projects this user is
 * part of, and the open work assigned to them across all of them.
 */
meRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const projects = visibleProjects(user);
    const projectIds = new Set(projects.map((project) => project.id));

    const mine = store.data.issues.filter(
      (issue) => projectIds.has(issue.projectId) && issue.assigneeId === user.id,
    );
    const open = mine.filter((issue) => issue.status !== 'done');

    // Soonest deadline first, undated last, then by priority.
    open.sort((a, b) => {
      if (a.dueOn !== b.dueOn) {
        if (!a.dueOn) return 1;
        if (!b.dueOn) return -1;
        return a.dueOn.localeCompare(b.dueOn);
      }
      return PRIORITY_RANK[a.priority]! - PRIORITY_RANK[b.priority]!;
    });

    res.json({
      projects: projects.map((project) => ({
        ...projectDto(project),
        openIssues: store.data.issues.filter(
          (issue) => issue.projectId === project.id && issue.status !== 'done',
        ).length,
        assignedToMe: open.filter((issue) => issue.projectId === project.id).length,
      })),
      assigned: {
        open: open.length,
        overdue: open.filter((issue) => issue.dueOn !== null && issue.dueOn < new Date().toISOString().slice(0, 10))
          .length,
        done: mine.length - open.length,
        items: open.slice(0, 20).map(issueDto),
      },
    });
  }),
);
