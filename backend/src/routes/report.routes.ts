import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// All report endpoints are strictly restricted to ADMIN
router.get(
  '/sales',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => reportController.dailySales(req, res, next)
);

router.get(
  '/export/sales-csv',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => reportController.exportDailySalesCsv(req, res, next)
);

router.get(
  '/boulders',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => reportController.dailyBoulder(req, res, next)
);

router.get(
  '/business-summary',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => reportController.dailyBusinessSummary(req, res, next)
);

export default router;
