import { ExternalLayout } from '@/components/ExternalLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { shipmentService } from '@/services/shipmentService';
import { ShipmentStatus } from '@/domain/models';
import { 
  Truck, 
  MapPin, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

const ExternalShipments = () => {
  const { t } = useLanguage();
  const { currentCompany } = useCompany();

  // Filter shipments for current company only
  const companyShipments = shipmentService.getAllShipments().filter(
    shipment => shipment.companyId === currentCompany?.id
  );

  const getStatusIcon = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'in_transit': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: ShipmentStatus) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'in_transit': return 'default';
      case 'delivered': return 'outline';
      case 'cancelled': return 'destructive';
    }
  };

  return (
    <ExternalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('external.yourShipments')}</h1>
          <p className="text-muted-foreground">{t('external.shipmentsSubtitle')}</p>
        </div>

        {/* Shipments Grid */}
        {companyShipments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companyShipments.map(shipment => (
              <Card key={shipment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-mono">
                        {shipment.shipmentNumber}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {shipment.customerName}
                      </p>
                    </div>
                    <Badge variant={getStatusVariant(shipment.status)}>
                      {getStatusIcon(shipment.status)}
                      <span className="ml-1">{t(`shipments.${shipment.status}`)}</span>
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate">{shipment.destination}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Package className="h-4 w-4" />
                    <span>{shipment.items.length} {t('common.items')}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{format(shipment.createdAt, 'MMM dd, yyyy')}</span>
                  </div>
                  
                  {/* Items list */}
                  <div className="pt-3 border-t border-border space-y-1">
                    {shipment.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="truncate text-muted-foreground">{item.inventoryItemName}</span>
                        <span className="font-medium">{item.quantity}</span>
                      </div>
                    ))}
                    {shipment.items.length > 3 && (
                      <p className="text-xs text-muted-foreground">
                        +{shipment.items.length - 3} more
                      </p>
                    )}
                  </div>

                  {/* Delivery date if delivered */}
                  {shipment.deliveredAt && (
                    <div className="pt-3 border-t border-border">
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('shipments.deliveredAt')}: {format(shipment.deliveredAt, 'MMM dd, yyyy')}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">{t('external.noShipments')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </ExternalLayout>
  );
};

export default ExternalShipments;
