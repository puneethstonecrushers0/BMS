import { z } from 'zod';

export const roleEnum = z.enum(['ADMIN', 'SALES_OPERATOR', 'BOULDER_OPERATOR']);
export const statusEnum = z.enum(['PENDING', 'ACTIVE', 'DISABLED']);

export const updateUserRoleSchema = z.object({
  role: roleEnum,
});

export const updateUserStatusSchema = z.object({
  status: statusEnum,
});

export const approveUserSchema = z.object({
  role: roleEnum,
});

export const createWorkerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: roleEnum,
});

export type CreateWorkerInput = z.infer<typeof createWorkerSchema>;
