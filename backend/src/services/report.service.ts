import { prisma } from '../database/prisma.js';
import { getDayDateRangeInUtc, getDateRangeInUtc, formatInIst } from '../utils/timezone.js';
import { generateCsv } from '../utils/sanitizeCsv.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { PaymentCategory, Prisma } from '@prisma/client';
import { cache } from '../database/redis.js';

export class ReportService {
  /**
   * Daily Sales Report:
   * Detailed line items and summary metrics for a given date or date range.
   */
  async getDailySalesReport(
    startDateStr?: string,
    endDateStr?: string,
    buyerName?: string,
    paymentCategory?: PaymentCategory
  ) {
    const cacheKey = `report:sales:${startDateStr || 'all'}:${endDateStr || 'all'}:${buyerName || 'all'}:${paymentCategory || 'all'}`;
    return cache.getOrSet(cacheKey, async () => {
      const { start, end } = getDateRangeInUtc(startDateStr, endDateStr);
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
        ...(buyerName ? { buyerName: { contains: buyerName.trim(), mode: 'insensitive' } } : {}),
        ...(paymentCategory ? { paymentCategory } : {}),
      };

      const sales = await prisma.sale.findMany({
        where,
        orderBy: { transactionDate: 'asc' },
        include: {
          buyer: true,
          vehicle: true,
        },
      });

      // Breakdown calculations
      let totalSalesAmount = new Prisma.Decimal(0);
      let totalNetWeight = new Prisma.Decimal(0);
      let cashSalesAmount = new Prisma.Decimal(0);
      let onlineSalesAmount = new Prisma.Decimal(0);
      let chequeSalesAmount = new Prisma.Decimal(0);
      let accountCreditSalesAmount = new Prisma.Decimal(0);

      for (const sale of sales) {
        totalSalesAmount = totalSalesAmount.plus(sale.amount);
        totalNetWeight = totalNetWeight.plus(sale.netWeight);

        if (sale.paymentCategory === PaymentCategory.CASH) {
          cashSalesAmount = cashSalesAmount.plus(sale.amount);
        } else if (sale.paymentCategory === PaymentCategory.ONLINE) {
          onlineSalesAmount = onlineSalesAmount.plus(sale.amount);
        } else if (sale.paymentCategory === PaymentCategory.CHEQUE) {
          chequeSalesAmount = chequeSalesAmount.plus(sale.amount);
        } else if (sale.paymentCategory === PaymentCategory.ACCOUNT) {
          accountCreditSalesAmount = accountCreditSalesAmount.plus(sale.amount);
        }
      }

      // Direct collected vs Pending / Credit
      const directCollectedAmount = cashSalesAmount.plus(onlineSalesAmount).plus(chequeSalesAmount);

      return {
        summary: {
          totalSalesCount: sales.length,
          totalSalesAmount: totalSalesAmount.toString(),
          totalNetWeightTons: totalNetWeight.toString(),
          breakdownByPaymentCategory: {
            CASH: cashSalesAmount.toString(),
            ONLINE: onlineSalesAmount.toString(),
            CHEQUE: chequeSalesAmount.toString(),
            ACCOUNT: accountCreditSalesAmount.toString(), // Clarify: Receivables / Credit sales
          },
          directCollectedAmount: directCollectedAmount.toString(),
          accountCreditSalesAmount: accountCreditSalesAmount.toString(),
        },
        sales,
      };
    }, 60);
  }

  /**
   * Daily Boulder Report:
   * Detailed line items and tonnage summary for boulder trips.
   */
  async getDailyBoulderReport(startDateStr?: string, endDateStr?: string) {
    const cacheKey = `report:boulders:${startDateStr || 'all'}:${endDateStr || 'all'}`;
    return cache.getOrSet(cacheKey, async () => {
      const { start, end } = getDateRangeInUtc(startDateStr, endDateStr);
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

      const trips = await prisma.boulderTrip.findMany({
        where,
        orderBy: { tripDate: 'asc' },
        include: { vehicle: true },
      });

      let totalBoulderTonnage = new Prisma.Decimal(0);
      const supplierMap = new Map<string, { count: number; netWeight: Prisma.Decimal }>();

      for (const trip of trips) {
        totalBoulderTonnage = totalBoulderTonnage.plus(trip.netWeight);

        const existing = supplierMap.get(trip.supplierOrOperator) || {
          count: 0,
          netWeight: new Prisma.Decimal(0),
        };
        existing.count += 1;
        existing.netWeight = existing.netWeight.plus(trip.netWeight);
        supplierMap.set(trip.supplierOrOperator, existing);
      }

      const supplierBreakdown = Array.from(supplierMap.entries()).map(([supplier, data]) => ({
        supplier,
        tripCount: data.count,
        totalNetWeight: data.netWeight.toString(),
      }));

      return {
        summary: {
          totalTripCount: trips.length,
          totalBoulderTonnage: totalBoulderTonnage.toString(),
          supplierBreakdown,
        },
        trips,
      };
    }, 60);
  }

  /**
   * Daily Business Summary Report:
   * Consolidated overview of Material Sales vs Boulder Inflow for the period.
   */
  async getDailyBusinessSummary(startDateStr?: string, endDateStr?: string) {
    const cacheKey = `report:summary:${startDateStr || 'all'}:${endDateStr || 'all'}`;
    return cache.getOrSet(cacheKey, async () => {
      const [salesReport, boulderReport] = await Promise.all([
        this.getDailySalesReport(startDateStr, endDateStr),
        this.getDailyBoulderReport(startDateStr, endDateStr),
      ]);

      return {
        period: {
          startDate: startDateStr || 'All Time',
          endDate: endDateStr || 'All Time',
        },
        salesSummary: salesReport.summary,
        boulderSummary: boulderReport.summary,
        netMaterialDifferenceTons: (
          parseFloat(boulderReport.summary.totalBoulderTonnage) -
          parseFloat(salesReport.summary.totalNetWeightTons)
        ).toFixed(3),
      };
    }, 60);
  }

  /**
   * Export Daily Sales Report as sanitized CSV
   */
  async exportDailySalesReportCsv(
    startDateStr?: string,
    endDateStr?: string,
    buyerName?: string,
    paymentCategory?: PaymentCategory,
    actor?: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const report = await this.getDailySalesReport(startDateStr, endDateStr, buyerName, paymentCategory);

    const headers = [
      'Transaction Date (IST)',
      'Buyer Name',
      'GSTIN',
      'Vehicle Number',
      'Material',
      'Gross (Tons)',
      'Tare (Tons)',
      'Net Weight (Tons)',
      'Rate (INR)',
      'Amount (INR)',
      'Payment Category',
      'Reference No',
      'Remarks',
    ];

    const rows = report.sales.map((s) => [
      formatInIst(s.transactionDate),
      s.buyerName,
      s.gstin || '',
      s.vehicleNumber,
      s.material,
      s.grossWeight.toString(),
      s.tareWeight.toString(),
      s.netWeight.toString(),
      s.rate.toString(),
      s.amount.toString(),
      s.paymentCategory,
      s.referenceNumber || '',
      s.remarks || '',
    ]);

    // Append summary rows at bottom
    rows.push([]);
    rows.push(['--- SUMMARY METRICS ---', '', '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Sales Transactions', String(report.summary.totalSalesCount), '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Net Weight (Tons)', report.summary.totalNetWeightTons, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Total Recorded Sales (INR)', report.summary.totalSalesAmount, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Cash Sales (INR)', report.summary.breakdownByPaymentCategory.CASH, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Online Transfer Sales (INR)', report.summary.breakdownByPaymentCategory.ONLINE, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Cheque Sales (INR)', report.summary.breakdownByPaymentCategory.CHEQUE, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Account / Credit Sales (INR)', report.summary.breakdownByPaymentCategory.ACCOUNT, '', '', '', '', '', '', '', '', '', '', '']);
    rows.push(['Direct Collected Amount (Cash+Online+Cheque)', report.summary.directCollectedAmount, '', '', '', '', '', '', '', '', '', '', '']);

    if (actor) {
      await auditRepository.log({
        actorId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action: 'EXPORT_DAILY_SALES_REPORT',
        entityType: 'REPORT',
        metadata: { startDateStr, endDateStr, count: report.sales.length },
        ipAddress,
      });
    }

    return generateCsv(headers, rows);
  }
}

export const reportService = new ReportService();
