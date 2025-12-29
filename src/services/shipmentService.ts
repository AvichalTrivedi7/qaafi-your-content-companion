// Shipment Service - Centralized shipment business logic
// All methods require companyId for data isolation

import { Shipment, ShipmentStatus, ShipmentStats, ShipmentItem, ActivityType } from '@/domain/models';
import { mockShipments } from '@/domain/mockData';
import { reservationService } from './reservationService';
import { activityService } from './activityService';
import { inventoryService } from './inventoryService';

class ShipmentService {
  private shipments: Shipment[] = [...mockShipments];

  // Get all shipments, optionally scoped to company
  getAllShipments(companyId?: string): Shipment[] {
    if (!companyId) return [...this.shipments];
    return this.shipments.filter(s => s.companyId === companyId);
  }

  // Get shipment by ID, scoped to company
  getShipmentById(id: string, companyId?: string): Shipment | undefined {
    const shipment = this.shipments.find(shipment => shipment.id === id);
    if (!shipment) return undefined;
    if (companyId && shipment.companyId !== companyId) return undefined;
    return shipment;
  }

  // Get shipment by number, scoped to company
  getShipmentByNumber(shipmentNumber: string, companyId?: string): Shipment | undefined {
    const shipment = this.shipments.find(shipment => shipment.shipmentNumber === shipmentNumber);
    if (!shipment) return undefined;
    if (companyId && shipment.companyId !== companyId) return undefined;
    return shipment;
  }

  // Get shipments by status, scoped to company
  getShipmentsByStatus(status: ShipmentStatus, companyId?: string): Shipment[] {
    return this.getAllShipments(companyId).filter(shipment => shipment.status === status);
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
      const inventoryItem = inventoryService.getItemById(item.inventoryItemId, companyId);
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
   * Returns null if reservation fails for any item
   * Scoped to company
   */
  createShipment(
    customerName: string,
    destination: string,
    items: ShipmentItem[],
    companyId?: string
  ): { success: boolean; shipment: Shipment | null; errors: string[] } {
    // Validate availability first
    const validation = this.validateItemsAvailability(items, companyId);
    if (!validation.valid) {
      return { success: false, shipment: null, errors: validation.errors };
    }

    // Generate shipment ID first so we can use it for reservations
    const shipmentId = `ship-${Date.now()}`;
    const shipmentNumber = `SHP-${new Date().getFullYear()}-${String(this.shipments.length + 1).padStart(3, '0')}`;

    // Create reservations for all items
    const reservedItems: { inventoryItemId: string; quantity: number }[] = [];
    
    for (const item of items) {
      const success = reservationService.createReservation(
        item.inventoryItemId,
        shipmentId,
        item.quantity,
        companyId
      );
      
      if (!success) {
        // Rollback previously created reservations
        for (const reserved of reservedItems) {
          reservationService.cancelReservation(reserved.inventoryItemId, shipmentId, companyId);
        }
        return { 
          success: false, 
          shipment: null, 
          errors: [`Failed to reserve ${item.inventoryItemName}`] 
        };
      }
      
      reservedItems.push({ inventoryItemId: item.inventoryItemId, quantity: item.quantity });
    }

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

    this.shipments.push(newShipment);

    // Log activity with company association
    activityService.logActivity(
      ActivityType.SHIPMENT_CREATED,
      `Created shipment ${shipmentNumber} for ${customerName}`,
      shipmentId,
      'shipment',
      { destination, itemCount: items.length },
      companyId
    );

    return { success: true, shipment: newShipment, errors: [] };
  }

  /**
   * Updates shipment status with proper reservation handling:
   * - 'delivered': Fulfills reservations (permanently deducts from reserved stock)
   * - 'cancelled': Releases reservations (returns to available stock)
   * Scoped to company
   */
  updateStatus(
    shipmentId: string, 
    newStatus: ShipmentStatus,
    companyId?: string
  ): { success: boolean; shipment: Shipment | null; error?: string } {
    const index = this.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) {
      return { success: false, shipment: null, error: 'Shipment not found' };
    }

    const shipment = this.shipments[index];
    
    // Verify company ownership
    if (companyId && shipment.companyId !== companyId) {
      return { success: false, shipment: null, error: 'Shipment not found' };
    }
    
    // Validate status transition
    if (!this.canTransitionTo(shipment.status, newStatus)) {
      return { 
        success: false, 
        shipment: null, 
        error: `Cannot transition from ${shipment.status} to ${newStatus}` 
      };
    }

    // Handle status-specific logic
    if (newStatus === 'delivered') {
      // Fulfill reservations - deduct from reserved stock permanently
      for (const item of shipment.items) {
        const fulfilled = reservationService.fulfillReservation(
          item.inventoryItemId, 
          shipmentId,
          shipment.companyId
        );
        if (!fulfilled) {
          return { 
            success: false, 
            shipment: null, 
            error: `Failed to fulfill reservation for ${item.inventoryItemName}` 
          };
        }
      }
      
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        deliveredAt: new Date(),
        updatedAt: new Date(),
      };

      activityService.logActivity(
        ActivityType.SHIPMENT_DELIVERED,
        `Shipment ${shipment.shipmentNumber} delivered`,
        shipmentId,
        'shipment',
        { previousStatus: shipment.status },
        shipment.companyId
      );

    } else if (newStatus === 'cancelled') {
      // Release reservations - return to available stock
      for (const item of shipment.items) {
        const released = reservationService.cancelReservation(
          item.inventoryItemId, 
          shipmentId,
          shipment.companyId
        );
        if (!released) {
          console.warn(`Warning: Could not release reservation for ${item.inventoryItemName}`);
        }
      }
      
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        updatedAt: new Date(),
      };

      activityService.logActivity(
        ActivityType.SHIPMENT_CANCELLED,
        `Shipment ${shipment.shipmentNumber} cancelled - inventory released`,
        shipmentId,
        'shipment',
        { previousStatus: shipment.status },
        shipment.companyId
      );

    } else {
      // Standard status update (pending -> in_transit, etc.)
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        updatedAt: new Date(),
      };

      activityService.logActivity(
        ActivityType.SHIPMENT_UPDATED,
        `Shipment ${shipment.shipmentNumber} status updated to ${newStatus}`,
        shipmentId,
        'shipment',
        { previousStatus: shipment.status },
        shipment.companyId
      );
    }

    return { success: true, shipment: this.shipments[index] };
  }

  // Upload proof of delivery, scoped to company
  uploadProofOfDelivery(shipmentId: string, proofUrl: string, companyId?: string): Shipment | null {
    const index = this.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

    // Verify company ownership
    if (companyId && this.shipments[index].companyId !== companyId) return null;

    this.shipments[index] = {
      ...this.shipments[index],
      proofOfDelivery: proofUrl,
      updatedAt: new Date(),
    };

    return this.shipments[index];
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

export const shipmentService = new ShipmentService();
