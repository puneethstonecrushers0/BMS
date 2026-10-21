import { Router } from 'express';
import { auditController } from '../controllers/audit.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Audit logs strictly restricted to ADMIN
router.get(
  '/',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => auditController.list(req, res, next)
);

export default router;
