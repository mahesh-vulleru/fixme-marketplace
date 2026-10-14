import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { SESSION_COOKIE_NAME, generateCsrfToken } from '../permissions/rbac';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.body && req.body.role && req.body.role !== 'customer' && req.body.role !== 'seller') {
        throw new AppError(
          400,
          'ROLE_ASSIGNMENT_PROHIBITED',
          'Public registration with administrative roles is prohibited. You may only register as a customer or seller.'
        );
      }
      const result = await AuthService.register(req.body);
      setSessionCookie(res, result.token);
      res.status(201).json({
        success: true,
        data: {
          user: {
            _id: result.user._id,
            email: result.user.email,
            phone: result.user.phone,
            fullName: result.user.fullName,
            role: result.user.role,
            isEmailVerified: result.user.isEmailVerified,
            isActive: result.user.isActive,
          },
          sellerProfile: result.sellerProfile || null,
          csrfToken: result.csrfToken,
          token: result.token,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      setSessionCookie(res, result.token);
      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: result.user._id,
            email: result.user.email,
            phone: result.user.phone,
            fullName: result.user.fullName,
            role: result.user.role,
            isEmailVerified: result.user.isEmailVerified,
            isActive: result.user.isActive,
          },
          sellerProfile: result.sellerProfile,
          csrfToken: result.csrfToken,
          token: result.token,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    res.status(200).json({
      success: true,
      data: { loggedOut: true },
      requestId: req.requestId,
    });
  }

  static async forgotPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      await AuthService.resetPassword({
        token: req.body.token,
        password: req.body.password,
        requestId: req.requestId,
      });
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.status(200).json({
        success: true,
        data: { passwordReset: true },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.changePassword(
        req.user!.id,
        req.body,
        req.requestId
      );
      setSessionCookie(res, result.token);
      res.status(200).json({
        success: true,
        data: {
          passwordChanged: true,
          csrfToken: result.csrfToken,
          token: result.token,
        },
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const user = await AuthService.updateProfile(req.user!.id, req.body);
      res.status(200).json({
        success: true,
        data: user,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.getMe(req.user!.id);
      res.status(200).json({
        success: true,
        data: result,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async applyForSeller(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await AuthService.applyForSeller(
        req.user!.id,
        req.body,
        req.requestId
      );
      res.status(201).json({
        success: true,
        data: profile,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getCsrfToken(req: Request, res: Response): Promise<void> {
    const token = generateCsrfToken(req.user!.id);
    res.status(200).json({
      success: true,
      data: { csrfToken: token },
      requestId: req.requestId,
    });
  }

  static async getSellerProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await AuthService.getSellerProfile(req.user!.id);
      res.status(200).json({
        success: true,
        data: profile,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateSellerProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const profile = await AuthService.updateSellerProfile(
        req.user!.id,
        req.body,
        req.requestId
      );
      res.status(200).json({
        success: true,
        data: profile,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await AuthService.addAddress(req.user!.id, req.body);
      res.status(201).json({
        success: true,
        data: address,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listAddresses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const addresses = await AuthService.listAddresses(req.user!.id);
      res.status(200).json({
        success: true,
        data: addresses,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async listWishlist(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const items = await AuthService.listWishlist(req.user!.id);
      res.status(200).json({
        success: true,
        data: items,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async addWishlistItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const items = await AuthService.toggleWishlistListing(
        req.user!.id,
        req.params.listingId,
        true
      );
      res.status(200).json({
        success: true,
        data: items,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }

  static async removeWishlistItem(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const items = await AuthService.toggleWishlistListing(
        req.user!.id,
        req.params.listingId,
        false
      );
      res.status(200).json({
        success: true,
        data: items,
        requestId: req.requestId,
      });
    } catch (err) {
      next(err);
    }
  }
}
