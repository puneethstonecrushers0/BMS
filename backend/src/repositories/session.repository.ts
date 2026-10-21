import { prisma } from '../database/prisma.js';
import { RefreshSession } from '@prisma/client';

export class SessionRepository {
  async createSession(data: {
    userId: string;
    tokenHash: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }): Promise<RefreshSession> {
    return prisma.refreshSession.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findByTokenHash(tokenHash: string): Promise<(RefreshSession & { user: { id: string; email: string; role: string; status: string; name: string } }) | null> {
    return prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
            name: true,
          },
        },
      },
    });
  }

  async revokeSession(id: string): Promise<RefreshSession> {
    return prisma.refreshSession.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserSessions(userId: string): Promise<{ count: number }> {
    return prisma.refreshSession.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async deleteExpiredSessions(): Promise<{ count: number }> {
    return prisma.refreshSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, updatedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        ],
      },
    });
  }
}

export const sessionRepository = new SessionRepository();
