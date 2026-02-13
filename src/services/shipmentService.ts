// Shipment Service - Centralized shipment business logic
// All methods require companyId for data isolation
// Implements transactional safety with rollback for multi-step operations
// Uses repository pattern for data access

import { Shipment, ShipmentStatus, ShipmentStats, ShipmentItem, ActivityType } from '@/domain/models';
import { 
  IShipmentRepository, 
  IInventoryRepository,
  IReservationRepository,
  IActivityRepository,
  shipmentRepository as defaultShipmentRepo,
  inventoryRepository as defaultInventoryRepo,
  reservationRepository as defaultReservationRepo,
  activityRepository as defaultActivityRepo
} from '@/repositories';
import { ReservationService } from './reservationService';
import { ActivityService } from './activityService';
import { InventoryService } from './inventoryService';
import { TransactionContext, executeTransactionSync, TransactionResult } from './transactionService';

export class ShipmentService {
  private reservationService: ReservationService;
  private activityService: ActivityService;
  private inventoryService: InventoryService;

  constructor(
    private shipmentRepo: IShipmentRepository = defaultShipmentRepo,
    inventoryRepo: IInventoryRepository = defaultInventoryRepo,
    reservationRepo: IReservationRepository = defaultReservationRepo,
    activityRepo: IActivityRepository = defaultActivityRepo
  ) {
    this.inventoryService = new InventoryService(inventoryRepo, activityRepo);
    this.reservationService = new ReservationService(reservationRepo, inventoryRepo, activityRepo);
    this.activityService = new ActivityService(activityRepo);
  }

  // Get all shipments, optionally scoped to company
  getAllShipments(companyId?: string): Shipment[] {
    if (!companyId) return this.shipmentRepo.findAll();
    return this.shipmentRepo.findByCompany(companyId);
  }

  // Get shipment by ID, scoped to company
  getShipmentById(id: string, companyId?: string): Shipment | undefined {
    const shipment = this.shipmentRepo.findById(id);
    if (!shipment) return undefined;
    if (companyId && shipment.companyId !== companyId) return undefined;
    return shipment;
  }

  // Get shipment by number, scoped to company
  getShipmentByNumber(shipmentNumber: string, companyId?: string): Shipment | undefined {
    const shipment = this.shipmentRepo.findByNumber(shipmentNumber);
    if (!shipment) return undefined;
    if (companyId && shipment.companyId !== companyId) return undefined;
    return shipment;
  }

  // Get shipments by status, scoped to company
  getShipmentsByStatus(status: ShipmentStatus, companyId?: string): Shipment[] {
    return this.shipmentRepo.findByStatus(status, companyId);
  }

  // Get stats for a specific company
  getStats(companyId?: string): ShipmentStats {
    const shipments = this.getAllShipments(companyId);
    return {
      totalShipments: shipments.length,
      pendingCount: shipments.filter(s => s.status === 'pending').length,
      inTransitCount: shipments.filter(s => s.status === 'in_transit').length,
      deliveredCount: shipments.filter(s => s.status === 'delivered').length,
      delayedCount: 0, // Calculated by dashboardService to avoid circular dependency
    };
  }

  /**
   * Validates if all items have sufficient available stock
   * Scoped to company
   */
  validateItemsAvailability(items: ShipmentItem[], companyId?: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const item of items) {
      const inventoryItem = this.inventoryService.getItemById(item.inventoryItemId, companyId);
      if (!inventoryItem) {
        errors.push(`Item ${item.inventoryItemName} not found in inventory`);
        continue;
      }
      if (inventoryItem.availableStock < item.quantity) {
        errors.push(`Insufficient stock for ${item.inventoryItemName}: requested ${item.quantity}, available ${inventoryItem.availableStock}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Creates a new shipment and reserves inventory for all items
   * Uses transactional safety - rolls back all reservations if any step fails
   * Returns null if reservation fails for any item
   * Scoped to company
   */
  createShipment(
    customerName: string,
    destination: string,
    items: ShipmentItem[],
    companyId?: string
  ): TransactionResult<Shipment> & { errors: string[] } {
    return executeTransactionSync<Shipment>((ctx: TransactionContext) => {
      // Validate availability first
      const validation = this.validateItemsAvailability(items, companyId);
      if (!validation.valid) {
        return { success: false, data: null, error: validation.errors.join('; ') };
      }

      // Generate shipment ID first so we can use it for reservations
      const shipmentId = crypto.randomUUID();
      const shipmentCount = this.shipmentRepo.findAll().length;
      const shipmentNumber = `SHP-${new Date().getFullYear()}-${String(shipmentCount + 1).padStart(3, '0')}`;
      // Create reservations for all items with rollback tracking
      for (const item of items) {
        const success = this.reservationService.createReservation(
          item.inventoryItemId,
          shipmentId,
          item.quantity,
          companyId
        );

        if (!success) {
          return {
            success: false,
            data: null,
            error: `Failed to reserve ${item.inventoryItemName}`
          };
        }

        // Register rollback action for this reservation
        ctx.addRollback({
          description: `Cancel reservation for ${item.inventoryItemName}`,
          execute: () => this.reservationService.cancelReservation(
            item.inventoryItemId,
            shipmentId,
            companyId
          ),
        });
      }

      // Create the shipment object
      const newShipment: Shipment = {
        id: shipmentId,
        shipmentNumber,
        customerName,
        destination,
        status: 'pending',
        items,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Add shipment to repository
      this.shipmentRepo.create(newShipment);

      // Register rollback for shipment creation
      ctx.addRollback({
        description: `Remove shipment ${shipmentNumber}`,
        execute: () => this.shipmentRepo.delete(shipmentId),
      });

      // Log activity with company association
      const activityId = this.activityService.logActivity(
        ActivityType.SHIPMENT_CREATED,
        `Created shipment ${shipmentNumber} for ${customerName}`,
        shipmentId,
        'shipment',
        { destination, itemCount: items.length },
        companyId
      );

      // Register rollback for activity log
      if (activityId) {
        ctx.addRollback({
          description: `Remove activity log for shipment creation`,
          execute: () => this.activityService.removeActivity(activityId),
        });
      }

      return { success: true, data: newShipment };
    }) as TransactionResult<Shipment> & { errors: string[] };
  }

  /**
   * Updates shipment status with proper reservation handling and transactional safety:
   * - 'delivered': Fulfills reservations (permanently deducts from reserved stock)
   * - 'cancelled': Releases reservations (returns to available stock)
   * Rolls back all changes if any step fails
   * Scoped to company
   */
  updateStatus(
    shipmentId: string,
    newStatus: ShipmentStatus,
    companyId?: string
  ): TransactionResult<Shipment> {
    return executeTransactionSync<Shipment>((ctx: TransactionContext) => {
      const shipment = this.shipmentRepo.findById(shipmentId);
      if (!shipment) {
        return { success: false, data: null, error: 'Shipment not found' };
      }

      const previousStatus = shipment.status;

      // Verify company ownership
      if (companyId && shipment.companyId !== companyId) {
        return { success: false, data: null, error: 'Shipment not found' };
      }

      // Validate status transition
      if (!this.canTransitionTo(shipment.status, newStatus)) {
        return {
          success: false,
          data: null,
          error: `Cannot transition from ${shipment.status} to ${newStatus}`
        };
      }

      // Store original shipment state for potential rollback
      const originalShipment = { ...shipment };

      // Handle status-specific logic
      if (newStatus === 'delivered') {
        return this.handleDelivery(ctx, shipment, originalShipment);
      } else if (newStatus === 'cancelled') {
        return this.handleCancellation(ctx, shipment, originalShipment);
      } else {
        return this.handleStandardTransition(ctx, shipment, newStatus, previousStatus);
      }
    });
  }

  /**
   * Handles delivery status transition with transactional safety
   */
  private handleDelivery(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
    // Fulfill reservations for all items
    for (const item of shipment.items) {
      const fulfilled = this.reservationService.fulfillReservation(
        item.inventoryItemId,
        shipment.id,
        shipment.companyId
      );

      if (!fulfilled) {
        return {
          success: false,
          data: null,
          error: `Failed to fulfill reservation for ${item.inventoryItemName}`
        };
      }

      // Register rollback: restore reservation (move back from fulfilled to active)
      ctx.addRollback({
        description: `Restore reservation for ${item.inventoryItemName}`,
        execute: () => this.reservationService.restoreReservation(
          item.inventoryItemId,
          shipment.id,
          item.quantity,
          shipment.companyId
        ),
      });
    }

    // Update shipment status
    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'delivered', new Date());

    // Register rollback for shipment status
    ctx.addRollback({
      description: `Restore shipment to ${originalShipment.status}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, {
          status: originalShipment.status,
          deliveredAt: originalShipment.deliveredAt,
        });
        return true;
      },
    });

    // Log activity
    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_DELIVERED,
      `Shipment ${shipment.shipmentNumber} delivered`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status },
      shipment.companyId
    );

    if (activityId) {
      ctx.addRollback({
        description: `Remove delivery activity log`,
        execute: () => this.activityService.removeActivity(activityId),
      });
    }

    return { success: true, data: updatedShipment! };
  }

  /**
   * Handles cancellation status transition with transactional safety
   */
  private handleCancellation(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
    // Release reservations for all items
    for (const item of shipment.items) {
      const released = this.reservationService.cancelReservation(
        item.inventoryItemId,
        shipment.id,
        shipment.companyId
      );

      if (!released) {
        console.warn(`Warning: Could not release reservation for ${item.inventoryItemName}`);
        // Continue anyway for cancellation - best effort
      } else {
        // Register rollback: re-reserve the inventory
        ctx.addRollback({
          description: `Re-reserve inventory for ${item.inventoryItemName}`,
          execute: () => this.reservationService.createReservation(
            item.inventoryItemId,
            shipment.id,
            item.quantity,
            shipment.companyId
          ),
        });
      }
    }

    // Update shipment status
    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'cancelled');

    // Register rollback for shipment status
    ctx.addRollback({
      description: `Restore shipment to ${originalShipment.status}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, { status: originalShipment.status });
        return true;
      },
    });

    // Log activity
    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_CANCELLED,
      `Shipment ${shipment.shipmentNumber} cancelled - inventory released`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status },
      shipment.companyId
    );

    if (activityId) {
      ctx.addRollback({
        description: `Remove cancellation activity log`,
        execute: () => this.activityService.removeActivity(activityId),
      });
    }

    return { success: true, data: updatedShipment! };
  }

  /**
   * Handles standard status transitions (pending -> in_transit)
   */
  private handleStandardTransition(
    ctx: TransactionContext,
    shipment: Shipment,
    newStatus: ShipmentStatus,
    previousStatus: ShipmentStatus
  ): TransactionResult<Shipment> {
    const originalShipment = { ...shipment };

    // Update shipment status
    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, newStatus);

    // Register rollback
    ctx.addRollback({
      description: `Restore shipment to ${previousStatus}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, { status: originalShipment.status });
        return true;
      },
    });

    // Log activity
    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_UPDATED,
      `Shipment ${shipment.shipmentNumber} status updated to ${newStatus}`,
      shipment.id,
      'shipment',
      { previousStatus },
      shipment.companyId
    );

    if (activityId) {
      ctx.addRollback({
        description: `Remove status update activity log`,
        execute: () => this.activityService.removeActivity(activityId),
      });
    }

    return { success: true, data: updatedShipment! };
  }

  // Upload proof of delivery, scoped to company
  uploadProofOfDelivery(shipmentId: string, proofUrl: string, companyId?: string): Shipment | null {
    const shipment = this.getShipmentById(shipmentId, companyId);
    if (!shipment) return null;

    const updated = this.shipmentRepo.update(shipmentId, { proofOfDelivery: proofUrl });
    return updated || null;
  }

  getStatusFlow(): ShipmentStatus[] {
    return ['pending', 'in_transit', 'delivered'];
  }

  canTransitionTo(currentStatus: ShipmentStatus, newStatus: ShipmentStatus): boolean {
    const flow = this.getStatusFlow();
    const currentIndex = flow.indexOf(currentStatus);
    const newIndex = flow.indexOf(newStatus);

    // Cannot transition from delivered or cancelled
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') return false;

    // Can always cancel (unless delivered)
    if (newStatus === 'cancelled') return true;

    // Can only move forward in the flow
    return newIndex === currentIndex + 1;
  }

  getNextStatus(currentStatus: ShipmentStatus): ShipmentStatus | null {
    const flow = this.getStatusFlow();
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === flow.length - 1) return null;
    if (currentStatus === 'cancelled') return null;
    return flow[currentIndex + 1];
  }

  getAvailableTransitions(currentStatus: ShipmentStatus): ShipmentStatus[] {
    const transitions: ShipmentStatus[] = [];
    const nextStatus = this.getNextStatus(currentStatus);

    if (nextStatus) transitions.push(nextStatus);
    if (this.canTransitionTo(currentStatus, 'cancelled')) transitions.push('cancelled');

    return transitions;
  }
}

// Default singleton instance
export const shipmentService = new ShipmentService();
