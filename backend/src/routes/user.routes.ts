import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { verifyCsrf } from '../middleware/csrf.middleware.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  approveUserSchema,
  createWorkerSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../schemas/user.schema.js';
import { Role } from '@prisma/client';

const router = Router();

// User management endpoints strictly restricted to ADMIN
router.get(
  '/',
  authenticate,
  authorizeRoles(Role.ADMIN),
  (req, res, next) => userController.listUsers(req, res, next)
);

router.post(
  '/',
  authenticate,
  authorizeRoles(Role.ADMIN),
  verifyCsrf,
  validateBody(createWorkerSchema),
  (req, res, next) => userController.createWorker(req, res, next)
);

router.post(
  '/:id/approve',
  authenticate,
  authorizeRoles(Role.ADMIN),
  verifyCsrf,
  validateBody(approveUserSchema),
  (req, res, next) => userController.approveUser(req, res, next)
);

router.put(
  '/:id/role',
  authenticate,
  authorizeRoles(Role.ADMIN),
  verifyCsrf,
  validateBody(updateUserRoleSchema),
  (req, res, next) => userController.updateRole(req, res, next)
);

router.put(
  '/:id/status',
  authenticate,
  authorizeRoles(Role.ADMIN),
  verifyCsrf,
  validateBody(updateUserStatusSchema),
  (req, res, next) => userController.updateStatus(req, res, next)
);

export default router;
