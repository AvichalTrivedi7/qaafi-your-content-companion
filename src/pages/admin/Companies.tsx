import { useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { companyService } from '@/services/companyService';
import { Company, CompanyType } from '@/domain/models';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Key,
  Copy,
  Check,
  Edit,
  Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const AdminCompanies = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>(companyService.getAll());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<CompanyType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form state for create/edit
  const [formData, setFormData] = useState({
    name: '',
    type: 'supplier' as CompanyType,
    contactEmail: '',
    contactPhone: '',
    address: '',
    isActive: true,
  });

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || company.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleCreate = () => {
    const newCompany = companyService.create(formData);
    setCompanies(companyService.getAll());
    setIsCreateOpen(false);
    setFormData({
      name: '',
      type: 'supplier',
      contactEmail: '',
      contactPhone: '',
      address: '',
      isActive: true,
    });
    toast({
      title: t('admin.companyCreated'),
      description: `${newCompany.name} - ${t('admin.accessCode')}: ${newCompany.accessCode}`,
    });
  };

  const handleDelete = (id: string) => {
    companyService.delete(id);
    setCompanies(companyService.getAll());
    toast({
      title: t('admin.companyDeleted'),
    });
  };

  const handleToggleActive = (id: string, isActive: boolean) => {
    companyService.update(id, { isActive: !isActive });
    setCompanies(companyService.getAll());
  };

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
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('admin.companies')}</h1>
            <p className="text-muted-foreground">{t('admin.companiesSubtitle')}</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('admin.addCompany')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('admin.addCompany')}</DialogTitle>
                <DialogDescription>{t('admin.addCompanyDesc')}</DialogDescription>
              </DialogHeader>
              
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('admin.companyName')}</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('admin.enterCompanyName')}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="type">{t('admin.companyType')}</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: CompanyType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">{t('company.type.supplier')}</SelectItem>
                      <SelectItem value="wholesaler">{t('company.type.wholesaler')}</SelectItem>
                      <SelectItem value="retailer">{t('company.type.retailer')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">{t('admin.contactEmail')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    placeholder="email@company.com"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="phone">{t('admin.contactPhone')}</Label>
                  <Input
                    id="phone"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="+91 9876543210"
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="address">{t('admin.address')}</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('admin.enterAddress')}
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreate} disabled={!formData.name || !formData.contactEmail}>
                  {t('common.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                      <Badge variant={getTypeVariant(company.type)} className="mt-1">
                        {t(`company.type.${company.type}`)}
                      </Badge>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleToggleActive(company.id, company.isActive)}>
                        {company.isActive ? t('admin.deactivate') : t('admin.activate')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDelete(company.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{company.contactEmail}</span>
                </div>
                
                {company.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{company.contactPhone}</span>
                  </div>
                )}
                
                {company.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{company.address}</span>
                  </div>
                )}
                
                {/* Access Code */}
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
                      onClick={() => copyAccessCode(company.accessCode)}
                    >
                      {copiedCode === company.accessCode ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('admin.shareAccessCode')}
                  </p>
                </div>
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

export default AdminCompanies;
