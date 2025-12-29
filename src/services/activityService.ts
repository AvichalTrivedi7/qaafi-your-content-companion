// Activity Service - Centralized activity logging
// All methods require companyId for data isolation

import { ActivityLog, ActivityType } from '@/domain/models';
import { mockActivityLogs } from '@/domain/mockData';

class ActivityService {
  private logs: ActivityLog[] = [...mockActivityLogs];

  // Get all logs, optionally scoped to company
  getAllLogs(companyId?: string): ActivityLog[] {
    let logs = [...this.logs];
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Get recent logs, optionally scoped to company
  getRecentLogs(limit: number = 10, companyId?: string): ActivityLog[] {
    return this.getAllLogs(companyId).slice(0, limit);
  }

  // Get logs by type, optionally scoped to company
  getLogsByType(type: ActivityType, companyId?: string): ActivityLog[] {
    return this.getAllLogs(companyId).filter(log => log.type === type);
  }

  // Get logs by reference, optionally scoped to company
  getLogsByReference(
    referenceId: string, 
    referenceType?: 'inventory' | 'shipment' | 'reservation',
    companyId?: string
  ): ActivityLog[] {
    return this.getAllLogs(companyId).filter(log => {
      if (referenceType) {
        return log.referenceId === referenceId && log.referenceType === referenceType;
      }
      return log.referenceId === referenceId;
    });
  }

  // Log activity with company association
  logActivity(
    type: ActivityType,
    description: string,
    referenceId?: string,
    referenceType?: 'inventory' | 'shipment' | 'reservation',
    metadata?: Record<string, unknown>,
    companyId?: string
  ): ActivityLog {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      type,
      description,
      referenceId,
      referenceType,
      metadata,
      companyId,
      createdAt: new Date(),
    };

    this.logs.unshift(newLog);
    return newLog;
  }

  getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      stock_in: 'plus',
      stock_out: 'minus',
      shipment_created: 'package',
      shipment_updated: 'truck',
      reservation_created: 'lock',
      reservation_released: 'unlock',
    };
    return icons[type] || 'activity';
  }

  getActivityColor(type: ActivityType): 'success' | 'warning' | 'info' | 'default' {
    const colors: Record<ActivityType, 'success' | 'warning' | 'info' | 'default'> = {
      stock_in: 'success',
      stock_out: 'warning',
      shipment_created: 'info',
      shipment_updated: 'info',
      reservation_created: 'default',
      reservation_released: 'default',
    };
    return colors[type] || 'default';
  }
}

export const activityService = new ActivityService();
