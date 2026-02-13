
-- Create movement_type enum
CREATE TYPE public.movement_type AS ENUM ('inbound', 'outbound');

-- Add movement_type column to shipments table with default 'outbound'
ALTER TABLE public.shipments 
ADD COLUMN movement_type public.movement_type NOT NULL DEFAULT 'outbound';
