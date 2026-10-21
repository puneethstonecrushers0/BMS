import { prisma } from '../database/prisma.js';
import { BoulderTrip, Prisma } from '@prisma/client';
import { BoulderQueryInput } from '../schemas/boulder.schema.js';
import { getDateRangeInUtc } from '../utils/timezone.js';
import { cache } from '../database/redis.js';

export class BoulderRepository {
  async create(data: Prisma.BoulderTripCreateInput): Promise<BoulderTrip> {
    const trip = await prisma.boulderTrip.create({
      data,
      include: {
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    cache.invalidatePattern('boulders:list:*').catch(() => {});
    return trip;
  }

  async findById(id: string): Promise<BoulderTrip | null> {
    return prisma.boulderTrip.findUnique({
      where: { id },
      include: {
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, data: Prisma.BoulderTripUpdateInput): Promise<BoulderTrip> {
    const trip = await prisma.boulderTrip.update({
      where: { id },
      data,
      include: {
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
    cache.invalidatePattern('boulders:list:*').catch(() => {});
    return trip;
  }

  async cancel(id: string, cancellationReason: string, updatedById: string): Promise<BoulderTrip> {
    const trip = await prisma.boulderTrip.update({
      where: { id },
      data: {
        isCancelled: true,
        cancellationReason,
        updatedById,
      },
    });
    cache.invalidatePattern('boulders:list:*').catch(() => {});
    return trip;
  }

  private buildWhereClause(query: BoulderQueryInput): Prisma.BoulderTripWhereInput {
    const where: Prisma.BoulderTripWhereInput = {};
    const { start, end } = getDateRangeInUtc(query.startDate, query.endDate);

    if (start || end) {
      where.tripDate = {};
      if (start) where.tripDate.gte = start;
      if (end) where.tripDate.lte = end;
    }

    if (query.supplierOrOperator || query.supplierName) {
      const name = (query.supplierName || query.supplierOrOperator)?.trim();
      if (name) {
        where.supplierOrOperator = { contains: name, mode: 'insensitive' };
      }
    }

    if (query.vehicleNumber) {
      const vNum = query.vehicleNumber.trim().replace(/\s+/g, '');
      if (vNum) {
        where.vehicleNumber = { contains: vNum, mode: 'insensitive' };
      }
    }

    if (query.driverName) {
      const dName = query.driverName.trim();
      if (dName) {
        where.driverName = { contains: dName, mode: 'insensitive' };
      }
    }

    if (query.operatorId) {
      where.createdById = query.operatorId;
    }

    if (query.isCancelled !== undefined) {
      where.isCancelled = query.isCancelled;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { supplierOrOperator: { contains: s, mode: 'insensitive' } },
        { vehicleNumber: { contains: s, mode: 'insensitive' } },
        { driverName: { contains: s, mode: 'insensitive' } },
        { remarks: { contains: s, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: BoulderQueryInput): Promise<{ trips: BoulderTrip[]; totalCount: number }> {
    const cacheKey = `boulders:list:${JSON.stringify(query)}`;
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where = this.buildWhereClause(query);
        const skip = (query.page - 1) * query.limit;

        const [trips, totalCount] = await Promise.all([
          prisma.boulderTrip.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { [query.sortBy]: query.sortOrder },
            include: {
              vehicle: true,
              createdBy: { select: { id: true, name: true, email: true } },
            },
          }),
          prisma.boulderTrip.count({ where }),
        ]);

        return { trips, totalCount };
      },
      30
    );
  }

  async findForExport(query: BoulderQueryInput): Promise<BoulderTrip[]> {
    const where = this.buildWhereClause(query);
    return prisma.boulderTrip.findMany({
      where,
      orderBy: { tripDate: 'desc' },
      include: {
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getDistinctSuppliers(): Promise<string[]> {
    const trips = await prisma.boulderTrip.findMany({
      where: { isCancelled: false },
      select: { supplierOrOperator: true },
      distinct: ['supplierOrOperator'],
      orderBy: { supplierOrOperator: 'asc' },
    });
    return trips.map((t) => t.supplierOrOperator).filter(Boolean);
  }

  async getDistinctDrivers(): Promise<string[]> {
    const [boulderDrivers, vehicleDrivers] = await Promise.all([
      prisma.boulderTrip.findMany({
        where: { isCancelled: false, driverName: { not: null } },
        select: { driverName: true },
        distinct: ['driverName'],
      }),
      prisma.vehicle.findMany({
        where: { driverName: { not: null } },
        select: { driverName: true },
        distinct: ['driverName'],
      }),
    ]);
    const set = new Set<string>();
    boulderDrivers.forEach((d) => d.driverName?.trim() && set.add(d.driverName.trim()));
    vehicleDrivers.forEach((d) => d.driverName?.trim() && set.add(d.driverName.trim()));
    return Array.from(set).sort();
  }

  async getAggregates(startDate?: string, endDate?: string): Promise<{
    totalNetWeight: Prisma.Decimal;
    count: number;
    bySupplier: { supplierOrOperator: string; _sum: { netWeight: Prisma.Decimal | null }; _count: number }[];
  }> {
    const { start, end } = getDateRangeInUtc(startDate, endDate);
    const where: Prisma.BoulderTripWhereInput = {
      isCancelled: false,
      ...(start || end
        ? {
            tripDate: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    };

    const [totalAgg, bySupplier] = await Promise.all([
      prisma.boulderTrip.aggregate({
        where,
        _sum: { netWeight: true },
        _count: true,
      }),
      prisma.boulderTrip.groupBy({
        by: ['supplierOrOperator'],
        where,
        _sum: { netWeight: true },
        _count: true,
      }),
    ]);

    return {
      totalNetWeight: totalAgg._sum.netWeight || new Prisma.Decimal(0),
      count: totalAgg._count,
      bySupplier,
    };
  }
}

export const boulderRepository = new BoulderRepository();
