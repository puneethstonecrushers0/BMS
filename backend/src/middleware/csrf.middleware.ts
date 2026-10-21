import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { sendError } from '../utils/response.js';

export function issueCsrfToken(req: Request, res: Response): string {
  let token = req.cookies?.csrfToken;
  if (!token) {
    token = crypto.randomBytes(24).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false, // Accessible by frontend JS to read and send back in header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
  }
  return token;
}

export function verifyCsrf(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP methods do not change state
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt public auth endpoints where cookie is not yet established
  const exemptPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'];
  if (exemptPaths.some((p) => req.path.startsWith(p))) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'] || req.headers['x-requested-with'];

  // If request contains authorization header (Bearer token API consumer), exempt
  if (req.headers.authorization?.startsWith('Bearer ')) {
    return next();
  }

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    sendError(res, 'CSRF verification failed: Missing or invalid CSRF token header', 403);
    return;
  }

  next();
}
