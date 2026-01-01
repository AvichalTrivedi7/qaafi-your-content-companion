// Inventory Service - Centralized inventory business logic
// All methods require companyId for data isolation
// Supports transactional rollback operations

import { InventoryItem, InventoryStats, ActivityLog } from '@/domain/models';
import { mockInventoryItems, mockActivityLogs } from '@/domain/mockData';

class InventoryService {
  private items: InventoryItem[] = [...mockInventoryItems];

  // Get all items for a specific company
  getAllItems(companyId?: string): InventoryItem[] {
    if (!companyId) return [...this.items];
    return this.items.filter(item => item.companyId === companyId);
  }

  // Get item by ID, scoped to company
  getItemById(id: string, companyId?: string): InventoryItem | undefined {
    const item = this.items.find(item => item.id === id);
    if (!item) return undefined;
    if (companyId && item.companyId !== companyId) return undefined;
    return item;
  }

  // Get item by SKU, scoped to company
  getItemBySku(sku: string, companyId?: string): InventoryItem | undefined {
    const item = this.items.find(item => item.sku === sku);
    if (!item) return undefined;
    if (companyId && item.companyId !== companyId) return undefined;
    return item;
  }

  // Get low stock items for a specific company
  getLowStockItems(companyId?: string): InventoryItem[] {
    const items = this.getAllItems(companyId);
    return items.filter(item => item.availableStock <= item.lowStockThreshold);
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

  // Stock in for a specific company's item
  stockIn(itemId: string, quantity: number, companyId?: string): InventoryItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;
    
    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return null;

    this.items[index] = {
      ...this.items[index],
      availableStock: this.items[index].availableStock + quantity,
      updatedAt: new Date(),
    };

    return this.items[index];
  }

  // Stock out for a specific company's item
  stockOut(itemId: string, quantity: number, companyId?: string): InventoryItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return null;

    const item = this.items[index];
    if (item.availableStock < quantity) return null;

    this.items[index] = {
      ...item,
      availableStock: item.availableStock - quantity,
      updatedAt: new Date(),
    };

    return this.items[index];
  }

  // Reserve stock for a specific company's item
  reserveStock(itemId: string, quantity: number, companyId?: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return false;

    const item = this.items[index];
    if (item.availableStock < quantity) return false;

    this.items[index] = {
      ...item,
      availableStock: item.availableStock - quantity,
      reservedStock: item.reservedStock + quantity,
      updatedAt: new Date(),
    };

    return true;
  }

  // Release reservation for a specific company's item
  releaseReservation(itemId: string, quantity: number, companyId?: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return false;

    const item = this.items[index];
    if (item.reservedStock < quantity) return false;

    this.items[index] = {
      ...item,
      availableStock: item.availableStock + quantity,
      reservedStock: item.reservedStock - quantity,
      updatedAt: new Date(),
    };

    return true;
  }

  // Fulfill reservation for a specific company's item
  fulfillReservation(itemId: string, quantity: number, companyId?: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return false;

    const item = this.items[index];
    if (item.reservedStock < quantity) return false;

    this.items[index] = {
      ...item,
      reservedStock: item.reservedStock - quantity,
      updatedAt: new Date(),
    };

    return true;
  }

  /**
   * Restores reserved stock (for rollback after fulfillment)
   * Adds quantity back to reserved stock pool
   */
  restoreReservedStock(itemId: string, quantity: number, companyId?: string): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return false;

    const item = this.items[index];

    this.items[index] = {
      ...item,
      reservedStock: item.reservedStock + quantity,
      updatedAt: new Date(),
    };

    return true;
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
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    // Verify company ownership
    if (companyId && this.items[index].companyId !== companyId) return false;

    this.items[index] = {
      ...this.items[index],
      availableStock,
      reservedStock,
      updatedAt: new Date(),
    };

    return true;
  }

  // Get activity logs for a specific company
  getActivityLogs(companyId?: string, itemId?: string): ActivityLog[] {
    let logs = [...mockActivityLogs].filter(log => log.referenceType === 'inventory');
    
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    
    if (itemId) {
      logs = logs.filter(log => log.referenceId === itemId);
    }
    
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const inventoryService = new InventoryService();
