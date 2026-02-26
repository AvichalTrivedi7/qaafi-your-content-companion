
-- Add server-side validation to create_and_assign_company
CREATE OR REPLACE FUNCTION public.create_and_assign_company(company_name text, company_type company_type)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id uuid;
  current_user_id uuid;
  new_access_code text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea;
  sanitized_name text;
BEGIN
  -- Sanitize and validate company name
  sanitized_name := trim(company_name);
  
  IF length(sanitized_name) < 2 OR length(sanitized_name) > 100 THEN
    RAISE EXCEPTION 'Company name must be between 2 and 100 characters';
  END IF;
  
  -- Get current user
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Enforce one-user-one-company: check user doesn't already have a company
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = current_user_id 
    AND company_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already belongs to a company';
  END IF;
  
  -- Generate cryptographically secure access code using extensions.gen_random_bytes()
  random_bytes := extensions.gen_random_bytes(8);
  new_access_code := '';
  FOR i IN 0..7 LOOP
    new_access_code := new_access_code || substr(chars, (get_byte(random_bytes, i) % 32) + 1, 1);
  END LOOP;
  
  -- Create company with secure access code
  INSERT INTO public.companies (name, type, access_code, is_active)
  VALUES (sanitized_name, company_type, new_access_code, true)
  RETURNING id INTO new_company_id;
  
  -- Assign user to company atomically
  UPDATE public.profiles 
  SET company_id = new_company_id 
  WHERE user_id = current_user_id;
  
  -- Log activity for company creation
  INSERT INTO public.activity_logs (
    type,
    description,
    reference_id,
    reference_type,
    metadata,
    company_id
  ) VALUES (
    'COMPANY_CREATED'::activity_type,
    'Company created: ' || sanitized_name,
    new_company_id,
    NULL,
    jsonb_build_object('company_name', sanitized_name, 'company_type', company_type::text),
    new_company_id
  );
  
  RETURN new_company_id;
END;
$function$;

-- Add validation triggers for text length constraints
CREATE OR REPLACE FUNCTION public.validate_inventory_item()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(NEW.name)) < 1 OR length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Product name must be between 1 and 200 characters';
  END IF;
  IF length(trim(NEW.sku)) < 1 OR length(NEW.sku) > 50 THEN
    RAISE EXCEPTION 'SKU must be between 1 and 50 characters';
  END IF;
  IF NEW.description IS NOT NULL AND length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Description must be less than 1000 characters';
  END IF;
  NEW.name := trim(NEW.name);
  NEW.sku := trim(NEW.sku);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_inventory_item_trigger ON public.inventory_items;
CREATE TRIGGER validate_inventory_item_trigger
  BEFORE INSERT OR UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_inventory_item();

CREATE OR REPLACE FUNCTION public.validate_shipment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(NEW.customer_name)) < 1 OR length(NEW.customer_name) > 200 THEN
    RAISE EXCEPTION 'Customer name must be between 1 and 200 characters';
  END IF;
  IF length(trim(NEW.destination)) < 1 OR length(NEW.destination) > 500 THEN
    RAISE EXCEPTION 'Destination must be between 1 and 500 characters';
  END IF;
  NEW.customer_name := trim(NEW.customer_name);
  NEW.destination := trim(NEW.destination);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_shipment_trigger ON public.shipments;
CREATE TRIGGER validate_shipment_trigger
  BEFORE INSERT OR UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.validate_shipment();

-- Add column length constraint for company name
CREATE OR REPLACE FUNCTION public.validate_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(trim(NEW.name)) < 2 OR length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Company name must be between 2 and 100 characters';
  END IF;
  NEW.name := trim(NEW.name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_company_trigger ON public.companies;
CREATE TRIGGER validate_company_trigger
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.validate_company();
