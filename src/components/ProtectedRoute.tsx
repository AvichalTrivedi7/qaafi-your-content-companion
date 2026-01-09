import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AppRole } from '@/domain/database.types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: (typeof AppRole[keyof typeof AppRole])[];
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRoles,
  redirectTo = '/' 
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, roles, hasAnyRole, rolesLoaded } = useAuth();

  // Wait for auth to complete
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Wait for roles to load before making routing decisions
  if (!rolesLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If specific roles are required, check them
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(requiredRoles)) {
      // Redirect to dashboard if user doesn't have required role
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

// Admin-only route component
export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={[AppRole.ADMIN]} redirectTo="/dashboard">
      {children}
    </ProtectedRoute>
  );
}
