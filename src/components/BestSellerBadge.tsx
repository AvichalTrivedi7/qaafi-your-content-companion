import { Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SellerStats {
  ordersCompleted: number;
  completionRate: number;
  avgRating: number;
  negotiationSuccessRate: number;
  avgResponseTimeMinutes: number;
  isBestSeller: boolean;
}

interface BestSellerBadgeProps {
  stats: SellerStats;
  className?: string;
}

export function BestSellerBadge({ stats, className = '' }: BestSellerBadgeProps) {
  if (!stats.isBestSeller) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-[hsl(51,100%,50%)] text-black cursor-help ${className}`}
          >
            <Star className="h-3 w-3 fill-current" />
            Best Seller
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[220px]">
          <div className="space-y-1 text-xs">
            <p className="font-semibold flex items-center gap-1">
              <Star className="h-3 w-3 fill-current text-[hsl(51,100%,50%)]" /> Best Seller
            </p>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• {stats.ordersCompleted} orders completed</li>
              <li>• {stats.avgRating.toFixed(1)} average rating</li>
              <li>• {(stats.completionRate * 100).toFixed(0)}% order success rate</li>
              <li>• Fast response times</li>
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
