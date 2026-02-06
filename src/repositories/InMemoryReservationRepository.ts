// In-Memory Reservation Repository Implementation

import { Reservation, ReservationStatus } from '@/domain/models';
import { mockReservations } from '@/domain/mockData';
import { IReservationRepository } from './interfaces';

export class InMemoryReservationRepository implements IReservationRepository {
  private reservations: Reservation[] = [...mockReservations];

  findAll(): Reservation[] {
    return [...this.reservations];
  }

  findById(id: string): Reservation | undefined {
    return this.reservations.find(r => r.id === id);
  }

  findByInventoryItem(inventoryItemId: string): Reservation[] {
    return this.reservations.filter(r => r.inventoryItemId === inventoryItemId);
  }

  findByShipment(shipmentId: string): Reservation[] {
    return this.reservations.filter(r => r.shipmentId === shipmentId);
  }

  findByStatus(status: ReservationStatus): Reservation[] {
    return this.reservations.filter(r => r.status === status);
  }

  findByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return this.reservations.find(
      r => r.inventoryItemId === inventoryItemId && r.shipmentId === shipmentId
    );
  }

  findActiveByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return this.reservations.find(
      r =>
        r.inventoryItemId === inventoryItemId &&
        r.shipmentId === shipmentId &&
        r.status === 'active'
    );
  }

  findFulfilledByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): Reservation | undefined {
    return this.reservations.find(
      r =>
        r.inventoryItemId === inventoryItemId &&
        r.shipmentId === shipmentId &&
        r.status === 'fulfilled'
    );
  }

  create(entity: Reservation, _companyId?: string): Reservation {
    this.reservations.push(entity);
    return entity;
  }

  update(id: string, updates: Partial<Reservation>): Reservation | undefined {
    const index = this.reservations.findIndex(r => r.id === id);
    if (index === -1) return undefined;

    this.reservations[index] = {
      ...this.reservations[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.reservations[index];
  }

  updateStatus(id: string, status: ReservationStatus): Reservation | undefined {
    return this.update(id, { status });
  }

  delete(id: string): boolean {
    const index = this.reservations.findIndex(r => r.id === id);
    if (index === -1) return false;
    this.reservations.splice(index, 1);
    return true;
  }

  // Additional helper for removing by composite key
  deleteByInventoryAndShipment(
    inventoryItemId: string,
    shipmentId: string
  ): boolean {
    const index = this.reservations.findIndex(
      r => r.inventoryItemId === inventoryItemId && r.shipmentId === shipmentId
    );
    if (index === -1) return false;
    this.reservations.splice(index, 1);
    return true;
  }
}

// Singleton instance for the application
export const reservationRepository = new InMemoryReservationRepository();
