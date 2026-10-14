import rateLimit from 'express-rate-limit';

const isTestEnv = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTestEnv ? 10000 : 300,
  skip: () => isTestEnv,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTestEnv ? 10000 : isProd ? 25 : 100,
  skip: () => isTestEnv,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please wait 15 minutes.',
    },
  },
});

