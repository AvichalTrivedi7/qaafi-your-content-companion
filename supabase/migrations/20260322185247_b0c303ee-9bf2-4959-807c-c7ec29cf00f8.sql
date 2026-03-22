
-- Atomic offer submission function with row locking, validation, and audit logging
CREATE OR REPLACE FUNCTION public.submit_offer(
  _negotiation_id uuid,
  _offer_price numeric DEFAULT NULL,
  _action text DEFAULT 'initial_offer'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  neg RECORD;
  new_status negotiation_status;
  user_company_id uuid;
  caller_is_buyer boolean;
  offer_id uuid;
BEGIN
  -- Get caller identity
  user_company_id := get_user_company_id(auth.uid());
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'User has no company';
  END IF;

  -- Lock the negotiation row to prevent race conditions
  SELECT * INTO neg FROM public.negotiations WHERE id = _negotiation_id FOR UPDATE;
  IF neg IS NULL THEN
    RAISE EXCEPTION 'Negotiation not found';
  END IF;

  -- Must be a party
  IF user_company_id != neg.buyer_company_id AND user_company_id != neg.seller_company_id THEN
    RAISE EXCEPTION 'Not authorized: not a party to this negotiation';
  END IF;

  caller_is_buyer := (user_company_id = neg.buyer_company_id);

  -- Block terminal states
  IF neg.status IN ('accepted', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'Negotiation is in terminal state: %', neg.status;
  END IF;

  -- Check if current offer expired (lazy expiry)
  IF neg.current_offer_expires_at IS NOT NULL AND neg.current_offer_expires_at < now() THEN
    UPDATE public.negotiations SET status = 'expired' WHERE id = _negotiation_id;
    UPDATE public.rfqs SET status = 'expired' WHERE id = neg.rfq_id AND status NOT IN ('accepted','cancelled','expired');
    RAISE EXCEPTION 'Offer has expired';
  END IF;

  -- Validate action and determine new state
  CASE _action
    WHEN 'initial_offer' THEN
      IF neg.status != 'open' THEN
        RAISE EXCEPTION 'Initial offer only allowed in OPEN state, current: %', neg.status;
      END IF;
      IF _offer_price IS NULL THEN
        RAISE EXCEPTION 'Price required for initial offer';
      END IF;
      new_status := 'offer_made';

    WHEN 'counter_offer' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN
        RAISE EXCEPTION 'Counter offer not allowed in % state', neg.status;
      END IF;
      -- Cannot counter your own offer
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN
        RAISE EXCEPTION 'Cannot counter your own offer — wait for the other party';
      END IF;
      IF _offer_price IS NULL THEN
        RAISE EXCEPTION 'Price required for counter offer';
      END IF;
      IF neg.status = 'offer_made' THEN
        new_status := 'counter_offered';
      ELSE
        new_status := 'offer_made';
      END IF;

    WHEN 'accept' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN
        RAISE EXCEPTION 'Accept only allowed when there is an active offer, current: %', neg.status;
      END IF;
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN
        RAISE EXCEPTION 'Cannot accept your own offer';
      END IF;
      new_status := 'accepted';
      _offer_price := neg.current_offer_price;

    WHEN 'reject' THEN
      IF neg.status NOT IN ('offer_made', 'counter_offered') THEN
        RAISE EXCEPTION 'Reject only allowed when there is an active offer, current: %', neg.status;
      END IF;
      IF neg.current_offer_by IS NOT NULL AND get_user_company_id(neg.current_offer_by) = user_company_id THEN
        RAISE EXCEPTION 'Cannot reject your own offer';
      END IF;
      new_status := 'rejected';
      _offer_price := neg.current_offer_price;

    ELSE
      RAISE EXCEPTION 'Invalid action: %. Must be initial_offer, counter_offer, accept, or reject', _action;
  END CASE;

  -- Price band enforcement for offers
  IF _action IN ('initial_offer', 'counter_offer') THEN
    IF _offer_price < neg.min_price OR _offer_price > neg.max_price THEN
      RAISE EXCEPTION 'Price % is outside allowed range [%, %]', _offer_price, neg.min_price, neg.max_price;
    END IF;
  END IF;

  -- Update negotiation state atomically
  IF _action = 'accept' THEN
    UPDATE public.negotiations
    SET status = 'accepted',
        accepted_price = _offer_price,
        accepted_at = now()
    WHERE id = _negotiation_id;

    UPDATE public.rfqs SET status = 'accepted' WHERE id = neg.rfq_id;

    -- Create order atomically
    INSERT INTO public.orders (negotiation_id, rfq_id, buyer_company_id, seller_company_id, product_name, quantity, unit, agreed_price)
    SELECT neg.id, neg.rfq_id, neg.buyer_company_id, neg.seller_company_id, r.product_name, r.quantity, r.unit, _offer_price
    FROM public.rfqs r WHERE r.id = neg.rfq_id;

  ELSIF _action = 'reject' THEN
    UPDATE public.negotiations SET status = 'rejected' WHERE id = _negotiation_id;
    UPDATE public.rfqs SET status = 'cancelled' WHERE id = neg.rfq_id AND status NOT IN ('accepted','expired','cancelled');

  ELSE
    -- offer or counter: update price and reset expiry
    UPDATE public.negotiations
    SET status = new_status,
        current_offer_price = _offer_price,
        current_offer_by = auth.uid(),
        current_offer_expires_at = now() + (offer_expiry_minutes * interval '1 minute')
    WHERE id = _negotiation_id;
  END IF;

  -- Immutable audit log entry
  INSERT INTO public.negotiation_offers (negotiation_id, action, price, offered_by, offered_by_company_id, message)
  VALUES (
    _negotiation_id,
    _action::offer_action,
    _offer_price,
    auth.uid(),
    user_company_id,
    NULL
  )
  RETURNING id INTO offer_id;

  RETURN jsonb_build_object(
    'success', true,
    'negotiation_id', _negotiation_id,
    'new_status', new_status::text,
    'offer_id', offer_id,
    'price', _offer_price
  );
END;
$$;
