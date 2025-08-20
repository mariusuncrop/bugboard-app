import { Router } from 'express';
import { requireAuth } from '../lib/auth.js';
import { asyncHandler } from '../lib/http.js';
import { store } from '../store.js';

export const usersRouter = Router();

usersRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({
      items: store.data.users.map(({ password: _password, ...user }) => user),
    });
  }),
);
