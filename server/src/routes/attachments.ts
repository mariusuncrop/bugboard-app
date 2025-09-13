import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { attachmentDto } from '../lib/serialize.js';
import { store } from '../store.js';
import type { Attachment } from '../types.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'text/csv',
  'application/json',
  'application/pdf',
];

const resolveIssueId = (idOrKey: string): string => {
  const needle = idOrKey.toLowerCase();
  const issue = store.data.issues.find(
    (candidate) => candidate.id.toLowerCase() === needle || candidate.key.toLowerCase() === needle,
  );
  if (!issue) throw ApiError.notFound(`No issue matches "${idOrKey}".`);
  return issue.id;
};

export const attachmentsRouter = Router();

attachmentsRouter.get(
  '/issues/:idOrKey/attachments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const issueId = resolveIssueId(req.params.idOrKey!);
    res.json({
      items: store.data.attachments
        .filter((attachment) => attachment.issueId === issueId)
        .map(attachmentDto),
    });
  }),
);

attachmentsRouter.post(
  '/issues/:idOrKey/attachments',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    const issueId = resolveIssueId(req.params.idOrKey!);
    const file = req.file;
    if (!file) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'file', message: 'Attach a file using the "file" field.' },
      ]);
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw ApiError.badRequest('The request body is invalid.', [
        { path: 'file', message: `Unsupported file type "${file.mimetype}".` },
      ]);
    }

    const attachment = store.mutate((data) => {
      const created: Attachment = {
        id: store.id('att'),
        issueId,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer.toString('base64'),
        uploadedById: req.user!.id,
        createdAt: new Date().toISOString(),
      };
      data.attachments.push(created);
      return created;
    });

    res.status(201).json({ attachment: attachmentDto(attachment) });
  }),
);

attachmentsRouter.get(
  '/attachments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attachment = store.data.attachments.find((candidate) => candidate.id === req.params.id);
    if (!attachment) throw ApiError.notFound('No attachment matches that id.');

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.filename}"`);
    res.send(Buffer.from(attachment.data, 'base64'));
  }),
);

attachmentsRouter.delete(
  '/attachments/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const attachment = store.data.attachments.find((candidate) => candidate.id === req.params.id);
    if (!attachment) throw ApiError.notFound('No attachment matches that id.');

    store.mutate((data) => {
      data.attachments = data.attachments.filter((candidate) => candidate.id !== attachment.id);
    });

    res.status(204).end();
  }),
);
