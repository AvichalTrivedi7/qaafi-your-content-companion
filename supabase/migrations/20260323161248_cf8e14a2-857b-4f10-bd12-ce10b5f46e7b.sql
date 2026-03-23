
-- Update submit_offer: cancel siblings on accept
CREATE OR REPLACE FUNCTION public.submit_offer(_negotiation_id uuid, _offer_price numeric DEFAULT NULL, _action text DEFAULT 'initial_offer')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  neg RECORD;
  new_status negotiation_status;
  user_company_id uuid;
  offer_id uuid;
  new_reserved numeric;
  sibling_release numeric;
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

  -- Lazy expiry check
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
    UPDATE public.negotiations SET status = 'accepted', accepted_price = _offer_price, accepted_at = now() WHERE id = _negotiation_id;
    UPDATE public.rfqs SET status = 'accepted' WHERE id = neg.rfq_id;
    INSERT INTO public.orders (negotiation_id, rfq_id, buyer_company_id, seller_company_id, product_name, quantity, unit, agreed_price)
    SELECT neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, r.product_name, neg.negotiation_quantity::integer, r.unit, _offer_price
    FROM public.rfqs r WHERE r.id = neg.rfq_id;

    -- Cancel all sibling negotiations and release their meters
    SELECT COALESCE(SUM(negotiation_quantity), 0) INTO sibling_release
    FROM public.negotiations
    WHERE rfq_id = neg.rfq_id AND id != _negotiation_id AND status IN ('open', 'offer_made', 'counter_offered');

    UPDATE public.negotiations
    SET status = 'rejected'
    WHERE rfq_id = neg.rfq_id AND id != _negotiation_id AND status IN ('open', 'offer_made', 'counter_offered');

    IF sibling_release > 0 THEN
      UPDATE public.rfqs
      SET reserved_quantity = GREATEST(0, reserved_quantity - sibling_release)
      WHERE id = neg.rfq_id;
    END IF;

  ELSIF _action = 'reject' THEN
    UPDATE public.negotiations SET status = 'rejected' WHERE id = _negotiation_id;
    new_reserved := GREATEST(0, (SELECT reserved_quantity FROM public.rfqs WHERE id = neg.rfq_id) - neg.negotiation_quantity);
    UPDATE public.rfqs
    SET reserved_quantity = new_reserved,
        is_locked = (new_reserved >= quantity)
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
$$;

-- Update accept_negotiation: cancel siblings on accept
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
  sibling_release numeric;
BEGIN
  user_company_id := get_user_company_id(auth.uid());

  SELECT * INTO neg FROM public.negotiations WHERE id = _negotiation_id FOR UPDATE;
  IF neg IS NULL THEN RAISE EXCEPTION 'Negotiation not found'; END IF;

  IF neg.status NOT IN ('offer_made', 'counter_offered') THEN
    RAISE EXCEPTION 'Cannot accept: negotiation is in % state', neg.status;
  END IF;

  IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN
    RAISE EXCEPTION 'Cannot accept your own offer';
  END IF;

  IF user_company_id != neg.buyer_company_id AND user_company_id != neg.seller_company_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF neg.current_offer_expires_at IS NOT NULL AND neg.current_offer_expires_at < now() THEN
    UPDATE public.negotiations SET status = 'expired' WHERE id = _negotiation_id;
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  SELECT * INTO rfq FROM public.rfqs WHERE id = neg.rfq_id;

  UPDATE public.negotiations
  SET status = 'accepted', accepted_price = neg.current_offer_price, accepted_at = now()
  WHERE id = _negotiation_id;

  UPDATE public.rfqs SET status = 'accepted' WHERE id = neg.rfq_id;

  INSERT INTO public.orders (negotiation_id, rfq_id, buyer_company_id, seller_company_id, product_name, quantity, unit, agreed_price)
  VALUES (neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, rfq.product_name, neg.negotiation_quantity::integer, rfq.unit, neg.current_offer_price)
  RETURNING id INTO new_order_id;

  INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id)
  VALUES (_negotiation_id, 'accept', neg.current_offer_price, auth.uid(), user_company_id);

  -- Cancel sibling negotiations and release their meters
  SELECT COALESCE(SUM(negotiation_quantity), 0) INTO sibling_release
  FROM public.negotiations
  WHERE rfq_id = neg.rfq_id AND id != _negotiation_id AND status IN ('open', 'offer_made', 'counter_offered');

  UPDATE public.negotiations
  SET status = 'rejected'
  WHERE rfq_id = neg.rfq_id AND id != _negotiation_id AND status IN ('open', 'offer_made', 'counter_offered');

  IF sibling_release > 0 THEN
    UPDATE public.rfqs
    SET reserved_quantity = GREATEST(0, reserved_quantity - sibling_release)
    WHERE id = neg.rfq_id;
  END IF;

  RETURN new_order_id;
END;
$$;
