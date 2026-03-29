
CREATE OR REPLACE FUNCTION public.validate_offer_insertion()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  neg_status text;
BEGIN
  -- Allow accept/reject audit log entries even after status transition
  IF NEW.action IN ('accept', 'reject') THEN
    RETURN NEW;
  END IF;

  SELECT status INTO neg_status
  FROM public.negotiations
  WHERE id = NEW.negotiation_id;

  IF neg_status IN ('accepted', 'expired', 'rejected') THEN
    RAISE EXCEPTION 'Cannot insert offer: negotiation is in % state', neg_status;
  END IF;

  RETURN NEW;
END;
$function$;
