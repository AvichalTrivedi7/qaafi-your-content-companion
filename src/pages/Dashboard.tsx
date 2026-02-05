import { 
  Package, 
  Truck, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { ActivityItem } from '@/components/ActivityItem';
import { ShipmentCard } from '@/components/ShipmentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardService, shipmentService } from '@/services';

const Dashboard = () => {
  const { t } = useLanguage();
  const { profile } = useAuth();
  
  // Scope all stats to the user's company
  const companyId = profile?.companyId ?? undefined;
  const stats = dashboardService.getStats(companyId);
  const activeShipments = [...shipmentService.getShipmentsByStatus('pending', companyId), ...shipmentService.getShipmentsByStatus('in_transit', companyId)].slice(0, 3);

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('dashboard.totalInventory')}
          value={stats.inventory.totalAvailableStock.toLocaleString()}
          subtitle={`${stats.inventory.totalProducts} ${t('dashboard.products')}`}
          icon={Package}
          variant="primary"
        />
        <StatCard
          title={t('dashboard.shipmentsInTransit')}
          value={stats.shipments.inTransitCount}
          subtitle={`${stats.shipments.pendingCount} ${t('shipments.pending').toLowerCase()}`}
          icon={Truck}
          variant="info"
        />
        <StatCard
          title={t('dashboard.shipmentsDelivered')}
          value={stats.shipments.deliveredCount}
          subtitle={t('dashboard.thisMonth')}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title={t('dashboard.lowStockAlerts')}
          value={stats.inventory.lowStockCount}
          subtitle={t('dashboard.needsAttention')}
          icon={AlertTriangle}
          variant={stats.inventory.lowStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Today's Movement */}
      <Card className="mb-6 border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">{t('dashboard.todayMovement')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5">
              <div className="p-2 rounded-lg bg-success/10">
                <ArrowUpCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">+{stats.todayMovement.stockIn}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.stockIn')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/5">
              <div className="p-2 rounded-lg bg-warning/10">
                <ArrowDownCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">-{stats.todayMovement.stockOut}</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.stockOut')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-info/5">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stats.deliveryMetrics.averageDeliveryTimeHours}h</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.avgDeliveryTime')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Shipments requiring attention */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.needsAttention')}</h2>
            <Button variant="ghost" size="sm">
              {t('common.viewAll')}
            </Button>
          </div>
          <div className="space-y-3">
            {activeShipments.map((shipment) => (
              <ShipmentCard 
                key={shipment.id} 
                id={shipment.shipmentNumber}
                destination={shipment.destination}
                status={shipment.status}
                itemCount={shipment.items.reduce((sum, item) => sum + item.quantity, 0)}
                createdAt={shipment.createdAt}
              />
            ))}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {t('dashboard.lowStockAlerts')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.lowStockItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.availableStock} / {item.lowStockThreshold} {item.unit}
                    </p>
                  </div>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${Math.min((item.availableStock / item.lowStockThreshold) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t('dashboard.recentActivity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-border">
                {stats.recentActivities.map((activity) => (
                  <ActivityItem 
                    key={activity.id} 
                    type={activity.type}
                    title={activity.description}
                    description={activity.referenceId || ''}
                    timestamp={activity.createdAt}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;