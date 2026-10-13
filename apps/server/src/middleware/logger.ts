import { Request, Response, NextFunction } from 'express';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'sessionSecret',
  'authorization',
  'cookie',
  'secret',
]);

function redactSensitive(meta?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const output: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      output[k] = '[REDACTED]';
    } else {
      output[k] = v;
    }
  }
  return output;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(
      JSON.stringify({
        level: 'info',
        timestamp: new Date().toISOString(),
        message,
        ...redactSensitive(meta),
      })
    );
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        timestamp: new Date().toISOString(),
        message,
        ...redactSensitive(meta),
      })
    );
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(
      JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        message,
        ...redactSensitive(meta),
      })
    );
  },
};

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    logger.info('HTTP Request', {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
}
