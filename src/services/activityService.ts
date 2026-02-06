// Activity Service - Centralized activity logging
// All methods require companyId for data isolation
// Uses repository pattern for data access

import { ActivityLog, ActivityType, ReferenceType } from '@/domain/models';
import { 
  IActivityRepository, 
  activityRepository as defaultActivityRepo 
} from '@/repositories';

export class ActivityService {
  constructor(
    private activityRepo: IActivityRepository = defaultActivityRepo
  ) {}

  // Get all logs, optionally scoped to company
  getAllLogs(companyId?: string): ActivityLog[] {
    return this.activityRepo.findAll(companyId);
  }

  // Get recent logs, optionally scoped to company
  getRecentLogs(limit: number = 10, companyId?: string): ActivityLog[] {
    return this.activityRepo.findRecent(limit, companyId);
  }

  // Get logs by type, optionally scoped to company
  getLogsByType(type: ActivityType, companyId?: string): ActivityLog[] {
    return this.activityRepo.findByType(type, companyId);
  }

  // Get logs by reference, optionally scoped to company
  getLogsByReference(
    referenceId: string,
    referenceType?: ReferenceType,
    companyId?: string
  ): ActivityLog[] {
    return this.activityRepo.findByReference(referenceId, referenceType, companyId);
  }

  // Log activity with company association
  // Returns the activity ID for potential rollback
  logActivity(
    type: ActivityType,
    description: string,
    referenceId?: string,
    referenceType?: ReferenceType,
    metadata?: Record<string, unknown>,
    companyId?: string
  ): string {
    const newLog: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      referenceId,
      referenceType,
      metadata,
      companyId,
      createdAt: new Date(),
    };

    this.activityRepo.create(newLog);
    return newLog.id;
  }

  /**
   * Removes an activity log by ID (for rollback purposes)
   */
  removeActivity(activityId: string): boolean {
    return this.activityRepo.delete(activityId);
  }

  getActivityIcon(type: ActivityType): string {
    const icons: Record<ActivityType, string> = {
      [ActivityType.INVENTORY_IN]: 'plus',
      [ActivityType.INVENTORY_OUT]: 'minus',
      [ActivityType.INVENTORY_UPDATED]: 'edit',
      [ActivityType.SHIPMENT_CREATED]: 'package',
      [ActivityType.SHIPMENT_UPDATED]: 'truck',
      [ActivityType.SHIPMENT_DELIVERED]: 'check-circle',
      [ActivityType.SHIPMENT_CANCELLED]: 'x-circle',
      [ActivityType.RESERVATION_CREATED]: 'lock',
      [ActivityType.RESERVATION_RELEASED]: 'unlock',
      [ActivityType.COMPANY_CREATED]: 'building',
    };
    return icons[type] || 'activity';
  }

  getActivityColor(type: ActivityType): 'success' | 'warning' | 'info' | 'default' | 'destructive' {
    const colors: Record<ActivityType, 'success' | 'warning' | 'info' | 'default' | 'destructive'> = {
      [ActivityType.INVENTORY_IN]: 'success',
      [ActivityType.INVENTORY_OUT]: 'warning',
      [ActivityType.INVENTORY_UPDATED]: 'info',
      [ActivityType.SHIPMENT_CREATED]: 'info',
      [ActivityType.SHIPMENT_UPDATED]: 'info',
      [ActivityType.SHIPMENT_DELIVERED]: 'success',
      [ActivityType.SHIPMENT_CANCELLED]: 'destructive',
      [ActivityType.RESERVATION_CREATED]: 'default',
      [ActivityType.RESERVATION_RELEASED]: 'default',
      [ActivityType.COMPANY_CREATED]: 'success',
    };
    return colors[type] || 'default';
  }
}

// Default singleton instance
export const activityService = new ActivityService();
