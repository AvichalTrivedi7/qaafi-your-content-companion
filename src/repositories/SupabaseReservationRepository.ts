// Supabase Reservation Repository Implementation

import { supabase } from '@/integrations/supabase/client';
import { Reservation, ReservationStatus } from '@/domain/models';
import { IReservationRepository } from './interfaces';

// Helper to convert DB row to domain model
function toDomainModel(row: any): Reservation {
  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    shipmentId: row.shipment_id,
    quantity: row.quantity,
    status: row.status as ReservationStatus,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper to convert domain model to DB row
function toDbRow(reservation: Reservation, companyId?: string): any {
  return {
    id: reservation.id,
    inventory_item_id: reservation.inventoryItemId,
    shipment_id: reservation.shipmentId,
    quantity: reservation.quantity,
    status: reservation.status,
    company_id: companyId,
  };
}

export class SupabaseReservationRepository implements IReservationRepository {
  private cache: Map<string, Reservation> = new Map();
  private companyIdCache: Map<string, string> = new Map(); // reservation id -> company id
  private allLoaded = false;

  findAll(): Reservation[] {
    if (!this.allLoaded) {
      this.loadAll();
    }
    return Array.from(this.cache.values());
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      this.cache.clear();
      this.companyIdCache.clear();
      data.forEach(row => {
        const reservation = toDomainModel(row);
        this.cache.set(reservation.id, reservation);
        if (row.company_id) {
          this.companyIdCache.set(reservation.id, row.company_id);
        }
      });
      this.allLoaded = true;
    }
  }

  findById(id: string): Reservation | undefined {
    return this.cache.get(id);
  }

  findByInventoryItem(inventoryItemId: string): Reservation[] {
    return Array.from(this.cache.values()).filter(r => r.inventoryItemId === inventoryItemId);
  }

  findByShipment(shipmentId: string): Reservation[] {
    return Array.from(this.cache.values()).filter(r => r.shipmentId === shipmentId);
  }

  findByStatus(status: ReservationStatus): Reservation[] {
    return Array.from(this.cache.values()).filter(r => r.status === status);
  }

  findByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return Array.from(this.cache.values()).find(
      r => r.inventoryItemId === inventoryItemId && r.shipmentId === shipmentId
    );
  }

  findActiveByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return Array.from(this.cache.values()).find(
      r => r.inventoryItemId === inventoryItemId && 
           r.shipmentId === shipmentId && 
           r.status === 'active'
    );
  }

  findFulfilledByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return Array.from(this.cache.values()).find(
      r => r.inventoryItemId === inventoryItemId && 
           r.shipmentId === shipmentId && 
           r.status === 'fulfilled'
    );
  }

  create(entity: Reservation): Reservation {
    this.cache.set(entity.id, entity);

    // Get company_id from the associated shipment
    supabase
      .from('shipments')
      .select('company_id')
      .eq('id', entity.shipmentId)
      .single()
      .then(({ data: shipmentData }) => {
        const companyId = shipmentData?.company_id;
        if (companyId) {
          this.companyIdCache.set(entity.id, companyId);
        }

        const dbRow = toDbRow(entity, companyId);
        supabase
          .from('reservations')
          .insert(dbRow)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to persist reservation:', error);
              this.cache.delete(entity.id);
            }
          });
      });

    return entity;
  }

  update(id: string, updates: Partial<Reservation>): Reservation | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;

    const updated: Reservation = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.cache.set(id, updated);

    const dbUpdates: any = {};
    if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    supabase
      .from('reservations')
      .update(dbUpdates)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update reservation:', error);
          this.cache.set(id, existing);
        }
      });

    return updated;
  }

  updateStatus(id: string, status: ReservationStatus): Reservation | undefined {
    return this.update(id, { status });
  }

  delete(id: string): boolean {
    const existed = this.cache.has(id);
    if (!existed) return false;

    const backup = this.cache.get(id);
    this.cache.delete(id);
    this.companyIdCache.delete(id);

    supabase
      .from('reservations')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete reservation:', error);
          if (backup) this.cache.set(id, backup);
        }
      });

    return true;
  }

  async initialize(): Promise<void> {
    await this.loadAll();
  }

  clearCache(): void {
    this.cache.clear();
    this.companyIdCache.clear();
    this.allLoaded = false;
  }
}
