import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateNewStock,
  isLowStock,
  calculateInventoryValuation,
  filterMovementsByMonthYear,
  summarizeMovements,
  cleanBarcode,
} from './inventoryLogic.ts';

test('calculateNewStock: ENTRADA adds quantity correctly', () => {
  const result = calculateNewStock(15, 'ENTRADA', 10);
  assert.equal(result.success, true);
  assert.equal(result.newStock, 25);
});

test('calculateNewStock: ENTRADA with 0 quantity returns error', () => {
  const result = calculateNewStock(15, 'ENTRADA', 0);
  assert.equal(result.success, false);
  assert.equal(result.newStock, 15);
});

test('calculateNewStock: SALIDA subtracts quantity when sufficient stock', () => {
  const result = calculateNewStock(20, 'SALIDA', 5);
  assert.equal(result.success, true);
  assert.equal(result.newStock, 15);
});

test('calculateNewStock: SALIDA fails if requested exceeds available stock', () => {
  const result = calculateNewStock(10, 'SALIDA', 15);
  assert.equal(result.success, false);
  assert.equal(result.newStock, 10);
  assert.match(result.error || '', /insuficiente/i);
});

test('calculateNewStock: AJUSTE overrides stock directly', () => {
  const result = calculateNewStock(45, 'AJUSTE', 80);
  assert.equal(result.success, true);
  assert.equal(result.newStock, 80);
});

test('isLowStock: correctly identifies critical stock', () => {
  assert.equal(isLowStock(3, 5), true);
  assert.equal(isLowStock(5, 5), true);
  assert.equal(isLowStock(6, 5), false);
  assert.equal(isLowStock(0, 0), true);
});

test('calculateInventoryValuation: sums total value accurately', () => {
  const items = [
    { quantity: 10, unitPrice: 25 },
    { quantity: 4, unitPrice: 50 },
    { quantity: 2, unitPrice: 100 },
  ];
  const total = calculateInventoryValuation(items);
  assert.equal(total, 10 * 25 + 4 * 50 + 2 * 100); // 250 + 200 + 200 = 650
});

test('filterMovementsByMonthYear: filters accurately by month and year', () => {
  const list = [
    { id: '1', timestamp: '2026-10-02T10:00:00Z' },
    { id: '2', timestamp: '2026-10-15T15:30:00Z' },
    { id: '3', timestamp: '2026-09-28T09:00:00Z' },
    { id: '4', timestamp: '2025-10-10T12:00:00Z' },
  ];
  const filtered = filterMovementsByMonthYear(list, 2026, 10);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].id, '1');
  assert.equal(filtered[1].id, '2');
});

test('summarizeMovements: correctly aggregates in/out and counts', () => {
  const sample = [
    { type: 'ENTRADA', quantity: 20 },
    { type: 'ENTRADA', quantity: 30 },
    { type: 'SALIDA', quantity: 15 },
    { type: 'AJUSTE', quantity: 50 },
  ];
  const summary = summarizeMovements(sample);
  assert.equal(summary.totalEntries, 2);
  assert.equal(summary.totalExits, 1);
  assert.equal(summary.totalAdjusts, 1);
  assert.equal(summary.totalQuantityIn, 50);
  assert.equal(summary.totalQuantityOut, 15);
  assert.equal(summary.totalTransactions, 4);
});

test('cleanBarcode: handles plain barcodes and QR URLs', () => {
  assert.equal(cleanBarcode('  7501020304050  '), '7501020304050');
  assert.equal(cleanBarcode('https://recimetales.com/articulos/SKU-9988'), 'SKU-9988');
  assert.equal(cleanBarcode('QR-ALM-10293'), 'QR-ALM-10293');
});
