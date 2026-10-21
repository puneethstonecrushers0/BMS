import { Router } from 'express';
import { saleController } from '../controllers/sale.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { verifyCsrf } from '../middleware/csrf.middleware.js';
import { validateBody, validateQuery } from '../middleware/validate.middleware.js';
import {
  createSaleSchema,
  updateSaleSchema,
  cancelSaleSchema,
  saleQuerySchema,
} from '../schemas/sale.schema.js';
import { Role } from '@prisma/client';

const router = Router();

// Operational roles: SALES_OPERATOR, ADMIN
const salesRoles = [Role.SALES_OPERATOR, Role.ADMIN];

router.get(
  '/',
  authenticate,
  authorizeRoles(...salesRoles),
  validateQuery(saleQuerySchema),
  (req, res, next) => saleController.list(req, res, next)
);

router.get(
  '/export/csv',
  authenticate,
  authorizeRoles(...salesRoles),
  validateQuery(saleQuerySchema),
  (req, res, next) => saleController.exportCsv(req, res, next)
);

router.get(
  '/:id',
  authenticate,
  authorizeRoles(...salesRoles),
  (req, res, next) => saleController.getById(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorizeRoles(...salesRoles),
  verifyCsrf,
  validateBody(createSaleSchema),
  (req, res, next) => saleController.create(req, res, next)
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles(...salesRoles),
  verifyCsrf,
  validateBody(updateSaleSchema),
  (req, res, next) => saleController.update(req, res, next)
);

router.post(
  '/:id/cancel',
  authenticate,
  authorizeRoles(...salesRoles),
  verifyCsrf,
  validateBody(cancelSaleSchema),
  (req, res, next) => saleController.cancel(req, res, next)
);

export default router;
