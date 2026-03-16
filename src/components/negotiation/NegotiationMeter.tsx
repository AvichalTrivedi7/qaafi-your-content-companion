// NegotiationMeter - The visual price slider component
// Core differentiator of Qaafi: a range-bound slider for structured price negotiation

import { useState, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface NegotiationMeterProps {
  minPrice: number;
  maxPrice: number;
  currentOffer?: number;
  isReadOnly?: boolean;
  onOfferChange?: (price: number) => void;
  role: 'buyer' | 'seller';
  currentOfferBy?: 'buyer' | 'seller';
}

export const NegotiationMeter = ({
  minPrice,
  maxPrice,
  currentOffer,
  isReadOnly = false,
  onOfferChange,
  role,
  currentOfferBy,
}: NegotiationMeterProps) => {
  const range = maxPrice - minPrice;
  const [localValue, setLocalValue] = useState<number>(currentOffer ?? (minPrice + range / 2));

  // Calculate position percentage for display markers
  const offerPercent = useMemo(() => {
    if (!currentOffer) return null;
    return ((currentOffer - minPrice) / range) * 100;
  }, [currentOffer, minPrice, range]);

  const localPercent = ((localValue - minPrice) / range) * 100;

  const handleSliderChange = (values: number[]) => {
    const price = values[0];
    setLocalValue(price);
    onOfferChange?.(price);
  };

  // Tick marks at 25% intervals
  const ticks = [0, 25, 50, 75, 100].map(pct => ({
    pct,
    price: minPrice + (range * pct) / 100,
  }));

  return (
    <div className="space-y-6">
      {/* Price Range Header */}
      <div className="flex items-center justify-between text-sm">
        <div className="text-left">
          <p className="text-muted-foreground text-xs">Min Price</p>
          <p className="font-bold text-foreground">₹{minPrice.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-muted-foreground text-xs">Your Offer</p>
          <p className="font-bold text-2xl text-primary">₹{localValue.toFixed(2)}</p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-xs">Max Price</p>
          <p className="font-bold text-foreground">₹{maxPrice.toFixed(2)}</p>
        </div>
      </div>

      {/* The Meter */}
      <div className="relative px-1">
        {/* Background gradient track */}
        <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-3 rounded-full bg-gradient-to-r from-success via-warning to-destructive opacity-20" />

        {/* Current offer marker (if from other party) */}
        {currentOffer && currentOfferBy && currentOfferBy !== role && offerPercent !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${offerPercent}%` }}
          >
            <div className="w-3 h-3 rounded-full bg-warning border-2 border-background shadow-md" />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs bg-warning text-warning-foreground px-1.5 py-0.5 rounded font-medium">
                ₹{currentOffer.toFixed(0)}
              </span>
            </div>
          </div>
        )}

        <Slider
          value={[localValue]}
          min={minPrice}
          max={maxPrice}
          step={Math.max(0.01, range / 1000)}
          onValueChange={handleSliderChange}
          disabled={isReadOnly}
          className={cn(
            'relative z-20',
            isReadOnly && 'opacity-60 cursor-not-allowed'
          )}
        />
      </div>

      {/* Tick marks */}
      <div className="flex justify-between px-1">
        {ticks.map(tick => (
          <div key={tick.pct} className="text-center">
            <div className="w-px h-2 bg-border mx-auto mb-1" />
            <span className="text-[10px] text-muted-foreground">₹{tick.price.toFixed(0)}</span>
          </div>
        ))}
      </div>

      {/* Status label */}
      {isReadOnly && (
        <div className="text-center">
          <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
            Meter locked — {currentOfferBy === role ? 'Waiting for response' : 'Your turn to respond'}
          </span>
        </div>
      )}
    </div>
  );
};
