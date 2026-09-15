import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// [SEC-005] Safe error codes that may be surfaced to clients without leaking internals.
const SAFE_INTERNAL_MESSAGES: Record<string, string> = {
  UNIQUE_CONSTRAINT_VIOLATION: 'A record with this information already exists.',
  FOREIGN_KEY_VIOLATION: 'Referenced record does not exist.',
  RECORD_NOT_FOUND: 'The requested resource could not be found.',
};

/**
 * Sanitizes raw Prisma / database error messages so they never reach the client.
 * Raw Prisma messages expose table names, column names, and schema structure.
 */
function sanitizeErrorMessage(err: any, statusCode: number): string {
  // Prisma error codes: P2002 = unique violation, P2025 = record not found, etc.
  if (err?.code?.startsWith('P2')) {
    if (err.code === 'P2002') return SAFE_INTERNAL_MESSAGES.UNIQUE_CONSTRAINT_VIOLATION;
    if (err.code === 'P2025') return SAFE_INTERNAL_MESSAGES.RECORD_NOT_FOUND;
    if (err.code === 'P2003') return SAFE_INTERNAL_MESSAGES.FOREIGN_KEY_VIOLATION;
    return 'A database operation error occurred.';
  }
  // For all 500 errors, never expose raw message regardless of NODE_ENV
  if (statusCode === 500) {
    return 'An internal system error occurred. Please try again later.';
  }
  // For non-500 errors with an explicit status code set by app code, the message is safe
  if (err.statusCode && err.message) {
    return err.message;
  }
  return 'An unexpected error occurred.';
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log full details server-side only — never to client
  console.error(`[API Error] ${req.method} ${req.path}:`, err?.message || err);

  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input parameters.',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      },
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const message = sanitizeErrorMessage(err, statusCode);

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message,
    },
  });
};

