
-- Validation trigger to enforce negotiation_quantity > 0 (using trigger instead of CHECK for safety)
CREATE OR REPLACE FUNCTION public.validate_negotiation_quantity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.negotiation_quantity <= 0 THEN
    RAISE EXCEPTION 'negotiation_quantity must be greater than 0, got %', NEW.negotiation_quantity;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_negotiation_quantity
BEFORE INSERT OR UPDATE ON public.negotiations
FOR EACH ROW
EXECUTE FUNCTION public.validate_negotiation_quantity();
