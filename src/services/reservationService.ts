// Reservation Service - Centralized reservation business logic
// All methods require companyId for data isolation
// Supports transactional rollback operations

import { Reservation, ActivityType } from '@/domain/models';
import { mockReservations } from '@/domain/mockData';
import { inventoryService } from './inventoryService';
import { activityService } from './activityService';

class ReservationService {
  private reservations: Reservation[] = [...mockReservations];

  // Get all reservations (internal use - reservations don't have companyId directly)
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
   * Verifies inventory item belongs to the specified company
   */
  createReservation(
    inventoryItemId: string, 
    shipmentId: string, 
    quantity: number,
    companyId?: string
  ): boolean {
    const item = inventoryService.getItemById(inventoryItemId, companyId);
    if (!item) return false;

    // Reserve stock in inventory (moves from available to reserved)
    const success = inventoryService.reserveStock(inventoryItemId, quantity, companyId);
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

    // Log activity with company association
    activityService.logActivity(
      ActivityType.RESERVATION_CREATED,
      `Reserved ${quantity} ${item.unit} of ${item.name} for shipment`,
      newReservation.id,
      'reservation',
      { quantity, inventoryItemId, shipmentId },
      companyId
    );

    return true;
  }

  /**
   * Fulfills a reservation when shipment is delivered
   * This permanently removes the reserved stock (already deducted from available)
   * Verifies inventory item belongs to the specified company
   */
  fulfillReservation(
    inventoryItemId: string, 
    shipmentId: string,
    companyId?: string
  ): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    const item = inventoryService.getItemById(inventoryItemId, companyId);
    
    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;
    
    // Fulfill in inventory (deduct from reserved - goods have left the warehouse)
    const success = inventoryService.fulfillReservation(inventoryItemId, reservation.quantity, companyId);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'fulfilled',
      updatedAt: new Date(),
    };

    // Log activity with company association
    activityService.logActivity(
      ActivityType.INVENTORY_OUT,
      `Dispatched ${reservation.quantity} ${item?.unit || 'units'} of ${item?.name || 'item'}`,
      inventoryItemId,
      'inventory',
      { quantity: reservation.quantity, shipmentId },
      companyId
    );

    return true;
  }

  /**
   * Restores a fulfilled reservation back to active state
   * Used for rollback when delivery fails after partial fulfillment
   * Re-adds stock to reserved pool
   */
  restoreReservation(
    inventoryItemId: string,
    shipmentId: string,
    quantity: number,
    companyId?: string
  ): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'fulfilled'
    );
    
    if (index === -1) return false;

    const item = inventoryService.getItemById(inventoryItemId, companyId);
    
    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;
    
    // Restore reserved stock in inventory
    const success = inventoryService.restoreReservedStock(inventoryItemId, quantity, companyId);
    if (!success) return false;

    this.reservations[index] = {
      ...this.reservations[index],
      status: 'active',
      updatedAt: new Date(),
    };

    return true;
  }

  /**
   * Cancels a reservation (releases stock back to available)
   * This is called when a shipment is cancelled or delayed
   * Verifies inventory item belongs to the specified company
   */
  cancelReservation(
    inventoryItemId: string, 
    shipmentId: string,
    companyId?: string
  ): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && 
             res.shipmentId === shipmentId && 
             res.status === 'active'
    );
    
    if (index === -1) return false;

    const reservation = this.reservations[index];
    const item = inventoryService.getItemById(inventoryItemId, companyId);
    
    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;
    
    // Release back to available stock
    const success = inventoryService.releaseReservation(inventoryItemId, reservation.quantity, companyId);
    if (!success) return false;

    this.reservations[index] = {
      ...reservation,
      status: 'cancelled',
      updatedAt: new Date(),
    };

    // Log activity with company association
    activityService.logActivity(
      ActivityType.RESERVATION_RELEASED,
      `Released ${reservation.quantity} ${item?.unit || 'units'} of ${item?.name || 'item'} back to available stock`,
      reservation.id,
      'reservation',
      { quantity: reservation.quantity, inventoryItemId, shipmentId },
      companyId
    );

    return true;
  }

  /**
   * Removes a reservation entirely (for rollback purposes)
   * Does NOT modify inventory - caller is responsible for inventory state
   */
  removeReservation(inventoryItemId: string, shipmentId: string): boolean {
    const index = this.reservations.findIndex(
      res => res.inventoryItemId === inventoryItemId && res.shipmentId === shipmentId
    );
    
    if (index === -1) return false;
    
    this.reservations.splice(index, 1);
    return true;
  }

  getTotalReservedForItem(inventoryItemId: string): number {
    return this.getActiveReservations()
      .filter(res => res.inventoryItemId === inventoryItemId)
      .reduce((sum, res) => sum + res.quantity, 0);
  }
}

export const reservationService = new ReservationService();
