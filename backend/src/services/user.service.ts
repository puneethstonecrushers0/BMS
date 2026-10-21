import { userRepository } from '../repositories/user.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { hashPassword } from '../utils/password.js';
import { AppError } from '../utils/response.js';
import { Role, UserStatus } from '@prisma/client';
import { CreateWorkerInput } from '../schemas/user.schema.js';
import { cache } from '../database/redis.js';

export class UserService {
  async getAllUsers() {
    return cache.getOrSet('users:all', () => userRepository.findAll(), 120);
  }

  async createWorker(
    input: CreateWorkerInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);

    // When created directly by Admin, account is immediately ACTIVE with the selected role
    const user = await userRepository.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      status: UserStatus.ACTIVE,
    });

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'WORKER_CREATED_BY_ADMIN',
      entityType: 'USER',
      entityId: user.id,
      metadata: {
        workerName: user.name,
        workerEmail: user.email,
        assignedRole: user.role,
      },
      ipAddress,
    });

    // Invalidate cached user list
    cache.invalidatePattern('users:*').catch(() => {});

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  async approveUser(
    userId: string,
    role: Role,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new AppError('User is already approved and active', 400);
    }

    await userRepository.updateRole(userId, role);
    const updated = await userRepository.updateStatus(userId, UserStatus.ACTIVE);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'USER_APPROVED',
      entityType: 'USER',
      entityId: userId,
      metadata: { assignedRole: role, userEmail: user.email },
      ipAddress,
    });

    cache.invalidatePattern('users:*').catch(() => {});

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }

  async updateRole(
    userId: string,
    newRole: Role,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Safety constraint: Prevent the last active administrator from being demoted!
    if (user.role === Role.ADMIN && newRole !== Role.ADMIN) {
      const activeAdminCount = await userRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot demote the only active Administrator in the system', 400);
      }
    }

    const updated = await userRepository.updateRole(userId, newRole);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'USER_ROLE_CHANGED',
      entityType: 'USER',
      entityId: userId,
      metadata: { oldRole: user.role, newRole, userEmail: user.email },
      ipAddress,
    });

    cache.invalidatePattern('users:*').catch(() => {});

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }

  async updateStatus(
    userId: string,
    newStatus: UserStatus,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Safety constraint: Prevent the last active administrator from being disabled!
    if (user.role === Role.ADMIN && newStatus === UserStatus.DISABLED) {
      const activeAdminCount = await userRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new AppError('Cannot disable the only active Administrator in the system', 400);
      }
    }

    const updated = await userRepository.updateStatus(userId, newStatus);

    // If disabled, revoke all active sessions immediately!
    if (newStatus === UserStatus.DISABLED) {
      await sessionRepository.revokeAllUserSessions(userId);
    }

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: `USER_STATUS_${newStatus}`,
      entityType: 'USER',
      entityId: userId,
      metadata: { oldStatus: user.status, newStatus, userEmail: user.email },
      ipAddress,
    });

    cache.invalidatePattern('users:*').catch(() => {});

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      status: updated.status,
    };
  }
}

export const userService = new UserService();
