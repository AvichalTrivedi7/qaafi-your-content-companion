import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

const PendingApproval = () => {
  const { t } = useLanguage();
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleRefresh = () => {
    window.location.reload();
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
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">
              {t('pending.title') || 'Account Pending Approval'}
            </CardTitle>
            <CardDescription className="text-base">
              {t('pending.description') || 'Your account is awaiting approval from an administrator. You will be notified once your account has been activated.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('pending.loggedInAs') || 'Logged in as'}: <span className="font-medium text-foreground">{user?.email}</span>
            </p>
            
            <div className="flex flex-col gap-3">
              <Button variant="outline" onClick={handleRefresh} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('pending.refresh') || 'Check Status'}
              </Button>
              
              <Button variant="ghost" onClick={handleSignOut} className="w-full text-muted-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout') || 'Sign Out'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PendingApproval;
