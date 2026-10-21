import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { sendError } from '../utils/response.js';

export function authorizeRoles(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    // ADMIN has universal operational access
    if (req.user.role === Role.ADMIN) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      sendError(res, 'Forbidden: Insufficient privileges for this operation', 403);
      return;
    }

    next();
  };
}
