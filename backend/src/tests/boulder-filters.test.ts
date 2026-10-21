import { describe, it, expect, vi, beforeEach } from 'vitest';
import { boulderQuerySchema } from '../schemas/boulder.schema.js';
import { boulderService } from '../services/boulder.service.js';
import { boulderRepository } from '../repositories/boulder.repository.js';

describe('Boulder Ledger Supplier and Driver Filtering', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates query with supplierName and driverName filter parameters', () => {
    const query = {
      supplierName: 'Shrinidhi Quarry',
      driverName: 'Manjunath',
      vehicleNumber: 'KA04MN1234',
      page: '1',
      limit: '15',
    };

    const parsed = boulderQuerySchema.safeParse(query);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.supplierName).toBe('Shrinidhi Quarry');
      expect(parsed.data.driverName).toBe('Manjunath');
      expect(parsed.data.vehicleNumber).toBe('KA04MN1234');
      expect(parsed.data.page).toBe(1);
      expect(parsed.data.limit).toBe(15);
    }
  });

  it('passes supplier and driver filters to boulderRepository.findMany', async () => {
    const findManySpy = vi.spyOn(boulderRepository, 'findMany').mockResolvedValue({
      trips: [] as any,
      totalCount: 0,
    });

    const actor = { id: 'admin-1', role: 'ADMIN' };
    const query = {
      supplierName: 'Quarry Site Alpha',
      driverName: 'Suresh Kumar',
      page: 1,
      limit: 15,
      sortBy: 'tripDate' as const,
      sortOrder: 'desc' as const,
    };

    await boulderService.getTrips(query, actor);

    expect(findManySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        supplierName: 'Quarry Site Alpha',
        driverName: 'Suresh Kumar',
      })
    );
  });
});
