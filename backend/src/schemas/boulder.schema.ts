import { z } from 'zod';

export const baseBoulderTripSchema = z.object({
  tripDate: z.string().or(z.date()).transform((val) => new Date(val)),
  supplierOrOperator: z.string().trim().min(1, 'Supplier or operator is required').max(150),
  vehicleNumber: z
    .string()
    .trim()
    .min(1, 'Vehicle number is required')
    .max(20)
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than zero'),
  tareWeight: z.coerce.number().nonnegative('Tare weight must be zero or positive'),
  driverName: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createBoulderTripSchema = baseBoulderTripSchema.refine((data) => data.grossWeight >= data.tareWeight, {
  message: 'Gross weight must be greater than or equal to tare weight',
  path: ['grossWeight'],
});

export const updateBoulderTripSchema = baseBoulderTripSchema.partial();

export const cancelBoulderTripSchema = z.object({
  cancellationReason: z.string().trim().min(3, 'Cancellation reason is required').max(300),
});

export const boulderQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  supplierOrOperator: z.string().optional(),
  supplierName: z.string().optional(),
  driverName: z.string().optional(),
  operatorId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  isCancelled: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(25),
  sortBy: z.enum(['tripDate', 'netWeight', 'createdAt']).default('tripDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateBoulderTripInput = z.infer<typeof createBoulderTripSchema>;
export type UpdateBoulderTripInput = z.infer<typeof updateBoulderTripSchema>;
export type CancelBoulderTripInput = z.infer<typeof cancelBoulderTripSchema>;
export type BoulderQueryInput = z.infer<typeof boulderQuerySchema>;
