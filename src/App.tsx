// App entry point - main router and provider setup
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";

// Pages
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Dashboard (role-based single dashboard)
import AdminDashboard from "./pages/admin/Dashboard";
import AdminInventory from "./pages/admin/Inventory";
import AdminShipments from "./pages/admin/Shipments";

// Admin-only pages (hidden routes)
import AdminSystemDashboard from "./pages/admin/SystemDashboard";
import AdminCompaniesView from "./pages/admin/CompaniesView";
import AdminUsers from "./pages/admin/Users";
import AdminActivityLog from "./pages/admin/ActivityLog";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <CompanyProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes - Auth is the main entry point */}
                <Route path="/" element={<Auth />} />
                
                {/* Protected Dashboard Routes - single dashboard, role-based UI */}
                <Route path="/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/inventory" element={<ProtectedRoute><AdminInventory /></ProtectedRoute>} />
                <Route path="/dashboard/shipments" element={<ProtectedRoute><AdminShipments /></ProtectedRoute>} />
                
                {/* Hidden Admin Routes - system overview only, no business data management */}
                <Route path="/__internal__/admin" element={<AdminRoute><AdminSystemDashboard /></AdminRoute>} />
                <Route path="/__internal__/admin/companies" element={<AdminRoute><AdminCompaniesView /></AdminRoute>} />
                <Route path="/__internal__/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                <Route path="/__internal__/admin/activity" element={<AdminRoute><AdminActivityLog /></AdminRoute>} />
                
                {/* Legacy routes redirect */}
                <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Navigate to="/" replace />} />
                
                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CompanyProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
