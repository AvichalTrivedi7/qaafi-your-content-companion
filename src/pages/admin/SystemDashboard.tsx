import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { StatCard } from '@/components/StatCard';
import { ActivityItem } from '@/components/ActivityItem';
import { 
  Building2, 
  Users, 
  TrendingUp,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Boxes
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlatformStats {
  // Platform Overview
  totalCompanies: number;
  activeCompanies: number;
  totalUsers: number;
  newCompanies: number;
  
  // System Usage
  totalShipments: number;
  shipmentsLast7Days: number;
  deliveredShipments: number;
  cancelledShipments: number;
  totalInventoryItems: number;
  
  // Risk Signals
  companiesNoShipments: Array<{ id: string; name: string }>;
  companiesInventoryNoShipments: Array<{ id: string; name: string }>;
  companiesRepeatedCancellations: Array<{ id: string; name: string; count: number }>;
  
  // Activity Feed
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    referenceType: string | null;
    createdAt: Date;
    companyName?: string;
  }>;
}

const SYSTEM_ACTIVITY_TYPES = [
  'COMPANY_CREATED',
  'INVENTORY_IN',
  'SHIPMENT_CREATED',
  'SHIPMENT_CANCELLED'
] as const;

const AdminSystemDashboard = () => {
  const { t } = useLanguage();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString();

        // === Platform Overview ===
        
        // Fetch all companies
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, name, is_active, created_at');
        if (companiesError) throw companiesError;

        // Fetch users count
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id');
        if (profilesError) throw profilesError;

        // Active companies (with activity in last 7 days)
        const { data: activeCompanyIds, error: activeError } = await supabase
          .from('activity_logs')
          .select('company_id')
          .gte('created_at', sevenDaysAgoISO);
        if (activeError) throw activeError;

        const uniqueActiveCompanyIds = new Set(activeCompanyIds?.map(a => a.company_id) || []);
        
        // New companies (created in last 7 days)
        const newCompaniesCount = companies?.filter(c => 
          new Date(c.created_at) >= sevenDaysAgo
        ).length || 0;

        // === System Usage ===
        
        // Fetch all shipments
        const { data: shipments, error: shipmentsError } = await supabase
          .from('shipments')
          .select('id, status, created_at, company_id');
        if (shipmentsError) throw shipmentsError;

        const shipmentsLast7Days = shipments?.filter(s => 
          new Date(s.created_at) >= sevenDaysAgo
        ).length || 0;

        const deliveredShipments = shipments?.filter(s => s.status === 'delivered').length || 0;
        const cancelledShipments = shipments?.filter(s => s.status === 'cancelled').length || 0;

        // Fetch inventory items count (excluding deleted)
        const { data: inventoryItems, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('id, company_id')
          .eq('is_deleted', false);
        if (inventoryError) throw inventoryError;

        // === Risk Signals ===
        
        // Build company maps
        const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);
        const companiesWithShipments = new Set(shipments?.map(s => s.company_id) || []);
        const companiesWithInventory = new Set(inventoryItems?.map(i => i.company_id) || []);

        // Companies with no shipments after onboarding
        const companiesNoShipments = (companies || [])
          .filter(c => !companiesWithShipments.has(c.id))
          .map(c => ({ id: c.id, name: c.name }));

        // Companies with inventory but no shipments
        const companiesInventoryNoShipments = (companies || [])
          .filter(c => companiesWithInventory.has(c.id) && !companiesWithShipments.has(c.id))
          .map(c => ({ id: c.id, name: c.name }));

        // Companies with repeated cancellations (3+)
        const cancellationsByCompany = new Map<string, number>();
        shipments?.filter(s => s.status === 'cancelled').forEach(s => {
          cancellationsByCompany.set(s.company_id, (cancellationsByCompany.get(s.company_id) || 0) + 1);
        });
        
        const companiesRepeatedCancellations: Array<{ id: string; name: string; count: number }> = [];
        cancellationsByCompany.forEach((count, companyId) => {
          if (count >= 3) {
            companiesRepeatedCancellations.push({
              id: companyId,
              name: companyMap.get(companyId) || 'Unknown',
              count
            });
          }
        });

        // === Activity Feed ===
        
        // Fetch filtered activity logs (system-level events only)
        const { data: activities, error: activitiesError } = await supabase
          .from('activity_logs')
          .select('id, type, description, reference_type, created_at, company_id')
          .in('type', SYSTEM_ACTIVITY_TYPES)
          .order('created_at', { ascending: false })
          .limit(15);
        if (activitiesError) throw activitiesError;

        setStats({
          totalCompanies: companies?.length || 0,
          activeCompanies: uniqueActiveCompanyIds.size,
          totalUsers: profiles?.length || 0,
          newCompanies: newCompaniesCount,
          totalShipments: shipments?.length || 0,
          shipmentsLast7Days,
          deliveredShipments,
          cancelledShipments,
          totalInventoryItems: inventoryItems?.length || 0,
          companiesNoShipments,
          companiesInventoryNoShipments,
          companiesRepeatedCancellations,
          recentActivities: (activities || []).map(a => ({
            id: a.id,
            type: a.type,
            description: a.description,
            referenceType: a.reference_type,
            createdAt: new Date(a.created_at),
            companyName: companyMap.get(a.company_id) || 'Unknown',
          })),
        });
      } catch (error) {
        console.error('Error fetching platform stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchPlatformStats();
    }
  }, [isAdmin]);

  if (authLoading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const hasRiskSignals = (stats?.companiesNoShipments.length || 0) > 0 ||
    (stats?.companiesInventoryNoShipments.length || 0) > 0 ||
    (stats?.companiesRepeatedCancellations.length || 0) > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.systemDashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.systemDashboardSubtitle')}</p>
        </div>

        {/* Platform Overview */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('admin.platformOverview')}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('admin.totalCompanies')}
              value={stats?.totalCompanies || 0}
              icon={Building2}
            />
            <StatCard
              title={t('admin.activeCompanies7Days')}
              value={stats?.activeCompanies || 0}
              icon={TrendingUp}
              variant="success"
            />
            <StatCard
              title={t('admin.totalUsers')}
              value={stats?.totalUsers || 0}
              icon={Users}
              variant="info"
            />
            <StatCard
              title={t('admin.newCompanies')}
              value={stats?.newCompanies || 0}
              subtitle={t('admin.last7Days')}
              icon={Building2}
              variant="warning"
            />
          </div>
        </div>

        {/* System Usage */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">{t('admin.systemUsage')}</h2>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <StatCard
              title={t('admin.totalShipments')}
              value={stats?.totalShipments || 0}
              icon={Truck}
            />
            <StatCard
              title={t('admin.shipmentsLast7Days')}
              value={stats?.shipmentsLast7Days || 0}
              icon={Package}
              variant="info"
            />
            <StatCard
              title={t('admin.deliveredShipments')}
              value={stats?.deliveredShipments || 0}
              icon={CheckCircle}
              variant="success"
            />
            <StatCard
              title={t('admin.cancelledShipments')}
              value={stats?.cancelledShipments || 0}
              icon={XCircle}
              variant="warning"
            />
            <StatCard
              title={t('admin.totalInventoryItems')}
              value={stats?.totalInventoryItems || 0}
              icon={Boxes}
            />
          </div>
        </div>

        {/* Risk & Adoption Signals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {t('admin.riskSignals')}
            </CardTitle>
            <CardDescription>{t('admin.adoptionRisks')}</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasRiskSignals ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('admin.noRiskSignals')}
              </p>
            ) : (
              <div className="space-y-4">
                {/* Companies with no shipments */}
                {(stats?.companiesNoShipments.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      {t('admin.companiesNoShipments')}
                      <Badge variant="secondary">{stats?.companiesNoShipments.length}</Badge>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stats?.companiesNoShipments.slice(0, 5).map(company => (
                        <Badge key={company.id} variant="outline">{company.name}</Badge>
                      ))}
                      {(stats?.companiesNoShipments.length || 0) > 5 && (
                        <Badge variant="outline">
                          +{(stats?.companiesNoShipments.length || 0) - 5} {t('common.more')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Companies with inventory but no shipments */}
                {(stats?.companiesInventoryNoShipments.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      {t('admin.companiesInventoryNoShipments')}
                      <Badge variant="secondary">{stats?.companiesInventoryNoShipments.length}</Badge>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stats?.companiesInventoryNoShipments.slice(0, 5).map(company => (
                        <Badge key={company.id} variant="outline">{company.name}</Badge>
                      ))}
                      {(stats?.companiesInventoryNoShipments.length || 0) > 5 && (
                        <Badge variant="outline">
                          +{(stats?.companiesInventoryNoShipments.length || 0) - 5} {t('common.more')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Companies with repeated cancellations */}
                {(stats?.companiesRepeatedCancellations.length || 0) > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      {t('admin.companiesRepeatedCancellations')}
                      <Badge variant="secondary">{stats?.companiesRepeatedCancellations.length}</Badge>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {stats?.companiesRepeatedCancellations.slice(0, 5).map(company => (
                        <Badge key={company.id} variant="destructive">
                          {company.name} ({company.count})
                        </Badge>
                      ))}
                      {(stats?.companiesRepeatedCancellations.length || 0) > 5 && (
                        <Badge variant="outline">
                          +{(stats?.companiesRepeatedCancellations.length || 0) - 5} {t('common.more')}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent System Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('admin.globalActivityLog')}
            </CardTitle>
            <CardDescription>{t('admin.systemActivityDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.recentActivities.slice(0, 10).map(activity => (
                <div key={activity.id} className="flex items-start justify-between gap-4">
                  <ActivityItem
                    type={activity.type as any}
                    title={activity.description}
                    description={activity.companyName || ''}
                    timestamp={activity.createdAt}
                  />
                </div>
              ))}
              {(!stats?.recentActivities || stats.recentActivities.length === 0) && (
                <p className="text-sm text-muted-foreground py-4 text-center">{t('common.noData')}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSystemDashboard;
