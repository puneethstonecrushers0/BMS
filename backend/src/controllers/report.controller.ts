import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/report.service.js';
import { sendSuccess } from '../utils/response.js';

export class ReportController {
  async dailySales(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, buyerName, paymentCategory } = req.query as {
        startDate?: string;
        endDate?: string;
        buyerName?: string;
        paymentCategory?: any;
      };
      const report = await reportService.getDailySalesReport(startDate, endDate, buyerName, paymentCategory);
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  async dailyBoulder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const report = await reportService.getDailyBoulderReport(startDate, endDate);
      sendSuccess(res, report);
    } catch (err) {
      next(err);
    }
  }

  async dailyBusinessSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
      const summary = await reportService.getDailyBusinessSummary(startDate, endDate);
      sendSuccess(res, summary);
    } catch (err) {
      next(err);
    }
  }

  async exportDailySalesCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { startDate, endDate, buyerName, paymentCategory } = req.query as {
        startDate?: string;
        endDate?: string;
        buyerName?: string;
        paymentCategory?: any;
      };
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const csv = await reportService.exportDailySalesReportCsv(startDate, endDate, buyerName, paymentCategory, actor, req.ip);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="daily_sales_report_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();
