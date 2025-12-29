// Domain Models for Qaafi MVP
// All types are explicitly defined for production safety

// ============================================================================
// Enums & Union Types
// ============================================================================

export const SHIPMENT_STATUSES = ['pending', 'in_transit', 'delivered', 'cancelled'] as const;
export type ShipmentStatus = typeof SHIPMENT_STATUSES[number];

export const ACTIVITY_TYPES = [
  'stock_in',
  'stock_out',
  'shipment_created',
  'shipment_updated',
  'reservation_created',
  'reservation_released'
] as const;
export type ActivityType = typeof ACTIVITY_TYPES[number];

export const RESERVATION_STATUSES = ['active', 'fulfilled', 'cancelled'] as const;
export type ReservationStatus = typeof RESERVATION_STATUSES[number];

export const COMPANY_TYPES = ['supplier', 'wholesaler', 'retailer'] as const;
export type CompanyType = typeof COMPANY_TYPES[number];

export const REFERENCE_TYPES = ['inventory', 'shipment', 'reservation'] as const;
export type ReferenceType = typeof REFERENCE_TYPES[number];

// ============================================================================
// Core Entities
// ============================================================================

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  accessCode: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description?: string;
  availableStock: number;
  reservedStock: number;
  unit: string;
  lowStockThreshold: number;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShipmentItem {
  inventoryItemId: string;
  inventoryItemName: string;
  quantity: number;
}

export interface Shipment {
  id: string;
  shipmentNumber: string;
  customerName: string;
  destination: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  proofOfDelivery?: string;
  companyId?: string;
  createdAt: Date;
  updatedAt: Date;
  deliveredAt?: Date;
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
  referenceType?: ReferenceType;
  metadata?: Record<string, unknown>;
  companyId?: string;
  createdAt: Date;
}

// ============================================================================
// Statistics & Computed Types
// ============================================================================

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
  delayedCount: number;
}

export interface CompanyStats {
  totalCompanies: number;
  supplierCount: number;
  wholesalerCount: number;
  retailerCount: number;
  activeCount: number;
}

// ============================================================================
// Dashboard Types
// ============================================================================

export interface DailyMovement {
  stockIn: number;
  stockOut: number;
  date: Date;
}

export interface DeliveryMetrics {
  averageDeliveryTimeHours: number;
  totalDelivered: number;
}

export interface DashboardStats {
  inventory: InventoryStats;
  shipments: ShipmentStats;
  recentActivities: ActivityLog[];
  lowStockItems: InventoryItem[];
  delayedShipments: Shipment[];
  todayMovement: DailyMovement;
  deliveryMetrics: DeliveryMetrics;
}
