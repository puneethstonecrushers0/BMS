import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { sendError } from '../utils/response.js';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(
          res,
          'Validation failed',
          400,
          error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
        );
        return;
      }
      next(error);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.query);
      // In Express 5, req.query has only a prototype getter.
      // Use Object.defineProperty to safely attach the validated/coerced query object.
      Object.defineProperty(req, 'query', {
        value: parsed,
        writable: true,
        enumerable: true,
        configurable: true,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        sendError(
          res,
          'Query validation failed',
          400,
          error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
        );
        return;
      }
      next(error);
    }
  };
}
