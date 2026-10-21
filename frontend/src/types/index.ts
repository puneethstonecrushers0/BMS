export type Role = 'ADMIN' | 'SALES_OPERATOR' | 'BOULDER_OPERATOR';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'DISABLED';
export type PaymentCategory = 'CASH' | 'ONLINE' | 'ACCOUNT' | 'CHEQUE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface Buyer {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  tareWeight?: number | string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  isActive: boolean;
  createdAt?: string;
}

export interface Sale {
  id: string;
  serialNumber?: string | null;
  transactionDate: string;
  buyerId?: string | null;
  buyerName: string;
  gstin?: string | null;
  vehicleId?: string | null;
  vehicleNumber: string;
  vehicleType?: string | null;
  material: string;
  grossWeight: number | string;
  grossDateTime?: string | null;
  tareWeight: number | string;
  tareDateTime?: string | null;
  netWeight: number | string;
  rate: number | string;
  amount: number | string;
  paymentCategory: PaymentCategory;
  creditDebit?: string | null;
  referenceNumber?: string | null;
  remarks?: string | null;
  isCancelled: boolean;
  cancellationReason?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string };
}

export interface BoulderTrip {
  id: string;
  tripDate: string;
  supplierOrOperator: string;
  vehicleId?: string | null;
  vehicleNumber: string;
  grossWeight: number | string;
  tareWeight: number | string;
  netWeight: number | string;
  driverName?: string | null;
  remarks?: string | null;
  isCancelled: boolean;
  cancellationReason?: string | null;
  createdAt: string;
  createdBy?: { id: string; name: string; email: string };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorId?: string | null;
  actorEmail: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  details?: unknown;
}
