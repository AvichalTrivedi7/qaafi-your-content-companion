// Reservation Service - Centralized reservation business logic
import { Reservation, ReservationStatus } from '@/domain/models';
import { mockReservations } from '@/domain/mockData';
import { inventoryService } from './inventoryService';
import { activityService } from './activityService';

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

  /**
   * Creates a reservation by moving stock from available to reserved
   * This is called when a shipment is created
   */
  createReservation(inventoryItemId: string, shipmentId: string, quantity: number): boolean {
    const item = inventoryService.getItemById(inventoryItemId);
    if (!item) return false;

    // Reserve stock in inventory (moves from available to reserved)
    const success = inventoryService.reserveStock(inventoryItemId, quantity);
    if (!success) return false;

    const newReservation: Reservation = {
      id: `res-${Date.now()}-${inventoryItemId}`,
      inventoryItemId,
      shipmentId,
      quantity,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reservations.push(newReservation);

    // Log activity
    activityService.logActivity(
      'reservation_created',
      `Reserved ${quantity} ${item.unit} of ${item.name} for shipment`,
      newReservation.id,
      'reservation',
      { quantity, inventoryItemId, shipmentId }
    );

    return true;
  }

  /**
   * Fulfills a reservation when shipment is delivered
   * This permanently removes the reserved stock (already deducted from available)
   */
  fulfillReservation(inventoryItemId: string, shipmentId: string): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    const item = inventoryService.getItemById(inventoryItemId);
    
    // Fulfill in inventory (deduct from reserved - goods have left the warehouse)
    const success = inventoryService.fulfillReservation(inventoryItemId, reservation.quantity);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'fulfilled',
      updatedAt: new Date(),
    };

    // Log activity
    activityService.logActivity(
      'stock_out',
      `Dispatched ${reservation.quantity} ${item?.unit || 'units'} of ${item?.name || 'item'}`,
      inventoryItemId,
      'inventory',
      { quantity: reservation.quantity, shipmentId }
    );

    return true;
  }

  /**
   * Cancels a reservation (releases stock back to available)
   * This is called when a shipment is cancelled or delayed
   */
  cancelReservation(inventoryItemId: string, shipmentId: string): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    const item = inventoryService.getItemById(inventoryItemId);
    
    // Release back to available stock
    const success = inventoryService.releaseReservation(inventoryItemId, reservation.quantity);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'cancelled',
      updatedAt: new Date(),
    };

    // Log activity
    activityService.logActivity(
      'reservation_released',
      `Released ${reservation.quantity} ${item?.unit || 'units'} of ${item?.name || 'item'} back to available stock`,
      reservation.id,
      'reservation',
      { quantity: reservation.quantity, inventoryItemId, shipmentId }
    );

    return true;
  }

  getTotalReservedForItem(inventoryItemId: string): number {
    return this.getActiveReservations()
      .filter(res => res.inventoryItemId === inventoryItemId)
      .reduce((sum, res) => sum + res.quantity, 0);
  }
}

export const reservationService = new ReservationService();
