import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Access = () => {
  const { t } = useLanguage();
  const { setCompanyByAccessCode } = useCompany();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAdminAccess = () => {
    navigate('/admin');
  };

  const handleExternalAccess = () => {
    if (!accessCode.trim()) return;
    
    setIsLoading(true);
    const result = setCompanyByAccessCode(accessCode.trim());
    setIsLoading(false);
    
    if (result.success) {
      navigate('/portal');
    } else {
      toast({
        title: result.error === 'inactive' ? t('access.companyInactive') : t('access.invalidCode'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">Q</span>
          </div>
          <span className="font-semibold text-lg">{t('app.name')}</span>
        </div>
        <LanguageToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl space-y-8">
          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{t('access.title')}</h1>
            <p className="text-muted-foreground">{t('access.subtitle')}</p>
          </div>

          {/* Access Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Admin Access */}
            <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={handleAdminAccess}>
              <CardHeader className="text-center pb-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-xl">{t('access.adminAccess')}</CardTitle>
                <CardDescription>{t('access.adminDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="default">
                  {t('access.adminAccess')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* External Access */}
            <Card className="hover:shadow-lg transition-all duration-200">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-info/10 flex items-center justify-center mb-4">
                  <Building2 className="h-7 w-7 text-info" />
                </div>
                <CardTitle className="text-xl">{t('access.externalAccess')}</CardTitle>
                <CardDescription>{t('access.externalDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder={t('access.enterCode')}
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExternalAccess()}
                  className="text-center font-mono text-lg tracking-wider"
                />
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={handleExternalAccess}
                  disabled={!accessCode.trim() || isLoading}
                >
                  {t('access.submit')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Tagline */}
          <p className="text-center text-sm text-muted-foreground">
            {t('app.tagline')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default Access;
