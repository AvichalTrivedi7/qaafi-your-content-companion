import { Link, useNavigate } from 'react-router-dom';
import { Package, Truck, LogOut, Eye } from 'lucide-react';
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

  const handleLogout = () => {
    clearCompany();
    navigate('/');
  };

  if (!currentCompany) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Minimal and clean */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50">
        <div className="max-w-5xl mx-auto h-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">{currentCompany.name}</h1>
              <p className="text-xs text-muted-foreground capitalize">{t(`company.type.${currentCompany.type}`)}</p>
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
              {t('common.exit')}
            </Button>
          </div>
        </div>
      </header>

      {/* Simple tab navigation */}
      <div className="fixed top-16 left-0 right-0 bg-card border-b border-border z-40">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1">
            <Link
              to="/view/goods"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                'hover:text-foreground hover:bg-muted/50',
                location.pathname === '/view/goods'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              )}
            >
              <Package className="h-4 w-4" />
              {t('external.myGoods')}
            </Link>
            <Link
              to="/view/shipments"
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                'hover:text-foreground hover:bg-muted/50',
                location.pathname === '/view/shipments'
                  ? 'text-primary border-primary'
                  : 'text-muted-foreground border-transparent'
              )}
            >
              <Truck className="h-4 w-4" />
              {t('external.myShipments')}
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
