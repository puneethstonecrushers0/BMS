import { prisma } from '../database/prisma.js';
import { AuditLog, Prisma } from '@prisma/client';

export class AuditRepository {
  async log(data: {
    actorId?: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }): Promise<AuditLog> {
    // Strip sensitive fields from metadata if present
    const cleanMeta = data.metadata ? { ...data.metadata } : {};
    delete cleanMeta.password;
    delete cleanMeta.passwordHash;
    delete cleanMeta.token;
    delete cleanMeta.accessToken;
    delete cleanMeta.refreshToken;
    delete cleanMeta.tokenHash;

    return prisma.auditLog.create({
      data: {
        actorId: data.actorId,
        actorEmail: data.actorEmail,
        actorRole: data.actorRole,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: cleanMeta as Prisma.InputJsonValue,
        ipAddress: data.ipAddress,
      },
    });
  }

  async findMany(params: {
    page?: number;
    limit?: number;
    action?: string;
    entityType?: string;
    actorEmail?: string;
    search?: string;
  }): Promise<{ logs: AuditLog[]; totalCount: number }> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};

    if (params.action) {
      where.action = { contains: params.action, mode: 'insensitive' };
    }

    if (params.entityType) {
      where.entityType = { contains: params.entityType, mode: 'insensitive' };
    }

    if (params.actorEmail) {
      where.actorEmail = { contains: params.actorEmail, mode: 'insensitive' };
    }

    if (params.search) {
      const s = params.search.trim();
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entityType: { contains: s, mode: 'insensitive' } },
        { actorEmail: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, totalCount };
  }
}

export const auditRepository = new AuditRepository();
