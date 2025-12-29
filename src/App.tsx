import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CompanyProvider } from "@/contexts/CompanyContext";

// Pages
import Access from "./pages/Access";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCompanies from "./pages/admin/Companies";
import AdminInventory from "./pages/admin/Inventory";
import AdminShipments from "./pages/admin/Shipments";

// External Pages
import ExternalDashboard from "./pages/external/Dashboard";
import ExternalGoods from "./pages/external/Goods";
import ExternalShipments from "./pages/external/Shipments";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <CompanyProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Access Entry */}
              <Route path="/" element={<Access />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/inventory" element={<AdminInventory />} />
              <Route path="/admin/shipments" element={<AdminShipments />} />
              
              {/* External Portal Routes */}
              <Route path="/portal" element={<ExternalDashboard />} />
              <Route path="/portal/goods" element={<ExternalGoods />} />
              <Route path="/portal/shipments" element={<ExternalShipments />} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CompanyProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
