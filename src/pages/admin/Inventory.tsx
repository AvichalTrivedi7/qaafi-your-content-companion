import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { inventoryService } from '@/services/inventoryService';
import { companyService } from '@/services/companyService';
import { InventoryItem } from '@/domain/models';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowDownToLine, 
  ArrowUpFromLine,
  AlertTriangle,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const AdminInventory = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { canViewInventory, isLoading } = useAuth();
  const navigate = useNavigate();
  const [inventory, setInventory] = useState<InventoryItem[]>(inventoryService.getAllItems());
  const companies = companyService.getAll();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockQuantity, setStockQuantity] = useState('');

  // Redirect if user doesn't have inventory access
  useEffect(() => {
    if (!isLoading && !canViewInventory) {
      navigate('/admin/shipments');
    }
  }, [canViewInventory, isLoading, navigate]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filterCompany === 'all' || item.companyId === filterCompany;
    return matchesSearch && matchesCompany;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  if (!canViewInventory) {
    return null;
  }

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '-';
    const company = companies.find(c => c.id === companyId);
    return company?.name || '-';
  };

  const openStockDialog = (item: InventoryItem, action: 'in' | 'out') => {
    setSelectedItem(item);
    setStockAction(action);
    setStockQuantity('');
    setStockDialogOpen(true);
  };

  const handleStockAction = () => {
    if (!selectedItem || !stockQuantity) return;
    
    const quantity = parseInt(stockQuantity, 10);
    if (isNaN(quantity) || quantity <= 0) return;

    if (stockAction === 'in') {
      inventoryService.stockIn(selectedItem.id, quantity);
      toast({ title: t('inventory.stockIn'), description: `+${quantity} ${selectedItem.unit}` });
    } else {
      const success = inventoryService.stockOut(selectedItem.id, quantity);
      if (success) {
        toast({ title: t('inventory.stockOut'), description: `-${quantity} ${selectedItem.unit}` });
      } else {
        toast({ 
          title: t('error.insufficientStock'), 
          variant: 'destructive' 
        });
        return;
      }
    }

    setInventory(inventoryService.getAllItems());
    setStockDialogOpen(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('inventory.title')}</h1>
            <p className="text-muted-foreground">{t('admin.inventorySubtitle')}</p>
          </div>
          
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('inventory.addProduct')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('inventory.searchProducts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.filterByCompany')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.productName')}</TableHead>
                  <TableHead>{t('admin.assignedTo')}</TableHead>
                  <TableHead className="text-right">{t('inventory.available')}</TableHead>
                  <TableHead className="text-right">{t('inventory.reserved')}</TableHead>
                  <TableHead>{t('inventory.lastUpdated')}</TableHead>
                  <TableHead className="text-right">{t('inventory.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInventory.map(item => {
                  const isLowStock = item.availableStock <= item.lowStockThreshold;
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{getCompanyName(item.companyId)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="font-medium">{item.availableStock}</span>
                          <span className="text-muted-foreground">{item.unit}</span>
                          {isLowStock && (
                            <Badge variant="outline" className="text-warning border-warning">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              {t('inventory.lowStock')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">{item.reservedStock} {item.unit}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {format(item.updatedAt, 'MMM dd, yyyy')}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openStockDialog(item, 'in')}
                          >
                            <ArrowDownToLine className="h-4 w-4 text-success" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openStockDialog(item, 'out')}
                          >
                            <ArrowUpFromLine className="h-4 w-4 text-warning" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredInventory.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        )}

        {/* Stock In/Out Dialog */}
        <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {stockAction === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
              </DialogTitle>
              <DialogDescription>
                {selectedItem?.name} - {t('inventory.available')}: {selectedItem?.availableStock} {selectedItem?.unit}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>{t('inventory.quantity')}</Label>
                <Input
                  type="number"
                  min="1"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setStockDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleStockAction}
                variant={stockAction === 'in' ? 'default' : 'outline'}
              >
                {stockAction === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminInventory;
