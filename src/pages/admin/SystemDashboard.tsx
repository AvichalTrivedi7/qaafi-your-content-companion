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
  Activity,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface SystemStats {
  totalCompanies: number;
  totalUsers: number;
  activeCompanies: number;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    referenceType: string | null;
    createdAt: Date;
    companyName?: string;
  }>;
}

const AdminSystemDashboard = () => {
  const { t } = useLanguage();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystemStats = async () => {
      try {
        // Fetch companies count
        const { data: companies, error: companiesError } = await supabase
          .from('companies')
          .select('id, is_active, name');

        if (companiesError) throw companiesError;

        // Fetch users count (profiles)
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id');

        if (profilesError) throw profilesError;

        // Fetch recent global activity logs (admin can see all)
        const { data: activities, error: activitiesError } = await supabase
          .from('activity_logs')
          .select('id, type, description, reference_type, created_at, company_id')
          .order('created_at', { ascending: false })
          .limit(10);

        if (activitiesError) throw activitiesError;

        // Map company IDs to names
        const companyMap = new Map(companies?.map(c => [c.id, c.name]) || []);

        setStats({
          totalCompanies: companies?.length || 0,
          totalUsers: profiles?.length || 0,
          activeCompanies: companies?.filter(c => c.is_active).length || 0,
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
        console.error('Error fetching system stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchSystemStats();
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('admin.systemDashboard')}</h1>
          <p className="text-muted-foreground">{t('admin.systemDashboardSubtitle')}</p>
        </div>

        {/* System Overview Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title={t('admin.totalCompanies')}
            value={stats?.totalCompanies || 0}
            subtitle={`${stats?.activeCompanies || 0} ${t('admin.active')}`}
            icon={Building2}
          />
          <StatCard
            title={t('admin.totalUsers')}
            value={stats?.totalUsers || 0}
            icon={Users}
            variant="info"
          />
          <StatCard
            title={t('admin.recentActivities')}
            value={stats?.recentActivities.length || 0}
            subtitle={t('admin.last24Hours')}
            icon={Activity}
            variant="success"
          />
        </div>

        {/* Global Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('admin.globalActivityLog')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.recentActivities.slice(0, 8).map(activity => (
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
