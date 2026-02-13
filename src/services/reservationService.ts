// Reservation Service - Centralized reservation business logic
// All methods require companyId for data isolation
// Supports transactional rollback operations
// Uses repository pattern for data access

import { Reservation, ActivityType } from '@/domain/models';
import { 
  IReservationRepository, 
  IInventoryRepository,
  IActivityRepository,
  reservationRepository as defaultReservationRepo,
  inventoryRepository as defaultInventoryRepo,
  activityRepository as defaultActivityRepo 
} from '@/repositories';
import { InventoryService } from './inventoryService';
import { ActivityService } from './activityService';

export class ReservationService {
  private inventoryService: InventoryService;
  private activityService: ActivityService;

  constructor(
    private reservationRepo: IReservationRepository = defaultReservationRepo,
    inventoryRepo: IInventoryRepository = defaultInventoryRepo,
    activityRepo: IActivityRepository = defaultActivityRepo
  ) {
    this.inventoryService = new InventoryService(inventoryRepo, activityRepo);
    this.activityService = new ActivityService(activityRepo);
  }

  // Get all reservations (internal use - reservations don't have companyId directly)
  getAllReservations(): Reservation[] {
    return this.reservationRepo.findAll();
  }

  getReservationById(id: string): Reservation | undefined {
    return this.reservationRepo.findById(id);
  }

  getReservationsByInventoryItem(inventoryItemId: string): Reservation[] {
    return this.reservationRepo.findByInventoryItem(inventoryItemId);
  }

  getReservationsByShipment(shipmentId: string): Reservation[] {
    return this.reservationRepo.findByShipment(shipmentId);
  }

  getActiveReservations(): Reservation[] {
    return this.reservationRepo.findByStatus('active');
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
    const item = this.inventoryService.getItemById(inventoryItemId, companyId);
    if (!item) return false;

    // Reserve stock in inventory (moves from available to reserved)
    const success = this.inventoryService.reserveStock(inventoryItemId, quantity, companyId);
    if (!success) return false;

    const newReservation: Reservation = {
      id: crypto.randomUUID(),
      inventoryItemId,
      shipmentId,
      quantity,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reservationRepo.create(newReservation, companyId);

    // Log activity with company association
    this.activityService.logActivity(
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
    const reservation = this.reservationRepo.findActiveByInventoryAndShipment(
      inventoryItemId,
      shipmentId
    );

    if (!reservation) return false;

    const item = this.inventoryService.getItemById(inventoryItemId, companyId);

    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;

    // Fulfill in inventory (deduct from reserved - goods have left the warehouse)
    const success = this.inventoryService.fulfillReservation(
      inventoryItemId,
      reservation.quantity,
      companyId
    );
    if (!success) return false;

    this.reservationRepo.updateStatus(reservation.id, 'fulfilled');

    // Log activity with company association
    this.activityService.logActivity(
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
    const reservation = this.reservationRepo.findFulfilledByInventoryAndShipment(
      inventoryItemId,
      shipmentId
    );

    if (!reservation) return false;

    const item = this.inventoryService.getItemById(inventoryItemId, companyId);

    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;

    // Restore reserved stock in inventory
    const success = this.inventoryService.restoreReservedStock(
      inventoryItemId,
      quantity,
      companyId
    );
    if (!success) return false;

    this.reservationRepo.updateStatus(reservation.id, 'active');

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
    const reservation = this.reservationRepo.findActiveByInventoryAndShipment(
      inventoryItemId,
      shipmentId
    );

    if (!reservation) return false;

    const item = this.inventoryService.getItemById(inventoryItemId, companyId);

    // Verify company ownership
    if (companyId && (!item || item.companyId !== companyId)) return false;

    // Release back to available stock
    const success = this.inventoryService.releaseReservation(
      inventoryItemId,
      reservation.quantity,
      companyId
    );
    if (!success) return false;

    this.reservationRepo.updateStatus(reservation.id, 'cancelled');

    // Log activity with company association
    this.activityService.logActivity(
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
    const reservation = this.reservationRepo.findByInventoryAndShipment(
      inventoryItemId,
      shipmentId
    );

    if (!reservation) return false;

    return this.reservationRepo.delete(reservation.id);
  }

  getTotalReservedForItem(inventoryItemId: string): number {
    return this.getActiveReservations()
      .filter(res => res.inventoryItemId === inventoryItemId)
      .reduce((sum, res) => sum + res.quantity, 0);
  }
}

// Default singleton instance
export const reservationService = new ReservationService();
