import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Package, Truck, LogOut, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';

interface ExternalLayoutProps {
  children: React.ReactNode;
}

export const ExternalLayout = ({ children }: ExternalLayoutProps) => {
  const { t } = useLanguage();
  const { currentCompany, clearCompany } = useCompany();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearCompany();
    navigate('/');
  };

  if (!currentCompany) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Minimal and clean */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-primary font-bold">Q</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{currentCompany.name}</h1>
              <p className="text-xs text-muted-foreground capitalize">{t(`role.${currentCompany.type}`)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t('common.close')}
            </Button>
          </div>
        </div>
      </header>

      {/* Simple tab navigation */}
      <div className="fixed top-16 left-0 right-0 bg-card border-b border-border z-40">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1">
            <Link
              to="/portal"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                'hover:text-foreground hover:bg-muted/50',
                location.pathname === '/portal'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              {t('nav.dashboard')}
            </Link>
            <Link
              to="/portal/goods"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                'hover:text-foreground hover:bg-muted/50',
                location.pathname === '/portal/goods'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              )}
            >
              <Package className="h-4 w-4" />
              {t('nav.goods')}
            </Link>
            <Link
              to="/portal/shipments"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                'hover:text-foreground hover:bg-muted/50',
                location.pathname === '/portal/shipments'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              )}
            >
              <Truck className="h-4 w-4" />
              {t('nav.shipments')}
            </Link>
          </nav>
        </div>
      </div>

      {/* Main Content - Clean and focused */}
      <main className="pt-28 pb-8">
        <div className="max-w-5xl mx-auto px-4">
          {children}
        </div>
      </main>
    </div>
  );
};
