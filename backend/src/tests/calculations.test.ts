import { describe, it, expect } from 'vitest';
import { calculateNetWeight, calculateSaleAmount } from '../utils/calculations.js';

describe('Calculations Utility', () => {
  it('correctly calculates net weight = gross - tare', () => {
    const net = calculateNetWeight(25.5, 10.2);
    expect(net.toNumber()).toBe(15.3);
  });

  it('throws error when gross weight is less than tare weight', () => {
    expect(() => calculateNetWeight(10, 15)).toThrowError(
      'Gross weight must be greater than or equal to tare weight'
    );
  });

  it('throws error when weights are negative', () => {
    expect(() => calculateNetWeight(-5, 2)).toThrowError('Weights cannot be negative');
  });

  it('correctly calculates sale amount = netWeight * rate', () => {
    const { netWeight, amount } = calculateSaleAmount(30.45, 10.15, 650.0);
    // Net weight: 30.45 - 10.15 = 20.3
    // Amount: 20.3 * 650 = 13195.00
    expect(netWeight.toNumber()).toBe(20.3);
    expect(amount.toNumber()).toBe(13195.0);
  });

  it('handles rounding to 2 decimal places for financial calculations', () => {
    const { amount } = calculateSaleAmount(10.333, 0, 33.33);
    // 10.333 * 33.33 = 344.40
    expect(amount.toFixed(2)).toBe('344.40');
  });
});
