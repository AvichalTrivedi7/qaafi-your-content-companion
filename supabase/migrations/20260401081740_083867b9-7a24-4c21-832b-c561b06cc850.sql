
-- Update submit_offer for partial fulfillment
CREATE OR REPLACE FUNCTION public.submit_offer(_negotiation_id uuid, _offer_price numeric DEFAULT NULL::numeric, _action text DEFAULT 'initial_offer'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  neg RECORD;
  rfq_rec RECORD;
  new_status negotiation_status;
  user_company_id uuid;
  offer_id uuid;
  new_fulfilled numeric;
  new_reserved numeric;
  new_rfq_status rfq_status;
BEGIN
  user_company_id := get_user_company_id(auth.uid());
  IF user_company_id IS NULL THEN RAISE EXCEPTION 'User has no company'; END IF;

  SELECT * INTO neg FROM public.negotiations WHERE id = _negotiation_id FOR UPDATE;
  IF neg IS NULL THEN RAISE EXCEPTION 'Negotiation not found'; END IF;

  IF user_company_id != neg.buyer_company_id AND user_company_id != neg.seller_company_id THEN
    RAISE EXCEPTION 'Not authorized: not a party to this negotiation';
  END IF;

  IF neg.status IN ('accepted', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'Negotiation is in terminal state: %', neg.status;
  END IF;

  IF neg.current_offer_expires_at IS NOT NULL AND neg.current_offer_expires_at < now() THEN
    UPDATE public.negotiations SET status = 'expired' WHERE id = _negotiation_id;
    UPDATE public.rfqs
    SET reserved_quantity = GREATEST(0, reserved_quantity - neg.negotiation_quantity),
        is_locked = (GREATEST(0, reserved_quantity - neg.negotiation_quantity) >= quantity)
    WHERE id = neg.rfq_id AND status NOT IN ('accepted');
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  CASE _action
    WHEN 'initial_offer' THEN
      IF neg.status != 'open' THEN RAISE EXCEPTION 'Initial offer only allowed in OPEN state, current: %', neg.status; END IF;
      IF _offer_price IS NULL THEN RAISE EXCEPTION 'Price required for initial offer'; END IF;
      new_status := 'offer_made';
    WHEN 'counter_offer' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN RAISE EXCEPTION 'Counter offer not allowed in % state', neg.status; END IF;
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN RAISE EXCEPTION 'Cannot counter your own offer'; END IF;
      IF _offer_price IS NULL THEN RAISE EXCEPTION 'Price required for counter offer'; END IF;
      IF neg.status = 'offer_made' THEN new_status := 'counter_offered'; ELSE new_status := 'offer_made'; END IF;
    WHEN 'accept' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN RAISE EXCEPTION 'Accept only allowed when there is an active offer'; END IF;
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN RAISE EXCEPTION 'Cannot accept your own offer'; END IF;
      new_status := 'accepted';
      _offer_price := neg.current_offer_price;
    WHEN 'reject' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN RAISE EXCEPTION 'Reject only allowed when there is an active offer'; END IF;
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN RAISE EXCEPTION 'Cannot reject your own offer'; END IF;
      new_status := 'rejected';
      _offer_price := neg.current_offer_price;
    ELSE
      RAISE EXCEPTION 'Invalid action: %', _action;
  END CASE;

  IF _action IN ('initial_offer', 'counter_offer') THEN
    IF _offer_price < neg.min_price OR _offer_price > neg.max_price THEN
      RAISE EXCEPTION 'Price % is outside allowed range [%, %]', _offer_price, neg.min_price, neg.max_price;
    END IF;
  END IF;

  IF _action = 'accept' THEN
    -- Lock the RFQ row and validate remaining quantity
    SELECT * INTO rfq_rec FROM public.rfqs WHERE id = neg.rfq_id FOR UPDATE;

    IF (rfq_rec.fulfilled_quantity + neg.negotiation_quantity) > rfq_rec.quantity THEN
      RAISE EXCEPTION 'Cannot accept: negotiation quantity (%) exceeds remaining RFQ quantity (%)',
        neg.negotiation_quantity, (rfq_rec.quantity - rfq_rec.fulfilled_quantity);
    END IF;

    -- Accept this negotiation
    UPDATE public.negotiations SET status = 'accepted', accepted_price = _offer_price, accepted_at = now() WHERE id = _negotiation_id;

    -- Update RFQ: move quantity from reserved to fulfilled
    new_fulfilled := rfq_rec.fulfilled_quantity + neg.negotiation_quantity;
    new_reserved := GREATEST(0, rfq_rec.reserved_quantity - neg.negotiation_quantity);

    -- Determine new RFQ status
    IF new_fulfilled >= rfq_rec.quantity THEN
      new_rfq_status := 'accepted';
    ELSIF new_fulfilled > 0 THEN
      new_rfq_status := 'partially_filled';
    ELSE
      new_rfq_status := rfq_rec.status;
    END IF;

    UPDATE public.rfqs
    SET fulfilled_quantity = new_fulfilled,
        reserved_quantity = new_reserved,
        is_locked = ((new_reserved + new_fulfilled) >= quantity),
        status = new_rfq_status
    WHERE id = neg.rfq_id;

    -- Create order for this partial fulfillment
    INSERT INTO public.orders (negotiation_id, rfq_id, buyer_company_id, seller_company_id, product_name, quantity, unit, agreed_price)
    SELECT neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, r.product_name, neg.negotiation_quantity::integer, r.unit, _offer_price
    FROM public.rfqs r WHERE r.id = neg.rfq_id;

    -- If RFQ is fully fulfilled, reject remaining active siblings
    IF new_fulfilled >= rfq_rec.quantity THEN
      UPDATE public.negotiations
      SET status = 'rejected'
      WHERE rfq_id = neg.rfq_id AND id != _negotiation_id AND status IN ('open', 'offer_made', 'counter_offered');

      -- Release their reserved quantity
      UPDATE public.rfqs
      SET reserved_quantity = 0,
          is_locked = true
      WHERE id = neg.rfq_id;
    END IF;

  ELSIF _action = 'reject' THEN
    UPDATE public.negotiations SET status = 'rejected' WHERE id = _negotiation_id;
    new_reserved := GREATEST(0, (SELECT reserved_quantity FROM public.rfqs WHERE id = neg.rfq_id) - neg.negotiation_quantity);
    UPDATE public.rfqs
    SET reserved_quantity = new_reserved,
        is_locked = ((new_reserved + fulfilled_quantity) >= quantity)
    WHERE id = neg.rfq_id AND status NOT IN ('accepted');
  ELSE
    UPDATE public.negotiations
    SET status = new_status, current_offer_price = _offer_price, current_offer_by = auth.uid(),
        current_offer_expires_at = now() + (offer_expiry_minutes * interval '1 minute')
    WHERE id = _negotiation_id;
  END IF;

  INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id, message)
  VALUES (_negotiation_id, _action::offer_action, _offer_price, auth.uid(), user_company_id, NULL)
  RETURNING id INTO offer_id;

  RETURN jsonb_build_object('success', true, 'negotiation_id', _negotiation_id, 'new_status', new_status::text, 'offer_id', offer_id, 'price', _offer_price);
END;
$function$;

-- Update start_negotiation to account for fulfilled_quantity
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

  INSERT INTO public.negotiations (rfq_id, buyer_company_id, seller_company_id, min_price, max_price, negotiation_quantity)
  VALUES (_rfq_id, rfq_rec.buyer_company_id, user_company_id, rfq_rec.min_price, rfq_rec.max_price, req_qty)
  RETURNING id INTO new_neg_id;

  RETURN new_neg_id;
END;
$function$;

-- Update expire_negotiations to account for fulfilled_quantity in lock calculation
CREATE OR REPLACE FUNCTION public.expire_negotiations()
 RETURNS SETOF uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  expired_ids uuid[];
BEGIN
  WITH expired AS (
    UPDATE public.negotiations
    SET status = 'expired'
    WHERE status IN ('open', 'offer_made', 'counter_offered')
      AND current_offer_expires_at IS NOT NULL
      AND current_offer_expires_at < now()
    RETURNING id, rfq_id, negotiation_quantity, current_offer_price, buyer_company_id
  ),
  release_meters AS (
    UPDATE public.rfqs r
    SET reserved_quantity = GREATEST(0, r.reserved_quantity - agg.total_release),
        is_locked = (GREATEST(0, r.reserved_quantity - agg.total_release) + r.fulfilled_quantity >= r.quantity)
    FROM (
      SELECT rfq_id, SUM(negotiation_quantity) as total_release
      FROM expired
      GROUP BY rfq_id
    ) agg
    WHERE r.id = agg.rfq_id
      AND r.status NOT IN ('accepted')
  )
  SELECT array_agg(id) INTO expired_ids FROM expired;

  IF expired_ids IS NOT NULL AND array_length(expired_ids, 1) > 0 THEN
    INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id, message)
    SELECT n.id, 'reject'::offer_action, n.current_offer_price,
           '00000000-0000-0000-0000-000000000000'::uuid, n.buyer_company_id,
           'System auto-expiry: offer timer elapsed'
    FROM public.negotiations n WHERE n.id = ANY(expired_ids);
  END IF;

  RETURN QUERY SELECT unnest(COALESCE(expired_ids, ARRAY[]::uuid[]));
END;
$function$;
