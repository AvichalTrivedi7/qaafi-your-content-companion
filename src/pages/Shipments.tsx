import { useState, useCallback } from 'react';
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
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
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
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Shipment, ShipmentStatus, ShipmentItem } from '@/domain/models';
import { shipmentService, inventoryService } from '@/services';

const statusConfig: Record<ShipmentStatus, { icon: typeof Truck; color: string; bgColor: string; label: string }> = {
  pending: { icon: Package, color: 'text-muted-foreground', bgColor: 'bg-muted', label: 'pending' },
  in_transit: { icon: Truck, color: 'text-info', bgColor: 'bg-info/10', label: 'inTransit' },
  delivered: { icon: CheckCircle2, color: 'text-success', bgColor: 'bg-success/10', label: 'delivered' },
  cancelled: { icon: XCircle, color: 'text-destructive', bgColor: 'bg-destructive/10', label: 'cancelled' },
};

const Shipments = () => {
  const { t } = useLanguage();
  
  // Use services for data - trigger re-render with state
  const [refreshKey, setRefreshKey] = useState(0);
  const shipments = shipmentService.getAllShipments();
  const inventoryItems = inventoryService.getAllItems();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create shipment form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleAddItem = () => {
    if (!selectedItemId || !itemQuantity) return;

    const inventoryItem = inventoryItems.find((item) => item.id === selectedItemId);
    if (!inventoryItem) return;

    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) return;

    // Check if item already added
    const existingIndex = shipmentItems.findIndex(item => item.inventoryItemId === selectedItemId);
    if (existingIndex >= 0) {
      // Update quantity
      const updated = [...shipmentItems];
      updated[existingIndex].quantity += qty;
      setShipmentItems(updated);
    } else {
      setShipmentItems([
        ...shipmentItems,
        {
          inventoryItemId: inventoryItem.id,
          inventoryItemName: inventoryItem.name,
          quantity: qty,
        },
      ]);
    }
    
    setSelectedItemId('');
    setItemQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setShipmentItems(shipmentItems.filter((_, i) => i !== index));
  };

  const handleCreateShipment = () => {
    if (!newCustomerName.trim() || !newDestination.trim() || shipmentItems.length === 0) return;

    const result = shipmentService.createShipment(
      newCustomerName,
      newDestination,
      shipmentItems
    );

    if (result.success && result.data) {
      toast.success(`Shipment ${result.data.shipmentNumber} created`);
      setNewCustomerName('');
      setNewDestination('');
      setShipmentItems([]);
      setIsCreateOpen(false);
      refreshData();
    } else {
      toast.error(result.error || 'Failed to create shipment');
    }
  };

  const handleUpdateStatus = (shipmentId: string, newStatus: ShipmentStatus) => {
    const result = shipmentService.updateStatus(shipmentId, newStatus);
    
    if (result.success && result.data) {
      toast.success(`Shipment updated to ${newStatus.replace('_', ' ')}`);
      refreshData();
      
      // Update selected shipment if in detail view
      if (selectedShipment?.id === shipmentId) {
        setSelectedShipment(result.data);
      }
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const openDetail = (shipment: Shipment) => {
    // Get fresh data from service
    const freshShipment = shipmentService.getShipmentById(shipment.id);
    setSelectedShipment(freshShipment || shipment);
    setIsDetailOpen(true);
  };

  const resetCreateForm = () => {
    setNewCustomerName('');
    setNewDestination('');
    setShipmentItems([]);
    setSelectedItemId('');
    setItemQuantity('');
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('shipments.title')}</h1>
          <p className="text-muted-foreground">{shipments.length} {t('shipments.totalShipments')}</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) resetCreateForm();
        }}>
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
                <Label>{t('shipments.customerName')}</Label>
                <Input
                  placeholder={t('shipments.enterCustomerName')}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </div>

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
                  <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={t('shipments.selectProduct')} />
                    </SelectTrigger>
                    <SelectContent>
                      {inventoryItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.availableStock} {item.unit} {t('shipments.availableLabel')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={t('shipments.qty')}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-24"
                    min="1"
                  />
                  <Button variant="secondary" onClick={handleAddItem}>
                    {t('common.add')}
                  </Button>
                </div>
              </div>

              {shipmentItems.length > 0 && (
                <div className="space-y-2">
                  {shipmentItems.map((item, index) => {
                    const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                    return (
                      <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <span className="text-sm">{item.inventoryItemName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {item.quantity} {invItem?.unit || t('inventory.units')}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleRemoveItem(index)}
                            className="h-6 w-6 p-0"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="flex-1">
                  {t('common.cancel')}
                </Button>
                <Button 
                  onClick={handleCreateShipment} 
                  className="flex-1" 
                  disabled={!newCustomerName.trim() || !newDestination.trim() || shipmentItems.length === 0}
                >
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
            <TabsTrigger value="pending" className="text-xs">{t('shipments.pending')}</TabsTrigger>
            <TabsTrigger value="in_transit" className="text-xs">{t('shipments.inTransit')}</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs">{t('shipments.delivered')}</TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs">{t('shipments.cancelled')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        {filteredShipments.map((shipment) => {
          const config = statusConfig[shipment.status];
          const Icon = config.icon;
          const availableTransitions = shipmentService.getAvailableTransitions(shipment.status);

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
                        <p className="font-semibold text-foreground">{shipment.shipmentNumber}</p>
                        <p className="text-sm text-muted-foreground">{shipment.customerName}</p>
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
                        shipment.status === 'pending' && 'bg-muted text-muted-foreground',
                        shipment.status === 'cancelled' && 'bg-destructive/10 text-destructive border-destructive/20'
                      )}
                    >
                      {t(`shipments.${config.label}`)}
                    </Badge>

                    <div className="flex gap-1 flex-wrap justify-end">
                      {availableTransitions.map((nextStatus) => (
                        <Button
                          key={nextStatus}
                          variant={nextStatus === 'cancelled' ? 'destructive' : 'outline'}
                          size="sm"
                          onClick={() => handleUpdateStatus(shipment.id, nextStatus)}
                          className="text-xs"
                        >
                          → {t(`shipments.${statusConfig[nextStatus].label}`)}
                        </Button>
                      ))}
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
            <DialogTitle>{selectedShipment?.shipmentNumber}</DialogTitle>
          </DialogHeader>
          {selectedShipment && (
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('shipments.customer')}:</span>
                  <span className="font-medium">{selectedShipment.customerName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedShipment.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t('shipments.status')}:</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'border',
                      selectedShipment.status === 'delivered' && 'bg-success/10 text-success border-success/20',
                      selectedShipment.status === 'in_transit' && 'bg-info/10 text-info border-info/20',
                      selectedShipment.status === 'pending' && 'bg-muted text-muted-foreground',
                      selectedShipment.status === 'cancelled' && 'bg-destructive/10 text-destructive border-destructive/20'
                    )}
                  >
                    {t(`shipments.${statusConfig[selectedShipment.status].label}`)}
                  </Badge>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <Label>{t('shipments.items')}</Label>
                {selectedShipment.items.map((item, index) => {
                  const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                  return (
                    <div key={index} className="flex justify-between p-2 rounded-lg bg-muted">
                      <span className="text-sm">{item.inventoryItemName}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.quantity} {invItem?.unit || t('inventory.units')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Timestamps */}
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t('shipments.createdAt')}:</span>
                  <span>{selectedShipment.createdAt.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('shipments.updatedAt')}:</span>
                  <span>{selectedShipment.updatedAt.toLocaleString()}</span>
                </div>
                {selectedShipment.deliveredAt && (
                  <div className="flex justify-between">
                    <span>{t('shipments.deliveredAt')}:</span>
                    <span>{selectedShipment.deliveredAt.toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Proof of Delivery */}
              {selectedShipment.status === 'delivered' && selectedShipment.proofOfDelivery && (
                <div className="space-y-2">
                  <Label>{t('shipments.proofOfDelivery')}</Label>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <img
                      src={selectedShipment.proofOfDelivery}
                      alt={t('shipments.proofAltText')}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                </div>
              )}

              {selectedShipment.status !== 'delivered' && selectedShipment.status !== 'cancelled' && (
                <Button variant="outline" className="w-full gap-2">
                  <Upload className="h-4 w-4" />
                  {t('shipments.uploadProof')}
                </Button>
              )}

              {/* Status Actions */}
              {shipmentService.getAvailableTransitions(selectedShipment.status).length > 0 && (
                <div className="flex gap-2 pt-2">
                  {shipmentService.getAvailableTransitions(selectedShipment.status).map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      variant={nextStatus === 'cancelled' ? 'destructive' : 'default'}
                      onClick={() => handleUpdateStatus(selectedShipment.id, nextStatus)}
                      className="flex-1"
                    >
                      {nextStatus === 'cancelled' ? t('shipments.cancelShipment') : `${t('shipments.markAs')} ${t(`shipments.${statusConfig[nextStatus].label}`)}`}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Shipments;
