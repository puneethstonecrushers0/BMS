import { boulderRepository } from '../repositories/boulder.repository.js';
import { buyerVehicleRepository } from '../repositories/buyer-vehicle.repository.js';
import { auditRepository } from '../repositories/audit.repository.js';
import { calculateNetWeight } from '../utils/calculations.js';
import { AppError } from '../utils/response.js';
import { generateCsv } from '../utils/sanitizeCsv.js';
import { formatInIst } from '../utils/timezone.js';
import { CreateBoulderTripInput, UpdateBoulderTripInput, BoulderQueryInput } from '../schemas/boulder.schema.js';
import { Prisma } from '@prisma/client';
import { analyticsService } from './analytics.service.js';

export class BoulderService {
  async createTrip(
    input: CreateBoulderTripInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    // Server-side calculation of net weight
    const netWeight = calculateNetWeight(input.grossWeight, input.tareWeight);

    // Auto-upsert vehicle
    const vehicle = await buyerVehicleRepository.upsertVehicle(
      input.vehicleNumber,
      input.tareWeight,
      input.driverName
    );

    const trip = await boulderRepository.create({
      tripDate: input.tripDate,
      supplierOrOperator: input.supplierOrOperator.trim(),
      vehicle: { connect: { id: vehicle.id } },
      vehicleNumber: vehicle.vehicleNumber,
      grossWeight: new Prisma.Decimal(input.grossWeight),
      tareWeight: new Prisma.Decimal(input.tareWeight),
      netWeight: new Prisma.Decimal(netWeight.toString()),
      driverName: input.driverName?.trim() || null,
      remarks: input.remarks || null,
      createdBy: { connect: { id: actor.id } },
    });

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'BOULDER_TRIP_CREATED',
      entityType: 'BOULDER_TRIP',
      entityId: trip.id,
      metadata: {
        supplier: trip.supplierOrOperator,
        vehicle: trip.vehicleNumber,
        netWeight: trip.netWeight.toString(),
      },
      ipAddress,
    });

    // Invalidate analytics caches
    await analyticsService.invalidateCache();

    return trip;
  }

  async updateTrip(
    id: string,
    input: UpdateBoulderTripInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const existing = await boulderRepository.findById(id);
    if (!existing) {
      throw new AppError('Boulder trip not found', 404);
    }

    if (existing.isCancelled) {
      throw new AppError('Cannot modify a cancelled boulder trip', 400);
    }

    // Role-based data isolation: BOULDER_OPERATOR can only modify their own entries
    if (actor.role === 'BOULDER_OPERATOR' && existing.createdById !== actor.id) {
      throw new AppError('You do not have permission to modify this boulder trip record', 403);
    }

    const grossWeight = input.grossWeight !== undefined ? input.grossWeight : Number(existing.grossWeight);
    const tareWeight = input.tareWeight !== undefined ? input.tareWeight : Number(existing.tareWeight);
    const netWeight = calculateNetWeight(grossWeight, tareWeight);

    let vehicleId = existing.vehicleId;
    let vehicleNumber = existing.vehicleNumber;

    if (input.vehicleNumber) {
      const vehicle = await buyerVehicleRepository.upsertVehicle(
        input.vehicleNumber,
        tareWeight,
        input.driverName
      );
      vehicleId = vehicle.id;
      vehicleNumber = vehicle.vehicleNumber;
    }

    const updated = await boulderRepository.update(id, {
      ...(input.tripDate ? { tripDate: input.tripDate } : {}),
      ...(input.supplierOrOperator ? { supplierOrOperator: input.supplierOrOperator.trim() } : {}),
      ...(vehicleId ? { vehicle: { connect: { id: vehicleId } }, vehicleNumber } : {}),
      grossWeight: new Prisma.Decimal(grossWeight),
      tareWeight: new Prisma.Decimal(tareWeight),
      netWeight: new Prisma.Decimal(netWeight.toString()),
      ...(input.driverName !== undefined ? { driverName: input.driverName?.trim() || null } : {}),
      ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
      updatedBy: { connect: { id: actor.id } },
    });

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'BOULDER_TRIP_UPDATED',
      entityType: 'BOULDER_TRIP',
      entityId: id,
      metadata: { supplier: updated.supplierOrOperator, netWeight: updated.netWeight.toString() },
      ipAddress,
    });

    await analyticsService.invalidateCache();

    return updated;
  }

  async cancelTrip(
    id: string,
    reason: string,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const existing = await boulderRepository.findById(id);
    if (!existing) {
      throw new AppError('Boulder trip not found', 404);
    }

    if (existing.isCancelled) {
      throw new AppError('Boulder trip is already cancelled', 400);
    }

    // Role-based data isolation: BOULDER_OPERATOR can only cancel their own entries
    if (actor.role === 'BOULDER_OPERATOR' && existing.createdById !== actor.id) {
      throw new AppError('You do not have permission to cancel this boulder trip record', 403);
    }

    const cancelled = await boulderRepository.cancel(id, reason, actor.id);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'BOULDER_TRIP_CANCELLED',
      entityType: 'BOULDER_TRIP',
      entityId: id,
      metadata: { reason, supplier: existing.supplierOrOperator },
      ipAddress,
    });

    await analyticsService.invalidateCache();

    return cancelled;
  }

  async getTrips(query: BoulderQueryInput, actor?: { id: string; role: string }) {
    const effectiveQuery = { ...query };
    // Role-based data isolation: BOULDER_OPERATOR can ONLY view their own entries
    if (actor && actor.role === 'BOULDER_OPERATOR') {
      effectiveQuery.operatorId = actor.id;
    }
    return boulderRepository.findMany(effectiveQuery);
  }

  async getTripById(id: string, actor?: { id: string; role: string }) {
    const trip = await boulderRepository.findById(id);
    if (!trip) throw new AppError('Boulder trip not found', 404);
    // Role-based data isolation: BOULDER_OPERATOR cannot access another operator's record
    if (actor && actor.role === 'BOULDER_OPERATOR' && trip.createdById !== actor.id) {
      throw new AppError('You do not have permission to access this boulder trip record', 403);
    }
    return trip;
  }

  async exportTripsCsv(
    query: BoulderQueryInput,
    actor: { id: string; email: string; role: string },
    ipAddress?: string
  ) {
    const effectiveQuery = { ...query };
    // Role-based data isolation: BOULDER_OPERATOR can ONLY export their own entries
    if (actor.role === 'BOULDER_OPERATOR') {
      effectiveQuery.operatorId = actor.id;
    }
    const trips = await boulderRepository.findForExport(effectiveQuery);

    const headers = [
      'Trip Date (IST)',
      'Supplier / Operator',
      'Vehicle Number',
      'Gross Weight (Tons)',
      'Tare Weight (Tons)',
      'Net Weight (Tons)',
      'Driver Name',
      'Remarks',
      'Status',
      'Cancellation Reason',
    ];

    const rows = trips.map((t) => [
      formatInIst(t.tripDate),
      t.supplierOrOperator,
      t.vehicleNumber,
      t.grossWeight.toString(),
      t.tareWeight.toString(),
      t.netWeight.toString(),
      t.driverName || '',
      t.remarks || '',
      t.isCancelled ? 'CANCELLED' : 'ACTIVE',
      t.cancellationReason || '',
    ]);

    await auditRepository.log({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'EXPORT_BOULDER_TRIPS_CSV',
      entityType: 'BOULDER_TRIP',
      metadata: { count: trips.length },
      ipAddress,
    });

    return generateCsv(headers, rows);
  }

  async getDistinctSuppliers(): Promise<string[]> {
    return boulderRepository.getDistinctSuppliers();
  }

  async getDistinctDrivers(): Promise<string[]> {
    return boulderRepository.getDistinctDrivers();
  }
}

export const boulderService = new BoulderService();
