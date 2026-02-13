import { useState } from 'react';
import { Trash2, Truck, Package, MapPin, Clock, CheckCircle2, XCircle, Calendar, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useLanguage } from '@/contexts/LanguageContext';
import { Shipment, ShipmentStatus } from '@/domain/models';

interface ShipmentCardInteractiveProps {
  shipment: Shipment;
  companyName?: string;
  onClick: () => void;
  onDelete: (shipmentId: string) => void;
}

const statusConfig: Record<ShipmentStatus, { 
  icon: typeof Truck; 
  color: string; 
  bgColor: string; 
  label: string;
  badgeClass: string;
}> = {
  pending: { 
    icon: Clock, 
    color: 'text-muted-foreground', 
    bgColor: 'bg-muted', 
    label: 'pending',
    badgeClass: 'bg-muted text-muted-foreground',
  },
  in_transit: { 
    icon: Truck, 
    color: 'text-info', 
    bgColor: 'bg-info/10', 
    label: 'inTransit',
    badgeClass: 'bg-info/10 text-info border-info/20',
  },
  delivered: { 
    icon: CheckCircle2, 
    color: 'text-success', 
    bgColor: 'bg-success/10', 
    label: 'delivered',
    badgeClass: 'bg-success/10 text-success border-success/20',
  },
  cancelled: { 
    icon: XCircle, 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10', 
    label: 'cancelled',
    badgeClass: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export const ShipmentCardInteractive = ({
  shipment,
  companyName,
  onClick,
  onDelete,
}: ShipmentCardInteractiveProps) => {
  const { t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const config = statusConfig[shipment.status];
  const Icon = config.icon;
  const isInbound = shipment.movementType === 'inbound';

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    onDelete(shipment.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className={cn(
          'relative cursor-pointer transition-all duration-200 border-border',
          'hover:shadow-lg hover:bg-accent/50 hover:border-primary/20',
          'animate-fade-in'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        {/* Delete button - appears on hover */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'absolute top-2 right-2 z-10 h-8 w-8',
            'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
            'transition-opacity duration-200',
            isHovered ? 'opacity-100' : 'opacity-0'
          )}
          onClick={handleDeleteClick}
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={cn('p-2 rounded-lg', config.bgColor)}>
              <Icon className={cn('h-4 w-4', config.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground font-mono text-sm">
                    {shipment.shipmentNumber}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {shipment.customerName}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge variant="outline" className={cn('border', config.badgeClass)}>
                    {t(`shipments.${config.label}`)}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'border text-xs',
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
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{shipment.destination}</span>
            </div>

            {companyName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{companyName}</span>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Package className="h-3.5 w-3.5" />
                <span>{shipment.items.length} {t('common.items')}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{shipment.createdAt.toLocaleDateString()}</span>
              </div>
            </div>

            {/* Products preview */}
            <div className="pt-2 border-t border-border space-y-1">
              {shipment.items.slice(0, 2).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="truncate text-muted-foreground">{item.inventoryItemName}</span>
                  <span className="font-medium">{item.quantity}</span>
                </div>
              ))}
              {shipment.items.length > 2 && (
                <p className="text-xs text-muted-foreground">
                  +{shipment.items.length - 2} {t('common.more')}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('shipments.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('shipments.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.no')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.yes')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
