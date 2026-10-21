import { Request, Response, NextFunction } from 'express';
import { AppError, sendError } from '../utils/response.js';
import { ENV } from '../config/env.js';

// Central error handler
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  // 1. Handled operational errors (AppError)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`[Server Error] ${err.message}`);
    }
    sendError(res, err.message, err.statusCode, err.details);
    return;
  }

  // 2. Prisma specific known errors safely handled
  if (err.name === 'PrismaClientKnownRequestError') {
    sendError(res, 'Database operation failed', 400);
    return;
  }

  // 3. True unhandled exceptions
  if (ENV.NODE_ENV === 'development') {
    console.error('[Unhandled Exception]:', err);
  } else {
    console.error(`[Unhandled Exception] ${err.name}: ${err.message}`);
  }

  // Safe response suppressing internal details
  sendError(
    res,
    ENV.NODE_ENV === 'production' ? 'An unexpected server error occurred' : err.message,
    500
  );
}
