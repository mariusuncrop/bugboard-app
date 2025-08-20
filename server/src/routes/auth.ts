import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, signToken, toPublicUser } from '../lib/auth.js';
import { ApiError, asyncHandler, parse } from '../lib/http.js';
import { store } from '../store.js';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required.').email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

export const authRouter = Router();

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const body = parse(loginSchema, req.body);
    const user = store.data.users.find(
      (candidate) => candidate.email.toLowerCase() === body.email.toLowerCase(),
    );

    if (!user || user.password !== body.password) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    res.json({ token: signToken(user), user: toPublicUser(user) });
  }),
);

authRouter.post('/logout', (_req, res) => {
  // Tokens are stateless; the client drops it. The route exists so the UI has
  // something to call and tests have something to assert on.
  res.status(204).end();
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);
