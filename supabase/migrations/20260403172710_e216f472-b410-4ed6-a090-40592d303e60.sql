
CREATE OR REPLACE FUNCTION public.start_negotiation(_rfq_id uuid, _quantity numeric DEFAULT NULL::numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  IF rfq_rec.status NOT IN ('open', 'negotiating', 'partially_filled') THEN RAISE EXCEPTION 'RFQ is not available (status: %)', rfq_rec.status; END IF;

  -- Any company can negotiate EXCEPT the one that created the RFQ
  IF user_company_id = rfq_rec.buyer_company_id THEN
    RAISE EXCEPTION 'Cannot negotiate on your own RFQ';
  END IF;

  -- Available = total - fulfilled - reserved
  available_qty := rfq_rec.quantity - rfq_rec.fulfilled_quantity - rfq_rec.reserved_quantity;
  req_qty := COALESCE(_quantity, available_qty);

  IF req_qty <= 0 THEN RAISE EXCEPTION 'Requested quantity must be positive'; END IF;
  IF req_qty > available_qty THEN
    RAISE EXCEPTION 'Requested % exceeds available % meters', req_qty, available_qty;
  END IF;

  UPDATE public.rfqs
  SET reserved_quantity = reserved_quantity + req_qty,
      is_locked = ((reserved_quantity + req_qty + fulfilled_quantity) >= quantity),
      status = CASE WHEN status = 'open' THEN 'negotiating'::rfq_status ELSE status END
  WHERE id = _rfq_id;

  -- FIX: RFQ creator (buyer_company_id in rfqs table) is the SELLER
  -- The user starting negotiation from marketplace is the BUYER
  INSERT INTO public.negotiations (rfq_id, buyer_company_id, seller_company_id, min_price, max_price, negotiation_quantity)
  VALUES (_rfq_id, user_company_id, rfq_rec.buyer_company_id, rfq_rec.min_price, rfq_rec.max_price, req_qty)
  RETURNING id INTO new_neg_id;

  RETURN new_neg_id;
END;
$function$;
