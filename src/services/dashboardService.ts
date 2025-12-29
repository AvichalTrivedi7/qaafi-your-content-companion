// Dashboard Service - Centralized dashboard metric calculations
// All dashboard values are derived exclusively from these definitions
// All methods require companyId for data isolation

import { 
  DashboardStats, 
  DailyMovement, 
  DeliveryMetrics,
  Shipment,
  InventoryItem 
} from '@/domain/models';
import { inventoryService } from './inventoryService';
import { shipmentService } from './shipmentService';
import { activityService } from './activityService';

// ============================================
// METRIC CALCULATION RULES (Codified)
// ============================================

/**
 * RULE: Low Stock Alert
 * An inventory item is considered "low stock" when:
 * - availableStock <= lowStockThreshold
 * 
 * This is evaluated per-item using its individual threshold.
 * Scoped to company.
 */
function calculateLowStockItems(companyId?: string): InventoryItem[] {
  return inventoryService.getLowStockItems(companyId);
}

/**
 * RULE: Delayed Shipment
 * A shipment is considered "delayed" when:
 * - Status is 'pending' or 'in_transit' AND
 * - More than 48 hours have passed since creation
 * 
 * Configurable threshold: DELAYED_THRESHOLD_HOURS
 */
const DELAYED_THRESHOLD_HOURS = 48;

function isShipmentDelayed(shipment: Shipment): boolean {
  if (shipment.status === 'delivered' || shipment.status === 'cancelled') {
    return false;
  }
  
  const now = new Date();
  const createdAt = shipment.createdAt;
  const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  
  return hoursElapsed > DELAYED_THRESHOLD_HOURS;
}

function calculateDelayedShipments(companyId?: string): Shipment[] {
  const allShipments = shipmentService.getAllShipments(companyId);
  return allShipments.filter(isShipmentDelayed);
}

/**
 * RULE: Today's Inventory Movement
 * Stock In: Sum of all 'stock_in' activity quantities for today
 * Stock Out: Sum of all 'stock_out' activity quantities for today
 * 
 * "Today" is defined as: 00:00:00 to 23:59:59 of the current day
 * Scoped to company.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function calculateTodayMovement(companyId?: string): DailyMovement {
  const today = new Date();
  const allLogs = activityService.getAllLogs(companyId);
  
  let stockIn = 0;
  let stockOut = 0;
  
  for (const log of allLogs) {
    if (!isSameDay(log.createdAt, today)) {
      continue;
    }
    
    const quantity = (log.metadata?.quantity as number) || 0;
    
    if (log.type === 'stock_in') {
      stockIn += quantity;
    } else if (log.type === 'stock_out') {
      stockOut += quantity;
    }
  }
  
  return {
    stockIn,
    stockOut,
    date: today,
  };
}

/**
 * RULE: Average Delivery Time
 * Calculated as: Average of (deliveredAt - createdAt) for all delivered shipments
 * 
 * - Only considers shipments with status 'delivered'
 * - Only considers shipments that have deliveredAt timestamp
 * - Returns 0 if no delivered shipments exist
 * - Time is returned in hours
 * Scoped to company.
 */
function calculateDeliveryMetrics(companyId?: string): DeliveryMetrics {
  const allShipments = shipmentService.getAllShipments(companyId);
  const deliveredShipments = allShipments.filter(
    s => s.status === 'delivered' && s.deliveredAt
  );
  
  if (deliveredShipments.length === 0) {
    return {
      averageDeliveryTimeHours: 0,
      totalDelivered: 0,
    };
  }
  
  let totalHours = 0;
  
  for (const shipment of deliveredShipments) {
    const createdAt = shipment.createdAt.getTime();
    const deliveredAt = shipment.deliveredAt!.getTime();
    const hours = (deliveredAt - createdAt) / (1000 * 60 * 60);
    totalHours += hours;
  }
  
  return {
    averageDeliveryTimeHours: Math.round(totalHours / deliveredShipments.length),
    totalDelivered: deliveredShipments.length,
  };
}

// ============================================
// DASHBOARD SERVICE
// ============================================

class DashboardService {
  /**
   * Returns all dashboard statistics, computed from centralized rules
   * Scoped to company when companyId is provided
   */
  getStats(companyId?: string): DashboardStats {
    const inventoryStats = inventoryService.getStats(companyId);
    const shipmentStats = shipmentService.getStats(companyId);
    const delayedShipments = calculateDelayedShipments(companyId);
    
    // Enhance shipment stats with delayed count
    const enhancedShipmentStats = {
      ...shipmentStats,
      delayedCount: delayedShipments.length,
    };
    
    return {
      inventory: inventoryStats,
      shipments: enhancedShipmentStats,
      recentActivities: activityService.getRecentLogs(5, companyId),
      lowStockItems: calculateLowStockItems(companyId),
      delayedShipments,
      todayMovement: calculateTodayMovement(companyId),
      deliveryMetrics: calculateDeliveryMetrics(companyId),
    };
  }

  /**
   * Get low stock items using centralized rule
   * Scoped to company
   */
  getLowStockItems(companyId?: string): InventoryItem[] {
    return calculateLowStockItems(companyId);
  }

  /**
   * Get delayed shipments using centralized rule
   * Scoped to company
   */
  getDelayedShipments(companyId?: string): Shipment[] {
    return calculateDelayedShipments(companyId);
  }

  /**
   * Check if a specific shipment is delayed
   */
  isShipmentDelayed(shipment: Shipment): boolean {
    return isShipmentDelayed(shipment);
  }

  /**
   * Get today's inventory movement
   * Scoped to company
   */
  getTodayMovement(companyId?: string): DailyMovement {
    return calculateTodayMovement(companyId);
  }

  /**
   * Get delivery time metrics
   * Scoped to company
   */
  getDeliveryMetrics(companyId?: string): DeliveryMetrics {
    return calculateDeliveryMetrics(companyId);
  }

  /**
   * Configuration: Hours threshold for delayed shipments
   */
  getDelayedThresholdHours(): number {
    return DELAYED_THRESHOLD_HOURS;
  }
}

export const dashboardService = new DashboardService();
