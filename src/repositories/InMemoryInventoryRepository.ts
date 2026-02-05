// In-Memory Inventory Repository Implementation

import { InventoryItem } from '@/domain/models';
import { mockInventoryItems } from '@/domain/mockData';
import { IInventoryRepository } from './interfaces';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private items: InventoryItem[] = [...mockInventoryItems];

  findAll(): InventoryItem[] {
    return this.items.filter(item => !item.isDeleted);
  }

  findById(id: string): InventoryItem | undefined {
    const item = this.items.find(item => item.id === id);
    if (item?.isDeleted) return undefined;
    return item;
  }

  findBySku(sku: string): InventoryItem | undefined {
    const item = this.items.find(item => item.sku === sku && !item.isDeleted);
    return item;
  }

  findByCompany(companyId: string): InventoryItem[] {
    return this.items.filter(item => item.companyId === companyId && !item.isDeleted);
  }

  findLowStock(companyId?: string): InventoryItem[] {
    let items = companyId ? this.findByCompany(companyId) : this.findAll();
    return items.filter(item => item.availableStock <= item.lowStockThreshold);
  }

  create(entity: InventoryItem): InventoryItem {
    this.items.push(entity);
    return entity;
  }

  update(id: string, updates: Partial<InventoryItem>): InventoryItem | undefined {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return undefined;

    this.items[index] = {
      ...this.items[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.items[index];
  }

  updateStockLevels(
    id: string,
    availableStock: number,
    reservedStock: number
  ): InventoryItem | undefined {
    return this.update(id, { availableStock, reservedStock });
  }

  delete(id: string): boolean {
    const index = this.items.findIndex(item => item.id === id);
    if (index === -1) return false;
    this.items.splice(index, 1);
    return true;
  }

  softDelete(id: string): boolean {
    const item = this.findById(id);
    if (!item) return false;
    this.update(id, { isDeleted: true });
    return true;
  }
}

// Singleton instance for the application
export const inventoryRepository = new InMemoryInventoryRepository();
