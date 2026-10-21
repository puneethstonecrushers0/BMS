import { saleRepository } from '../repositories/sale.repository.js';
import { buyerVehicleRepository } from '../repositories/buyer-vehicle.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { calculateSaleAmount } from '../utils/calculations.js';
import { AppError } from '../utils/response.js';
import { generateCsv } from '../utils/sanitizeCsv.js';
import { formatInIst } from '../utils/timezone.js';
import { CreateSaleInput, UpdateSaleInput, SaleQueryInput } from '../schemas/sale.schema.js';
import { PaymentCategory, Prisma } from '@prisma/client';
import { prisma } from '../database/prisma.js';
import { analyticsService } from './analytics.service.js';

export class SaleService {
  async createSale(
    input: CreateSaleInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    // Server-side calculation of net weight and amount
    const { netWeight, amount } = calculateSaleAmount(input.grossWeight, input.tareWeight, input.rate || 0);

    // Auto-upsert buyer and vehicle
    const buyer = await buyerVehicleRepository.upsertBuyer(input.buyerName, input.gstin);
    const vehicle = await buyerVehicleRepository.upsertVehicle(input.vehicleNumber, input.tareWeight);

    let serialNumber = input.serialNumber;
    if (!serialNumber) {
      const count = await prisma.sale.count();
      serialNumber = String(count + 1);
    }

    const tareDateTime = input.tareDateTime || input.transactionDate;
    const grossDateTime = input.grossDateTime || input.transactionDate;
    const paymentCategory = (input.paymentCategory || (input.creditDebit === 'C' ? 'ACCOUNT' : 'CASH')) as PaymentCategory;
    const creditDebit = input.creditDebit || (paymentCategory === 'ACCOUNT' ? 'C' : 'D');

    const sale = await saleRepository.create({
      serialNumber,
      transactionDate: input.transactionDate,
      buyer: { connect: { id: buyer.id } },
      buyerName: buyer.name,
      gstin: buyer.gstin,
      vehicle: { connect: { id: vehicle.id } },
      vehicleNumber: vehicle.vehicleNumber,
      vehicleType: input.vehicleType || null,
      material: input.material,
      grossWeight: new Prisma.Decimal(input.grossWeight),
      grossDateTime,
      tareWeight: new Prisma.Decimal(input.tareWeight),
      tareDateTime,
      netWeight: new Prisma.Decimal(netWeight.toString()),
      rate: new Prisma.Decimal((input.rate || 0).toString()),
      amount: new Prisma.Decimal(amount.toString()),
      paymentCategory,
      creditDebit,
      referenceNumber: input.referenceNumber || null,
      remarks: input.remarks || null,
      createdBy: { connect: { id: actor.id } },
    });

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'SALE_CREATED',
      entityType: 'SALE',
      entityId: sale.id,
      metadata: {
        serialNumber: sale.serialNumber,
        buyer: sale.buyerName,
        vehicle: sale.vehicleNumber,
        vehicleType: sale.vehicleType,
        netWeight: sale.netWeight.toString(),
        amount: sale.amount.toString(),
        category: sale.paymentCategory,
        creditDebit: sale.creditDebit,
      },
      ipAddress,
    });

    // Invalidate analytics caches
    await analyticsService.invalidateCache();

    return sale;
  }

  async updateSale(
    id: string,
    input: UpdateSaleInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const existing = await saleRepository.findById(id);
    if (!existing) {
      throw new AppError('Sale record not found', 404);
    }

    if (existing.isCancelled) {
      throw new AppError('Cannot modify a cancelled sale record', 400);
    }

    // Role-based data isolation: SALES_OPERATOR can only modify their own entries
    if (actor.role === 'SALES_OPERATOR' && existing.createdById !== actor.id) {
      throw new AppError('You do not have permission to modify this sale record', 403);
    }

    const grossWeight = input.grossWeight !== undefined ? input.grossWeight : Number(existing.grossWeight);
    const tareWeight = input.tareWeight !== undefined ? input.tareWeight : Number(existing.tareWeight);
    const rate = input.rate !== undefined ? input.rate : Number(existing.rate);

    const { netWeight, amount } = calculateSaleAmount(grossWeight, tareWeight, rate);

    let buyerId = existing.buyerId;
    let buyerName = existing.buyerName;
    let gstin = existing.gstin;

    if (input.buyerName) {
      const buyer = await buyerVehicleRepository.upsertBuyer(input.buyerName, input.gstin);
      buyerId = buyer.id;
      buyerName = buyer.name;
      gstin = buyer.gstin;
    }

    let vehicleId = existing.vehicleId;
    let vehicleNumber = existing.vehicleNumber;

    if (input.vehicleNumber) {
      const vehicle = await buyerVehicleRepository.upsertVehicle(input.vehicleNumber, tareWeight);
      vehicleId = vehicle.id;
      vehicleNumber = vehicle.vehicleNumber;
    }

    const updated = await saleRepository.update(id, {
      ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
      ...(buyerId ? { buyer: { connect: { id: buyerId } }, buyerName, gstin } : {}),
      ...(vehicleId ? { vehicle: { connect: { id: vehicleId } }, vehicleNumber } : {}),
      ...(input.material ? { material: input.material } : {}),
      grossWeight: new Prisma.Decimal(grossWeight),
      tareWeight: new Prisma.Decimal(tareWeight),
      netWeight: new Prisma.Decimal(netWeight.toString()),
      rate: new Prisma.Decimal(rate),
      amount: new Prisma.Decimal(amount.toString()),
      ...(input.paymentCategory
        ? {
            paymentCategory: input.paymentCategory as PaymentCategory,
            creditDebit: input.creditDebit || (input.paymentCategory === 'ACCOUNT' ? 'C' : 'D'),
          }
        : input.creditDebit
        ? { creditDebit: input.creditDebit }
        : {}),
      ...(input.referenceNumber !== undefined ? { referenceNumber: input.referenceNumber } : {}),
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      updatedBy: { connect: { id: actor.id } },
    });

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'SALE_UPDATED',
      entityType: 'SALE',
      entityId: id,
      metadata: { buyer: updated.buyerName, amount: updated.amount.toString() },
      ipAddress,
    });

    await analyticsService.invalidateCache();

    return updated;
  }

  async cancelSale(
    id: string,
    reason: string,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const existing = await saleRepository.findById(id);
    if (!existing) {
      throw new AppError('Sale record not found', 404);
    }

    if (existing.isCancelled) {
      throw new AppError('Sale record is already cancelled', 400);
    }

    // Role-based data isolation: SALES_OPERATOR can only cancel their own entries
    if (actor.role === 'SALES_OPERATOR' && existing.createdById !== actor.id) {
      throw new AppError('You do not have permission to cancel this sale record', 403);
    }

    const cancelled = await saleRepository.cancel(id, reason, actor.id);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'SALE_CANCELLED',
      entityType: 'SALE',
      entityId: id,
      metadata: { reason, amount: existing.amount.toString() },
      ipAddress,
    });

    await analyticsService.invalidateCache();

    return cancelled;
  }

  async getSales(query: SaleQueryInput, actor?: { id: string; role: string }) {
    const effectiveQuery = { ...query };
    // Role-based data isolation: SALES_OPERATOR can ONLY view their own entries
    if (actor && actor.role === 'SALES_OPERATOR') {
      effectiveQuery.operatorId = actor.id;
    }
    return saleRepository.findMany(effectiveQuery);
  }

  async getSaleById(id: string, actor?: { id: string; role: string }) {
    const sale = await saleRepository.findById(id);
    if (!sale) throw new AppError('Sale record not found', 404);
    // Role-based data isolation: SALES_OPERATOR cannot access another operator's record
    if (actor && actor.role === 'SALES_OPERATOR' && sale.createdById !== actor.id) {
      throw new AppError('You do not have permission to access this sale record', 403);
    }
    return sale;
  }

  async exportSalesCsv(
    query: SaleQueryInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const effectiveQuery = { ...query };
    // Role-based data isolation: SALES_OPERATOR can ONLY export their own entries
    if (actor.role === 'SALES_OPERATOR') {
      effectiveQuery.operatorId = actor.id;
    }
    const sales = await saleRepository.findForExport(effectiveQuery);

    const headers = [
      'S.No',
      'Transaction Date (IST)',
      'Party Name / Buyer',
      'GSTIN',
      'Vehicle Number',
      'Vehicle Type',
      'Material',
      'Tare Weight (Tons)',
      'Tare Date & Time (IST)',
      'Gross Weight (Tons)',
      'Gross Date & Time (IST)',
      'Net Weight (Tons)',
      'C-D',
      'Rate (INR)',
      'Amount (INR)',
      'Payment Category',
      'Reference No.',
      'Remarks',
      'Status',
      'Cancellation Reason',
    ];

    const rows = sales.map((s) => [
      s.serialNumber || '',
      formatInIst(s.transactionDate),
      s.buyerName,
      s.gstin || '',
      s.vehicleNumber,
      s.vehicleType || '',
      s.material,
      s.tareWeight.toString(),
      s.tareDateTime ? formatInIst(s.tareDateTime) : formatInIst(s.transactionDate),
      s.grossWeight.toString(),
      s.grossDateTime ? formatInIst(s.grossDateTime) : formatInIst(s.transactionDate),
      s.netWeight.toString(),
      s.creditDebit || (s.paymentCategory === 'ACCOUNT' ? 'C' : 'D'),
      s.rate.toString(),
      s.amount.toString(),
      s.paymentCategory,
      s.referenceNumber || '',
      s.remarks || '',
      s.isCancelled ? 'CANCELLED' : 'ACTIVE',
      s.cancellationReason || '',
    ]);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'EXPORT_SALES_CSV',
      entityType: 'SALE',
      metadata: { count: sales.length },
      ipAddress,
    });

    return generateCsv(headers, rows);
  }
}

export const saleService = new SaleService();
