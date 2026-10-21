import { prisma } from '../database/prisma.js';
import { getDateRangeInUtc, getIstDateString } from '../utils/timezone.js';
import { Prisma } from '@prisma/client';
import { cache } from '../database/redis.js';

export class AnalyticsService {
  /**
   * Invalidate cached analytics and reports when transactions are created/modified/cancelled
   */
  async invalidateCache() {
    await Promise.all([
      cache.invalidatePattern('analytics:*'),
      cache.invalidatePattern('report:*'),
    ]);
  }

  /**
   * Overview metrics for Admin Dashboard
   */
  async getOverviewMetrics(startDateStr?: string, endDateStr?: string) {
    const cacheKey = `analytics:overview:${startDateStr || 'all'}:${endDateStr || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { start, end } = getDateRangeInUtc(startDateStr, endDateStr);

    const saleWhere: Prisma.SaleWhereInput = {
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

    const boulderWhere: Prisma.BoulderTripWhereInput = {
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

    const [
      saleAgg,
      salesByCategory,
      boulderAgg,
      recentSales,
      recentTrips,
    ] = await Promise.all([
      prisma.sale.aggregate({
        where: saleWhere,
        _sum: { amount: true, netWeight: true },
        _count: true,
      }),
      prisma.sale.groupBy({
        by: ['paymentCategory'],
        where: saleWhere,
        _sum: { amount: true, netWeight: true },
        _count: true,
      }),
      prisma.boulderTrip.aggregate({
        where: boulderWhere,
        _sum: { netWeight: true },
        _count: true,
      }),
      prisma.sale.findMany({
        where: saleWhere,
        take: 5,
        orderBy: { transactionDate: 'desc' },
      }),
      prisma.boulderTrip.findMany({
        where: boulderWhere,
        take: 5,
        orderBy: { tripDate: 'desc' },
      }),
    ]);

    const paymentBreakdown: Record<string, { count: number; amount: string; netWeight: string }> = {
      CASH: { count: 0, amount: '0', netWeight: '0' },
      ONLINE: { count: 0, amount: '0', netWeight: '0' },
      ACCOUNT: { count: 0, amount: '0', netWeight: '0' },
      CHEQUE: { count: 0, amount: '0', netWeight: '0' },
    };

    for (const item of salesByCategory) {
      paymentBreakdown[item.paymentCategory] = {
        count: item._count,
        amount: item._sum.amount ? item._sum.amount.toString() : '0',
        netWeight: item._sum.netWeight ? item._sum.netWeight.toString() : '0',
      };
    }

    const result = {
      period: {
        startDate: startDateStr || null,
        endDate: endDateStr || null,
      },
      sales: {
        count: saleAgg._count,
        totalAmount: saleAgg._sum.amount ? saleAgg._sum.amount.toString() : '0',
        totalNetWeight: saleAgg._sum.netWeight ? saleAgg._sum.netWeight.toString() : '0',
        paymentBreakdown,
      },
      boulders: {
        count: boulderAgg._count,
        totalNetWeight: boulderAgg._sum.netWeight ? boulderAgg._sum.netWeight.toString() : '0',
      },
      recentSales,
      recentTrips,
    };

    // Cache in Redis for 60 seconds
    await cache.set(cacheKey, result, 60);

    return result;
  }

  /**
   * Detailed analytics charts and trends
   */
  async getDetailedAnalytics(startDateStr?: string, endDateStr?: string) {
    const cacheKey = `analytics:detailed:${startDateStr || 'all'}:${endDateStr || 'all'}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const { start, end } = getDateRangeInUtc(startDateStr, endDateStr);

    const saleWhere: Prisma.SaleWhereInput = {
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

    const boulderWhere: Prisma.BoulderTripWhereInput = {
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

    const [allSales, allTrips] = await Promise.all([
      prisma.sale.findMany({
        where: saleWhere,
        select: {
          transactionDate: true,
          buyerName: true,
          amount: true,
          netWeight: true,
          paymentCategory: true,
          vehicleNumber: true,
        },
        orderBy: { transactionDate: 'asc' },
      }),
      prisma.boulderTrip.findMany({
        where: boulderWhere,
        select: {
          tripDate: true,
          supplierOrOperator: true,
          netWeight: true,
          vehicleNumber: true,
          driverName: true,
        },
        orderBy: { tripDate: 'asc' },
      }),
    ]);

    // 1. Daily trends (Sales amount, Sales tonnage, Boulder tonnage)
    const dailyMap = new Map<
      string,
      { date: string; salesAmount: number; salesTonnage: number; boulderTonnage: number; trips: number }
    >();

    for (const s of allSales) {
      const dateKey = getIstDateString(s.transactionDate);
      const entry = dailyMap.get(dateKey) || {
        date: dateKey,
        salesAmount: 0,
        salesTonnage: 0,
        boulderTonnage: 0,
        trips: 0,
      };
      entry.salesAmount += parseFloat(s.amount.toString());
      entry.salesTonnage += parseFloat(s.netWeight.toString());
      dailyMap.set(dateKey, entry);
    }

    for (const t of allTrips) {
      const dateKey = getIstDateString(t.tripDate);
      const entry = dailyMap.get(dateKey) || {
        date: dateKey,
        salesAmount: 0,
        salesTonnage: 0,
        boulderTonnage: 0,
        trips: 0,
      };
      entry.boulderTonnage += parseFloat(t.netWeight.toString());
      entry.trips += 1;
      dailyMap.set(dateKey, entry);
    }

    const dailyTrends = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Top buyers by amount and tonnage
    const buyerMap = new Map<string, { buyer: string; totalAmount: number; totalTonnage: number; count: number }>();
    for (const s of allSales) {
      const existing = buyerMap.get(s.buyerName) || {
        buyer: s.buyerName,
        totalAmount: 0,
        totalTonnage: 0,
        count: 0,
      };
      existing.totalAmount += parseFloat(s.amount.toString());
      existing.totalTonnage += parseFloat(s.netWeight.toString());
      existing.count += 1;
      buyerMap.set(s.buyerName, existing);
    }

    const topBuyersByAmount = Array.from(buyerMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);

    // 3. Trip counts and tonnage by vehicle
    const vehicleTripMap = new Map<string, { vehicleNumber: string; tripCount: number; netWeight: number }>();
    for (const t of allTrips) {
      const existing = vehicleTripMap.get(t.vehicleNumber) || {
        vehicleNumber: t.vehicleNumber,
        tripCount: 0,
        netWeight: 0,
      };
      existing.tripCount += 1;
      existing.netWeight += parseFloat(t.netWeight.toString());
      vehicleTripMap.set(t.vehicleNumber, existing);
    }

    const topVehicles = Array.from(vehicleTripMap.values())
      .sort((a, b) => b.tripCount - a.tripCount)
      .slice(0, 10);

    // 4. Payment distribution
    const paymentDistribution: Record<string, number> = {
      CASH: 0,
      ONLINE: 0,
      ACCOUNT: 0,
      CHEQUE: 0,
    };
    for (const s of allSales) {
      paymentDistribution[s.paymentCategory] =
        (paymentDistribution[s.paymentCategory] || 0) + parseFloat(s.amount.toString());
    }

    const result = {
      dailyTrends,
      topBuyersByAmount,
      topVehicles,
      paymentDistribution,
      totalSalesCount: allSales.length,
      totalBoulderTripsCount: allTrips.length,
    };

    // Cache in Redis for 60 seconds
    await cache.set(cacheKey, result, 60);

    return result;
  }
}

export const analyticsService = new AnalyticsService();
