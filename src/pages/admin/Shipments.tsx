import { useState, useMemo, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { shipmentService } from '@/services/shipmentService';
import { companyService } from '@/services/companyService';
import { inventoryService } from '@/services/inventoryService';
import { Shipment, ShipmentStatus, ShipmentItem, InventoryItem, InventoryUnit, MovementType } from '@/domain/models';
import { ProductSelector, DEFAULT_LOW_STOCK_THRESHOLD } from '@/components/ProductSelector';
import { ShipmentCardInteractive, ShipmentDetailDrawer } from '@/components/shipments';
import { 
  Truck, 
  Plus, 
  Search, 
  XCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast as sonnerToast } from 'sonner';

const AdminShipments = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? undefined;
  
  // Refresh key for triggering re-renders
  const [refreshKey, setRefreshKey] = useState(0);
  const shipments = useMemo(() => shipmentService.getAllShipments(companyId), [companyId, refreshKey]);
  const inventoryItems = useMemo(() => inventoryService.getAllItems(companyId), [companyId, refreshKey]);
  const companies = companyService.getAll();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Create shipment dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
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

  // Combine existing inventory with pending new items for the selector
  const availableInventoryItems = useMemo(() => {
    return [...inventoryItems, ...pendingNewItems];
  }, [inventoryItems, pendingNewItems]);

  const filteredShipments = shipments.filter(shipment => {
    const matchesSearch = 
      shipment.shipmentNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shipment.destination.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || shipment.status === filterStatus;
    const matchesCompany = filterCompany === 'all' || shipment.companyId === filterCompany;
    return matchesSearch && matchesStatus && matchesCompany;
  });

  const getCompanyName = (companyId?: string) => {
    if (!companyId) return '-';
    const company = companies.find(c => c.id === companyId);
    return company?.name || '-';
  };

  // Generate auto SKU for new products
  const generateSku = (name: string): string => {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString(36).toUpperCase();
    return `${prefix}-${timestamp}`;
  };

  // Handle creating a new inventory item on-the-fly
  const handleCreateNewProduct = (name: string, unit: InventoryUnit): InventoryItem | null => {
    if (!companyId) {
      sonnerToast.error('No company associated with your account');
      return null;
    }

    // Check for duplicate (case-insensitive) in existing inventory
    const existingItem = inventoryItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
    if (existingItem) {
      sonnerToast.error(t('shipments.productExists'));
      return null;
    }

    // Also check pending items
    const pendingItem = pendingNewItems.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );
    if (pendingItem) {
      sonnerToast.error(t('shipments.productExists'));
      return null;
    }

    // Create the new inventory item
    const newItem = inventoryService.createItem({
      sku: generateSku(name),
      name,
      unit,
      lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD,
      companyId,
    });

    // Track it as pending (will be added to shipment)
    setPendingNewItems((prev) => [...prev, newItem]);
    sonnerToast.success(t('shipments.productCreated'));
    refreshData();
    
    return newItem;
  };

  const handleAddItem = () => {
    if (!selectedItem || !itemQuantity) return;

    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) return;

    const isPendingNew = pendingNewItems.some((p) => p.id === selectedItem.id);
    if (newMovementType === 'outbound' && !isPendingNew && selectedItem.availableStock < qty) {
      sonnerToast.error(`${t('error.insufficientStock')}: ${selectedItem.name} (${selectedItem.availableStock} ${selectedItem.unit} ${t('shipments.availableLabel')})`);
      return;
    }

    // Check if item already added to shipment
    const existingIndex = shipmentItems.findIndex(item => item.inventoryItemId === selectedItem.id);
    if (existingIndex >= 0) {
      // Update quantity - but validate total doesn't exceed available
      const newTotal = shipmentItems[existingIndex].quantity + qty;
      if (newMovementType === 'outbound' && !isPendingNew && selectedItem.availableStock < newTotal) {
        sonnerToast.error(`${t('error.insufficientStock')}: ${selectedItem.name}`);
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
      sonnerToast.error('No company associated with your account');
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
      sonnerToast.success(`Shipment ${result.data.shipmentNumber} created`);
      resetCreateForm();
      setIsCreateOpen(false);
      refreshData();
    } else {
      sonnerToast.error(result.error || 'Failed to create shipment');
    }
  };

  const handleDeleteShipment = (shipmentId: string) => {
    const result = shipmentService.updateStatus(shipmentId, 'cancelled', companyId);
    if (result.success) {
      sonnerToast.success(t('shipments.shipmentDeleted'));
      refreshData();
    } else {
      sonnerToast.error(result.error || 'Failed to delete shipment');
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

  const customerLabel = newMovementType === 'inbound' ? t('shipments.supplierName') : t('shipments.customerName');
  const customerPlaceholder = newMovementType === 'inbound' ? t('shipments.enterSupplierName') : t('shipments.enterCustomerName');
  const destinationLabel = newMovementType === 'inbound' ? t('shipments.sourceLocation') : t('shipments.destination');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('shipments.title')}</h1>
            <p className="text-muted-foreground">{t('admin.shipmentsSubtitle')}</p>
          </div>
          
          {/* Create button - available to all users with a company */}
          {companyId && (
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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('shipments.createShipment')}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  {/* Movement Type Selector */}
                  <div className="space-y-2">
                    <Label>{t('shipments.movementType')}</Label>
                    <Select value={newMovementType} onValueChange={(v) => {
                      setNewMovementType(v as MovementType);
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
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as ShipmentStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              <SelectItem value="pending">{t('shipments.pending')}</SelectItem>
              <SelectItem value="in_transit">{t('shipments.inTransit')}</SelectItem>
              <SelectItem value="delivered">{t('shipments.delivered')}</SelectItem>
              <SelectItem value="cancelled">{t('shipments.cancelled')}</SelectItem>
            </SelectContent>
          </Select>
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

        {/* Shipments Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredShipments.map(shipment => (
            <ShipmentCardInteractive
              key={shipment.id}
              shipment={shipment}
              companyName={getCompanyName(shipment.companyId)}
              onClick={() => openDetail(shipment)}
              onDelete={handleDeleteShipment}
            />
          ))}
        </div>

        {filteredShipments.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        )}

        {/* Shipment Detail Drawer */}
        <ShipmentDetailDrawer
          shipment={selectedShipment}
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          inventoryItems={inventoryItems}
          companyName={selectedShipment ? getCompanyName(selectedShipment.companyId) : undefined}
          companyId={companyId}
          onUpdate={refreshData}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminShipments;
