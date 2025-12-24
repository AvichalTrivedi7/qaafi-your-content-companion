import { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowUpCircle, 
  ArrowDownCircle,
  MoreHorizontal,
  History
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

interface Product {
  id: string;
  name: string;
  unit: 'meters' | 'pieces';
  available: number;
  reserved: number;
  lastUpdated: Date;
  activityLog: ActivityLog[];
}

interface ActivityLog {
  id: string;
  type: 'stock_in' | 'stock_out';
  quantity: number;
  user: string;
  timestamp: Date;
  notes?: string;
}

// Mock data
const initialProducts: Product[] = [
  {
    id: '1',
    name: 'Cotton Fabric - Blue',
    unit: 'meters',
    available: 1500,
    reserved: 200,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 15),
    activityLog: [
      { id: '1', type: 'stock_in', quantity: 500, user: 'Rajesh Kumar', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
      { id: '2', type: 'stock_out', quantity: 150, user: 'Amit Singh', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
    ],
  },
  {
    id: '2',
    name: 'Silk Material - Red',
    unit: 'pieces',
    available: 45,
    reserved: 30,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 120),
    activityLog: [
      { id: '3', type: 'stock_out', quantity: 200, user: 'Priya Sharma', timestamp: new Date(Date.now() - 1000 * 60 * 120) },
    ],
  },
  {
    id: '3',
    name: 'Cotton Fabric - White',
    unit: 'meters',
    available: 120,
    reserved: 50,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 5),
    activityLog: [],
  },
  {
    id: '4',
    name: 'Polyester Blend',
    unit: 'meters',
    available: 30,
    reserved: 0,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 24),
    activityLog: [],
  },
  {
    id: '5',
    name: 'Wool Fabric - Grey',
    unit: 'meters',
    available: 850,
    reserved: 100,
    lastUpdated: new Date(Date.now() - 1000 * 60 * 60 * 3),
    activityLog: [],
  },
];

const Inventory = () => {
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isStockActionOpen, setIsStockActionOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockActionType, setStockActionType] = useState<'in' | 'out'>('in');
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);

  // New product form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState<'meters' | 'pieces'>('pieces');

  // Stock action form state
  const [stockQuantity, setStockQuantity] = useState('');

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProduct = () => {
    if (!newProductName.trim()) return;

    const newProduct: Product = {
      id: Date.now().toString(),
      name: newProductName,
      unit: newProductUnit,
      available: 0,
      reserved: 0,
      lastUpdated: new Date(),
      activityLog: [],
    };

    setProducts([...products, newProduct]);
    setNewProductName('');
    setNewProductUnit('pieces');
    setIsAddProductOpen(false);
    toast.success(t('inventory.addProduct') + ' ✓');
  };

  const handleStockAction = () => {
    if (!selectedProduct || !stockQuantity) return;

    const qty = parseInt(stockQuantity);
    if (isNaN(qty) || qty <= 0) return;

    setProducts(products.map((p) => {
      if (p.id === selectedProduct.id) {
        const newAvailable = stockActionType === 'in' 
          ? p.available + qty 
          : Math.max(0, p.available - qty);
        
        const newLog: ActivityLog = {
          id: Date.now().toString(),
          type: stockActionType === 'in' ? 'stock_in' : 'stock_out',
          quantity: qty,
          user: 'Current User',
          timestamp: new Date(),
        };

        return {
          ...p,
          available: newAvailable,
          lastUpdated: new Date(),
          activityLog: [newLog, ...p.activityLog],
        };
      }
      return p;
    }));

    setStockQuantity('');
    setIsStockActionOpen(false);
    toast.success(
      stockActionType === 'in' 
        ? `+${qty} ${selectedProduct.unit} ${t('inventory.stockIn')}`
        : `-${qty} ${selectedProduct.unit} ${t('inventory.stockOut')}`
    );
  };

  const openStockAction = (product: Product, type: 'in' | 'out') => {
    setSelectedProduct(product);
    setStockActionType(type);
    setIsStockActionOpen(true);
  };

  const openActivityLog = (product: Product) => {
    setSelectedProduct(product);
    setIsActivityLogOpen(true);
  };

  const isLowStock = (product: Product) => {
    const threshold = product.unit === 'meters' ? 200 : 100;
    return product.available < threshold;
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('inventory.title')}</h1>
          <p className="text-muted-foreground">{products.length} {t('dashboard.products')}</p>
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
                <Label>{t('inventory.unit')}</Label>
                <Select value={newProductUnit} onValueChange={(v) => setNewProductUnit(v as 'meters' | 'pieces')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meters">{t('inventory.meters')}</SelectItem>
                    <SelectItem value="pieces">{t('inventory.pieces')}</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('inventory.searchProducts')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('inventory.productName')}</TableHead>
                  <TableHead className="text-center">{t('inventory.unit')}</TableHead>
                  <TableHead className="text-right">{t('inventory.available')}</TableHead>
                  <TableHead className="text-right">{t('inventory.reserved')}</TableHead>
                  <TableHead className="text-center">{t('inventory.lastUpdated')}</TableHead>
                  <TableHead className="text-right">{t('inventory.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
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
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {t(`inventory.${product.unit}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {product.available.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {product.reserved.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {product.lastUpdated.toLocaleDateString()}
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
                            <DropdownMenuItem onClick={() => openActivityLog(product)}>
                              <History className="h-4 w-4 mr-2" />
                              {t('inventory.activityLog')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
                {t('inventory.available')}: {selectedProduct?.available} {selectedProduct?.unit}
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

      {/* Activity Log Dialog */}
      <Dialog open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('inventory.activityLog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-4 max-h-96 overflow-y-auto">
            {selectedProduct?.activityLog.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {t('common.noData')}
              </p>
            ) : (
              selectedProduct?.activityLog.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                  <div className={cn(
                    "p-2 rounded-lg",
                    log.type === 'stock_in' ? "bg-success/10" : "bg-warning/10"
                  )}>
                    {log.type === 'stock_in' ? (
                      <ArrowUpCircle className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownCircle className="h-4 w-4 text-warning" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {log.type === 'stock_in' ? '+' : '-'}{log.quantity} {selectedProduct.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.user} • {log.timestamp.toLocaleString()}
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
