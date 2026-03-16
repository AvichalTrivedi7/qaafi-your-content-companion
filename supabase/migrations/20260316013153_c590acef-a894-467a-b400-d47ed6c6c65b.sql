
-- Add negotiation activity types to the existing enum
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'NEGOTIATION_STARTED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'OFFER_MADE';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'OFFER_COUNTERED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'OFFER_ACCEPTED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'OFFER_REJECTED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'OFFER_EXPIRED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'ORDER_CREATED';

-- Add 'negotiation' and 'order' to reference_type enum
ALTER TYPE public.reference_type ADD VALUE IF NOT EXISTS 'negotiation';
ALTER TYPE public.reference_type ADD VALUE IF NOT EXISTS 'order';
ALTER TYPE public.reference_type ADD VALUE IF NOT EXISTS 'rfq';
