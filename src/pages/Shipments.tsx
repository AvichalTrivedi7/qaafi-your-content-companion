import { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  MapPin,
  Package,
  Calendar,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Image as ImageIcon,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type ShipmentStatus = 'dispatched' | 'in_transit' | 'delivered' | 'delayed';

interface ShipmentItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
}

interface Shipment {
  id: string;
  destination: string;
  status: ShipmentStatus;
  items: ShipmentItem[];
  createdAt: Date;
  updatedAt: Date;
  proofOfDelivery?: string;
  statusHistory: { status: ShipmentStatus; timestamp: Date; user: string }[];
}

// Mock products for creating shipments
const mockProducts = [
  { id: '1', name: 'Cotton Fabric - Blue', unit: 'meters', available: 1500 },
  { id: '2', name: 'Silk Material - Red', unit: 'pieces', available: 45 },
  { id: '3', name: 'Cotton Fabric - White', unit: 'meters', available: 120 },
  { id: '4', name: 'Polyester Blend', unit: 'meters', available: 30 },
  { id: '5', name: 'Wool Fabric - Grey', unit: 'meters', available: 850 },
];

// Mock shipments
const initialShipments: Shipment[] = [
  {
    id: 'SHP-2024-091',
    destination: 'Jaipur Central Market',
    status: 'in_transit',
    items: [
      { productId: '1', productName: 'Cotton Fabric - Blue', quantity: 500, unit: 'meters' },
      { productId: '5', productName: 'Wool Fabric - Grey', quantity: 200, unit: 'meters' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30),
    statusHistory: [
      { status: 'dispatched', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), user: 'Rajesh Kumar' },
      { status: 'in_transit', timestamp: new Date(Date.now() - 1000 * 60 * 30), user: 'Amit Singh' },
    ],
  },
  {
    id: 'SHP-2024-090',
    destination: 'Delhi Wholesale Hub',
    status: 'dispatched',
    items: [
      { productId: '3', productName: 'Cotton Fabric - White', quantity: 300, unit: 'meters' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    statusHistory: [
      { status: 'dispatched', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), user: 'Rajesh Kumar' },
    ],
  },
  {
    id: 'SHP-2024-089',
    destination: 'Mumbai Warehouse',
    status: 'delivered',
    items: [
      { productId: '2', productName: 'Silk Material - Red', quantity: 100, unit: 'pieces' },
      { productId: '1', productName: 'Cotton Fabric - Blue', quantity: 250, unit: 'meters' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45),
    proofOfDelivery: 'https://placehold.co/400x300?text=Proof+of+Delivery',
    statusHistory: [
      { status: 'dispatched', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), user: 'Rajesh Kumar' },
      { status: 'in_transit', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12), user: 'Amit Singh' },
      { status: 'delivered', timestamp: new Date(Date.now() - 1000 * 60 * 45), user: 'Amit Singh' },
    ],
  },
  {
    id: 'SHP-2024-088',
    destination: 'Lucknow Traders',
    status: 'delayed',
    items: [
      { productId: '4', productName: 'Polyester Blend', quantity: 150, unit: 'meters' },
    ],
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
    statusHistory: [
      { status: 'dispatched', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), user: 'Rajesh Kumar' },
      { status: 'in_transit', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 36), user: 'Amit Singh' },
      { status: 'delayed', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6), user: 'Amit Singh' },
    ],
  },
];

const statusConfig: Record<ShipmentStatus, { icon: typeof Truck; color: string; bgColor: string }> = {
  dispatched: { icon: Package, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  in_transit: { icon: Truck, color: 'text-info', bgColor: 'bg-info/10' },
  delivered: { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10' },
  delayed: { icon: AlertTriangle, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

const Shipments = () => {
  const { t } = useLanguage();
  const [shipments, setShipments] = useState<Shipment[]>(initialShipments);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create shipment form state
  const [newDestination, setNewDestination] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = () => {
    if (!selectedProductId || !itemQuantity) return;

    const product = mockProducts.find((p) => p.id === selectedProductId);
    if (!product) return;

    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) return;

    setShipmentItems([
      ...shipmentItems,
      {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unit: product.unit,
      },
    ]);
    setSelectedProductId('');
    setItemQuantity('');
  };

  const handleCreateShipment = () => {
    if (!newDestination.trim() || shipmentItems.length === 0) return;

    const newShipment: Shipment = {
      id: `SHP-${new Date().getFullYear()}-${String(shipments.length + 92).padStart(3, '0')}`,
      destination: newDestination,
      status: 'dispatched',
      items: shipmentItems,
      createdAt: new Date(),
      updatedAt: new Date(),
      statusHistory: [{ status: 'dispatched', timestamp: new Date(), user: 'Current User' }],
    };

    setShipments([newShipment, ...shipments]);
    setNewDestination('');
    setShipmentItems([]);
    setIsCreateOpen(false);
    toast.success(t('shipments.createShipment') + ' ✓');
  };

  const handleUpdateStatus = (shipmentId: string, newStatus: ShipmentStatus) => {
    setShipments(shipments.map((s) => {
      if (s.id === shipmentId) {
        return {
          ...s,
          status: newStatus,
          updatedAt: new Date(),
          statusHistory: [
            ...s.statusHistory,
            { status: newStatus, timestamp: new Date(), user: 'Current User' },
          ],
        };
      }
      return s;
    }));
    toast.success(t('shipments.updateStatus') + ' ✓');
  };

  const openDetail = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setIsDetailOpen(true);
  };

  const getNextStatus = (current: ShipmentStatus): ShipmentStatus | null => {
    const flow: Record<ShipmentStatus, ShipmentStatus | null> = {
      dispatched: 'in_transit',
      in_transit: 'delivered',
      delivered: null,
      delayed: 'in_transit',
    };
    return flow[current];
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('shipments.title')}</h1>
          <p className="text-muted-foreground">{shipments.length} total shipments</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t('shipments.createShipment')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('shipments.createShipment')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('shipments.destination')}</Label>
                <Input
                  placeholder={t('shipments.destination')}
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('shipments.items')}</Label>
                <div className="flex gap-2">
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('shipments.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.available} {product.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-24"
                  />
                  <Button variant="secondary" onClick={handleAddItem}>
                    {t('common.add')}
                  </Button>
                </div>
              </div>

              {shipmentItems.length > 0 && (
                <div className="space-y-2">
                  {shipmentItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm">{item.productName}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleCreateShipment} className="flex-1" disabled={!newDestination || shipmentItems.length === 0}>
                  {t('shipments.createShipment')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as ShipmentStatus | 'all')} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-5 w-full sm:w-auto">
            <TabsTrigger value="all" className="text-xs">{t('shipments.all')}</TabsTrigger>
            <TabsTrigger value="dispatched" className="text-xs">{t('shipments.dispatched')}</TabsTrigger>
            <TabsTrigger value="in_transit" className="text-xs">{t('shipments.inTransit')}</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs">{t('shipments.delivered')}</TabsTrigger>
            <TabsTrigger value="delayed" className="text-xs">{t('shipments.delayed')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        {filteredShipments.map((shipment) => {
          const config = statusConfig[shipment.status];
          const Icon = config.icon;
          const nextStatus = getNextStatus(shipment.status);

          return (
            <Card key={shipment.id} className="border-border animate-fade-in">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn('p-2 rounded-lg', config.bgColor)}>
                        <Icon className={cn('h-4 w-4', config.color)} />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{shipment.id}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span>{shipment.destination}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-3">
                      <div className="flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        <span>{shipment.items.length} {t('common.items')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{shipment.createdAt.toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{t('shipments.updatedAt')}: {shipment.updatedAt.toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border',
                        shipment.status === 'delivered' && 'bg-success/10 text-success border-success/20',
                        shipment.status === 'in_transit' && 'bg-info/10 text-info border-info/20',
                        shipment.status === 'dispatched' && 'bg-muted text-muted-foreground',
                        shipment.status === 'delayed' && 'bg-destructive/10 text-destructive border-destructive/20'
                      )}
                    >
                      {t(`shipments.${shipment.status.replace('_', '')}`)}
                    </Badge>

                    <div className="flex gap-1">
                      {nextStatus && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(shipment.id, nextStatus)}
                          className="text-xs"
                        >
                          → {t(`shipments.${nextStatus.replace('_', '')}`)}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDetail(shipment)}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredShipments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Shipment Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedShipment?.id}</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedShipment.destination}</span>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <Label>{t('shipments.items')}</Label>
                {selectedShipment.items.map((item, index) => (
                  <div key={index} className="flex justify-between p-2 rounded-lg bg-muted">
                    <span className="text-sm">{item.productName}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>

              {/* Status History */}
              <div className="space-y-2">
                <Label>Status History</Label>
                <div className="space-y-2">
                  {selectedShipment.statusHistory.map((history, index) => {
                    const config = statusConfig[history.status];
                    const Icon = config.icon;
                    return (
                      <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted">
                        <div className={cn('p-1.5 rounded', config.bgColor)}>
                          <Icon className={cn('h-3 w-3', config.color)} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{t(`shipments.${history.status.replace('_', '')}`)}</p>
                          <p className="text-xs text-muted-foreground">
                            {history.user} • {history.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Proof of Delivery */}
              {selectedShipment.status === 'delivered' && selectedShipment.proofOfDelivery && (
                <div className="space-y-2">
                  <Label>{t('shipments.proofOfDelivery')}</Label>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={selectedShipment.proofOfDelivery}
                      alt="Proof of Delivery"
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}

              {selectedShipment.status !== 'delivered' && (
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  {t('shipments.uploadProof')}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shipments;
