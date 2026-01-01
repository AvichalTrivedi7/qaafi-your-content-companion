// In-Memory Inventory Repository Implementation

import { InventoryItem } from '@/domain/models';
import { mockInventoryItems } from '@/domain/mockData';
import { IInventoryRepository } from './interfaces';

export class InMemoryInventoryRepository implements IInventoryRepository {
  private items: InventoryItem[] = [...mockInventoryItems];

  findAll(): InventoryItem[] {
    return [...this.items];
  }

  findById(id: string): InventoryItem | undefined {
    return this.items.find(item => item.id === id);
  }

  findBySku(sku: string): InventoryItem | undefined {
    return this.items.find(item => item.sku === sku);
  }

  findByCompany(companyId: string): InventoryItem[] {
    return this.items.filter(item => item.companyId === companyId);
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
}

// Singleton instance for the application
export const inventoryRepository = new InMemoryInventoryRepository();
