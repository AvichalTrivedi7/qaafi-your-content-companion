
-- 1. Expire negotiations function (idempotent, safe for concurrent runs)
CREATE OR REPLACE FUNCTION public.expire_negotiations()
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 2. Validation trigger: prevent offers on terminal negotiations
CREATE OR REPLACE FUNCTION public.validate_offer_insertion()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  neg_status text;
BEGIN
  SELECT status INTO neg_status
  FROM public.negotiations
  WHERE id = NEW.negotiation_id;

  IF neg_status IN ('accepted', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'Cannot insert offer: negotiation is in % state', neg_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_offer_insertion
  BEFORE INSERT ON public.negotiation_offers
  FOR EACH ROW
  WHEN (NEW.offered_by != '00000000-0000-0000-0000-000000000000')
  EXECUTE FUNCTION public.validate_offer_insertion();
