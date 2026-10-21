import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validateBody } from '../middleware/validate.middleware.js';
import {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
} from '../schemas/auth.schema.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/register', authRateLimiter, validateBody(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

router.post('/login', authRateLimiter, validateBody(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);

router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

router.post('/logout', (req, res, next) => authController.logout(req, res, next));

router.get('/me', authenticate, (req, res) => authController.me(req, res));

router.post('/forgot-password', authRateLimiter, validateBody(passwordResetRequestSchema), (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

router.post('/reset-password', authRateLimiter, validateBody(passwordResetConfirmSchema), (req, res, next) =>
  authController.resetPassword(req, res, next)
);

export default router;
