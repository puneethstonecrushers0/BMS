import { describe, it, expect } from 'vitest';
import { createSaleSchema } from '../schemas/sale.schema.js';

describe('Sales Weight & Tare Validation Schema', () => {
  it('validates a valid sale with gross weight greater than tare weight', () => {
    const validData = {
      buyerName: 'Infra Builders Ltd',
      vehicleNumber: 'KA04MN1234',
      vehicleType: '10 WHEELER',
      material: 'M-SAND',
      grossWeight: 35.5,
      tareWeight: 10.2,
      grossDateTime: new Date().toISOString(),
      tareDateTime: new Date().toISOString(),
      transactionDate: new Date().toISOString(),
      rate: 650,
      creditDebit: 'C',
    };

    const parsed = createSaleSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.grossWeight).toBe(35.5);
      expect(parsed.data.tareWeight).toBe(10.2);
    }
  });

  it('rejects a sale where gross weight is less than tare weight', () => {
    const invalidData = {
      buyerName: 'Infra Builders Ltd',
      vehicleNumber: 'KA04MN1234',
      material: 'M-SAND',
      grossWeight: 8.5,
      tareWeight: 10.2,
      transactionDate: new Date().toISOString(),
    };

    const parsed = createSaleSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain('Gross weight must be greater than or equal to tare weight');
    }
  });

  it('rejects a sale with negative tare weight', () => {
    const invalidData = {
      buyerName: 'Infra Builders Ltd',
      vehicleNumber: 'KA04MN1234',
      material: 'M-SAND',
      grossWeight: 20.0,
      tareWeight: -2.0,
      transactionDate: new Date().toISOString(),
    };

    const parsed = createSaleSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('validates non-negative rate per ton and rejects negative rates', () => {
    const validWithRate = {
      buyerName: 'Infra Builders Ltd',
      vehicleNumber: 'KA04MN1234',
      material: 'M-SAND',
      grossWeight: 20.0,
      tareWeight: 8.0,
      rate: 750.5,
      transactionDate: new Date().toISOString(),
    };
    const validParsed = createSaleSchema.safeParse(validWithRate);
    expect(validParsed.success).toBe(true);
    if (validParsed.success) {
      expect(validParsed.data.rate).toBe(750.5);
    }

    const invalidNegativeRate = {
      buyerName: 'Infra Builders Ltd',
      vehicleNumber: 'KA04MN1234',
      material: 'M-SAND',
      grossWeight: 20.0,
      tareWeight: 8.0,
      rate: -100,
      transactionDate: new Date().toISOString(),
    };
    const invalidParsed = createSaleSchema.safeParse(invalidNegativeRate);
    expect(invalidParsed.success).toBe(false);
    if (!invalidParsed.success) {
      expect(invalidParsed.error.issues[0].message).toContain('Rate must be zero or positive');
    }
  });
});
