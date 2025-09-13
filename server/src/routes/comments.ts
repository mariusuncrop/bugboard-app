import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { commentDto } from '../lib/serialize.js';
import { store } from '../store.js';
import type { Comment } from '../types.js';

const createSchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, 'A comment needs at least 2 characters.')
    .max(2000, 'Comments are limited to 2000 characters.'),
});

const resolveIssueId = (idOrKey: string): string => {
  const needle = idOrKey.toLowerCase();
  const issue = store.data.issues.find(
    (candidate) => candidate.id.toLowerCase() === needle || candidate.key.toLowerCase() === needle,
  );
  if (!issue) throw ApiError.notFound(`No issue matches "${idOrKey}".`);
  return issue.id;
};

export const commentsRouter = Router();

commentsRouter.get(
  '/issues/:idOrKey/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const issueId = resolveIssueId(req.params.idOrKey!);
    res.json({
      items: store.data.comments
        .filter((comment) => comment.issueId === issueId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(commentDto),
    });
  }),
);

commentsRouter.post(
  '/issues/:idOrKey/comments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const issueId = resolveIssueId(req.params.idOrKey!);
    const body = parse(createSchema, req.body);

    const comment = store.mutate((data) => {
      const created: Comment = {
        id: store.id('cmt'),
        issueId,
        authorId: req.user!.id,
        body: body.body,
        createdAt: new Date().toISOString(),
      };
      data.comments.push(created);
      return created;
    });

    res.status(201).json({ comment: commentDto(comment) });
  }),
);

commentsRouter.delete(
  '/comments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const comment = store.data.comments.find((candidate) => candidate.id === req.params.id);
    if (!comment) throw ApiError.notFound('No comment matches that id.');
    if (comment.authorId !== req.user!.id && req.user!.role !== 'admin') {
      throw ApiError.forbidden('You can only delete your own comments.');
    }

    store.mutate((data) => {
      data.comments = data.comments.filter((candidate) => candidate.id !== comment.id);
    });

    res.status(204).end();
  }),
);
