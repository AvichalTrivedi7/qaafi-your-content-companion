import { 
  Package, 
  Truck, 
  AlertTriangle, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  ArrowUpCircle,
  ArrowDownCircle
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/StatCard';
import { ActivityItem } from '@/components/ActivityItem';
import { ShipmentCard } from '@/components/ShipmentCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for demonstration
const mockActivities = [
  {
    type: 'stock_in' as const,
    title: 'Cotton Fabric - Blue',
    description: '+500 meters added to inventory',
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    user: 'Rajesh Kumar',
  },
  {
    type: 'shipment_delivered' as const,
    title: 'Shipment #SHP-2024-089',
    description: 'Delivered to Mumbai Warehouse',
    timestamp: new Date(Date.now() - 1000 * 60 * 45),
    user: 'Amit Singh',
  },
  {
    type: 'stock_out' as const,
    title: 'Silk Material - Red',
    description: '-200 pieces reserved for shipment',
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    user: 'Priya Sharma',
  },
  {
    type: 'shipment_created' as const,
    title: 'Shipment #SHP-2024-090',
    description: 'New shipment to Delhi created',
    timestamp: new Date(Date.now() - 1000 * 60 * 180),
    user: 'Rajesh Kumar',
  },
];

const mockShipments = [
  {
    id: 'SHP-2024-091',
    destination: 'Jaipur Central Market',
    status: 'in_transit' as const,
    itemCount: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: 'SHP-2024-090',
    destination: 'Delhi Wholesale Hub',
    status: 'dispatched' as const,
    itemCount: 8,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: 'SHP-2024-088',
    destination: 'Lucknow Traders',
    status: 'delayed' as const,
    itemCount: 15,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
];

const mockLowStockItems = [
  { name: 'Silk Material - Red', available: 45, unit: 'pieces', threshold: 100 },
  { name: 'Cotton Fabric - White', available: 120, unit: 'meters', threshold: 200 },
  { name: 'Polyester Blend', available: 30, unit: 'meters', threshold: 50 },
];

const Dashboard = () => {
  const { t } = useLanguage();

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
          value="2,847"
          subtitle="12 products"
          icon={Package}
          variant="primary"
          trend={{ value: 5.2, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.shipmentsInTransit')}
          value="8"
          subtitle="3 arriving today"
          icon={Truck}
          variant="info"
        />
        <StatCard
          title={t('dashboard.shipmentsDelivered')}
          value="156"
          subtitle="This month"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title={t('dashboard.lowStockAlerts')}
          value="3"
          subtitle={t('dashboard.needsAttention')}
          icon={AlertTriangle}
          variant="warning"
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
                <p className="text-xl font-bold text-foreground">+1,250</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.stockIn')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/5">
              <div className="p-2 rounded-lg bg-warning/10">
                <ArrowDownCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">-890</p>
                <p className="text-xs text-muted-foreground">{t('dashboard.stockOut')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-info/5">
              <div className="p-2 rounded-lg bg-info/10">
                <Clock className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">2.3 {t('dashboard.days')}</p>
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
            {mockShipments.map((shipment) => (
              <ShipmentCard key={shipment.id} {...shipment} />
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
              {mockLowStockItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/10">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.available} / {item.threshold} {item.unit}
                    </p>
                  </div>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-warning rounded-full"
                      style={{ width: `${(item.available / item.threshold) * 100}%` }}
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
                {mockActivities.map((activity, index) => (
                  <ActivityItem key={index} {...activity} />
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
