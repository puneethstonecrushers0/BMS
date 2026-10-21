import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { hashPassword, verifyPassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../utils/jwt.js';
import { AppError } from '../utils/response.js';
import { ENV } from '../config/env.js';
import { Role, UserStatus } from '@prisma/client';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { prisma } from '../database/prisma.js';
import crypto from 'crypto';

export class AuthService {
  async register(input: RegisterInput, ipAddress?: string) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);

    // If no users exist, make the very first user an ACTIVE ADMIN so the system can be bootstrapped.
    const totalUsers = await prisma.user.count();
    const isFirstUser = totalUsers === 0;

    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: isFirstUser ? Role.ADMIN : Role.SALES_OPERATOR,
      status: isFirstUser ? UserStatus.ACTIVE : UserStatus.PENDING,
    });

    await auditRepository.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'USER_REGISTERED',
      entityType: 'USER',
      entityId: user.id,
      metadata: { isFirstUserBootstrap: isFirstUser, status: user.status },
      ipAddress,
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      isPendingApproval: user.status === UserStatus.PENDING,
    };
  }

  async login(input: LoginInput, ipAddress?: string, userAgent?: string) {
    const user = await userRepository.findByEmail(input.email);
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValidPassword = await verifyPassword(user.passwordHash, input.password);
    if (!isValidPassword) {
      await auditRepository.log({
        actorEmail: input.email,
        actorRole: user.role,
        action: 'LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.id,
        metadata: { reason: 'Incorrect password' },
        ipAddress,
      });
      throw new AppError('Invalid email or password', 401);
    }

    if (user.status === UserStatus.PENDING) {
      throw new AppError('Your account is pending administrator approval', 403);
    }

    if (user.status === UserStatus.DISABLED) {
      throw new AppError('Your account has been disabled. Please contact an administrator', 403);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const rawRefreshToken = generateRefreshToken();
    const refreshTokenHash = hashToken(rawRefreshToken);

    const expiresAt = new Date(Date.now() + ENV.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await sessionRepository.createSession({
      userId: user.id,
      tokenHash: refreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    await auditRepository.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  async refresh(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    if (!rawRefreshToken) {
      throw new AppError('Refresh token required', 401);
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      throw new AppError('Invalid refresh session', 401);
    }

    // REPLAY ATTACK DETECTION:
    // If a revoked refresh token is presented, someone may have stolen it.
    // Invalidate ALL sessions for this user immediately!
    if (session.isRevoked) {
      await sessionRepository.revokeAllUserSessions(session.userId);
      await auditRepository.log({
        actorId: session.userId,
        actorEmail: session.user.email,
        actorRole: session.user.role,
        action: 'SECURITY_ALERT_REFRESH_REPLAY_DETECTED',
        entityType: 'SESSION',
        entityId: session.id,
        metadata: { warning: 'All sessions revoked due to reuse of revoked token' },
        ipAddress,
      });
      throw new AppError('Security violation detected. All sessions terminated. Please log in again', 401);
    }

    if (session.expiresAt < new Date()) {
      await sessionRepository.revokeSession(session.id);
      throw new AppError('Session expired. Please log in again', 401);
    }

    if (session.user.status !== UserStatus.ACTIVE) {
      await sessionRepository.revokeSession(session.id);
      throw new AppError('Account is not active', 403);
    }

    // ROTATION: Revoke current session and issue a new one
    await sessionRepository.revokeSession(session.id);

    const newAccessToken = generateAccessToken({
      userId: session.user.id,
      email: session.user.email,
      role: session.user.role,
    });

    const newRawRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashToken(newRawRefreshToken);

    const expiresAt = new Date(Date.now() + ENV.JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await sessionRepository.createSession({
      userId: session.user.id,
      tokenHash: newRefreshTokenHash,
      ipAddress,
      userAgent,
      expiresAt,
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRawRefreshToken,
      user: session.user,
    };
  }

  async logout(rawRefreshToken?: string, userId?: string) {
    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      const session = await sessionRepository.findByTokenHash(tokenHash);
      if (session) {
        await sessionRepository.revokeSession(session.id);
      }
    }
  }

  async requestPasswordReset(email: string, ipAddress?: string) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Do not disclose whether email exists
      return { message: 'If an account exists with that email, reset instructions have been generated' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(resetToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    await auditRepository.log({
      actorId: user.id,
      actorEmail: user.email,
      actorRole: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
    });

    return {
      message: 'If an account exists with that email, reset instructions have been generated',
      // In development mode, provide token for convenience testing
      resetToken: ENV.NODE_ENV === 'development' ? resetToken : undefined,
    };
  }

  async confirmPasswordReset(token: string, newPassword: string, ipAddress?: string) {
    const tokenHash = hashToken(token);
    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.usedAt || resetRecord.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      // Revoke all existing sessions for safety
      prisma.refreshSession.updateMany({
        where: { userId: resetRecord.userId, isRevoked: false },
        data: { isRevoked: true },
      }),
    ]);

    await auditRepository.log({
      actorId: resetRecord.userId,
      actorEmail: resetRecord.user.email,
      actorRole: resetRecord.user.role,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'USER',
      entityId: resetRecord.userId,
      ipAddress,
    });

    return { message: 'Password has been reset successfully. Please log in with your new password.' };
  }
}

export const authService = new AuthService();
