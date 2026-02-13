import { Check, Circle, Truck, Package, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ShipmentStatus, MovementType } from '@/domain/models';
import { useLanguage } from '@/contexts/LanguageContext';

interface ShipmentStatusStepperProps {
  currentStatus: ShipmentStatus;
  movementType: MovementType;
}

const outboundSteps: { status: ShipmentStatus; icon: typeof Package; labelKey: string }[] = [
  { status: 'pending', icon: Package, labelKey: 'shipments.pending' },
  { status: 'in_transit', icon: Truck, labelKey: 'shipments.inTransit' },
  { status: 'delivered', icon: Check, labelKey: 'shipments.delivered' },
];

const inboundSteps: { status: ShipmentStatus; icon: typeof Package; labelKey: string }[] = [
  { status: 'pending', icon: Package, labelKey: 'shipments.pending' },
  { status: 'in_transit', icon: Truck, labelKey: 'shipments.inTransit' },
  { status: 'delivered', icon: Check, labelKey: 'shipments.received' },
];

const statusOrder: Record<ShipmentStatus, number> = {
  pending: 0,
  in_transit: 1,
  delivered: 2,
  cancelled: -1,
};

export const ShipmentStatusStepper = ({ currentStatus, movementType }: ShipmentStatusStepperProps) => {
  const { t } = useLanguage();
  const steps = movementType === 'inbound' ? inboundSteps : outboundSteps;
  const isCancelled = currentStatus === 'cancelled';
  const currentIndex = statusOrder[currentStatus];

  if (isCancelled) {
    return (
      <div className="flex items-center justify-center gap-2 py-4 px-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <XCircle className="h-5 w-5 text-destructive" />
        <span className="text-sm font-medium text-destructive">{t('shipments.cancelled')}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center w-full py-4">
      {steps.map((step, index) => {
        const isCompleted = currentIndex > index;
        const isCurrent = currentIndex === index;
        const Icon = step.icon;

        return (
          <div key={step.status} className="flex items-center flex-1 last:flex-initial">
            {/* Step circle + label */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'h-9 w-9 rounded-full flex items-center justify-center border-2 transition-colors',
                  isCompleted && 'bg-success border-success text-success-foreground',
                  isCurrent && 'border-primary bg-primary/10 text-primary',
                  !isCompleted && !isCurrent && 'border-muted-foreground/30 text-muted-foreground/40'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  'text-xs font-medium text-center whitespace-nowrap',
                  isCompleted && 'text-success',
                  isCurrent && 'text-primary',
                  !isCompleted && !isCurrent && 'text-muted-foreground/50'
                )}
              >
                {t(step.labelKey)}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mt-[-1.25rem] rounded-full',
                  currentIndex > index ? 'bg-success' : 'bg-muted-foreground/20'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
