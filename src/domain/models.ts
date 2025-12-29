// Domain Models for Qaafi MVP

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'cancelled';
export type ActivityType = 'stock_in' | 'stock_out' | 'shipment_created' | 'shipment_updated' | 'reservation_created' | 'reservation_released';
export type ReservationStatus = 'active' | 'fulfilled' | 'cancelled';
export type CompanyType = 'supplier' | 'wholesaler' | 'retailer';

export interface Company {
  id: string;
  name: string;
  type: CompanyType;
  contactEmail: string;
  contactPhone?: string;
  address?: string;
  accessCode: string; // Simple access code for external view
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
  companyId?: string; // Associated company
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
  companyId?: string; // Associated company
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
  companyId?: string; // Associated company
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
  delayedCount: number;
}

// Dashboard-specific metric types
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

// Company statistics for admin dashboard
export interface CompanyStats {
  totalCompanies: number;
  supplierCount: number;
  wholesalerCount: number;
  retailerCount: number;
  activeCount: number;
}
