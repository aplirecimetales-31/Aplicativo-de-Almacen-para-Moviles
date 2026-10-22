export type UserRole = 'admin' | 'supervisor' | 'operator';

export type MovementType = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'MERMA';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  photoURL?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  location: string;
  quantity: number;
  minQuantity: number;
  unit: string;
  unitPrice: number;
  description: string;
  lastUpdated: string;
  updatedBy: string;
}

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  barcode: string;
  type: MovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  reference: string;
  performedBy: string;
  performedByRole: UserRole | string;
  timestamp: string;
}

export interface SoundFeedbackOptions {
  soundEnabled?: boolean;
  vibrateEnabled?: boolean;
}

export interface QuickScanAction {
  type: 'lookup' | 'in' | 'out' | 'count';
  stepQuantity?: number;
}
