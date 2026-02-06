// In-Memory Company Repository Implementation

import { Company, CompanyType } from '@/domain/models';
import { mockCompanies } from '@/domain/mockData';
import { ICompanyRepository } from './interfaces';

export class InMemoryCompanyRepository implements ICompanyRepository {
  private companies: Company[] = [...mockCompanies];

  findAll(): Company[] {
    return [...this.companies];
  }

  findById(id: string): Company | undefined {
    return this.companies.find(c => c.id === id);
  }

  findByAccessCode(accessCode: string): Company | undefined {
    return this.companies.find(c => c.accessCode === accessCode && c.isActive);
  }

  findByType(type: CompanyType): Company[] {
    return this.companies.filter(c => c.type === type);
  }

  findActive(): Company[] {
    return this.companies.filter(c => c.isActive);
  }

  create(entity: Company, _companyId?: string): Company {
    this.companies.push(entity);
    return entity;
  }

  update(id: string, updates: Partial<Company>): Company | undefined {
    const index = this.companies.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.companies[index] = {
      ...this.companies[index],
      ...updates,
      updatedAt: new Date(),
    };
    return this.companies[index];
  }

  updateAccessCode(id: string, accessCode: string): Company | undefined {
    return this.update(id, { accessCode });
  }

  delete(id: string): boolean {
    const index = this.companies.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.companies.splice(index, 1);
    return true;
  }
}

// Singleton instance for the application
export const companyRepository = new InMemoryCompanyRepository();
