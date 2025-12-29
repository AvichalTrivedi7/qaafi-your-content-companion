import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { StatCard } from '@/components/StatCard';
import { ActivityItem } from '@/components/ActivityItem';
import { dashboardService } from '@/services/dashboardService';
import { companyService } from '@/services/companyService';
import { 
  Package, 
  Truck, 
  AlertTriangle, 
  Building2,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const AdminDashboard = () => {
  const { t } = useLanguage();
  const stats = dashboardService.getStats();
  const companyStats = companyService.getStats();

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.dashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.dashboardSubtitle')}</p>
        </div>

        {/* Company Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title={t('admin.totalCompanies')}
            value={companyStats.totalCompanies}
            icon={Building2}
            trend={{ value: companyStats.activeCount, label: t('admin.active') }}
          />
          <StatCard
            title={t('admin.suppliers')}
            value={companyStats.supplierCount}
            icon={Building2}
            variant="info"
          />
          <StatCard
            title={t('admin.wholesalers')}
            value={companyStats.wholesalerCount}
            icon={Building2}
            variant="success"
          />
          <StatCard
            title={t('admin.retailers')}
            value={companyStats.retailerCount}
            icon={Building2}
            variant="warning"
          />
        </div>

        {/* Inventory & Shipment Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard
            title={t('dashboard.totalInventory')}
            value={stats.inventory.totalProducts}
            subtitle={`${stats.inventory.totalAvailableStock} ${t('inventory.units')}`}
            icon={Package}
          />
          <StatCard
            title={t('dashboard.shipmentsInTransit')}
            value={stats.shipments.inTransitCount}
            icon={Truck}
            variant="info"
          />
          <StatCard
            title={t('dashboard.lowStockAlerts')}
            value={stats.inventory.lowStockCount}
            icon={AlertTriangle}
            variant={stats.inventory.lowStockCount > 0 ? 'warning' : 'default'}
          />
          <StatCard
            title={t('dashboard.shipmentsDelayed')}
            value={stats.shipments.delayedCount}
            icon={Clock}
            variant={stats.shipments.delayedCount > 0 ? 'destructive' : 'default'}
          />
        </div>

        {/* Today's Movement & Delivery Metrics */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.todayMovement')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                    <ArrowDownRight className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.stockIn')}</p>
                    <p className="text-lg font-semibold">{stats.todayMovement.stockIn}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-warning/10 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dashboard.stockOut')}</p>
                    <p className="text-lg font-semibold">{stats.todayMovement.stockOut}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.avgDeliveryTime')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">
                  {stats.deliveryMetrics.averageDeliveryTimeHours > 0 
                    ? `${(stats.deliveryMetrics.averageDeliveryTimeHours / 24).toFixed(1)} ${t('dashboard.days')}`
                    : '-'
                  }
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.deliveryMetrics.totalDelivered} {t('dashboard.thisMonth')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('dashboard.needsAttention')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.lowStockItems.slice(0, 2).map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-sm truncate">{item.name}</span>
                    <Badge variant="outline" className="text-warning border-warning">
                      {item.availableStock} {t('inventory.units')}
                    </Badge>
                  </div>
                ))}
                {stats.lowStockItems.length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats.recentActivities.slice(0, 5).map(activity => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
              {stats.recentActivities.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
