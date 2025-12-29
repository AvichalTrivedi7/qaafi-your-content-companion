import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  Building2,
  Settings, 
  Menu, 
  X,
  ChevronLeft,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  isCollapsed?: boolean;
}

const NavItem = ({ to, icon, label, isActive, isCollapsed }: NavItemProps) => (
  <Link
    to={to}
    className={cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
      'hover:bg-sidebar-accent',
      isActive 
        ? 'bg-sidebar-accent text-sidebar-primary font-medium' 
        : 'text-sidebar-foreground/80',
      isCollapsed && 'justify-center px-2'
    )}
  >
    {icon}
    {!isCollapsed && <span>{label}</span>}
  </Link>
);

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const { t } = useLanguage();
  const location = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navItems = [
    { to: '/admin', icon: <LayoutDashboard className="h-5 w-5" />, label: t('nav.dashboard') },
    { to: '/admin/companies', icon: <Building2 className="h-5 w-5" />, label: t('nav.companies') },
    { to: '/admin/inventory', icon: <Package className="h-5 w-5" />, label: t('nav.inventory') },
    { to: '/admin/shipments', icon: <Truck className="h-5 w-5" />, label: t('nav.shipments') },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-sidebar-primary" />
            <span className="text-xl font-bold text-sidebar-primary">{t('app.name')}</span>
            <span className="text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-0.5 rounded-full">
              {t('role.admin')}
            </span>
          </div>
        </div>
        <LanguageToggle />
      </header>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'hidden lg:flex fixed top-0 left-0 h-screen flex-col bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300',
          isCollapsed ? 'w-16' : 'w-64'
        )}
      >
        <div className={cn(
          'h-16 flex items-center border-b border-sidebar-border px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}>
          {!isCollapsed && (
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-sidebar-primary" />
                <h1 className="text-xl font-bold text-sidebar-primary">{t('app.name')}</h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-sidebar-foreground/60">{t('admin.controlPanel')}</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', isCollapsed && 'rotate-180')} />
          </Button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              isActive={location.pathname === item.to}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>

        <div className={cn(
          'p-3 border-t border-sidebar-border',
          isCollapsed && 'flex justify-center'
        )}>
          {!isCollapsed && <LanguageToggle />}
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-sidebar border-r border-sidebar-border z-50 transition-transform duration-300',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              isActive={location.pathname === item.to}
            />
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'pt-16 lg:pt-0 transition-all duration-300 min-h-screen',
          isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
        )}
      >
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
