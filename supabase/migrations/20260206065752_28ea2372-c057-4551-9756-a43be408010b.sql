-- Add new activity types to the enum
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'INVENTORY_UPDATED';
ALTER TYPE public.activity_type ADD VALUE IF NOT EXISTS 'COMPANY_CREATED';

-- Update the create_and_assign_company function to log activity
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
BEGIN
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
  VALUES (company_name, company_type, new_access_code, true)
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
    'Company created: ' || company_name,
    new_company_id,
    NULL,
    jsonb_build_object('company_name', company_name, 'company_type', company_type::text),
    new_company_id
  );
  
  RETURN new_company_id;
END;
$function$;