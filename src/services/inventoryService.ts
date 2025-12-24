// Inventory Service - Centralized inventory business logic
import { InventoryItem, InventoryStats, ActivityLog } from '@/domain/models';
import { mockInventoryItems, mockActivityLogs } from '@/domain/mockData';

class InventoryService {
  private items: InventoryItem[] = [...mockInventoryItems];

  getAllItems(): InventoryItem[] {
    return [...this.items];
  }

  getItemById(id: string): InventoryItem | undefined {
    return this.items.find(item => item.id === id);
  }

  getItemBySku(sku: string): InventoryItem | undefined {
    return this.items.find(item => item.sku === sku);
  }

  getLowStockItems(): InventoryItem[] {
    return this.items.filter(item => item.availableStock <= item.lowStockThreshold);
  }

  getStats(): InventoryStats {
    return {
      totalProducts: this.items.length,
      totalAvailableStock: this.items.reduce((sum, item) => sum + item.availableStock, 0),
      totalReservedStock: this.items.reduce((sum, item) => sum + item.reservedStock, 0),
      lowStockCount: this.getLowStockItems().length,
    };
  }

  getTotalStock(item: InventoryItem): number {
    return item.availableStock + item.reservedStock;
  }

  isLowStock(item: InventoryItem): boolean {
    return item.availableStock <= item.lowStockThreshold;
  }

  stockIn(itemId: string, quantity: number): InventoryItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;

    this.items[index] = {
      ...this.items[index],
      availableStock: this.items[index].availableStock + quantity,
      updatedAt: new Date(),
    };

    return this.items[index];
  }

  stockOut(itemId: string, quantity: number): InventoryItem | null {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return null;

    const item = this.items[index];
    if (item.availableStock < quantity) return null;

    this.items[index] = {
      ...item,
      availableStock: item.availableStock - quantity,
      updatedAt: new Date(),
    };

    return this.items[index];
  }

  reserveStock(itemId: string, quantity: number): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

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

  releaseReservation(itemId: string, quantity: number): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

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

  fulfillReservation(itemId: string, quantity: number): boolean {
    const index = this.items.findIndex(item => item.id === itemId);
    if (index === -1) return false;

    const item = this.items[index];
    if (item.reservedStock < quantity) return false;

    this.items[index] = {
      ...item,
      reservedStock: item.reservedStock - quantity,
      updatedAt: new Date(),
    };

    return true;
  }

  getActivityLogs(itemId?: string): ActivityLog[] {
    const logs = [...mockActivityLogs].filter(log => log.referenceType === 'inventory');
    if (itemId) {
      return logs.filter(log => log.referenceId === itemId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}

export const inventoryService = new InventoryService();
