// Supabase Inventory Repository Implementation

import { supabase } from '@/integrations/supabase/client';
import { InventoryItem } from '@/domain/models';
import { IInventoryRepository } from './interfaces';

// Helper to convert DB row to domain model
function toDomainModel(row: any): InventoryItem {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description || undefined,
    availableStock: row.available_stock,
    reservedStock: row.reserved_stock,
    unit: row.unit as InventoryItem['unit'],
    lowStockThreshold: row.low_stock_threshold,
    companyId: row.company_id,
    isDeleted: row.is_deleted || false,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper to convert domain model to DB row
function toDbRow(item: InventoryItem): any {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    description: item.description,
    available_stock: item.availableStock,
    reserved_stock: item.reservedStock,
    unit: item.unit,
    low_stock_threshold: item.lowStockThreshold,
    company_id: item.companyId,
  };
}

export class SupabaseInventoryRepository implements IInventoryRepository {
  private cache: Map<string, InventoryItem> = new Map();
  private allLoaded = false;

  findAll(): InventoryItem[] {
    // Synchronous - return cached data (already filtered for is_deleted=false), trigger async refresh
    if (!this.allLoaded) {
      this.loadAll();
    }
    // Additional filter in case of stale cache
    return Array.from(this.cache.values()).filter(item => !item.isDeleted);
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      this.cache.clear();
      data.forEach(row => {
        const item = toDomainModel(row);
        this.cache.set(item.id, item);
      });
      this.allLoaded = true;
    }
  }

  findById(id: string): InventoryItem | undefined {
    const item = this.cache.get(id);
    // Double-check is_deleted in case cache is stale
    if (item?.isDeleted) return undefined;
    return item;
  }

  findBySku(sku: string): InventoryItem | undefined {
    return Array.from(this.cache.values()).find(item => item.sku === sku && !item.isDeleted);
  }

  findByCompany(companyId: string): InventoryItem[] {
    return Array.from(this.cache.values()).filter(item => item.companyId === companyId && !item.isDeleted);
  }

  findLowStock(companyId?: string): InventoryItem[] {
    let items = Array.from(this.cache.values()).filter(item => !item.isDeleted);
    if (companyId) {
      items = items.filter(item => item.companyId === companyId);
    }
    return items.filter(item => item.availableStock <= item.lowStockThreshold);
  }

  create(entity: InventoryItem): InventoryItem {
    // Add to cache immediately
    this.cache.set(entity.id, entity);

    // Async persist to database
    const dbRow = toDbRow(entity);
    supabase
      .from('inventory_items')
      .insert(dbRow)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist inventory item:', error);
          this.cache.delete(entity.id);
        }
      });

    return entity;
  }

  update(id: string, updates: Partial<InventoryItem>): InventoryItem | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;

    const updated: InventoryItem = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.cache.set(id, updated);

    // Async persist
    const dbUpdates: any = {};
    if (updates.sku !== undefined) dbUpdates.sku = updates.sku;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.availableStock !== undefined) dbUpdates.available_stock = updates.availableStock;
    if (updates.reservedStock !== undefined) dbUpdates.reserved_stock = updates.reservedStock;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    if (updates.lowStockThreshold !== undefined) dbUpdates.low_stock_threshold = updates.lowStockThreshold;

    supabase
      .from('inventory_items')
      .update(dbUpdates)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update inventory item:', error);
          this.cache.set(id, existing);
        }
      });

    return updated;
  }

  updateStockLevels(
    id: string,
    availableStock: number,
    reservedStock: number
  ): InventoryItem | undefined {
    return this.update(id, { availableStock, reservedStock });
  }

  delete(id: string): boolean {
    const existed = this.cache.has(id);
    if (!existed) return false;

    const backup = this.cache.get(id);
    this.cache.delete(id);

    supabase
      .from('inventory_items')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete inventory item:', error);
          if (backup) this.cache.set(id, backup);
        }
      });

    return true;
  }

  softDelete(id: string): boolean {
    const existing = this.cache.get(id);
    if (!existing) return false;

    // Remove from cache (soft deleted items are hidden)
    this.cache.delete(id);

    // Async persist soft delete
    supabase
      .from('inventory_items')
      .update({ is_deleted: true })
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to soft delete inventory item:', error);
          if (existing) this.cache.set(id, existing);
        }
      });

    return true;
  }

  // Async method for initial data loading
  async initialize(): Promise<void> {
    await this.loadAll();
  }

  // Clear cache (useful for testing or forcing refresh)
  clearCache(): void {
    this.cache.clear();
    this.allLoaded = false;
  }
}
