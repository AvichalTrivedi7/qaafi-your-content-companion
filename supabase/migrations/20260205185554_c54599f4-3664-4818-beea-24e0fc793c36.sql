-- Add is_deleted column for soft delete support
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- Add index for filtering non-deleted items
CREATE INDEX IF NOT EXISTS idx_inventory_items_not_deleted 
ON public.inventory_items (company_id) 
WHERE is_deleted = false;