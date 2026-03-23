
-- Drop both overloads and recreate a single clean function
DROP FUNCTION IF EXISTS public.start_negotiation(uuid);
DROP FUNCTION IF EXISTS public.start_negotiation(uuid, numeric);

CREATE OR REPLACE FUNCTION public.start_negotiation(_rfq_id uuid, _quantity numeric DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rfq_rec RECORD;
  user_company_id uuid;
  new_neg_id uuid;
  req_qty numeric;
  available_qty numeric;
BEGIN
  user_company_id := get_user_company_id(auth.uid());
  IF user_company_id IS NULL THEN RAISE EXCEPTION 'User has no company'; END IF;

  SELECT * INTO rfq_rec FROM public.rfqs WHERE id = _rfq_id FOR UPDATE;
  IF rfq_rec IS NULL THEN RAISE EXCEPTION 'RFQ not found'; END IF;
  IF rfq_rec.status NOT IN ('open', 'negotiating') THEN RAISE EXCEPTION 'RFQ is not available (status: %)', rfq_rec.status; END IF;
  IF user_company_id != rfq_rec.seller_company_id THEN RAISE EXCEPTION 'Only the seller can start a negotiation'; END IF;

  req_qty := COALESCE(_quantity, rfq_rec.quantity);
  available_qty := rfq_rec.quantity - rfq_rec.reserved_quantity;

  IF req_qty <= 0 THEN RAISE EXCEPTION 'Requested quantity must be positive'; END IF;
  IF req_qty > available_qty THEN
    RAISE EXCEPTION 'Requested % exceeds available % meters', req_qty, available_qty;
  END IF;

  -- Reserve only the requested meters, not the full RFQ quantity
  UPDATE public.rfqs
  SET reserved_quantity = reserved_quantity + req_qty,
      is_locked = ((reserved_quantity + req_qty) >= quantity),
      status = 'negotiating'
  WHERE id = _rfq_id;

  INSERT INTO public.negotiations (rfq_id, buyer_company_id, seller_company_id, min_price, max_price, negotiation_quantity)
  VALUES (_rfq_id, rfq_rec.buyer_company_id, rfq_rec.seller_company_id, rfq_rec.min_price, rfq_rec.max_price, req_qty)
  RETURNING id INTO new_neg_id;

  RETURN new_neg_id;
END;
$$;
