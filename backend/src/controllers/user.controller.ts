import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service.js';
import { sendSuccess } from '../utils/response.js';

export class UserController {
  async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await userService.getAllUsers();
      sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }

  async createWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const worker = await userService.createWorker(req.body, actor, req.ip);
      sendSuccess(res, worker, 'Worker account created successfully', 201);
    } catch (err) {
      next(err);
    }
  }

  async approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const updated = await userService.approveUser(id, req.body.role, actor, req.ip);
      sendSuccess(res, updated, 'User approved and activated successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const updated = await userService.updateRole(id, req.body.role, actor, req.ip);
      sendSuccess(res, updated, 'User role updated successfully');
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const actor = { id: req.user!.userId, email: req.user!.email, role: req.user!.role };
      const updated = await userService.updateStatus(id, req.body.status, actor, req.ip);
      sendSuccess(res, updated, `User status updated to ${req.body.status}`);
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
