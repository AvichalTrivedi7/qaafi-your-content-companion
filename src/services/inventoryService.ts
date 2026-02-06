// Inventory Service - Centralized inventory business logic
// All methods require companyId for data isolation
// Supports transactional rollback operations
// Uses repository pattern for data access

import { InventoryItem, InventoryStats, ActivityLog, ActivityType, InventoryUnit } from '@/domain/models';
import { 
  IInventoryRepository, 
  IActivityRepository, 
  inventoryRepository as defaultInventoryRepo,
  activityRepository as defaultActivityRepo 
} from '@/repositories';

export interface CreateInventoryItemInput {
  sku: string;
  name: string;
  description?: string;
  unit: InventoryUnit;
  lowStockThreshold: number;
  companyId: string;
}

export interface UpdateInventoryItemInput {
  name?: string;
  description?: string;
  unit?: InventoryUnit;
  lowStockThreshold?: number;
}

export class InventoryService {
  constructor(
    private inventoryRepo: IInventoryRepository = defaultInventoryRepo,
    private activityRepo: IActivityRepository = defaultActivityRepo
  ) {}

  // Get all items for a specific company (excludes deleted)
  getAllItems(companyId?: string): InventoryItem[] {
    if (!companyId) return this.inventoryRepo.findAll().filter(i => !i.isDeleted);
    return this.inventoryRepo.findByCompany(companyId).filter(i => !i.isDeleted);
  }

  // Get item by ID, scoped to company
  getItemById(id: string, companyId?: string): InventoryItem | undefined {
    const item = this.inventoryRepo.findById(id);
    if (!item || item.isDeleted) return undefined;
    if (companyId && item.companyId !== companyId) return undefined;
    return item;
  }

  // Get item by SKU, scoped to company
  getItemBySku(sku: string, companyId?: string): InventoryItem | undefined {
    const item = this.inventoryRepo.findBySku(sku);
    if (!item || item.isDeleted) return undefined;
    if (companyId && item.companyId !== companyId) return undefined;
    return item;
  }

  // Get low stock items for a specific company
  getLowStockItems(companyId?: string): InventoryItem[] {
    return this.inventoryRepo.findLowStock(companyId).filter(i => !i.isDeleted);
  }

  // Get stats for a specific company
  getStats(companyId?: string): InventoryStats {
    const items = this.getAllItems(companyId);
    return {
      totalProducts: items.length,
      totalAvailableStock: items.reduce((sum, item) => sum + item.availableStock, 0),
      totalReservedStock: items.reduce((sum, item) => sum + item.reservedStock, 0),
      lowStockCount: this.getLowStockItems(companyId).length,
    };
  }

  getTotalStock(item: InventoryItem): number {
    return item.availableStock + item.reservedStock;
  }

  isLowStock(item: InventoryItem): boolean {
    return item.availableStock <= item.lowStockThreshold;
  }

  // Create a new inventory item
  createItem(input: CreateInventoryItemInput): InventoryItem {
    const newItem: InventoryItem = {
      id: crypto.randomUUID(),
      sku: input.sku,
      name: input.name,
      description: input.description,
      unit: input.unit,
      availableStock: 0,
      reservedStock: 0,
      lowStockThreshold: input.lowStockThreshold,
      companyId: input.companyId,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = this.inventoryRepo.create(newItem);

    // Log activity
    this.activityRepo.create({
      id: crypto.randomUUID(),
      type: ActivityType.INVENTORY_IN,
      description: `Created new product: ${input.name}`,
      referenceId: created.id,
      referenceType: 'inventory',
      companyId: input.companyId,
      metadata: { action: 'create', sku: input.sku },
      createdAt: new Date(),
    });

    return created;
  }

  // Update an inventory item
  updateItem(id: string, updates: UpdateInventoryItemInput, companyId: string): InventoryItem | null {
    const item = this.getItemById(id, companyId);
    if (!item) return null;

    const updated = this.inventoryRepo.update(id, updates);
    if (!updated) return null;

    // Log activity with INVENTORY_UPDATED type
    this.activityRepo.create({
      id: crypto.randomUUID(),
      type: ActivityType.INVENTORY_UPDATED,
      description: `Updated product: ${updated.name}`,
      referenceId: id,
      referenceType: 'inventory',
      companyId,
      metadata: { action: 'update', changes: updates },
      createdAt: new Date(),
    });

    return updated;
  }

  // Soft delete an inventory item
  deleteItem(id: string, companyId: string): boolean {
    const item = this.getItemById(id, companyId);
    if (!item) return false;

    const success = this.inventoryRepo.softDelete(id);
    if (!success) return false;

    // Log activity
    this.activityRepo.create({
      id: crypto.randomUUID(),
      type: ActivityType.INVENTORY_OUT,
      description: `Removed product: ${item.name}`,
      referenceId: id,
      referenceType: 'inventory',
      companyId,
      metadata: { action: 'delete', sku: item.sku },
      createdAt: new Date(),
    });

    return true;
  }

  // Stock in for a specific company's item
  stockIn(itemId: string, quantity: number, companyId?: string): InventoryItem | null {
    const item = this.getItemById(itemId, companyId);
    if (!item) return null;

    const updated = this.inventoryRepo.update(itemId, {
      availableStock: item.availableStock + quantity,
    });

    if (updated && companyId) {
      this.activityRepo.create({
        id: crypto.randomUUID(),
        type: ActivityType.INVENTORY_IN,
        description: `Stock in: +${quantity} ${item.unit} of ${item.name}`,
        referenceId: itemId,
        referenceType: 'inventory',
        companyId,
        metadata: { quantity, action: 'stock_in' },
        createdAt: new Date(),
      });
    }

    return updated || null;
  }

  // Stock out for a specific company's item
  stockOut(itemId: string, quantity: number, companyId?: string): InventoryItem | null {
    const item = this.getItemById(itemId, companyId);
    if (!item) return null;
    if (item.availableStock < quantity) return null;

    const updated = this.inventoryRepo.update(itemId, {
      availableStock: item.availableStock - quantity,
    });

    if (updated && companyId) {
      this.activityRepo.create({
        id: crypto.randomUUID(),
        type: ActivityType.INVENTORY_OUT,
        description: `Stock out: -${quantity} ${item.unit} of ${item.name}`,
        referenceId: itemId,
        referenceType: 'inventory',
        companyId,
        metadata: { quantity, action: 'stock_out' },
        createdAt: new Date(),
      });
    }

    return updated || null;
  }

  // Reserve stock for a specific company's item
  reserveStock(itemId: string, quantity: number, companyId?: string): boolean {
    const item = this.getItemById(itemId, companyId);
    if (!item) return false;
    if (item.availableStock < quantity) return false;

    const updated = this.inventoryRepo.updateStockLevels(
      itemId,
      item.availableStock - quantity,
      item.reservedStock + quantity
    );

    return !!updated;
  }

  // Release reservation for a specific company's item
  releaseReservation(itemId: string, quantity: number, companyId?: string): boolean {
    const item = this.getItemById(itemId, companyId);
    if (!item) return false;
    if (item.reservedStock < quantity) return false;

    const updated = this.inventoryRepo.updateStockLevels(
      itemId,
      item.availableStock + quantity,
      item.reservedStock - quantity
    );

    return !!updated;
  }

  // Fulfill reservation for a specific company's item
  fulfillReservation(itemId: string, quantity: number, companyId?: string): boolean {
    const item = this.getItemById(itemId, companyId);
    if (!item) return false;
    if (item.reservedStock < quantity) return false;

    const updated = this.inventoryRepo.updateStockLevels(
      itemId,
      item.availableStock,
      item.reservedStock - quantity
    );

    return !!updated;
  }

  /**
   * Restores reserved stock (for rollback after fulfillment)
   * Adds quantity back to reserved stock pool
   */
  restoreReservedStock(itemId: string, quantity: number, companyId?: string): boolean {
    const item = this.getItemById(itemId, companyId);
    if (!item) return false;

    const updated = this.inventoryRepo.updateStockLevels(
      itemId,
      item.availableStock,
      item.reservedStock + quantity
    );

    return !!updated;
  }

  /**
   * Directly sets stock levels (for rollback purposes)
   * Use with caution - bypasses normal validation
   */
  setStockLevels(
    itemId: string,
    availableStock: number,
    reservedStock: number,
    companyId?: string
  ): boolean {
    const item = this.getItemById(itemId, companyId);
    if (!item) return false;

    const updated = this.inventoryRepo.updateStockLevels(
      itemId,
      availableStock,
      reservedStock
    );

    return !!updated;
  }

  // Get activity logs for a specific company
  getActivityLogs(companyId?: string, itemId?: string): ActivityLog[] {
    let logs = this.activityRepo.findAll(companyId).filter(
      log => log.referenceType === 'inventory'
    );

    if (itemId) {
      logs = logs.filter(log => log.referenceId === itemId);
    }

    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

// Default singleton instance
export const inventoryService = new InventoryService();
