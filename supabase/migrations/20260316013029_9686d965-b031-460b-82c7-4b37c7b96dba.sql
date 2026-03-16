
-- ============================================================================
-- ENUMS for Negotiation Framework
-- ============================================================================

CREATE TYPE public.rfq_status AS ENUM ('open', 'negotiating', 'accepted', 'expired', 'cancelled');
CREATE TYPE public.negotiation_status AS ENUM ('open', 'offer_made', 'counter_offered', 'accepted', 'expired', 'rejected');
CREATE TYPE public.offer_action AS ENUM ('initial_offer', 'counter_offer', 'accept', 'reject');
CREATE TYPE public.order_status AS ENUM ('confirmed', 'in_production', 'shipped', 'delivered', 'cancelled');

-- ============================================================================
-- RFQ Table
-- ============================================================================

CREATE TABLE public.rfqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_company_id uuid NOT NULL REFERENCES public.companies(id),
  seller_company_id uuid NOT NULL REFERENCES public.companies(id),
  product_name text NOT NULL,
  product_description text,
  quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'meters',
  min_price numeric(12,2) NOT NULL,
  max_price numeric(12,2) NOT NULL,
  status rfq_status NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT rfq_price_range CHECK (min_price > 0 AND max_price > min_price),
  CONSTRAINT rfq_quantity_positive CHECK (quantity > 0),
  CONSTRAINT rfq_different_companies CHECK (buyer_company_id != seller_company_id)
);

-- ============================================================================
-- Negotiations Table (the meter session)
-- ============================================================================

CREATE TABLE public.negotiations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) UNIQUE,
  buyer_company_id uuid NOT NULL REFERENCES public.companies(id),
  seller_company_id uuid NOT NULL REFERENCES public.companies(id),
  min_price numeric(12,2) NOT NULL,
  max_price numeric(12,2) NOT NULL,
  current_offer_price numeric(12,2),
  current_offer_by uuid,
  status negotiation_status NOT NULL DEFAULT 'open',
  accepted_price numeric(12,2),
  accepted_at timestamptz,
  offer_expiry_minutes integer NOT NULL DEFAULT 60,
  current_offer_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Negotiation Offers (immutable audit log - append only)
-- ============================================================================

CREATE TABLE public.negotiation_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id),
  action offer_action NOT NULL,
  price numeric(12,2),
  offered_by uuid NOT NULL,
  offered_by_company_id uuid NOT NULL REFERENCES public.companies(id),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Orders Table (created atomically on acceptance)
-- ============================================================================

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id uuid NOT NULL REFERENCES public.negotiations(id) UNIQUE,
  rfq_id uuid NOT NULL REFERENCES public.rfqs(id) UNIQUE,
  buyer_company_id uuid NOT NULL REFERENCES public.companies(id),
  seller_company_id uuid NOT NULL REFERENCES public.companies(id),
  product_name text NOT NULL,
  quantity integer NOT NULL,
  unit text NOT NULL,
  agreed_price numeric(12,2) NOT NULL,
  status order_status NOT NULL DEFAULT 'confirmed',
  shipment_id uuid REFERENCES public.shipments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE TRIGGER update_rfqs_updated_at BEFORE UPDATE ON public.rfqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_negotiations_updated_at BEFORE UPDATE ON public.negotiations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_rfqs_buyer ON public.rfqs(buyer_company_id);
CREATE INDEX idx_rfqs_seller ON public.rfqs(seller_company_id);
CREATE INDEX idx_rfqs_status ON public.rfqs(status);
CREATE INDEX idx_negotiations_status ON public.negotiations(status);
CREATE INDEX idx_negotiations_rfq ON public.negotiations(rfq_id);
CREATE INDEX idx_negotiation_offers_negotiation ON public.negotiation_offers(negotiation_id);
CREATE INDEX idx_orders_buyer ON public.orders(buyer_company_id);
CREATE INDEX idx_orders_seller ON public.orders(seller_company_id);
CREATE INDEX idx_orders_status ON public.orders(status);

-- ============================================================================
-- Enable Realtime for live meter updates
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_offers;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.negotiation_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Block anon
CREATE POLICY "Block anonymous access" ON public.rfqs FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.negotiations FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.negotiation_offers FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Block anonymous access" ON public.orders FOR ALL TO anon USING (false) WITH CHECK (false);

-- Admin full access
CREATE POLICY "Admins can manage all rfqs" ON public.rfqs FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all negotiations" ON public.negotiations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can read all offers" ON public.negotiation_offers FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Buyer/Seller access: both parties can see RFQs they're part of
CREATE POLICY "Parties can view their rfqs" ON public.rfqs FOR SELECT TO authenticated
  USING (buyer_company_id = get_user_company_id(auth.uid()) OR seller_company_id = get_user_company_id(auth.uid()));

-- Buyer can create RFQs
CREATE POLICY "Companies can create rfqs" ON public.rfqs FOR INSERT TO authenticated
  WITH CHECK (buyer_company_id = get_user_company_id(auth.uid()));

-- Both parties can view negotiations they're part of
CREATE POLICY "Parties can view their negotiations" ON public.negotiations FOR SELECT TO authenticated
  USING (buyer_company_id = get_user_company_id(auth.uid()) OR seller_company_id = get_user_company_id(auth.uid()));

-- Both parties can update negotiations they're part of (for offers/accepts)
CREATE POLICY "Parties can update their negotiations" ON public.negotiations FOR UPDATE TO authenticated
  USING (buyer_company_id = get_user_company_id(auth.uid()) OR seller_company_id = get_user_company_id(auth.uid()));

-- Offers: parties can view offers on their negotiations
CREATE POLICY "Parties can view negotiation offers" ON public.negotiation_offers FOR SELECT TO authenticated
  USING (offered_by_company_id = get_user_company_id(auth.uid()) OR
    EXISTS (SELECT 1 FROM public.negotiations n WHERE n.id = negotiation_id
      AND (n.buyer_company_id = get_user_company_id(auth.uid()) OR n.seller_company_id = get_user_company_id(auth.uid()))));

-- Offers: parties can insert offers on their negotiations
CREATE POLICY "Parties can make offers" ON public.negotiation_offers FOR INSERT TO authenticated
  WITH CHECK (offered_by_company_id = get_user_company_id(auth.uid()));

-- NO UPDATE OR DELETE on negotiation_offers (immutable audit log)

-- Orders: both parties can view
CREATE POLICY "Parties can view their orders" ON public.orders FOR SELECT TO authenticated
  USING (buyer_company_id = get_user_company_id(auth.uid()) OR seller_company_id = get_user_company_id(auth.uid()));

-- ============================================================================
-- Atomic Accept Function (state machine + order creation)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_negotiation(_negotiation_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  neg RECORD;
  rfq RECORD;
  new_order_id uuid;
  user_company_id uuid;
BEGIN
  user_company_id := get_user_company_id(auth.uid());

  -- Lock the negotiation row
  SELECT * INTO neg FROM public.negotiations WHERE id = _negotiation_id FOR UPDATE;

  IF neg IS NULL THEN
    RAISE EXCEPTION 'Negotiation not found';
  END IF;

  -- Must be in offer_made or counter_offered state
  IF neg.status NOT IN ('offer_made', 'counter_offered') THEN
    RAISE EXCEPTION 'Cannot accept: negotiation is in % state', neg.status;
  END IF;

  -- Accepting party must be the OTHER side (not the one who made the current offer)
  IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN
    RAISE EXCEPTION 'Cannot accept your own offer';
  END IF;

  -- Must be a party to this negotiation
  IF user_company_id != neg.buyer_company_id AND user_company_id != neg.seller_company_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Check offer hasn't expired
  IF neg.current_offer_expires_at IS NOT NULL AND neg.current_offer_expires_at < now() THEN
    UPDATE public.negotiations SET status = 'expired' WHERE id = _negotiation_id;
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Get RFQ details
  SELECT * INTO rfq FROM public.rfqs WHERE id = neg.rfq_id;

  -- Atomic: update negotiation, RFQ, create order, log audit
  UPDATE public.negotiations
  SET status = 'accepted', accepted_price = neg.current_offer_price, accepted_at = now()
  WHERE id = _negotiation_id;

  UPDATE public.rfqs SET status = 'accepted' WHERE id = neg.rfq_id;

  INSERT INTO public.orders (negotiation_id, rfq_id, buyer_company_id, seller_company_id, product_name, quantity, unit, agreed_price)
  VALUES (neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, rfq.product_name, rfq.quantity, rfq.unit, neg.current_offer_price)
  RETURNING id INTO new_order_id;

  -- Audit log entry
  INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id)
  VALUES (_negotiation_id, 'accept', neg.current_offer_price, auth.uid(), user_company_id);

  RETURN new_order_id;
END;
$$;
