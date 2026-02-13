// Shipment Service - Centralized shipment business logic
// All methods require companyId for data isolation
// Implements transactional safety with rollback for multi-step operations
// Uses repository pattern for data access
// Supports inbound (procurement) and outbound (dispatch) movement types

import { Shipment, ShipmentStatus, ShipmentStats, ShipmentItem, ActivityType, MovementType } from '@/domain/models';
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

  // Get shipments by movement type
  getShipmentsByMovementType(movementType: MovementType, companyId?: string): Shipment[] {
    return this.getAllShipments(companyId).filter(s => s.movementType === movementType);
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

  // Get monthly movement stats
  getMonthlyMovementStats(companyId?: string): { inboundCount: number; outboundCount: number; netMovement: number } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const shipments = this.getAllShipments(companyId).filter(
      s => s.createdAt >= startOfMonth
    );

    const inboundShipments = shipments.filter(s => s.movementType === 'inbound');
    const outboundShipments = shipments.filter(s => s.movementType === 'outbound');

    const inboundQty = inboundShipments
      .filter(s => s.status === 'delivered')
      .reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);
    const outboundQty = outboundShipments
      .filter(s => s.status === 'delivered')
      .reduce((sum, s) => sum + s.items.reduce((is, i) => is + i.quantity, 0), 0);

    return {
      inboundCount: inboundShipments.length,
      outboundCount: outboundShipments.length,
      netMovement: inboundQty - outboundQty,
    };
  }

  /**
   * Validates if all items have sufficient available stock (outbound only)
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
   * Creates a new shipment
   * - Outbound: reserves inventory for all items
   * - Inbound: no reservations, just tracks the incoming order
   */
  createShipment(
    customerName: string,
    destination: string,
    items: ShipmentItem[],
    companyId?: string,
    movementType: MovementType = 'outbound'
  ): TransactionResult<Shipment> & { errors: string[] } {
    return executeTransactionSync<Shipment>((ctx: TransactionContext) => {
      // For outbound, validate availability and create reservations
      if (movementType === 'outbound') {
        const validation = this.validateItemsAvailability(items, companyId);
        if (!validation.valid) {
          return { success: false, data: null, error: validation.errors.join('; ') };
        }
      }

      const shipmentId = crypto.randomUUID();
      const shipmentCount = this.shipmentRepo.findAll().length;
      const prefix = movementType === 'inbound' ? 'INB' : 'SHP';
      const shipmentNumber = `${prefix}-${new Date().getFullYear()}-${String(shipmentCount + 1).padStart(3, '0')}`;

      // Only create reservations for outbound
      if (movementType === 'outbound') {
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

          ctx.addRollback({
            description: `Cancel reservation for ${item.inventoryItemName}`,
            execute: () => this.reservationService.cancelReservation(
              item.inventoryItemId,
              shipmentId,
              companyId
            ),
          });
        }
      }

      const newShipment: Shipment = {
        id: shipmentId,
        shipmentNumber,
        customerName,
        destination,
        status: 'pending',
        movementType,
        items,
        companyId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.shipmentRepo.create(newShipment);

      ctx.addRollback({
        description: `Remove shipment ${shipmentNumber}`,
        execute: () => this.shipmentRepo.delete(shipmentId),
      });

      const activityId = this.activityService.logActivity(
        ActivityType.SHIPMENT_CREATED,
        `Created ${movementType} shipment ${shipmentNumber} for ${customerName}`,
        shipmentId,
        'shipment',
        { destination, itemCount: items.length, movementType },
        companyId
      );

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
   * Updates shipment status with proper handling based on movement type:
   * - Outbound delivered: Fulfills reservations (permanently deducts reserved stock)
   * - Outbound cancelled: Releases reservations (returns to available stock)
   * - Inbound delivered: Increases available stock (stock in)
   * - Inbound cancelled: No inventory changes needed
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

      if (companyId && shipment.companyId !== companyId) {
        return { success: false, data: null, error: 'Shipment not found' };
      }

      if (!this.canTransitionTo(shipment.status, newStatus)) {
        return {
          success: false,
          data: null,
          error: `Cannot transition from ${shipment.status} to ${newStatus}`
        };
      }

      const originalShipment = { ...shipment };

      if (newStatus === 'delivered') {
        if (shipment.movementType === 'inbound') {
          return this.handleInboundDelivery(ctx, shipment, originalShipment);
        }
        return this.handleDelivery(ctx, shipment, originalShipment);
      } else if (newStatus === 'cancelled') {
        if (shipment.movementType === 'inbound') {
          return this.handleInboundCancellation(ctx, shipment, originalShipment);
        }
        return this.handleCancellation(ctx, shipment, originalShipment);
      } else {
        return this.handleStandardTransition(ctx, shipment, newStatus, previousStatus);
      }
    });
  }

  /**
   * Handles outbound delivery with reservation fulfillment
   */
  private handleDelivery(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
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

    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'delivered', new Date());

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

    // Log INVENTORY_OUT for each item on outbound delivery
    for (const item of shipment.items) {
      this.activityService.logActivity(
        ActivityType.INVENTORY_OUT,
        `Stock out: -${item.quantity} of ${item.inventoryItemName} (shipment ${shipment.shipmentNumber})`,
        item.inventoryItemId,
        'inventory',
        { quantity: item.quantity, shipmentId: shipment.id, action: 'shipment_delivered' },
        shipment.companyId
      );
    }

    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_DELIVERED,
      `Outbound shipment ${shipment.shipmentNumber} delivered`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status, movementType: 'outbound' },
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
   * Handles inbound delivery - increases inventory stock
   */
  private handleInboundDelivery(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
    // Increase available stock for each item
    for (const item of shipment.items) {
      const result = this.inventoryService.stockIn(item.inventoryItemId, item.quantity, shipment.companyId);
      if (!result) {
        return {
          success: false,
          data: null,
          error: `Failed to stock in ${item.inventoryItemName}`
        };
      }

      ctx.addRollback({
        description: `Reverse stock in for ${item.inventoryItemName}`,
        execute: () => {
          this.inventoryService.stockOut(item.inventoryItemId, item.quantity, shipment.companyId);
          return true;
        },
      });
    }

    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'delivered', new Date());

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

    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_DELIVERED,
      `Inbound shipment ${shipment.shipmentNumber} received - stock updated`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status, movementType: 'inbound' },
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
   * Handles outbound cancellation with reservation release
   */
  private handleCancellation(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
    for (const item of shipment.items) {
      const released = this.reservationService.cancelReservation(
        item.inventoryItemId,
        shipment.id,
        shipment.companyId
      );

      if (!released) {
        console.warn(`Warning: Could not release reservation for ${item.inventoryItemName}`);
      } else {
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

    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'cancelled');

    ctx.addRollback({
      description: `Restore shipment to ${originalShipment.status}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, { status: originalShipment.status });
        return true;
      },
    });

    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_CANCELLED,
      `Outbound shipment ${shipment.shipmentNumber} cancelled - inventory released`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status, movementType: 'outbound' },
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
   * Handles inbound cancellation - no inventory changes needed
   */
  private handleInboundCancellation(
    ctx: TransactionContext,
    shipment: Shipment,
    originalShipment: Shipment
  ): TransactionResult<Shipment> {
    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, 'cancelled');

    ctx.addRollback({
      description: `Restore shipment to ${originalShipment.status}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, { status: originalShipment.status });
        return true;
      },
    });

    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_CANCELLED,
      `Inbound shipment ${shipment.shipmentNumber} cancelled`,
      shipment.id,
      'shipment',
      { previousStatus: originalShipment.status, movementType: 'inbound' },
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

    const updatedShipment = this.shipmentRepo.updateStatus(shipment.id, newStatus);

    ctx.addRollback({
      description: `Restore shipment to ${previousStatus}`,
      execute: () => {
        this.shipmentRepo.update(shipment.id, { status: originalShipment.status });
        return true;
      },
    });

    const activityId = this.activityService.logActivity(
      ActivityType.SHIPMENT_UPDATED,
      `Shipment ${shipment.shipmentNumber} status updated to ${newStatus}`,
      shipment.id,
      'shipment',
      { previousStatus, movementType: shipment.movementType },
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
