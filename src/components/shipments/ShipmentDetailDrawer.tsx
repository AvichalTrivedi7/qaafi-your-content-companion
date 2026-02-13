import { useState, useEffect } from 'react';
import { MapPin, Package, Calendar, Clock, Pencil, X, Save, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shipment, ShipmentStatus, InventoryItem } from '@/domain/models';
import { shipmentService } from '@/services/shipmentService';

interface ShipmentDetailDrawerProps {
  shipment: Shipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItems: InventoryItem[];
  companyName?: string;
  companyId?: string;
  onUpdate: () => void;
}

const statusOptions: ShipmentStatus[] = ['pending', 'in_transit', 'delivered', 'cancelled'];

const statusConfig: Record<ShipmentStatus, { badgeClass: string; label: string }> = {
  pending: { badgeClass: 'bg-muted text-muted-foreground', label: 'pending' },
  in_transit: { badgeClass: 'bg-info/10 text-info border-info/20', label: 'inTransit' },
  delivered: { badgeClass: 'bg-success/10 text-success border-success/20', label: 'delivered' },
  cancelled: { badgeClass: 'bg-destructive/10 text-destructive border-destructive/20', label: 'cancelled' },
};

export const ShipmentDetailDrawer = ({
  shipment,
  open,
  onOpenChange,
  inventoryItems,
  companyName,
  companyId,
  onUpdate,
}: ShipmentDetailDrawerProps) => {
  const { t } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  
  const [editDestination, setEditDestination] = useState('');
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editStatus, setEditStatus] = useState<ShipmentStatus>('pending');

  useEffect(() => {
    if (shipment) {
      setEditDestination(shipment.destination);
      setEditCustomerName(shipment.customerName);
      setEditStatus(shipment.status);
    }
    setIsEditing(false);
  }, [shipment, open]);

  if (!shipment) return null;

  const config = statusConfig[shipment.status];
  const canEdit = shipment.status !== 'delivered' && shipment.status !== 'cancelled';
  const isInbound = shipment.movementType === 'inbound';

  // Dynamic labels based on movement type
  const customerLabel = isInbound ? t('shipments.supplierName') : t('shipments.customerName');
  const destinationLabel = isInbound ? t('shipments.sourceLocation') : t('shipments.destination');
  const deliveredLabel = isInbound ? t('shipments.receivedAt') : t('shipments.deliveredAt');

  const handleSave = () => {
    if (!shipment) return;

    if (editStatus !== shipment.status) {
      const result = shipmentService.updateStatus(shipment.id, editStatus, companyId);
      if (!result.success) {
        return;
      }
    }

    setIsEditing(false);
    onUpdate();
  };

  const handleCancel = () => {
    setEditDestination(shipment.destination);
    setEditCustomerName(shipment.customerName);
    setEditStatus(shipment.status);
    setIsEditing(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="font-mono">{shipment.shipmentNumber}</DrawerTitle>
              <DrawerDescription className="flex items-center gap-2">
                {t('shipments.shipmentDetails')}
                <Badge 
                  variant="outline" 
                  className={cn(
                    'border text-xs ml-2',
                    isInbound 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-info/10 text-info border-info/20'
                  )}
                >
                  {isInbound ? (
                    <><ArrowDownToLine className="h-3 w-3 mr-1" />{t('shipments.inbound')}</>
                  ) : (
                    <><ArrowUpFromLine className="h-3 w-3 mr-1" />{t('shipments.outbound')}</>
                  )}
                </Badge>
              </DrawerDescription>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit')}
                </Button>
              )}
              {isEditing && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleCancel}>
                    <X className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    {t('common.save')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DrawerHeader>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Status */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t('shipments.status')}</Label>
            {isEditing ? (
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ShipmentStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => {
                    const canTransition = shipmentService.canTransitionTo(shipment.status, status) || status === shipment.status;
                    return (
                      <SelectItem 
                        key={status} 
                        value={status}
                        disabled={!canTransition}
                      >
                        {t(`shipments.${statusConfig[status].label}`)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <Badge variant="outline" className={cn('border', config.badgeClass)}>
                {t(`shipments.${config.label}`)}
              </Badge>
            )}
          </div>

          {/* Customer Name / Destination */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{customerLabel}</Label>
              {isEditing ? (
                <Input
                  value={editCustomerName}
                  onChange={(e) => setEditCustomerName(e.target.value)}
                />
              ) : (
                <p className="font-medium">{shipment.customerName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{destinationLabel}</Label>
              {isEditing ? (
                <Input
                  value={editDestination}
                  onChange={(e) => setEditDestination(e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{shipment.destination}</p>
                </div>
              )}
            </div>
          </div>

          {/* Company */}
          {companyName && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t('admin.company')}</Label>
              <p className="font-medium">{companyName}</p>
            </div>
          )}

          {/* Products List */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">{t('shipments.items')}</Label>
            <div className="space-y-2">
              {shipment.items.map((item, index) => {
                const invItem = inventoryItems.find(i => i.id === item.inventoryItemId);
                return (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{item.inventoryItemName}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.quantity} {invItem?.unit || t('inventory.units')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{t('shipments.createdAt')}</span>
              </div>
              <span className="font-medium">{shipment.createdAt.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{t('shipments.updatedAt')}</span>
              </div>
              <span className="font-medium">{shipment.updatedAt.toLocaleString()}</span>
            </div>
            {shipment.deliveredAt && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{deliveredLabel}</span>
                </div>
                <span className="font-medium">{shipment.deliveredAt.toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t border-border">
          <DrawerClose asChild>
            <Button variant="outline">{t('common.close')}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
