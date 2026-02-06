// Supabase Activity Repository Implementation

import { supabase } from '@/integrations/supabase/client';
import { ActivityLog, ActivityType, ReferenceType } from '@/domain/models';
import { IActivityRepository } from './interfaces';

// Helper to convert DB row to domain model
function toDomainModel(row: any): ActivityLog {
  return {
    id: row.id,
    type: row.type as ActivityType,
    description: row.description,
    referenceId: row.reference_id || undefined,
    referenceType: row.reference_type as ReferenceType | undefined,
    metadata: row.metadata || undefined,
    companyId: row.company_id,
    createdAt: new Date(row.created_at),
  };
}

// Helper to convert domain model to DB row
function toDbRow(log: ActivityLog): any {
  return {
    id: log.id,
    type: log.type,
    description: log.description,
    reference_id: log.referenceId,
    reference_type: log.referenceType,
    metadata: log.metadata,
    company_id: log.companyId,
  };
}

export class SupabaseActivityRepository implements IActivityRepository {
  private cache: Map<string, ActivityLog> = new Map();
  private allLoaded = false;

  findAll(companyId?: string): ActivityLog[] {
    if (!this.allLoaded) {
      this.loadAll();
    }
    let logs = Array.from(this.cache.values());
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (!error && data) {
      this.cache.clear();
      data.forEach(row => {
        const log = toDomainModel(row);
        this.cache.set(log.id, log);
      });
      this.allLoaded = true;
    }
  }

  findById(id: string): ActivityLog | undefined {
    return this.cache.get(id);
  }

  findByType(type: ActivityType, companyId?: string): ActivityLog[] {
    let logs = Array.from(this.cache.values()).filter(log => log.type === type);
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findByReference(
    referenceId: string,
    referenceType?: ReferenceType,
    companyId?: string
  ): ActivityLog[] {
    let logs = Array.from(this.cache.values()).filter(log => log.referenceId === referenceId);
    if (referenceType) {
      logs = logs.filter(log => log.referenceType === referenceType);
    }
    if (companyId) {
      logs = logs.filter(log => log.companyId === companyId);
    }
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  findRecent(limit: number, companyId?: string): ActivityLog[] {
    let logs = this.findAll(companyId);
    return logs.slice(0, limit);
  }

  create(log: ActivityLog, _companyId?: string): ActivityLog {
    this.cache.set(log.id, log);

    const dbRow = toDbRow(log);
    supabase
      .from('activity_logs')
      .insert(dbRow)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist activity log:', error);
          this.cache.delete(log.id);
        }
      });

    return log;
  }

  delete(id: string): boolean {
    const existed = this.cache.has(id);
    if (!existed) return false;

    const backup = this.cache.get(id);
    this.cache.delete(id);

    supabase
      .from('activity_logs')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete activity log:', error);
          if (backup) this.cache.set(id, backup);
        }
      });

    return true;
  }

  async initialize(): Promise<void> {
    await this.loadAll();
  }

  clearCache(): void {
    this.cache.clear();
    this.allLoaded = false;
  }
}
