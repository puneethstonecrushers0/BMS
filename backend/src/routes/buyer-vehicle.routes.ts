import { Router } from 'express';
import { buyerVehicleController } from '../controllers/buyer-vehicle.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { verifyCsrf } from '../middleware/csrf.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  createBuyerSchema,
  updateBuyerSchema,
  createVehicleSchema,
  updateVehicleSchema,
} from '../schemas/buyer-vehicle.schema.js';
import { Role } from '@prisma/client';

const router = Router();

// Buyers: all authenticated users can list for auto-complete; modifications require sales or admin
router.get('/buyers', authenticate, (req, res, next) => buyerVehicleController.listBuyers(req, res, next));

router.post(
  '/buyers',
  authenticate,
  authorizeRoles(Role.SALES_OPERATOR, Role.ADMIN),
  verifyCsrf,
  validateBody(createBuyerSchema),
  (req, res, next) => buyerVehicleController.createBuyer(req, res, next)
);

router.put(
  '/buyers/:id',
  authenticate,
  authorizeRoles(Role.SALES_OPERATOR, Role.ADMIN),
  verifyCsrf,
  validateBody(updateBuyerSchema),
  (req, res, next) => buyerVehicleController.updateBuyer(req, res, next)
);

// Vehicles: all authenticated users can list; modifications allowed for operators and admins
router.get('/vehicles', authenticate, (req, res, next) => buyerVehicleController.listVehicles(req, res, next));

router.post(
  '/vehicles',
  authenticate,
  authorizeRoles(Role.SALES_OPERATOR, Role.BOULDER_OPERATOR, Role.ADMIN),
  verifyCsrf,
  validateBody(createVehicleSchema),
  (req, res, next) => buyerVehicleController.createVehicle(req, res, next)
);

router.put(
  '/vehicles/:id',
  authenticate,
  authorizeRoles(Role.SALES_OPERATOR, Role.BOULDER_OPERATOR, Role.ADMIN),
  verifyCsrf,
  validateBody(updateVehicleSchema),
  (req, res, next) => buyerVehicleController.updateVehicle(req, res, next)
);

export default router;
