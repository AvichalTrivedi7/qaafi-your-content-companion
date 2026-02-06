// Supabase Shipment Repository Implementation

import { supabase } from '@/integrations/supabase/client';
import { Shipment, ShipmentStatus, ShipmentItem } from '@/domain/models';
import { IShipmentRepository } from './interfaces';

// Helper to convert DB row to domain model
function toDomainModel(row: any): Shipment {
  return {
    id: row.id,
    shipmentNumber: row.shipment_number,
    customerName: row.customer_name,
    destination: row.destination,
    status: row.status as ShipmentStatus,
    items: (row.items || []) as ShipmentItem[],
    proofOfDelivery: row.proof_of_delivery || undefined,
    companyId: row.company_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    deliveredAt: row.delivered_at ? new Date(row.delivered_at) : undefined,
  };
}

// Helper to convert domain model to DB row
function toDbRow(shipment: Shipment): any {
  return {
    id: shipment.id,
    shipment_number: shipment.shipmentNumber,
    customer_name: shipment.customerName,
    destination: shipment.destination,
    status: shipment.status,
    items: shipment.items,
    proof_of_delivery: shipment.proofOfDelivery,
    company_id: shipment.companyId,
    delivered_at: shipment.deliveredAt?.toISOString(),
  };
}

export class SupabaseShipmentRepository implements IShipmentRepository {
  private cache: Map<string, Shipment> = new Map();
  private allLoaded = false;
  private count = 0;

  findAll(): Shipment[] {
    if (!this.allLoaded) {
      this.loadAll();
    }
    return Array.from(this.cache.values());
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('shipments')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      this.cache.clear();
      data.forEach(row => {
        const shipment = toDomainModel(row);
        this.cache.set(shipment.id, shipment);
      });
      this.count = data.length;
      this.allLoaded = true;
    }
  }

  findById(id: string): Shipment | undefined {
    return this.cache.get(id);
  }

  findByNumber(shipmentNumber: string): Shipment | undefined {
    return Array.from(this.cache.values()).find(s => s.shipmentNumber === shipmentNumber);
  }

  findByCompany(companyId: string): Shipment[] {
    return Array.from(this.cache.values()).filter(s => s.companyId === companyId);
  }

  findByStatus(status: ShipmentStatus, companyId?: string): Shipment[] {
    let shipments = Array.from(this.cache.values()).filter(s => s.status === status);
    if (companyId) {
      shipments = shipments.filter(s => s.companyId === companyId);
    }
    return shipments;
  }

  create(entity: Shipment, _companyId?: string): Shipment {
    this.cache.set(entity.id, entity);
    this.count++;

    const dbRow = toDbRow(entity);
    supabase
      .from('shipments')
      .insert(dbRow)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist shipment:', error);
          this.cache.delete(entity.id);
          this.count--;
        }
      });

    return entity;
  }

  update(id: string, updates: Partial<Shipment>): Shipment | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;

    const updated: Shipment = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.cache.set(id, updated);

    const dbUpdates: any = {};
    if (updates.shipmentNumber !== undefined) dbUpdates.shipment_number = updates.shipmentNumber;
    if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
    if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.items !== undefined) dbUpdates.items = updates.items;
    if (updates.proofOfDelivery !== undefined) dbUpdates.proof_of_delivery = updates.proofOfDelivery;
    if (updates.deliveredAt !== undefined) dbUpdates.delivered_at = updates.deliveredAt?.toISOString();

    supabase
      .from('shipments')
      .update(dbUpdates)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update shipment:', error);
          this.cache.set(id, existing);
        }
      });

    return updated;
  }

  updateStatus(
    id: string,
    status: ShipmentStatus,
    deliveredAt?: Date
  ): Shipment | undefined {
    return this.update(id, { status, deliveredAt });
  }

  delete(id: string): boolean {
    const existed = this.cache.has(id);
    if (!existed) return false;

    const backup = this.cache.get(id);
    this.cache.delete(id);
    this.count--;

    supabase
      .from('shipments')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete shipment:', error);
          if (backup) {
            this.cache.set(id, backup);
            this.count++;
          }
        }
      });

    return true;
  }

  getCount(): number {
    return this.count;
  }

  async initialize(): Promise<void> {
    await this.loadAll();
  }

  clearCache(): void {
    this.cache.clear();
    this.allLoaded = false;
    this.count = 0;
  }
}
