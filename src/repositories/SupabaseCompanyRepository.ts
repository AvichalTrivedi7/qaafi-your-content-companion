// Supabase Company Repository Implementation

import { supabase } from '@/integrations/supabase/client';
import { Company, CompanyType } from '@/domain/models';
import { ICompanyRepository } from './interfaces';

// Helper to convert DB row to domain model
function toDomainModel(row: any): Company {
  return {
    id: row.id,
    name: row.name,
    type: row.type as CompanyType,
    contactEmail: '', // Not in DB yet - can be added later
    contactPhone: undefined,
    address: undefined,
    accessCode: row.access_code || '',
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// Helper to convert domain model to DB row
function toDbRow(company: Company): any {
  return {
    id: company.id,
    name: company.name,
    type: company.type,
    access_code: company.accessCode,
    is_active: company.isActive,
  };
}

export class SupabaseCompanyRepository implements ICompanyRepository {
  private cache: Map<string, Company> = new Map();
  private allLoaded = false;

  findAll(): Company[] {
    if (!this.allLoaded) {
      this.loadAll();
    }
    return Array.from(this.cache.values());
  }

  private async loadAll(): Promise<void> {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      this.cache.clear();
      data.forEach(row => {
        const company = toDomainModel(row);
        this.cache.set(company.id, company);
      });
      this.allLoaded = true;
    }
  }

  findById(id: string): Company | undefined {
    return this.cache.get(id);
  }

  findByAccessCode(accessCode: string): Company | undefined {
    return Array.from(this.cache.values()).find(c => c.accessCode === accessCode);
  }

  findByType(type: CompanyType): Company[] {
    return Array.from(this.cache.values()).filter(c => c.type === type);
  }

  findActive(): Company[] {
    return Array.from(this.cache.values()).filter(c => c.isActive);
  }

  create(entity: Company): Company {
    this.cache.set(entity.id, entity);

    const dbRow = toDbRow(entity);
    supabase
      .from('companies')
      .insert(dbRow)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to persist company:', error);
          this.cache.delete(entity.id);
        }
      });

    return entity;
  }

  update(id: string, updates: Partial<Company>): Company | undefined {
    const existing = this.cache.get(id);
    if (!existing) return undefined;

    const updated: Company = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.cache.set(id, updated);

    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.accessCode !== undefined) dbUpdates.access_code = updates.accessCode;
    if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

    supabase
      .from('companies')
      .update(dbUpdates)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to update company:', error);
          this.cache.set(id, existing);
        }
      });

    return updated;
  }

  updateAccessCode(id: string, accessCode: string): Company | undefined {
    return this.update(id, { accessCode });
  }

  delete(id: string): boolean {
    const existed = this.cache.has(id);
    if (!existed) return false;

    const backup = this.cache.get(id);
    this.cache.delete(id);

    supabase
      .from('companies')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('Failed to delete company:', error);
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
