import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt.js';
import { userRepository } from '../repositories/user.repository.js';
import { sendError } from '../utils/response.js';
import { UserStatus } from '@prisma/client';

export interface AuthenticatedUser extends TokenPayload {
  name: string;
  status: UserStatus;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token = req.cookies?.accessToken;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const payload = verifyAccessToken(token);
    if (!payload) {
      sendError(res, 'Invalid or expired access token', 401);
      return;
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) {
      sendError(res, 'User no longer exists', 401);
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      sendError(res, 'Account is not active', 403);
      return;
    }

    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
    };

    next();
  } catch (err) {
    sendError(res, 'Authentication failure', 401);
  }
}
