-- Create activity_type enum matching domain model
CREATE TYPE public.activity_type AS ENUM (
  'INVENTORY_IN',
  'INVENTORY_OUT',
  'SHIPMENT_CREATED',
  'SHIPMENT_UPDATED',
  'SHIPMENT_DELIVERED',
  'SHIPMENT_CANCELLED',
  'RESERVATION_CREATED',
  'RESERVATION_RELEASED'
);

-- Create shipment_status enum
CREATE TYPE public.shipment_status AS ENUM ('pending', 'in_transit', 'delivered', 'cancelled');

-- Create reservation_status enum
CREATE TYPE public.reservation_status AS ENUM ('active', 'fulfilled', 'cancelled');

-- Create reference_type enum
CREATE TYPE public.reference_type AS ENUM ('inventory', 'shipment', 'reservation');

-- ============================================================================
-- Inventory Items Table
-- ============================================================================
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  available_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (sku, company_id)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

-- Users can only access inventory for their company
CREATE POLICY "Users can view own company inventory"
ON public.inventory_items FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company inventory"
ON public.inventory_items FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company inventory"
ON public.inventory_items FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company inventory"
ON public.inventory_items FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- Admins can access all inventory
CREATE POLICY "Admins can manage all inventory"
ON public.inventory_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Shipments Table
-- ============================================================================
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  status shipment_status NOT NULL DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]',
  proof_of_delivery TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  UNIQUE (shipment_number, company_id)
);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Users can only access shipments for their company
CREATE POLICY "Users can view own company shipments"
ON public.shipments FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company shipments"
ON public.shipments FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company shipments"
ON public.shipments FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company shipments"
ON public.shipments FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- Admins can access all shipments
CREATE POLICY "Admins can manage all shipments"
ON public.shipments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Reservations Table
-- ============================================================================
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  status reservation_status NOT NULL DEFAULT 'active',
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- Users can only access reservations for their company
CREATE POLICY "Users can view own company reservations"
ON public.reservations FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company reservations"
ON public.reservations FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can update own company reservations"
ON public.reservations FOR UPDATE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can delete own company reservations"
ON public.reservations FOR DELETE
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

-- Admins can access all reservations
CREATE POLICY "Admins can manage all reservations"
ON public.reservations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Activity Logs Table
-- ============================================================================
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type activity_type NOT NULL,
  description TEXT NOT NULL,
  reference_id UUID,
  reference_type reference_type,
  metadata JSONB,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Users can only access activity logs for their company
CREATE POLICY "Users can view own company activity logs"
ON public.activity_logs FOR SELECT
TO authenticated
USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Users can insert own company activity logs"
ON public.activity_logs FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Admins can access all activity logs
CREATE POLICY "Admins can manage all activity logs"
ON public.activity_logs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================
CREATE TRIGGER update_inventory_items_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Indexes for performance
-- ============================================================================
CREATE INDEX idx_inventory_items_company_id ON public.inventory_items(company_id);
CREATE INDEX idx_shipments_company_id ON public.shipments(company_id);
CREATE INDEX idx_shipments_status ON public.shipments(status);
CREATE INDEX idx_reservations_company_id ON public.reservations(company_id);
CREATE INDEX idx_reservations_shipment_id ON public.reservations(shipment_id);
CREATE INDEX idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);