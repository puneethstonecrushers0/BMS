import { Router } from 'express';
import authRoutes from './auth.routes.js';
import saleRoutes from './sale.routes.js';
import boulderRoutes from './boulder.routes.js';
import reportRoutes from './report.routes.js';
import analyticsRoutes from './analytics.routes.js';
import buyerVehicleRoutes from './buyer-vehicle.routes.js';
import userRoutes from './user.routes.js';
import auditRoutes from './audit.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/sales', saleRoutes);
router.use('/boulders', boulderRoutes);
router.use('/reports', reportRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/references', buyerVehicleRoutes);
router.use('/users', userRoutes);
router.use('/audit-logs', auditRoutes);

export default router;
