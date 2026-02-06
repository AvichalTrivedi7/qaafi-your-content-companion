// In-Memory Shipment Repository Implementation

import { Shipment, ShipmentStatus } from '@/domain/models';
import { mockShipments } from '@/domain/mockData';
import { IShipmentRepository } from './interfaces';

export class InMemoryShipmentRepository implements IShipmentRepository {
  private shipments: Shipment[] = [...mockShipments];

  findAll(): Shipment[] {
    return [...this.shipments];
  }

  findById(id: string): Shipment | undefined {
    return this.shipments.find(s => s.id === id);
  }

  findByNumber(shipmentNumber: string): Shipment | undefined {
    return this.shipments.find(s => s.shipmentNumber === shipmentNumber);
  }

  findByCompany(companyId: string): Shipment[] {
    return this.shipments.filter(s => s.companyId === companyId);
  }

  findByStatus(status: ShipmentStatus, companyId?: string): Shipment[] {
    let shipments = companyId ? this.findByCompany(companyId) : this.findAll();
    return shipments.filter(s => s.status === status);
  }

  create(entity: Shipment, _companyId?: string): Shipment {
    this.shipments.push(entity);
    return entity;
  }

  update(id: string, updates: Partial<Shipment>): Shipment | undefined {
    const index = this.shipments.findIndex(s => s.id === id);
    if (index === -1) return undefined;

    this.shipments[index] = {
      ...this.shipments[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.shipments[index];
  }

  updateStatus(
    id: string,
    status: ShipmentStatus,
    deliveredAt?: Date
  ): Shipment | undefined {
    const updates: Partial<Shipment> = { status };
    if (deliveredAt) {
      updates.deliveredAt = deliveredAt;
    }
    return this.update(id, updates);
  }

  delete(id: string): boolean {
    const index = this.shipments.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.shipments.splice(index, 1);
    return true;
  }

  // Helper to get count for generating shipment numbers
  getCount(): number {
    return this.shipments.length;
  }
}

// Singleton instance for the application
export const shipmentRepository = new InMemoryShipmentRepository();
