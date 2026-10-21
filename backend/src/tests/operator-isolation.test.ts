import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saleService } from '../services/sale.service.js';
import { boulderService } from '../services/boulder.service.js';
import { saleRepository } from '../repositories/sale.repository.js';
import { boulderRepository } from '../repositories/boulder.repository.js';
import { AppError } from '../utils/response.js';

describe('Role-Based Operator Data Isolation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Sales Operator Isolation', () => {
    it('forces operatorId to logged-in sales operator and ignores spoofed query parameters', async () => {
      const findManySpy = vi.spyOn(saleRepository, 'findMany').mockResolvedValue({
        sales: [] as any,
        totalCount: 0,
      });

      const actor = { id: 'sales-op-123', email: 'op1@test.com', role: 'SALES_OPERATOR' };
      // Attempt to spoof operatorId to another operator
      const spoofedQuery = { operatorId: 'other-operator-999', page: 1, limit: 50, sortBy: 'transactionDate' as const, sortOrder: 'desc' as const };

      await saleService.getSales(spoofedQuery, actor);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'sales-op-123',
        })
      );
    });

    it('allows Admin to filter by any operator or view all operators', async () => {
      const findManySpy = vi.spyOn(saleRepository, 'findMany').mockResolvedValue({
        sales: [] as any,
        totalCount: 0,
      });

      const adminActor = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' };
      const queryWithFilter = { operatorId: 'sales-op-456', page: 1, limit: 50, sortBy: 'transactionDate' as const, sortOrder: 'desc' as const };

      await saleService.getSales(queryWithFilter, adminActor);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'sales-op-456',
        })
      );
    });

    it('blocks a sales operator from accessing another operator sale by ID', async () => {
      vi.spyOn(saleRepository, 'findById').mockResolvedValue({
        id: 'sale-1',
        createdById: 'different-operator',
      } as any);

      const actor = { id: 'sales-op-123', role: 'SALES_OPERATOR' };

      await expect(saleService.getSaleById('sale-1', actor)).rejects.toThrow(
        new AppError('You do not have permission to access this sale record', 403)
      );
    });

    it('blocks a sales operator from cancelling another operator sale', async () => {
      vi.spyOn(saleRepository, 'findById').mockResolvedValue({
        id: 'sale-1',
        createdById: 'different-operator',
        isCancelled: false,
      } as any);

      const actor = { id: 'sales-op-123', email: 'op@test.com', role: 'SALES_OPERATOR' };

      await expect(saleService.cancelSale('sale-1', 'test reason', actor)).rejects.toThrow(
        new AppError('You do not have permission to cancel this sale record', 403)
      );
    });
  });

  describe('Boulder Operator Isolation', () => {
    it('forces operatorId to logged-in boulder operator and ignores spoofed query parameters', async () => {
      const findManySpy = vi.spyOn(boulderRepository, 'findMany').mockResolvedValue({
        trips: [] as any,
        totalCount: 0,
      });

      const actor = { id: 'boulder-op-789', email: 'boulder1@test.com', role: 'BOULDER_OPERATOR' };
      // Attempt to spoof operatorId
      const spoofedQuery = { operatorId: 'other-boulder-op', page: 1, limit: 15, sortBy: 'tripDate' as const, sortOrder: 'desc' as const };

      await boulderService.getTrips(spoofedQuery, actor);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'boulder-op-789',
        })
      );
    });

    it('allows Admin to view all or filter boulder trips by operator', async () => {
      const findManySpy = vi.spyOn(boulderRepository, 'findMany').mockResolvedValue({
        trips: [] as any,
        totalCount: 0,
      });

      const adminActor = { id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' };
      const queryWithFilter = { operatorId: 'boulder-op-789', page: 1, limit: 15, sortBy: 'tripDate' as const, sortOrder: 'desc' as const };

      await boulderService.getTrips(queryWithFilter, adminActor);

      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          operatorId: 'boulder-op-789',
        })
      );
    });

    it('blocks a boulder operator from accessing another operator trip by ID', async () => {
      vi.spyOn(boulderRepository, 'findById').mockResolvedValue({
        id: 'trip-1',
        createdById: 'different-boulder-op',
      } as any);

      const actor = { id: 'boulder-op-789', role: 'BOULDER_OPERATOR' };

      await expect(boulderService.getTripById('trip-1', actor)).rejects.toThrow(
        new AppError('You do not have permission to access this boulder trip record', 403)
      );
    });

    it('blocks a boulder operator from cancelling another operator trip', async () => {
      vi.spyOn(boulderRepository, 'findById').mockResolvedValue({
        id: 'trip-1',
        createdById: 'different-boulder-op',
        isCancelled: false,
      } as any);

      const actor = { id: 'boulder-op-789', email: 'boulder1@test.com', role: 'BOULDER_OPERATOR' };

      await expect(boulderService.cancelTrip('trip-1', 'test reason', actor)).rejects.toThrow(
        new AppError('You do not have permission to cancel this boulder trip record', 403)
      );
    });
  });
});
