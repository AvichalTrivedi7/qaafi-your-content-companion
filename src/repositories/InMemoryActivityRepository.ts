// In-Memory Activity Repository Implementation

import { ActivityLog, ActivityType, ReferenceType } from '@/domain/models';
import { mockActivityLogs } from '@/domain/mockData';
import { IActivityRepository } from './interfaces';

export class InMemoryActivityRepository implements IActivityRepository {
  private logs: ActivityLog[] = [...mockActivityLogs];

  findAll(companyId?: string): ActivityLog[] {
    let logs = [...this.logs];
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findById(id: string): ActivityLog | undefined {
    return this.logs.find(log => log.id === id);
  }

  findByType(type: ActivityType, companyId?: string): ActivityLog[] {
    return this.findAll(companyId).filter(log => log.type === type);
  }

  findByReference(
    referenceId: string,
    referenceType?: ReferenceType,
    companyId?: string
  ): ActivityLog[] {
    return this.findAll(companyId).filter(log => {
      if (referenceType) {
        return log.referenceId === referenceId && log.referenceType === referenceType;
      }
      return log.referenceId === referenceId;
    });
  }

  findRecent(limit: number, companyId?: string): ActivityLog[] {
    return this.findAll(companyId).slice(0, limit);
  }

  create(log: ActivityLog, _companyId?: string): ActivityLog {
    this.logs.unshift(log);
    return log;
  }

  delete(id: string): boolean {
    const index = this.logs.findIndex(log => log.id === id);
    if (index === -1) return false;
    this.logs.splice(index, 1);
    return true;
  }
}

// Singleton instance for the application
export const activityRepository = new InMemoryActivityRepository();
