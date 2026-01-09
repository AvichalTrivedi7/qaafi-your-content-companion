import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/domain/database.types';

type Role = typeof AppRole[keyof typeof AppRole];

interface UserProfile {
  id: string;
  userId: string;
  email: string;
  companyId: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  roles: Role[];
  isLoading: boolean;
  isAuthenticated: boolean;
  // Role checking helpers
  hasRole: (role: Role) => boolean;
  hasAnyRole: (roles: Role[]) => boolean;
  isAdmin: boolean;
  isLogistics: boolean;
  isRetailer: boolean;
  isWholesaler: boolean;
  isPending: boolean;
  // Permissions based on roles
  canViewInventory: boolean;
  canViewDashboard: boolean;
  canViewSettings: boolean;
  canViewShipments: boolean;
  canUpdateShipments: boolean;
  canManageInventory: boolean;
  canCreateShipments: boolean;
  // Auth actions
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user profile and roles
  const fetchUserData = useCallback(async (userId: string) => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      } else if (profileData) {
        setProfile({
          id: profileData.id,
          userId: profileData.user_id,
          email: profileData.email,
          companyId: profileData.company_id,
        });
      }

      // Fetch roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      } else if (rolesData) {
        setRoles(rolesData.map(r => r.role as Role));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer Supabase calls with setTimeout
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  // Role checking helpers
  const hasRole = useCallback((role: Role) => roles.includes(role), [roles]);
  const hasAnyRole = useCallback((checkRoles: Role[]) => 
    checkRoles.some(role => roles.includes(role)), [roles]);

  // Computed role flags
  const isAdmin = hasRole(AppRole.ADMIN);
  const isLogistics = hasRole(AppRole.LOGISTICS);
  const isRetailer = hasRole(AppRole.RETAILER);
  const isWholesaler = hasRole(AppRole.WHOLESALER);
  const isPending = hasRole(AppRole.PENDING);

  // Permission flags based on requirements:
  // - Admins: Full access to everything
  // - Wholesalers: Can manage inventory and shipments
  // - Logistics: Can view and update shipments
  // - Retailers: Can view shipment status only
  const canViewInventory = isAdmin || isWholesaler;
  const canManageInventory = isAdmin || isWholesaler;
  const canViewDashboard = isAdmin || isWholesaler || isLogistics || isRetailer;
  const canViewSettings = isAdmin;
  const canViewShipments = isAdmin || isWholesaler || isLogistics || isRetailer;
  const canUpdateShipments = isAdmin || isWholesaler || isLogistics;
  const canCreateShipments = isAdmin || isWholesaler;

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    roles,
    isLoading,
    isAuthenticated: !!user,
    hasRole,
    hasAnyRole,
    isAdmin,
    isLogistics,
    isRetailer,
    isWholesaler,
    isPending,
    canViewInventory,
    canViewDashboard,
    canViewSettings,
    canViewShipments,
    canUpdateShipments,
    canManageInventory,
    canCreateShipments,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for role-based access
interface RequireRoleProps {
  roles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const { hasAnyRole, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (!hasAnyRole(roles)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Component to show content only for specific permissions
interface CanAccessProps {
  permission: 'inventory' | 'dashboard' | 'settings' | 'shipments' | 'updateShipments';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function CanAccess({ permission, children, fallback = null }: CanAccessProps) {
  const auth = useAuth();
  
  if (auth.isLoading) {
    return null;
  }
  
  const permissionMap = {
    inventory: auth.canViewInventory,
    dashboard: auth.canViewDashboard,
    settings: auth.canViewSettings,
    shipments: auth.canViewShipments,
    updateShipments: auth.canUpdateShipments,
  };
  
  if (!permissionMap[permission]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
