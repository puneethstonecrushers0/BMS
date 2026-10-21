import { prisma } from '../database/prisma.js';
import { Sale, Prisma, PaymentCategory } from '@prisma/client';
import { SaleQueryInput } from '../schemas/sale.schema.js';
import { getDateRangeInUtc } from '../utils/timezone.js';
import { cache } from '../database/redis.js';

export class SaleRepository {
  async create(data: Prisma.SaleCreateInput): Promise<Sale> {
    const sale = await prisma.sale.create({
      data,
      include: {
        buyer: true,
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    cache.invalidatePattern('sales:list:*').catch(() => {});
    return sale;
  }

  async findById(id: string): Promise<Sale | null> {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        buyer: true,
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, data: Prisma.SaleUpdateInput): Promise<Sale> {
    const sale = await prisma.sale.update({
      where: { id },
      data,
      include: {
        buyer: true,
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
      },
    });
    cache.invalidatePattern('sales:list:*').catch(() => {});
    return sale;
  }

  async cancel(id: string, cancellationReason: string, updatedById: string): Promise<Sale> {
    const sale = await prisma.sale.update({
      where: { id },
      data: {
        isCancelled: true,
        cancellationReason,
        updatedById,
      },
    });
    cache.invalidatePattern('sales:list:*').catch(() => {});
    return sale;
  }

  private buildWhereClause(query: SaleQueryInput): Prisma.SaleWhereInput {
    const where: Prisma.SaleWhereInput = {};
    const { start, end } = getDateRangeInUtc(query.startDate, query.endDate);

    if (query.startDateTime || query.endDateTime) {
      where.transactionDate = {};
      if (query.startDateTime) where.transactionDate.gte = new Date(query.startDateTime);
      if (query.endDateTime) where.transactionDate.lte = new Date(query.endDateTime);
    } else if (start || end) {
      where.transactionDate = {};
      if (start) where.transactionDate.gte = start;
      if (end) where.transactionDate.lte = end;
    }

    if (query.serialNumber) {
      where.serialNumber = { contains: query.serialNumber, mode: 'insensitive' };
    }

    if (query.buyerName || query.supplierName) {
      const name = query.buyerName || query.supplierName;
      where.buyerName = { contains: name, mode: 'insensitive' };
    }

    if (query.vehicleNumber) {
      where.vehicleNumber = { contains: query.vehicleNumber, mode: 'insensitive' };
    }

    if (query.vehicleType) {
      where.vehicleType = { contains: query.vehicleType, mode: 'insensitive' };
    }

    if (query.driverName) {
      where.vehicle = { driverName: { contains: query.driverName, mode: 'insensitive' } };
    }

    if (query.operatorId) {
      where.createdById = query.operatorId;
    }

    if (query.material) {
      where.material = { contains: query.material, mode: 'insensitive' };
    }

    if (query.creditDebit) {
      where.creditDebit = query.creditDebit;
    }

    if (query.paymentCategory) {
      where.paymentCategory = query.paymentCategory as PaymentCategory;
    }

    if (query.isCancelled !== undefined) {
      where.isCancelled = query.isCancelled;
    }

    if (query.search) {
      const s = query.search.trim();
      where.OR = [
        { serialNumber: { contains: s, mode: 'insensitive' } },
        { buyerName: { contains: s, mode: 'insensitive' } },
        { vehicleNumber: { contains: s, mode: 'insensitive' } },
        { vehicleType: { contains: s, mode: 'insensitive' } },
        { material: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { creditDebit: { contains: s, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findMany(query: SaleQueryInput): Promise<{ sales: Sale[]; totalCount: number }> {
    const cacheKey = `sales:list:${JSON.stringify(query)}`;
    return cache.getOrSet(
      cacheKey,
      async () => {
        const where = this.buildWhereClause(query);
        const skip = (query.page - 1) * query.limit;

        const [sales, totalCount] = await Promise.all([
          prisma.sale.findMany({
            where,
            skip,
            take: query.limit,
            orderBy: { [query.sortBy]: query.sortOrder },
            include: {
              buyer: true,
              vehicle: true,
              createdBy: { select: { id: true, name: true, email: true } },
            },
          }),
          prisma.sale.count({ where }),
        ]);

        return { sales, totalCount };
      },
      30
    );
  }

  async findForExport(query: SaleQueryInput): Promise<Sale[]> {
    const where = this.buildWhereClause(query);
    return prisma.sale.findMany({
      where,
      orderBy: { transactionDate: 'desc' },
      include: {
        buyer: true,
        vehicle: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async getAggregates(startDate?: string, endDate?: string): Promise<{
    totalAmount: Prisma.Decimal;
    totalNetWeight: Prisma.Decimal;
    count: number;
    byPaymentCategory: { paymentCategory: PaymentCategory; _sum: { amount: Prisma.Decimal | null; netWeight: Prisma.Decimal | null }; _count: number }[];
  }> {
    const { start, end } = getDateRangeInUtc(startDate, endDate);
    const where: Prisma.SaleWhereInput = {
      isCancelled: false,
      ...(start || end
        ? {
            transactionDate: {
              ...(start ? { gte: start } : {}),
              ...(end ? { lte: end } : {}),
            },
          }
        : {}),
    };

    const [totalAgg, byCategory] = await Promise.all([
      prisma.sale.aggregate({
        where,
        _sum: {
          amount: true,
          netWeight: true,
        },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ['paymentCategory'],
        where,
        _sum: {
          amount: true,
          netWeight: true,
        },
        _count: true,
      }),
    ]);

    return {
      totalAmount: totalAgg._sum.amount || new Prisma.Decimal(0),
      totalNetWeight: totalAgg._sum.netWeight || new Prisma.Decimal(0),
      count: totalAgg._count,
      byPaymentCategory: byCategory,
    };
  }
}

export const saleRepository = new SaleRepository();
