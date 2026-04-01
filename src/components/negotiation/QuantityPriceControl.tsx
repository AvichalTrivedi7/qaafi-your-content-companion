// QuantityPriceControl - Dual control for quantity selection + dynamic price meter
// Adjusts price range based on quantity: smaller qty → higher min, larger qty → lower max (bulk discount)

import { useState, useMemo, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Minus, Plus, Package, TrendingDown } from 'lucide-react';

interface QuantityPriceControlProps {
  maxQuantity: number;           // RFQ available quantity
  unit: string;
  baseMinPrice: number;          // seller's base min price
  baseMaxPrice: number;          // seller's base max price
  initialQuantity?: number;
  initialPrice?: number;
  isReadOnly?: boolean;
  onQuantityChange?: (qty: number) => void;
  onPriceChange?: (price: number) => void;
  currentOffer?: number;         // other party's current offer price
  currentOfferBy?: 'buyer' | 'seller';
  role: 'buyer' | 'seller';
}

// Calculate adjusted price range based on quantity ratio
function adjustedPriceRange(
  baseMin: number,
  baseMax: number,
  quantity: number,
  maxQuantity: number
) {
  if (maxQuantity <= 0) return { min: baseMin, max: baseMax };
  const ratio = quantity / maxQuantity; // 0..1 where 1 = full quantity
  const range = baseMax - baseMin;

  // Small quantity: min shifts up (less negotiating power)
  // Full quantity: max shifts down (bulk discount)
  const quantityPremium = range * 0.15 * (1 - ratio); // up to 15% premium for small qty
  const bulkDiscount = range * 0.15 * ratio;           // up to 15% discount for full qty

  const adjMin = baseMin + quantityPremium;
  const adjMax = baseMax - bulkDiscount;

  // Ensure min < max with at least 1% of range gap
  const safeMin = Math.round(adjMin * 100) / 100;
  const safeMax = Math.max(safeMin + range * 0.01, Math.round(adjMax * 100) / 100);

  return { min: safeMin, max: safeMax };
}

export const QuantityPriceControl = ({
  maxQuantity,
  unit,
  baseMinPrice,
  baseMaxPrice,
  initialQuantity,
  initialPrice,
  isReadOnly = false,
  onQuantityChange,
  onPriceChange,
  currentOffer,
  currentOfferBy,
  role,
}: QuantityPriceControlProps) => {
  const [quantity, setQuantity] = useState(initialQuantity ?? Math.min(1, maxQuantity));
  const [price, setPrice] = useState<number | null>(initialPrice ?? null);

  const { min: adjMin, max: adjMax } = useMemo(
    () => adjustedPriceRange(baseMinPrice, baseMaxPrice, quantity, maxQuantity),
    [baseMinPrice, baseMaxPrice, quantity, maxQuantity]
  );

  // Clamp price when range changes
  const effectivePrice = useMemo(() => {
    if (price === null) return adjMin + (adjMax - adjMin) / 2;
    return Math.max(adjMin, Math.min(adjMax, price));
  }, [price, adjMin, adjMax]);

  const totalValue = effectivePrice * quantity;

  const handleQuantitySlider = useCallback((values: number[]) => {
    const q = Math.max(1, Math.round(values[0]));
    setQuantity(q);
    onQuantityChange?.(q);
  }, [onQuantityChange]);

  const handleQuantityStep = useCallback((delta: number) => {
    setQuantity(prev => {
      const next = Math.max(1, Math.min(maxQuantity, prev + delta));
      onQuantityChange?.(next);
      return next;
    });
  }, [maxQuantity, onQuantityChange]);

  const handlePriceSlider = useCallback((values: number[]) => {
    const p = values[0];
    setPrice(p);
    onPriceChange?.(p);
  }, [onPriceChange]);

  const offerPercent = currentOffer && currentOfferBy && currentOfferBy !== role
    ? ((currentOffer - adjMin) / (adjMax - adjMin)) * 100
    : null;

  return (
    <div className="space-y-6">
      {/* Quantity Selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Quantity to Buy
          </label>
          <span className="text-xs text-muted-foreground">
            Available: {maxQuantity} {unit}
          </span>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => handleQuantityStep(-1)}
            disabled={isReadOnly || quantity <= 1}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-[100px]">
            <span className="text-3xl font-bold text-foreground">{quantity}</span>
            <span className="text-lg text-muted-foreground ml-1">{unit}</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => handleQuantityStep(1)}
            disabled={isReadOnly || quantity >= maxQuantity}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quantity slider */}
        {maxQuantity > 1 && (
          <div className="px-2">
            <Slider
              value={[quantity]}
              min={1}
              max={maxQuantity}
              step={1}
              onValueChange={handleQuantitySlider}
              disabled={isReadOnly}
              className={cn(isReadOnly && 'opacity-60 cursor-not-allowed')}
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">1 {unit}</span>
              <span className="text-[10px] text-muted-foreground">{maxQuantity} {unit}</span>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Price Info */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <TrendingDown className="h-3 w-3" />
          Price range adjusted for {quantity} {unit}
        </div>
        <div className="flex justify-between text-sm">
          <span>Min: <strong className="text-foreground">₹{adjMin.toFixed(2)}</strong></span>
          <span>Max: <strong className="text-foreground">₹{adjMax.toFixed(2)}</strong></span>
        </div>
        {quantity < maxQuantity && (
          <p className="text-[10px] text-muted-foreground">
            💡 Buying more? Larger quantities unlock better price ranges.
          </p>
        )}
      </div>

      {/* Price Meter */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-left">
            <p className="text-muted-foreground text-xs">Min Price</p>
            <p className="font-bold text-foreground">₹{adjMin.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-muted-foreground text-xs">Your Offer</p>
            <p className="font-bold text-2xl text-primary">₹{effectivePrice.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">per {unit}</p>
          </div>
          <div className="text-right">
            <p className="text-muted-foreground text-xs">Max Price</p>
            <p className="font-bold text-foreground">₹{adjMax.toFixed(2)}</p>
          </div>
        </div>

        <div className="relative px-1">
          {/* Background gradient */}
          <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-success via-warning to-destructive opacity-20" />

          {/* Other party's offer marker */}
          {offerPercent !== null && offerPercent >= 0 && offerPercent <= 100 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `${offerPercent}%` }}
            >
              <div className="w-3 h-3 rounded-full bg-warning border-2 border-background shadow-md" />
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <span className="text-xs bg-warning text-warning-foreground px-1.5 py-0.5 rounded font-medium">
                  ₹{currentOffer?.toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <Slider
            value={[effectivePrice]}
            min={adjMin}
            max={adjMax}
            step={Math.max(0.01, (adjMax - adjMin) / 1000)}
            onValueChange={handlePriceSlider}
            disabled={isReadOnly}
            className={cn('relative z-20', isReadOnly && 'opacity-60 cursor-not-allowed')}
          />
        </div>

        {/* Tick marks */}
        <div className="flex justify-between px-1">
          {[0, 25, 50, 75, 100].map(pct => {
            const tickPrice = adjMin + ((adjMax - adjMin) * pct) / 100;
            return (
              <div key={pct} className="text-center">
                <div className="w-px h-2 bg-border mx-auto mb-1" />
                <span className="text-[10px] text-muted-foreground">₹{tickPrice.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total Value */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Total Order Value</p>
        <p className="text-2xl font-bold text-primary">₹{totalValue.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">
          {quantity} {unit} × ₹{effectivePrice.toFixed(2)}/{unit}
        </p>
      </div>

      {/* Read-only status */}
      {isReadOnly && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Controls locked — {currentOfferBy === role ? 'Waiting for response' : 'Your turn to respond'}
          </span>
        </div>
      )}
    </div>
  );
};
