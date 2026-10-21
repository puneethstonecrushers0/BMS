import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { sendSuccess, sendError } from '../utils/response.js';
import { ENV } from '../config/env.js';
import { issueCsrfToken } from '../middleware/csrf.middleware.js';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body, req.ip);
      sendSuccess(res, result, 'Registration successful. Account awaiting admin approval.', 201);
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userAgent = req.headers['user-agent'];
      const result = await authService.login(req.body, req.ip, userAgent);

      // Set HttpOnly access token cookie
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: ENV.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000, // 15 mins
        path: '/',
      });

      // Set HttpOnly refresh token cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: ENV.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: ENV.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
      });

      // Issue CSRF token for subsequent state mutations
      const csrfToken = issueCsrfToken(req, res);

      sendSuccess(
        res,
        {
          user: result.user,
          csrfToken,
        },
        'Logged in successfully'
      );
    } catch (err) {
      next(err);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        sendError(res, 'No active refresh session', 401);
        return;
      }
      const userAgent = req.headers['user-agent'];
      const result = await authService.refresh(refreshToken, req.ip, userAgent);

      // Rotate cookies
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: ENV.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: ENV.COOKIE_SECURE,
        sameSite: 'lax',
        maxAge: ENV.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        path: '/',
      });

      const csrfToken = issueCsrfToken(req, res);

      sendSuccess(res, { user: result.user, csrfToken }, 'Session refreshed');
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    const csrfToken = issueCsrfToken(req, res);
    sendSuccess(res, { user: req.user, csrfToken });
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.refreshToken;
      await authService.logout(refreshToken, req.user?.userId);

      res.clearCookie('accessToken', { path: '/' });
      res.clearCookie('refreshToken', { path: '/' });
      res.clearCookie('csrfToken', { path: '/' });

      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) {
      next(err);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.requestPasswordReset(req.body.email, req.ip);
      sendSuccess(res, result, result.message);
    } catch (err) {
      next(err);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.confirmPasswordReset(req.body.token, req.body.newPassword, req.ip);
      sendSuccess(res, null, result.message);
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
