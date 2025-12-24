// Activity Service - Centralized activity logging
import { ActivityLog, ActivityType } from '@/domain/models';
import { mockActivityLogs } from '@/domain/mockData';

class ActivityService {
  private logs: ActivityLog[] = [...mockActivityLogs];

  getAllLogs(): ActivityLog[] {
    return [...this.logs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getRecentLogs(limit: number = 10): ActivityLog[] {
    return this.getAllLogs().slice(0, limit);
  }

  getLogsByType(type: ActivityType): ActivityLog[] {
    return this.logs
      .filter(log => log.type === type)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getLogsByReference(referenceId: string, referenceType?: 'inventory' | 'shipment' | 'reservation'): ActivityLog[] {
    return this.logs
      .filter(log => {
        if (referenceType) {
          return log.referenceId === referenceId && log.referenceType === referenceType;
        }
        return log.referenceId === referenceId;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  logActivity(
    type: ActivityType,
    description: string,
    referenceId?: string,
    referenceType?: 'inventory' | 'shipment' | 'reservation',
    metadata?: Record<string, unknown>
  ): ActivityLog {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}`,
      type,
      description,
      referenceId,
      referenceType,
      metadata,
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
