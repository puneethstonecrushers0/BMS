import { Request, Response, NextFunction } from 'express';
import { saleService } from '../services/sale.service.js';
import { sendSuccess } from '../utils/response.js';
import { SaleQueryInput } from '../schemas/sale.schema.js';

export class SaleController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const sale = await saleService.createSale(req.body, actor, req.ip);
      sendSuccess(res, sale, 'Sale record created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const sale = await saleService.updateSale(id, req.body, actor, req.ip);
      sendSuccess(res, sale, 'Sale record updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const sale = await saleService.cancelSale(id, req.body.cancellationReason, actor, req.ip);
      sendSuccess(res, sale, 'Sale record cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const query = req.query as unknown as SaleQueryInput;
      const result = await saleService.getSales(query, actor);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const sale = await saleService.getSaleById(id, actor);
      sendSuccess(res, sale);
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const query = req.query as unknown as SaleQueryInput;
      const csv = await saleService.exportSalesCsv(query, actor, req.ip);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales_export_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }
}

export const saleController = new SaleController();
