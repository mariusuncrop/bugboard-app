import { Router } from 'express';
import { config } from '../config.js';
import { ApiError, asyncHandler } from '../lib/http.js';
import { store } from '../store.js';

export const testRouter = Router();

/**
 * Restores the deterministic seed fixture. Test suites call this before a spec
 * so every run starts from identical data — it is the contract the e2e repo
 * depends on. Disabled unless ENABLE_TEST_ENDPOINTS=true.
 */
testRouter.post(
  '/reset',
  asyncHandler(async (_req, res) => {
    if (!config.testEndpointsEnabled) {
      throw new ApiError(404, 'NOT_ENABLED', 'Test endpoints are disabled on this deployment.');
    }

    const data = store.reset();
    res.json({
      reset: true,
      counts: {
        users: data.users.length,
        issues: data.issues.length,
        comments: data.comments.length,
        attachments: data.attachments.length,
      },
    });
  }),
);
