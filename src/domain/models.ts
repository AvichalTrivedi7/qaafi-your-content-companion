// Domain Models for Qaafi MVP

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';
export type ActivityType = 'stock_in' | 'stock_out' | 'shipment_created' | 'shipment_updated' | 'reservation_created' | 'reservation_released';
export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  availableStock: number;
  reservedStock: number;
  unit: string;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  customerName: string;
  destination: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  proofOfDelivery?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
}

export interface ShipmentItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
}

export interface Reservation {
  id: string;
  inventoryItemId: string;
  shipmentId: string;
  quantity: number;
  status: ReservationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActivityLog {
  id: string;
  type: ActivityType;
  description: string;
  referenceId?: string;
  referenceType?: 'inventory' | 'shipment' | 'reservation';
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// Computed types
export interface InventoryStats {
  totalProducts: number;
  totalAvailableStock: number;
  totalReservedStock: number;
  lowStockCount: number;
}

export interface ShipmentStats {
  totalShipments: number;
  pendingCount: number;
  inTransitCount: number;
  deliveredCount: number;
}

export interface DashboardStats {
  inventory: InventoryStats;
  shipments: ShipmentStats;
  recentActivities: ActivityLog[];
  lowStockItems: InventoryItem[];
}
