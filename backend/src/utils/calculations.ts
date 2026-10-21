import { Decimal } from 'decimal.js';

export interface WeightCalculationResult {
  netWeight: string; // decimal string
}

export interface SaleCalculationResult {
  netWeight: string;
  amount: string;
}

export function calculateNetWeight(grossWeight: string | number, tareWeight: string | number): Decimal {
  const gross = new Decimal(grossWeight);
  const tare = new Decimal(tareWeight);

  if (gross.isNegative() || tare.isNegative()) {
    throw new Error('Weights cannot be negative');
  }

  if (gross.lessThan(tare)) {
    throw new Error('Gross weight must be greater than or equal to tare weight');
  }

  return gross.minus(tare).toDecimalPlaces(3);
}

export function calculateSaleAmount(
  grossWeight: string | number,
  tareWeight: string | number,
  rate: string | number
): { netWeight: Decimal; amount: Decimal } {
  const netWeight = calculateNetWeight(grossWeight, tareWeight);
  const rateDec = new Decimal(rate);

  if (rateDec.isNegative()) {
    throw new Error('Rate cannot be negative');
  }

  const amount = netWeight.times(rateDec).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  return { netWeight, amount };
}
