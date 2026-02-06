import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Search, 
  Key,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

type CompanyType = 'supplier' | 'wholesaler' | 'retailer' | 'manufacturer';

interface Company {
  id: string;
  name: string;
  type: CompanyType;
  isActive: boolean;
  accessCode: string | null;
  createdAt: Date;
}

const AdminCompaniesView = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CompanyType | 'all'>('all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        setCompanies((data || []).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type as CompanyType,
          isActive: c.is_active,
          accessCode: c.access_code,
          createdAt: new Date(c.created_at),
        })));
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchCompanies();
    }
  }, [isAdmin]);

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || company.type === filterType;
    return matchesSearch && matchesType;
  });

  const copyAccessCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: t('admin.codeCopied'),
    });
  };

  const getTypeVariant = (type: CompanyType) => {
    switch (type) {
      case 'supplier': return 'default';
      case 'wholesaler': return 'secondary';
      case 'retailer': return 'outline';
      case 'manufacturer': return 'destructive';
    }
  };

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.companies')}</h1>
          <p className="text-muted-foreground">{t('admin.companiesViewOnly')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchCompanies')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as CompanyType | 'all')}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              <SelectItem value="supplier">{t('company.type.supplier')}</SelectItem>
              <SelectItem value="wholesaler">{t('company.type.wholesaler')}</SelectItem>
              <SelectItem value="retailer">{t('company.type.retailer')}</SelectItem>
              <SelectItem value="manufacturer">{t('company.type.manufacturer')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Companies Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map(company => (
            <Card key={company.id} className={!company.isActive ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{company.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={getTypeVariant(company.type)}>
                          {t(`company.type.${company.type}`)}
                        </Badge>
                        {!company.isActive && (
                          <Badge variant="outline" className="text-muted-foreground">
                            {t('admin.inactive')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  {t('admin.created')}: {company.createdAt.toLocaleDateString()}
                </div>
                
                {/* Access Code */}
                {company.accessCode && (
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm">
                        <Key className="h-4 w-4 text-primary" />
                        <span className="font-mono font-medium">{company.accessCode}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyAccessCode(company.accessCode!)}
                      >
                        {copiedCode === company.accessCode ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCompaniesView;
