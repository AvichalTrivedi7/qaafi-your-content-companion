// Dashboard Service - Aggregates data for dashboard view
import { DashboardStats } from '@/domain/models';
import { inventoryService } from './inventoryService';
import { shipmentService } from './shipmentService';
import { activityService } from './activityService';

class DashboardService {
  getStats(): DashboardStats {
    return {
      inventory: inventoryService.getStats(),
      shipments: shipmentService.getStats(),
      recentActivities: activityService.getRecentLogs(5),
      lowStockItems: inventoryService.getLowStockItems(),
    };
  }
}

export const dashboardService = new DashboardService();
