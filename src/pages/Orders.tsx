// Orders Page - List confirmed orders from accepted negotiations
import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { negotiationService } from '@/services/negotiationService';
import type { Order } from '@/domain/negotiation.models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { ShoppingCart, Package, CheckCircle, Truck, Clock } from 'lucide-react';

const ORDER_STATUS_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  confirmed: { icon: CheckCircle, color: 'bg-success/10 text-success border-success/20' },
  in_production: { icon: Clock, color: 'bg-warning/10 text-warning border-warning/20' },
  shipped: { icon: Truck, color: 'bg-info/10 text-info border-info/20' },
  delivered: { icon: Package, color: 'bg-success/10 text-success border-success/20' },
  cancelled: { icon: Clock, color: 'bg-destructive/10 text-destructive border-destructive/20' },
};

const Orders = () => {
  const { profile } = useAuth();
  const companyId = profile?.companyId;
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await negotiationService.getOrdersByCompany(companyId);
      setOrders(data);
    } catch (err: any) {
      toast({ title: 'Error loading orders', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground">Confirmed deals from successful negotiations</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-center py-8">Loading orders...</p>
        ) : orders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">No orders yet. Orders are created when a negotiation is accepted.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {orders.map(order => {
              const config = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.confirmed;
              const Icon = config.icon;
              const isBuyer = order.buyerCompanyId === companyId;
              return (
                <Card key={order.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-semibold">{order.productName}</span>
                          <Badge variant="outline" className={config.color}>{order.status.replace('_', ' ')}</Badge>
                          <Badge variant="secondary" className="text-xs">{isBuyer ? 'Buyer' : 'Seller'}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.quantity} {order.unit} · Agreed Price: <strong className="text-foreground">₹{order.agreedPrice.toFixed(2)}</strong>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {order.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Orders;
