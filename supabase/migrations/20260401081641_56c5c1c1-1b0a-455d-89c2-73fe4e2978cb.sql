
-- 1. Add 'partially_filled' to rfq_status enum
ALTER TYPE public.rfq_status ADD VALUE IF NOT EXISTS 'partially_filled' AFTER 'negotiating';

-- 2. Add fulfilled_quantity column to rfqs
ALTER TABLE public.rfqs ADD COLUMN IF NOT EXISTS fulfilled_quantity numeric NOT NULL DEFAULT 0;

-- 3. Drop unique constraint on orders.rfq_id to allow multiple orders per RFQ
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_rfq_id_key;

-- 4. Drop unique constraint on negotiations.rfq_id to allow multiple negotiations per RFQ
ALTER TABLE public.negotiations DROP CONSTRAINT IF EXISTS negotiations_rfq_id_key;
