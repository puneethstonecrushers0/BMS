import { z } from 'zod';

export const paymentCategoryEnum = z.enum(['CASH', 'ONLINE', 'ACCOUNT', 'CHEQUE']);

export const baseSaleSchema = z.object({
  serialNumber: z.string().trim().max(50).optional().nullable(),
  transactionDate: z.string().or(z.date()).transform((val) => new Date(val)),
  buyerName: z.string().trim().min(1, 'Buyer / Party name is required').max(150),
  gstin: z.string().trim().max(20).optional().nullable(),
  vehicleNumber: z
    .string()
    .trim()
    .min(1, 'Vehicle number is required')
    .max(20)
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  vehicleType: z.string().trim().max(50).optional().nullable(),
  material: z.string().trim().min(1, 'Material description is required').max(100),
  grossWeight: z.coerce.number().positive('Gross weight must be greater than zero'),
  grossDateTime: z
    .string()
    .or(z.date())
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),
  tareWeight: z.coerce.number().nonnegative('Tare weight must be zero or positive'),
  tareDateTime: z
    .string()
    .or(z.date())
    .optional()
    .nullable()
    .transform((val) => (val ? new Date(val) : undefined)),
  rate: z.coerce.number().nonnegative('Rate must be zero or positive').default(0),
  paymentCategory: paymentCategoryEnum.default('CASH'),
  creditDebit: z.string().trim().max(20).optional().nullable(),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const createSaleSchema = baseSaleSchema.refine((data) => data.grossWeight >= data.tareWeight, {
  message: 'Gross weight must be greater than or equal to tare weight',
  path: ['grossWeight'],
});

export const updateSaleSchema = baseSaleSchema.partial();

export const cancelSaleSchema = z.object({
  cancellationReason: z.string().trim().min(3, 'Cancellation reason is required').max(300),
});

export const saleQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  startDateTime: z.string().optional(),
  endDateTime: z.string().optional(),
  serialNumber: z.string().optional(),
  buyerName: z.string().optional(),
  supplierName: z.string().optional(),
  driverName: z.string().optional(),
  operatorId: z.string().optional(),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  material: z.string().optional(),
  creditDebit: z.string().optional(),
  paymentCategory: paymentCategoryEnum.optional(),
  isCancelled: z
    .string()
    .optional()
    .transform((val) => (val === 'true' ? true : val === 'false' ? false : undefined)),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
  sortBy: z.enum(['transactionDate', 'amount', 'netWeight', 'createdAt', 'serialNumber']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>;
export type CancelSaleInput = z.infer<typeof cancelSaleSchema>;
export type SaleQueryInput = z.infer<typeof saleQuerySchema>;
