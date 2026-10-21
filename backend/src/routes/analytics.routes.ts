import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get(
  '/overview',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => analyticsController.overview(req, res, next)
);

router.get(
  '/detailed',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => analyticsController.detailed(req, res, next)
);

export default router;
