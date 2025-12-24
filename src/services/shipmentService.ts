// Shipment Service - Centralized shipment business logic
import { Shipment, ShipmentStatus, ShipmentStats, ShipmentItem } from '@/domain/models';
import { mockShipments } from '@/domain/mockData';
import { reservationService } from './reservationService';

class ShipmentService {
  private shipments: Shipment[] = [...mockShipments];

  getAllShipments(): Shipment[] {
    return [...this.shipments];
  }

  getShipmentById(id: string): Shipment | undefined {
    return this.shipments.find(shipment => shipment.id === id);
  }

  getShipmentByNumber(shipmentNumber: string): Shipment | undefined {
    return this.shipments.find(shipment => shipment.shipmentNumber === shipmentNumber);
  }

  getShipmentsByStatus(status: ShipmentStatus): Shipment[] {
    return this.shipments.filter(shipment => shipment.status === status);
  }

  getStats(): ShipmentStats {
    return {
      totalShipments: this.shipments.length,
      pendingCount: this.getShipmentsByStatus('pending').length,
      inTransitCount: this.getShipmentsByStatus('in_transit').length,
      deliveredCount: this.getShipmentsByStatus('delivered').length,
    };
  }

  createShipment(
    customerName: string,
    destination: string,
    items: ShipmentItem[]
  ): Shipment | null {
    // Create reservations for all items
    for (const item of items) {
      const success = reservationService.createReservation(
        item.inventoryItemId,
        `ship-${Date.now()}`,
        item.quantity
      );
      if (!success) {
        return null;
      }
    }

    const newShipment: Shipment = {
      id: `ship-${Date.now()}`,
      shipmentNumber: `SHP-${new Date().getFullYear()}-${String(this.shipments.length + 1).padStart(3, '0')}`,
      customerName,
      destination,
      status: 'pending',
      items,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.shipments.push(newShipment);
    return newShipment;
  }

  updateStatus(shipmentId: string, newStatus: ShipmentStatus): Shipment | null {
    const index = this.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

    const shipment = this.shipments[index];
    
    // Handle status-specific logic
    if (newStatus === 'delivered') {
      // Fulfill reservations when delivered
      for (const item of shipment.items) {
        reservationService.fulfillReservation(item.inventoryItemId, shipment.id);
      }
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        deliveredAt: new Date(),
        updatedAt: new Date(),
      };
    } else if (newStatus === 'cancelled') {
      // Release reservations when cancelled
      for (const item of shipment.items) {
        reservationService.cancelReservation(item.inventoryItemId, shipment.id);
      }
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        updatedAt: new Date(),
      };
    } else {
      this.shipments[index] = {
        ...shipment,
        status: newStatus,
        updatedAt: new Date(),
      };
    }

    return this.shipments[index];
  }

  uploadProofOfDelivery(shipmentId: string, proofUrl: string): Shipment | null {
    const index = this.shipments.findIndex(s => s.id === shipmentId);
    if (index === -1) return null;

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
    
    // Can always cancel
    if (newStatus === 'cancelled') return currentStatus !== 'delivered';
    
    // Can only move forward in the flow
    return newIndex === currentIndex + 1;
  }

  getNextStatus(currentStatus: ShipmentStatus): ShipmentStatus | null {
    const flow = this.getStatusFlow();
    const currentIndex = flow.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex === flow.length - 1) return null;
    return flow[currentIndex + 1];
  }
}

export const shipmentService = new ShipmentService();
