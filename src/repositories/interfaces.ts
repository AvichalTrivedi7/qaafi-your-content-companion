// Repository Interfaces
// Abstract data access layer for easy persistence swapping

import {
  InventoryItem,
  Shipment,
  Reservation,
  ActivityLog,
  Company,
  ActivityType,
  ShipmentStatus,
  ReservationStatus,
  CompanyType,
  ReferenceType,
} from '@/domain/models';

// ============================================================================
// Base Repository Interface
// ============================================================================

export interface IBaseRepository<T> {
  findAll(): T[];
  findById(id: string): T | undefined;
  create(entity: T): T;
  update(id: string, updates: Partial<T>): T | undefined;
  delete(id: string): boolean;
}

// ============================================================================
// Inventory Repository Interface
// ============================================================================

export interface IInventoryRepository extends IBaseRepository<InventoryItem> {
  findBySku(sku: string): InventoryItem | undefined;
  findByCompany(companyId: string): InventoryItem[];
  findLowStock(companyId?: string): InventoryItem[];
  updateStockLevels(
    id: string,
    availableStock: number,
    reservedStock: number
  ): InventoryItem | undefined;
  softDelete(id: string): boolean;
}

// ============================================================================
// Shipment Repository Interface
// ============================================================================

export interface IShipmentRepository extends IBaseRepository<Shipment> {
  findByNumber(shipmentNumber: string): Shipment | undefined;
  findByCompany(companyId: string): Shipment[];
  findByStatus(status: ShipmentStatus, companyId?: string): Shipment[];
  updateStatus(
    id: string,
    status: ShipmentStatus,
    deliveredAt?: Date
  ): Shipment | undefined;
}

// ============================================================================
// Reservation Repository Interface
// ============================================================================

export interface IReservationRepository extends IBaseRepository<Reservation> {
  findByInventoryItem(inventoryItemId: string): Reservation[];
  findByShipment(shipmentId: string): Reservation[];
  findByStatus(status: ReservationStatus): Reservation[];
  findByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined;
  findActiveByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined;
  findFulfilledByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined;
  updateStatus(id: string, status: ReservationStatus): Reservation | undefined;
}

// ============================================================================
// Activity Repository Interface
// ============================================================================

export interface IActivityRepository {
  findAll(companyId?: string): ActivityLog[];
  findById(id: string): ActivityLog | undefined;
  findByType(type: ActivityType, companyId?: string): ActivityLog[];
  findByReference(
    referenceId: string,
    referenceType?: ReferenceType,
    companyId?: string
  ): ActivityLog[];
  findRecent(limit: number, companyId?: string): ActivityLog[];
  create(log: ActivityLog): ActivityLog;
  delete(id: string): boolean;
}

// ============================================================================
// Company Repository Interface
// ============================================================================

export interface ICompanyRepository extends IBaseRepository<Company> {
  findByAccessCode(accessCode: string): Company | undefined;
  findByType(type: CompanyType): Company[];
  findActive(): Company[];
  updateAccessCode(id: string, accessCode: string): Company | undefined;
}
