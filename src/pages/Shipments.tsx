import { useState, useCallback, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { CompanyOnboarding } from '@/components/CompanyOnboarding';
import { ProductSelector, DEFAULT_LOW_STOCK_THRESHOLD } from '@/components/ProductSelector';
import { ShipmentCardInteractive, ShipmentDetailDrawer } from '@/components/shipments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Shipment, ShipmentStatus, ShipmentItem, InventoryItem, InventoryUnit, MovementType } from '@/domain/models';
import { shipmentService, inventoryService, companyService } from '@/services';

const Shipments = () => {
  const { t } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const companyId = profile?.companyId ?? undefined;
  
  const [refreshKey, setRefreshKey] = useState(0);
  const shipments = useMemo(() => shipmentService.getAllShipments(companyId), [companyId, refreshKey]);
  const inventoryItems = useMemo(() => inventoryService.getAllItems(companyId), [companyId, refreshKey]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentStatus | 'all'>('all');
  const [movementFilter, setMovementFilter] = useState<MovementType | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Create shipment form state
  const [newMovementType, setNewMovementType] = useState<MovementType>('outbound');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemQuantity, setItemQuantity] = useState('');
  const [shipmentItems, setShipmentItems] = useState<ShipmentItem[]>([]);
  const [pendingNewItems, setPendingNewItems] = useState<InventoryItem[]>([]);

  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const availableInventoryItems = useMemo(() => {
    return [...inventoryItems, ...pendingNewItems];
  }, [inventoryItems, pendingNewItems]);

  // Show onboarding if no company
  if (!companyId) {
    return (
      <AppLayout>
        <CompanyOnboarding onComplete={refreshProfile} />
      </AppLayout>
    );
  }

  const filteredShipments = shipments.filter((shipment) => {
    const matchesSearch =
      shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || shipment.status === statusFilter;
    const matchesMovement = movementFilter === 'all' || shipment.movementType === movementFilter;
    return matchesSearch && matchesStatus && matchesMovement;
  });

  const generateSku = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
  };

  const handleCreateNewProduct = (name: string, unit: InventoryUnit): InventoryItem | null => {
    const existingItem = inventoryItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
    if (existingItem) {
      toast.error(t('shipments.productExists'));
      return null;
    }

    const pendingItem = pendingNewItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
    if (pendingItem) {
      toast.error(t('shipments.productExists'));
      return null;
    }

    const newItem = inventoryService.createItem({
      sku: generateSku(name),
      name,
      unit,
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      companyId,
    });

    setPendingNewItems((prev) => [...prev, newItem]);
    toast.success(t('shipments.productCreated'));
    refreshData();
    
    return newItem;
  };

  const handleAddItem = () => {
    if (!selectedItem || !itemQuantity) return;

    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) return;

    // For outbound: validate stock availability (skip for inbound)
    const isPendingNew = pendingNewItems.some((p) => p.id === selectedItem.id);
    if (newMovementType === 'outbound' && !isPendingNew && selectedItem.availableStock < qty) {
      toast.error(`${t('error.insufficientStock')}: ${selectedItem.name} (${selectedItem.availableStock} ${selectedItem.unit} ${t('shipments.availableLabel')})`);
      return;
    }

    const existingIndex = shipmentItems.findIndex(item => item.inventoryItemId === selectedItem.id);
    if (existingIndex >= 0) {
      const newTotal = shipmentItems[existingIndex].quantity + qty;
      if (newMovementType === 'outbound' && !isPendingNew && selectedItem.availableStock < newTotal) {
        toast.error(`${t('error.insufficientStock')}: ${selectedItem.name}`);
        return;
      }
      const updated = [...shipmentItems];
      updated[existingIndex].quantity = newTotal;
      setShipmentItems(updated);
    } else {
      setShipmentItems([
        ...shipmentItems,
        {
          inventoryItemId: selectedItem.id,
          inventoryItemName: selectedItem.name,
          quantity: qty,
        },
      ]);
    }

    // For outbound: if pending new item, stock in the quantity first
    if (newMovementType === 'outbound' && isPendingNew) {
      inventoryService.stockIn(selectedItem.id, qty, companyId);
      setPendingNewItems((prev) => prev.filter((p) => p.id !== selectedItem.id));
      refreshData();
    }
    
    setSelectedItem(null);
    setItemQuantity('');
  };

  const handleRemoveItem = (index: number) => {
    setShipmentItems(shipmentItems.filter((_, i) => i !== index));
  };

  const handleCreateShipment = () => {
    if (!newCustomerName.trim() || !newDestination.trim() || shipmentItems.length === 0) return;
    if (!companyId) {
      toast.error('No company associated with your account');
      return;
    }

    const result = shipmentService.createShipment(
      newCustomerName,
      newDestination,
      shipmentItems,
      companyId,
      newMovementType
    );

    if (result.success && result.data) {
      toast.success(`${newMovementType === 'inbound' ? 'Inbound' : 'Outbound'} shipment ${result.data.shipmentNumber} created`);
      resetCreateForm();
      setIsCreateOpen(false);
      refreshData();
    } else {
      toast.error(result.error || 'Failed to create shipment');
    }
  };

  const handleUpdateStatus = (shipmentId: string, newStatus: ShipmentStatus) => {
    const result = shipmentService.updateStatus(shipmentId, newStatus, companyId);
    
    if (result.success && result.data) {
      toast.success(`Shipment updated to ${newStatus.replace('_', ' ')}`);
      refreshData();
      
      if (selectedShipment?.id === shipmentId) {
        setSelectedShipment(result.data);
      }
    } else {
      toast.error(result.error || 'Failed to update status');
    }
  };

  const handleDeleteShipment = (shipmentId: string) => {
    const result = shipmentService.updateStatus(shipmentId, 'cancelled', companyId);
    if (result.success) {
      toast.success(t('shipments.shipmentDeleted'));
      refreshData();
    } else {
      toast.error(result.error || 'Failed to delete shipment');
    }
  };

  const openDetail = (shipment: Shipment) => {
    const freshShipment = shipmentService.getShipmentById(shipment.id, companyId);
    setSelectedShipment(freshShipment || shipment);
    setIsDetailOpen(true);
  };

  const resetCreateForm = () => {
    setNewMovementType('outbound');
    setNewCustomerName('');
    setNewDestination('');
    setShipmentItems([]);
    setSelectedItem(null);
    setItemQuantity('');
    setPendingNewItems([]);
  };

  // Dynamic labels based on movement type
  const customerLabel = newMovementType === 'inbound' ? t('shipments.supplierName') : t('shipments.customerName');
  const customerPlaceholder = newMovementType === 'inbound' ? t('shipments.enterSupplierName') : t('shipments.enterCustomerName');
  const destinationLabel = newMovementType === 'inbound' ? t('shipments.sourceLocation') : t('shipments.destination');

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
              {/* Movement Type Selector */}
              <div className="space-y-2">
                <Label>{t('shipments.movementType')}</Label>
                <Select value={newMovementType} onValueChange={(v) => {
                  setNewMovementType(v as MovementType);
                  // Reset items when switching type
                  setShipmentItems([]);
                  setSelectedItem(null);
                  setItemQuantity('');
                  setPendingNewItems([]);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">
                      <div className="flex items-center gap-2">
                        <ArrowDownToLine className="h-4 w-4 text-success" />
                        {t('shipments.inbound')}
                      </div>
                    </SelectItem>
                    <SelectItem value="outbound">
                      <div className="flex items-center gap-2">
                        <ArrowUpFromLine className="h-4 w-4 text-info" />
                        {t('shipments.outbound')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{customerLabel}</Label>
                <Input
                  placeholder={customerPlaceholder}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{destinationLabel}</Label>
                <Input
                  placeholder={destinationLabel}
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('shipments.items')}</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <ProductSelector
                      inventoryItems={availableInventoryItems}
                      selectedItemId={selectedItem?.id || ''}
                      onSelect={setSelectedItem}
                      onCreateNew={handleCreateNewProduct}
                    />
                  </div>
                  <Input
                    type="number"
                    placeholder={t('shipments.qty')}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="w-24"
                    min="1"
                  />
                  <Button variant="secondary" onClick={handleAddItem} disabled={!selectedItem}>
                    {t('common.add')}
                  </Button>
                </div>
              </div>

              {shipmentItems.length > 0 && (
                <div className="space-y-2">
                  {shipmentItems.map((item, index) => {
                    const invItem = availableInventoryItems.find(i => i.id === item.inventoryItemId);
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
        <Tabs value={movementFilter} onValueChange={(v) => setMovementFilter(v as MovementType | 'all')} className="w-full sm:w-auto">
          <TabsList className="grid grid-cols-3 w-full sm:w-auto">
            <TabsTrigger value="all" className="text-xs">{t('shipments.all')}</TabsTrigger>
            <TabsTrigger value="inbound" className="text-xs">{t('shipments.inbound')}</TabsTrigger>
            <TabsTrigger value="outbound" className="text-xs">{t('shipments.outbound')}</TabsTrigger>
          </TabsList>
        </Tabs>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredShipments.map((shipment) => (
          <ShipmentCardInteractive
            key={shipment.id}
            shipment={shipment}
            onClick={() => openDetail(shipment)}
            onDelete={handleDeleteShipment}
          />
        ))}

        {filteredShipments.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('common.noData')}</p>
          </div>
        )}
      </div>

      {/* Shipment Detail Drawer */}
      <ShipmentDetailDrawer
        shipment={selectedShipment}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        inventoryItems={inventoryItems}
        companyId={companyId}
        onUpdate={refreshData}
      />
    </AppLayout>
  );
};

export default Shipments;
