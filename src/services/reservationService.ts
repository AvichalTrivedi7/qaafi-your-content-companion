// Reservation Service - Centralized reservation business logic
import { Reservation, ReservationStatus } from '@/domain/models';
import { mockReservations } from '@/domain/mockData';
import { inventoryService } from './inventoryService';

class ReservationService {
  private reservations: Reservation[] = [...mockReservations];

  getAllReservations(): Reservation[] {
    return [...this.reservations];
  }

  getReservationById(id: string): Reservation | undefined {
    return this.reservations.find(res => res.id === id);
  }

  getReservationsByInventoryItem(inventoryItemId: string): Reservation[] {
    return this.reservations.filter(res => res.inventoryItemId === inventoryItemId);
  }

  getReservationsByShipment(shipmentId: string): Reservation[] {
    return this.reservations.filter(res => res.shipmentId === shipmentId);
  }

  getActiveReservations(): Reservation[] {
    return this.reservations.filter(res => res.status === 'active');
  }

  createReservation(inventoryItemId: string, shipmentId: string, quantity: number): boolean {
    // Reserve stock in inventory
    const success = inventoryService.reserveStock(inventoryItemId, quantity);
    if (!success) return false;

    const newReservation: Reservation = {
      id: `res-${Date.now()}`,
      inventoryItemId,
      shipmentId,
      quantity,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reservations.push(newReservation);
    return true;
  }

  fulfillReservation(inventoryItemId: string, shipmentId: string): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    
    // Fulfill in inventory (deduct from reserved)
    const success = inventoryService.fulfillReservation(inventoryItemId, reservation.quantity);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'fulfilled',
      updatedAt: new Date(),
    };

    return true;
  }

  cancelReservation(inventoryItemId: string, shipmentId: string): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    
    // Release back to available stock
    const success = inventoryService.releaseReservation(inventoryItemId, reservation.quantity);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'cancelled',
      updatedAt: new Date(),
    };

    return true;
  }

  getTotalReservedForItem(inventoryItemId: string): number {
    return this.getActiveReservations()
      .filter(res => res.inventoryItemId === inventoryItemId)
      .reduce((sum, res) => sum + res.quantity, 0);
  }
}

export const reservationService = new ReservationService();
