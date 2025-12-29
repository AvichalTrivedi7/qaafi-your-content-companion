import { ExternalLayout } from '@/components/ExternalLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCompany } from '@/contexts/CompanyContext';
import { inventoryService } from '@/services/inventoryService';
import { shipmentService } from '@/services/shipmentService';
import { StatCard } from '@/components/StatCard';
import { Package, Truck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ExternalDashboard = () => {
  const { t } = useLanguage();
  const { currentCompany } = useCompany();

  // Filter data for current company only
  const companyInventory = inventoryService.getAllItems().filter(
    item => item.companyId === currentCompany?.id
  );
  const companyShipments = shipmentService.getAllShipments().filter(
    shipment => shipment.companyId === currentCompany?.id
  );

  const totalStock = companyInventory.reduce((sum, item) => sum + item.availableStock, 0);
  const lowStockItems = companyInventory.filter(item => item.availableStock <= item.lowStockThreshold);
  const inTransitShipments = companyShipments.filter(s => s.status === 'in_transit');
  const deliveredShipments = companyShipments.filter(s => s.status === 'delivered');

  return (
    <ExternalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('external.welcome')}, {currentCompany?.name}
          </h1>
          <p className="text-muted-foreground capitalize">{t(`role.${currentCompany?.type}`)}</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title={t('dashboard.totalInventory')}
            value={companyInventory.length}
            subtitle={`${totalStock} ${t('inventory.units')}`}
            icon={Package}
          />
          <StatCard
            title={t('dashboard.shipmentsInTransit')}
            value={inTransitShipments.length}
            icon={Truck}
            variant="info"
          />
          <StatCard
            title={t('dashboard.shipmentsDelivered')}
            value={deliveredShipments.length}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title={t('dashboard.lowStockAlerts')}
            value={lowStockItems.length}
            icon={AlertTriangle}
            variant={lowStockItems.length > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Low Stock Items */}
        {lowStockItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.needsAttention')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20">
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-warning" />
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.sku}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning">
                      {item.availableStock} {item.unit}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Shipments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('shipments.myShipments')}</CardTitle>
          </CardHeader>
          <CardContent>
            {companyShipments.length > 0 ? (
              <div className="space-y-2">
                {companyShipments.slice(0, 5).map(shipment => (
                  <div key={shipment.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium font-mono text-sm">{shipment.shipmentNumber}</p>
                        <p className="text-xs text-muted-foreground">{shipment.destination}</p>
                      </div>
                    </div>
                    <Badge variant={shipment.status === 'delivered' ? 'outline' : 'default'}>
                      {t(`shipments.${shipment.status}`)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">{t('external.noShipments')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ExternalLayout>
  );
};

export default ExternalDashboard;
