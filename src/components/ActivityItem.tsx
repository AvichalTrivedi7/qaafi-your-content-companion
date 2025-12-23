import { formatDistanceToNow } from 'date-fns';
import { Package, Truck, ArrowUpCircle, ArrowDownCircle, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActivityType = 'stock_in' | 'stock_out' | 'shipment_created' | 'shipment_updated' | 'shipment_delivered';

interface ActivityItemProps {
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  user?: string;
}

const activityConfig: Record<ActivityType, { icon: LucideIcon; color: string; bgColor: string }> = {
  stock_in: {
    icon: ArrowUpCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  stock_out: {
    icon: ArrowDownCircle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  shipment_created: {
    icon: Package,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  shipment_updated: {
    icon: Truck,
    color: 'text-info',
    bgColor: 'bg-info/10',
  },
  shipment_delivered: {
    icon: Truck,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
};

export const ActivityItem = ({ type, title, description, timestamp, user }: ActivityItemProps) => {
  const config = activityConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex gap-3 py-3 animate-slide-in">
      <div className={cn('p-2 rounded-lg shrink-0', config.bgColor)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </span>
          {user && (
            <>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">{user}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
