import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRole } from '@fixme/shared-types';
import { env } from '../config/env';
import { UserModel } from '../models/User';
import { AppError } from '../middleware/errorHandler';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  authSource: 'cookie' | 'bearer';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const SESSION_COOKIE_NAME = 'fixme_session';

export function signSessionToken(payload: {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  tokenVersion?: number;
}): string {
  return jwt.sign(
    {
      ...payload,
      tokenVersion: payload.tokenVersion ?? 0,
    },
    env.SESSION_SECRET,
    { expiresIn: '7d' }
  );
}

export function generateCsrfToken(userId: string): string {
  return crypto
    .createHmac('sha256', env.SESSION_SECRET)
    .update(`csrf:${userId}`)
    .digest('hex');
}

export function verifyCsrfToken(userId: string, token?: string): boolean {
  if (!token) return false;
  const expected = generateCsrfToken(userId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;
    let authSource: 'cookie' | 'bearer' = 'bearer';

    if (req.cookies && req.cookies[SESSION_COOKIE_NAME]) {
      token = req.cookies[SESSION_COOKIE_NAME];
      authSource = 'cookie';
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.slice(7).trim();
      authSource = 'bearer';
    }

    if (!token) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    }

    let decoded: {
      id: string;
      email: string;
      role: UserRole;
      fullName: string;
      tokenVersion?: number;
    };
    try {
      decoded = jwt.verify(token, env.SESSION_SECRET) as typeof decoded;
    } catch {
      throw new AppError(401, 'INVALID_SESSION_TOKEN', 'Invalid or expired session token');
    }

    // Verify user is still active in DB and tokenVersion has not been invalidated
    const userDoc = await UserModel.findById(decoded.id);
    if (!userDoc || !userDoc.isActive) {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'User account is inactive or suspended');
    }

    if (
      decoded.tokenVersion !== undefined &&
      userDoc.tokenVersion !== undefined &&
      decoded.tokenVersion !== userDoc.tokenVersion
    ) {
      throw new AppError(
        401,
        'SESSION_INVALIDATED',
        'Session has been invalidated due to a password change or security reset'
      );
    }

    // Enforce CSRF token for cookie-authenticated state-changing requests
    const isMutatingMethod = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(
      req.method.toUpperCase()
    );
    if (authSource === 'cookie' && isMutatingMethod) {
      const csrfHeader = req.headers['x-csrf-token'] as string | undefined;
      if (!verifyCsrfToken(userDoc._id.toString(), csrfHeader)) {
        throw new AppError(
          403,
          'CSRF_VALIDATION_FAILED',
          'Missing or invalid X-CSRF-Token header for cookie-authenticated mutation'
        );
      }
    }

    req.user = {
      id: userDoc._id.toString(),
      email: userDoc.email,
      role: userDoc.role,
      fullName: userDoc.fullName,
      authSource,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new AppError(
          403,
          'FORBIDDEN_ROLE',
          `Role '${req.user.role}' does not have permission to perform this action`
        )
      );
      return;
    }

    next();
  };
}

export function requireOwnershipOrAdmin(
  getResourceOwnerId: (req: Request) => Promise<string> | string
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
      }

      if (
        req.user.role === 'administrator' ||
        req.user.role === 'super_administrator'
      ) {
        next();
        return;
      }

      const ownerId = await getResourceOwnerId(req);
      if (ownerId !== req.user.id) {
        throw new AppError(
          403,
          'OWNERSHIP_VIOLATION',
          'You do not have permission to access or modify another user’s resource'
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
