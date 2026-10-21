import { Router } from 'express';
import { boulderController } from '../controllers/boulder.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { verifyCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createBoulderTripSchema,
  updateBoulderTripSchema,
  cancelBoulderTripSchema,
  boulderQuerySchema,
} from '../schemas/boulder.schema.js';
import { Role } from '@prisma/client';

const router = Router();

// Operational roles: BOULDER_OPERATOR, ADMIN
const boulderRoles = [Role.BOULDER_OPERATOR, Role.ADMIN];

router.get(
  '/',
  authenticate,
  authorizeRoles(...boulderRoles),
  validateQuery(boulderQuerySchema),
  (req, res, next) => boulderController.list(req, res, next)
);

router.get(
  '/export/csv',
  authenticate,
  authorizeRoles(...boulderRoles),
  validateQuery(boulderQuerySchema),
  (req, res, next) => boulderController.exportCsv(req, res, next)
);

router.get(
  '/suppliers',
  authenticate,
  authorizeRoles(...boulderRoles),
  (req, res, next) => boulderController.getSuppliers(req, res, next)
);

router.get(
  '/drivers',
  authenticate,
  authorizeRoles(...boulderRoles),
  (req, res, next) => boulderController.getDrivers(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(...boulderRoles),
  (req, res, next) => boulderController.getById(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorizeRoles(...boulderRoles),
  verifyCsrf,
  validateBody(createBoulderTripSchema),
  (req, res, next) => boulderController.create(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(...boulderRoles),
  verifyCsrf,
  validateBody(updateBoulderTripSchema),
  (req, res, next) => boulderController.update(req, res, next)
);

router.post(
  '/:id/cancel',
  authenticate,
  authorizeRoles(...boulderRoles),
  verifyCsrf,
  validateBody(cancelBoulderTripSchema),
  (req, res, next) => boulderController.cancel(req, res, next)
);

export default router;
