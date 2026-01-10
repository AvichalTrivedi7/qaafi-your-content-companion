// Company Service for Qaafi MVP
// Uses repository pattern for data access

import { Company, CompanyType, CompanyStats } from '@/domain/models';
import { 
  ICompanyRepository, 
  companyRepository as defaultCompanyRepo 
} from '@/repositories';

export class CompanyService {
  constructor(
    private companyRepo: ICompanyRepository = defaultCompanyRepo
  ) {}

  // Get all companies
  getAll(): Company[] {
    return this.companyRepo.findAll();
  }

  // Get company by ID
  getById(id: string): Company | undefined {
    return this.companyRepo.findById(id);
  }

  // Get company by access code (for external view)
  getByAccessCode(accessCode: string): Company | undefined {
    return this.companyRepo.findByAccessCode(accessCode);
  }

  // Get companies by type
  getByType(type: CompanyType): Company[] {
    return this.companyRepo.findByType(type);
  }

  // Create a new company
  create(data: Omit<Company, 'id' | 'createdAt' | 'updatedAt' | 'accessCode'>): Company {
    const accessCode = this.generateAccessCode();
    const newCompany: Company = {
      ...data,
      id: crypto.randomUUID(),
      accessCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.companyRepo.create(newCompany);
  }

  // Update a company
  update(id: string, data: Partial<Omit<Company, 'id' | 'createdAt' | 'accessCode'>>): Company | undefined {
    return this.companyRepo.update(id, data);
  }

  // Delete a company
  delete(id: string): boolean {
    return this.companyRepo.delete(id);
  }

  // Regenerate access code for a company
  regenerateAccessCode(id: string): string | undefined {
    const company = this.getById(id);
    if (!company) return undefined;

    const newCode = this.generateAccessCode();
    this.companyRepo.updateAccessCode(id, newCode);
    return newCode;
  }

  // Get company statistics
  getStats(): CompanyStats {
    const companies = this.getAll();
    const activeCompanies = this.companyRepo.findActive();
    return {
      totalCompanies: companies.length,
      supplierCount: companies.filter(c => c.type === 'supplier').length,
      wholesalerCount: companies.filter(c => c.type === 'wholesaler').length,
      retailerCount: companies.filter(c => c.type === 'retailer').length,
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

// Default singleton instance
export const companyService = new CompanyService();
