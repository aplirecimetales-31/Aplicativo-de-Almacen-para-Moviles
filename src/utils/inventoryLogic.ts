export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';

export interface StockCalculationResult {
  success: boolean;
  newStock: number;
  error?: string;
}

/**
 * Calculates new inventory stock based on movement type and quantity.
 * Prevents negative stock on exits/merma and validates input quantities.
 */
export function calculateNewStock(
  currentStock: number,
  type: MovementType,
  quantity: number
): StockCalculationResult {
  if (isNaN(quantity) || quantity < 0) {
    return {
      success: false,
      newStock: currentStock,
      error: 'La cantidad debe ser un número positivo.',
    };
  }

  if (type === 'ENTRADA') {
    if (quantity === 0) {
      return { success: false, newStock: currentStock, error: 'La entrada debe ser mayor a 0.' };
    }
    return {
      success: true,
      newStock: Number((currentStock + quantity).toFixed(4)),
    };
  }

  if (type === 'SALIDA' || type === 'MERMA') {
    if (quantity === 0) {
      return { success: false, newStock: currentStock, error: 'La cantidad debe ser mayor a 0.' };
    }
    if (currentStock < quantity) {
      return {
        success: false,
        newStock: currentStock,
        error: `Stock insuficiente: Disponibles ${currentStock}, se intentó retirar ${quantity}.`,
      };
    }
    return {
      success: true,
      newStock: Number((currentStock - quantity).toFixed(4)),
    };
  }

  if (type === 'AJUSTE') {
    return {
      success: true,
      newStock: Number(quantity.toFixed(4)),
    };
  }

  return { success: false, newStock: currentStock, error: 'Tipo de movimiento no válido.' };
}

/**
 * Determines whether an item has low stock compared to safety threshold.
 */
export function isLowStock(quantity: number, minQuantity: number): boolean {
  if (minQuantity <= 0) return quantity <= 0;
  return quantity <= minQuantity;
}

/**
 * Calculates total valuation for a list of items.
 */
export function calculateInventoryValuation(
  items: Array<{ quantity: number; unitPrice?: number }>
): number {
  return items.reduce((acc, item) => {
    const price = typeof item.unitPrice === 'number' && !isNaN(item.unitPrice) ? item.unitPrice : 0;
    const qty = typeof item.quantity === 'number' && !isNaN(item.quantity) ? item.quantity : 0;
    return acc + (qty * price);
  }, 0);
}

/**
 * Filters movement records by target year and month (1-12).
 */
export function filterMovementsByMonthYear<T extends { timestamp: string }>(
  movements: T[],
  year: number,
  month: number
): T[] {
  return movements.filter((m) => {
    if (!m.timestamp) return false;
    const date = new Date(m.timestamp);
    if (isNaN(date.getTime())) return false;
    return date.getFullYear() === year && date.getMonth() + 1 === month;
  });
}

/**
 * Aggregates statistics of warehouse movements.
 */
export function summarizeMovements(
  movements: Array<{ type: MovementType | string; quantity: number }>
) {
  let totalEntries = 0;
  let totalExits = 0;
  let totalAdjusts = 0;
  let totalMermas = 0;
  let totalQuantityIn = 0;
  let totalQuantityOut = 0;

  for (const m of movements) {
    const qty = Number(m.quantity) || 0;
    if (m.type === 'ENTRADA') {
      totalEntries++;
      totalQuantityIn += qty;
    } else if (m.type === 'SALIDA') {
      totalExits++;
      totalQuantityOut += qty;
    } else if (m.type === 'AJUSTE') {
      totalAdjusts++;
    } else if (m.type === 'MERMA') {
      totalMermas++;
      totalQuantityOut += qty;
    }
  }

  return {
    totalEntries,
    totalExits,
    totalAdjusts,
    totalMermas,
    totalQuantityIn,
    totalQuantityOut,
    totalTransactions: movements.length,
  };
}

/**
 * Cleans and extracts raw barcode or QR payload.
 * Trims whitespace and strips URLs if QR contains a link to product.
 */
export function cleanBarcode(rawInput: string): string {
  if (!rawInput) return '';
  const trimmed = rawInput.trim();
  // If QR contains a URL ending in an ID or code, extract it
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const url = new URL(trimmed);
      const pathname = url.pathname.replace(/\/$/, '');
      const parts = pathname.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart.length > 2) {
        return lastPart;
      }
    }
  } catch {
    // Fall back to trimmed string
  }
  return trimmed;
}
