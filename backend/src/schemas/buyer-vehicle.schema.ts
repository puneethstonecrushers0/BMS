import { z } from 'zod';

export const createBuyerSchema = z.object({
  name: z.string().trim().min(1, 'Buyer name is required').max(150),
  gstin: z.string().trim().max(20).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateBuyerSchema = createBuyerSchema.partial();

export const createVehicleSchema = z.object({
  vehicleNumber: z
    .string()
    .trim()
    .min(1, 'Vehicle number is required')
    .max(20)
    .transform((val) => val.toUpperCase().replace(/\s+/g, '')),
  tareWeight: z.coerce.number().nonnegative().optional().nullable(),
  driverName: z.string().trim().max(100).optional().nullable(),
  driverPhone: z.string().trim().max(20).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateVehicleSchema = createVehicleSchema.partial();
