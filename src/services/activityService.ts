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
      [ActivityType.INVENTORY_IN]: 'plus',
      [ActivityType.INVENTORY_OUT]: 'minus',
      [ActivityType.SHIPMENT_CREATED]: 'package',
      [ActivityType.SHIPMENT_UPDATED]: 'truck',
      [ActivityType.SHIPMENT_DELIVERED]: 'check-circle',
      [ActivityType.SHIPMENT_CANCELLED]: 'x-circle',
      [ActivityType.RESERVATION_CREATED]: 'lock',
      [ActivityType.RESERVATION_RELEASED]: 'unlock',
    };
    return icons[type] || 'activity';
  }

  getActivityColor(type: ActivityType): 'success' | 'warning' | 'info' | 'default' | 'destructive' {
    const colors: Record<ActivityType, 'success' | 'warning' | 'info' | 'default' | 'destructive'> = {
      [ActivityType.INVENTORY_IN]: 'success',
      [ActivityType.INVENTORY_OUT]: 'warning',
      [ActivityType.SHIPMENT_CREATED]: 'info',
      [ActivityType.SHIPMENT_UPDATED]: 'info',
      [ActivityType.SHIPMENT_DELIVERED]: 'success',
      [ActivityType.SHIPMENT_CANCELLED]: 'destructive',
      [ActivityType.RESERVATION_CREATED]: 'default',
      [ActivityType.RESERVATION_RELEASED]: 'default',
    };
    return colors[type] || 'default';
  }
}

export const activityService = new ActivityService();
