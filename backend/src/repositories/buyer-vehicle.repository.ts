import { prisma } from '../database/prisma.js';
import { Buyer, Vehicle } from '@prisma/client';
import { cache } from '../database/redis.js';

export class BuyerVehicleRepository {
  // Buyers
  async findAllBuyers(activeOnly = false): Promise<Buyer[]> {
    const cacheKey = `ref:buyers:${activeOnly ? 'active' : 'all'}`;
    return cache.getOrSet(
      cacheKey,
      () =>
        prisma.buyer.findMany({
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { name: 'asc' },
        }),
      300
    );
  }

  async findBuyerById(id: string): Promise<Buyer | null> {
    const cacheKey = `ref:buyer:id:${id}`;
    return cache.getOrSet(
      cacheKey,
      () => prisma.buyer.findUnique({ where: { id } }),
      300
    );
  }

  async findBuyerByName(name: string): Promise<Buyer | null> {
    const trimmed = name.trim();
    const cacheKey = `ref:buyer:name:${trimmed.toLowerCase()}`;
    return cache.getOrSet(
      cacheKey,
      () => prisma.buyer.findUnique({ where: { name: trimmed } }),
      300
    );
  }

  async upsertBuyer(name: string, gstin?: string | null): Promise<Buyer> {
    const trimmed = name.trim();
    const result = await prisma.buyer.upsert({
      where: { name: trimmed },
      update: {
        ...(gstin ? { gstin: gstin.trim() } : {}),
      },
      create: {
        name: trimmed,
        gstin: gstin ? gstin.trim() : null,
      },
    });
    // Invalidate buyers reference cache
    cache.invalidatePattern('ref:buyer*').catch(() => {});
    return result;
  }

  async createBuyer(data: { name: string; gstin?: string | null; phone?: string | null; address?: string | null; isActive?: boolean }): Promise<Buyer> {
    const result = await prisma.buyer.create({
      data: {
        name: data.name.trim(),
        gstin: data.gstin?.trim() || null,
        phone: data.phone?.trim() || null,
        address: data.address?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
    cache.invalidatePattern('ref:buyer*').catch(() => {});
    return result;
  }

  async updateBuyer(id: string, data: Partial<{ name: string; gstin: string | null; phone: string | null; address: string | null; isActive: boolean }>): Promise<Buyer> {
    const result = await prisma.buyer.update({
      where: { id },
      data,
    });
    cache.invalidatePattern('ref:buyer*').catch(() => {});
    return result;
  }

  // Vehicles
  async findAllVehicles(activeOnly = false): Promise<Vehicle[]> {
    const cacheKey = `ref:vehicles:${activeOnly ? 'active' : 'all'}`;
    return cache.getOrSet(
      cacheKey,
      () =>
        prisma.vehicle.findMany({
          where: activeOnly ? { isActive: true } : undefined,
          orderBy: { vehicleNumber: 'asc' },
        }),
      300
    );
  }

  async findVehicleById(id: string): Promise<Vehicle | null> {
    const cacheKey = `ref:vehicle:id:${id}`;
    return cache.getOrSet(
      cacheKey,
      () => prisma.vehicle.findUnique({ where: { id } }),
      300
    );
  }

  async findVehicleByNumber(vehicleNumber: string): Promise<Vehicle | null> {
    const cleanNumber = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const cacheKey = `ref:vehicle:num:${cleanNumber}`;
    return cache.getOrSet(
      cacheKey,
      () => prisma.vehicle.findUnique({ where: { vehicleNumber: cleanNumber } }),
      300
    );
  }

  async upsertVehicle(vehicleNumber: string, tareWeight?: number | null, driverName?: string | null): Promise<Vehicle> {
    const cleanNumber = vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const existing = await prisma.vehicle.findUnique({ where: { vehicleNumber: cleanNumber } });
    if (existing) {
      // Preserve centrally registered tare weight; update driver name if provided
      if (driverName && driverName.trim() !== existing.driverName) {
        const updated = await prisma.vehicle.update({
          where: { id: existing.id },
          data: { driverName: driverName.trim() },
        });
        cache.invalidatePattern('ref:vehicle*').catch(() => {});
        return updated;
      }
      return existing;
    }
    const result = await prisma.vehicle.create({
      data: {
        vehicleNumber: cleanNumber,
        tareWeight: tareWeight ?? null,
        driverName: driverName?.trim() || null,
      },
    });
    // Invalidate vehicles reference cache
    cache.invalidatePattern('ref:vehicle*').catch(() => {});
    return result;
  }

  async createVehicle(data: { vehicleNumber: string; tareWeight?: number | null; driverName?: string | null; driverPhone?: string | null; isActive?: boolean }): Promise<Vehicle> {
    const cleanNumber = data.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '');
    const result = await prisma.vehicle.create({
      data: {
        vehicleNumber: cleanNumber,
        tareWeight: data.tareWeight ?? null,
        driverName: data.driverName?.trim() || null,
        driverPhone: data.driverPhone?.trim() || null,
        isActive: data.isActive ?? true,
      },
    });
    cache.invalidatePattern('ref:vehicle*').catch(() => {});
    return result;
  }

  async updateVehicle(id: string, data: Partial<{ vehicleNumber: string; tareWeight: number | null; driverName: string | null; driverPhone: string | null; isActive: boolean }>): Promise<Vehicle> {
    const result = await prisma.vehicle.update({
      where: { id },
      data: {
        ...data,
        ...(data.vehicleNumber ? { vehicleNumber: data.vehicleNumber.trim().toUpperCase().replace(/\s+/g, '') } : {}),
      },
    });
    cache.invalidatePattern('ref:vehicle*').catch(() => {});
    return result;
  }
}

export const buyerVehicleRepository = new BuyerVehicleRepository();
