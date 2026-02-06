import { useState, useEffect } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle,
  MoreHorizontal,
  History,
  Pencil,
  Trash2
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { CompanyOnboarding } from '@/components/CompanyOnboarding';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InventoryItem, ActivityType, INVENTORY_UNITS, InventoryUnit } from '@/domain/models';
import { inventoryService } from '@/services/inventoryService';
import { activityService } from '@/services/activityService';

type StockFilter = 'all' | 'low' | 'out';

const Inventory = () => {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const companyId = profile?.companyId ?? undefined;
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isStockActionOpen, setIsStockActionOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [stockActionType, setStockActionType] = useState<'in' | 'out'>('in');
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // New product form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductUnit, setNewProductUnit] = useState<InventoryUnit>('pieces');
  const [newProductLowStockThreshold, setNewProductLowStockThreshold] = useState('10');

  // Edit product form state
  const [editProductName, setEditProductName] = useState('');
  const [editProductUnit, setEditProductUnit] = useState<InventoryUnit>('pieces');
  const [editProductLowStockThreshold, setEditProductLowStockThreshold] = useState('10');

  // Stock action form state
  const [stockQuantity, setStockQuantity] = useState('');

  // Load inventory on mount and when company changes
  useEffect(() => {
    if (companyId) {
      setInventory(inventoryService.getAllItems(companyId));
    }
  }, [companyId]);

  // Show onboarding if no company
  if (!companyId) {
    return (
      <AppLayout>
        <CompanyOnboarding onComplete={refreshProfile} />
      </AppLayout>
    );
  }

  // Filter by search query (SKU + name, case-insensitive partial match)
  const searchFiltered = inventory.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply stock level filter
  const filteredProducts = searchFiltered.filter((product) => {
    if (stockFilter === 'low') {
      return product.availableStock > 0 && product.availableStock <= product.lowStockThreshold;
    }
    if (stockFilter === 'out') {
      return product.availableStock === 0;
    }
    return true; // 'all'
  });

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductSku.trim()) {
      toast.error(t('inventory.fillAllFields'));
      return;
    }

    // Check for duplicate SKU
    const existingSku = inventoryService.getItemBySku(newProductSku.trim(), companyId);
    if (existingSku) {
      toast.error(t('inventory.skuExists'));
      return;
    }

    const created = inventoryService.createItem({
      name: newProductName.trim(),
      sku: newProductSku.trim(),
      unit: newProductUnit,
      lowStockThreshold: parseInt(newProductLowStockThreshold) || 10,
      companyId,
    });

    setInventory(inventoryService.getAllItems(companyId));
    setNewProductName('');
    setNewProductSku('');
    setNewProductUnit('pieces');
    setNewProductLowStockThreshold('10');
    setIsAddProductOpen(false);
    toast.success(t('inventory.productAdded'));
  };

  const handleEditProduct = () => {
    if (!selectedProduct || !editProductName.trim()) return;

    const updated = inventoryService.updateItem(
      selectedProduct.id,
      {
        name: editProductName.trim(),
        unit: editProductUnit,
        lowStockThreshold: parseInt(editProductLowStockThreshold) || 10,
      },
      companyId
    );

    if (updated) {
      setInventory(inventoryService.getAllItems(companyId));
      toast.success(t('inventory.productUpdated'));
    }

    setIsEditProductOpen(false);
    setSelectedProduct(null);
  };

  const handleDeleteProduct = () => {
    if (!selectedProduct) return;

    const success = inventoryService.deleteItem(selectedProduct.id, companyId);

    if (success) {
      setInventory(inventoryService.getAllItems(companyId));
      toast.success(t('inventory.productDeleted'));
    }

    setIsDeleteConfirmOpen(false);
    setSelectedProduct(null);
  };

  const handleStockAction = () => {
    if (!selectedProduct || !stockQuantity) return;

    const qty = parseInt(stockQuantity);
    if (isNaN(qty) || qty <= 0) return;

    let result: InventoryItem | null = null;

    if (stockActionType === 'in') {
      result = inventoryService.stockIn(selectedProduct.id, qty, companyId);
    } else {
      if (selectedProduct.availableStock < qty) {
        toast.error(t('inventory.insufficientStock'));
        return;
      }
      result = inventoryService.stockOut(selectedProduct.id, qty, companyId);
    }

    if (result) {
      setInventory(inventoryService.getAllItems(companyId));
      toast.success(
        stockActionType === 'in' 
          ? `+${qty} ${selectedProduct.unit} ${t('inventory.stockIn')}`
          : `-${qty} ${selectedProduct.unit} ${t('inventory.stockOut')}`
      );
    }

    setStockQuantity('');
    setIsStockActionOpen(false);
  };

  const openStockAction = (product: InventoryItem, type: 'in' | 'out') => {
    setSelectedProduct(product);
    setStockActionType(type);
    setIsStockActionOpen(true);
  };

  const openActivityLog = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsActivityLogOpen(true);
  };

  const openEditProduct = (product: InventoryItem) => {
    setSelectedProduct(product);
    setEditProductName(product.name);
    setEditProductUnit(product.unit);
    setEditProductLowStockThreshold(product.lowStockThreshold.toString());
    setIsEditProductOpen(true);
  };

  const openDeleteConfirm = (product: InventoryItem) => {
    setSelectedProduct(product);
    setIsDeleteConfirmOpen(true);
  };

  const isLowStock = (product: InventoryItem) => {
    return product.availableStock <= product.lowStockThreshold;
  };

  const getActivityLogs = () => {
    if (!selectedProduct) return [];
    return inventoryService.getActivityLogs(companyId, selectedProduct.id);
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">{inventory.length} {t('dashboard.products')}</p>
        </div>
        <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('inventory.addProduct')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('inventory.addProduct')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('inventory.productName')}</Label>
                <Input
                  placeholder={t('inventory.productName')}
                  value={newProductName}
                  onChange={(e) => setNewProductName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.sku')}</Label>
                <Input
                  placeholder={t('inventory.enterSku')}
                  value={newProductSku}
                  onChange={(e) => setNewProductSku(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.unit')}</Label>
                <Select value={newProductUnit} onValueChange={(v) => setNewProductUnit(v as InventoryUnit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVENTORY_UNITS.map(unit => (
                      <SelectItem key={unit} value={unit}>{t(`inventory.${unit}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.lowStockThreshold')}</Label>
                <Input
                  type="number"
                  placeholder="10"
                  value={newProductLowStockThreshold}
                  onChange={(e) => setNewProductLowStockThreshold(e.target.value)}
                  min="1"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddProductOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleAddProduct} className="flex-1">
                  {t('common.add')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('inventory.searchProducts')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={stockFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStockFilter('all')}
          >
            {t('inventory.filterAll')}
          </Button>
          <Button
            variant={stockFilter === 'low' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStockFilter('low')}
            className={stockFilter === 'low' ? '' : 'text-warning border-warning/50 hover:bg-warning/10'}
          >
            {t('inventory.filterLowStock')}
          </Button>
          <Button
            variant={stockFilter === 'out' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStockFilter('out')}
            className={stockFilter === 'out' ? '' : 'text-destructive border-destructive/50 hover:bg-destructive/10'}
          >
            {t('inventory.filterOutOfStock')}
          </Button>
        </div>
      </div>

      {/* Products Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.productName')}</TableHead>
                  <TableHead>{t('inventory.sku')}</TableHead>
                  <TableHead className="text-center">{t('inventory.unit')}</TableHead>
                  <TableHead className="text-right">{t('inventory.available')}</TableHead>
                  <TableHead className="text-right">{t('inventory.reserved')}</TableHead>
                  <TableHead className="text-center">{t('inventory.lastUpdated')}</TableHead>
                  <TableHead className="text-right">{t('inventory.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('common.noData')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id} className="animate-fade-in">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Package className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{product.name}</p>
                            {isLowStock(product) && (
                              <Badge variant="outline" className="mt-1 bg-warning/10 text-warning border-warning/20 text-xs">
                                {t('inventory.lowStock')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">
                        {product.sku}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {t(`inventory.${product.unit}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {product.availableStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {product.reservedStock.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {product.updatedAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStockAction(product, 'in')}
                            className="h-8 w-8 text-success hover:bg-success/10"
                          >
                            <ArrowUpCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openStockAction(product, 'out')}
                            className="h-8 w-8 text-warning hover:bg-warning/10"
                          >
                            <ArrowDownCircle className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditProduct(product)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                {t('common.edit')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openActivityLog(product)}>
                                <History className="h-4 w-4 mr-2" />
                                {t('inventory.activityLog')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => openDeleteConfirm(product)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Action Dialog */}
      <Dialog open={isStockActionOpen} onOpenChange={setIsStockActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {stockActionType === 'in' ? (
                <ArrowUpCircle className="h-5 w-5 text-success" />
              ) : (
                <ArrowDownCircle className="h-5 w-5 text-warning" />
              )}
              {stockActionType === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{selectedProduct?.name}</p>
              <p className="text-sm text-muted-foreground">
                {t('inventory.available')}: {selectedProduct?.availableStock} {selectedProduct?.unit}
              </p>
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.quantity')}</Label>
              <Input
                type="number"
                placeholder="0"
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                min="1"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsStockActionOpen(false)} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button 
                onClick={handleStockAction} 
                className={cn(
                  "flex-1",
                  stockActionType === 'in' && "bg-success hover:bg-success/90",
                  stockActionType === 'out' && "bg-warning hover:bg-warning/90 text-warning-foreground"
                )}
              >
                {stockActionType === 'in' ? t('inventory.stockIn') : t('inventory.stockOut')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.edit')}: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>{t('inventory.productName')}</Label>
              <Input
                placeholder={t('inventory.productName')}
                value={editProductName}
                onChange={(e) => setEditProductName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.unit')}</Label>
              <Select value={editProductUnit} onValueChange={(v) => setEditProductUnit(v as InventoryUnit)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map(unit => (
                    <SelectItem key={unit} value={unit}>{t(`inventory.${unit}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('inventory.lowStockThreshold')}</Label>
              <Input
                type="number"
                placeholder="10"
                value={editProductLowStockThreshold}
                onChange={(e) => setEditProductLowStockThreshold(e.target.value)}
                min="1"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditProductOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleEditProduct}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('inventory.deleteConfirmMessage')} "{selectedProduct?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Log Dialog */}
      <Dialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.activityLog')}: {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
            {getActivityLogs().length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('common.noData')}
              </p>
            ) : (
              getActivityLogs().map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                  <div className={cn(
                    "p-2 rounded-lg",
                    log.type === ActivityType.INVENTORY_IN ? "bg-success/10" : "bg-warning/10"
                  )}>
                    {log.type === ActivityType.INVENTORY_IN ? (
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{log.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Inventory;