import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ApiErrorResponse } from '@fixme/api-contracts';
import { logger } from './logger';
import { env } from '../config/env';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`,
    },
    requestId: req.requestId,
  };
  res.status(404).json(response);
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (
    err instanceof ZodError ||
    (err !== null &&
      typeof err === 'object' &&
      (err as { name?: string }).name === 'ZodError' &&
      Array.isArray((err as { issues?: unknown[] }).issues))
  ) {
    const zodIssues = (err as ZodError).issues;
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: zodIssues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      requestId: req.requestId,
    };
    res.status(400).json(response);
    return;
  }

  if (err instanceof AppError) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
      requestId: req.requestId,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  const anyErr = err as Error;
  logger.error('Unhandled Server Error', {
    requestId: req.requestId,
    error: anyErr?.message || String(err),
    stack: env.NODE_ENV === 'production' ? undefined : anyErr?.stack,
  });

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : anyErr?.message || 'Internal server error',
    },
    requestId: req.requestId,
  };
  res.status(500).json(response);
}
