
-- 1. Add meter locking fields to rfqs
ALTER TABLE public.rfqs
  ADD COLUMN IF NOT EXISTS reserved_quantity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;

-- 2. Enable realtime for negotiation_offers (negotiations already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'negotiation_offers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.negotiation_offers;
  END IF;
END $$;

-- 3. Replace expire_negotiations to also release reserved meters
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
    RETURNING id, current_offer_price, buyer_company_id, rfq_id
  ),
  release_meters AS (
    UPDATE public.rfqs r
    SET reserved_quantity = GREATEST(0, r.reserved_quantity - rfq_neg.total_qty),
        is_locked = CASE WHEN GREATEST(0, r.reserved_quantity - rfq_neg.total_qty) < r.quantity THEN false ELSE r.is_locked END
    FROM (
      SELECT e.rfq_id, rq.quantity as total_qty
      FROM expired e
      JOIN public.rfqs rq ON rq.id = e.rfq_id
    ) rfq_neg
    WHERE r.id = rfq_neg.rfq_id
    AND r.status NOT IN ('accepted')
  )
  SELECT array_agg(id) INTO expired_ids FROM expired;

  IF expired_ids IS NOT NULL AND array_length(expired_ids, 1) > 0 THEN
    INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id, message)
    SELECT
      n.id,
      'reject'::offer_action,
      n.current_offer_price,
      '00000000-0000-0000-0000-000000000000'::uuid,
      n.buyer_company_id,
      'System auto-expiry: offer timer elapsed'
    FROM public.negotiations n
    WHERE n.id = ANY(expired_ids);

    UPDATE public.rfqs
    SET status = 'expired'
    WHERE id IN (SELECT rfq_id FROM public.negotiations WHERE id = ANY(expired_ids))
    AND status NOT IN ('accepted', 'cancelled', 'expired');
  END IF;

  RETURN QUERY SELECT unnest(COALESCE(expired_ids, ARRAY[]::uuid[]));
END;
$function$;

-- 4. Replace submit_offer to handle meter release on reject
CREATE OR REPLACE FUNCTION public.submit_offer(_negotiation_id uuid, _offer_price numeric DEFAULT NULL, _action text DEFAULT 'initial_offer')
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
  caller_is_buyer boolean;
  offer_id uuid;
BEGIN
  user_company_id := get_user_company_id(auth.uid());
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User has no company';
  END IF;

  SELECT * INTO neg FROM public.negotiations WHERE id = _negotiation_id FOR UPDATE;
  IF neg IS NULL THEN
    RAISE EXCEPTION 'Negotiation not found';
  END IF;

  IF user_company_id != neg.buyer_company_id AND user_company_id != neg.seller_company_id THEN
    RAISE EXCEPTION 'Not authorized: not a party to this negotiation';
  END IF;

  caller_is_buyer := (user_company_id = neg.buyer_company_id);

  IF neg.status IN ('accepted', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'Negotiation is in terminal state: %', neg.status;
  END IF;

  IF neg.current_offer_expires_at IS NOT NULL AND neg.current_offer_expires_at < now() THEN
    UPDATE public.negotiations SET status = 'expired' WHERE id = _negotiation_id;
    UPDATE public.rfqs SET status = 'expired' WHERE id = neg.rfq_id AND status NOT IN ('accepted','cancelled','expired');
    SELECT * INTO rfq_rec FROM public.rfqs WHERE id = neg.rfq_id FOR UPDATE;
    IF rfq_rec IS NOT NULL AND rfq_rec.status != 'accepted' THEN
      UPDATE public.rfqs
      SET reserved_quantity = GREATEST(0, rfq_rec.reserved_quantity - rfq_rec.quantity),
          is_locked = false
      WHERE id = neg.rfq_id;
    END IF;
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
    SELECT neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, r.product_name, r.quantity, r.unit, _offer_price
    FROM public.rfqs r WHERE r.id = neg.rfq_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.negotiations SET status = 'rejected' WHERE id = _negotiation_id;
    UPDATE public.rfqs SET status = 'cancelled' WHERE id = neg.rfq_id AND status NOT IN ('accepted','expired','cancelled');
    -- Release reserved meters
    SELECT * INTO rfq_rec FROM public.rfqs WHERE id = neg.rfq_id FOR UPDATE;
    IF rfq_rec IS NOT NULL THEN
      UPDATE public.rfqs
      SET reserved_quantity = GREATEST(0, rfq_rec.reserved_quantity - rfq_rec.quantity),
          is_locked = CASE WHEN GREATEST(0, rfq_rec.reserved_quantity - rfq_rec.quantity) < rfq_rec.quantity THEN false ELSE true END
      WHERE id = neg.rfq_id;
    END IF;
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

-- 5. Create start_negotiation function with meter locking
CREATE OR REPLACE FUNCTION public.start_negotiation(_rfq_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rfq_rec RECORD;
  user_company_id uuid;
  new_neg_id uuid;
BEGIN
  user_company_id := get_user_company_id(auth.uid());
  IF user_company_id IS NULL THEN RAISE EXCEPTION 'User has no company'; END IF;

  SELECT * INTO rfq_rec FROM public.rfqs WHERE id = _rfq_id FOR UPDATE;
  IF rfq_rec IS NULL THEN RAISE EXCEPTION 'RFQ not found'; END IF;
  IF rfq_rec.status != 'open' THEN RAISE EXCEPTION 'RFQ is not open (status: %)', rfq_rec.status; END IF;
  IF rfq_rec.is_locked THEN RAISE EXCEPTION 'RFQ is fully reserved — no meters available'; END IF;
  IF user_company_id != rfq_rec.seller_company_id THEN RAISE EXCEPTION 'Only the seller can start a negotiation'; END IF;

  UPDATE public.rfqs
  SET reserved_quantity = reserved_quantity + rfq_rec.quantity, is_locked = true, status = 'negotiating'
  WHERE id = _rfq_id;

  INSERT INTO public.negotiations (rfq_id, buyer_company_id, seller_company_id, min_price, max_price)
  VALUES (_rfq_id, rfq_rec.buyer_company_id, rfq_rec.seller_company_id, rfq_rec.min_price, rfq_rec.max_price)
  RETURNING id INTO new_neg_id;

  RETURN new_neg_id;
END;
$function$;
