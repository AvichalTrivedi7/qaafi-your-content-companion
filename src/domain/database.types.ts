// Database types matching Supabase schema

export const CompanyType = {
  SUPPLIER: 'supplier',
  WHOLESALER: 'wholesaler',
  RETAILER: 'retailer',
  MANUFACTURER: 'manufacturer',
} as const;

export type CompanyType = typeof CompanyType[keyof typeof CompanyType];

export const AppRole = {
  ADMIN: 'admin',
  USER: 'user',
} as const;

export type AppRole = typeof AppRole[keyof typeof AppRole];

export interface DbCompany {
  id: string;
  name: string;
  type: CompanyType;
  is_active: boolean;
  access_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  email: string;
  company_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

// Insert/Update types (omit auto-generated fields)
export type DbCompanyInsert = Omit<DbCompany, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type DbCompanyUpdate = Partial<Omit<DbCompany, 'id' | 'created_at' | 'updated_at'>>;

export type DbProfileInsert = Omit<DbProfile, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
};

export type DbProfileUpdate = Partial<Omit<DbProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type DbUserRoleInsert = Omit<DbUserRole, 'id' | 'created_at'> & {
  id?: string;
};
