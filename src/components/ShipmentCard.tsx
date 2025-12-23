import { Package, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';

type ShipmentStatus = 'dispatched' | 'in_transit' | 'delivered' | 'delayed';

interface ShipmentCardProps {
  id: string;
  destination: string;
  status: ShipmentStatus;
  itemCount: number;
  createdAt: Date;
  onClick?: () => void;
}

const statusConfig: Record<ShipmentStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  dispatched: {
    label: 'shipments.dispatched',
    variant: 'secondary',
    className: 'bg-muted text-muted-foreground',
  },
  in_transit: {
    label: 'shipments.inTransit',
    variant: 'default',
    className: 'bg-info/10 text-info border-info/20',
  },
  delivered: {
    label: 'shipments.delivered',
    variant: 'default',
    className: 'bg-success/10 text-success border-success/20',
  },
  delayed: {
    label: 'shipments.delayed',
    variant: 'destructive',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export const ShipmentCard = ({
  id,
  destination,
  status,
  itemCount,
  createdAt,
  onClick,
}: ShipmentCardProps) => {
  const { t } = useLanguage();
  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-xl border border-border bg-card cursor-pointer',
        'transition-all duration-200 hover:shadow-md hover:border-primary/20',
        'animate-fade-in'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-foreground">{id}</p>
          <div className="flex items-center gap-1 mt-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="text-sm">{destination}</span>
          </div>
        </div>
        <Badge variant="outline" className={cn('border', config.className)}>
          {t(config.label)}
        </Badge>
      </div>
      
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            <span>{itemCount} {t('common.items')}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            <span>{createdAt.toLocaleDateString()}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  );
};
