import { Request, Response, NextFunction } from 'express';
import { auditRepository } from '../repositories/audit.repository.js';
import { sendSuccess } from '../utils/response.js';

export class AuditController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const action = req.query.action as string | undefined;
      const entityType = req.query.entityType as string | undefined;
      const actorEmail = req.query.actorEmail as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await auditRepository.findMany({
        page,
        limit,
        action,
        entityType,
        actorEmail,
        search,
      });

      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

export const auditController = new AuditController();
