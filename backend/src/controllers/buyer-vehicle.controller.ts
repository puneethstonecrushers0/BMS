import { Request, Response, NextFunction } from 'express';
import { buyerVehicleRepository } from '../repositories/buyer-vehicle.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { sendSuccess } from '../utils/response.js';

export class BuyerVehicleController {
  // Buyers
  async listBuyers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const buyers = await buyerVehicleRepository.findAllBuyers(activeOnly);
      sendSuccess(res, buyers);
    } catch (err) {
      next(err);
    }
  }

  async createBuyer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const buyer = await buyerVehicleRepository.createBuyer(req.body);
      await auditRepository.log({
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'BUYER_CREATED',
        entityType: 'BUYER',
        entityId: buyer.id,
        metadata: { name: buyer.name },
        ipAddress: req.ip,
      });
      sendSuccess(res, buyer, 'Buyer created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateBuyer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const buyer = await buyerVehicleRepository.updateBuyer(id, req.body);
      await auditRepository.log({
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'BUYER_UPDATED',
        entityType: 'BUYER',
        entityId: buyer.id,
        metadata: { name: buyer.name },
        ipAddress: req.ip,
      });
      sendSuccess(res, buyer, 'Buyer updated successfully');
    } catch (err) {
      next(err);
    }
  }

  // Vehicles
  async listVehicles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activeOnly = req.query.activeOnly === 'true';
      const vehicles = await buyerVehicleRepository.findAllVehicles(activeOnly);
      sendSuccess(res, vehicles);
    } catch (err) {
      next(err);
    }
  }

  async createVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const vehicle = await buyerVehicleRepository.createVehicle(req.body);
      await auditRepository.log({
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'VEHICLE_CREATED',
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        metadata: { vehicleNumber: vehicle.vehicleNumber },
        ipAddress: req.ip,
      });
      sendSuccess(res, vehicle, 'Vehicle registered successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async updateVehicle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const vehicle = await buyerVehicleRepository.updateVehicle(id, req.body);
      await auditRepository.log({
        actorId: req.user!.userId,
        actorEmail: req.user!.email,
        actorRole: req.user!.role,
        action: 'VEHICLE_UPDATED',
        entityType: 'VEHICLE',
        entityId: vehicle.id,
        metadata: { vehicleNumber: vehicle.vehicleNumber },
        ipAddress: req.ip,
      });
      sendSuccess(res, vehicle, 'Vehicle updated successfully');
    } catch (err) {
      next(err);
    }
  }
}

export const buyerVehicleController = new BuyerVehicleController();
