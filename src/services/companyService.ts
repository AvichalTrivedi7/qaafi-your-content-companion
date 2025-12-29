// Company Service for Qaafi MVP
import { Company, CompanyType, CompanyStats } from '@/domain/models';
import { mockCompanies } from '@/domain/mockData';

class CompanyService {
  private companies: Company[] = [...mockCompanies];

  // Get all companies
  getAll(): Company[] {
    return [...this.companies];
  }

  // Get company by ID
  getById(id: string): Company | undefined {
    return this.companies.find(c => c.id === id);
  }

  // Get company by access code (for external view)
  getByAccessCode(accessCode: string): Company | undefined {
    return this.companies.find(c => c.accessCode === accessCode && c.isActive);
  }

  // Get companies by type
  getByType(type: CompanyType): Company[] {
    return this.companies.filter(c => c.type === type);
  }

  // Create a new company
  create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'accessCode'>): Company {
    const accessCode = this.generateAccessCode();
    const newCompany: Company = {
      ...data,
      id: `company-${Date.now()}`,
      accessCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.companies.push(newCompany);
    return newCompany;
  }

  // Update a company
  update(id: string, data: Partial<Omit<Company, 'id' | 'createdAt' | 'accessCode'>>): Company | undefined {
    const index = this.companies.findIndex(c => c.id === id);
    if (index === -1) return undefined;

    this.companies[index] = {
      ...this.companies[index],
      ...data,
      updatedAt: new Date(),
    };
    return this.companies[index];
  }

  // Delete a company
  delete(id: string): boolean {
    const index = this.companies.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.companies.splice(index, 1);
    return true;
  }

  // Regenerate access code for a company
  regenerateAccessCode(id: string): string | undefined {
    const company = this.getById(id);
    if (!company) return undefined;
    
    const newCode = this.generateAccessCode();
    this.update(id, { accessCode: newCode } as any);
    return newCode;
  }

  // Get company statistics
  getStats(): CompanyStats {
    const activeCompanies = this.companies.filter(c => c.isActive);
    return {
      totalCompanies: this.companies.length,
      supplierCount: this.companies.filter(c => c.type === 'supplier').length,
      wholesalerCount: this.companies.filter(c => c.type === 'wholesaler').length,
      retailerCount: this.companies.filter(c => c.type === 'retailer').length,
      activeCount: activeCompanies.length,
    };
  }

  // Generate a unique access code
  private generateAccessCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

export const companyService = new CompanyService();
