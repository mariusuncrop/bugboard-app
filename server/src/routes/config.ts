import { Router } from 'express';
import { config } from '../config.js';
import { requireAuth } from '../lib/auth.js';
import { asyncHandler } from '../lib/http.js';

export const configRouter = Router();

/**
 * The limits the client needs in order to reject a file before it is sent —
 * duplicating them in the frontend would let the two drift apart.
 */
configRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({
      upload: {
        maxBytes: config.maxUploadBytes,
        allowedMimeTypes: config.allowedUploadTypes,
      },
    });
  }),
);
