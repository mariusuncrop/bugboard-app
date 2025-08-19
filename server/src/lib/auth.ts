import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { store } from '../store.js';
import type { PublicUser, Role, User } from '../types.js';
import { ApiError } from './http.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: PublicUser;
    }
  }
}

export function signToken(user: User): string {
  return jwt.sign({ sub: user.id, role: user.role }, config.authSecret, {
    expiresIn: config.tokenTtlSeconds,
  });
}

export function toPublicUser(user: User): PublicUser {
  const { password: _password, ...rest } = user;
  return rest;
}

function userFromRequest(header: string | undefined): PublicUser | null {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = jwt.verify(token, config.authSecret) as { sub?: string };
    const user = store.data.users.find((candidate) => candidate.id === payload.sub);
    return user ? toPublicUser(user) : null;
  } catch {
    return null;
  }
}

/** Populates req.user when a valid token is present, but never rejects. */
export const attachUser: RequestHandler = (req, _res, next) => {
  const user = userFromRequest(req.headers.authorization);
  if (user) req.user = user;
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(ApiError.unauthorized('A valid session token is required.'));
    return;
  }
  next();
};

export const requireRole =
  (role: Role): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized('A valid session token is required.'));
      return;
    }
    if (req.user.role !== role) {
      next(ApiError.forbidden(`This action requires the "${role}" role.`));
      return;
    }
    next();
  };
