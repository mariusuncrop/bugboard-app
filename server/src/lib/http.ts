import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError, type TypeOf, type ZodTypeAny } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'NOT_ENABLED'
  | 'INTERNAL_ERROR';

export interface FieldError {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: FieldError[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: FieldError[]): ApiError {
    return new ApiError(400, 'VALIDATION_ERROR', message, details);
  }

  static unauthorized(message = 'Authentication required.'): ApiError {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to do that.'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found.'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }
}

/** Express 4 does not forward rejected promises, so every async route goes through this. */
export const asyncHandler =
  (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    handler(req, res, next).catch(next);
  };

/** Generic over the schema itself so zod's `.default()` output types survive. */
export function parse<S extends ZodTypeAny>(schema: S, payload: unknown): TypeOf<S> {
  const result = schema.safeParse(payload);
  if (result.success) return result.data as TypeOf<S>;
  throw ApiError.badRequest('The request body is invalid.', toFieldErrors(result.error));
}

function toFieldErrors(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  if (typeof err === 'object' && err !== null && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'The uploaded file is too large.' },
    });
    return;
  }

  console.error('[api] unhandled error', err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } });
}
