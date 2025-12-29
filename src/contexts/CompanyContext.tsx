// Company Context for External View Access
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Company } from '@/domain/models';
import { companyService } from '@/services/companyService';

interface AccessResult {
  success: boolean;
  error?: 'not_found' | 'inactive';
}

interface CompanyContextType {
  currentCompany: Company | null;
  setCompanyByAccessCode: (code: string) => AccessResult;
  clearCompany: () => void;
  isExternalView: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);

  const setCompanyByAccessCode = (code: string): AccessResult => {
    const company = companyService.getByAccessCode(code);
    if (!company) {
      return { success: false, error: 'not_found' };
    }
    if (!company.isActive) {
      return { success: false, error: 'inactive' };
    }
    setCurrentCompany(company);
    return { success: true };
  };

  const clearCompany = () => {
    setCurrentCompany(null);
  };

  const isExternalView = currentCompany !== null;

  return (
    <CompanyContext.Provider value={{ 
      currentCompany, 
      setCompanyByAccessCode, 
      clearCompany,
      isExternalView 
    }}>
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = (): CompanyContextType => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
