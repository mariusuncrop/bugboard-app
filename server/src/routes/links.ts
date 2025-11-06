import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { findVisibleIssue, projectOf } from '../lib/projects.js';
import { linkDto } from '../lib/serialize.js';
import { store } from '../store.js';
import { LINK_TYPES, type IssueLink } from '../types.js';

const createSchema = z.object({
  type: z.enum(LINK_TYPES, {
    errorMap: () => ({ message: 'Type must be "relates", "blocks" or "duplicates".' }),
  }),
  /** The other end, by key or id. */
  target: z.string().min(1, 'Name the issue to link to.'),
});

export const linksRouter = Router();

linksRouter.get(
  '/issues/:idOrKey/links',
  requireAuth,
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);
    res.json({ items: store.data.links.filter((link) => link.fromIssueId === issue.id || link.toIssueId === issue.id).map((link) => linkDto(link, issue.id)) });
  }),
);

linksRouter.post(
  '/issues/:idOrKey/links',
  requireAuth,
  asyncHandler(async (req, res) => {
    const issue = findVisibleIssue(req.user!, req.params.idOrKey!);
    const body = parse(createSchema, req.body);
    const target = findVisibleIssue(req.user!, body.target);

    if (target.id === issue.id) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'target', message: 'An issue cannot be linked to itself.' },
      ]);
    }

    // Keeping links inside one project means access to the link follows access
    // to the issue, with nothing extra to reason about.
    if (target.projectId !== issue.projectId) {
      throw ApiError.badRequest('The request body is invalid.', [
        {
          path: 'target',
          message: `${target.key} is in ${projectOf(target).key}, not ${projectOf(issue).key}.`,
        },
      ]);
    }

    const already = store.data.links.some(
      (link) =>
        (link.fromIssueId === issue.id && link.toIssueId === target.id) ||
        (link.fromIssueId === target.id && link.toIssueId === issue.id),
    );
    if (already) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'target', message: `${issue.key} and ${target.key} are already linked.` },
      ]);
    }

    const link = store.mutate((data) => {
      const created: IssueLink = {
        id: store.id('lnk'),
        type: body.type,
        fromIssueId: issue.id,
        toIssueId: target.id,
        createdAt: new Date().toISOString(),
      };
      data.links.push(created);
      return created;
    });

    res.status(201).json({ link: linkDto(link, issue.id) });
  }),
);

linksRouter.delete(
  '/links/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const link = store.data.links.find((candidate) => candidate.id === req.params.id);
    if (!link) throw ApiError.notFound('No link matches that id.');

    // Seeing one end is enough to unlink; both ends are in the same project.
    findVisibleIssue(req.user!, link.fromIssueId);

    store.mutate((data) => {
      data.links = data.links.filter((candidate) => candidate.id !== link.id);
    });

    res.status(204).end();
  }),
);
