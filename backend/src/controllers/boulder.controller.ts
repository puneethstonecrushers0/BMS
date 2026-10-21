import { Request, Response, NextFunction } from 'express';
import { boulderService } from '../services/boulder.service.js';
import { sendSuccess } from '../utils/response.js';
import { BoulderQueryInput } from '../schemas/boulder.schema.js';

export class BoulderController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const trip = await boulderService.createTrip(req.body, actor, req.ip);
      sendSuccess(res, trip, 'Boulder trip created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const trip = await boulderService.updateTrip(id, req.body, actor, req.ip);
      sendSuccess(res, trip, 'Boulder trip updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const trip = await boulderService.cancelTrip(id, req.body.cancellationReason, actor, req.ip);
      sendSuccess(res, trip, 'Boulder trip cancelled successfully');
    } catch (err) {
      next(err);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const query = req.query as unknown as BoulderQueryInput;
      const result = await boulderService.getTrips(query, actor);
      sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const trip = await boulderService.getTripById(id, actor);
      sendSuccess(res, trip);
    } catch (err) {
      next(err);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const query = req.query as unknown as BoulderQueryInput;
      const csv = await boulderService.exportTripsCsv(query, actor, req.ip);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="boulder_trips_export_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  }

  async getSuppliers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const suppliers = await boulderService.getDistinctSuppliers();
      sendSuccess(res, suppliers);
    } catch (err) {
      next(err);
    }
  }

  async getDrivers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const drivers = await boulderService.getDistinctDrivers();
      sendSuccess(res, drivers);
    } catch (err) {
      next(err);
    }
  }
}

export const boulderController = new BoulderController();
