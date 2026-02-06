import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ActivityItem } from '@/components/ActivityItem';
import { 
  Activity, 
  Search,
  Calendar,
  Building2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

interface ActivityLogEntry {
  id: string;
  type: string;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  companyId: string;
  companyName: string;
  createdAt: Date;
  metadata: Record<string, any> | null;
}

const AdminActivityLog = () => {
  const { t } = useLanguage();
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [activities, setActivities] = useState<ActivityLogEntry[]>([]);
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompany, setFilterCompany] = useState<string>('all');

  useEffect(() => {
    const fetchActivityLogs = async () => {
      try {
        // Fetch all companies first
        const { data: companiesData, error: companiesError } = await supabase
          .from('companies')
          .select('id, name')
          .order('name');

        if (companiesError) throw companiesError;
        setCompanies(companiesData || []);

        // Fetch all activity logs
        const { data: logs, error: logsError } = await supabase
          .from('activity_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (logsError) throw logsError;

        // Build company map
        const companyMap = new Map(companiesData?.map(c => [c.id, c.name]) || []);

        // Map logs with company names
        const activityList: ActivityLogEntry[] = (logs || []).map(log => ({
          id: log.id,
          type: log.type,
          description: log.description,
          referenceType: log.reference_type,
          referenceId: log.reference_id,
          companyId: log.company_id,
          companyName: companyMap.get(log.company_id) || 'Unknown',
          createdAt: new Date(log.created_at),
          metadata: log.metadata as Record<string, any> | null,
        }));

        setActivities(activityList);
      } catch (error) {
        console.error('Error fetching activity logs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isAdmin) {
      fetchActivityLogs();
    }
  }, [isAdmin]);

  // Get unique activity types for filtering
  const activityTypes = [...new Set(activities.map(a => a.type))];

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || activity.type === filterType;
    const matchesCompany = filterCompany === 'all' || activity.companyId === filterCompany;
    return matchesSearch && matchesType && matchesCompany;
  });

  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

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
          <h1 className="text-2xl font-bold text-foreground">{t('admin.activityLog')}</h1>
          <p className="text-muted-foreground">{t('admin.activityLogSubtitle')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('admin.searchActivity')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.filterByType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('shipments.all')}</SelectItem>
              {activityTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {getTypeLabel(type)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCompany} onValueChange={setFilterCompany}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('admin.filterByCompany')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('admin.allCompanies')}</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('admin.globalActivityLog')} ({filteredActivities.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredActivities.map(activity => (
                <div 
                  key={activity.id} 
                  className="flex items-start justify-between gap-4 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <ActivityItem
                      type={activity.type as any}
                      title={activity.description}
                      description=""
                      timestamp={activity.createdAt}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      {activity.companyName}
                    </Badge>
                  </div>
                </div>
              ))}
              {filteredActivities.length === 0 && (
                <div className="text-center py-12">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">{t('common.noData')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminActivityLog;
