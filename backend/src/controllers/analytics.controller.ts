import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service.js';
import { sendSuccess } from '../utils/response.js';

export class AnalyticsController {
  async overview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await analyticsService.getOverviewMetrics(startDate, endDate);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }

  async detailed(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const data = await analyticsService.getDetailedAnalytics(startDate, endDate);
      sendSuccess(res, data);
    } catch (err) {
      next(err);
    }
  }
}

export const analyticsController = new AnalyticsController();
