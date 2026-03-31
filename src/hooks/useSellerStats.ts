import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SellerStats {
  sellerCompanyId: string;
  ordersCompleted: number;
  totalOrders: number;
  completionRate: number;
  avgRating: number;
  negotiationSuccessRate: number;
  avgResponseTimeMinutes: number;
  isBestSeller: boolean;
}

function mapStats(row: any): SellerStats {
  return {
    sellerCompanyId: row.seller_company_id,
    ordersCompleted: row.orders_completed,
    totalOrders: row.total_orders,
    completionRate: Number(row.completion_rate),
    avgRating: Number(row.avg_rating),
    negotiationSuccessRate: Number(row.negotiation_success_rate),
    avgResponseTimeMinutes: Number(row.avg_response_time_minutes),
    isBestSeller: row.is_best_seller,
  };
}

export function useSellerStats(sellerCompanyIds: string[]) {
  const [statsMap, setStatsMap] = useState<Record<string, SellerStats>>({});

  useEffect(() => {
    if (sellerCompanyIds.length === 0) return;

    const unique = [...new Set(sellerCompanyIds)];

    const fetchStats = async () => {
      const { data } = await supabase
        .from('seller_stats' as any)
        .select('*')
        .in('seller_company_id', unique);

      if (data) {
        const map: Record<string, SellerStats> = {};
        (data as any[]).forEach(row => {
          const s = mapStats(row);
          map[s.sellerCompanyId] = s;
        });
        setStatsMap(map);
      }
    };

    fetchStats();

    // Realtime updates
    const channel = supabase
      .channel('seller-stats-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'seller_stats' },
        (payload) => {
          if (payload.new) {
            const s = mapStats(payload.new);
            setStatsMap(prev => ({ ...prev, [s.sellerCompanyId]: s }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sellerCompanyIds.join(',')]);

  return statsMap;
}
